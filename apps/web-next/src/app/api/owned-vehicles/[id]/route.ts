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

    const ownedVehicle = await prisma.ownedVehicle.updateMany({
      where: {
        id,
        userId: user.id
      },
      data
    })

    if (ownedVehicle.count === 0) {
      return NextResponse.json({ error: 'Owned vehicle not found' }, { status: 404 })
    }

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