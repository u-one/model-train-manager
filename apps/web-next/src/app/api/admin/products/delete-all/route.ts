import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminUser } from '@/lib/admin-auth'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminUser()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 製品削除に伴い関連データも削除（CASCADE設定により自動削除される）
    // 1. 整備記録削除（保有車両 -> 製品の関連により）
    const deletedMaintenanceRecords = await prisma.maintenanceRecord.deleteMany({})

    // 2. 保有車両削除（製品との関連により）
    const deletedOwnedVehicles = await prisma.ownedVehicle.deleteMany({})

    // 3. 実車情報削除（製品との関連により）
    const deletedRealVehicles = await prisma.realVehicle.deleteMany({})

    // 4. 製品削除
    const deletedProducts = await prisma.product.deleteMany({})

    return NextResponse.json({
      deletedCount: deletedProducts.count,
      deletedOwnedVehicles: deletedOwnedVehicles.count,
      deletedMaintenanceRecords: deletedMaintenanceRecords.count,
      deletedRealVehicles: deletedRealVehicles.count,
      message: 'All products and related data deleted successfully'
    })
  } catch (error) {
    console.error('Delete all products error:', error)
    return NextResponse.json(
      { error: 'Failed to delete all products' },
      { status: 500 }
    )
  }
}