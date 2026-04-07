import { useEffect, useCallback } from 'react';
import type { ChildDrawMode } from '../types';

const CHILD_DRAW_MODES: ChildDrawMode[] = ['rectangle', 'circle', 'line', 'dot'];

interface UseKeyboardShortcutsProps {
  selectedChildId: number | null;
  selectedPointId?: number | null;
  isParentSelected?: boolean;
  onChildRegionDelete: (id: number) => void;
  onChildRegionSelect: (id: number) => void;
  onPointDelete?: (id: number) => void;
  onPointDeselect?: () => void;
  onParentDeselect?: () => void;
  selectionMode?: 'parent' | 'child';
  onSelectionModeChange?: (mode: 'parent' | 'child') => void;
  onPanModeChange?: (isPanMode: boolean) => void;
  childDrawMode?: ChildDrawMode;
  onChildDrawModeChange?: (mode: ChildDrawMode) => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedChildId,
  selectedPointId,
  isParentSelected,
  onChildRegionDelete,
  onChildRegionSelect,
  onPointDelete,
  onPointDeselect,
  onParentDeselect,
  selectionMode,
  onSelectionModeChange,
  onPanModeChange,
  childDrawMode,
  onChildDrawModeChange,
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
      case ' ': // Spacebar
        // Prevent page scrolling and other space behaviors
        event.preventDefault();
        if (onPanModeChange) {
          onPanModeChange(true);
        }
        break;
      case 'Control':
        event.preventDefault();
        if (selectionMode && onSelectionModeChange) {
          // Toggle between parent and child modes
          const newMode = selectionMode === 'parent' ? 'child' : 'parent';
          onSelectionModeChange(newMode);
        }
        break;
      case 'Alt':
        event.preventDefault();
        if (selectionMode === 'child' && childDrawMode && onChildDrawModeChange) {
          const idx = CHILD_DRAW_MODES.indexOf(childDrawMode);
          onChildDrawModeChange(CHILD_DRAW_MODES[(idx + 1) % CHILD_DRAW_MODES.length]);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (selectedPointId !== null && selectedPointId !== undefined && onPointDelete) {
          event.preventDefault();
          onPointDelete(selectedPointId);
        } else if (selectedChildId !== null) {
          event.preventDefault();
          onChildRegionDelete(selectedChildId);
        }
        break;
      case 'Escape':
        event.preventDefault();
        // Deselect point if selected
        if (selectedPointId !== null && selectedPointId !== undefined && onPointDeselect) {
          onPointDeselect();
        }
        // Deselect child if selected
        else if (selectedChildId !== null) {
          onChildRegionSelect(-1);
        }
        // Deselect parent if selected
        else if (isParentSelected && onParentDeselect) {
          onParentDeselect();
        }
        break;
    }
  }, [enabled, selectedChildId, selectedPointId, isParentSelected, onChildRegionDelete, onChildRegionSelect, onPointDelete, onPointDeselect, onParentDeselect, selectionMode, onSelectionModeChange, onPanModeChange, childDrawMode, onChildDrawModeChange]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    switch (event.key) {
      case ' ': // Spacebar
        if (onPanModeChange) {
          onPanModeChange(false);
        }
        break;
    }
  }, [enabled, onPanModeChange]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, enabled]);

  return {
    // Could expose additional shortcut info here if needed
  };
}