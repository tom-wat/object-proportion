import type { SettingsBundle, ModeBundle, FitActions } from '../types';
import { ModeTabs } from './controls/ModeTabs';
import { ShapeSelector } from './controls/ShapeSelector';
import { ToggleChip } from './controls/ToggleChip';
import { UnitBasisToggle } from './controls/UnitBasisToggle';
import { ModuleControls } from './controls/ModuleControls';
import { FitButtons } from './controls/FitButtons';
import { ColorRow } from './controls/ColorRow';

interface ToolbarProps {
  mode: ModeBundle;
  settings: SettingsBundle;
  fit: FitActions;
}

export function Toolbar({ mode, settings, fit }: ToolbarProps) {
  const { selectionMode, onSelectionModeChange, childDrawMode, onChildDrawModeChange } = mode;
  const { gridSettings, onGridSettingsChange, childGridSettings, onChildGridSettingsChange, colorSettings, onColorSettingsChange, unitBasis, onUnitBasisChange } = settings;
  const { hasParentRegion, childCount } = fit;

  const isParentMode = selectionMode === 'parent';
  const isChildRect = selectionMode === 'child' && childDrawMode === 'rectangle';
  const isChildCircle = selectionMode === 'child' && childDrawMode === 'circle';
  const isChildLine = selectionMode === 'child' && childDrawMode === 'line';
  const isChildDot = selectionMode === 'child' && childDrawMode === 'dot';

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="px-6 py-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-6 min-w-max">
          {/* Left Section: Mode, Grid Controls & Colors */}
          <div className="flex items-center gap-6">
            {/* Selection Mode */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Mode</span>
              <ModeTabs
                selectionMode={selectionMode}
                onSelectionModeChange={onSelectionModeChange}
                hasParentRegion={hasParentRegion}
              />
            </div>

            {/* Child Shape Selector */}
            {selectionMode === 'child' && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Shape</span>
                <ShapeSelector
                  childDrawMode={childDrawMode}
                  onChildDrawModeChange={onChildDrawModeChange}
                  labelStyle="full"
                />
              </div>
            )}

            {/* Module Controls: Line / Circle mode */}
            {(isChildLine || isChildCircle) && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Modules</span>
                <ModuleControls
                  shape={isChildLine ? 'line' : 'circle'}
                  childGridSettings={childGridSettings}
                  onChildGridSettingsChange={onChildGridSettingsChange}
                  childCount={childCount}
                  size="sm"
                />
              </div>
            )}

            {/* Grid Controls: Parent Grid in parent mode, Child Grid in child rect/circle mode */}
            {(isParentMode || isChildRect || isChildCircle) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Grid</span>
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
              </div>
            )}

            {/* Unit Basis Toggle: parent mode only */}
            {isParentMode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Unit</span>
                <UnitBasisToggle unitBasis={unitBasis} onUnitBasisChange={onUnitBasisChange} size="sm" />
              </div>
            )}

            {/* Color Settings */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Colors</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Regions</span>
                  <div className="flex items-center gap-1">
                    {isParentMode && (
                      <ColorRow
                        variant="inline"
                        label="Parent Region"
                        color={colorSettings.parentColor}
                        opacity={colorSettings.parentColorOpacity}
                        onColorChange={(v) => onColorSettingsChange({ ...colorSettings, parentColor: v })}
                        onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, parentColorOpacity: v })}
                      />
                    )}
                    {isChildRect && (
                      <ColorRow
                        variant="inline"
                        label="Rectangle"
                        color={colorSettings.childRectColor}
                        opacity={colorSettings.childRectColorOpacity}
                        onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childRectColor: v })}
                        onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childRectColorOpacity: v })}
                      />
                    )}
                    {isChildCircle && (
                      <ColorRow
                        variant="inline"
                        label="Circle"
                        color={colorSettings.childCircleColor}
                        opacity={colorSettings.childCircleColorOpacity}
                        onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleColor: v })}
                        onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleColorOpacity: v })}
                      />
                    )}
                    {isChildLine && (
                      <ColorRow
                        variant="inline"
                        label="Line"
                        color={colorSettings.childLineColor}
                        opacity={colorSettings.childLineColorOpacity}
                        onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childLineColor: v })}
                        onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childLineColorOpacity: v })}
                      />
                    )}
                    {isChildDot && (
                      <ColorRow
                        variant="inline"
                        label="Dot"
                        color={colorSettings.dotColor}
                        opacity={colorSettings.dotColorOpacity}
                        onColorChange={(v) => onColorSettingsChange({ ...colorSettings, dotColor: v })}
                        onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, dotColorOpacity: v })}
                      />
                    )}
                  </div>
                </div>
                {isChildLine && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Modules</span>
                    <ColorRow
                      variant="inline"
                      label="Line Module"
                      color={colorSettings.lineModuleColor}
                      opacity={colorSettings.lineModuleOpacity}
                      onColorChange={(v) => onColorSettingsChange({ ...colorSettings, lineModuleColor: v })}
                      onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, lineModuleOpacity: v })}
                    />
                  </div>
                )}
                {isChildCircle && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Modules</span>
                    <ColorRow
                      variant="inline"
                      label="Circle Module"
                      color={colorSettings.circleModuleColor}
                      opacity={colorSettings.circleModuleOpacity}
                      onColorChange={(v) => onColorSettingsChange({ ...colorSettings, circleModuleColor: v })}
                      onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, circleModuleOpacity: v })}
                    />
                  </div>
                )}
                {(isParentMode || isChildRect || isChildCircle) && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Grids</span>
                    <div className="flex items-center gap-1">
                      {isParentMode && (
                        <ColorRow
                          variant="inline"
                          label="Parent Grid"
                          step={0.1}
                          color={colorSettings.gridColor}
                          opacity={colorSettings.gridOpacity}
                          onColorChange={(v) => onColorSettingsChange({ ...colorSettings, gridColor: v })}
                          onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, gridOpacity: v })}
                        />
                      )}
                      {isChildRect && (
                        <ColorRow
                          variant="inline"
                          label="Rect Grid"
                          step={0.1}
                          color={colorSettings.childRectGridColor}
                          opacity={colorSettings.childRectGridOpacity}
                          onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childRectGridColor: v })}
                          onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childRectGridOpacity: v })}
                        />
                      )}
                      {isChildCircle && (
                        <ColorRow
                          variant="inline"
                          label="Circle Grid"
                          step={0.1}
                          color={colorSettings.childCircleGridColor}
                          opacity={colorSettings.childCircleGridOpacity}
                          onColorChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleGridColor: v })}
                          onOpacityChange={(v) => onColorSettingsChange({ ...colorSettings, childCircleGridOpacity: v })}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section: Fit buttons */}
          <div className="flex items-center gap-2">
            <FitButtons
              isParentMode={isParentMode}
              isChildRect={isChildRect}
              hasParentRegion={hasParentRegion}
              selectedChildId={fit.selectedChildId}
              onCreateFullCanvasParent={fit.onCreateFullCanvasParent}
              onFitChildHeightToImage={fit.onFitChildHeightToImage}
              onFitChildWidthToImage={fit.onFitChildWidthToImage}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
