import { NextRequest, NextResponse } from 'next/server'
import { parseOwnedVehicleCSV } from '@/lib/csv-parser'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/server/auth'
import { ownedVehicleInputSchema, type OwnedVehicleInput } from '@/lib/contracts/owned-vehicle'
import { createOwnedVehicleInTransaction } from '@/lib/server/owned-vehicles'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    if (!auth.user) return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return apiErrorJson('ファイルが選択されていません', 400, 'VALIDATION_ERROR')
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      return apiErrorJson('CSVファイルを選択してください', 400, 'VALIDATION_ERROR')
    }

    const parsedCsv = parseOwnedVehicleCSV(await file.text())
    if (parsedCsv.errors.length > 0) {
      return apiErrorJson('CSVファイルの解析でエラーが発生しました', 400, 'VALIDATION_ERROR', {
        errors: parsedCsv.errors,
        skippedRows: parsedCsv.skippedRows
      })
    }

    const rows = parsedCsv.data
    const managementIds = [...new Set(rows.map(row => row.managementId.trim()).filter(Boolean))]
    const [existingVehicles, products] = await Promise.all([
      prisma.ownedVehicle.findMany({
        where: { userId: auth.user.id, managementId: { in: managementIds } },
        select: { managementId: true }
      }),
      prisma.product.findMany({ select: { id: true, brand: true, productCode: true } })
    ])
    const existingManagementIds = new Set(existingVehicles.map(vehicle => vehicle.managementId))
    const productMatches = new Map<string, typeof products>()
    for (const product of products) {
      if (!product.productCode) continue
      const key = `${product.brand.toLocaleLowerCase()}:${product.productCode.toLocaleLowerCase()}`
      productMatches.set(key, [...(productMatches.get(key) ?? []), product])
    }

    const seenManagementIds = new Set<string>()
    const validRows: Array<{ rowNumber: number; input: OwnedVehicleInput; independent: boolean }> = []
    const errors: string[] = []
    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2
      const managementId = row.managementId.trim()
      if (managementId && (existingManagementIds.has(managementId) || seenManagementIds.has(managementId))) {
        errors.push(`行 ${rowNumber}: 管理ID「${managementId}」が既存データまたはCSV内で重複しています`)
        continue
      }
      if (managementId) seenManagementIds.add(managementId)

      let vehicleType: 'PRODUCT' | 'INDEPENDENT' = 'INDEPENDENT'
      let productId: number | undefined
      let independentVehicle: OwnedVehicleInput['independentVehicle']
      if (row.productBrand && row.productCode) {
        const key = `${row.productBrand.toLocaleLowerCase()}:${row.productCode.toLocaleLowerCase()}`
        const matches = productMatches.get(key) ?? []
        if (matches.length > 1) {
          errors.push(`行 ${rowNumber}: メーカー・品番に一致する製品が複数あるため、保有車両へ自動紐付けできません`)
          continue
        }
        if (matches.length === 1) {
          vehicleType = 'PRODUCT'
          productId = matches[0].id
        } else {
          independentVehicle = {
            name: row.productName || `${row.productBrand} ${row.productCode}`,
            brand: row.productBrand,
            productCode: row.productCode,
            vehicleType: row.independentVehicleType,
            description: 'CSV取込時に一致する製品がなかったため独立車両として登録'
          }
        }
      } else {
        independentVehicle = {
          name: row.independentName || '(商品名不明)',
          brand: row.independentBrand,
          vehicleType: row.independentVehicleType,
          description: 'CSV取込時に製品情報がなかったため独立車両として登録'
        }
      }

      const candidate = {
        managementId,
        vehicleType,
        productId,
        independentVehicle,
        currentStatus: row.currentStatus,
        storageCondition: row.storageCondition,
        purchaseDate: row.purchaseDate?.slice(0, 10) ?? null,
        purchasePriceIncludingTax: row.purchasePriceIncludingTax,
        notes: row.notes,
        imageUrls: []
      }
      const validated = ownedVehicleInputSchema.safeParse(candidate)
      if (!validated.success) {
        errors.push(`行 ${rowNumber}: ${validated.error.issues.map(issue => issue.message).join('、')}`)
        continue
      }
      validRows.push({ rowNumber, input: validated.data, independent: vehicleType === 'INDEPENDENT' })
    }

    const BATCH_SIZE = 50
    let successCount = 0
    let linkedCount = 0
    let independentCount = 0
    const batches: Array<{ batch: number; rowCount: number; committed: boolean; error?: string }> = []
    for (let start = 0; start < validRows.length; start += BATCH_SIZE) {
      const batch = validRows.slice(start, start + BATCH_SIZE)
      try {
        await prisma.$transaction(async tx => {
          for (const item of batch) {
            await createOwnedVehicleInTransaction(tx, item.input, auth.user!.id)
          }
        }, { timeout: 50000 })
        successCount += batch.length
        independentCount += batch.filter(item => item.independent).length
        linkedCount += batch.filter(item => !item.independent).length
        batches.push({ batch: batches.length + 1, rowCount: batch.length, committed: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : '不明なエラー'
        errors.push(...batch.map(item => `行 ${item.rowNumber}: バッチ登録に失敗したため未登録です`))
        batches.push({ batch: batches.length + 1, rowCount: batch.length, committed: false, error: message })
      }
    }

    return NextResponse.json({
      message: 'インポート処理が完了しました',
      results: {
        totalRows: rows.length,
        successCount,
        linkedCount,
        independentCount,
        errorCount: errors.length,
        errors,
        batches
      }
    })
  } catch (error) {
    return apiErrorResponse(error, '保有車両CSVを取り込めませんでした')
  }
}
