'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  Car,
  Users,
  AlertTriangle
} from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
}

const navItems = [
  {
    href: '/admin',
    icon: LayoutDashboard,
    label: 'ダッシュボード'
  },
  {
    href: '/admin/products',
    icon: Package,
    label: '製品管理'
  },
  {
    href: '/admin/owned-vehicles',
    icon: Car,
    label: '保有車両管理'
  },
  {
    href: '/admin/users',
    icon: Users,
    label: 'ユーザー管理'
  }
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 警告バナー */}
      <div className="bg-red-600 text-white px-4 py-2">
        <div className="flex items-center justify-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            管理者モード - データの変更・削除は慎重に行ってください
          </span>
        </div>
      </div>

      <div className="flex">
        {/* サイドバー */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
            <p className="text-sm text-gray-600 mt-1">
              {session?.user?.email}
            </p>
          </div>

          <nav className="px-6">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}