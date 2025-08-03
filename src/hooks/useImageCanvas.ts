import { useRef, useEffect, useCallback } from 'react';
import { useCanvasDrawing } from './useCanvasDrawing';
import { useCanvasInteraction } from './useCanvasInteraction';
import { useImageLoader } from './useImageLoader';
import { useZoom } from './useZoom';
import type { ParentRegion, ChildRegion, SelectionMode, ColorSettings } from '../types';

interface UseImageCanvasProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  colorSettings?: ColorSettings;
  gridSettings?: { visible: boolean; type: string; customSize?: number };
}

export function useImageCanvas({
  selectionMode,
  parentRegion,
  childRegions,
  onParentRegionChange,
  onChildRegionAdd,
  onChildRegionSelect,
  selectedChildId,
  colorSettings,
  gridSettings
}: UseImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageLoadedRef = useRef(false);
  
  const drawing = useCanvasDrawing();
  const { zoom, pan, setPan, zoomIn, zoomOut, zoomAtPoint, resetZoom } = useZoom();
  
  const handleImageLoad = useCallback((image: HTMLImageElement, canvas: HTMLCanvasElement) => {
    drawing.setImage(image);
    imageLoadedRef.current = true;
    
    // Draw with zoom and pan
    drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings);
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings]);
  
  const imageLoader = useImageLoader({ onImageLoad: handleImageLoad });
  
  const handleRedraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings);
    }
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings]);
  
  const handleTemporaryDraw = useCallback((x: number, y: number, width: number, height: number, isParent: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      // まず現在の状態を再描画
      drawing.redraw(canvas, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings);
      
      // 一時的な領域を描画
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      drawing.drawTemporaryRegion(ctx, x, y, width, height, isParent);
      ctx.restore();
    }
  }, [drawing, parentRegion, childRegions, zoom, pan, selectedChildId, colorSettings, gridSettings]);
  
  const interaction = useCanvasInteraction({
    selectionMode,
    parentRegion,
    childRegions,
    onParentRegionChange,
    onChildRegionAdd,
    onChildRegionSelect,
    selectedChildId,
    onTemporaryDraw: handleTemporaryDraw,
    onRedraw: handleRedraw,
    zoom,
    pan,
    onPanChange: setPan
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
    
    canvas.addEventListener('wheel', handleWheel);
    
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
    redraw: handleRedraw,
    getCanvasSize,
    zoom,
    pan,
    zoomIn: zoomInCenter,
    zoomOut: zoomOutCenter,
    resetZoom
  };
}