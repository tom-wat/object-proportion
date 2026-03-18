import { Menu, Info } from 'lucide-react';
import type { SelectionMode, ChildDrawMode } from '../types';

interface MobileBottomToolbarProps {
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  childDrawMode: ChildDrawMode;
  onChildDrawModeChange: (mode: ChildDrawMode) => void;
  hasParentRegion: boolean;
  hasSelection: boolean;
  onMenuOpen: () => void;
  onInfoOpen: () => void;
}

export function MobileBottomToolbar({
  selectionMode,
  onSelectionModeChange,
  childDrawMode,
  onChildDrawModeChange,
  hasParentRegion,
  hasSelection,
  onMenuOpen,
  onInfoOpen,
}: MobileBottomToolbarProps) {
  const shapes: { mode: ChildDrawMode; label: string; title: string }[] = [
    { mode: 'rectangle', label: '□', title: 'Rectangle' },
    { mode: 'circle',    label: '○', title: 'Circle' },
    { mode: 'line',      label: '/',  title: 'Line' },
    { mode: 'dot',       label: '·',  title: 'Dot' },
  ];

  return (
    <div className="bg-white border-t border-gray-100 h-14 flex items-center px-3 gap-2 flex-shrink-0">
      {/* Mode tabs */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
        <button
          onClick={() => onSelectionModeChange('parent')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            selectionMode === 'parent'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Parent
        </button>
        <button
          onClick={() => onSelectionModeChange('child')}
          disabled={!hasParentRegion}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            selectionMode === 'child'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 disabled:opacity-40'
          }`}
        >
          Child
        </button>
      </div>

      {/* Shape buttons (child mode only) */}
      {selectionMode === 'child' && (
        <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
          {shapes.map(({ mode, label, title }) => (
            <button
              key={mode}
              onClick={() => onChildDrawModeChange(mode)}
              title={title}
              className={`px-2.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                childDrawMode === mode
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Info button */}
      <button
        onClick={onInfoOpen}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="Region info"
      >
        <Info size={20} />
      </button>

      {/* Menu button */}
      <button
        onClick={onMenuOpen}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="Menu"
      >
        <Menu size={20} />
      </button>
    </div>
  );
}
