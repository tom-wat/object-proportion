import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsProps {
  selectedChildId: number | null;
  onChildRegionDelete: (id: number) => void;
  onChildRegionSelect: (id: number) => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedChildId,
  onChildRegionDelete,
  onChildRegionSelect,
  enabled = true
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input field
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).isContentEditable
    )) {
      return;
    }

    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        if (selectedChildId !== null) {
          event.preventDefault();
          onChildRegionDelete(selectedChildId);
        }
        break;
      case 'Escape':
        if (selectedChildId !== null) {
          event.preventDefault();
          onChildRegionSelect(-1); // Deselect
        }
        break;
    }
  }, [enabled, selectedChildId, onChildRegionDelete, onChildRegionSelect]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    // Could expose additional shortcut info here if needed
  };
}