import type { Point, Bounds, ResizeHandle, ResizeHandleInfo } from '../types';
import { CANVAS_CONSTANTS } from './constants';

export function getResizeHandles(region: Bounds, rotation: number = 0): ResizeHandleInfo[] {
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
}

export function getHandleAtPoint(
  point: Point,
  region: Bounds,
  rotation: number = 0,
  zoom: number = 1,
  extraTolerance: number = 0
): ResizeHandleInfo | null {
  const handles = getResizeHandles(region, rotation);
  const tolerance = (CANVAS_CONSTANTS.HANDLE_SIZE / 2 + extraTolerance) / zoom;

  for (const handle of handles) {
    const distance = Math.sqrt(
      Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2)
    );
    if (distance <= tolerance) {
      return handle;
    }
  }
  return null;
}

export function calculateResize(
  originalRegion: Bounds,
  handleType: ResizeHandle,
  deltaX: number,
  deltaY: number,
  minWidth: number = CANVAS_CONSTANTS.MIN_REGION_SIZE,
  minHeight: number = CANVAS_CONSTANTS.MIN_REGION_SIZE,
  rotation: number = 0
): Bounds {
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
}
