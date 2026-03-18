import { X, Copy, Undo, Redo, Download, Upload } from 'lucide-react';
import type { SelectionMode, ChildDrawMode, GridSettings, ChildGridSettings, ColorSettings } from '../types';

interface MobileMenuDrawerProps {
  onClose: () => void;
  // Actions
  canCopy: boolean;
  onCopy: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  canExport: boolean;
  onExportPNG: () => void;
  onExportPNGOverlay: () => void;
  onExportLayout: () => void;
  onImport: () => void;
  // Mode context
  selectionMode: SelectionMode;
  childDrawMode: ChildDrawMode;
  // Grid
  gridSettings: GridSettings;
  onGridSettingsChange: (s: GridSettings) => void;
  childGridSettings: ChildGridSettings;
  onChildGridSettingsChange: (s: ChildGridSettings) => void;
  // Colors
  colorSettings: ColorSettings;
  onColorSettingsChange: (s: ColorSettings) => void;
  // Unit
  unitBasis: 'height' | 'width';
  onUnitBasisChange: (b: 'height' | 'width') => void;
  // Fit
  hasParentRegion: boolean;
  childCount: number;
  selectedChildId: number | null;
  onCreateFullCanvasParent: () => void;
  onFitChildHeightToImage: (id: number) => void;
  onFitChildWidthToImage: (id: number) => void;
}

export function MobileMenuDrawer({
  onClose,
  canCopy, onCopy,
  canUndo, onUndo,
  canRedo, onRedo,
  canExport, onExportPNG, onExportPNGOverlay, onExportLayout, onImport,
  selectionMode, childDrawMode,
  gridSettings, onGridSettingsChange,
  childGridSettings, onChildGridSettingsChange,
  colorSettings, onColorSettingsChange,
  unitBasis, onUnitBasisChange,
  childCount, selectedChildId,
  onCreateFullCanvasParent, onFitChildHeightToImage, onFitChildWidthToImage,
}: MobileMenuDrawerProps) {
  const isParentMode = selectionMode === 'parent';
  const isChildRect = selectionMode === 'child' && childDrawMode === 'rectangle';
  const isChildCircle = selectionMode === 'child' && childDrawMode === 'circle';
  const isChildLine = selectionMode === 'child' && childDrawMode === 'line';
  const isChildDot = selectionMode === 'child' && childDrawMode === 'dot';

  const actionBtnClass = "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-all";
  const sectionLabel = "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";
  const toggleBtnActive = "px-2.5 py-1 text-xs font-medium rounded bg-blue-500 text-white shadow-sm";
  const toggleBtnInactive = "px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600";

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="font-semibold text-gray-800">Menu</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Actions */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Actions</p>
            <div className="space-y-0.5">
              <button onClick={() => { onCopy(); onClose(); }} disabled={!canCopy} className={actionBtnClass}>
                <Copy size={16} /> Copy selected region
              </button>
              <button onClick={() => { onUndo(); onClose(); }} disabled={!canUndo} className={actionBtnClass}>
                <Undo size={16} /> Undo
              </button>
              <button onClick={() => { onRedo(); onClose(); }} disabled={!canRedo} className={actionBtnClass}>
                <Redo size={16} /> Redo
              </button>
            </div>
          </div>

          {/* Export / Import */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Export / Import</p>
            <div className="space-y-0.5">
              <button onClick={() => { onExportPNG(); onClose(); }} disabled={!canExport} className={actionBtnClass}>
                <Download size={16} /> PNG (with image)
              </button>
              <button onClick={() => { onExportPNGOverlay(); onClose(); }} disabled={!canExport} className={actionBtnClass}>
                <Download size={16} /> PNG (overlay only)
              </button>
              <button onClick={() => { onExportLayout(); onClose(); }} disabled={!canExport} className={actionBtnClass}>
                <Download size={16} /> Export layout
              </button>
              <button onClick={() => { onImport(); onClose(); }} className={actionBtnClass}>
                <Upload size={16} /> Import layout
              </button>
            </div>
          </div>

          {/* Fit */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Fit</p>
            <div className="space-y-1.5">
              {isParentMode && (
                <button
                  onClick={() => { onCreateFullCanvasParent(); onClose(); }}
                  className="w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all"
                >
                  Fit to Image
                </button>
              )}
              {isChildRect && (
                <>
                  <button
                    onClick={() => { if (selectedChildId !== null) { onFitChildHeightToImage(selectedChildId); onClose(); } }}
                    disabled={selectedChildId === null}
                    className="w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    Fit Height
                  </button>
                  <button
                    onClick={() => { if (selectedChildId !== null) { onFitChildWidthToImage(selectedChildId); onClose(); } }}
                    disabled={selectedChildId === null}
                    className="w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    Fit Width
                  </button>
                </>
              )}
              {!isParentMode && !isChildRect && (
                <p className="text-xs text-gray-400">Switch to Parent or Child (Rect) mode to use fit.</p>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Grid</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Grid</span>
              {isParentMode && (
                <button
                  onClick={() => onGridSettingsChange({ ...gridSettings, visible: !gridSettings.visible })}
                  className={gridSettings.visible ? toggleBtnActive : toggleBtnInactive}
                >
                  {gridSettings.visible ? 'ON' : 'OFF'}
                </button>
              )}
              {isChildRect && (
                <button
                  onClick={() => onChildGridSettingsChange({ ...childGridSettings, rectVisible: !childGridSettings.rectVisible })}
                  disabled={childCount === 0}
                  className={childGridSettings.rectVisible ? toggleBtnActive : toggleBtnInactive}
                >
                  {childGridSettings.rectVisible ? 'ON' : 'OFF'}
                </button>
              )}
              {isChildCircle && (
                <button
                  onClick={() => onChildGridSettingsChange({ ...childGridSettings, circleVisible: !childGridSettings.circleVisible })}
                  disabled={childCount === 0}
                  className={childGridSettings.circleVisible ? toggleBtnActive : toggleBtnInactive}
                >
                  {childGridSettings.circleVisible ? 'ON' : 'OFF'}
                </button>
              )}
              {(isChildLine || isChildDot) && (
                <span className="text-xs text-gray-400">N/A for this mode</span>
              )}
            </div>
            {(isChildLine || isChildCircle) && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-600">Modules</span>
                <button
                  onClick={() => isChildLine
                    ? onChildGridSettingsChange({ ...childGridSettings, lineModuleVisible: !childGridSettings.lineModuleVisible })
                    : onChildGridSettingsChange({ ...childGridSettings, circleModuleVisible: !childGridSettings.circleModuleVisible })
                  }
                  disabled={childCount === 0}
                  className={(isChildLine ? childGridSettings.lineModuleVisible : childGridSettings.circleModuleVisible) ? toggleBtnActive : toggleBtnInactive}
                >
                  {(isChildLine ? childGridSettings.lineModuleVisible : childGridSettings.circleModuleVisible) ? 'ON' : 'OFF'}
                </button>
              </div>
            )}
          </div>

          {/* Unit */}
          {isParentMode && (
            <div className="p-4 border-b border-gray-100">
              <p className={sectionLabel}>Unit Basis</p>
              <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => onUnitBasisChange('height')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${unitBasis === 'height' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'}`}
                  title="Use height as grid unit basis"
                >
                  H
                </button>
                <button
                  onClick={() => onUnitBasisChange('width')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${unitBasis === 'width' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500'}`}
                  title="Use width as grid unit basis"
                >
                  W
                </button>
              </div>
            </div>
          )}

          {/* Colors */}
          <div className="p-4">
            <p className={sectionLabel}>Colors</p>
            <div className="space-y-3">
              {/* Region color */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Region</p>
                {isParentMode && (
                  <ColorRow
                    label="Parent"
                    color={colorSettings.parentColor}
                    opacity={colorSettings.parentColorOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, parentColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, parentColorOpacity: v })}
                  />
                )}
                {isChildRect && (
                  <ColorRow
                    label="Rect"
                    color={colorSettings.childRectColor}
                    opacity={colorSettings.childRectColorOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childRectColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childRectColorOpacity: v })}
                  />
                )}
                {isChildCircle && (
                  <ColorRow
                    label="Circle"
                    color={colorSettings.childCircleColor}
                    opacity={colorSettings.childCircleColorOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleColorOpacity: v })}
                  />
                )}
                {isChildLine && (
                  <ColorRow
                    label="Line"
                    color={colorSettings.childLineColor}
                    opacity={colorSettings.childLineColorOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childLineColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childLineColorOpacity: v })}
                  />
                )}
                {isChildDot && (
                  <ColorRow
                    label="Dot"
                    color={colorSettings.dotColor}
                    opacity={colorSettings.dotColorOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, dotColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, dotColorOpacity: v })}
                  />
                )}
              </div>

              {/* Grid color */}
              {(isParentMode || isChildRect || isChildCircle) && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Grid</p>
                  {isParentMode && (
                    <ColorRow
                      label="Parent grid"
                      color={colorSettings.gridColor}
                      opacity={colorSettings.gridOpacity}
                      onColorChange={(v) => onColorSettingsChange({ ...colorSettings, gridColor: v })}
                      onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, gridOpacity: v })}
                    />
                  )}
                  {isChildRect && (
                    <ColorRow
                      label="Rect grid"
                      color={colorSettings.childRectGridColor}
                      opacity={colorSettings.childRectGridOpacity}
                      onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childRectGridColor: v })}
                      onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childRectGridOpacity: v })}
                    />
                  )}
                  {isChildCircle && (
                    <ColorRow
                      label="Circle grid"
                      color={colorSettings.childCircleGridColor}
                      opacity={colorSettings.childCircleGridOpacity}
                      onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleGridColor: v })}
                      onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleGridOpacity: v })}
                    />
                  )}
                </div>
              )}

              {/* Module color */}
              {isChildLine && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Modules</p>
                  <ColorRow
                    label="Line module"
                    color={colorSettings.lineModuleColor}
                    opacity={colorSettings.lineModuleOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, lineModuleColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, lineModuleOpacity: v })}
                  />
                </div>
              )}
              {isChildCircle && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Modules</p>
                  <ColorRow
                    label="Circle module"
                    color={colorSettings.circleModuleColor}
                    opacity={colorSettings.circleModuleOpacity}
                    onColorChange={(v) => onColorSettingsChange({ ...colorSettings, circleModuleColor: v })}
                    onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, circleModuleOpacity: v })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorRowProps {
  label: string;
  color: string;
  opacity: number;
  onColorChange: (v: string) => void;
  onOpacityChange: (v: number) => void;
}

function ColorRow({ label, color, opacity, onColorChange, onOpacityChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <input
        type="color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        className="w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0"
      />
      <input
        type="range"
        min="0" max="1" step="0.05"
        value={opacity}
        onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
        className="flex-1 min-w-0 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
      />
      <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}
