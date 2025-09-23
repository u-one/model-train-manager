'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, AlertCircle } from 'lucide-react'

interface OwnedVehicle {
  id: number
  productId: number
  userId: string
  notes: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  condition: string
  location: string | null
  createdAt: string
  user: {
    name: string | null
    email: string | null
  }
  product: {
    brand: string
    productCode: string | null
    name: string
    type: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminOwnedVehicles() {
  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  useEffect(() => {
    fetchOwnedVehicles()
  }, [page, searchTerm])

  const fetchOwnedVehicles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('includeUserAndProduct', 'true')
      params.append('page', page.toString())
      params.append('limit', '50')
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/owned-vehicles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOwnedVehicles(data.ownedVehicles)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Owned vehicles fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 検索時にページをリセット
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === ownedVehicles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(ownedVehicles.map(v => v.id)))
    }
  }

  const handleSelectVehicle = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/owned-vehicles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ownedVehicleIds: Array.from(selectedIds)
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`${result.deletedCount}件の保有車両を削除しました`)
        setSelectedIds(new Set())
        await fetchOwnedVehicles()
      } else {
        alert(`削除エラー: ${result.error}\n${result.details || ''}`)
      }
    } catch (error) {
      alert('削除処理でエラーが発生しました')
      console.error('Bulk delete error:', error)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDeleteAll = async () => {
    if (confirmText !== '全削除') {
      alert('確認文字列が正しくありません')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/owned-vehicles/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert(`全ての保有車両データ（${result.deletedCount}件）を削除しました`)
        setSelectedIds(new Set())
        await fetchOwnedVehicles()
      } else {
        alert(`削除エラー: ${result.error}`)
      }
    } catch (error) {
      alert('削除処理でエラーが発生しました')
      console.error('Delete all error:', error)
    } finally {
      setDeleting(false)
      setShowDeleteAllDialog(false)
      setConfirmText('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">保有車両管理</h1>
        <p className="text-gray-600 mt-2">
          全ユーザーの保有車両データを管理・削除できます
        </p>
      </div>

      {/* 検索・操作バー */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="製品名・メーカー・ユーザー名で検索"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>選択項目を削除 ({selectedIds.size}件)</span>
              </button>
            )}

            <button
              onClick={() => setShowDeleteAllDialog(true)}
              className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-900 flex items-center space-x-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>全削除</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>全{pagination?.total || 0}件中 {ownedVehicles.length}件表示</span>
          {selectedIds.size > 0 && (
            <span className="text-blue-600">{selectedIds.size}件選択中</span>
          )}
        </div>
      </div>

      {/* 保有車両テーブル */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.size === ownedVehicles.length && ownedVehicles.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              全選択
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  選択
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メーカー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  品番
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  購入価格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  購入日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ownedVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className={`hover:bg-gray-50 ${
                    selectedIds.has(vehicle.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(vehicle.id)}
                      onChange={() => handleSelectVehicle(vehicle.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {vehicle.user.name || '未設定'}
                      </div>
                      <div className="text-gray-500">
                        {vehicle.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {vehicle.product.brand}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.product.productCode || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vehicle.condition === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                      vehicle.condition === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                      vehicle.condition === 'FAIR' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.condition === 'EXCELLENT' ? '優' :
                       vehicle.condition === 'GOOD' ? '良' :
                       vehicle.condition === 'FAIR' ? '可' : '不良'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vehicle.purchasePrice ? `¥${vehicle.purchasePrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vehicle.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ownedVehicles.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">該当する保有車両がありません</p>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-gray-900 font-medium bg-gray-50 rounded-md border">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">保有車両削除の確認</h3>
            </div>

            <p className="text-gray-600 mb-6">
              選択した{selectedIds.size}件の保有車両を削除します。
              <br />
              <strong className="text-red-600">関連する整備記録も同時に削除され、この操作は取り消せません。</strong>
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除実行'}
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全削除確認ダイアログ */}
      {showDeleteAllDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">全保有車両削除の確認</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                <strong className="text-red-600">すべての保有車両データを削除します。</strong>
                <br />
                この操作により、全ユーザーの保有車両と関連する整備記録がすべて削除されます。
                <br />
                <strong className="text-red-600">この操作は取り消せません。</strong>
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  続行するには下記に「<strong>全削除</strong>」と入力してください：
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="全削除"
                  className="mt-2 w-full px-3 py-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAll}
                disabled={deleting || confirmText !== '全削除'}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '削除中...' : '全削除実行'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteAllDialog(false)
                  setConfirmText('')
                }}
                disabled={deleting}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}