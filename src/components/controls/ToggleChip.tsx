interface ToggleChipProps {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Small ON/OFF pill used by the grid, module, and angle-guide toggles.
export function ToggleChip({ on, onToggle, disabled = false }: ToggleChipProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`px-2 py-1 text-xs font-medium rounded transition-all ${
        on
          ? 'bg-blue-500 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}
