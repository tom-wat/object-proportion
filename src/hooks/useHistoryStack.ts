import { useState, useCallback } from 'react';
import type { AnalysisData } from '../types';

export interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

interface HistoryState {
  undoStack: AnalysisData[];
  redoStack: AnalysisData[];
}

const MAX_HISTORY_SIZE = 30;

export function useHistoryStack() {
  const [historyState, setHistoryState] = useState<HistoryState>({
    undoStack: [],
    redoStack: []
  });

  const pushToHistory = useCallback((currentState: AnalysisData) => {
    setHistoryState(prev => {
      // Check if the current state is different from the last saved state
      if (prev.undoStack.length > 0) {
        const lastState = prev.undoStack[prev.undoStack.length - 1];
        // Simple comparison - could be made more sophisticated if needed
        if (JSON.stringify(lastState) === JSON.stringify(currentState)) {
          return prev; // Don't add duplicate states
        }
      }
      
      return {
        undoStack: [
          ...prev.undoStack.slice(-MAX_HISTORY_SIZE + 1),
          structuredClone(currentState)
        ],
        redoStack: [] // Clear redo stack when new action is performed
      };
    });
  }, []);

  const undo = useCallback((currentState: AnalysisData): AnalysisData | null => {
    if (historyState.undoStack.length === 0) return null;

    const previousState = historyState.undoStack[historyState.undoStack.length - 1];
    
    setHistoryState(prev => ({
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [structuredClone(currentState), ...prev.redoStack.slice(0, MAX_HISTORY_SIZE - 1)]
    }));

    return structuredClone(previousState);
  }, [historyState.undoStack]);

  const redo = useCallback((currentState: AnalysisData): AnalysisData | null => {
    if (historyState.redoStack.length === 0) return null;

    const nextState = historyState.redoStack[0];
    
    setHistoryState(prev => ({
      undoStack: [...prev.undoStack, structuredClone(currentState)],
      redoStack: prev.redoStack.slice(1)
    }));

    return structuredClone(nextState);
  }, [historyState.redoStack]);

  const canUndo = historyState.undoStack.length > 0;
  const canRedo = historyState.redoStack.length > 0;

  const clearHistory = useCallback(() => {
    setHistoryState({
      undoStack: [],
      redoStack: []
    });
  }, []);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  };
}