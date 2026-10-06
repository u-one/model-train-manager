import { NextRequest, NextResponse } from 'next/server'
import { parseProductCSV } from '@/lib/csv-parser'
import { getAuthContext } from '@/lib/server/auth'
import { productInputSchema } from '@/lib/contracts/product'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { createImportedProduct } from '@/lib/server/products'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth.session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!auth.user) return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return apiErrorJson('ファイルが選択されていません', 400, 'VALIDATION_ERROR')
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return apiErrorJson('CSVファイルを選択してください', 400, 'VALIDATION_ERROR')
    }

    const csvContent = await file.text()
    const parseResult = parseProductCSV(csvContent)

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors)
      return apiErrorJson('CSVファイルの解析でエラーが発生しました', 400, 'VALIDATION_ERROR', {
        errors: parseResult.errors,
        skippedRows: parseResult.skippedRows
      })
    }

    const importResults = {
      totalRows: parseResult.data.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      warnings: [...(parseResult.warnings ?? [])]
    }

    const seen = new Set<string>()

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]
      const rowNumber = i + 3
      const type = row.type === 'セット' ? 'SET' : row.type === 'セット単品' ? 'SET_SINGLE' : 'SINGLE'
      const realVehicle = {
        vehicleType: row.vehicleType,
        company: row.company,
        manufacturingYear: row.manufacturingYear,
        operationLine: row.operationLine,
        notes: row.notes
      }
      const parsed = productInputSchema.safeParse({
        brand: row.brand,
        productCode: row.productCode,
        parentCode: row.parentCode,
        type,
        name: row.name,
        releaseYear: row.releaseYear,
        priceExcludingTax: row.priceExcludingTax,
        priceIncludingTax: row.priceIncludingTax,
        description: row.description,
        imageUrls: row.imageUrl ? [row.imageUrl] : [],
        realVehicles: Object.values(realVehicle).some(Boolean) ? [realVehicle] : []
      })
      if (!parsed.success) {
        importResults.errorCount++
        importResults.errors.push(`行 ${rowNumber}: ${parsed.error.issues.map(issue => issue.message).join('、')}`)
        continue
      }

      const duplicateKey = `${parsed.data.brand.toLocaleLowerCase()}:${(parsed.data.productCode ?? '').toLocaleLowerCase()}`
      if (seen.has(duplicateKey)) {
        importResults.errorCount++
        importResults.errors.push(`行 ${rowNumber}: 同じメーカー・品番がこのCSV内に重複しています`)
        continue
      }
      seen.add(duplicateKey)

      try {
        await createImportedProduct(parsed.data, auth.user.id)
        importResults.successCount++
      } catch (error) {
        importResults.errorCount++
        const result = apiErrorResponse(error, '製品登録エラー')
        const body = await result.json()
        importResults.errors.push(`行 ${rowNumber}: ${body.error ?? '製品登録エラー'}`)
      }
    }

    return NextResponse.json({
      message: 'インポート処理が完了しました',
      results: importResults
    })

  } catch (error) {
    return apiErrorResponse(error, '製品CSVを取り込めませんでした')
  }
}
