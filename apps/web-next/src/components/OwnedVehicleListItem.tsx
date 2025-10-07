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
      <div className="flex gap-3 items-center">
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

        {/* 車両情報 */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm mb-1 truncate">
            {vehicleName}
          </div>
          <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-blue-700">{vehicle.managementId}</span>
            <span>|</span>
            <span className="font-medium">{brand}</span>
            {productCode && (
              <>
                <span>|</span>
                <span>{productCode}</span>
              </>
            )}
            <span>|</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[vehicle.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
              {statusLabels[vehicle.currentStatus] || vehicle.currentStatus}
            </span>
            <span>|</span>
            <span>{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
          </div>
        </div>

        {/* 価格と購入日 */}
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-600">
          {vehicle.purchasePriceIncludingTax && (
            <span>¥{vehicle.purchasePriceIncludingTax.toLocaleString()}</span>
          )}
          {vehicle.purchaseDate && (
            <span className="whitespace-nowrap">購入: {new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
          )}
        </div>
      </div>
    </div>
  )
}