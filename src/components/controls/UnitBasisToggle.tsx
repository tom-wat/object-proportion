interface UnitBasisToggleProps {
  unitBasis: 'height' | 'width';
  onUnitBasisChange: (basis: 'height' | 'width') => void;
  // 'sm': compact desktop-toolbar size. 'md': larger drawer size.
  size?: 'sm' | 'md';
}

export function UnitBasisToggle({ unitBasis, onUnitBasisChange, size = 'sm' }: UnitBasisToggleProps) {
  const buttonClass = (active: boolean) =>
    `${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-1.5 text-sm'} font-medium rounded-md transition-all ${
      active
        ? 'bg-blue-500 text-white shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex bg-gray-50 rounded-lg p-0.5 w-fit">
      <button
        onClick={() => onUnitBasisChange('height')}
        className={buttonClass(unitBasis === 'height')}
        title="Use height as grid unit basis"
      >
        H
      </button>
      <button
        onClick={() => onUnitBasisChange('width')}
        className={buttonClass(unitBasis === 'width')}
        title="Use width as grid unit basis"
      >
        W
      </button>
    </div>
  );
}
