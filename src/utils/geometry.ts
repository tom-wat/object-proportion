import type { Point, Bounds, ParentRegion } from '../types';

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
  gridSize: number
): Point {
  const center = {
    x: parent.x + parent.width / 2,
    y: parent.y + parent.height / 2
  };
  
  const relativeX = point.x - center.x;
  const relativeY = point.y - center.y;
  
  if (parent.rotation !== 0) {
    const rotated = rotatePoint({ x: relativeX, y: relativeY }, { x: 0, y: 0 }, -parent.rotation);
    return {
      x: Math.round((rotated.x / (parent.width / gridSize)) * 10) / 10,
      y: Math.round((-rotated.y / (parent.height / gridSize)) * 10) / 10  // Negate Y to make upward positive
    };
  }
  
  return {
    x: Math.round((relativeX / (parent.width / gridSize)) * 10) / 10,
    y: Math.round((-relativeY / (parent.height / gridSize)) * 10) / 10  // Negate Y to make upward positive
  };
}

/**
 * Snap a point to the nearest frame edge
 * @param gridPoint Current grid coordinates of the point
 * @returns New grid coordinates snapped to nearest edge
 */
export function snapToNearestEdge(gridPoint: Point): Point {
  const distances = {
    top: Math.abs(gridPoint.y - 8),      // Distance to top edge (y = 8)
    bottom: Math.abs(gridPoint.y - (-8)), // Distance to bottom edge (y = -8)
    left: Math.abs(gridPoint.x - (-8)),   // Distance to left edge (x = -8)
    right: Math.abs(gridPoint.x - 8)      // Distance to right edge (x = 8)
  };

  // Find the edge with minimum distance
  const minDistance = Math.min(...Object.values(distances));
  
  if (distances.top === minDistance) {
    return { x: gridPoint.x, y: 8 };      // Snap to top
  } else if (distances.bottom === minDistance) {
    return { x: gridPoint.x, y: -8 };     // Snap to bottom
  } else if (distances.left === minDistance) {
    return { x: -8, y: gridPoint.y };     // Snap to left
  } else {
    return { x: 8, y: gridPoint.y };      // Snap to right
  }
}

/**
 * Snap a point to the nearest frame corner
 * @param gridPoint Current grid coordinates of the point
 * @returns New grid coordinates snapped to nearest corner
 */
export function snapToNearestCorner(gridPoint: Point): Point {
  const corners = [
    { x: 8, y: 8 },    // Top-right
    { x: -8, y: 8 },   // Top-left
    { x: -8, y: -8 },  // Bottom-left
    { x: 8, y: -8 }    // Bottom-right
  ];

  // Find the corner with minimum distance
  let nearestCorner = corners[0];
  let minDistance = Math.sqrt(
    Math.pow(gridPoint.x - corners[0].x, 2) + 
    Math.pow(gridPoint.y - corners[0].y, 2)
  );

  for (let i = 1; i < corners.length; i++) {
    const distance = Math.sqrt(
      Math.pow(gridPoint.x - corners[i].x, 2) + 
      Math.pow(gridPoint.y - corners[i].y, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCorner = corners[i];
    }
  }

  return nearestCorner;
}

/**
 * Convert grid coordinates back to pixel coordinates
 * @param gridPoint Grid coordinates
 * @param parent Parent region
 * @param gridSize Grid size (default 16)
 * @returns Pixel coordinates
 */
export function convertToPixelCoordinates(
  gridPoint: Point,
  parent: ParentRegion,
  gridSize: number = 16
): Point {
  const center = {
    x: parent.x + parent.width / 2,
    y: parent.y + parent.height / 2
  };

  const relativeX = (gridPoint.x / gridSize) * parent.width;
  const relativeY = (-gridPoint.y / gridSize) * parent.height; // Negate Y to convert back

  if (parent.rotation !== 0) {
    const rotated = rotatePoint({ x: relativeX, y: relativeY }, { x: 0, y: 0 }, parent.rotation);
    return {
      x: center.x + rotated.x,
      y: center.y + rotated.y
    };
  }

  return {
    x: center.x + relativeX,
    y: center.y + relativeY
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


export function calculateEdgePositions(child: Bounds, parent: ParentRegion, gridSize: number = 16): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  // Child boundaries
  const childLeft = child.x;
  const childRight = child.x + child.width;
  const childTop = child.y;
  const childBottom = child.y + child.height;
  
  // Convert each edge to grid coordinates
  const leftGridPos = convertToGridCoordinates({x: childLeft, y: 0}, parent, gridSize);
  const rightGridPos = convertToGridCoordinates({x: childRight, y: 0}, parent, gridSize);
  const topGridPos = convertToGridCoordinates({x: 0, y: childTop}, parent, gridSize);
  const bottomGridPos = convertToGridCoordinates({x: 0, y: childBottom}, parent, gridSize);
  
  return {
    left: leftGridPos.x,
    right: rightGridPos.x,
    top: topGridPos.y,
    bottom: bottomGridPos.y
  };
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

