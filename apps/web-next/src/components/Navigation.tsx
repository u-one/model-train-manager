'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useAdmin } from '@/hooks/useAdmin'

export default function Navigation() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isAdmin } = useAdmin()

  const navItems = [
    { href: '/dashboard', label: 'ダッシュボード' },
    { href: '/products', label: '製品一覧' },
    { href: '/owned-vehicles', label: '保有車両' },
  ]

  return (
    <nav className="bg-[#2c3e50] shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-white">
              鉄道模型管理
            </Link>

            {session && (
              <div className="hidden md:flex space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-[#3498db] text-white'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    管理
                  </Link>
                )}
                <span className="text-sm text-white">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-white/10 text-white px-3 py-2 rounded text-sm hover:bg-white/20 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-white/10 text-white px-4 py-2 rounded text-sm hover:bg-white/20 transition-colors"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}