import React from 'react'

interface VehicleImageProps {
    imageUrl?: string
    alt: string
    className?: string
    size?: 'sm' | 'md' | 'lg' // sm: list icon, md: card, lg: detail
}

export default function VehicleImage({ imageUrl, alt, className, size = 'md' }: VehicleImageProps) {
    // Base classes
    const baseClasses = "object-contain bg-gray-100 rounded"

    // Size specific classes if not overridden by className
    // Note: Parent often controls width/height via className wrapper or directly.
    // Here we just ensure the image fits well.

    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt={alt}
                className={`${baseClasses} ${className || 'w-full h-full'}`}
            />
        )
    }

    return (
        <div className={`bg-gray-200 rounded flex items-center justify-center ${className || 'w-full h-full'}`}>
            <span className="text-gray-400 text-xs">画像なし</span>
        </div>
    )
}
