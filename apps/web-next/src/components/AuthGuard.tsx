'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallbackUrl?: string
}

export default function AuthGuard({
  children,
  requireAuth = true,
  fallbackUrl = '/auth/signin'
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // まだ読み込み中

    if (requireAuth && !session) {
      router.push(fallbackUrl)
    }
  }, [session, status, requireAuth, fallbackUrl, router])

  // 認証が必要で、ロード中の場合
  if (requireAuth && status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">認証確認中...</p>
        </div>
      </div>
    )
  }

  // 認証が必要で、未ログインの場合
  if (requireAuth && !session) {
    return null // リダイレクト処理中
  }

  return <>{children}</>
}