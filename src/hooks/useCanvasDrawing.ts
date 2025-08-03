import { useCallback, useRef } from 'react';
import type { ParentRegion, ChildRegion, ColorSettings, ResizeHandle, ResizeHandleInfo } from '../types';
import { CANVAS_CONSTANTS, COLORS } from '../utils/constants';

export function useCanvasDrawing() {
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const img = imageRef.current;
    
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }
    
    try {
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
      
      // Center the image in the canvas
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      console.error('Error drawing image:', error);
    }
  }, []);

  const drawHandle = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    size: number = CANVAS_CONSTANTS.HANDLE_SIZE
  ) => {
    ctx.fillRect(x - size/2, y - size/2, size, size);
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
    zoom: number = 1,
    rotation: number = 0
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
    let { x, y, width, height } = originalRegion;
    
    // Transform delta for rotation
    let transformedDeltaX = deltaX;
    let transformedDeltaY = deltaY;
    
    if (rotation !== 0) {
      // Inverse rotation to get delta in region's local coordinate system
      transformedDeltaX = deltaX * Math.cos(-rotation) - deltaY * Math.sin(-rotation);
      transformedDeltaY = deltaX * Math.sin(-rotation) + deltaY * Math.cos(-rotation);
    }

    switch (handleType) {
      case 'top-left': {
        const newWidthTL = width - transformedDeltaX;
        const newHeightTL = height - transformedDeltaY;
        if (newWidthTL >= minWidth && newHeightTL >= minHeight) {
          x += transformedDeltaX;
          y += transformedDeltaY;
          width = newWidthTL;
          height = newHeightTL;
        }
        break;
      }

      case 'top-center': {
        const newHeightTC = height - transformedDeltaY;
        if (newHeightTC >= minHeight) {
          y += transformedDeltaY;
          height = newHeightTC;
        }
        break;
      }

      case 'top-right': {
        const newWidthTR = width + transformedDeltaX;
        const newHeightTR = height - transformedDeltaY;
        if (newWidthTR >= minWidth && newHeightTR >= minHeight) {
          y += transformedDeltaY;
          width = newWidthTR;
          height = newHeightTR;
        }
        break;
      }

      case 'middle-left': {
        const newWidthML = width - transformedDeltaX;
        if (newWidthML >= minWidth) {
          x += transformedDeltaX;
          width = newWidthML;
        }
        break;
      }

      case 'middle-right': {
        const newWidthMR = width + transformedDeltaX;
        if (newWidthMR >= minWidth) {
          width = newWidthMR;
        }
        break;
      }

      case 'bottom-left': {
        const newWidthBL = width - transformedDeltaX;
        const newHeightBL = height + transformedDeltaY;
        if (newWidthBL >= minWidth && newHeightBL >= minHeight) {
          x += transformedDeltaX;
          width = newWidthBL;
          height = newHeightBL;
        }
        break;
      }

      case 'bottom-center': {
        const newHeightBC = height + transformedDeltaY;
        if (newHeightBC >= minHeight) {
          height = newHeightBC;
        }
        break;
      }

      case 'bottom-right': {
        const newWidthBR = width + transformedDeltaX;
        const newHeightBR = height + transformedDeltaY;
        if (newWidthBR >= minWidth && newHeightBR >= minHeight) {
          width = newWidthBR;
          height = newHeightBR;
        }
        break;
      }
    }

    return { x, y, width, height };
  }, []);

  const drawParentRegion = useCallback((ctx: CanvasRenderingContext2D, region: ParentRegion, colorSettings?: ColorSettings) => {
    const parentColor = colorSettings?.parentColor || COLORS.PRIMARY;
    ctx.save();
    
    if (region.rotation !== 0) {
      const centerX = region.x + region.width / 2;
      const centerY = region.y + region.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(region.rotation);
      ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = parentColor;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH;
    ctx.strokeRect(region.x, region.y, region.width, region.height);

    ctx.fillStyle = parentColor;
    
    // Draw resize handles (using non-rotated coordinates since they are already calculated with rotation)
    const resizeHandles = getResizeHandles(region, 0); // Use 0 rotation since we're already in rotated context
    resizeHandles.forEach(handle => {
      drawHandle(ctx, handle.x, handle.y);
    });

    // Draw rotation handle and line in the same coordinate system
    const rotationHandleY = region.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE;
    ctx.beginPath();
    ctx.arc(region.x + region.width/2, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(region.x + region.width/2, region.y);
    ctx.lineTo(region.x + region.width/2, rotationHandleY);
    ctx.stroke();

    ctx.restore();
  }, [drawHandle, getResizeHandles]);

  const drawChildRegion = useCallback((ctx: CanvasRenderingContext2D, region: ChildRegion, _index: number, isSelected: boolean = false, colorSettings?: ColorSettings) => {
    const childColor = colorSettings?.childColor || COLORS.PRIMARY;
    ctx.strokeStyle = isSelected ? COLORS.SELECTED : childColor;
    ctx.lineWidth = isSelected ? CANVAS_CONSTANTS.LINE_WIDTH + 1 : CANVAS_CONSTANTS.LINE_WIDTH;
    ctx.strokeRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);

    // Add selection highlight
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED + '20'; // Add transparency
      ctx.fillRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
    }

    // Draw resize handles for selected child
    if (isSelected) {
      ctx.fillStyle = isSelected ? COLORS.SELECTED : childColor;
      const resizeHandles = getResizeHandles(region.bounds);
      resizeHandles.forEach(handle => {
        drawHandle(ctx, handle.x, handle.y);
      });
    }

    ctx.fillStyle = isSelected ? COLORS.SELECTED : childColor;
    ctx.font = `${CANVAS_CONSTANTS.FONT_SIZE}px ${CANVAS_CONSTANTS.FONT_FAMILY}`;
    ctx.fillText(region.id.toString(), region.bounds.x - 5, region.bounds.y - 5);

  }, [getResizeHandles, drawHandle]);

  const drawTemporaryRegion = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _isParent?: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => {
    ctx.strokeStyle = COLORS.PRIMARY;
    ctx.lineWidth = CANVAS_CONSTANTS.LINE_WIDTH;
    ctx.setLineDash(CANVAS_CONSTANTS.DASH_PATTERN);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }, []);

  const drawGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    parentRegion: ParentRegion,
    gridSettings: { type: string; customSize?: number },
    gridColor: string,
    gridOpacity: number,
    zoom: number
  ) => {
    const gridSize = gridSettings.type === 'custom' 
      ? (gridSettings.customSize || 16) 
      : parseInt(gridSettings.type.split('x')[0]);

    const cellWidth = parentRegion.width / gridSize;
    const cellHeight = parentRegion.height / gridSize;

    ctx.save();
    
    // Apply rotation if needed
    if (parentRegion.rotation !== 0) {
      const centerX = parentRegion.x + parentRegion.width / 2;
      const centerY = parentRegion.y + parentRegion.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(parentRegion.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // Set grid style
    // Convert hex color to rgba with opacity
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 209, g: 213, b: 219 }; // fallback to default gray
    };
    
    const rgb = hexToRgb(gridColor);
    const gridColorWithOpacity = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;
    
    ctx.strokeStyle = gridColorWithOpacity;
    ctx.lineWidth = 0.5 / zoom; // Adjust line width for zoom

    // Draw vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = parentRegion.x + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, parentRegion.y);
      ctx.lineTo(x, parentRegion.y + parentRegion.height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = parentRegion.y + i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(parentRegion.x, y);
      ctx.lineTo(parentRegion.x + parentRegion.width, y);
      ctx.stroke();
    }

    // Draw center axes
    ctx.strokeStyle = gridColorWithOpacity;
    ctx.lineWidth = 1.5 / zoom;
    
    const centerX = parentRegion.x + parentRegion.width / 2;
    const centerY = parentRegion.y + parentRegion.height / 2;
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(centerX, parentRegion.y);
    ctx.lineTo(centerX, parentRegion.y + parentRegion.height);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(parentRegion.x, centerY);
    ctx.lineTo(parentRegion.x + parentRegion.width, centerY);
    ctx.stroke();

    ctx.restore();
  }, []);

  const redraw = useCallback((
    canvas: HTMLCanvasElement,
    parentRegion: ParentRegion | null,
    childRegions: ChildRegion[],
    zoom: number = 1,
    pan: { x: number; y: number } = { x: 0, y: 0 },
    selectedChildId: number | null = null,
    colorSettings?: ColorSettings,
    gridSettings?: { visible: boolean; type: string; customSize?: number }
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
      drawGrid(ctx, parentRegion, gridSettings, colorSettings.gridColor, colorSettings.gridOpacity || 0.7, zoom);
    }
    
    // Draw parent region third
    if (parentRegion) {
      drawParentRegion(ctx, parentRegion, colorSettings);
    }

    // Draw child regions last
    childRegions.forEach((region, index) => {
      const isSelected = selectedChildId === region.id;
      drawChildRegion(ctx, region, index, isSelected, colorSettings);
    });

    // Restore context state
    ctx.restore();
  }, [drawImage, drawGrid, drawParentRegion, drawChildRegion]);

  const setImage = useCallback((image: HTMLImageElement) => {
    imageRef.current = image;
  }, []);

  return {
    drawImage,
    drawParentRegion,
    drawChildRegion,
    drawTemporaryRegion,
    redraw,
    setImage,
    getResizeHandles,
    getHandleAtPoint,
    calculateResize,
  };
}