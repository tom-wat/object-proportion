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
      y: Math.round((rotated.y / (parent.height / gridSize)) * 10) / 10
    };
  }
  
  return {
    x: Math.round((relativeX / (parent.width / gridSize)) * 10) / 10,
    y: Math.round((relativeY / (parent.height / gridSize)) * 10) / 10
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