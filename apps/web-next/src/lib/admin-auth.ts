import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 管理者メールアドレスリスト
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['test@uoneweb.net']

/**
 * 現在のユーザーが管理者かどうかを判定
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return false
    }

    return ADMIN_EMAILS.includes(session.user.email)
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return { isAdmin: false, email: null }
    }

    return {
      isAdmin: ADMIN_EMAILS.includes(session.user.email),
      email: session.user.email
    }
  } catch (error) {
    console.error('Get admin status error:', error)
    return { isAdmin: false, email: null }
  }
}