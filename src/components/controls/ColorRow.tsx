interface ColorRowProps {
  label: string;
  color: string;
  opacity: number;
  onColorChange: (v: string) => void;
  onOpacityChange: (v: number) => void;
  // 'row': labeled row with flexible slider (drawer). 'inline': compact,
  // tooltip-labeled group for the desktop toolbar.
  variant?: 'row' | 'inline';
  // Opacity slider step (the desktop grid rows historically use 0.1).
  step?: number;
}

export function ColorRow({ label, color, opacity, onColorChange, onOpacityChange, variant = 'row', step = 0.05 }: ColorRowProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-6 h-6 rounded border-0 cursor-pointer"
          title={`${label} Color`}
        />
        <input
          type="range"
          min="0" max="1" step={step}
          value={opacity}
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
          title={`${label} Opacity`}
        />
        <span className="text-xs text-gray-400 w-8">{Math.round(opacity * 100)}%</span>
      </div>
    );
  }

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
        min="0" max="1" step={step}
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
