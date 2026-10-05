import { getAuthContext } from '@/lib/server/auth'

/**
 * 現在のユーザーが管理者かどうかを判定
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    return (await getAuthContext()).isAdmin
  } catch (error) {
    console.error('Admin auth error:', error)
    return false
  }
}

/**
 * 管理者権限を要求するガード関数
 * 管理者でない場合は例外を投げる
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await isAdminUser()

  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }
}

/**
 * クライアントサイドでの管理者判定用の型
 */
export interface AdminStatus {
  isAdmin: boolean
  email: string | null
}

/**
 * 管理者状態を取得するAPI用のヘルパー
 */
export async function getAdminStatus(): Promise<AdminStatus> {
  try {
    const { session, isAdmin } = await getAuthContext()
    if (!session?.user?.email) {
      return { isAdmin: false, email: null }
    }

    return {
      isAdmin,
      email: session.user.email
    }
  } catch (error) {
    console.error('Get admin status error:', error)
    return { isAdmin: false, email: null }
  }
}
