import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const excludeSetSingle = searchParams.get('excludeSetSingle') === 'true'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    // タグフィルタパラメータ
    const tagsParam = searchParams.get('tags')
    const tagOperator = searchParams.get('tag_operator') || 'OR'
    const excludeTagsParam = searchParams.get('exclude_tags')

    // ログインユーザーを取得
    let currentUserId = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      currentUserId = user?.id
    }

    const where: Record<string, unknown> = {}

    if (brand) where.brand = brand

    // type フィルタの処理
    if (type) {
      where.type = type
    } else if (excludeSetSingle) {
      // typeが指定されていない場合のみexcludeSetSingleを適用
      where.type = { not: 'SET_SINGLE' }
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // タグフィルタの処理
    const tagIds = tagsParam ? tagsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : []
    const excludeTagIds = excludeTagsParam ? excludeTagsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : []

    if (tagIds.length > 0) {
      if (tagOperator === 'AND') {
        // AND検索: 指定されたすべてのタグを持つ製品
        where.productTags = {
          some: {
            tagId: { in: tagIds }
          }
        }
        // ANDの場合は、全てのタグを持つ製品のみを取得する必要があるため、
        // havingを使った集計が必要だが、Prismaでは複雑なので一度取得してフィルタする
      } else {
        // OR検索: 指定されたタグのいずれかを持つ製品
        where.productTags = {
          some: {
            tagId: { in: tagIds }
          }
        }
      }
    }

    // 除外タグの処理
    if (excludeTagIds.length > 0) {
      where.NOT = {
        productTags: {
          some: {
            tagId: { in: excludeTagIds }
          }
        }
      }
    }

    // ソート条件の構築
    let orderBy: Record<string, unknown> | Record<string, unknown>[] = { createdAt: 'desc' }

    switch (sortBy) {
      case 'createdAt':
        // 登録順
        orderBy = { createdAt: sortOrder }
        break
      case 'name':
        // 名称
        orderBy = { name: sortOrder }
        break
      case 'brandCode':
        // メーカー＋品番
        orderBy = [
          { brand: sortOrder },
          { productCode: sortOrder }
        ]
        break
      case 'category':
        // 分類順（タイプ→メーカー→品番）
        orderBy = [
          { type: sortOrder },
          { brand: sortOrder },
          { productCode: sortOrder }
        ]
        break
      default:
        orderBy = { createdAt: 'asc' }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          realVehicles: true,
          productTags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              ownedVehicles: currentUserId ? {
                where: { userId: currentUserId }
              } : true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    // AND検索の場合、全てのタグを持つ製品のみにフィルタ
    let filteredProducts = products
    if (tagIds.length > 0 && tagOperator === 'AND') {
      filteredProducts = products.filter(product => {
        const productTagIds = product.productTags.map(pt => pt.tagId)
        return tagIds.every(tagId => productTagIds.includes(tagId))
      })
    }

    return NextResponse.json({
      products: filteredProducts,
      pagination: {
        page,
        limit,
        total: tagOperator === 'AND' && tagIds.length > 0 ? filteredProducts.length : total,
        totalPages: Math.ceil((tagOperator === 'AND' && tagIds.length > 0 ? filteredProducts.length : total) / limit)
      }
    })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const data = await request.json()
    const { realVehicles, ...productData } = data

    // ユーザー情報を取得（認証がない場合はnull）
    let createdByUserId = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      createdByUserId = user?.id || null
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        createdByUserId,
        realVehicles: realVehicles ? {
          create: realVehicles
        } : undefined
      },
      include: {
        realVehicles: true,
        _count: { select: { ownedVehicles: true } }
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product create error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}