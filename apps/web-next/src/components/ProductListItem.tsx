import { getCategoryColor } from '@/constants/tags'
import { getProductTypeLabel, getProductTypeColor } from '@/constants/productTypes'
import { Product } from '@/types/domain'
import VehicleImage from '@/components/shared/VehicleImage'

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
      {/* デスクトップ: 横並び */}
      <div className="hidden sm:flex gap-3 items-center">
        {/* 画像 */}
        <div className="w-16 h-11 flex-shrink-0">
          <VehicleImage
            imageUrl={product.imageUrls?.[0]}
            alt={product.name}
            className="w-16 h-11 object-contain"
            size="sm"
          />
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
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getProductTypeColor(product.type)
              }`}>
              {
                getProductTypeLabel(product.type)
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
                {displayTags.map((pt) => (
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

        {/* 保有数 */}
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-600">
          {product._count && (
            product._count.ownedVehicles > 0 &&
            <span className="whitespace-nowrap">保有: {product._count.ownedVehicles}</span>
          )}
        </div>
      </div>

      {/* モバイル: 縦積み */}
      <div className="sm:hidden">
        <div className="flex gap-3 mb-2">
          {/* 画像 */}
          <div className="w-20 h-15 flex-shrink-0">
            <VehicleImage
              imageUrl={product.imageUrls?.[0]}
              alt={product.name}
              className="w-20 h-15 object-contain"
              size="sm"
            />
          </div>

          {/* タイトルと基本情報 */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
              {product.name}
            </div>
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-medium">{product.brand}</span>
              {product.productCode && (
                <>
                  <span className="mx-1">|</span>
                  <span>{product.productCode}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getProductTypeColor(product.type)}`}>
                {getProductTypeLabel(product.type)}
              </span>
              {product.priceIncludingTax && (
                <span className="text-xs text-gray-600">
                  ¥{product.priceIncludingTax.toLocaleString()}
                </span>
              )}
              {displayTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {displayTags.map((pt) => (
                    <span key={pt.tag.id} className={`px-1.5 py-0.5 rounded text-[10px] ${getCategoryColor(pt.tag.category)}`}>
                      {pt.tag.name}
                    </span>
                  ))}
                </div>
              )}


              {product._count && product._count.ownedVehicles > 0 && (
                <span className="text-xs text-gray-600">
                  保有: {product._count.ownedVehicles}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
