'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // まだ読み込み中

    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // リダイレクト処理中
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                ダッシュボード
              </h2>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      認証システムが正常に動作しています！
                    </p>
                    <div className="mt-2 text-sm text-green-700">
                      <p>ログイン中のユーザー: {session.user?.email}</p>
                      <p>次の段階でデータベース機能を実装します。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/products" className="group">
                  <div className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden rounded-lg p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">製品情報</h3>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      車両の製品情報を管理・検索
                    </p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      利用可能
                    </div>
                  </div>
                </Link>

                <Link href="/owned-vehicles" className="group">
                  <div className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden rounded-lg p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">保有車両</h3>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      保有している車両を管理・記録
                    </p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      利用可能
                    </div>
                  </div>
                </Link>

                <div className="bg-gray-50 overflow-hidden rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-900">整備記録</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    車両の整備履歴を記録
                  </p>
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    開発予定
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">開発状況</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">
                        Phase 2.4 完了: 保有車両機能
                      </p>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>保有車両一覧・詳細表示</li>
                          <li>車両状態・保管状態管理</li>
                          <li>購入情報・整備記録管理</li>
                          <li>認証システム統合</li>
                        </ul>
                        <p className="mt-2 font-medium">次回: Phase 3（画像アップロード・検索強化）の実装</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}