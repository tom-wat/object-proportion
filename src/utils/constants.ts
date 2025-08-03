export const CANVAS_CONSTANTS = {
  HANDLE_SIZE: 8,
  ROTATION_HANDLE_SIZE: 6,
  ROTATION_HANDLE_DISTANCE: 30,
  LINE_WIDTH: 2,
  MIN_REGION_SIZE: 10,
  MIN_CHILD_REGION_SIZE: 5,
  SNAP_THRESHOLD: 0.1,
  FONT_SIZE: 14,
  FONT_FAMILY: 'sans-serif',
  DASH_PATTERN: [5, 5],
} as const;

export const COLORS = {
  PRIMARY: '#3b82f6',
  CHILD_REGIONS: ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
  WARNING: '#f97316',
  SELECTED: '#2563eb',
} as const;

export const SNAP_ANGLES = [
  0, 
  Math.PI/4, 
  Math.PI/2, 
  3*Math.PI/4, 
  Math.PI, 
  -3*Math.PI/4, 
  -Math.PI/2, 
  -Math.PI/4
] as const;