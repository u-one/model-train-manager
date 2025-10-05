import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProductCSV } from '@/lib/csv-parser'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    for (let i = 0; i < parseResult.data.length; i++) {
      const productData = parseResult.data[i]

      try {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('brand', productData.brand)
          .eq('product_code', productData.productCode)
          .single()

        if (existingProduct) {
          importResults.errorCount++
          importResults.errors.push(`行 ${i + 2}: "${productData.brand} ${productData.productCode}" は既に存在します`)
          continue
        }

        const now = new Date().toISOString()
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            brand: productData.brand,
            product_code: productData.productCode,
            parent_code: productData.parentCode, // 追加: 親品番
            name: productData.name,
            type: productData.type,
            release_year: productData.releaseYear,
            price_excluding_tax: productData.priceExcludingTax,
            price_including_tax: productData.priceIncludingTax,
            description: productData.description,
            image_urls: productData.imageUrl ? [productData.imageUrl] : [],
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single()

        if (productError) {
          importResults.errorCount++
          importResults.errors.push(`行 ${i + 2}: 製品登録エラー - ${productError.message}`)
          continue
        }

        if (productData.vehicleType || productData.company || productData.manufacturingYear ||
            productData.operationLine || productData.notes) {
          const { error: vehicleError } = await supabase
            .from('real_vehicles')
            .insert({
              product_id: product.id,
              vehicle_type: productData.vehicleType,
              company: productData.company,
              manufacturing_year: productData.manufacturingYear,
              operation_line: productData.operationLine,
              notes: productData.notes,
              created_at: now,
              updated_at: now,
            })

          if (vehicleError) {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: 実車情報登録エラー - ${vehicleError.message}`)
            continue
          }
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