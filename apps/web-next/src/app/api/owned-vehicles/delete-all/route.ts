import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ログインユーザーの情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ユーザーの保有車両IDを取得
    const ownedVehicles = await prisma.ownedVehicle.findMany({
      where: { userId: user.id },
      select: { id: true }
    })

    const vehicleIds = ownedVehicles.map(v => v.id)

    // 関連する整備記録を削除
    const deletedMaintenanceRecords = await prisma.maintenanceRecord.deleteMany({
      where: { ownedVehicleId: { in: vehicleIds } }
    })

    // ユーザーの保有車両を削除
    const deletedOwnedVehicles = await prisma.ownedVehicle.deleteMany({
      where: { userId: user.id }
    })

    return NextResponse.json({
      deletedCount: deletedOwnedVehicles.count,
      deletedMaintenanceRecords: deletedMaintenanceRecords.count,
      message: 'All your owned vehicles and related maintenance records deleted successfully'
    })
  } catch (error) {
    console.error('Delete all user owned vehicles error:', error)
    return NextResponse.json(
      { error: 'Failed to delete all owned vehicles' },
      { status: 500 }
    )
  }
}
