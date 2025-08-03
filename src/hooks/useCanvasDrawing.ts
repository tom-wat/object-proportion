import { useCallback, useRef } from 'react';
import type { ParentRegion, ChildRegion, ColorSettings } from '../types';
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
    const handles = [
      { x: region.x, y: region.y },
      { x: region.x + region.width, y: region.y },
      { x: region.x + region.width, y: region.y + region.height },
      { x: region.x, y: region.y + region.height },
    ];
    
    handles.forEach(handle => {
      drawHandle(ctx, handle.x, handle.y);
    });

    const rotationHandleY = region.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE;
    ctx.beginPath();
    ctx.arc(region.x + region.width/2, rotationHandleY, CANVAS_CONSTANTS.ROTATION_HANDLE_SIZE, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(region.x + region.width/2, region.y);
    ctx.lineTo(region.x + region.width/2, rotationHandleY);
    ctx.stroke();


    ctx.restore();
  }, [drawHandle]);

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

    ctx.fillStyle = isSelected ? COLORS.SELECTED : childColor;
    ctx.font = `${CANVAS_CONSTANTS.FONT_SIZE}px ${CANVAS_CONSTANTS.FONT_FAMILY}`;
    ctx.fillText(region.id.toString(), region.bounds.x - 5, region.bounds.y - 5);

  }, []);

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
  };
}