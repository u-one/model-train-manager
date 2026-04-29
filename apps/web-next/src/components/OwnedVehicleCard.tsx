import { OwnedVehicle } from '@/types/domain'
import { conditionLabels } from '@/constants/vehicle'
import VehicleImage from '@/components/shared/VehicleImage'
import StatusBadge from '@/components/shared/StatusBadge'

interface OwnedVehicleCardProps {
  vehicle: OwnedVehicle
  onClick?: () => void
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
            <StatusBadge status={vehicle.currentStatus} />
          </div>
          <p className="text-sm text-gray-600 mb-1">{brand}</p>
          {productCode && (
            <p className="text-xs text-gray-500">{productCode}</p>
          )}
        </div>

        <div className="w-16 h-12 ml-3">
          <VehicleImage
            imageUrl={vehicle.imageUrls?.[0]}
            alt={vehicleName}
            className="w-full h-full object-cover rounded"
          />
        </div>
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