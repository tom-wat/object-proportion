import type { SelectionMode, GridSettings, ChildGridSettings, ColorSettings } from '../types';

interface ToolbarProps {
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  gridSettings: GridSettings;
  onGridSettingsChange: (settings: GridSettings) => void;
  childGridSettings: ChildGridSettings;
  onChildGridSettingsChange: (settings: ChildGridSettings) => void;
  colorSettings: ColorSettings;
  onColorSettingsChange: (settings: ColorSettings) => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
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
  onExportJSON,
  onExportCSV,
  onClearAll,
  hasParentRegion,
  childCount
}: ToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Selection Mode */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Mode:</span>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => onSelectionModeChange('parent')}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                selectionMode === 'parent'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Parent
            </button>
            <button
              onClick={() => onSelectionModeChange('child')}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                selectionMode === 'child'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              disabled={!hasParentRegion}
            >
              Child
            </button>
          </div>
        </div>

        {/* Parent Grid Settings */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Parent Grid (16×16):</span>
          <button
            onClick={() => onGridSettingsChange({ ...gridSettings, visible: !gridSettings.visible })}
            className={`px-2 py-1 text-sm rounded border transition-colors ${
              gridSettings.visible
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {gridSettings.visible ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Child Grid Settings */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Child Grid (16×16):</span>
          <button
            onClick={() => onChildGridSettingsChange({ ...childGridSettings, visible: !childGridSettings.visible })}
            className={`px-2 py-1 text-sm rounded border transition-colors ${
              childGridSettings.visible
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            disabled={childCount === 0}
          >
            {childGridSettings.visible ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Color Settings */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Colors:</span>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-500">Parent:</label>
            <input
              type="color"
              value={colorSettings.parentColor}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                parentColor: e.target.value
              })}
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              title="Parent Region Color"
            />
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-500">Child:</label>
            <input
              type="color"
              value={colorSettings.childColor}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                childColor: e.target.value
              })}
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              title="Child Region Color"
            />
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-500">Parent Grid:</label>
            <input
              type="color"
              value={colorSettings.gridColor}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                gridColor: e.target.value
              })}
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              title="Parent Grid Color"
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={colorSettings.gridOpacity}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                gridOpacity: parseFloat(e.target.value)
              })}
              className="w-12 h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              title="Parent Grid Opacity"
            />
            <span className="text-xs text-gray-500">{Math.round(colorSettings.gridOpacity * 100)}%</span>
          </div>
          <div className="flex items-center space-x-1">
            <label className="text-xs text-gray-500">Child Grid:</label>
            <input
              type="color"
              value={colorSettings.childGridColor}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                childGridColor: e.target.value
              })}
              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
              title="Child Grid Color"
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={colorSettings.childGridOpacity}
              onChange={(e) => onColorSettingsChange({
                ...colorSettings,
                childGridOpacity: parseFloat(e.target.value)
              })}
              className="w-12 h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              title="Child Grid Opacity"
            />
            <span className="text-xs text-gray-500">{Math.round(colorSettings.childGridOpacity * 100)}%</span>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-sm font-medium text-gray-700">Export:</span>
          <button
            onClick={onExportJSON}
            disabled={!hasParentRegion && childCount === 0}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            JSON
          </button>
          <button
            onClick={onExportCSV}
            disabled={childCount === 0}
            className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            CSV
          </button>
        </div>

        {/* Clear Button */}
        <button
          onClick={onClearAll}
          disabled={!hasParentRegion && childCount === 0}
          className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>

        {/* Status */}
        <div className="text-sm text-gray-500">
          Parent: {hasParentRegion ? '1' : '0'} | Child: {childCount}
        </div>
      </div>
    </div>
  );
}