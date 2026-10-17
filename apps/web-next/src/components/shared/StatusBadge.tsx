import React from 'react'
import { statusLabels, statusColors } from '@/constants/vehicle'

interface StatusBadgeProps {
    status: string
    className?: string
    size?: 'sm' | 'md'
}

export default function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
    const label = statusLabels[status] || status
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'

    const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'

    return (
        <span className={`rounded-full ${colorClass} ${sizeClass} ${className}`}>
            {label}
        </span>
    )
}
