'use client'

import { useState, useEffect } from 'react'
import { Package, Car, Users, Database } from 'lucide-react'

interface SystemStats {
  totalProducts: number
  totalOwnedVehicles: number
  totalUsers: number
  recentImports: number
  activeUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Stats fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: '総製品数',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: '総保有車両数',
      value: stats?.totalOwnedVehicles || 0,
      icon: Car,
      color: 'bg-green-500'
    },
    {
      title: '総ユーザー数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: '最近のインポート',
      value: stats?.recentImports || 0,
      icon: Database,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理ダッシュボード</h1>
        <p className="text-gray-600 mt-2">
          システム全体の統計情報と管理機能へのアクセス
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            クイックアクション
          </h2>
          <div className="space-y-3">
            <a
              href="/admin/products"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">製品管理</p>
                  <p className="text-sm text-gray-600">製品の一覧・削除</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/owned-vehicles"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Car className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">保有車両管理</p>
                  <p className="text-sm text-gray-600">保有車両の一覧・削除</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/users"
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 text-purple-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">ユーザー管理</p>
                  <p className="text-sm text-gray-600">ユーザー一覧・統計</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            システム情報
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">データベース</p>
              <p className="text-lg text-gray-900">Supabase PostgreSQL</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">最終更新</p>
              <p className="text-lg text-gray-900">
                {new Date().toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">バージョン</p>
              <p className="text-lg text-gray-900">Phase 2.12</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}