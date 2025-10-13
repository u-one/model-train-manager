import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseOwnedVehicleCSV } from '@/lib/csv-parser'
import { prisma } from '@/lib/prisma'
import { autoRegisterSetComponents } from '@/lib/owned-vehicle-utils'
import type { VehicleStatus, StorageCondition } from '@prisma/client'

// Vercel Hobby plan: 最大60秒
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'CSVファイルを選択してください' }, { status: 400 })
    }

    const csvContent = await file.text()
    console.log('CSV file content preview:', csvContent.substring(0, 500))

    const parseResult = parseOwnedVehicleCSV(csvContent)
    console.log('Parse result:', { dataCount: parseResult.data.length, errorCount: parseResult.errors.length, errors: parseResult.errors })

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors)
      return NextResponse.json({
        error: 'CSVファイルの解析でエラーが発生しました',
        details: parseResult.errors,
        skippedRows: parseResult.skippedRows
      }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const importResults = {
      totalRows: parseResult.data.length,
      successCount: 0,
      linkedCount: 0,        // 製品リンク数
      independentCount: 0,   // 独立車両数
      errorCount: 0,
      errors: [] as string[]
    }

    // === バッチ処理最適化: 事前に全データを取得 ===

    // 1. 既存の管理IDを一括取得（重複チェック用）
    const managementIds = parseResult.data
      .map(d => d.managementId)
      .filter((id): id is string => !!id && id.trim() !== '')

    const existingVehicles = await prisma.ownedVehicle.findMany({
      where: {
        userId: user.id,
        managementId: { in: managementIds }
      },
      select: { managementId: true }
    })
    const existingManagementIdSet = new Set(existingVehicles.map(v => v.managementId))

    // 2. 全製品を一括取得（メーカー+品番マッチング用）
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        brand: true,
        productCode: true,
        name: true
      }
    })

    // 製品マップを作成（大文字小文字区別なし）
    const productMap = new Map<string, typeof allProducts[0]>()
    allProducts.forEach(p => {
      if (p.productCode) {
        const key = `${p.brand.toLowerCase()}:${p.productCode.toLowerCase()}`
        productMap.set(key, p)
      }
    })

    // === バッチ処理: チャンクごとに処理（メモリ効率とパフォーマンスのバランス） ===
    const BATCH_SIZE = 50

    for (let batchStart = 0; batchStart < parseResult.data.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, parseResult.data.length)
      const batch = parseResult.data.slice(batchStart, batchEnd)

      interface VehicleToCreate {
        userId: number
        productId: number | null
        managementId: string | null
        currentStatus: VehicleStatus
        storageCondition: StorageCondition
        purchaseDate: string | null
        purchasePriceIncludingTax: number | null
        notes: string | null
        imageUrls: string[]
        independentVehicleData: {
          brand?: string | null
          productCode?: string | null
          name: string
          vehicleType?: string | null
          description?: string
        } | null
        vehicleData: typeof parseResult.data[0]
      }

      const vehiclesToCreate: VehicleToCreate[] = []
      const setComponentJobs: Array<{ productId: number, productName: string, vehicleIndex: number }> = []

      for (let i = 0; i < batch.length; i++) {
        const vehicleData = batch[i]
        const rowNumber = batchStart + i + 2

        try {
          // 管理ID重複チェック
          if (vehicleData.managementId && vehicleData.managementId.trim() !== '') {
            if (existingManagementIdSet.has(vehicleData.managementId)) {
              importResults.errorCount++
              importResults.errors.push(`行 ${rowNumber}: 管理ID "${vehicleData.managementId}" は既に存在します`)
              continue
            }
          }

          let productId: number | null = null
          let independentVehicleData: {
            brand?: string | null
            productCode?: string | null
            name: string
            vehicleType?: string | null
            description?: string
          } | null = null

          if (vehicleData.productBrand && vehicleData.productCode) {
            // メーカーと品番でマッチング（マップから高速検索）
            const key = `${vehicleData.productBrand.toLowerCase()}:${vehicleData.productCode.toLowerCase()}`
            const product = productMap.get(key)

            if (product) {
              productId = product.id

              // セット構成車両登録ジョブを追加
              setComponentJobs.push({
                productId: product.id,
                productName: product.name,
                vehicleIndex: vehiclesToCreate.length
              })
            } else {
              // 製品が見つからない場合は独立車両として登録
              independentVehicleData = {
                brand: vehicleData.productBrand,
                productCode: vehicleData.productCode,
                name: vehicleData.productName || `${vehicleData.productBrand} ${vehicleData.productCode}`,
                description: `CSVインポート時に製品が見つからなかったため独立車両として登録 (メーカー: ${vehicleData.productBrand}, 品番: ${vehicleData.productCode})`
              }
              console.log(`行 ${rowNumber}: 製品が見つからないため独立車両として登録 (メーカー: ${vehicleData.productBrand}, 品番: ${vehicleData.productCode})`)
            }
          } else {
            // 製品情報がない場合は独立車両として登録
            independentVehicleData = {
              brand: vehicleData.independentBrand,
              name: vehicleData.independentName || '(商品名不明)',
              description: 'CSVインポート時に製品情報がなかったため独立車両として登録'
            }
            console.log(`行 ${rowNumber}: 製品情報なし、独立車両として登録`)
          }

          // 保有車両データを配列に追加
          vehiclesToCreate.push({
            userId: user.id,
            productId: productId,
            managementId: vehicleData.managementId,
            currentStatus: vehicleData.currentStatus,
            storageCondition: vehicleData.storageCondition,
            purchaseDate: vehicleData.purchaseDate,
            purchasePriceIncludingTax: vehicleData.purchasePriceIncludingTax,
            notes: vehicleData.notes,
            imageUrls: [],
            independentVehicleData: independentVehicleData,
            vehicleData: vehicleData
          })

        } catch (error) {
          importResults.errorCount++
          importResults.errors.push(`行 ${rowNumber}: 予期しないエラー - ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // バッチ一括登録（トランザクション内）
      if (vehiclesToCreate.length > 0) {
        try {
          await prisma.$transaction(async (tx) => {
            // 保有車両を一括作成
            const createdVehicles = await Promise.all(
              vehiclesToCreate.map(v =>
                tx.ownedVehicle.create({
                  data: {
                    userId: v.userId,
                    productId: v.productId,
                    managementId: v.managementId || '',
                    currentStatus: v.currentStatus,
                    storageCondition: v.storageCondition,
                    purchaseDate: v.purchaseDate ? new Date(v.purchaseDate) : null,
                    purchasePriceIncludingTax: v.purchasePriceIncludingTax,
                    notes: v.notes,
                    imageUrls: v.imageUrls
                  }
                })
              )
            )

            // 独立車両を一括作成
            const independentVehiclesData = []
            for (let i = 0; i < vehiclesToCreate.length; i++) {
              const v = vehiclesToCreate[i]
              if (v.independentVehicleData) {
                independentVehiclesData.push({
                  ownedVehicleId: createdVehicles[i].id,
                  brand: v.independentVehicleData.brand,
                  productCode: v.independentVehicleData.productCode,
                  name: v.independentVehicleData.name,
                  vehicleType: v.vehicleData.independentVehicleType || v.independentVehicleData.vehicleType,
                  description: v.independentVehicleData.description
                })
                importResults.independentCount++
              } else {
                importResults.linkedCount++
              }
            }

            if (independentVehiclesData.length > 0) {
              await tx.independentVehicle.createMany({
                data: independentVehiclesData
              })
            }

            importResults.successCount += createdVehicles.length

            // セット構成車両の自動登録（トランザクション外で非同期実行）
            for (const job of setComponentJobs) {
              const vehicleIndex = job.vehicleIndex
              const v = vehiclesToCreate[vehicleIndex]

              // トランザクション外で実行（失敗しても本体登録は成功扱い）
              autoRegisterSetComponents(
                job.productId,
                user.id,
                job.productName,
                v.managementId || '',
                v.currentStatus,
                v.storageCondition,
                v.purchaseDate ? new Date(v.purchaseDate) : null
              ).catch(err => {
                console.error(`セット構成車両登録エラー (productId: ${job.productId}):`, err)
              })
            }
          }, {
            timeout: 50000 // 50秒タイムアウト
          })
        } catch (error) {
          console.error('Batch insert error:', error)
          importResults.errorCount += vehiclesToCreate.length
          importResults.errors.push(`バッチ処理エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return NextResponse.json({
      message: 'インポート処理が完了しました',
      results: importResults
    })

  } catch (error) {
    console.error('Owned vehicle import error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
