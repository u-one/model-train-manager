'use client'

import React from 'react'
import ProductCard from '@/components/ProductCard'
import OwnedVehicleCard from '@/components/OwnedVehicleCard'
import ProductListItem from '@/components/ProductListItem'
import OwnedVehicleListItem from '@/components/OwnedVehicleListItem'
import { Product, OwnedVehicle } from '@/types/domain'

// Mock Data
const mockProduct: Product = {
    id: 1,
    name: 'Test Product (Refactored)',
    brand: 'KATO',
    productCode: '10-001',
    type: 'EC',
    priceIncludingTax: 15000,
    imageUrls: [], // Test fallback
    productTags: [
        { tag: { id: 1, name: 'Main Line', category: 'LINE' } }
    ],
    _count: { ownedVehicles: 2 }
}

const mockProductWithImage: Product = {
    ...mockProduct,
    id: 2,
    name: 'Test Product With Image',
    imageUrls: ['https://placehold.co/400x300?text=Train'],
}

const mockOwnedVehicle: OwnedVehicle = {
    id: 1,
    managementId: 'A-001',
    currentStatus: 'NORMAL',
    storageCondition: 'WITH_CASE',
    purchaseDate: '2023-01-01',
    purchasePriceIncludingTax: 12000,
    notes: 'Test owned vehicle note.',
    imageUrls: [],
    product: mockProduct
}

const mockOwnedVehicleBroken: OwnedVehicle = {
    ...mockOwnedVehicle,
    id: 2,
    currentStatus: 'BROKEN',
    managementId: 'B-999',
    product: undefined,
    independentVehicle: {
        name: 'Custom Train',
        brand: 'TOMIX',
        vehicleType: 'DC',
    }
}

export default function TestComponentsPage() {
    return (
        <div className="p-8 space-y-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Component Verification</h1>

            <section>
                <h2 className="text-xl font-semibold mb-4">ProductCard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ProductCard product={mockProduct} />
                    <ProductCard product={mockProductWithImage} />
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">OwnedVehicleCard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OwnedVehicleCard vehicle={mockOwnedVehicle} />
                    <OwnedVehicleCard vehicle={mockOwnedVehicleBroken} />
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">ProductListItem</h2>
                <div className="space-y-2">
                    <ProductListItem product={mockProduct} />
                    <ProductListItem product={mockProductWithImage} />
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">OwnedVehicleListItem</h2>
                <div className="space-y-2">
                    <OwnedVehicleListItem vehicle={mockOwnedVehicle} />
                    <OwnedVehicleListItem vehicle={mockOwnedVehicleBroken} />
                </div>
            </section>
        </div>
    )
}
