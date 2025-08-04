import { useEffect, useRef } from 'react';
import type { ParentRegion, GridSettings } from '../types';

interface GridOverlayProps {
  parentRegion: ParentRegion | null;
  gridSettings: GridSettings;
  canvasSize: { width: number; height: number };
  zoom?: number;
  pan?: { x: number; y: number };
  className?: string;
  gridColor?: string;
}

export function GridOverlay({
  parentRegion,
  gridSettings,
  canvasSize,
  zoom = 1,
  pan = { x: 0, y: 0 },
  className = '',
  gridColor = '#ffffff'
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !parentRegion || !gridSettings.visible) {
      if (canvas) {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        ctx?.clearRect(0, 0, canvasSize.width, canvasSize.height);
      }
      return;
    }

    // Set canvas internal size to match the main canvas
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const gridSize = 16; // Fixed 16x16 grid

    const cellWidth = parentRegion.width / gridSize;
    const cellHeight = parentRegion.height / gridSize;

    ctx.save();
    
    // Apply zoom and pan transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Apply rotation if needed
    if (parentRegion.rotation !== 0) {
      const centerX = parentRegion.x + parentRegion.width / 2;
      const centerY = parentRegion.y + parentRegion.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(parentRegion.rotation);
      ctx.translate(-centerX, -centerY);
    }

    // Set grid style
    ctx.strokeStyle = gridColor;
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

    // Draw center axes (slightly more visible)
    const centerColor = gridColor.replace(/,\s*0\.\d+\)/, ', 0.5)'); // Increase opacity for center lines
    ctx.strokeStyle = centerColor;
    ctx.lineWidth = 1 / zoom;
    
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
  }, [parentRegion, gridSettings, canvasSize.width, canvasSize.height, zoom, pan, gridColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 pointer-events-none z-0 ${className}`}
      style={{
        width: canvasSize.width,
        height: canvasSize.height
      }}
    />
  );
}