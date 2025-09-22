'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'

interface AdminLayoutPageProps {
  children: ReactNode
}

export default function AdminLayoutPage({ children }: AdminLayoutPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // 管理者権限チェック
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin/status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)

          if (!data.isAdmin) {
            router.push('/')
            return
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Admin status check failed:', error)
        router.push('/')
      }
    }

    checkAdminStatus()
  }, [session, status, router])

  if (status === 'loading' || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証確認中...</p>
        </div>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return null
  }

  return <AdminLayout>{children}</AdminLayout>
}