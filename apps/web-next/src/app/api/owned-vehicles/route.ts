import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーは認証時に自動作成されるため、必ず存在するはず
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const condition = searchParams.get('condition')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = { userId: user.id }

    if (status) where.currentStatus = status
    if (condition) where.storageCondition = condition
    if (search) {
      where.OR = [
        { managementId: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { productCode: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [ownedVehicles, total] = await Promise.all([
      prisma.ownedVehicle.findMany({
        where,
        include: {
          product: {
            include: {
              realVehicles: true
            }
          },
          independentVehicle: true,
          maintenanceRecords: {
            orderBy: { maintenanceDate: 'desc' },
            take: 3
          }
        },
        orderBy: { createdAt: 'desc' },
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

    const ownedVehicle = await prisma.ownedVehicle.create({
      data: {
        ...data,
        userId: user.id
      },
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