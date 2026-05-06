import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProductCSV } from '@/lib/csv-parser'
import { prisma } from '@/lib/prisma'
import type { ProductType } from '@prisma/client'

// csv-parser は日本語の種別を返すため Prisma enum 値に変換する
const PRODUCT_TYPE_MAP: Record<string, ProductType> = {
  '単品': 'SINGLE',
  'セット': 'SET',
  'セット単品': 'SET_SINGLE',
}

// Vercel Hobby plan: 最大60秒
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
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

    const parseResult = parseProductCSV(csvContent)
    console.log('Parse result:', { dataCount: parseResult.data.length, errorCount: parseResult.errors.length, errors: parseResult.errors })

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors)
      return NextResponse.json({
        error: 'CSVファイルの解析でエラーが発生しました',
        details: parseResult.errors,
        skippedRows: parseResult.skippedRows
      }, { status: 400 })
    }

    const importResults = {
      totalRows: parseResult.data.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[]
    }

    // 既存製品を一括取得（重複チェック用）
    const existingProducts = await prisma.product.findMany({
      select: { brand: true, productCode: true }
    })
    const existingSet = new Set(
      existingProducts
        .filter(p => p.productCode)
        .map(p => `${p.brand.toLowerCase()}:${p.productCode!.toLowerCase()}`)
    )

    for (let i = 0; i < parseResult.data.length; i++) {
      const productData = parseResult.data[i]

      try {
        if (productData.productCode) {
          const key = `${productData.brand.toLowerCase()}:${productData.productCode.toLowerCase()}`
          if (existingSet.has(key)) {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: "${productData.brand} ${productData.productCode}" は既に存在します`)
            continue
          }
        }

        const product = await prisma.product.create({
          data: {
            brand: productData.brand,
            productCode: productData.productCode,
            parentCode: productData.parentCode,
            name: productData.name,
            type: PRODUCT_TYPE_MAP[productData.type] ?? 'SINGLE',
            releaseYear: productData.releaseYear,
            priceExcludingTax: productData.priceExcludingTax,
            priceIncludingTax: productData.priceIncludingTax,
            description: productData.description,
            imageUrls: productData.imageUrl ? [productData.imageUrl] : [],
          }
        })

        if (productData.vehicleType || productData.company || productData.manufacturingYear ||
            productData.operationLine || productData.notes) {
          await prisma.realVehicle.create({
            data: {
              productId: product.id,
              vehicleType: productData.vehicleType,
              company: productData.company,
              manufacturingYear: productData.manufacturingYear,
              operationLine: productData.operationLine,
              notes: productData.notes,
            }
          })
        }

        // 同一インポート内での重複防止
        if (productData.productCode) {
          existingSet.add(`${productData.brand.toLowerCase()}:${productData.productCode.toLowerCase()}`)
        }

        importResults.successCount++
      } catch (error) {
        importResults.errorCount++
        importResults.errors.push(`行 ${i + 2}: 予期しないエラー - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: 'インポート処理が完了しました',
      results: importResults
    })

  } catch (error) {
    console.error('Product import error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
