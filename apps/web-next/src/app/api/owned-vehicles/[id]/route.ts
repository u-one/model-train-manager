import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id: idStr } = await params
    const id = parseInt(idStr)

    const ownedVehicle = await prisma.ownedVehicle.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        product: {
          include: {
            realVehicles: true
          }
        },
        independentVehicle: true,
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' }
        }
      }
    })

    if (!ownedVehicle) {
      return NextResponse.json({ error: 'Owned vehicle not found' }, { status: 404 })
    }

    return NextResponse.json(ownedVehicle)
  } catch (error) {
    console.error('Owned vehicle fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch owned vehicle' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id: idStr } = await params
    const id = parseInt(idStr)
    const data = await request.json()
    const { vehicleType, independentVehicle, ...ownedVehicleData } = data

    // 既存の保有車両を確認
    const existingVehicle = await prisma.ownedVehicle.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        independentVehicle: true
      }
    })

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Owned vehicle not found' }, { status: 404 })
    }

    // 車両タイプに応じてデータを処理
    let finalUpdateData: Record<string, unknown> = {
      ...ownedVehicleData
    }

    if (vehicleType === 'INDEPENDENT' && independentVehicle) {
      // 独立車両の場合
      finalUpdateData = {
        ...finalUpdateData,
        productId: null
      }

      if (existingVehicle.independentVehicle) {
        // 既存の独立車両情報を更新
        await prisma.independentVehicle.update({
          where: { ownedVehicleId: id },
          data: independentVehicle
        })
      } else {
        // 新規に独立車両情報を作成
        await prisma.independentVehicle.create({
          data: {
            ...independentVehicle,
            ownedVehicleId: id
          }
        })
      }
    } else if (vehicleType === 'PRODUCT') {
      // 製品車両の場合
      if (existingVehicle.independentVehicle) {
        // 既存の独立車両情報を削除
        await prisma.independentVehicle.delete({
          where: { ownedVehicleId: id }
        })
      }
    }

    // 不要なフィールドを削除
    delete finalUpdateData.vehicleType

    // 保有車両情報を更新
    await prisma.ownedVehicle.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: finalUpdateData as any
    })

    // 更新後のデータを取得
    const updatedVehicle = await prisma.ownedVehicle.findUnique({
      where: { id },
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

    return NextResponse.json(updatedVehicle)
  } catch (error) {
    console.error('Owned vehicle update error:', error)
    return NextResponse.json({ error: 'Failed to update owned vehicle' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id: idStr } = await params
    const id = parseInt(idStr)

    const deleteResult = await prisma.ownedVehicle.deleteMany({
      where: {
        id,
        userId: user.id
      }
    })

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Owned vehicle not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Owned vehicle deleted successfully' })
  } catch (error) {
    console.error('Owned vehicle delete error:', error)
    return NextResponse.json({ error: 'Failed to delete owned vehicle' }, { status: 500 })
  }
}