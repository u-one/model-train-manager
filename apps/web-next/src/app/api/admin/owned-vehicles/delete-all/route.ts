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

    // 関連する整備記録も含めて削除
    const deletedMaintenanceRecords = await prisma.maintenanceRecord.deleteMany({})
    const deletedOwnedVehicles = await prisma.ownedVehicle.deleteMany({})

    return NextResponse.json({
      deletedCount: deletedOwnedVehicles.count,
      deletedMaintenanceRecords: deletedMaintenanceRecords.count,
      message: 'All owned vehicles and related maintenance records deleted successfully'
    })
  } catch (error) {
    console.error('Delete all owned vehicles error:', error)
    return NextResponse.json(
      { error: 'Failed to delete all owned vehicles' },
      { status: 500 }
    )
  }
}