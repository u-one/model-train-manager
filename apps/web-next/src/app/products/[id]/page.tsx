'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: number
  brand: string
  productCode: string | null
  name: string
  type: string
  releaseYear: number | null
  priceExcludingTax: number | null
  priceIncludingTax: number | null
  description: string | null
  imageUrl: string | null
  realVehicles: RealVehicle[]
  ownedVehicles: OwnedVehicle[]
  _count?: { ownedVehicles: number }
}

interface RealVehicle {
  id: number
  vehicleType: string | null
  company: string | null
  manufacturingYear: string | null
  operationLine: string | null
  notes: string | null
}

interface OwnedVehicle {
  id: number
  managementId: string
  user: { id: number; name: string }
}


export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [setComponents, setSetComponents] = useState<Product[]>([])
  const [parentSets, setParentSets] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${resolvedParams.id}`)
        if (response.ok) {
          const data = await response.json()
          setProduct(data)

          // セット商品の場合、構成車両を取得
          if (data.type === 'SET') {
            const componentsResponse = await fetch(`/api/products/${resolvedParams.id}/set-components`)
            if (componentsResponse.ok) {
              const componentsData = await componentsResponse.json()
              setSetComponents(componentsData.components || [])
            }
          }

          // 構成車両やセット単品の場合、所属セットを取得
          if (data.type === 'SET_SINGLE' || data.type === 'SINGLE') {
            const parentSetsResponse = await fetch(`/api/products/${resolvedParams.id}/parent-sets`)
            if (parentSetsResponse.ok) {
              const parentSetsData = await parentSetsResponse.json()
              setParentSets(parentSetsData.parentSets || [])
            }
          }
        } else {
          router.push('/products')
        }
      } catch (error) {
        console.error('Failed to fetch product:', error)
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [resolvedParams.id, router])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← 戻る
        </button>

        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <button
            onClick={() => router.push(`/products/${product.id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            編集
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 製品画像 */}
        <div>
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">画像なし</span>
            </div>
          )}
        </div>

        {/* 製品情報 */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">メーカー:</span>
                <span className="font-medium">{product.brand}</span>
              </div>
              {product.productCode && (
                <div className="flex justify-between">
                  <span className="text-gray-600">品番:</span>
                  <span className="font-medium">{product.productCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">タイプ:</span>
                <span className="font-medium">{product.type}</span>
              </div>
              {product.releaseYear && (
                <div className="flex justify-between">
                  <span className="text-gray-600">発売年:</span>
                  <span className="font-medium">{product.releaseYear}年</span>
                </div>
              )}
              {product.priceIncludingTax && (
                <div className="flex justify-between">
                  <span className="text-gray-600">価格:</span>
                  <span className="font-medium text-lg">¥{product.priceIncludingTax.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {product.description && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">説明</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 実車情報 */}
      {product.realVehicles.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">実車情報</h2>
          <div className="space-y-4">
            {product.realVehicles.map((vehicle) => (
              <div key={vehicle.id} className="border-l-4 border-blue-500 pl-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {vehicle.vehicleType && (
                    <div>
                      <span className="text-gray-600">形式:</span>
                      <span className="ml-2 font-medium">{vehicle.vehicleType}</span>
                    </div>
                  )}
                  {vehicle.company && (
                    <div>
                      <span className="text-gray-600">会社:</span>
                      <span className="ml-2 font-medium">{vehicle.company}</span>
                    </div>
                  )}
                  {vehicle.manufacturingYear && (
                    <div>
                      <span className="text-gray-600">製造年:</span>
                      <span className="ml-2 font-medium">{vehicle.manufacturingYear}</span>
                    </div>
                  )}
                  {vehicle.operationLine && (
                    <div>
                      <span className="text-gray-600">運用路線:</span>
                      <span className="ml-2 font-medium">{vehicle.operationLine}</span>
                    </div>
                  )}
                </div>
                {vehicle.notes && (
                  <p className="mt-2 text-gray-700 text-sm">{vehicle.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* セット構成車両 */}
      {product.type === 'SET' && setComponents.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            セット構成車両 ({setComponents.length}両)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {setComponents.map((component) => (
              <div
                key={component.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/products/${component.id}`)}
              >
                {component.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={component.imageUrl}
                    alt={component.name}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center mb-3">
                    <span className="text-gray-400">画像なし</span>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{component.brand}</span>
                    <span className="text-gray-600">{component.type}</span>
                  </div>
                  {component.productCode && (
                    <p className="text-sm text-gray-600">品番: {component.productCode}</p>
                  )}
                  <h3 className="font-medium text-gray-900 line-clamp-2">{component.name}</h3>
                  <div className="flex justify-between items-center">
                    {component.priceIncludingTax && (
                      <span className="text-lg font-semibold text-green-600">
                        ¥{component.priceIncludingTax.toLocaleString()}
                      </span>
                    )}
                    <span className="text-sm text-gray-600">
                      保有: {component._count?.ownedVehicles || 0}台
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 所属セット */}
      {(product.type === 'SET_SINGLE' || product.type === 'SINGLE') && parentSets.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            所属セット ({parentSets.length}件)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parentSets.map((parentSet) => (
              <div
                key={parentSet.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/products/${parentSet.id}`)}
              >
                {parentSet.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={parentSet.imageUrl}
                    alt={parentSet.name}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center mb-3">
                    <span className="text-gray-400">画像なし</span>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{parentSet.brand}</span>
                    <span className="text-gray-600">{parentSet.type}</span>
                  </div>
                  {parentSet.productCode && (
                    <p className="text-sm text-gray-600">品番: {parentSet.productCode}</p>
                  )}
                  <h3 className="font-medium text-gray-900 line-clamp-2">{parentSet.name}</h3>
                  <div className="flex justify-between items-center">
                    {parentSet.priceIncludingTax && (
                      <span className="text-lg font-semibold text-green-600">
                        ¥{parentSet.priceIncludingTax.toLocaleString()}
                      </span>
                    )}
                    <span className="text-sm text-gray-600">
                      保有: {parentSet._count?.ownedVehicles || 0}台
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保有状況 */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          保有状況 ({product.ownedVehicles.length}台)
        </h2>
        {product.ownedVehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.ownedVehicles.map((owned) => (
              <div key={owned.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{owned.managementId}</span>
                  <span className="text-sm text-gray-600">{owned.user.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">まだ保有されていません</p>
        )}
      </div>
    </div>
  )
}