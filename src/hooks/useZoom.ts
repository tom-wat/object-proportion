import { useState, useCallback } from 'react';

interface UseZoomProps {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

export function useZoom({ 
  minZoom = 0.1, 
  maxZoom = 5, 
  initialZoom = 1 
}: UseZoomProps = {}) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomAtPoint = useCallback((delta: number, point: { x: number; y: number }) => {
    const factor = delta > 0 ? 1 / 1.2 : 1.2;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * factor));
    
    if (newZoom !== zoom) {
      // Calculate new pan to keep the mouse point stationary
      const zoomChange = newZoom / zoom;
      const newPan = {
        x: point.x - (point.x - pan.x) * zoomChange,
        y: point.y - (point.y - pan.y) * zoomChange
      };
      
      setZoom(newZoom);
      setPan(newPan);
    }
  }, [zoom, pan, minZoom, maxZoom]);

  const zoomIn = useCallback((centerPoint?: { x: number; y: number }) => {
    if (centerPoint) {
      zoomAtPoint(-1, centerPoint);
    } else {
      setZoom(prev => Math.min(prev * 1.2, maxZoom));
    }
  }, [maxZoom, zoomAtPoint]);

  const zoomOut = useCallback((centerPoint?: { x: number; y: number }) => {
    if (centerPoint) {
      zoomAtPoint(1, centerPoint);
    } else {
      setZoom(prev => Math.max(prev / 1.2, minZoom));
    }
  }, [minZoom, zoomAtPoint]);

  const resetZoom = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  const setZoomLevel = useCallback((level: number) => {
    setZoom(Math.max(minZoom, Math.min(maxZoom, level)));
  }, [minZoom, maxZoom]);

  return {
    zoom,
    pan,
    setPan,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    resetZoom,
    setZoomLevel
  };
}