import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processDateFields } from '@/lib/utils/date-utils'
import { isAdminUser } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeUserAndProduct = searchParams.get('includeUserAndProduct') === 'true'
    const isAdmin = await isAdminUser()

    // 管理者または特別なリクエストでない場合は、通常のユーザー処理
    if (!isAdmin || !includeUserAndProduct) {
      // ユーザーは認証時に自動作成されるため、必ず存在するはず
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const status = searchParams.get('status')
      const condition = searchParams.get('condition')
      const search = searchParams.get('search')
      const isIndependent = searchParams.get('isIndependent')
      const brand = searchParams.get('brand')
      const type = searchParams.get('type')
      const tags = searchParams.get('tags')
      const tagOperator = searchParams.get('tag_operator') || 'OR'
      const sortBy = searchParams.get('sortBy') || 'purchaseDate'
      const sortOrder = searchParams.get('sortOrder') || 'desc'
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = (page - 1) * limit

      const where: Record<string, unknown> = { userId: user.id }

      if (status) where.currentStatus = status
      if (condition) where.storageCondition = condition
      if (isIndependent === 'true') {
        // 独立車両のみ: independentVehicle が存在
        where.independentVehicle = { isNot: null }
      } else if (isIndependent === 'false') {
        // 製品リンク済みのみ: independentVehicle が存在しない
        where.independentVehicle = null
      }

      // メーカーフィルタ（製品または独立車両のメーカー）
      if (brand) {
        where.OR = [
          { product: { brand } },
          { independentVehicle: { brand } }
        ]
      }

      // 種別フィルタ（製品の種別のみ）
      if (type) {
        where.product = { type }
      }

      // タグフィルタ（製品のタグ）
      if (tags) {
        const tagIds = tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        if (tagIds.length > 0) {
          if (tagOperator === 'AND') {
            // AND: すべてのタグを持つ製品
            where.product = {
              ...where.product as object,
              productTags: {
                every: {
                  tagId: { in: tagIds }
                }
              }
            }
          } else {
            // OR: いずれかのタグを持つ製品
            where.product = {
              ...where.product as object,
              productTags: {
                some: {
                  tagId: { in: tagIds }
                }
              }
            }
          }
        }
      }

      if (search) {
        where.OR = [
          { managementId: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { product: { productCode: { contains: search, mode: 'insensitive' } } },
          { independentVehicle: { name: { contains: search, mode: 'insensitive' } } },
          { independentVehicle: { brand: { contains: search, mode: 'insensitive' } } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      }

      // ソート条件の構築
      let orderBy: Record<string, unknown> | Record<string, unknown>[] = { createdAt: 'desc' }

      switch (sortBy) {
        case 'purchaseDate':
          // 購入日+登録順（購入日でソート、同じ場合は登録順）
          orderBy = [
            { purchaseDate: sortOrder },
            { createdAt: sortOrder }
          ]
          break
        case 'name':
          // 名称（製品名または独立車両名）
          // Prismaでは複数テーブルの条件付きソートが難しいため、フロントエンドでソート
          orderBy = { createdAt: sortOrder }
          break
        case 'managementId':
          // 管理ID
          orderBy = { managementId: sortOrder }
          break
        case 'category':
          // 分類順（製品タイプ→メーカー→品番）
          // 複雑なため、フロントエンドでソート
          orderBy = { createdAt: sortOrder }
          break
        default:
          orderBy = { createdAt: 'desc' }
      }

      const [ownedVehicles, total] = await Promise.all([
        prisma.ownedVehicle.findMany({
          where,
          include: {
            product: {
              include: {
                realVehicles: true,
                productTags: {
                  include: {
                    tag: true
                  }
                }
              }
            },
            independentVehicle: true,
            maintenanceRecords: {
              orderBy: { maintenanceDate: 'desc' },
              take: 3
            }
          },
          orderBy,
          skip: offset,
          take: limit
        }),
        prisma.ownedVehicle.count({ where })
      ])

      return NextResponse.json({
        ownedVehicles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    // 管理者の場合：すべての保有車両をユーザーと製品情報付きで取得
    const adminPage = parseInt(searchParams.get('page') || '1')
    const adminLimit = parseInt(searchParams.get('limit') || '100')
    const adminSearch = searchParams.get('search')
    const adminOffset = (adminPage - 1) * adminLimit

    const adminWhere: Record<string, unknown> = {}

    if (adminSearch) {
      adminWhere.OR = [
        { managementId: { contains: adminSearch, mode: 'insensitive' } },
        { product: { name: { contains: adminSearch, mode: 'insensitive' } } },
        { product: { brand: { contains: adminSearch, mode: 'insensitive' } } },
        { product: { productCode: { contains: adminSearch, mode: 'insensitive' } } },
        { user: { name: { contains: adminSearch, mode: 'insensitive' } } },
        { user: { email: { contains: adminSearch, mode: 'insensitive' } } },
        { notes: { contains: adminSearch, mode: 'insensitive' } }
      ]
    }

    const [ownedVehicles, adminTotal] = await Promise.all([
      prisma.ownedVehicle.findMany({
        where: adminWhere,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          product: {
            select: {
              brand: true,
              productCode: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: adminOffset,
        take: adminLimit
      }),
      prisma.ownedVehicle.count({ where: adminWhere })
    ])

    return NextResponse.json({
      ownedVehicles,
      pagination: {
        page: adminPage,
        limit: adminLimit,
        total: adminTotal,
        totalPages: Math.ceil(adminTotal / adminLimit)
      }
    })
  } catch (error) {
    console.error('Owned vehicles fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch owned vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = await request.json()
    
    // 日付フィールドの一括処理
    try {
      processDateFields(data, ['purchaseDate'])
    } catch (error) {
      console.error('Date processing error:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Invalid date format' 
      }, { status: 400 })
    }

    const { vehicleType, independentVehicle, productBrand, productCode, ...ownedVehicleData } = data

    // 車両タイプに応じてデータを処理
    let createData: Record<string, unknown> = {
      ...ownedVehicleData,
      userId: user.id
    }

    if (vehicleType === 'INDEPENDENT' && independentVehicle) {
      // 独立車両の場合、independentVehicle を作成
      createData = {
        ...createData,
        independentVehicle: {
          create: independentVehicle
        }
      }
      // productId は設定しない
      delete createData.productId
    } else if (vehicleType === 'PRODUCT') {
      // 製品車両の場合
      if (productBrand && productCode) {
        // メーカー・品番が指定されている場合、製品を検索
        const product = await prisma.product.findFirst({
          where: {
            brand: {
              equals: productBrand,
              mode: 'insensitive'
            },
            productCode: {
              equals: productCode,
              mode: 'insensitive'
            }
          }
        })

        if (product) {
          createData.productId = product.id
        } else {
          return NextResponse.json(
            {
              error: 'マッチする製品が見つかりません',
              details: `メーカー: ${productBrand}, 品番: ${productCode}`
            },
            { status: 400 }
          )
        }
      } else if (createData.productId) {
        // 既存のproductId使用（後方互換性）
      } else {
        return NextResponse.json(
          { error: '製品車両の場合、製品IDまたはメーカー・品番が必要です' },
          { status: 400 }
        )
      }
    }

    // 不要なフィールドを削除
    delete createData.vehicleType

    const ownedVehicle = await prisma.ownedVehicle.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: createData as any,
      include: {
        product: {
          include: {
            realVehicles: true
          }
        },
        independentVehicle: true,
        maintenanceRecords: true
      }
    })

    return NextResponse.json(ownedVehicle, { status: 201 })
  } catch (error) {
    console.error('Owned vehicle create error:', error)
    return NextResponse.json({ error: 'Failed to create owned vehicle' }, { status: 500 })
  }
}