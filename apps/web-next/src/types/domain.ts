export interface Tag {
    id: number
    name: string
    category: string
}

export interface ProductTag {
    tag: Tag
}

export interface Product {
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

export interface OwnedVehicle {
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
        productTags?: ProductTag[]
    } | null
    independentVehicle?: {
        name: string
        brand: string | null
        vehicleType: string | null
    } | null
}
