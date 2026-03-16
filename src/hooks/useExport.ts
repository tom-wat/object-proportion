import { useCallback } from 'react';
import type { AnalysisData } from '../types';
import { downloadFile } from '../utils/export';
import { calculateLineModules } from '../utils/geometry';
import { exportLayout } from '../utils/layoutIO';

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
}

interface UseExportProps {
  analysisData: AnalysisData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  cachedImage?: HTMLImageElement | null;
  unitBasis?: 'height' | 'width';
}

export function useExport({ analysisData, canvasRef, cachedImage, unitBasis = 'height' }: UseExportProps) {
  const handleExportPNG = useCallback(() => {
    if (!analysisData.imageInfo || !cachedImage) {
      alert('Image not loaded');
      return;
    }

    if (!canvasRef?.current) {
      alert('Canvas not available for export');
      return;
    }

    try {
      // Create offscreen canvas at original image size
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = analysisData.imageInfo.width;
      offscreenCanvas.height = analysisData.imageInfo.height;

      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) {
        alert('Failed to create canvas context');
        return;
      }

      // Draw original image
      ctx.drawImage(cachedImage, 0, 0);

      // Calculate scaling factors from display canvas to original image
      const displayCanvas = canvasRef.current;
      const imgAspect = analysisData.imageInfo.width / analysisData.imageInfo.height;
      const canvasAspect = displayCanvas.width / displayCanvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > canvasAspect) {
        drawWidth = displayCanvas.width * 0.95;
        drawHeight = drawWidth / imgAspect;
        offsetX = (displayCanvas.width - drawWidth) / 2;
        offsetY = (displayCanvas.height - drawHeight) / 2;
      } else {
        drawHeight = displayCanvas.height * 0.95;
        drawWidth = drawHeight * imgAspect;
        offsetX = (displayCanvas.width - drawWidth) / 2;
        offsetY = (displayCanvas.height - drawHeight) / 2;
      }

      const scaleX = analysisData.imageInfo.width / drawWidth;
      const scaleY = analysisData.imageInfo.height / drawHeight;

      // Helper function to draw rotated rectangle
      const drawRotatedRect = (
        region: { x: number; y: number; width: number; height: number; rotation: number },
        color: string,
        lineWidth: number
      ) => {
        ctx.save();

        if (region.rotation !== 0) {
          const centerX = region.x + region.width / 2;
          const centerY = region.y + region.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(region.rotation);
          ctx.translate(-centerX, -centerY);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(region.x, region.y, region.width, region.height);

        ctx.restore();
      };

      // Helper function to draw grid (square cells based on unitBasis)
      const drawGrid = (
        region: { x: number; y: number; width: number; height: number; rotation: number },
        gridColor: string,
        gridOpacity: number,
        cellSizeOverride?: number,
        clipToEllipse?: boolean
      ) => {
        const basisLength = unitBasis === 'width' ? region.width : region.height;
        const cellSize = cellSizeOverride ?? basisLength / 16;
        if (cellSize <= 0) return;

        ctx.save();

        if (region.rotation !== 0) {
          const centerX = region.x + region.width / 2;
          const centerY = region.y + region.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(region.rotation);
          ctx.translate(-centerX, -centerY);
        }

        if (clipToEllipse) {
          ctx.beginPath();
          ctx.ellipse(region.x + region.width / 2, region.y + region.height / 2, region.width / 2, region.height / 2, 0, 0, 2 * Math.PI);
          ctx.clip();
        }

        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 255, g: 255, b: 255 };
        };

        const rgb = hexToRgb(gridColor);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;

        const cx = region.x + region.width / 2;
        const cy = region.y + region.height / 2;
        const lw = (k: number) => k % 8 === 0 ? 1.5 : k % 4 === 0 ? 1.0 : 0.5;

        // Vertical lines from center outward
        for (let k = 0; cx + k * cellSize <= region.x + region.width + 0.5; k++) {
          const x = cx + k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(x, region.y); ctx.lineTo(x, region.y + region.height); ctx.stroke();
        }
        for (let k = 1; cx - k * cellSize >= region.x - 0.5; k++) {
          const x = cx - k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(x, region.y); ctx.lineTo(x, region.y + region.height); ctx.stroke();
        }

        // Horizontal lines from center outward
        for (let k = 0; cy + k * cellSize <= region.y + region.height + 0.5; k++) {
          const y = cy + k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(region.x, y); ctx.lineTo(region.x + region.width, y); ctx.stroke();
        }
        for (let k = 1; cy - k * cellSize >= region.y - 0.5; k++) {
          const y = cy - k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(region.x, y); ctx.lineTo(region.x + region.width, y); ctx.stroke();
        }

        ctx.restore();
      };

      // Draw parent region and grid if exists
      if (analysisData.parentRegion) {
        const scaledParent = {
          x: (analysisData.parentRegion.x - offsetX) * scaleX,
          y: (analysisData.parentRegion.y - offsetY) * scaleY,
          width: analysisData.parentRegion.width * scaleX,
          height: analysisData.parentRegion.height * scaleY,
          rotation: analysisData.parentRegion.rotation
        };

        // Draw parent grid if visible
        if (analysisData.gridSettings.visible) {
          drawGrid(
            scaledParent,
            analysisData.colorSettings.gridColor,
            analysisData.colorSettings.gridOpacity
          );
        }

        // Draw parent region frame
        const parentFrameColor0 = hexToRgba(analysisData.colorSettings.parentColor, analysisData.colorSettings.parentColorOpacity ?? 1);
        drawRotatedRect(scaledParent, parentFrameColor0, 2);
      }

      // Compute parent cell size for child grids
      const parentBasis0 = analysisData.parentRegion
        ? (unitBasis === 'width' ? analysisData.parentRegion.width * scaleX : analysisData.parentRegion.height * scaleY)
        : undefined;
      const parentCellSize0 = parentBasis0 !== undefined ? parentBasis0 / 16 : undefined;

      // Draw child regions and grids
      analysisData.childRegions.forEach((child) => {
        const scaledChild = {
          x: (child.bounds.x - offsetX) * scaleX,
          y: (child.bounds.y - offsetY) * scaleY,
          width: child.bounds.width * scaleX,
          height: child.bounds.height * scaleY,
          rotation: child.rotation
        };

        // Draw child grid if visible (shape-specific)
        const isChildRect0 = !child.shape || child.shape === 'rectangle';
        const isChildCircle0 = child.shape === 'circle';
        if ((isChildRect0 && analysisData.childGridSettings.rectVisible) ||
            (isChildCircle0 && analysisData.childGridSettings.circleVisible)) {
          const childGridColor0 = isChildCircle0 ? analysisData.colorSettings.childCircleGridColor : analysisData.colorSettings.childRectGridColor;
          const childGridOpacity0 = isChildCircle0 ? analysisData.colorSettings.childCircleGridOpacity : analysisData.colorSettings.childRectGridOpacity;
          drawGrid(
            scaledChild,
            childGridColor0,
            childGridOpacity0,
            parentCellSize0,
            isChildCircle0
          );
        }

        // Draw line modules if visible
        if (child.shape === 'line' && analysisData.childGridSettings.lineModuleVisible &&
            analysisData.parentRegion && child.lineStart && child.lineEnd) {
          const scaledLS = { x: (child.lineStart.x - offsetX) * scaleX, y: (child.lineStart.y - offsetY) * scaleY };
          const scaledLE = { x: (child.lineEnd.x - offsetX) * scaleX, y: (child.lineEnd.y - offsetY) * scaleY };
          const sdx = scaledLE.x - scaledLS.x;
          const sdy = scaledLE.y - scaledLS.y;
          const scaledLen = Math.sqrt(sdx * sdx + sdy * sdy);
          if (scaledLen > 0) {
            const scaledParentBasis = unitBasis === 'height'
              ? analysisData.parentRegion.height * scaleY
              : analysisData.parentRegion.width * scaleX;
            const modules = calculateLineModules(scaledLen, scaledParentBasis);
            if (modules.length > 0) {
              const ux = sdx / scaledLen;
              const uy = sdy / scaledLen;
              ctx.save();
              ctx.strokeStyle = analysisData.colorSettings.lineModuleColor;
              ctx.globalAlpha = analysisData.colorSettings.lineModuleOpacity;
              ctx.lineWidth = 1;
              let currentPos = 0;
              for (const entry of modules) {
                const diameter = entry.radius * 2;
                for (let i = 0; i < entry.count; i++) {
                  const t = currentPos + entry.radius;
                  ctx.beginPath();
                  ctx.arc(scaledLS.x + ux * t, scaledLS.y + uy * t, entry.radius, 0, 2 * Math.PI);
                  ctx.stroke();
                  currentPos += diameter;
                }
              }
              ctx.restore();
            }
          }
        }

        // Draw circle modules if visible
        if (isChildCircle0 && analysisData.childGridSettings.circleModuleVisible && analysisData.parentRegion) {
          const diameter = scaledChild.width;
          if (diameter > 0) {
            const scaledParentBasis = unitBasis === 'height'
              ? analysisData.parentRegion.height * scaleY
              : analysisData.parentRegion.width * scaleX;
            const modules = calculateLineModules(diameter, scaledParentBasis);
            if (modules.length > 0) {
              const cx = scaledChild.x + scaledChild.width / 2;
              const cy = scaledChild.y + scaledChild.height / 2;
              ctx.save();
              if (scaledChild.rotation !== 0) {
                ctx.translate(cx, cy);
                ctx.rotate(scaledChild.rotation);
                ctx.translate(-cx, -cy);
              }
              ctx.beginPath();
              ctx.ellipse(cx, cy, scaledChild.width / 2, scaledChild.height / 2, 0, 0, 2 * Math.PI);
              ctx.clip();
              ctx.strokeStyle = analysisData.colorSettings.circleModuleColor;
              ctx.globalAlpha = analysisData.colorSettings.circleModuleOpacity;
              ctx.lineWidth = 1;
              let currentPos = 0;
              for (const entry of modules) {
                const d = entry.radius * 2;
                for (let i = 0; i < entry.count; i++) {
                  const t = currentPos + entry.radius;
                  ctx.beginPath();
                  ctx.arc(scaledChild.x + t, cy, entry.radius, 0, 2 * Math.PI);
                  ctx.stroke();
                  currentPos += d;
                }
              }
              ctx.restore();
            }
          }
        }

        // Draw child region frame based on shape
        ctx.save();
        const cs0 = analysisData.colorSettings;
        const childShapeColor0 = isChildCircle0
          ? hexToRgba(cs0.childCircleColor, cs0.childCircleColorOpacity ?? 1)
          : child.shape === 'line'
            ? hexToRgba(cs0.childLineColor, cs0.childLineColorOpacity ?? 1)
            : hexToRgba(cs0.childRectColor, cs0.childRectColorOpacity ?? 1);
        ctx.strokeStyle = childShapeColor0;
        ctx.lineWidth = 2;

        if (child.shape === 'circle') {
          const cx = scaledChild.x + scaledChild.width / 2;
          const cy = scaledChild.y + scaledChild.height / 2;
          const radiusX = scaledChild.width / 2;
          const radiusY = scaledChild.height / 2;
          if (scaledChild.rotation) {
            ctx.translate(cx, cy);
            ctx.rotate(scaledChild.rotation);
            ctx.translate(-cx, -cy);
          }
          ctx.beginPath();
          ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (child.shape === 'line' && child.lineStart && child.lineEnd) {
          const sx = (child.lineStart.x - offsetX) * scaleX;
          const sy = (child.lineStart.y - offsetY) * scaleY;
          const ex = (child.lineEnd.x - offsetX) * scaleX;
          const ey = (child.lineEnd.y - offsetY) * scaleY;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        } else {
          // Rectangle (default)
          drawRotatedRect(scaledChild, childShapeColor0, 2);
        }

        ctx.restore();
      });

      // Draw points
      if (analysisData.points.length > 0) {
        analysisData.points.forEach(point => {
          const scaledX = (point.coordinates.pixel.x - offsetX) * scaleX;
          const scaledY = (point.coordinates.pixel.y - offsetY) * scaleY;

          const cs = analysisData.colorSettings;
          let pointColor: string;
          if (point.parentRegionId === undefined) {
            const op = cs.parentColorOpacity ?? 1;
            pointColor = op < 1 ? `rgba(${parseInt(cs.parentColor.slice(1,3),16)},${parseInt(cs.parentColor.slice(3,5),16)},${parseInt(cs.parentColor.slice(5,7),16)},${op})` : cs.parentColor;
          } else {
            const region = analysisData.childRegions.find(r => r.id === point.parentRegionId);
            const [hex, op] = region?.shape === 'circle'
              ? [cs.childCircleColor, cs.childCircleColorOpacity ?? 1]
              : region?.shape === 'line'
                ? [cs.childLineColor, cs.childLineColorOpacity ?? 1]
                : [cs.childRectColor, cs.childRectColorOpacity ?? 1];
            pointColor = op < 1 ? `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${op})` : hex;
          }

          ctx.strokeStyle = pointColor;
          ctx.lineWidth = 1;

          const arm = 6;
          ctx.beginPath();
          ctx.moveTo(scaledX - arm, scaledY);
          ctx.lineTo(scaledX + arm, scaledY);
          ctx.moveTo(scaledX, scaledY - arm);
          ctx.lineTo(scaledX, scaledY + arm);
          ctx.stroke();
        });
      }

      // Export to PNG
      offscreenCanvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to export PNG');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analysis-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export PNG');
    }
  }, [analysisData, canvasRef, cachedImage]);

  const handleExportPNGOverlayOnly = useCallback(() => {
    if (!analysisData.imageInfo) {
      alert('Image not loaded');
      return;
    }

    if (!canvasRef?.current) {
      alert('Canvas not available for export');
      return;
    }

    if (!analysisData.parentRegion && analysisData.childRegions.length === 0) {
      alert('No regions to export');
      return;
    }

    try {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = analysisData.imageInfo.width;
      offscreenCanvas.height = analysisData.imageInfo.height;

      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) {
        alert('Failed to create canvas context');
        return;
      }

      // Transparent background – do NOT draw the image

      const displayCanvas = canvasRef.current;
      const imgAspect = analysisData.imageInfo.width / analysisData.imageInfo.height;
      const canvasAspect = displayCanvas.width / displayCanvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > canvasAspect) {
        drawWidth = displayCanvas.width * 0.95;
        drawHeight = drawWidth / imgAspect;
        offsetX = (displayCanvas.width - drawWidth) / 2;
        offsetY = (displayCanvas.height - drawHeight) / 2;
      } else {
        drawHeight = displayCanvas.height * 0.95;
        drawWidth = drawHeight * imgAspect;
        offsetX = (displayCanvas.width - drawWidth) / 2;
        offsetY = (displayCanvas.height - drawHeight) / 2;
      }

      const scaleX = analysisData.imageInfo.width / drawWidth;
      const scaleY = analysisData.imageInfo.height / drawHeight;

      const drawRotatedRect = (
        region: { x: number; y: number; width: number; height: number; rotation: number },
        color: string,
        lineWidth: number
      ) => {
        ctx.save();
        if (region.rotation !== 0) {
          const centerX = region.x + region.width / 2;
          const centerY = region.y + region.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(region.rotation);
          ctx.translate(-centerX, -centerY);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(region.x, region.y, region.width, region.height);
        ctx.restore();
      };

      const drawGrid = (
        region: { x: number; y: number; width: number; height: number; rotation: number },
        gridColor: string,
        gridOpacity: number,
        cellSizeOverride?: number,
        clipToEllipse?: boolean
      ) => {
        const basisLength = unitBasis === 'width' ? region.width : region.height;
        const cellSize = cellSizeOverride ?? basisLength / 16;
        if (cellSize <= 0) return;
        ctx.save();
        if (region.rotation !== 0) {
          const centerX = region.x + region.width / 2;
          const centerY = region.y + region.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(region.rotation);
          ctx.translate(-centerX, -centerY);
        }
        if (clipToEllipse) {
          ctx.beginPath();
          ctx.ellipse(region.x + region.width / 2, region.y + region.height / 2, region.width / 2, region.height / 2, 0, 0, 2 * Math.PI);
          ctx.clip();
        }
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 0, g: 0, b: 0 };
        };
        const rgb = hexToRgb(gridColor);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;
        const cx = region.x + region.width / 2;
        const cy = region.y + region.height / 2;
        const lw = (k: number) => k % 8 === 0 ? 1.5 : k % 4 === 0 ? 1.0 : 0.5;
        for (let k = 0; cx + k * cellSize <= region.x + region.width + 0.5; k++) {
          const x = cx + k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(x, region.y); ctx.lineTo(x, region.y + region.height); ctx.stroke();
        }
        for (let k = 1; cx - k * cellSize >= region.x - 0.5; k++) {
          const x = cx - k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(x, region.y); ctx.lineTo(x, region.y + region.height); ctx.stroke();
        }
        for (let k = 0; cy + k * cellSize <= region.y + region.height + 0.5; k++) {
          const y = cy + k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(region.x, y); ctx.lineTo(region.x + region.width, y); ctx.stroke();
        }
        for (let k = 1; cy - k * cellSize >= region.y - 0.5; k++) {
          const y = cy - k * cellSize;
          ctx.lineWidth = lw(k);
          ctx.beginPath(); ctx.moveTo(region.x, y); ctx.lineTo(region.x + region.width, y); ctx.stroke();
        }
        ctx.restore();
      };

      if (analysisData.parentRegion) {
        const scaledParent = {
          x: (analysisData.parentRegion.x - offsetX) * scaleX,
          y: (analysisData.parentRegion.y - offsetY) * scaleY,
          width: analysisData.parentRegion.width * scaleX,
          height: analysisData.parentRegion.height * scaleY,
          rotation: analysisData.parentRegion.rotation
        };
        if (analysisData.gridSettings.visible) {
          drawGrid(scaledParent, analysisData.colorSettings.gridColor, analysisData.colorSettings.gridOpacity);
        }
        const parentFrameColor1 = hexToRgba(analysisData.colorSettings.parentColor, analysisData.colorSettings.parentColorOpacity ?? 1);
        drawRotatedRect(scaledParent, parentFrameColor1, 2);
      }

      const parentBasis1 = analysisData.parentRegion
        ? (unitBasis === 'width' ? analysisData.parentRegion.width * scaleX : analysisData.parentRegion.height * scaleY)
        : undefined;
      const parentCellSize1 = parentBasis1 !== undefined ? parentBasis1 / 16 : undefined;

      analysisData.childRegions.forEach((child) => {
        const scaledChild = {
          x: (child.bounds.x - offsetX) * scaleX,
          y: (child.bounds.y - offsetY) * scaleY,
          width: child.bounds.width * scaleX,
          height: child.bounds.height * scaleY,
          rotation: child.rotation
        };
        const isChildRect1 = !child.shape || child.shape === 'rectangle';
        const isChildCircle1 = child.shape === 'circle';
        if ((isChildRect1 && analysisData.childGridSettings.rectVisible) ||
            (isChildCircle1 && analysisData.childGridSettings.circleVisible)) {
          const childGridColor1 = isChildCircle1 ? analysisData.colorSettings.childCircleGridColor : analysisData.colorSettings.childRectGridColor;
          const childGridOpacity1 = isChildCircle1 ? analysisData.colorSettings.childCircleGridOpacity : analysisData.colorSettings.childRectGridOpacity;
          drawGrid(scaledChild, childGridColor1, childGridOpacity1, parentCellSize1, isChildCircle1);
        }

        // Draw line modules if visible
        if (child.shape === 'line' && analysisData.childGridSettings.lineModuleVisible &&
            analysisData.parentRegion && child.lineStart && child.lineEnd) {
          const scaledLS = { x: (child.lineStart.x - offsetX) * scaleX, y: (child.lineStart.y - offsetY) * scaleY };
          const scaledLE = { x: (child.lineEnd.x - offsetX) * scaleX, y: (child.lineEnd.y - offsetY) * scaleY };
          const sdx = scaledLE.x - scaledLS.x;
          const sdy = scaledLE.y - scaledLS.y;
          const scaledLen = Math.sqrt(sdx * sdx + sdy * sdy);
          if (scaledLen > 0) {
            const scaledParentBasis = unitBasis === 'height'
              ? analysisData.parentRegion.height * scaleY
              : analysisData.parentRegion.width * scaleX;
            const modules = calculateLineModules(scaledLen, scaledParentBasis);
            if (modules.length > 0) {
              const ux = sdx / scaledLen;
              const uy = sdy / scaledLen;
              ctx.save();
              ctx.strokeStyle = analysisData.colorSettings.lineModuleColor;
              ctx.globalAlpha = analysisData.colorSettings.lineModuleOpacity;
              ctx.lineWidth = 1;
              let currentPos = 0;
              for (const entry of modules) {
                const diameter = entry.radius * 2;
                for (let i = 0; i < entry.count; i++) {
                  const t = currentPos + entry.radius;
                  ctx.beginPath();
                  ctx.arc(scaledLS.x + ux * t, scaledLS.y + uy * t, entry.radius, 0, 2 * Math.PI);
                  ctx.stroke();
                  currentPos += diameter;
                }
              }
              ctx.restore();
            }
          }
        }

        // Draw circle modules if visible
        if (isChildCircle1 && analysisData.childGridSettings.circleModuleVisible && analysisData.parentRegion) {
          const diameter = scaledChild.width;
          if (diameter > 0) {
            const scaledParentBasis = unitBasis === 'height'
              ? analysisData.parentRegion.height * scaleY
              : analysisData.parentRegion.width * scaleX;
            const modules = calculateLineModules(diameter, scaledParentBasis);
            if (modules.length > 0) {
              const cx = scaledChild.x + scaledChild.width / 2;
              const cy = scaledChild.y + scaledChild.height / 2;
              ctx.save();
              if (scaledChild.rotation !== 0) {
                ctx.translate(cx, cy);
                ctx.rotate(scaledChild.rotation);
                ctx.translate(-cx, -cy);
              }
              ctx.beginPath();
              ctx.ellipse(cx, cy, scaledChild.width / 2, scaledChild.height / 2, 0, 0, 2 * Math.PI);
              ctx.clip();
              ctx.strokeStyle = analysisData.colorSettings.circleModuleColor;
              ctx.globalAlpha = analysisData.colorSettings.circleModuleOpacity;
              ctx.lineWidth = 1;
              let currentPos = 0;
              for (const entry of modules) {
                const d = entry.radius * 2;
                for (let i = 0; i < entry.count; i++) {
                  const t = currentPos + entry.radius;
                  ctx.beginPath();
                  ctx.arc(scaledChild.x + t, cy, entry.radius, 0, 2 * Math.PI);
                  ctx.stroke();
                  currentPos += d;
                }
              }
              ctx.restore();
            }
          }
        }

        ctx.save();
        const cs1 = analysisData.colorSettings;
        const childShapeColor1 = isChildCircle1
          ? hexToRgba(cs1.childCircleColor, cs1.childCircleColorOpacity ?? 1)
          : child.shape === 'line'
            ? hexToRgba(cs1.childLineColor, cs1.childLineColorOpacity ?? 1)
            : hexToRgba(cs1.childRectColor, cs1.childRectColorOpacity ?? 1);
        ctx.strokeStyle = childShapeColor1;
        ctx.lineWidth = 2;
        if (child.shape === 'circle') {
          const cx = scaledChild.x + scaledChild.width / 2;
          const cy = scaledChild.y + scaledChild.height / 2;
          const radiusX = scaledChild.width / 2;
          const radiusY = scaledChild.height / 2;
          if (scaledChild.rotation) {
            ctx.translate(cx, cy);
            ctx.rotate(scaledChild.rotation);
            ctx.translate(-cx, -cy);
          }
          ctx.beginPath();
          ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (child.shape === 'line' && child.lineStart && child.lineEnd) {
          const sx = (child.lineStart.x - offsetX) * scaleX;
          const sy = (child.lineStart.y - offsetY) * scaleY;
          const ex = (child.lineEnd.x - offsetX) * scaleX;
          const ey = (child.lineEnd.y - offsetY) * scaleY;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        } else {
          drawRotatedRect(scaledChild, childShapeColor1, 2);
        }
        ctx.restore();
      });

      if (analysisData.points.length > 0) {
        analysisData.points.forEach(point => {
          const scaledX = (point.coordinates.pixel.x - offsetX) * scaleX;
          const scaledY = (point.coordinates.pixel.y - offsetY) * scaleY;

          const cs = analysisData.colorSettings;
          let pointColor: string;
          if (point.parentRegionId === undefined) {
            const op = cs.parentColorOpacity ?? 1;
            pointColor = op < 1 ? `rgba(${parseInt(cs.parentColor.slice(1,3),16)},${parseInt(cs.parentColor.slice(3,5),16)},${parseInt(cs.parentColor.slice(5,7),16)},${op})` : cs.parentColor;
          } else {
            const region = analysisData.childRegions.find(r => r.id === point.parentRegionId);
            const [hex, op] = region?.shape === 'circle'
              ? [cs.childCircleColor, cs.childCircleColorOpacity ?? 1]
              : region?.shape === 'line'
                ? [cs.childLineColor, cs.childLineColorOpacity ?? 1]
                : [cs.childRectColor, cs.childRectColorOpacity ?? 1];
            pointColor = op < 1 ? `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${op})` : hex;
          }

          ctx.strokeStyle = pointColor;
          ctx.lineWidth = 1;

          const arm = 6;
          ctx.beginPath();
          ctx.moveTo(scaledX - arm, scaledY);
          ctx.lineTo(scaledX + arm, scaledY);
          ctx.moveTo(scaledX, scaledY - arm);
          ctx.lineTo(scaledX, scaledY + arm);
          ctx.stroke();
        });
      }

      offscreenCanvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to export PNG');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `overlay-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to export overlay PNG:', error);
      alert('Failed to export overlay PNG');
    }
  }, [analysisData, canvasRef]);

  const handleExportLayout = useCallback(() => {
    if (!analysisData.imageInfo) {
      alert('Image not loaded');
      return;
    }
    try {
      const json = exportLayout(analysisData, unitBasis);
      downloadFile(json, `layout-${Date.now()}.json`, 'application/json');
    } catch (error) {
      console.error('Failed to export layout:', error);
      alert('Failed to export layout');
    }
  }, [analysisData, unitBasis]);

  return {
    handleExportPNG,
    handleExportPNGOverlayOnly,
    handleExportLayout,
  };
}