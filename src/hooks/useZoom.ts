import { useState, useCallback, useRef } from 'react';

interface UseZoomProps {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

export function useZoom({
  minZoom = 0.1,
  maxZoom = 20,
  initialZoom = 1
}: UseZoomProps = {}) {
  const [zoom, setZoomState] = useState(initialZoom);
  const [pan, setPanState] = useState({ x: 0, y: 0 });
  const maxZoomRef = useRef(maxZoom);
  const minZoomRef = useRef(minZoom);
  // Refs always hold the latest values – used for stable event handler closures
  const zoomRef = useRef(initialZoom);
  const panRef = useRef({ x: 0, y: 0 });

  const updateMaxZoom = useCallback((newMax: number) => {
    maxZoomRef.current = newMax;
  }, []);

  // Sync both ref and state together
  const applyZoom = useCallback((newZoom: number) => {
    zoomRef.current = newZoom;
    setZoomState(newZoom);
  }, []);

  const applyPan = useCallback((newPan: { x: number; y: number }) => {
    panRef.current = newPan;
    setPanState(newPan);
  }, []);

  // All zoom/pan calculations read from refs so closures never go stale
  const zoomAtPoint = useCallback((delta: number, point: { x: number; y: number }) => {
    const factor = delta > 0 ? 1 / 1.2 : 1.2;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.max(minZoomRef.current, Math.min(maxZoomRef.current, currentZoom * factor));

    if (newZoom !== currentZoom) {
      const zoomChange = newZoom / currentZoom;
      const newPan = {
        x: point.x - (point.x - currentPan.x) * zoomChange,
        y: point.y - (point.y - currentPan.y) * zoomChange,
      };
      applyZoom(newZoom);
      applyPan(newPan);
    }
  }, [applyZoom, applyPan]);

  const zoomByRatio = useCallback((ratio: number, point: { x: number; y: number }) => {
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.max(minZoomRef.current, Math.min(maxZoomRef.current, currentZoom * ratio));
    if (newZoom !== currentZoom) {
      const zoomChange = newZoom / currentZoom;
      const newPan = {
        x: point.x - (point.x - currentPan.x) * zoomChange,
        y: point.y - (point.y - currentPan.y) * zoomChange,
      };
      applyZoom(newZoom);
      applyPan(newPan);
    }
  }, [applyZoom, applyPan]);

  // Ref-only version: updates refs without setState for smooth pinch gestures.
  // Returns new { zoom, pan } if changed, null otherwise.
  const zoomByRatioDirect = useCallback((
    ratio: number,
    point: { x: number; y: number }
  ): { zoom: number; pan: { x: number; y: number } } | null => {
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const newZoom = Math.max(minZoomRef.current, Math.min(maxZoomRef.current, currentZoom * ratio));
    if (newZoom !== currentZoom) {
      const zoomChange = newZoom / currentZoom;
      const newPan = {
        x: point.x - (point.x - currentPan.x) * zoomChange,
        y: point.y - (point.y - currentPan.y) * zoomChange,
      };
      zoomRef.current = newZoom;
      panRef.current = newPan;
      return { zoom: newZoom, pan: newPan };
    }
    return null;
  }, []);

  // Flush refs into React state once after a gesture finishes.
  const syncStateFromRefs = useCallback(() => {
    setZoomState(zoomRef.current);
    setPanState({ ...panRef.current });
  }, []);

  const zoomIn = useCallback((centerPoint?: { x: number; y: number }) => {
    if (centerPoint) {
      zoomAtPoint(-1, centerPoint);
    } else {
      applyZoom(Math.min(zoomRef.current * 1.2, maxZoomRef.current));
    }
  }, [zoomAtPoint, applyZoom]);

  const zoomOut = useCallback((centerPoint?: { x: number; y: number }) => {
    if (centerPoint) {
      zoomAtPoint(1, centerPoint);
    } else {
      applyZoom(Math.max(zoomRef.current / 1.2, minZoomRef.current));
    }
  }, [zoomAtPoint, applyZoom]);

  const resetZoom = useCallback(() => {
    zoomRef.current = initialZoom;
    panRef.current = { x: 0, y: 0 };
    setZoomState(initialZoom);
    setPanState({ x: 0, y: 0 });
  }, [initialZoom]);

  const setZoomLevel = useCallback((level: number) => {
    applyZoom(Math.max(minZoomRef.current, Math.min(maxZoomRef.current, level)));
  }, [applyZoom]);

  const setPan = useCallback((newPan: { x: number; y: number }) => {
    applyPan(newPan);
  }, [applyPan]);

  return {
    zoom,
    pan,
    zoomRef,
    panRef,
    setPan,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    zoomByRatio,
    zoomByRatioDirect,
    syncStateFromRefs,
    resetZoom,
    setZoomLevel,
    updateMaxZoom,
  };
}
