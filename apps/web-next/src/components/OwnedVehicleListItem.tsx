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
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        {vehicle.imageUrls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.imageUrls[0]}
            alt={vehicleName}
            className="w-20 h-20 object-cover rounded flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs">画像なし</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-gray-900">{vehicle.managementId}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[vehicle.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[vehicle.currentStatus] || vehicle.currentStatus}
              </span>
            </div>
            {vehicle.purchasePriceIncludingTax && (
              <span className="text-lg font-semibold text-gray-900 ml-4">
                ¥{vehicle.purchasePriceIncludingTax.toLocaleString()}
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 truncate mt-1">{vehicleName}</h3>
          <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="font-medium">{brand}</span>
              {productCode && (
                <span>{productCode}</span>
              )}
              <span>{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
            </div>
            {vehicle.purchaseDate && (
              <span>購入: {new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}