interface Tag {
  id: number
  name: string
  category: string
}

interface ProductTag {
  tag: Tag
}

interface Product {
  id: number
  brand: string
  productCode: string | null
  name: string
  type: string
  priceIncludingTax: number | null
  imageUrl: string | null
  _count?: { ownedVehicles: number }
  productTags?: ProductTag[]
}

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

const TAG_CATEGORY_COLORS: Record<string, string> = {
  vehicle_type: 'bg-blue-100 text-blue-800',
  company: 'bg-green-100 text-green-800',
  feature: 'bg-purple-100 text-purple-800',
  era: 'bg-orange-100 text-orange-800'
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const displayTags = product.productTags?.slice(0, 3) || []
  const remainingCount = (product.productTags?.length || 0) - displayTags.length

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

        {/* タグバッジ */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayTags.map((pt) => (
              <span
                key={pt.tag.id}
                className={`text-xs px-2 py-0.5 rounded ${TAG_CATEGORY_COLORS[pt.tag.category] || 'bg-gray-100 text-gray-800'}`}
              >
                {pt.tag.name}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                +{remainingCount}
              </span>
            )}
          </div>
        )}

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