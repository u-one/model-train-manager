import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiErrorResponse } from '@/lib/server/api-errors'

export async function GET() {
  try {
    const [totalProducts, recentProducts, popularTags] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          name: true,
          brand: true,
          productCode: true,
          type: true,
          createdAt: true,
          productTags: {
            select: {
              tag: { select: { id: true, name: true, category: true } }
            }
          }
        }
      }),
      prisma.tag.findMany({
        take: 10,
        orderBy: [{ productTags: { _count: 'desc' } }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          category: true,
          _count: { select: { productTags: true } }
        }
      })
    ])

    return NextResponse.json({ totalProducts, recentProducts, popularTags })
  } catch (error) {
    return apiErrorResponse(error, '公開統計を取得できませんでした')
  }
}
