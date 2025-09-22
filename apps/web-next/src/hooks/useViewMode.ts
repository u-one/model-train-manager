import { useState } from 'react'

export type ViewMode = 'grid' | 'list'

export function useViewMode(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode)

  return {
    viewMode,
    setViewMode,
    isGridMode: viewMode === 'grid',
    isListMode: viewMode === 'list'
  }
}