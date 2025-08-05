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

export function calculateOutsideDistance(child: Bounds, parent: ParentRegion) {
  const childCenter = {
    x: child.x + child.width / 2,
    y: child.y + child.height / 2
  };
  
  const parentCenter = {
    x: parent.x + parent.width / 2,
    y: parent.y + parent.height / 2
  };
  
  // Calculate shortest distance between child and parent boundaries
  const shortestDistance = calculateShortestBoundaryDistance(child, parent);
  
  // Calculate center-to-center distance for angle calculation
  const centerDistance = Math.sqrt(
    Math.pow(childCenter.x - parentCenter.x, 2) + 
    Math.pow(childCenter.y - parentCenter.y, 2)
  );
  
  const angle = Math.atan2(
    childCenter.y - parentCenter.y,
    childCenter.x - parentCenter.x
  ) * (180 / Math.PI);
  
  const directions = ['Right', 'Bottom-Right', 'Bottom', 'Bottom-Left', 'Left', 'Top-Left', 'Top', 'Top-Right'];
  const directionIndex = Math.round(((angle + 360) % 360) / 45) % 8;
  
  return {
    distance: Math.round(shortestDistance),
    centerDistance: Math.round(centerDistance),
    direction: directions[directionIndex],
    angle: Math.round(angle),
    shortestEdge: getClosestEdge(child, parent)
  };
}

function calculateShortestBoundaryDistance(child: Bounds, parent: ParentRegion): number {
  // Child boundaries
  const childLeft = child.x;
  const childRight = child.x + child.width;
  const childTop = child.y;
  const childBottom = child.y + child.height;
  
  // Parent boundaries  
  const parentLeft = parent.x;
  const parentRight = parent.x + parent.width;
  const parentTop = parent.y;
  const parentBottom = parent.y + parent.height;
  
  // Calculate distances to each edge
  const distances = [];
  
  // Distance to left edge of parent
  if (childLeft > parentRight) {
    distances.push(childLeft - parentRight);
  }
  
  // Distance to right edge of parent
  if (childRight < parentLeft) {
    distances.push(parentLeft - childRight);
  }
  
  // Distance to top edge of parent
  if (childTop > parentBottom) {
    distances.push(childTop - parentBottom);
  }
  
  // Distance to bottom edge of parent
  if (childBottom < parentTop) {
    distances.push(parentTop - childBottom);
  }
  
  // If child overlaps parent in one axis, calculate perpendicular distance
  if (distances.length === 0) {
    const horizontalOverlap = !(childRight < parentLeft || childLeft > parentRight);
    const verticalOverlap = !(childBottom < parentTop || childTop > parentBottom);
    
    if (horizontalOverlap) {
      // Calculate vertical distance
      distances.push(
        Math.min(
          Math.abs(childTop - parentBottom),
          Math.abs(childBottom - parentTop)
        )
      );
    }
    
    if (verticalOverlap) {
      // Calculate horizontal distance
      distances.push(
        Math.min(
          Math.abs(childLeft - parentRight),
          Math.abs(childRight - parentLeft)
        )
      );
    }
  }
  
  return distances.length > 0 ? Math.min(...distances) : 0;
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

function getClosestEdge(child: Bounds, parent: ParentRegion): string {
  const childCenter = {
    x: child.x + child.width / 2,
    y: child.y + child.height / 2
  };
  
  const parentEdges = {
    top: Math.abs(childCenter.y - parent.y),
    bottom: Math.abs(childCenter.y - (parent.y + parent.height)),
    left: Math.abs(childCenter.x - parent.x),
    right: Math.abs(childCenter.x - (parent.x + parent.width))
  };
  
  const minDistance = Math.min(...Object.values(parentEdges));
  const closestEdge = Object.entries(parentEdges).find(([, distance]) => distance === minDistance)?.[0] || 'unknown';
  
  return closestEdge;
}