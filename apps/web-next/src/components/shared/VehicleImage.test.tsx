import { render, screen } from '@testing-library/react'
import VehicleImage from './VehicleImage'

describe('VehicleImage', () => {
    it('renders image when imageUrl is provided', () => {
        const imageUrl = 'http://example.com/image.jpg'
        const alt = 'Test Vehicle'
        render(<VehicleImage imageUrl={imageUrl} alt={alt} />)

        const img = screen.getByRole('img')
        expect(img).toHaveAttribute('src', imageUrl)
        expect(img).toHaveAttribute('alt', alt)
    })

    it('renders placeholder when imageUrl is missing', () => {
        render(<VehicleImage alt="No Image Vehicle" />)

        expect(screen.queryByRole('img')).not.toBeInTheDocument()
        expect(screen.getByText('画像なし')).toBeInTheDocument()
    })

    it('applies custom className', () => {
        const className = 'custom-class'
        render(<VehicleImage alt="Custom Class" className={className} />)

        const container = screen.getByText('画像なし').parentElement
        expect(container).toHaveClass(className)
    })
})
