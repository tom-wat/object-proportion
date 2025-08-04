export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Point, Size {}

export interface ParentRegion extends Bounds {
  rotation: number;
  aspectRatio: string;
  aspectRatioDecimal: number;
}

export interface ChildRegion {
  id: number;
  name: string;
  isInside: boolean;
  centerCoordinates: {
    grid: Point;
    pixel: Point;
  };
  bounds: Bounds;
  rotation: number;
  ratios: {
    areaRatio: number;
    widthRatio: number;
    heightRatio: number;
  };
  outsideInfo?: {
    distance: number;
    centerDistance: number;
    direction: string;
    angle: number;
    shortestEdge: string;
  };
}

export interface GridSettings {
  visible: boolean;
}

export interface ChildGridSettings {
  visible: boolean;
}

export interface ColorSettings {
  parentColor: string;
  childColor: string;
  gridColor: string;
  gridOpacity: number;
  childGridColor: string;
  childGridOpacity: number;
}

export interface AnalysisData {
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  gridSettings: GridSettings;
  childGridSettings: ChildGridSettings;
  colorSettings: ColorSettings;
  imageInfo: {
    width: number;
    height: number;
    name: string;
  } | null;
}

export type SelectionMode = 'parent' | 'child';
export type ResizeHandle = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ResizeHandleInfo {
  type: ResizeHandle;
  x: number;
  y: number;
}

export interface AppState {
  imageLoaded: boolean;
  selectionMode: SelectionMode;
  selectedChildId: number | null;
  isRotating: boolean;
  zoom: number;
  pan: Point;
}