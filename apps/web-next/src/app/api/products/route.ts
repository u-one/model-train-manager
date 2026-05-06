import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseQueryParams, buildWhereClause, buildOrderBy } from '@/lib/products-query'
import { getCurrentUserId, createProductSchema } from '@/lib/product-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const params = parseQueryParams(searchParams)
    const { page, limit } = params
    const offset = (page - 1) * limit

    const currentUserId = getCurrentUserId(session)
    const where = buildWhereClause(params)
    const orderBy = buildOrderBy(params.sortBy, params.sortOrder)

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
          _count: currentUserId ? {
            select: {
              ownedVehicles: {
                where: { userId: currentUserId }
              }
            }
          } : undefined
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const { realVehicles, ...productData } = createProductSchema.parse(body)
    const createdByUserId = getCurrentUserId(session)

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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 })
    }
    console.error('Product create error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
