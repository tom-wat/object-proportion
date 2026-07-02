import type { SelectionMode } from '../../types';

interface ModeTabsProps {
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  hasParentRegion: boolean;
}

export function ModeTabs({ selectionMode, onSelectionModeChange, hasParentRegion }: ModeTabsProps) {
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
      active
        ? 'bg-blue-500 text-white shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex bg-gray-50 rounded-lg p-0.5">
      <button
        onClick={() => onSelectionModeChange('parent')}
        className={tabClass(selectionMode === 'parent')}
      >
        Parent
      </button>
      <button
        onClick={() => onSelectionModeChange('child')}
        disabled={!hasParentRegion}
        className={tabClass(selectionMode === 'child')}
      >
        Child
      </button>
    </div>
  );
}
