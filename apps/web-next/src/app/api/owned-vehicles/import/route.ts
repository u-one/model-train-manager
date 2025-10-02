import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseOwnedVehicleCSV } from '@/lib/csv-parser'
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

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user?.email)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const importResults = {
      totalRows: parseResult.data.length,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const vehicleData = parseResult.data[i]

      try {
        // 管理IDが空文字列でない場合のみ重複チェック
        if (vehicleData.managementId && vehicleData.managementId.trim() !== '') {
          const { data: existingVehicle } = await supabase
            .from('owned_vehicles')
            .select('id')
            .eq('user_id', user.id)
            .eq('management_id', vehicleData.managementId)
            .single()

          if (existingVehicle) {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: 管理ID "${vehicleData.managementId}" は既に存在します`)
            continue
          }
        }

        let productId: number | null = null

        if (vehicleData.productBrand && vehicleData.productCode) {
          // メーカーと品番でマッチング
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .ilike('brand', vehicleData.productBrand)
            .ilike('product_code', vehicleData.productCode)
            .single()

          if (product) {
            productId = product.id
          } else {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: 製品が見つかりません (メーカー: ${vehicleData.productBrand}, 品番: ${vehicleData.productCode})`)
            continue
          }
        } else if (vehicleData.productCode || vehicleData.productName) {
          // 後方互換性：既存の品番・商品名マッチング
          let productQuery = supabase.from('products').select('id')

          if (vehicleData.productCode) {
            productQuery = productQuery.eq('product_code', vehicleData.productCode)
          }
          if (vehicleData.productName) {
            productQuery = productQuery.eq('name', vehicleData.productName)
          }

          const { data: product } = await productQuery.single()

          if (product) {
            productId = product.id
          } else {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: 製品が見つかりません (品番: ${vehicleData.productCode}, 商品名: ${vehicleData.productName})`)
            continue
          }
        } else {
          // 製品情報がない場合はproductId = nullで続行
          console.log(`行 ${i + 2}: 製品情報なし、productId = null で保有車両を作成`)
        }

        const now = new Date().toISOString()
        const { error: vehicleError } = await supabase
          .from('owned_vehicles')
          .insert({
            user_id: user.id,
            product_id: productId,
            management_id: vehicleData.managementId,
            current_status: vehicleData.currentStatus,
            storage_condition: vehicleData.storageCondition,
            purchase_date: vehicleData.purchaseDate,
            purchase_price_including_tax: vehicleData.purchasePriceIncludingTax,
            notes: vehicleData.notes,
            image_urls: [],
            created_at: now,
            updated_at: now,
          })

        if (vehicleError) {
          importResults.errorCount++
          importResults.errors.push(`行 ${i + 2}: 保有車両登録エラー - ${vehicleError.message}`)
          continue
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
    console.error('Owned vehicle import error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}