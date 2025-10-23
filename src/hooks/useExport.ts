import { useCallback } from 'react';
import type { AnalysisData } from '../types';
import { exportToJSON, exportToCSV, downloadFile } from '../utils/export';

interface UseExportProps {
  analysisData: AnalysisData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  cachedImage?: HTMLImageElement | null;
}

export function useExport({ analysisData, canvasRef, cachedImage }: UseExportProps) {
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

      // Helper function to draw grid
      const drawGrid = (
        region: { x: number; y: number; width: number; height: number; rotation: number },
        gridColor: string,
        gridOpacity: number
      ) => {
        const gridSize = 16;
        const cellWidth = region.width / gridSize;
        const cellHeight = region.height / gridSize;

        ctx.save();

        if (region.rotation !== 0) {
          const centerX = region.x + region.width / 2;
          const centerY = region.y + region.height / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(region.rotation);
          ctx.translate(-centerX, -centerY);
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
        const gridColorWithOpacity = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacity})`;

        ctx.strokeStyle = gridColorWithOpacity;

        // Draw vertical lines
        for (let i = 0; i <= gridSize; i++) {
          const x = region.x + i * cellWidth;

          if (i % 8 === 0) {
            ctx.lineWidth = 1.5;
          } else if (i % 4 === 0) {
            ctx.lineWidth = 1.0;
          } else {
            ctx.lineWidth = 0.5;
          }

          ctx.beginPath();
          ctx.moveTo(x, region.y);
          ctx.lineTo(x, region.y + region.height);
          ctx.stroke();
        }

        // Draw horizontal lines
        for (let i = 0; i <= gridSize; i++) {
          const y = region.y + i * cellHeight;

          if (i % 8 === 0) {
            ctx.lineWidth = 1.5;
          } else if (i % 4 === 0) {
            ctx.lineWidth = 1.0;
          } else {
            ctx.lineWidth = 0.5;
          }

          ctx.beginPath();
          ctx.moveTo(region.x, y);
          ctx.lineTo(region.x + region.width, y);
          ctx.stroke();
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

      // Draw child regions and grids
      analysisData.childRegions.forEach((child) => {
        const scaledChild = {
          x: (child.bounds.x - offsetX) * scaleX,
          y: (child.bounds.y - offsetY) * scaleY,
          width: child.bounds.width * scaleX,
          height: child.bounds.height * scaleY,
          rotation: child.rotation
        };

        // Draw child grid if visible
        if (analysisData.childGridSettings.visible) {
          drawGrid(
            scaledChild,
            analysisData.colorSettings.childGridColor,
            analysisData.colorSettings.childGridOpacity
          );
        }

        // Draw child region frame
        drawRotatedRect(scaledChild, analysisData.colorSettings.childColor, 2);
      });

      // Draw points
      if (analysisData.points.length > 0) {
        analysisData.points.forEach(point => {
          const scaledX = (point.coordinates.pixel.x - offsetX) * scaleX;
          const scaledY = (point.coordinates.pixel.y - offsetY) * scaleY;

          const pointColor = point.parentRegionId !== undefined
            ? analysisData.colorSettings.childColor
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

  return {
    handleExportJSON,
    handleExportCSV,
    handleExportPNG,
  };
}