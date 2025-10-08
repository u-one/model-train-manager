import { getCategoryColor } from '@/constants/tags'

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
  imageUrls: string[]
  _count?: { ownedVehicles: number }
  productTags?: ProductTag[]
}

interface ProductListItemProps {
  product: Product
  onClick?: () => void
}

export default function ProductListItem({ product, onClick }: ProductListItemProps) {
  const displayTags = product.productTags?.slice(0, 3) || []
  const remainingCount = (product.productTags?.length || 0) - displayTags.length

  return (
    <div
      className="bg-white rounded shadow hover:shadow-md transition-shadow cursor-pointer p-3 mb-2"
      onClick={onClick}
    >
      <div className="flex gap-3 items-center">
        {/* 画像 */}
        <div className="w-16 h-11 flex-shrink-0">
          {product.imageUrls && product.imageUrls.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              className="w-16 h-11 object-contain bg-gray-100 rounded"
            />
          ) : (
            <div className="w-16 h-11 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-[10px]">画像なし</span>
            </div>
          )}
        </div>

        {/* 製品情報 */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm mb-1 truncate">
            {product.name}
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
            <span className="font-medium">{product.brand}</span>
            {product.productCode && (
              <>
                <span>|</span>
                <span>{product.productCode}</span>
              </>
            )}
            <span>|</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              product.type === 'SET' ? 'bg-red-100 text-red-700' :
              product.type === 'SET_SINGLE' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {
                product.type === 'SINGLE' ? '単品' :
                product.type === 'SET' ? 'セット' :
                product.type === 'SET_SINGLE' ? 'セット単品' :
                ''
              }
            </span>
            
            {product.priceIncludingTax && (
              <>
              <span>|</span>
              <span>¥{product.priceIncludingTax.toLocaleString()}</span>
              </>
            )}
            {displayTags.length > 0 && (
              <>
                <span>|</span>
                {displayTags.map((pt, idx) => (
                  <span key={pt.tag.id} className={`px-1.5 py-0.5 rounded text-[10px] ${getCategoryColor(pt.tag.category)}`}>
                    {pt.tag.name}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="text-gray-500">+{remainingCount}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* 価格と保有数 */}
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-600">
          
          {product._count && (
            product._count.ownedVehicles > 0 &&
            <span className="whitespace-nowrap">保有: {product._count.ownedVehicles}</span>
          )}
        </div>
      </div>
    </div>
  )
}