import { ViewMode } from '@/hooks/useViewMode'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export default function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      <button
        onClick={() => onViewModeChange('grid')}
        className={`px-3 py-2 text-sm font-medium ${
          viewMode === 'grid'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        グリッド
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`px-3 py-2 text-sm font-medium ${
          viewMode === 'list'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        一覧
      </button>
    </div>
  )
}