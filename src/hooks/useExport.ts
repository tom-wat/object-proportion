import { useCallback } from 'react';
import type { AnalysisData } from '../types';
import { exportToJSON, exportToCSV, downloadFile } from '../utils/export';

interface UseExportProps {
  analysisData: AnalysisData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  cachedImage?: HTMLImageElement | null;
  unitBasis?: 'height' | 'width';
}

export function useExport({ analysisData, canvasRef, cachedImage, unitBasis = 'height' }: UseExportProps) {
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(analysisData);
    downloadFile(json, `analysis-${Date.now()}.json`, 'application/json');
  }, [analysisData]);

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(analysisData);
    if (csv) {
      downloadFile(csv, `analysis-${Date.now()}.csv`, 'text/csv');
    }
  }, [analysisData]);

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
        drawRotatedRect(scaledParent, analysisData.colorSettings.parentColor, 2);
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
          drawGrid(
            scaledChild,
            analysisData.colorSettings.childGridColor,
            analysisData.colorSettings.childGridOpacity,
            parentCellSize0,
            isChildCircle0
          );
        }

        // Draw child region frame based on shape
        ctx.save();
        const childShapeColor0 = isChildCircle0
          ? analysisData.colorSettings.childCircleColor
          : child.shape === 'line'
            ? analysisData.colorSettings.childLineColor
            : analysisData.colorSettings.childRectColor;
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
          drawRotatedRect(scaledChild, analysisData.colorSettings.childRectColor, 2);
        }

        ctx.restore();
      });

      // Draw points
      if (analysisData.points.length > 0) {
        analysisData.points.forEach(point => {
          const scaledX = (point.coordinates.pixel.x - offsetX) * scaleX;
          const scaledY = (point.coordinates.pixel.y - offsetY) * scaleY;

          const pointColor = point.parentRegionId !== undefined
            ? analysisData.colorSettings.childRectColor
            : analysisData.colorSettings.parentColor;

          ctx.fillStyle = pointColor;
          ctx.strokeStyle = pointColor;
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
          ctx.fill();
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
        drawRotatedRect(scaledParent, analysisData.colorSettings.parentColor, 2);
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
          drawGrid(scaledChild, analysisData.colorSettings.childGridColor, analysisData.colorSettings.childGridOpacity, parentCellSize1, isChildCircle1);
        }
        ctx.save();
        const childShapeColor1 = isChildCircle1
          ? analysisData.colorSettings.childCircleColor
          : child.shape === 'line'
            ? analysisData.colorSettings.childLineColor
            : analysisData.colorSettings.childRectColor;
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
          drawRotatedRect(scaledChild, analysisData.colorSettings.childRectColor, 2);
        }
        ctx.restore();
      });

      if (analysisData.points.length > 0) {
        analysisData.points.forEach(point => {
          const scaledX = (point.coordinates.pixel.x - offsetX) * scaleX;
          const scaledY = (point.coordinates.pixel.y - offsetY) * scaleY;
          const pointColor = point.parentRegionId !== undefined
            ? analysisData.colorSettings.childRectColor
            : analysisData.colorSettings.parentColor;
          ctx.fillStyle = pointColor;
          ctx.strokeStyle = pointColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
          ctx.fill();
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

  return {
    handleExportJSON,
    handleExportCSV,
    handleExportPNG,
    handleExportPNGOverlayOnly,
  };
}