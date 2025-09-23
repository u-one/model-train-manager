'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface AdminStatus {
  isAdmin: boolean
  loading: boolean
}

export function useAdmin(): AdminStatus {
  const { data: session, status } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === 'loading') return

      if (!session?.user?.email) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Failed to check admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [session, status])

  return { isAdmin, loading: status === 'loading' || loading }
}