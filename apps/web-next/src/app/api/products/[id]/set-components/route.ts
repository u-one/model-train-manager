import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRODUCT_TYPE_SET, PRODUCT_TYPE_SET_SINGLE } from '@/constants/productTypes'
import { getAuthContext } from '@/lib/server/auth'
import { productInputSchema } from '@/lib/contracts/product'
import { apiErrorJson, apiErrorResponse } from '@/lib/server/api-errors'
import { createProduct } from '@/lib/server/products'
import { z } from 'zod'

const componentInputSchema = z.object({
  componentData: productInputSchema.omit({
    type: true,
    parentCode: true,
    setProductIds: true,
    linkOwnedVehicleId: true
  })
}).strict()

// セットの構成車両一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = Number(resolvedParams.id)
    if (!Number.isSafeInteger(productId) || productId < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')

    // 指定された製品がセットかどうか確認
    const setProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { brand: true, productCode: true, type: true }
    })

    if (!setProduct || setProduct.type !== PRODUCT_TYPE_SET) {
      return apiErrorJson('製品が見つからないか、セットではありません', 400, 'VALIDATION_ERROR')
    }

    // ID関係を優先し、移行中は未解決の旧 parentCode 関係も表示する。
    const components = await prisma.product.findMany({
      where: setProduct.productCode
        ? {
            type: PRODUCT_TYPE_SET_SINGLE,
            OR: [
              { parentSets: { some: { setProductId: productId } } },
              { brand: { equals: setProduct.brand, mode: 'insensitive' }, parentCode: { equals: setProduct.productCode, mode: 'insensitive' } }
            ]
          }
        : { type: PRODUCT_TYPE_SET_SINGLE, parentSets: { some: { setProductId: productId } } },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ components })
  } catch (error) {
    return apiErrorResponse(error, 'セット構成を取得できませんでした')
  }
}

// セット構成車両の追加・更新
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, user } = await getAuthContext()
    if (!session?.user?.email) {
      return apiErrorJson('ログインが必要です', 401, 'UNAUTHENTICATED')
    }
    if (!user) {
      return apiErrorJson('ユーザーが見つかりません', 404, 'NOT_FOUND')
    }

    const resolvedParams = await params
    const productId = Number(resolvedParams.id)
    if (!Number.isSafeInteger(productId) || productId < 1) return apiErrorJson('製品IDが不正です', 400, 'VALIDATION_ERROR')
    const requestData = componentInputSchema.safeParse(await request.json())
    if (!requestData.success) return apiErrorResponse(requestData.error, '構成製品の入力値を確認してください')

    // 指定された製品がセットかどうか確認
    const setProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { productCode: true, type: true }
    })

    if (!setProduct || setProduct.type !== PRODUCT_TYPE_SET) {
      return apiErrorJson('製品が見つからないか、セットではありません', 400, 'VALIDATION_ERROR')
    }

    // 構成車両を作成（parentCodeを設定）
    const parsed = productInputSchema.safeParse({
      ...requestData.data.componentData,
      type: PRODUCT_TYPE_SET_SINGLE,
      parentCode: setProduct.productCode,
      setProductIds: [productId]
    })
    if (!parsed.success) return apiErrorResponse(parsed.error, '構成製品の入力値を確認してください')
    const component = await createProduct(parsed.data, user.id)

    return NextResponse.json(component, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, '構成製品を作成できませんでした')
  }
}
