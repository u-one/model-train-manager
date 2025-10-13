import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseOwnedVehicleCSV } from '@/lib/csv-parser'
import { prisma } from '@/lib/prisma'
import { autoRegisterSetComponents } from '@/lib/owned-vehicle-utils'

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

    for (let i = 0; i < parseResult.data.length; i++) {
      const vehicleData = parseResult.data[i]

      try {
        // 管理IDが空文字列でない場合のみ重複チェック
        if (vehicleData.managementId && vehicleData.managementId.trim() !== '') {
          const existingVehicle = await prisma.ownedVehicle.findFirst({
            where: {
              userId: user.id,
              managementId: vehicleData.managementId
            }
          })

          if (existingVehicle) {
            importResults.errorCount++
            importResults.errors.push(`行 ${i + 2}: 管理ID "${vehicleData.managementId}" は既に存在します`)
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
          // メーカーと品番でマッチング
          const product = await prisma.product.findFirst({
            where: {
              brand: {
                equals: vehicleData.productBrand,
                mode: 'insensitive'
              },
              productCode: {
                equals: vehicleData.productCode,
                mode: 'insensitive'
              }
            }
          })

          if (product) {
            productId = product.id
          } else {
            // 製品が見つからない場合は独立車両として登録
            independentVehicleData = {
              brand: vehicleData.productBrand,
              productCode: vehicleData.productCode,
              name: vehicleData.productName || `${vehicleData.productBrand} ${vehicleData.productCode}`,
              description: `CSVインポート時に製品が見つからなかったため独立車両として登録 (メーカー: ${vehicleData.productBrand}, 品番: ${vehicleData.productCode})`
            }
            console.log(`行 ${i + 2}: 製品が見つからないため独立車両として登録 (メーカー: ${vehicleData.productBrand}, 品番: ${vehicleData.productCode})`)
          }
        } else {
          // 製品情報がない場合は独立車両として登録
          independentVehicleData = {
            brand: vehicleData.independentBrand,
            name: vehicleData.independentName || '(商品名不明)',
            description: 'CSVインポート時に製品情報がなかったため独立車両として登録'
          }
          console.log(`行 ${i + 2}: 製品情報なし、独立車両として登録`)
        }

        // 保有車両を作成（独立車両の場合は後で関連付け）
        const ownedVehicle = await prisma.ownedVehicle.create({
          data: {
            userId: user.id,
            productId: productId,
            managementId: vehicleData.managementId,
            currentStatus: vehicleData.currentStatus,
            storageCondition: vehicleData.storageCondition,
            purchaseDate: vehicleData.purchaseDate,
            purchasePriceIncludingTax: vehicleData.purchasePriceIncludingTax,
            notes: vehicleData.notes,
            imageUrls: []
          }
        })

        // 独立車両の場合は独立車両情報も登録
        if (independentVehicleData) {
          await prisma.independentVehicle.create({
            data: {
              ownedVehicleId: ownedVehicle.id,
              brand: independentVehicleData.brand,
              productCode: independentVehicleData.productCode,
              name: independentVehicleData.name,
              vehicleType: vehicleData.independentVehicleType || independentVehicleData.vehicleType,
              description: independentVehicleData.description
            }
          })

          importResults.independentCount++
        } else {
          importResults.linkedCount++
        }

        importResults.successCount++

        // セットの場合、構成車両も自動登録
        if (productId) {
          // 製品情報を取得してセット構成車両を登録
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { name: true }
          })

          if (product) {
            await autoRegisterSetComponents(
              productId,
              user.id,
              product.name,
              vehicleData.managementId,
              vehicleData.currentStatus,
              vehicleData.storageCondition,
              vehicleData.purchaseDate as Date | null
            )
          }
        }
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
