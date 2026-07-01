import type { Point, ColorSettings, ChildRegion } from '../types';
import { calculateUniformModules, calculateLineModuleColumns, getLineAngleSquare } from './geometry';
import { hexToRgba } from './color';

// Shared canvas-rendering primitives used by both the on-screen renderer
// (useCanvasDrawing) and the PNG export (useExport). Geometry is passed in
// already positioned in the caller's coordinate space; the renderer never
// transforms coordinates. Line widths are multiplied by lineScale: the screen
// passes 1/zoom so strokes keep a constant screen-pixel width, the export
// passes 1.

export interface RotatableRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface GridLineOptions {
  unitBasis: 'height' | 'width';
  // Cell size in the caller's coordinate space (e.g. parent basis / 16).
  // Falls back to the region's own basis / 16.
  cellSizeOverride?: number;
  clipToEllipse?: boolean;
  // Adds a finer 1/64 grid (4 sub-lines per 1/16 cell), drawn thinner and fainter.
  subdivide?: boolean;
}

function applyRotation(ctx: CanvasRenderingContext2D, region: RotatableRect): void {
  if (region.rotation !== 0) {
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(region.rotation);
    ctx.translate(-centerX, -centerY);
  }
}

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  region: RotatableRect,
  gridColor: string,
  gridOpacity: number,
  lineScale: number,
  options: GridLineOptions
): void {
  const basisLength = options.unitBasis === 'width' ? region.width : region.height;
  const cellSize = options.cellSizeOverride ?? basisLength / 16;
  if (cellSize <= 0) return;

  const { x, y, width, height } = region;

  ctx.save();

  applyRotation(ctx, region);

  if (options.clipToEllipse) {
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
    ctx.clip();
  }

  ctx.strokeStyle = hexToRgba(gridColor, gridOpacity);

  const cx = x + width / 2;
  const cy = y + height / 2;
  const sub = options.subdivide ? 4 : 1;
  const fineCell = cellSize / sub;
  const applyStyle = (k: number) => {
    if (k % sub === 0) {
      const m = k / sub;
      ctx.lineWidth = (m % 8 === 0 ? 1.5 : m % 4 === 0 ? 1.0 : 0.5) * lineScale;
      ctx.globalAlpha = 1;
    } else {
      ctx.lineWidth = 0.25 * lineScale;
      ctx.globalAlpha = 0.5;
    }
  };

  // Vertical lines from center outward
  for (let k = 0; cx + k * fineCell <= x + width + 0.5; k++) {
    const lx = cx + k * fineCell;
    applyStyle(k);
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
  }
  for (let k = 1; cx - k * fineCell >= x - 0.5; k++) {
    const lx = cx - k * fineCell;
    applyStyle(k);
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + height); ctx.stroke();
  }

  // Horizontal lines from center outward
  for (let k = 0; cy + k * fineCell <= y + height + 0.5; k++) {
    const ly = cy + k * fineCell;
    applyStyle(k);
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
  }
  for (let k = 1; cy - k * fineCell >= y - 0.5; k++) {
    const ly = cy - k * fineCell;
    applyStyle(k);
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + width, ly); ctx.stroke();
  }

  ctx.restore();
}

// "Row" rendering: horizontal divider lines across the circle (clipped to the
// ellipse) at each module boundary, tiled upward from the bottom edge.
export function drawCircleModuleRows(
  ctx: CanvasRenderingContext2D,
  region: RotatableRect,
  color: string,
  opacity: number,
  lineScale: number,
  parentBasisPx: number
): void {
  const { x, y, width, height } = region;
  if (height <= 0) return;

  const modules = calculateUniformModules(height, parentBasisPx);
  if (modules.length === 0) return;

  ctx.save();
  applyRotation(ctx, region);
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
  ctx.clip();

  ctx.strokeStyle = color;

  for (const entry of modules) {
    const d = entry.radius * 2;
    const isInner = entry.level !== modules[0].level;
    ctx.lineWidth = (isInner ? 0.5 : 1) * lineScale;
    ctx.globalAlpha = isInner ? opacity * 0.6 : opacity;
    for (let i = 0; i <= entry.count; i++) {
      if (isInner && i % 4 === 0) continue;
      const lineY = (y + height) - i * d;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + width, lineY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Module boundaries are marked with a dot centered on the line at each
// boundary. The 1/16 boundaries are drawn larger/opaque; the nested 1/64
// boundaries are smaller, skipping boundaries that coincide with a 1/16 dot.
export function drawLineModuleDots(
  ctx: CanvasRenderingContext2D,
  lineStart: Point,
  lineEnd: Point,
  color: string,
  opacity: number,
  lineScale: number,
  moduleLengthPx: number,
  lineLength?: number
): void {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const modules = calculateLineModuleColumns(lineLength ?? len, moduleLengthPx);
  if (modules.length === 0) return;

  const ux = dx / len;
  const uy = dy / len;

  ctx.save();
  ctx.fillStyle = color;

  for (const entry of modules) {
    const diameter = entry.radius * 2;
    const isInner = entry.level !== modules[0].level;
    const dotRadius = (isInner ? 1 : 3) * lineScale;
    ctx.globalAlpha = opacity;
    for (let i = 0; i <= entry.count; i++) {
      if (isInner && i % 4 === 0) continue;
      const t = i * diameter;
      if (t > len + 0.01) continue; // don't draw past the line end
      const bx = lineStart.x + ux * t;
      const by = lineStart.y + uy * t;
      ctx.beginPath();
      ctx.arc(bx, by, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// Angle guide: a square whose side is the larger of the line's width/height,
// with the line start at the corner the square extends from. A 1/2 grid and a
// fainter 1/4 grid are drawn inside.
export function drawLineAngleGuide(
  ctx: CanvasRenderingContext2D,
  lineStart: Point,
  lineEnd: Point,
  color: string,
  opacity: number,
  lineScale: number
): void {
  const sq = getLineAngleSquare(lineStart, lineEnd);
  if (!sq) return;
  const { x, y, side } = sq;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 * lineScale;

  // 1/4 grid (fainter)
  ctx.globalAlpha = opacity * 0.4;
  for (const k of [1, 3]) {
    const g = (k * side) / 4;
    ctx.beginPath(); ctx.moveTo(x + g, y); ctx.lineTo(x + g, y + side); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + g); ctx.lineTo(x + side, y + g); ctx.stroke();
  }

  // 1/2 grid (center cross) + square outline
  ctx.globalAlpha = opacity;
  const mid = side / 2;
  ctx.beginPath(); ctx.moveTo(x + mid, y); ctx.lineTo(x + mid, y + side); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + mid); ctx.lineTo(x + side, y + mid); ctx.stroke();
  ctx.strokeRect(x, y, side, side);

  ctx.restore();
}

export interface PointMarker {
  id?: number;
  pixel: Point;
  parentRegionId?: number;
}

export function drawPointMarkers(
  ctx: CanvasRenderingContext2D,
  markers: PointMarker[],
  colorSettings: ColorSettings,
  childRegions: ChildRegion[],
  selectedPointId: number | null,
  lineScale: number
): void {
  markers.forEach(marker => {
    ctx.save();

    const isSelected = selectedPointId !== null && selectedPointId === marker.id;
    const { x, y } = marker.pixel;

    let color: string;
    if (isSelected) {
      color = '#3b82f6';
    } else if (marker.parentRegionId === undefined) {
      color = hexToRgba(colorSettings.dotColor ?? '#ffffff', colorSettings.dotColorOpacity ?? 1);
    } else {
      const region = childRegions.find(r => r.id === marker.parentRegionId);
      if (region?.shape === 'circle') {
        color = hexToRgba(colorSettings.childCircleColor, colorSettings.childCircleColorOpacity ?? 1);
      } else if (region?.shape === 'line') {
        color = hexToRgba(colorSettings.childLineColor, colorSettings.childLineColorOpacity ?? 1);
      } else {
        color = hexToRgba(colorSettings.childRectColor, colorSettings.childRectColorOpacity ?? 1);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = (isSelected ? 2.5 : 1) * lineScale;

    const arm = 6 * lineScale;

    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y + arm);
    ctx.stroke();

    ctx.restore();
  });
}
