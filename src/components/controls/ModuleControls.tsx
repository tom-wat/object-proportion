import type { ChildGridSettings } from '../../types';
import { ToggleChip } from './ToggleChip';

interface ModuleControlsProps {
  shape: 'line' | 'circle';
  childGridSettings: ChildGridSettings;
  onChildGridSettingsChange: (s: ChildGridSettings) => void;
  childCount: number;
  // 'sm': compact desktop-toolbar labels. 'md': larger drawer labels.
  size?: 'sm' | 'md';
}

// Module ON/OFF toggle plus, for lines, the base-length number input,
// integer preset select, and angle-guide toggle.
export function ModuleControls({ shape, childGridSettings, onChildGridSettingsChange, childCount, size = 'sm' }: ModuleControlsProps) {
  const isLine = shape === 'line';
  const disabled = childCount === 0;
  const labelClass = size === 'sm' ? 'text-xs text-gray-500' : 'text-sm text-gray-600';
  const inputClass = size === 'sm'
    ? 'w-16 px-1 py-0.5 text-xs border border-gray-200 rounded'
    : 'w-16 px-2 py-1 text-sm border border-gray-200 rounded';
  const selectClass = size === 'sm'
    ? 'px-1 py-0.5 text-xs border border-gray-200 rounded bg-white'
    : 'px-2 py-1 text-sm border border-gray-200 rounded bg-white';

  const moduleVisible = isLine ? childGridSettings.lineModuleVisible : childGridSettings.circleModuleVisible;
  const toggleModule = () => onChildGridSettingsChange(
    isLine
      ? { ...childGridSettings, lineModuleVisible: !childGridSettings.lineModuleVisible }
      : { ...childGridSettings, circleModuleVisible: !childGridSettings.circleModuleVisible }
  );

  return (
    <>
      <ToggleChip on={moduleVisible} onToggle={toggleModule} disabled={disabled} />
      {isLine && (
        <div className="flex items-center gap-1">
          <span className={labelClass}>Base</span>
          <input
            type="number"
            min={0.1}
            max={16}
            step={0.1}
            value={childGridSettings.lineModuleLength ?? 1}
            onChange={(e) => onChildGridSettingsChange({ ...childGridSettings, lineModuleLength: Math.min(16, Math.max(0.1, Number(e.target.value) || 0.1)) })}
            className={inputClass}
            title="Line module base length (grid units, 0.1–16)"
            disabled={disabled}
          />
          <span className={labelClass}>Preset</span>
          <select
            value={Number.isInteger(childGridSettings.lineModuleLength ?? 1) ? String(childGridSettings.lineModuleLength) : ''}
            onChange={(e) => onChildGridSettingsChange({ ...childGridSettings, lineModuleLength: Number(e.target.value) })}
            className={selectClass}
            title="Pick an integer base length"
            disabled={disabled}
          >
            {!Number.isInteger(childGridSettings.lineModuleLength ?? 1) && <option value="" disabled>–</option>}
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
      {isLine && (
        <div className="flex items-center gap-1">
          <span className={size === 'sm' ? 'text-sm text-gray-500' : 'text-sm text-gray-600'}>Angle</span>
          <ToggleChip
            on={childGridSettings.lineAngleGuideVisible}
            onToggle={() => onChildGridSettingsChange({ ...childGridSettings, lineAngleGuideVisible: !childGridSettings.lineAngleGuideVisible })}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}
