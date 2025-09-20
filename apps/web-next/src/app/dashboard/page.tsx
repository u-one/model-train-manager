'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                鉄道模型車両管理
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {session.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-8 w-8 rounded-full"
                    src={session.user.image}
                    alt={session.user.name || ''}
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                <div className="bg-gray-50 overflow-hidden rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-900">製品情報</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    車両の製品情報を管理
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    （データベース実装後に有効化）
                  </p>
                </div>

                <div className="bg-gray-50 overflow-hidden rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-900">保有車両</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    保有している車両を管理
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    （データベース実装後に有効化）
                  </p>
                </div>

                <div className="bg-gray-50 overflow-hidden rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-900">整備記録</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    車両の整備履歴を記録
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    （データベース実装後に有効化）
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}