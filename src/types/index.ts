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
  type: '16x16' | '32x32' | 'custom';
  customSize?: number;
  visible: boolean;
}

export interface ColorSettings {
  parentColor: string;
  childColor: string;
  gridColor: string;
  gridOpacity: number;
}

export interface AnalysisData {
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  gridSettings: GridSettings;
  colorSettings: ColorSettings;
  imageInfo: {
    width: number;
    height: number;
    name: string;
  } | null;
}

export type SelectionMode = 'parent' | 'child';

export interface AppState {
  imageLoaded: boolean;
  selectionMode: SelectionMode;
  selectedChildId: number | null;
  isRotating: boolean;
  zoom: number;
  pan: Point;
}