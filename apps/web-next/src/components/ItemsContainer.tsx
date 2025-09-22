import { ReactNode } from 'react'
import { ViewMode } from '@/hooks/useViewMode'

interface ItemsContainerProps<T> {
  items: T[]
  viewMode: ViewMode
  renderGridItem: (item: T) => ReactNode
  renderListItem: (item: T) => ReactNode
  gridClassName?: string
  listClassName?: string
  emptyState?: ReactNode
}

export default function ItemsContainer<T>({
  items,
  viewMode,
  renderGridItem,
  renderListItem,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
  listClassName = "space-y-4",
  emptyState
}: ItemsContainerProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  if (viewMode === 'grid') {
    return (
      <div className={gridClassName}>
        {items.map((item, index) => (
          <div key={index}>
            {renderGridItem(item)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={listClassName}>
      {items.map((item, index) => (
        <div key={index}>
          {renderListItem(item)}
        </div>
      ))}
    </div>
  )
}