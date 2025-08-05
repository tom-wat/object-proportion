import { useRef, useEffect, useCallback } from 'react';
import { useCanvasDrawing } from './useCanvasDrawing';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useImageLoader } from './useImageLoader';
import { useZoom } from './useZoom';
import type { ParentRegion, ChildRegion, SelectionMode, ColorSettings, ChildGridSettings, RegionPoint } from '../types';

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
  points?: RegionPoint[];
  selectedPointId?: number | null;
  onPointAdd?: (point: Omit<RegionPoint, 'id'>) => void;
  colorSettings?: ColorSettings;
  gridSettings?: { visible: boolean };
  childGridSettings?: ChildGridSettings;
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
  points,
  selectedPointId,
  onPointAdd,
  colorSettings,
  gridSettings,
  childGridSettings
}: UseImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageLoadedRef = useRef(false);
  
  const handleCursorChange = useCallback((cursor: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = cursor;
    }
  }, []);
  
  const drawing = useCanvasDrawing();
  const { zoom, pan, setPan, zoomIn, zoomOut, zoomAtPoint, resetZoom } = useZoom();
  
  const handleImageLoad = useCallback((image: HTMLImageElement, canvas: HTMLCanvasElement) => {
    drawing.setImage(image);
    imageLoadedRef.current = true;
    
    // Draw with zoom and pan
    drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId);
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId]);
  
  const imageLoader = useImageLoader({ onImageLoad: handleImageLoad });
  
  const handleRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId);
    }
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId]);
  
  const handleTemporaryDraw = useCallback((x: number, y: number, width: number, height: number, isParent: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      // まず現在の状態を再描画
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId);
      
      // 一時的な領域を描画
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      drawing.drawTemporaryRegion(ctx, x, y, width, height, isParent, zoom);
      ctx.restore();
    }
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings, childGridSettings, isParentSelected, points, selectedPointId]);
  
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
    onPointAdd,
    onTemporaryDraw: handleTemporaryDraw,
    onRedraw: handleRedraw,
    zoom,
    pan,
    onPanChange: setPan,
    getHandleAtPoint: drawing.getHandleAtPoint,
    calculateResize: drawing.calculateResize,
    onCursorChange: handleCursorChange
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
  }, [interaction, zoomAtPoint]);


  const loadImage = useCallback((file: File) => {
    const canvas = canvasRef.current;
    if (canvas) {
      imageLoadedRef.current = false; // Reset flag when loading new image
      imageLoader.loadImage(file, canvas);
    }
  }, [imageLoader]);

  const loadImageFromCached = useCallback((cachedImage: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (canvas && cachedImage) {
      imageLoadedRef.current = false; // Reset flag when loading cached image
      imageLoader.loadImageFromCached(cachedImage, canvas);
    }
  }, [imageLoader]);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? { width: canvas.width, height: canvas.height } : { width: 0, height: 0 };
  }, []);

  const zoomInCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const centerPoint = {
        x: canvas.width / 2,
        y: canvas.height / 2
      };
      zoomIn(centerPoint);
    }
  }, [zoomIn]);

  const zoomOutCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const centerPoint = {
        x: canvas.width / 2,
        y: canvas.height / 2
      };
      zoomOut(centerPoint);
    }
  }, [zoomOut]);

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
    resetZoom
  };
}