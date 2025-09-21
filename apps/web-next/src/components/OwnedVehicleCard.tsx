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

interface OwnedVehicleCardProps {
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

export default function OwnedVehicleCard({ vehicle, onClick }: OwnedVehicleCardProps) {
  const vehicleName = vehicle.product?.name || vehicle.independentVehicle?.name || '名称未設定'
  const brand = vehicle.product?.brand || vehicle.independentVehicle?.brand || '不明'
  const productCode = vehicle.product?.productCode

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900">{vehicle.managementId}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[vehicle.currentStatus] || 'bg-gray-100 text-gray-800'}`}>
              {statusLabels[vehicle.currentStatus] || vehicle.currentStatus}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">{brand}</p>
          {productCode && (
            <p className="text-xs text-gray-500">{productCode}</p>
          )}
        </div>

        {vehicle.imageUrls.length > 0 && (
          <div className="w-16 h-12 ml-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vehicle.imageUrls[0]}
              alt={vehicleName}
              className="w-full h-full object-cover rounded"
            />
          </div>
        )}
      </div>

      <h3 className="font-medium text-gray-900 line-clamp-2 mb-3">{vehicleName}</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">保管状態:</span>
          <span className="font-medium">{conditionLabels[vehicle.storageCondition] || vehicle.storageCondition}</span>
        </div>

        {vehicle.purchaseDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">購入日:</span>
            <span className="font-medium">{new Date(vehicle.purchaseDate).toLocaleDateString('ja-JP')}</span>
          </div>
        )}

        {vehicle.purchasePriceIncludingTax && (
          <div className="flex justify-between">
            <span className="text-gray-600">購入価格:</span>
            <span className="font-medium">¥{vehicle.purchasePriceIncludingTax.toLocaleString()}</span>
          </div>
        )}

        {vehicle.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 line-clamp-2">{vehicle.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}