import { X, Copy, Undo, Redo, Download, Upload } from 'lucide-react';
import type { SettingsBundle, ModeBundle, FitActions } from '../types';
import { ToggleChip } from './controls/ToggleChip';
import { UnitBasisToggle } from './controls/UnitBasisToggle';
import { ModuleControls } from './controls/ModuleControls';
import { FitButtons } from './controls/FitButtons';
import { ColorRow } from './controls/ColorRow';

export interface DrawerActions {
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
}

interface MobileMenuDrawerProps {
  onClose: () => void;
  actions: DrawerActions;
  mode: ModeBundle;
  settings: SettingsBundle;
  fit: FitActions;
}

export function MobileMenuDrawer({ onClose, actions, mode, settings, fit }: MobileMenuDrawerProps) {
  const { selectionMode, childDrawMode } = mode;
  const { gridSettings, onGridSettingsChange, childGridSettings, onChildGridSettingsChange, colorSettings, onColorSettingsChange, unitBasis, onUnitBasisChange } = settings;
  const { childCount } = fit;

  const isParentMode = selectionMode === 'parent';
  const isChildRect = selectionMode === 'child' && childDrawMode === 'rectangle';
  const isChildCircle = selectionMode === 'child' && childDrawMode === 'circle';
  const isChildLine = selectionMode === 'child' && childDrawMode === 'line';
  const isChildDot = selectionMode === 'child' && childDrawMode === 'dot';

  const actionBtnClass = "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-all";
  const sectionLabel = "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";

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
              <button onClick={() => { actions.onCopy(); onClose(); }} disabled={!actions.canCopy} className={actionBtnClass}>
                <Copy size={16} /> Copy selected region
              </button>
              <button onClick={() => { actions.onUndo(); onClose(); }} disabled={!actions.canUndo} className={actionBtnClass}>
                <Undo size={16} /> Undo
              </button>
              <button onClick={() => { actions.onRedo(); onClose(); }} disabled={!actions.canRedo} className={actionBtnClass}>
                <Redo size={16} /> Redo
              </button>
            </div>
          </div>

          {/* Export / Import */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Export / Import</p>
            <div className="space-y-0.5">
              <button onClick={() => { actions.onExportPNG(); onClose(); }} disabled={!actions.canExport} className={actionBtnClass}>
                <Download size={16} /> PNG (with image)
              </button>
              <button onClick={() => { actions.onExportPNGOverlay(); onClose(); }} disabled={!actions.canExport} className={actionBtnClass}>
                <Download size={16} /> PNG (overlay only)
              </button>
              <button onClick={() => { actions.onExportLayout(); onClose(); }} disabled={!actions.canExport} className={actionBtnClass}>
                <Download size={16} /> Export layout
              </button>
              <button onClick={() => { actions.onImport(); onClose(); }} className={actionBtnClass}>
                <Upload size={16} /> Import layout
              </button>
            </div>
          </div>

          {/* Fit */}
          <div className="p-4 border-b border-gray-100">
            <p className={sectionLabel}>Fit</p>
            <div className="space-y-1.5">
              <FitButtons
                isParentMode={isParentMode}
                isChildRect={isChildRect}
                hasParentRegion={fit.hasParentRegion}
                selectedChildId={fit.selectedChildId}
                onCreateFullCanvasParent={fit.onCreateFullCanvasParent}
                onFitChildHeightToImage={fit.onFitChildHeightToImage}
                onFitChildWidthToImage={fit.onFitChildWidthToImage}
                fullWidth
                onAfterAction={onClose}
              />
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
                <ToggleChip
                  on={gridSettings.visible}
                  onToggle={() => onGridSettingsChange({ ...gridSettings, visible: !gridSettings.visible })}
                />
              )}
              {isChildRect && (
                <ToggleChip
                  on={childGridSettings.rectVisible}
                  onToggle={() => onChildGridSettingsChange({ ...childGridSettings, rectVisible: !childGridSettings.rectVisible })}
                  disabled={childCount === 0}
                />
              )}
              {isChildCircle && (
                <ToggleChip
                  on={childGridSettings.circleVisible}
                  onToggle={() => onChildGridSettingsChange({ ...childGridSettings, circleVisible: !childGridSettings.circleVisible })}
                  disabled={childCount === 0}
                />
              )}
              {(isChildLine || isChildDot) && (
                <span className="text-xs text-gray-400">N/A for this mode</span>
              )}
            </div>
            {(isChildLine || isChildCircle) && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-600">Modules</span>
                <ModuleControls
                  shape={isChildLine ? 'line' : 'circle'}
                  childGridSettings={childGridSettings}
                  onChildGridSettingsChange={onChildGridSettingsChange}
                  childCount={childCount}
                  size="md"
                />
              </div>
            )}
          </div>

          {/* Unit */}
          {isParentMode && (
            <div className="p-4 border-b border-gray-100">
              <p className={sectionLabel}>Unit Basis</p>
              <UnitBasisToggle unitBasis={unitBasis} onUnitBasisChange={onUnitBasisChange} size="md" />
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
