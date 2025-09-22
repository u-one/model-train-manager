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

export default function AdminOwnedVehicles() {
  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchOwnedVehicles()
  }, [])

  const fetchOwnedVehicles = async () => {
    try {
      const response = await fetch('/api/owned-vehicles?includeUserAndProduct=true')
      if (response.ok) {
        const data = await response.json()
        setOwnedVehicles(data.ownedVehicles)
      }
    } catch (error) {
      console.error('Owned vehicles fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOwnedVehicles = ownedVehicles.filter(vehicle =>
    vehicle.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.product.productCode && vehicle.product.productCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vehicle.user.name && vehicle.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vehicle.user.email && vehicle.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOwnedVehicles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOwnedVehicles.map(v => v.id)))
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>選択項目を削除 ({selectedIds.size}件)</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>全{filteredOwnedVehicles.length}件</span>
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
              checked={selectedIds.size === filteredOwnedVehicles.length && filteredOwnedVehicles.length > 0}
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
              {filteredOwnedVehicles.map((vehicle) => (
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

        {filteredOwnedVehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">該当する保有車両がありません</p>
          </div>
        )}
      </div>

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
    </div>
  )
}