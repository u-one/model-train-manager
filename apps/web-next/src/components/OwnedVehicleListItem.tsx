import { getProductTypeLabel, getProductTypeColor } from '@/constants/productTypes'

interface OwnedVehicle {
  id: number
  managementId: string
  currentStatus: string
  storageCondition: string
  purchaseDate: string | null
  purchasePriceIncludingTax: number | null
  notes: string | null
  imageUrls: string[]
  product?: {
    id: number
    name: string
    brand: string
    productCode: string | null
    type: string
    productTags?: {
      tag: {
        id: number
        name: string
        category: string
      }
    }[]
  } | null
  independentVehicle?: {
    name: string
    brand: string | null
    vehicleType: string | null
  } | null
}

interface OwnedVehicleListItemProps {
  vehicle: OwnedVehicle
  onClick?: () => void
}

const statusLabels: Record<string, string> = {
  NORMAL: '正常',
  NEEDS_REPAIR: '要修理',
  BROKEN: '故障中'
}

const statusColors: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-800',
  NEEDS_REPAIR: 'bg-yellow-100 text-yellow-800',
  BROKEN: 'bg-red-100 text-red-800'
}

const conditionLabels: Record<string, string> = {
  WITH_CASE: 'ケースあり',
  WITHOUT_CASE: 'ケースなし'
}

export default function OwnedVehicleListItem({ vehicle, onClick }: OwnedVehicleListItemProps) {
  const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'
  const brand = vehicle.product?.brand || vehicle.independentVehicle?.brand || '不明'
  const productCode = vehicle.product?.productCode

  return (
    <div
      className="bg-white rounded shadow hover:shadow-md transition-shadow cursor-pointer p-3 mb-2"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* 画像 - 64px × 44px */}
        <div className="w-16 h-11 flex-shrink-0">
          {vehicle.imageUrls.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.imageUrls[0]}
              alt={vehicleName}
              className="w-16 h-11 object-contain bg-gray-100 rounded"
            />
          ) : (
            <div className="w-16 h-11 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-[10px]">画像なし</span>
            </div>
          )}
        </div>

        {/* 車両情報 - 3行構成 */}
        <div className="flex-1 min-w-0">
          {/* 1行目: 車両名 */}
          <div className="font-semibold text-gray-900 text-sm mb-1 truncate">
            {vehicleName}
          </div>

          {/* 2行目: 製品情報（メーカー、品番、種別、タグ） */}
          <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium">{brand}</span>
            {productCode && (
              <>
                <span>|</span>
                <span>{productCode}</span>
              </>
            )}
            {vehicle.product?.type && (
              <>
                <span>|</span>
                <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${getProductTypeColor(vehicle.product.type)}`}>{getProductTypeLabel(vehicle.product.type)}</span>
              </>
            )}
            {vehicle.independentVehicle?.vehicleType && (
              <>
                <span>|</span>
                <span>{vehicle.independentVehicle.vehicleType}</span>
              </>
            )}
            {vehicle.product?.productTags && vehicle.product.productTags.length > 0 && (
              <>
                <span>|</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {vehicle.product.productTags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 3行目: 保有車両情報（管理ID、購入日、価格、ステータス、保管状態） */}
          <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-blue-700">{vehicle.managementId}</span>
            {vehicle.purchaseDate && (
              <>
                <span>|</span>
                <span className="whitespace-nowrap">購入: {new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
              </>
            )}
            {vehicle.purchasePriceIncludingTax && (
              <>
                <span>|</span>
                <span>¥{vehicle.purchasePriceIncludingTax.toLocaleString()}</span>
              </>
            )}
            <span>|</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[vehicle.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
              {statusLabels[vehicle.currentStatus] || vehicle.currentStatus}
            </span>
            <span>|</span>
            <span>{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
          </div>
        </div>
      </div>
    </div>
  )
}