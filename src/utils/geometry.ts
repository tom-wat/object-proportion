import type { Point, Bounds, ParentRegion } from '../types';

export function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq));
  return Math.sqrt((point.x - (start.x + t * dx)) ** 2 + (point.y - (start.y + t * dy)) ** 2);
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

// Transform a canvas-space point into a region's local (unrotated) space.
export function toRegionLocalPoint(point: Point, bounds: Bounds, rotation: number): Point {
  if (rotation === 0) return point;
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  return rotatePoint(point, center, -rotation);
}

export function calculateAspectRatio(width: number, height: number): { ratio: string; decimal: number } {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width) / divisor;
  const h = Math.round(height) / divisor;
  
  return {
    ratio: `${w}:${h}`,
    decimal: width / height
  };
}

export function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return point.x >= bounds.x && 
         point.x <= bounds.x + bounds.width &&
         point.y >= bounds.y && 
         point.y <= bounds.y + bounds.height;
}

export function isPointInRotatedBounds(point: Point, parent: ParentRegion): boolean {
  if (parent.rotation === 0) {
    return isPointInBounds(point, parent);
  }
  
  const center = {
    x: parent.x + parent.width / 2,
    y: parent.y + parent.height / 2
  };
  
  const rotatedPoint = rotatePoint(point, center, -parent.rotation);
  return isPointInBounds(rotatedPoint, parent);
}

export function convertToGridCoordinates(
  point: Point,
  parent: ParentRegion,
  gridSize: number,
  cellSizeOverride?: number  // when provided, use as uniform cell size for both axes
): Point {
  const center = {
    x: parent.x + parent.width / 2,
    y: parent.y + parent.height / 2
  };

  const relativeX = point.x - center.x;
  const relativeY = point.y - center.y;

  const cellW = cellSizeOverride ?? (parent.width / gridSize);
  const cellH = cellSizeOverride ?? (parent.height / gridSize);

  if (parent.rotation !== 0) {
    const rotated = rotatePoint({ x: relativeX, y: relativeY }, { x: 0, y: 0 }, -parent.rotation);
    return {
      x: Math.round((rotated.x / cellW) * 10) / 10,
      y: Math.round((-rotated.y / cellH) * 10) / 10  // Negate Y to make upward positive
    };
  }

  return {
    x: Math.round((relativeX / cellW) * 10) / 10,
    y: Math.round((-relativeY / cellH) * 10) / 10  // Negate Y to make upward positive
  };
}

export function calculateChildRatios(child: Bounds, parent: ParentRegion) {
  const childArea = child.width * child.height;
  const parentArea = parent.width * parent.height;
  
  return {
    areaRatio: childArea / parentArea,
    widthRatio: child.width / parent.width,
    heightRatio: child.height / parent.height
  };
}


export function calculateEdgePositions(
  child: Bounds, 
  parent: ParentRegion, 
  gridSize: number = 16,
  childRotation: number = 0
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  // Calculate the four corners of the child region
  let corners = [
    { x: child.x, y: child.y },                           // top-left
    { x: child.x + child.width, y: child.y },             // top-right
    { x: child.x + child.width, y: child.y + child.height }, // bottom-right
    { x: child.x, y: child.y + child.height }             // bottom-left
  ];
  
  // If child region is rotated, apply rotation to corners
  if (childRotation !== 0) {
    const childCenter = {
      x: child.x + child.width / 2,
      y: child.y + child.height / 2
    };
    
    corners = corners.map(corner => 
      rotatePoint(corner, childCenter, childRotation)
    );
  }
  
  // Convert all corners to grid coordinates
  const gridCorners = corners.map(corner => 
    convertToGridCoordinates(corner, parent, gridSize)
  );
  
  // Find the extreme values for each edge
  const xValues = gridCorners.map(corner => corner.x);
  const yValues = gridCorners.map(corner => corner.y);
  
  return {
    left: Math.min(...xValues),    // leftmost x coordinate
    right: Math.max(...xValues),   // rightmost x coordinate
    top: Math.max(...yValues),     // topmost y coordinate (remember y is inverted)
    bottom: Math.min(...yValues)   // bottommost y coordinate
  };
}

export interface LineModuleEntry {
  level: number;
  fraction: string;
  count: number;
  radius: number;
}

const MODULE_FRACTIONS = ['1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128', '1/256'];

// Level of the fixed-size module used for drawing (1/16 of the parent basis).
const UNIFORM_MODULE_LEVEL = 4; // 1/16

/**
 * Tiles a fixed-size 1/16 module along the length and nests four 1/64 modules
 * (each 1/4 the diameter) inside every 1/16 module. Every module of a given
 * level is the same size; the final 1/16 may overflow the end and get cut off,
 * so the length need not be an exact multiple of the module size. Each returned
 * entry is tiled independently from the start, so the 1/64 row lines up four-per
 * -1/16.
 */
export function calculateUniformModules(length: number, parentBasis: number): LineModuleEntry[] {
  const radius = parentBasis / Math.pow(2, UNIFORM_MODULE_LEVEL + 1);
  const diameter = radius * 2;
  if (diameter < 0.5 || length <= 0) return [];
  const count = Math.ceil(length / diameter);
  const innerLevel = UNIFORM_MODULE_LEVEL + 2; // 1/64
  return [
    { level: UNIFORM_MODULE_LEVEL, fraction: MODULE_FRACTIONS[UNIFORM_MODULE_LEVEL], count, radius },
    { level: innerLevel, fraction: MODULE_FRACTIONS[innerLevel], count: count * 4, radius: radius / 4 },
  ];
}

/**
 * Computes the axis-aligned square used as a line's angle guide. The side equals
 * the larger of the line's horizontal/vertical extents, and the line start sits
 * at the corner from which the square extends toward the line direction.
 * Returns the top-left corner and side, or null for a zero-length line.
 */
export function getLineAngleSquare(lineStart: Point, lineEnd: Point): { x: number; y: number; side: number } | null {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  if (side <= 0) return null;
  const xSign = dx >= 0 ? 1 : -1;
  const ySign = dy >= 0 ? 1 : -1;
  return {
    x: Math.min(lineStart.x, lineStart.x + xSign * side),
    y: Math.min(lineStart.y, lineStart.y + ySign * side),
    side,
  };
}

/**
 * Like calculateUniformModules but the base module length is given directly (in
 * px), decoupled from the parent basis. Used for line modules whose base length
 * is user-configurable. The given length is one module (the 1/16-equivalent),
 * and four nested 1/64 modules are placed inside it.
 */
export function calculateLineModuleColumns(lineLength: number, moduleLength: number): LineModuleEntry[] {
  if (moduleLength < 0.5 || lineLength <= 0) return [];
  const radius = moduleLength / 2;
  const count = Math.ceil(lineLength / moduleLength);
  const innerLevel = UNIFORM_MODULE_LEVEL + 2; // 1/64
  return [
    { level: UNIFORM_MODULE_LEVEL, fraction: MODULE_FRACTIONS[UNIFORM_MODULE_LEVEL], count, radius },
    { level: innerLevel, fraction: MODULE_FRACTIONS[innerLevel], count: count * 4, radius: radius / 4 },
  ];
}

export function calculateGridDimensions(child: Bounds, parent: ParentRegion, gridSize: number = 16): {
  gridWidth: number;
  gridHeight: number;
} {
  // Calculate how many grid units the child spans in each direction
  const gridUnitWidth = parent.width / gridSize;
  const gridUnitHeight = parent.height / gridSize;
  
  return {
    gridWidth: Math.round((child.width / gridUnitWidth) * 10) / 10,
    gridHeight: Math.round((child.height / gridUnitHeight) * 10) / 10
  };
}

