interface Product {
  id: number
  brand: string
  productCode: string | null
  name: string
  type: string
  priceIncludingTax: number | null
  imageUrl: string | null
  _count?: { ownedVehicles: number }
}

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4"
      onClick={onClick}
    >
      <div className="aspect-w-16 aspect-h-9 mb-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-400">画像なし</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <span className="text-sm text-gray-600 font-medium">{product.brand}</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {product.type}
          </span>
        </div>

        {product.productCode && (
          <p className="text-sm text-gray-500">{product.productCode}</p>
        )}

        <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>

        <div className="flex justify-between items-center">
          {product.priceIncludingTax && (
            <span className="text-lg font-semibold text-gray-900">
              ¥{product.priceIncludingTax.toLocaleString()}
            </span>
          )}

          {product._count && (
            <span className="text-sm text-gray-600">
              保有: {product._count.ownedVehicles}台
            </span>
          )}
        </div>
      </div>
    </div>
  )
}