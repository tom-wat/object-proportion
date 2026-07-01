import { useCallback } from 'react';
import type { AnalysisData, Point, Bounds } from '../types';
import { downloadFile } from '../utils/export';
import { exportLayout } from '../utils/layoutIO';
import { hexToRgba } from '../utils/color';
import { getImageFitLayout } from '../utils/imageFit';
import {
  drawGridLines,
  drawCircleModuleRows,
  drawLineModuleDots,
  drawLineAngleGuide,
  drawPointMarkers,
  type RotatableRect,
} from '../utils/overlayRenderer';

interface UseExportProps {
  analysisData: AnalysisData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  cachedImage?: HTMLImageElement | null;
  unitBasis?: 'height' | 'width';
}

export function useExport({ analysisData, canvasRef, cachedImage, unitBasis = 'height' }: UseExportProps) {
  // Renders the image (optionally) plus all overlays onto an offscreen canvas
  // at the original image resolution and downloads it as PNG.
  const exportComposite = useCallback(({ drawBackground }: { drawBackground: boolean }) => {
    if (!analysisData.imageInfo || (drawBackground && !cachedImage)) {
      alert('Image not loaded');
      return;
    }

    if (!canvasRef?.current) {
      alert('Canvas not available for export');
      return;
    }

    if (!drawBackground && !analysisData.parentRegion && analysisData.childRegions.length === 0) {
      alert('No regions to export');
      return;
    }

    const errorMessage = drawBackground ? 'Failed to export PNG' : 'Failed to export overlay PNG';

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

      if (drawBackground && cachedImage) {
        ctx.drawImage(cachedImage, 0, 0);
      }
      // Otherwise: transparent background – do NOT draw the image

      // Calculate scaling factors from display canvas to original image
      const displayCanvas = canvasRef.current;
      const { drawWidth, drawHeight, offsetX, offsetY } = getImageFitLayout(
        displayCanvas.width, displayCanvas.height,
        analysisData.imageInfo.width, analysisData.imageInfo.height
      );

      const scaleX = analysisData.imageInfo.width / drawWidth;
      const scaleY = analysisData.imageInfo.height / drawHeight;

      // Map display-canvas coordinates into image space
      const mapPoint = (p: Point): Point => ({
        x: (p.x - offsetX) * scaleX,
        y: (p.y - offsetY) * scaleY,
      });
      const mapRect = (bounds: Bounds, rotation: number): RotatableRect => ({
        x: (bounds.x - offsetX) * scaleX,
        y: (bounds.y - offsetY) * scaleY,
        width: bounds.width * scaleX,
        height: bounds.height * scaleY,
        rotation,
      });

      // Region frames use a fixed 2px width in image space (intentionally
      // different from the screen's 1.5/zoom) and stay export-local.
      const drawRotatedRect = (region: RotatableRect, color: string, lineWidth: number) => {
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

      const cs = analysisData.colorSettings;

      // Draw parent region and grid if exists
      if (analysisData.parentRegion) {
        const scaledParent = mapRect(analysisData.parentRegion, analysisData.parentRegion.rotation);

        if (analysisData.gridSettings.visible) {
          drawGridLines(ctx, scaledParent, cs.gridColor, cs.gridOpacity, 1, { unitBasis });
        }

        drawRotatedRect(scaledParent, hexToRgba(cs.parentColor, cs.parentColorOpacity ?? 1), 2);
      }

      // Parent basis in image space, shared by child grids and modules
      const scaledParentBasis = analysisData.parentRegion
        ? (unitBasis === 'width' ? analysisData.parentRegion.width * scaleX : analysisData.parentRegion.height * scaleY)
        : undefined;
      const parentCellSize = scaledParentBasis !== undefined ? scaledParentBasis / 16 : undefined;

      // Draw child regions and grids
      analysisData.childRegions.forEach((child) => {
        const scaledChild = mapRect(child.bounds, child.rotation);
        const isChildRect = !child.shape || child.shape === 'rectangle';
        const isChildCircle = child.shape === 'circle';

        // Draw child grid if visible (shape-specific)
        if ((isChildRect && analysisData.childGridSettings.rectVisible) ||
            (isChildCircle && analysisData.childGridSettings.circleVisible)) {
          const childGridColor = isChildCircle ? cs.childCircleGridColor : cs.childRectGridColor;
          const childGridOpacity = isChildCircle ? cs.childCircleGridOpacity : cs.childRectGridOpacity;
          drawGridLines(ctx, scaledChild, childGridColor, childGridOpacity, 1, {
            unitBasis,
            cellSizeOverride: parentCellSize,
            clipToEllipse: isChildCircle,
            subdivide: !isChildCircle,
          });
        }

        // Draw line angle guide if visible
        if (child.shape === 'line' && analysisData.childGridSettings.lineAngleGuideVisible && child.lineStart && child.lineEnd) {
          drawLineAngleGuide(ctx, mapPoint(child.lineStart), mapPoint(child.lineEnd), cs.lineModuleColor, cs.lineModuleOpacity, 1);
        }

        // Draw circle modules if visible
        if (isChildCircle && analysisData.childGridSettings.circleModuleVisible && scaledParentBasis !== undefined) {
          drawCircleModuleRows(ctx, scaledChild, cs.circleModuleColor, cs.circleModuleOpacity, 1, scaledParentBasis);
        }

        // Draw child region frame based on shape
        ctx.save();
        const childShapeColor = isChildCircle
          ? hexToRgba(cs.childCircleColor, cs.childCircleColorOpacity ?? 1)
          : child.shape === 'line'
            ? hexToRgba(cs.childLineColor, cs.childLineColorOpacity ?? 1)
            : hexToRgba(cs.childRectColor, cs.childRectColorOpacity ?? 1);
        ctx.strokeStyle = childShapeColor;
        ctx.lineWidth = 2;

        if (child.shape === 'circle') {
          const cx = scaledChild.x + scaledChild.width / 2;
          const cy = scaledChild.y + scaledChild.height / 2;
          if (scaledChild.rotation) {
            ctx.translate(cx, cy);
            ctx.rotate(scaledChild.rotation);
            ctx.translate(-cx, -cy);
          }
          ctx.beginPath();
          ctx.ellipse(cx, cy, scaledChild.width / 2, scaledChild.height / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (child.shape === 'line' && child.lineStart && child.lineEnd) {
          const start = mapPoint(child.lineStart);
          const end = mapPoint(child.lineEnd);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        } else {
          // Rectangle (default)
          drawRotatedRect(scaledChild, childShapeColor, 2);
        }

        ctx.restore();

        // Draw line module dots on top of the line stroke (dots sit on the
        // line's centerline, so they must be drawn after the line itself).
        if (child.shape === 'line' && analysisData.childGridSettings.lineModuleVisible &&
            scaledParentBasis !== undefined && child.lineStart && child.lineEnd) {
          const scaledModuleLength = (analysisData.childGridSettings.lineModuleLength ?? 1) * scaledParentBasis / 16;
          drawLineModuleDots(ctx, mapPoint(child.lineStart), mapPoint(child.lineEnd), cs.lineModuleColor, cs.lineModuleOpacity, 1, scaledModuleLength);
        }
      });

      // Draw points
      if (analysisData.points.length > 0) {
        const markers = analysisData.points.map(point => ({
          pixel: mapPoint(point.coordinates.pixel),
          parentRegionId: point.parentRegionId,
        }));
        drawPointMarkers(ctx, markers, cs, analysisData.childRegions, null, 1);
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
        link.download = `${drawBackground ? 'analysis' : 'overlay'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      alert(errorMessage);
    }
  }, [analysisData, canvasRef, cachedImage, unitBasis]);

  const handleExportPNG = useCallback(() => exportComposite({ drawBackground: true }), [exportComposite]);

  const handleExportPNGOverlayOnly = useCallback(() => exportComposite({ drawBackground: false }), [exportComposite]);

  const handleExportLayout = useCallback(() => {
    if (!analysisData.imageInfo) {
      alert('Image not loaded');
      return;
    }
    try {
      const canvas = canvasRef?.current;
      const canvasSize = canvas ? { width: canvas.width, height: canvas.height } : undefined;
      const json = exportLayout(analysisData, unitBasis, canvasSize);
      downloadFile(json, `layout-${Date.now()}.json`, 'application/json');
    } catch (error) {
      console.error('Failed to export layout:', error);
      alert('Failed to export layout');
    }
  }, [analysisData, unitBasis, canvasRef]);

  return {
    handleExportPNG,
    handleExportPNGOverlayOnly,
    handleExportLayout,
  };
}
