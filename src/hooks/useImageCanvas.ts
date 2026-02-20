import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasDrawing } from './useCanvasDrawing';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useImageLoader } from './useImageLoader';
import { useZoom } from './useZoom';
import type { ParentRegion, ChildRegion, SelectionMode, ColorSettings, ChildGridSettings, RegionPoint, ChildDrawMode } from '../types';

interface UseImageCanvasProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionChange?: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  isParentSelected?: boolean;
  onParentDeselect?: () => void;
  onParentSelect?: () => void;
  onSelectionModeChange?: (mode: SelectionMode) => void;
  points?: RegionPoint[];
  selectedPointId?: number | null;
  onPointAdd?: (point: Omit<RegionPoint, 'id'>) => void;
  colorSettings?: ColorSettings;
  gridSettings?: { visible: boolean };
  childGridSettings?: ChildGridSettings;
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  imageRotation?: number;
  isPanMode?: boolean;
  childDrawMode?: ChildDrawMode;
  unitBasis?: 'height' | 'width';
}

export function useImageCanvas({
  selectionMode,
  parentRegion,
  childRegions,
  onParentRegionChange,
  onChildRegionAdd,
  onChildRegionChange,
  onChildRegionSelect,
  selectedChildId,
  isParentSelected,
  onParentDeselect,
  onParentSelect,
  onSelectionModeChange,
  points,
  selectedPointId,
  onPointAdd,
  colorSettings,
  gridSettings,
  childGridSettings,
  externalCanvasRef,
  imageRotation = 0,
  isPanMode = false,
  childDrawMode,
  unitBasis = 'height' as 'height' | 'width'
}: UseImageCanvasProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const imageLoadedRef = useRef(false);
  
  const handleCursorChange = useCallback((cursor: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = cursor;
    }
  }, [canvasRef]);
  
  const drawing = useCanvasDrawing();
  const { getImageDrawInfo } = drawing;
  const { zoom, pan, setPan, zoomIn, zoomOut, zoomAtPoint, resetZoom, setZoomLevel, updateMaxZoom } = useZoom();
  const [drawVersion, setDrawVersion] = useState(0);
  const fitScaleRef = useRef<number>(1);

  const handleImageLoad = useCallback((image: HTMLImageElement, canvas: HTMLCanvasElement) => {
    drawing.setImage(image);
    imageLoadedRef.current = true;

    // Draw with zoom and pan
    drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);

    // Compute fit scale and update max zoom so actual scale caps at 500%
    const drawInfo = drawing.getImageDrawInfo();
    if (drawInfo && image.naturalWidth > 0) {
      const fitScale = drawInfo.drawWidth / image.naturalWidth;
      fitScaleRef.current = fitScale;
      updateMaxZoom(5 / fitScale);
    }

    setDrawVersion(v => v + 1);
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, updateMaxZoom]);

  const setZoomToActualPct = useCallback((pct: number) => {
    if (fitScaleRef.current > 0) {
      const newZoom = pct / 100 / fitScaleRef.current;
      setZoomLevel(newZoom);
      const canvas = canvasRef.current;
      if (canvas) {
        setPan({
          x: canvas.width / 2 * (1 - newZoom),
          y: canvas.height / 2 * (1 - newZoom),
        });
      }
    }
  }, [setZoomLevel, setPan, canvasRef]);
  
  const imageLoader = useImageLoader({ onImageLoad: handleImageLoad });
  
  const handleRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);
    }
  }, [canvasRef, drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation]);
  
  const handleTemporaryDraw = useCallback((x: number, y: number, width: number, height: number, isParent: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      drawing.drawTemporaryRegion(ctx, x, y, width, height, isParent, zoom);
      ctx.restore();
    }
  }, [canvasRef, drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation]);

  const handleTemporaryCircleDraw = useCallback((cx: number, cy: number, radius: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      drawing.drawTemporaryCircle(ctx, cx, cy, radius, zoom);
      ctx.restore();
    }
  }, [canvasRef, drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation]);

  const handleTemporaryLineDraw = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      drawing.drawTemporaryLine(ctx, x1, y1, x2, y2, zoom);
      ctx.restore();
    }
  }, [canvasRef, drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation]);
  
  // Sync the canvas with React state after every relevant state/prop change.
  // Canvas is an imperative API, so we need this effect to re-draw whenever
  // the authoritative state changes (e.g. a new region is committed on mouseup).
  // Because `drawing` is now memoized (stable reference), this effect only fires
  // when actual data changes, not on every render — so it does NOT interfere
  // with temporary dashed previews drawn during a drag (no state changes occur
  // during a 'new' drag, only direct canvas API calls).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis);
    }
  }, [canvasRef, drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId, imageRotation, unitBasis]);

  const interaction = useCanvasInteraction({
    selectionMode,
    parentRegion,
    childRegions,
    onParentRegionChange,
    onChildRegionAdd,
    onChildRegionChange,
    onChildRegionSelect,
    selectedChildId,
    isParentSelected,
    onParentDeselect,
    onParentSelect,
    onSelectionModeChange,
    onPointAdd,
    onTemporaryDraw: handleTemporaryDraw,
    onRedraw: handleRedraw,
    childDrawMode,
    onTemporaryCircleDraw: handleTemporaryCircleDraw,
    onTemporaryLineDraw: handleTemporaryLineDraw,
    zoom,
    pan,
    onPanChange: setPan,
    getHandleAtPoint: drawing.getHandleAtPoint,
    calculateResize: drawing.calculateResize,
    onCursorChange: handleCursorChange,
    isPanMode,
    unitBasis
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanupInteraction = interaction.setupEventListeners(canvas);
    
    // Add scroll wheel zoom with mouse position
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Get mouse position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert to canvas coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasPoint = {
        x: mouseX * scaleX,
        y: mouseY * scaleY
      };
      
      zoomAtPoint(e.deltaY, canvasPoint);
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      cleanupInteraction();
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [canvasRef, interaction, zoomAtPoint]);


  const loadImage = useCallback((file: File) => {
    const canvas = canvasRef.current;
    if (canvas) {
      imageLoadedRef.current = false; // Reset flag when loading new image
      imageLoader.loadImage(file, canvas);
    }
  }, [canvasRef, imageLoader]);

  const loadImageFromCached = useCallback((cachedImage: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (canvas && cachedImage) {
      imageLoadedRef.current = false; // Reset flag when loading cached image
      imageLoader.loadImageFromCached(cachedImage, canvas);
    }
  }, [canvasRef, imageLoader]);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? { width: canvas.width, height: canvas.height } : { width: 0, height: 0 };
  }, [canvasRef]);

  const zoomInCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const centerPoint = {
        x: canvas.width / 2,
        y: canvas.height / 2
      };
      zoomIn(centerPoint);
    }
  }, [canvasRef, zoomIn]);

  const zoomOutCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const centerPoint = {
        x: canvas.width / 2,
        y: canvas.height / 2
      };
      zoomOut(centerPoint);
    }
  }, [canvasRef, zoomOut]);

  return {
    canvasRef,
    loadImage,
    loadImageFromCached,
    redraw: handleRedraw,
    getCanvasSize,
    zoom,
    pan,
    zoomIn: zoomInCenter,
    zoomOut: zoomOutCenter,
    resetZoom,
    getImageDrawInfo,
    drawVersion,
    setZoomToActualPct,
  };
}