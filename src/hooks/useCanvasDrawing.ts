import { useCallback, useRef, useMemo } from 'react';
import type { ParentRegion, ChildRegion, ColorSettings, GridSettings, ChildGridSettings, ResizeHandle, ResizeHandleInfo, RegionPoint } from '../types';
import { CANVAS_CONSTANTS, COLORS } from '../utils/constants';
import { calculateLineModules } from '../utils/geometry';

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
}

export function useCanvasDrawing() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageDrawInfoRef = useRef<{
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
    rotation: number;
  } | null>(null);

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, imageRotation: number = 0) => {
    const img = imageRef.current;
    
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }
    
    try {
      ctx.save();
      
      // Calculate image scaling to fit canvas while maintaining aspect ratio
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        // Image is wider than canvas
        drawWidth = canvas.width * 0.95; // Leave minimal margin
        drawHeight = drawWidth / imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // Image is taller than canvas
        drawHeight = canvas.height * 0.95; // Leave minimal margin
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      // Simple rotation: just rotate the canvas context without changing coordinate system
      if (imageRotation !== 0) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(imageRotation);
        ctx.translate(-centerX, -centerY);
      }
      
      // Draw the image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // Store image draw information for coordinate transformations
      imageDrawInfoRef.current = {
        offsetX,
        offsetY,
        drawWidth,
        drawHeight,
        rotation: imageRotation
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
  const getResizeHandles = useCallback((region: { x: number; y: number; width: number; height: number }, rotation: number = 0): ResizeHandleInfo[] => {
    const { x, y, width, height } = region;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Base handle positions (relative to region)
    const baseHandles: ResizeHandleInfo[] = [
      { type: 'top-left', x, y },
      { type: 'top-center', x: x + width / 2, y },
      { type: 'top-right', x: x + width, y },
      { type: 'middle-left', x, y: y + height / 2 },
      { type: 'middle-right', x: x + width, y: y + height / 2 },
      { type: 'bottom-left', x, y: y + height },
      { type: 'bottom-center', x: x + width / 2, y: y + height },
      { type: 'bottom-right', x: x + width, y: y + height },
    ];
    
    // Apply rotation to each handle position
    if (rotation !== 0) {
      return baseHandles.map(handle => {
        const dx = handle.x - centerX;
        const dy = handle.y - centerY;
        const rotatedX = centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation);
        const rotatedY = centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation);
        return {
          type: handle.type,
          x: rotatedX,
          y: rotatedY
        };
      });
    }
    
    return baseHandles;
  }, []);
  const getHandleAtPoint = useCallback((
    point: { x: number; y: number },
    region: { x: number; y: number; width: number; height: number },
    rotation: number = 0,
    zoom: number = 1
  ): ResizeHandleInfo | null => {
    const handles = getResizeHandles(region, rotation);
    const tolerance = (CANVAS_CONSTANTS.HANDLE_SIZE / 2) / zoom;
    
    for (const handle of handles) {
      const distance = Math.sqrt(
        Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2)
      );
      if (distance <= tolerance) {
        return handle;
      }
    }
    return null;
  }, [getResizeHandles]);
  const calculateResize = useCallback((
    originalRegion: { x: number; y: number; width: number; height: number },
    handleType: ResizeHandle,
    deltaX: number,
    deltaY: number,
    minWidth: number = CANVAS_CONSTANTS.MIN_REGION_SIZE,
    minHeight: number = CANVAS_CONSTANTS.MIN_REGION_SIZE,
    rotation: number = 0
  ) => {
    const { x, y, width, height } = originalRegion;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // Transform drag delta into region's local (unrotated) coordinate space
    const ldx = deltaX * Math.cos(-rotation) - deltaY * Math.sin(-rotation);
    const ldy = deltaX * Math.sin(-rotation) + deltaY * Math.cos(-rotation);

    // Compute new size in local space
    let newW = width;
    let newH = height;
    switch (handleType) {
      case 'top-left':     newW = width - ldx; newH = height - ldy; break;
      case 'top-center':                        newH = height - ldy; break;
      case 'top-right':    newW = width + ldx; newH = height - ldy; break;
      case 'middle-left':  newW = width - ldx;                       break;
      case 'middle-right': newW = width + ldx;                       break;
      case 'bottom-left':  newW = width - ldx; newH = height + ldy; break;
      case 'bottom-center':                     newH = height + ldy; break;
      case 'bottom-right': newW = width + ldx; newH = height + ldy; break;
    }
    newW = Math.max(minWidth, newW);
    newH = Math.max(minHeight, newH);

    // Fixed local point (opposite corner/edge) and its new position after resize.
    // The screen position of this point must remain constant.
    type LP = { x: number; y: number };
    let localFixed: LP;
    let newLocalFixed: LP;
    switch (handleType) {
      case 'top-left':      localFixed = { x:  width/2, y:  height/2 }; newLocalFixed = { x:  newW/2, y:  newH/2 }; break;
      case 'top-center':    localFixed = { x:  0,       y:  height/2 }; newLocalFixed = { x:  0,      y:  newH/2 }; break;
      case 'top-right':     localFixed = { x: -width/2, y:  height/2 }; newLocalFixed = { x: -newW/2, y:  newH/2 }; break;
      case 'middle-left':   localFixed = { x:  width/2, y:  0        }; newLocalFixed = { x:  newW/2, y:  0      }; break;
      case 'middle-right':  localFixed = { x: -width/2, y:  0        }; newLocalFixed = { x: -newW/2, y:  0      }; break;
      case 'bottom-left':   localFixed = { x:  width/2, y: -height/2 }; newLocalFixed = { x:  newW/2, y: -newH/2 }; break;
      case 'bottom-center': localFixed = { x:  0,       y: -height/2 }; newLocalFixed = { x:  0,      y: -newH/2 }; break;
      case 'bottom-right':  localFixed = { x: -width/2, y: -height/2 }; newLocalFixed = { x: -newW/2, y: -newH/2 }; break;
      default:              localFixed = { x: 0, y: 0 }; newLocalFixed = { x: 0, y: 0 };
    }

    // Screen position of the fixed point (invariant)
    const screenFixedX = cx + localFixed.x * cosR - localFixed.y * sinR;
    const screenFixedY = cy + localFixed.x * sinR + localFixed.y * cosR;

    // New center: place new fixed local point at the same screen position
    const newCX = screenFixedX - (newLocalFixed.x * cosR - newLocalFixed.y * sinR);
    const newCY = screenFixedY - (newLocalFixed.x * sinR + newLocalFixed.y * cosR);

    return { x: newCX - newW / 2, y: newCY - newH / 2, width: newW, height: newH };
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
  }, [drawHandle, getResizeHandles]);

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
  }, [getResizeHandles, drawHandle]);

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

    // Use parent cell size as unit; fall back to child size if no parent
    const parentBasis = parentRegion
      ? (unitBasis === 'height' ? parentRegion.height : parentRegion.width)
      : (unitBasis === 'height' ? childRegion.bounds.height : childRegion.bounds.width);
    const cellSize = parentBasis / 16;
    if (cellSize <= 0) return;

    const { x, y, width, height } = childRegion.bounds;

    ctx.save();

    // Apply rotation if needed
    if (childRegion.rotation !== 0) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(childRegion.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // For circles, clip grid lines to the ellipse boundary
    if (childRegion.shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
      ctx.clip();
    }

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 209, g: 213, b: 219 };
    };

    const rgb = hexToRgb(gridColor);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;

    const cx = x + width / 2;
    const cy = y + height / 2;
    const lw = (k: number) => (k % 8 === 0 ? 1.5 : k % 4 === 0 ? 1.0 : 0.5) / zoom;

    // Vertical lines from center outward
    for (let k = 0; cx + k * cellSize <= x + width + 0.5; k++) {
      const lx = cx + k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
    }
    for (let k = 1; cx - k * cellSize >= x - 0.5; k++) {
      const lx = cx - k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
    }

    // Horizontal lines from center outward
    for (let k = 0; cy + k * cellSize <= y + height + 0.5; k++) {
      const ly = cy + k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
    }
    for (let k = 1; cy - k * cellSize >= y - 0.5; k++) {
      const ly = cy - k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
    }

    ctx.restore();
  }, []);

  const drawGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    parentRegion: ParentRegion,
    gridColor: string,
    gridOpacity: number,
    zoom: number,
    unitBasis: 'height' | 'width' = 'height'
  ) => {
    const basisLength = unitBasis === 'height' ? parentRegion.height : parentRegion.width;
    const cellSize = basisLength / 16;
    if (cellSize <= 0) return;

    const { x, y, width, height } = parentRegion;

    ctx.save();

    // Apply rotation if needed
    if (parentRegion.rotation !== 0) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(parentRegion.rotation);
      ctx.translate(-centerX, -centerY);
    }

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 209, g: 213, b: 219 };
    };

    const rgb = hexToRgb(gridColor);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;

    const cx = x + width / 2;
    const cy = y + height / 2;
    const lw = (k: number) => (k % 8 === 0 ? 1.5 : k % 4 === 0 ? 1.0 : 0.5) / zoom;

    // Vertical lines from center outward
    for (let k = 0; cx + k * cellSize <= x + width + 0.5; k++) {
      const lx = cx + k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
    }
    for (let k = 1; cx - k * cellSize >= x - 0.5; k++) {
      const lx = cx - k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
    }

    // Horizontal lines from center outward
    for (let k = 0; cy + k * cellSize <= y + height + 0.5; k++) {
      const ly = cy + k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
    }
    for (let k = 1; cy - k * cellSize >= y - 0.5; k++) {
      const ly = cy - k * cellSize;
      ctx.lineWidth = lw(k);
      ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
    }

    ctx.restore();
  }, []);

  const drawLineModules = useCallback((
    ctx: CanvasRenderingContext2D,
    region: ChildRegion,
    color: string,
    opacity: number,
    zoom: number,
    unitBasis: 'height' | 'width',
    parentRegion: ParentRegion | null
  ) => {
    if (region.shape !== 'line' || !region.lineStart || !region.lineEnd) return;
    if (!parentRegion) return;

    const lineLength = region.lineLength ?? 0;
    if (lineLength <= 0) return;

    const parentBasis = unitBasis === 'height' ? parentRegion.height : parentRegion.width;
    const modules = calculateLineModules(lineLength, parentBasis);
    if (modules.length === 0) return;

    const dx = region.lineEnd.x - region.lineStart.x;
    const dy = region.lineEnd.y - region.lineStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const ux = dx / len;
    const uy = dy / len;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1 / zoom;

    let currentPos = 0;
    for (const entry of modules) {
      const diameter = entry.radius * 2;
      for (let i = 0; i < entry.count; i++) {
        const t = currentPos + entry.radius;
        const cx = region.lineStart!.x + ux * t;
        const cy = region.lineStart!.y + uy * t;
        ctx.beginPath();
        ctx.arc(cx, cy, entry.radius, 0, 2 * Math.PI);
        ctx.stroke();
        currentPos += diameter;
      }
    }

    ctx.restore();
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

    const { x, y, width, height } = region.bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const diameter = width;
    if (diameter <= 0) return;

    const parentBasis = unitBasis === 'height' ? parentRegion.height : parentRegion.width;
    const modules = calculateLineModules(diameter, parentBasis);
    if (modules.length === 0) return;

    ctx.save();
    if (region.rotation !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(region.rotation);
      ctx.translate(-cx, -cy);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, 2 * Math.PI);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1 / zoom;

    let currentPos = 0;
    for (const entry of modules) {
      const d = entry.radius * 2;
      for (let i = 0; i < entry.count; i++) {
        const t = currentPos + entry.radius;
        const mcx = (x) + t;
        ctx.beginPath();
        ctx.arc(mcx, cy, entry.radius, 0, 2 * Math.PI);
        ctx.stroke();
        currentPos += d;
      }
    }

    ctx.restore();
  }, []);

  const drawPoints = useCallback((
    ctx: CanvasRenderingContext2D,
    points: RegionPoint[],
    colorSettings: ColorSettings,
    childRegions: ChildRegion[],
    selectedPointId: number | null = null,
    zoom: number = 1
  ) => {
    points.forEach(point => {
      ctx.save();

      const isSelected = selectedPointId === point.id;
      const { x, y } = point.coordinates.pixel;

      let color: string;
      if (isSelected) {
        color = '#3b82f6';
      } else if (point.parentRegionId === undefined) {
        color = hexToRgba(colorSettings.dotColor ?? '#ffffff', colorSettings.dotColorOpacity ?? 1);
      } else {
        const region = childRegions.find(r => r.id === point.parentRegionId);
        if (region?.shape === 'circle') {
          color = hexToRgba(colorSettings.childCircleColor, colorSettings.childCircleColorOpacity ?? 1);
        } else if (region?.shape === 'line') {
          color = hexToRgba(colorSettings.childLineColor, colorSettings.childLineColorOpacity ?? 1);
        } else {
          color = hexToRgba(colorSettings.childRectColor, colorSettings.childRectColorOpacity ?? 1);
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = (isSelected ? 2.5 : 1) / zoom;

      const arm = 6 / zoom;

      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
      ctx.stroke();

      ctx.restore();
    });
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
    imageRotation: number = 0,
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
    drawImage(ctx, canvas, imageRotation);
    
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
      if (isLine && childGridSettings?.lineModuleVisible && colorSettings) {
        drawLineModules(ctx, region, colorSettings.lineModuleColor, colorSettings.lineModuleOpacity, zoom, unitBasis, parentRegion);
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

    // Draw points on top of everything
    if (points.length > 0 && colorSettings) {
      drawPoints(ctx, points, colorSettings, childRegions, selectedPointId, zoom);
    }

    // Restore context state
    ctx.restore();
  }, [drawImage, drawGrid, drawParentRegion, drawChildRegion, drawChildGrid, drawLineModules, drawCircleModules, drawPoints]);

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
    drawImage,
    drawParentRegion,
    drawChildRegion,
    drawChildGrid,
    drawLineModules,
    drawCircleModules,
    drawTemporaryRegion,
    drawTemporaryCircle,
    drawTemporaryLine,
    drawPoints,
    redraw,
    setImage,
    getResizeHandles,
    getHandleAtPoint,
    calculateResize,
    getImageDrawInfo,
  }), [
    drawImage,
    drawParentRegion,
    drawChildRegion,
    drawChildGrid,
    drawLineModules,
    drawCircleModules,
    drawTemporaryRegion,
    drawTemporaryCircle,
    drawTemporaryLine,
    drawPoints,
    redraw,
    setImage,
    getResizeHandles,
    getHandleAtPoint,
    calculateResize,
    getImageDrawInfo,
  ]);
}