import { useCallback, useRef } from 'react';
import type { AnalysisData } from '../types';
import { useHistoryStack } from './useHistoryStack';

interface UseHistoryOptions {
  debounceMs?: number;
}

/**
 * Enhanced history hook with debouncing for move operations
 * Records history only after operations stop for a specified duration
 */
export function useHistory(options: UseHistoryOptions = {}) {
  const { debounceMs = 500 } = options;
  const { pushToHistory, undo, redo, canUndo, canRedo, clearHistory } = useHistoryStack();
  
  // Track pending state and debounce timer
  const pendingStateRef = useRef<AnalysisData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  // Immediate history recording (for non-continuous operations)
  const recordImmediately = useCallback((state: AnalysisData) => {
    // Clear any pending debounced recording
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    
    pushToHistory(state);
  }, [pushToHistory]);

  // Debounced history recording (for continuous operations like moves)
  const recordWithDebounce = useCallback((state: AnalysisData) => {
    // Store the initial state when starting a continuous operation
    if (!isRecordingRef.current) {
      pendingStateRef.current = state;
      isRecordingRef.current = true;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to record history after debounce period
    debounceTimerRef.current = setTimeout(() => {
      if (pendingStateRef.current) {
        pushToHistory(pendingStateRef.current);
        pendingStateRef.current = null;
      }
      isRecordingRef.current = false;
      debounceTimerRef.current = null;
    }, debounceMs);
  }, [pushToHistory, debounceMs]);

  // Force commit any pending debounced history (useful for cleanup)
  const commitPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (pendingStateRef.current) {
      pushToHistory(pendingStateRef.current);
      pendingStateRef.current = null;
    }
    
    isRecordingRef.current = false;
  }, [pushToHistory]);

  // Enhanced clear that also cleans up pending operations
  const clearHistoryEnhanced = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    isRecordingRef.current = false;
    clearHistory();
  }, [clearHistory]);

  return {
    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory: clearHistoryEnhanced,
    
    // Recording functions
    recordImmediately,
    recordWithDebounce,
    commitPending,
    
    // Status
    hasPendingHistory: () => pendingStateRef.current !== null
  };
}