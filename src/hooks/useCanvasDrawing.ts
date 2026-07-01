import { useCallback, useRef, useMemo } from 'react';
import type { ParentRegion, ChildRegion, ColorSettings, GridSettings, ChildGridSettings, RegionPoint } from '../types';
import { CANVAS_CONSTANTS, COLORS } from '../utils/constants';
import { hexToRgba } from '../utils/color';
import { getImageFitLayout } from '../utils/imageFit';
import { getResizeHandles } from '../utils/resize';
import {
  drawGridLines,
  drawCircleModuleRows,
  drawLineModuleDots,
  drawLineAngleGuide as drawAngleGuide,
  drawPointMarkers,
} from '../utils/overlayRenderer';

export function useCanvasDrawing() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageDrawInfoRef = useRef<{
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
    rotation: number;
  } | null>(null);

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const img = imageRef.current;
    
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }
    
    try {
      ctx.save();

      const { drawWidth, drawHeight, offsetX, offsetY } = getImageFitLayout(
        canvas.width, canvas.height, img.naturalWidth, img.naturalHeight
      );

      // Draw the image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // Store image draw information for coordinate transformations
      imageDrawInfoRef.current = {
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        rotation: 0
      };
      
      ctx.restore();
    } catch (error) {
      console.error('Error drawing image:', error);
    }
  }, []);

  const drawHandle = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    size: number = CANVAS_CONSTANTS.HANDLE_SIZE,
    zoom: number = 1
  ) => {
    const adjustedSize = size / zoom;
    ctx.fillRect(x - adjustedSize/2, y - adjustedSize/2, adjustedSize, adjustedSize);
  }, []);
  const drawParentRegion = useCallback((ctx: CanvasRenderingContext2D, region: ParentRegion, colorSettings?: ColorSettings, isSelected: boolean = false, zoom: number = 1) => {
    const parentColor = colorSettings
      ? hexToRgba(colorSettings.parentColor, colorSettings.parentColorOpacity ?? 1)
      : COLORS.PRIMARY;
    ctx.save();
    
    if (region.rotation !== 0) {
      const centerX = region.x + region.width / 2;
      const centerY = region.y + region.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(region.rotation);
      ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = isSelected ? COLORS.SELECTED : parentColor;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
    ctx.strokeRect(region.x, region.y, region.width, region.height);

    // Add selection highlight
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED + '20';
      ctx.fillRect(region.x, region.y, region.width, region.height);
    }

    // Only draw handles when selected
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED;
      
      const resizeHandles = getResizeHandles(region, 0);
      resizeHandles.forEach(handle => {
        drawHandle(ctx, handle.x, handle.y, CANVAS_CONSTANTS.HANDLE_SIZE, zoom);
      });

      const rotationHandleY = region.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
      ctx.beginPath();
      ctx.arc(region.x + region.width/2, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE / zoom, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(region.x + region.width/2, region.y);
      ctx.lineTo(region.x + region.width/2, rotationHandleY);
      ctx.stroke();
    }

    ctx.restore();
  }, [drawHandle]);

  const drawChildRegion = useCallback((ctx: CanvasRenderingContext2D, region: ChildRegion, _index: number, isSelected: boolean = false, colorSettings?: ColorSettings, zoom: number = 1) => {
    const childColor = region.shape === 'circle'
      ? (colorSettings ? hexToRgba(colorSettings.childCircleColor, colorSettings.childCircleColorOpacity ?? 1) : COLORS.CHILD)
      : region.shape === 'line'
        ? (colorSettings ? hexToRgba(colorSettings.childLineColor, colorSettings.childLineColorOpacity ?? 1) : COLORS.CHILD)
        : (colorSettings ? hexToRgba(colorSettings.childRectColor, colorSettings.childRectColorOpacity ?? 1) : COLORS.CHILD);
    ctx.save();

    if (region.shape === 'circle') {
      const cx = region.bounds.x + region.bounds.width / 2;
      const cy = region.bounds.y + region.bounds.height / 2;
      const radiusX = region.bounds.width / 2;
      const radiusY = region.bounds.height / 2;

      if (region.rotation) {
        ctx.translate(cx, cy);
        ctx.rotate(region.rotation);
        ctx.translate(-cx, -cy);
      }

      ctx.strokeStyle = isSelected ? COLORS.SELECTED : childColor;
      ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = COLORS.SELECTED + '20';
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = COLORS.SELECTED;
        const resizeHandles = getResizeHandles(region.bounds, 0);
        resizeHandles.forEach(handle => {
          drawHandle(ctx, handle.x, handle.y, CANVAS_CONSTANTS.HANDLE_SIZE, zoom);
        });

        const rotationHandleY = region.bounds.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
        ctx.beginPath();
        ctx.arc(cx, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE / zoom, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, region.bounds.y);
        ctx.lineTo(cx, rotationHandleY);
        ctx.stroke();
      }

    } else if (region.shape === 'line' && region.lineStart && region.lineEnd) {
      ctx.strokeStyle = isSelected ? COLORS.SELECTED : childColor;
      ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
      ctx.beginPath();
      ctx.moveTo(region.lineStart.x, region.lineStart.y);
      ctx.lineTo(region.lineEnd.x, region.lineEnd.y);
      ctx.stroke();

      if (isSelected) {
        const endpointRadius = CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE / zoom;
        ctx.fillStyle = COLORS.SELECTED;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / zoom;
        [region.lineStart, region.lineEnd].forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, endpointRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }

    } else {
      // Rectangle (default)
      if (region.rotation !== 0) {
        const centerX = region.bounds.x + region.bounds.width / 2;
        const centerY = region.bounds.y + region.bounds.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(region.rotation);
        ctx.translate(-centerX, -centerY);
      }

      ctx.strokeStyle = isSelected ? COLORS.SELECTED : childColor;
      ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
      ctx.strokeRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);

      if (isSelected) {
        ctx.fillStyle = COLORS.SELECTED + '20';
        ctx.fillRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
      }

      if (isSelected) {
        ctx.fillStyle = COLORS.SELECTED;
        const resizeHandles = getResizeHandles(region.bounds, 0);
        resizeHandles.forEach(handle => {
          drawHandle(ctx, handle.x, handle.y, CANVAS_CONSTANTS.HANDLE_SIZE, zoom);
        });

        const rotationHandleY = region.bounds.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
        ctx.beginPath();
        ctx.arc(region.bounds.x + region.bounds.width/2, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE / zoom, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(region.bounds.x + region.bounds.width/2, region.bounds.y);
        ctx.lineTo(region.bounds.x + region.bounds.width/2, rotationHandleY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [drawHandle]);

  const drawTemporaryRegion = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _isParent?: boolean,
    zoom: number = 1
  ) => {
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
    ctx.setLineDash(CANVAS_CONSTANTS.DASH_PATTERN);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }, []);

  const drawTemporaryCircle = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    zoom: number = 1
  ) => {
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
    ctx.setLineDash(CANVAS_CONSTANTS.DASH_PATTERN);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawTemporaryLine = useCallback((
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    zoom: number = 1
  ) => {
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH / zoom;
    ctx.setLineDash(CANVAS_CONSTANTS.DASH_PATTERN);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawChildGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    childRegion: ChildRegion,
    gridColor: string,
    gridOpacity: number,
    zoom: number,
    unitBasis: 'height' | 'width' = 'height',
    parentRegion: ParentRegion | null = null
  ) => {
    // Skip grid for line shape
    if (childRegion.shape === 'line') return;

    // Use parent cell size as unit; the renderer falls back to the child's own
    // basis when no override is given.
    const parentCellSize = parentRegion
      ? (unitBasis === 'height' ? parentRegion.height : parentRegion.width) / 16
      : undefined;

    const isCircle = childRegion.shape === 'circle';
    drawGridLines(ctx, { ...childRegion.bounds, rotation: childRegion.rotation }, gridColor, gridOpacity, 1 / zoom, {
      unitBasis,
      cellSizeOverride: parentCellSize,
      clipToEllipse: isCircle,
      // Rectangles also get a finer 1/64 grid; circles keep the 1/16 grid only.
      subdivide: !isCircle,
    });
  }, []);

  const drawGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    parentRegion: ParentRegion,
    gridColor: string,
    gridOpacity: number,
    zoom: number,
    unitBasis: 'height' | 'width' = 'height'
  ) => {
    drawGridLines(ctx, parentRegion, gridColor, gridOpacity, 1 / zoom, { unitBasis });
  }, []);

  const drawLineModules = useCallback((
    ctx: CanvasRenderingContext2D,
    region: ChildRegion,
    color: string,
    opacity: number,
    zoom: number,
    moduleLength: number
  ) => {
    if (region.shape !== 'line' || !region.lineStart || !region.lineEnd) return;

    const lineLength = region.lineLength ?? 0;
    if (lineLength <= 0) return;

    drawLineModuleDots(ctx, region.lineStart, region.lineEnd, color, opacity, 1 / zoom, moduleLength, lineLength);
  }, []);

  const drawLineAngleGuide = useCallback((
    ctx: CanvasRenderingContext2D,
    region: ChildRegion,
    color: string,
    opacity: number,
    zoom: number
  ) => {
    if (region.shape !== 'line' || !region.lineStart || !region.lineEnd) return;
    drawAngleGuide(ctx, region.lineStart, region.lineEnd, color, opacity, 1 / zoom);
  }, []);

  const drawCircleModules = useCallback((
    ctx: CanvasRenderingContext2D,
    region: ChildRegion,
    color: string,
    opacity: number,
    zoom: number,
    unitBasis: 'height' | 'width',
    parentRegion: ParentRegion | null
  ) => {
    if (region.shape !== 'circle') return;
    if (!parentRegion) return;

    const parentBasis = unitBasis === 'height' ? parentRegion.height : parentRegion.width;
    drawCircleModuleRows(ctx, { ...region.bounds, rotation: region.rotation }, color, opacity, 1 / zoom, parentBasis);
  }, []);

  const drawPoints = useCallback((
    ctx: CanvasRenderingContext2D,
    points: RegionPoint[],
    colorSettings: ColorSettings,
    childRegions: ChildRegion[],
    selectedPointId: number | null = null,
    zoom: number = 1
  ) => {
    const markers = points.map(point => ({
      id: point.id,
      pixel: point.coordinates.pixel,
      parentRegionId: point.parentRegionId,
    }));
    drawPointMarkers(ctx, markers, colorSettings, childRegions, selectedPointId, 1 / zoom);
  }, []);

  const redraw = useCallback((
    canvas: HTMLCanvasElement,
    parentRegion: ParentRegion | null,
    childRegions: ChildRegion[],
    zoom: number = 1,
    pan: { x: number; y: number } = { x: 0, y: 0 },
    selectedChildId: number | null = null,
    colorSettings?: ColorSettings,
    gridSettings?: GridSettings,
    childGridSettings?: ChildGridSettings,
    isParentSelected: boolean = false,
    points: RegionPoint[] = [],
    selectedPointId: number | null = null,
    unitBasis: 'height' | 'width' = 'height'
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply zoom and pan transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image first
    drawImage(ctx, canvas);
    
    // Draw grid second (behind frames)
    if (gridSettings?.visible && parentRegion && colorSettings?.gridColor && (colorSettings.gridOpacity || 0) > 0) {
      drawGrid(ctx, parentRegion, colorSettings.gridColor, colorSettings.gridOpacity || 0.7, zoom, unitBasis);
    }

    // Draw child grids first (behind child regions)
    childRegions.forEach((region) => {
      const isRect = !region.shape || region.shape === 'rectangle';
      const isCircle = region.shape === 'circle';
      const isLine = region.shape === 'line';
      const gridVisible = (isRect && childGridSettings?.rectVisible) || (isCircle && childGridSettings?.circleVisible);
      if (gridVisible && colorSettings) {
        const gridColor = isCircle ? colorSettings.childCircleGridColor : colorSettings.childRectGridColor;
        const gridOpacity = isCircle ? colorSettings.childCircleGridOpacity : colorSettings.childRectGridOpacity;
        drawChildGrid(ctx, region, gridColor, gridOpacity, zoom, unitBasis, parentRegion);
      }
      if (isLine && childGridSettings?.lineAngleGuideVisible && colorSettings) {
        drawLineAngleGuide(ctx, region, colorSettings.lineModuleColor, colorSettings.lineModuleOpacity, zoom);
      }
      if (isCircle && childGridSettings?.circleModuleVisible && colorSettings) {
        drawCircleModules(ctx, region, colorSettings.circleModuleColor, colorSettings.circleModuleOpacity, zoom, unitBasis, parentRegion);
      }
    });

    // Layer order control: Draw selected region on top with proper separation
    const selectedChild = childRegions.find(region => region.id === selectedChildId);
    
    // Strategy: Separate background and foreground drawing completely
    
    // 1. Draw parent region in background layer only if not selected
    if (parentRegion && !isParentSelected) {
      drawParentRegion(ctx, parentRegion, colorSettings, false, zoom);
    }

    // 2. Draw only non-selected child regions in background layer
    const unselectedChildren = childRegions.filter(region => region.id !== selectedChildId);
    unselectedChildren.forEach((region, index) => {
      drawChildRegion(ctx, region, index, false, colorSettings, zoom);
    });

    // 3. Draw selected region on top (completely separate from background)
    if (selectedChild) {
      // Selected child region always on top with selection highlight
      const selectedIndex = childRegions.findIndex(region => region.id === selectedChildId);
      drawChildRegion(ctx, selectedChild, selectedIndex, true, colorSettings, zoom);
    } else if (parentRegion && isParentSelected) {
      // Selected parent region on top with selection highlight
      drawParentRegion(ctx, parentRegion, colorSettings, true, zoom);
    }

    // Draw line module dots on top of the line stroke (the dots sit on the
    // line's centerline, so they must be drawn after the line itself).
    if (childGridSettings?.lineModuleVisible && colorSettings && parentRegion) {
      childRegions.forEach((region) => {
        if (region.shape !== 'line') return;
        // lineModuleLength is in grid units (same scale as child width/height);
        // 1 unit = parentBasis/16 (the original 1/16 module).
        const lineParentBasis = unitBasis === 'height' ? parentRegion.height : parentRegion.width;
        const lineModuleLengthPx = (childGridSettings.lineModuleLength ?? 1) * lineParentBasis / 16;
        drawLineModules(ctx, region, colorSettings.lineModuleColor, colorSettings.lineModuleOpacity, zoom, lineModuleLengthPx);
      });
    }

    // Draw points on top of everything
    if (points.length > 0 && colorSettings) {
      drawPoints(ctx, points, colorSettings, childRegions, selectedPointId, zoom);
    }

    // Restore context state
    ctx.restore();
  }, [drawImage, drawGrid, drawParentRegion, drawChildRegion, drawChildGrid, drawLineModules, drawLineAngleGuide, drawCircleModules, drawPoints]);

  const setImage = useCallback((image: HTMLImageElement) => {
    imageRef.current = image;
  }, []);

  const getImageDrawInfo = useCallback(() => {
    return imageDrawInfoRef.current;
  }, []);

  // Memoize the returned object so its reference stays stable across renders.
  // All member functions are already useCallback with stable deps, so useMemo
  // will produce the same object every render, preventing unnecessary downstream
  // re-creation of callbacks and useEffect re-runs.
  return useMemo(() => ({
    drawTemporaryRegion,
    drawTemporaryCircle,
    drawTemporaryLine,
    redraw,
    setImage,
    getImageDrawInfo,
  }), [
    drawTemporaryRegion,
    drawTemporaryCircle,
    drawTemporaryLine,
    redraw,
    setImage,
    getImageDrawInfo,
  ]);
}