import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processDateFields } from '@/lib/utils/date-utils'

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
    
    // 日付フィールドの一括処理
    try {
      processDateFields(data, ['purchaseDate'])
    } catch (error) {
      console.error('Date processing error:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Invalid date format' 
      }, { status: 400 })
    }

    const { vehicleType, independentVehicle, ...ownedVehicleData } = data

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
      // 製品車両の場合、productId を使用
      // independentVehicle は作成しない
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