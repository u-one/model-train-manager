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
    const sizeClasses = {
        sm: 'w-16 h-11',
        md: 'w-full h-full',
        lg: 'w-full h-full',
    }
    const imageClasses = className || sizeClasses[size]

    if (imageUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt={alt}
                className={`${baseClasses} ${imageClasses}`}
            />
        )
    }

    return (
        <div className={`bg-gray-200 rounded flex items-center justify-center ${imageClasses}`}>
            <span className="text-gray-400 text-xs">画像なし</span>
        </div>
    )
}
