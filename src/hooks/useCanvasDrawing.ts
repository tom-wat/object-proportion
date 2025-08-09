import { useCallback, useRef } from 'react';
import type { ParentRegion, ChildRegion, ColorSettings, ResizeHandle, ResizeHandleInfo, RegionPoint } from '../types';
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

  const drawParentRegion = useCallback((ctx: CanvasRenderingContext2D, region: ParentRegion, colorSettings?: ColorSettings, isSelected: boolean = false, zoom: number = 1) => {
    const parentColor = colorSettings?.parentColor || COLORS.PRIMARY;
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
      ctx.fillStyle = COLORS.SELECTED + '20'; // Add transparency
      ctx.fillRect(region.x, region.y, region.width, region.height);
    }

    // Only draw handles when selected
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED;
      
      // Draw resize handles (using non-rotated coordinates since they are already calculated with rotation)
      const resizeHandles = getResizeHandles(region, 0); // Use 0 rotation since we're already in rotated context
      resizeHandles.forEach(handle => {
        drawHandle(ctx, handle.x, handle.y, CANVAS_CONSTANTS.HANDLE_SIZE, zoom);
      });

      // Draw rotation handle and line in the same coordinate system
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
    const childColor = colorSettings?.childColor || COLORS.CHILD;
    ctx.save();
    
    // Apply rotation if needed
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

    // Add selection highlight
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED + '20'; // Add transparency
      ctx.fillRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
    }

    // Draw resize handles for selected child (using non-rotated coordinates since they are already calculated with rotation)
    if (isSelected) {
      ctx.fillStyle = COLORS.SELECTED;
      const resizeHandles = getResizeHandles(region.bounds, 0); // Use 0 rotation since we're already in rotated context
      resizeHandles.forEach(handle => {
        drawHandle(ctx, handle.x, handle.y, CANVAS_CONSTANTS.HANDLE_SIZE, zoom);
      });

      // Draw rotation handle and line in the same coordinate system
      const rotationHandleY = region.bounds.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
      ctx.beginPath();
      ctx.arc(region.bounds.x + region.bounds.width/2, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE / zoom, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(region.bounds.x + region.bounds.width/2, region.bounds.y);
      ctx.lineTo(region.bounds.x + region.bounds.width/2, rotationHandleY);
      ctx.stroke();
    }

    ctx.fillStyle = isSelected ? COLORS.SELECTED : childColor;
    ctx.font = `${CANVAS_CONSTANTS.FONT_SIZE / zoom}px ${CANVAS_CONSTANTS.FONT_FAMILY}`;
    ctx.fillText(region.name, region.bounds.x, region.bounds.y - 5 / zoom);

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

  const drawChildGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    childRegion: ChildRegion,
    gridColor: string,
    gridOpacity: number,
    zoom: number
  ) => {
    // Fixed 16x16 grid for child regions
    const gridSize = 16;
    const cellWidth = childRegion.bounds.width / gridSize;
    const cellHeight = childRegion.bounds.height / gridSize;

    ctx.save();
    
    // Apply rotation if needed
    if (childRegion.rotation !== 0) {
      const centerX = childRegion.bounds.x + childRegion.bounds.width / 2;
      const centerY = childRegion.bounds.y + childRegion.bounds.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(childRegion.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // Set grid style
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
    ctx.lineWidth = 0.5 / zoom;

    // Draw vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = childRegion.bounds.x + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, childRegion.bounds.y);
      ctx.lineTo(x, childRegion.bounds.y + childRegion.bounds.height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = childRegion.bounds.y + i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(childRegion.bounds.x, y);
      ctx.lineTo(childRegion.bounds.x + childRegion.bounds.width, y);
      ctx.stroke();
    }

    // Draw center axes
    ctx.lineWidth = 1.0 / zoom;
    
    const centerX = childRegion.bounds.x + childRegion.bounds.width / 2;
    const centerY = childRegion.bounds.y + childRegion.bounds.height / 2;
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(centerX, childRegion.bounds.y);
    ctx.lineTo(centerX, childRegion.bounds.y + childRegion.bounds.height);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(childRegion.bounds.x, centerY);
    ctx.lineTo(childRegion.bounds.x + childRegion.bounds.width, centerY);
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    parentRegion: ParentRegion,
    gridColor: string,
    gridOpacity: number,
    zoom: number
  ) => {
    const gridSize = 16; // Fixed 16x16 grid

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

  const drawPoints = useCallback((
    ctx: CanvasRenderingContext2D, 
    points: RegionPoint[], 
    colorSettings: ColorSettings,
    selectedPointId: number | null = null,
    zoom: number = 1
  ) => {
    points.forEach(point => {
      ctx.save();
      
      const isSelected = selectedPointId === point.id;
      
      // Use selection color if selected, otherwise frame color based on region type
      if (isSelected) {
        ctx.fillStyle = '#ef4444'; // Red for selected
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2 / zoom; // Thicker border for selected
      } else {
        // Use child color for child region points, parent color for parent region points
        const pointColor = point.parentRegionId !== undefined ? colorSettings.childColor : colorSettings.parentColor;
        ctx.fillStyle = pointColor;
        ctx.strokeStyle = pointColor;
        ctx.lineWidth = 1 / zoom;
      }
      
      // Draw point as 6px diameter circle
      const radius = 3 / zoom; // Same size for both selected and deselected
      ctx.beginPath();
      ctx.arc(point.coordinates.pixel.x, point.coordinates.pixel.y, radius, 0, 2 * Math.PI);
      ctx.fill();
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
    gridSettings?: { visible: boolean },
    childGridSettings?: { visible: boolean },
    isParentSelected: boolean = false,
    points: RegionPoint[] = [],
    selectedPointId: number | null = null
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
      drawGrid(ctx, parentRegion, colorSettings.gridColor, colorSettings.gridOpacity || 0.7, zoom);
    }
    
    // Draw child grids first (behind child regions)
    if (childGridSettings?.visible && colorSettings?.childGridColor && colorSettings.childGridOpacity !== undefined) {
      childRegions.forEach((region) => {
        drawChildGrid(ctx, region, colorSettings.childGridColor, colorSettings.childGridOpacity, zoom);
      });
    }

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
      drawPoints(ctx, points, colorSettings, selectedPointId, zoom);
    }

    // Restore context state
    ctx.restore();
  }, [drawImage, drawGrid, drawParentRegion, drawChildRegion, drawChildGrid, drawPoints]);

  const setImage = useCallback((image: HTMLImageElement) => {
    imageRef.current = image;
  }, []);

  return {
    drawImage,
    drawParentRegion,
    drawChildRegion,
    drawChildGrid,
    drawTemporaryRegion,
    drawPoints,
    redraw,
    setImage,
    getResizeHandles,
    getHandleAtPoint,
    calculateResize,
  };
}