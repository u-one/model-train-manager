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

interface ProductListItemProps {
  product: Product
  onClick?: () => void
}

const TAG_CATEGORY_COLORS: Record<string, string> = {
  vehicle_type: 'bg-blue-100 text-blue-800',
  company: 'bg-green-100 text-green-800',
  feature: 'bg-purple-100 text-purple-800',
  era: 'bg-orange-100 text-orange-800'
}

export default function ProductListItem({ product, onClick }: ProductListItemProps) {
  const displayTags = product.productTags?.slice(0, 5) || []
  const remainingCount = (product.productTags?.length || 0) - displayTags.length

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-20 h-20 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs">画像なし</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
            {product.priceIncludingTax && (
              <span className="text-lg font-semibold text-gray-900 ml-4">
                ¥{product.priceIncludingTax.toLocaleString()}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="font-medium">{product.brand}</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {product.type}
              </span>
              {product.productCode && (
                <span>{product.productCode}</span>
              )}
            </div>
            {product._count && (
              <span>保有: {product._count.ownedVehicles}台</span>
            )}
          </div>

          {/* タグバッジ */}
          {displayTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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
        </div>
      </div>
    </div>
  )
}