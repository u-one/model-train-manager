export const statusLabels: Record<string, string> = {
    NORMAL: '正常',
    NEEDS_REPAIR: '要修理',
    BROKEN: '故障中'
}

export const statusColors: Record<string, string> = {
    NORMAL: 'bg-green-100 text-green-800',
    NEEDS_REPAIR: 'bg-yellow-100 text-yellow-800',
    BROKEN: 'bg-red-100 text-red-800'
}

export const conditionLabels: Record<string, string> = {
    WITH_CASE: 'ケースあり',
    WITHOUT_CASE: 'ケースなし'
}
