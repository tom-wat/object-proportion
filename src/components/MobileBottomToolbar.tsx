import { Menu, Hand } from 'lucide-react';
import type { ModeBundle } from '../types';
import { ModeTabs } from './controls/ModeTabs';
import { ShapeSelector } from './controls/ShapeSelector';

interface MobileBottomToolbarProps {
  mode: ModeBundle;
  hasParentRegion: boolean;
  isPanMode: boolean;
  onPanModeToggle: () => void;
  onMenuOpen: () => void;
}

export function MobileBottomToolbar({
  mode,
  hasParentRegion,
  isPanMode,
  onPanModeToggle,
  onMenuOpen,
}: MobileBottomToolbarProps) {
  return (
    <div className="bg-white border-t border-gray-100 h-14 flex items-center px-3 gap-2 flex-shrink-0">
      {/* Mode tabs */}
      <div className="flex-shrink-0">
        <ModeTabs
          selectionMode={mode.selectionMode}
          onSelectionModeChange={mode.onSelectionModeChange}
          hasParentRegion={hasParentRegion}
        />
      </div>

      {/* Shape buttons (child mode only) */}
      {mode.selectionMode === 'child' && (
        <div className="flex-shrink-0">
          <ShapeSelector
            childDrawMode={mode.childDrawMode}
            onChildDrawModeChange={mode.onChildDrawModeChange}
            labelStyle="icon"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Pan toggle button */}
      <button
        onClick={onPanModeToggle}
        className={`p-2 transition-colors ${
          isPanMode ? 'text-blue-500' : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Pan mode"
      >
        <Hand size={20} />
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
