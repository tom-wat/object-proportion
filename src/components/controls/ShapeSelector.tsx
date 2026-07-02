import type { ChildDrawMode } from '../../types';

interface ShapeSelectorProps {
  childDrawMode: ChildDrawMode;
  onChildDrawModeChange: (mode: ChildDrawMode) => void;
  // 'full': icon + name with drawing hints (desktop). 'icon': icon only (mobile).
  labelStyle: 'full' | 'icon';
}

const SHAPES: { mode: ChildDrawMode; icon: string; name: string; hint: string }[] = [
  { mode: 'rectangle', icon: '□', name: 'Rect', hint: 'Draw rectangle' },
  { mode: 'circle', icon: '○', name: 'Circle', hint: 'Draw circle (drag from center)' },
  { mode: 'line', icon: '/', name: 'Line', hint: 'Draw line (drag)' },
  { mode: 'dot', icon: '·', name: 'Dot', hint: 'Place dot (single click)' },
];

export function ShapeSelector({ childDrawMode, onChildDrawModeChange, labelStyle }: ShapeSelectorProps) {
  const isFull = labelStyle === 'full';
  return (
    <div className="flex bg-gray-50 rounded-lg p-0.5">
      {SHAPES.map(({ mode, icon, name, hint }) => (
        <button
          key={mode}
          onClick={() => onChildDrawModeChange(mode)}
          title={isFull ? hint : name === 'Rect' ? 'Rectangle' : name}
          className={`${isFull ? 'px-3' : 'px-2.5'} py-1.5 text-sm font-medium rounded-md transition-all ${
            childDrawMode === mode
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {isFull ? `${icon} ${name}` : icon}
        </button>
      ))}
    </div>
  );
}
