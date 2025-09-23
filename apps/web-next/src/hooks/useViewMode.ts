import { useState, useEffect } from 'react'

export type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'model-train-manager-view-mode'

export function useViewMode(defaultMode: ViewMode = 'list') {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode)

  // ローカルストレージから初期値を読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ViewMode
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode)
      }
    }
  }, [])

  // ビューモード変更時にローカルストレージに保存
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  return {
    viewMode,
    setViewMode: handleSetViewMode,
    isGridMode: viewMode === 'grid',
    isListMode: viewMode === 'list'
  }
}