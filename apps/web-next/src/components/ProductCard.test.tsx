import { render, screen } from '@testing-library/react'
import ProductCard from './ProductCard'
import { Product } from '@/types/domain'

const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    brand: 'KATO',
    productCode: '10-001',
    type: 'EC',
    priceIncludingTax: 15000,
    imageUrls: ['http://example.com/image.jpg'],
    productTags: [
        { tag: { id: 1, name: 'Main Line', category: 'LINE' } }
    ],
    _count: { ownedVehicles: 2 }
}

describe('ProductCard', () => {
    it('renders product information correctly', () => {
        render(<ProductCard product={mockProduct} />)

        expect(screen.getByText('Test Product')).toBeInTheDocument()
        expect(screen.getByText(/KATO/)).toBeInTheDocument()
        expect(screen.getByText(/10-001/)).toBeInTheDocument()
        expect(screen.getByText('¥15,000')).toBeInTheDocument() // Depends on locale, but checking basic format
        expect(screen.getByText('Main Line')).toBeInTheDocument()
        expect(screen.getByText('保有: 2両')).toBeInTheDocument()
    })

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn()
        render(<ProductCard product={mockProduct} onClick={handleClick} />)

        // Find the clickable element (outer div) - slightly tricky without testId, 
        // but the text is inside it. We can click the text.
        screen.getByText('Test Product').click()

        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('renders "画像なし" when no images', () => {
        const productNoImage = { ...mockProduct, imageUrls: [] }
        render(<ProductCard product={productNoImage} />)

        expect(screen.getByText('画像なし')).toBeInTheDocument()
    })
})
