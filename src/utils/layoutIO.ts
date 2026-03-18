import type { AnalysisData, LayoutFile, ParentRegion, ChildRegion, RegionPoint } from '../types';

export function exportLayout(
  analysisData: AnalysisData,
  unitBasis: 'height' | 'width',
  canvasSize?: { width: number; height: number }
): string {
  if (!analysisData.imageInfo) {
    throw new Error('Image not loaded');
  }

  const layout: LayoutFile = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sourceImageInfo: {
      width: analysisData.imageInfo.width,
      height: analysisData.imageInfo.height,
      name: analysisData.imageInfo.name,
    },
    canvasSize,
    parentRegion: analysisData.parentRegion,
    childRegions: analysisData.childRegions,
    points: analysisData.points,
    gridSettings: analysisData.gridSettings,
    childGridSettings: analysisData.childGridSettings,
    colorSettings: analysisData.colorSettings,
    unitBasis,
  };

  return JSON.stringify(layout, null, 2);
}

export function validateLayout(parsed: unknown): LayoutFile {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Not a valid JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.version !== '1.0') {
    throw new Error(`Unsupported layout version: ${String(obj.version)}. Please update the application.`);
  }

  const required = [
    'version', 'sourceImageInfo', 'parentRegion', 'childRegions',
    'points', 'gridSettings', 'childGridSettings', 'colorSettings',
    'unitBasis',
  ];
  for (const key of required) {
    if (!(key in obj)) {
      throw new Error(`Missing required field "${key}"`);
    }
  }

  if (!Array.isArray(obj.childRegions)) {
    throw new Error('childRegions must be an array');
  }
  if (!Array.isArray(obj.points)) {
    throw new Error('points must be an array');
  }

  return obj as unknown as LayoutFile;
}


export type ApplyLayoutResult = Pick<
  AnalysisData,
  'parentRegion' | 'childRegions' | 'points' | 'gridSettings' | 'childGridSettings' | 'colorSettings'
> & {
  unitBasis: 'height' | 'width';
  scaled: boolean;
};

// Compute how the image is drawn on a canvas of given dimensions.
// Mirrors the logic in useCanvasDrawing.drawImage (0.95 margin, centered).
function getImageDrawLayout(canvasW: number, canvasH: number, imgAspect: number) {
  const canvasAspect = canvasW / canvasH;
  let drawWidth: number, drawHeight: number;
  if (imgAspect > canvasAspect) {
    drawWidth = canvasW * 0.95;
    drawHeight = drawWidth / imgAspect;
  } else {
    drawHeight = canvasH * 0.95;
    drawWidth = drawHeight * imgAspect;
  }
  const offsetX = (canvasW - drawWidth) / 2;
  const offsetY = (canvasH - drawHeight) / 2;
  return { drawWidth, drawHeight, offsetX, offsetY };
}

interface DrawLayout {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

function scaleX(px: number, from: DrawLayout, to: DrawLayout): number {
  return (px - from.offsetX) / from.drawWidth * to.drawWidth + to.offsetX;
}

function scaleY(py: number, from: DrawLayout, to: DrawLayout): number {
  return (py - from.offsetY) / from.drawHeight * to.drawHeight + to.offsetY;
}

function scaleW(w: number, from: DrawLayout, to: DrawLayout): number {
  return w / from.drawWidth * to.drawWidth;
}

function scaleH(h: number, from: DrawLayout, to: DrawLayout): number {
  return h / from.drawHeight * to.drawHeight;
}

function scaleParentRegion(r: ParentRegion, from: DrawLayout, to: DrawLayout): ParentRegion {
  return {
    ...r,
    x: scaleX(r.x, from, to),
    y: scaleY(r.y, from, to),
    width: scaleW(r.width, from, to),
    height: scaleH(r.height, from, to),
  };
}

function scaleChildRegion(r: ChildRegion, from: DrawLayout, to: DrawLayout): ChildRegion {
  const scale = to.drawWidth / from.drawWidth; // same ratio for W and H (aspect preserved)
  return {
    ...r,
    bounds: {
      x: scaleX(r.bounds.x, from, to),
      y: scaleY(r.bounds.y, from, to),
      width: scaleW(r.bounds.width, from, to),
      height: scaleH(r.bounds.height, from, to),
    },
    centerCoordinates: {
      grid: r.centerCoordinates.grid,
      pixel: {
        x: scaleX(r.centerCoordinates.pixel.x, from, to),
        y: scaleY(r.centerCoordinates.pixel.y, from, to),
      },
    },
    ...(r.radius !== undefined ? { radius: r.radius * scale } : {}),
    ...(r.lineStart !== undefined ? {
      lineStart: { x: scaleX(r.lineStart.x, from, to), y: scaleY(r.lineStart.y, from, to) }
    } : {}),
    ...(r.lineEnd !== undefined ? {
      lineEnd: { x: scaleX(r.lineEnd.x, from, to), y: scaleY(r.lineEnd.y, from, to) }
    } : {}),
    ...(r.lineLength !== undefined ? { lineLength: r.lineLength * scale } : {}),
  };
}

function scalePoint(p: RegionPoint, from: DrawLayout, to: DrawLayout): RegionPoint {
  return {
    ...p,
    coordinates: {
      grid: p.coordinates.grid,
      pixel: {
        x: scaleX(p.coordinates.pixel.x, from, to),
        y: scaleY(p.coordinates.pixel.y, from, to),
      },
    },
  };
}

export function applyLayoutToState(
  layout: LayoutFile,
  currentCanvasSize?: { width: number; height: number }
): ApplyLayoutResult {
  const { sourceImageInfo, canvasSize } = layout;
  let { parentRegion, childRegions, points } = layout;
  let scaled = false;

  // Scale coordinates if canvas size changed between export and import
  if (
    canvasSize &&
    currentCanvasSize &&
    (canvasSize.width !== currentCanvasSize.width || canvasSize.height !== currentCanvasSize.height) &&
    sourceImageInfo.width > 0 &&
    sourceImageInfo.height > 0
  ) {
    const imgAspect = sourceImageInfo.width / sourceImageInfo.height;
    const from = getImageDrawLayout(canvasSize.width, canvasSize.height, imgAspect);
    const to = getImageDrawLayout(currentCanvasSize.width, currentCanvasSize.height, imgAspect);

    parentRegion = parentRegion ? scaleParentRegion(parentRegion, from, to) : null;
    childRegions = childRegions.map(r => scaleChildRegion(r, from, to));
    points = points.map(p => scalePoint(p, from, to));
    scaled = true;
  }

  return {
    parentRegion,
    childRegions,
    points,
    gridSettings: layout.gridSettings,
    childGridSettings: layout.childGridSettings,
    colorSettings: layout.colorSettings,
    unitBasis: layout.unitBasis,
    scaled,
  };
}
