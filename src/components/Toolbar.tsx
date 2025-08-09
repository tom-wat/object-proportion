import type { SelectionMode, GridSettings, ChildGridSettings, ColorSettings } from '../types';
import { Download } from 'lucide-react';

interface ToolbarProps {
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  childGridSettings: ChildGridSettings;
  onChildGridSettingsChange: (settings: ChildGridSettings) => void;
  colorSettings: ColorSettings;
  onColorSettingsChange: (settings: ColorSettings) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onClearAll: () => void;
  hasParentRegion: boolean;
  childCount: number;
}

export function Toolbar({
  selectionMode,
  onSelectionModeChange,
  gridSettings,
  onGridSettingsChange,
  childGridSettings,
  onChildGridSettingsChange,
  colorSettings,
  onColorSettingsChange,
  onExportPNG,
  onExportJSON,
  onClearAll,
  hasParentRegion,
  childCount
}: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Left Section: Mode, Grid Controls & Colors */}
          <div className="flex items-center gap-6">
            {/* Selection Mode */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Mode</span>
              <div className="flex bg-gray-50 rounded-lg p-0.5">
                <button
                  onClick={() => onSelectionModeChange('parent')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectionMode === 'parent'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Parent
                </button>
                <button
                  onClick={() => onSelectionModeChange('child')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectionMode === 'child'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  disabled={!hasParentRegion}
                >
                  Child
                </button>
              </div>
            </div>

            {/* Grid Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Parent Grid</span>
                <button
                  onClick={() => onGridSettingsChange({ ...gridSettings, visible: !gridSettings.visible })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    gridSettings.visible
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {gridSettings.visible ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Child Grid</span>
                <button
                  onClick={() => onChildGridSettingsChange({ ...childGridSettings, visible: !childGridSettings.visible })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    childGridSettings.visible
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  disabled={childCount === 0}
                >
                  {childGridSettings.visible ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Color Settings */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Colors</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Regions</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={colorSettings.parentColor}
                      onChange={(e) => onColorSettingsChange({
                        ...colorSettings,
                        parentColor: e.target.value
                      })}
                      className="w-6 h-6 rounded border-0 cursor-pointer"
                      title="Parent Region Color"
                    />
                    <input
                      type="color"
                      value={colorSettings.childColor}
                      onChange={(e) => onColorSettingsChange({
                        ...colorSettings,
                        childColor: e.target.value
                      })}
                      className="w-6 h-6 rounded border-0 cursor-pointer"
                      title="Child Region Color"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Grids</span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={colorSettings.gridColor}
                        onChange={(e) => onColorSettingsChange({
                          ...colorSettings,
                          gridColor: e.target.value
                        })}
                        className="w-6 h-6 rounded border-0 cursor-pointer"
                        title="Parent Grid Color"
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={colorSettings.gridOpacity}
                        onChange={(e) => onColorSettingsChange({
                          ...colorSettings,
                          gridOpacity: parseFloat(e.target.value)
                        })}
                        className="w-16 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
                        title="Parent Grid Opacity"
                      />
                      <span className="text-xs text-gray-400 w-8">{Math.round(colorSettings.gridOpacity * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={colorSettings.childGridColor}
                        onChange={(e) => onColorSettingsChange({
                          ...colorSettings,
                          childGridColor: e.target.value
                        })}
                        className="w-6 h-6 rounded border-0 cursor-pointer"
                        title="Child Grid Color"
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={colorSettings.childGridOpacity}
                        onChange={(e) => onColorSettingsChange({
                          ...colorSettings,
                          childGridOpacity: parseFloat(e.target.value)
                        })}
                        className="w-16 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
                        title="Child Grid Opacity"
                      />
                      <span className="text-xs text-gray-400 w-8">{Math.round(colorSettings.childGridOpacity * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Right Section: Actions & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onExportPNG}
                disabled={!hasParentRegion && childCount === 0}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Download size={16} />
                PNG
              </button>
              <button
                onClick={onExportJSON}
                disabled={!hasParentRegion && childCount === 0}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Download size={16} />
                JSON
              </button>
              <button
                onClick={onClearAll}
                disabled={!hasParentRegion && childCount === 0}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-red-50 hover:text-red-700 hover:border-red-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
              >
                Clear
              </button>
            </div>
            
            <div className="text-sm text-gray-400 border-l border-gray-200 pl-4">
              {hasParentRegion ? '1' : '0'} parent • {childCount} children
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}