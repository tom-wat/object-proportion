import type { AnalysisData, ChildRegion } from '../types';

// Helper function to round numbers consistently with UI display
function roundForExport(value: number, decimals: number = 1): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Helper function to create a rounded copy of the data for export
function createRoundedData(data: AnalysisData): AnalysisData {
  const roundedData = { ...data };
  
  // Round parent region data
  if (roundedData.parentRegion) {
    roundedData.parentRegion = {
      ...roundedData.parentRegion,
      x: Math.round(roundedData.parentRegion.x),
      y: Math.round(roundedData.parentRegion.y),
      width: Math.round(roundedData.parentRegion.width),
      height: Math.round(roundedData.parentRegion.height),
      aspectRatioDecimal: roundForExport(roundedData.parentRegion.aspectRatioDecimal, 2),
      rotation: Math.round(roundedData.parentRegion.rotation * 180 / Math.PI) // Convert to degrees and round
    };
  }
  
  // Round child regions data
  roundedData.childRegions = roundedData.childRegions.map(child => ({
    ...child,
    centerCoordinates: {
      grid: {
        x: roundForExport(child.centerCoordinates.grid.x),
        y: roundForExport(child.centerCoordinates.grid.y)
      },
      pixel: {
        x: Math.round(child.centerCoordinates.pixel.x),
        y: Math.round(child.centerCoordinates.pixel.y)
      }
    },
    bounds: {
      x: Math.round(child.bounds.x),
      y: Math.round(child.bounds.y),
      width: Math.round(child.bounds.width),
      height: Math.round(child.bounds.height)
    },
    rotation: Math.round(child.rotation * 180 / Math.PI), // Convert to degrees and round
    ratios: {
      areaRatio: roundForExport(child.ratios.areaRatio * 100), // Convert to percentage and round
      widthRatio: Math.round(child.ratios.widthRatio * 100), // Convert to percentage and round to integer
      heightRatio: Math.round(child.ratios.heightRatio * 100) // Convert to percentage and round to integer
    },
    edgePositions: child.edgePositions ? {
      left: roundForExport(child.edgePositions.left),
      right: roundForExport(child.edgePositions.right),
      top: roundForExport(child.edgePositions.top),
      bottom: roundForExport(child.edgePositions.bottom)
    } : undefined,
    gridDimensions: child.gridDimensions ? {
      gridWidth: roundForExport(child.gridDimensions.gridWidth),
      gridHeight: roundForExport(child.gridDimensions.gridHeight)
    } : undefined
  }));
  
  // Round points data
  roundedData.points = roundedData.points.map(point => ({
    ...point,
    coordinates: {
      pixel: {
        x: Math.round(point.coordinates.pixel.x),
        y: Math.round(point.coordinates.pixel.y)
      },
      grid: {
        x: roundForExport(point.coordinates.grid.x),
        y: roundForExport(point.coordinates.grid.y)
      }
    }
  }));
  
  return roundedData;
}

export function exportToJSON(data: AnalysisData): string {
  const roundedData = createRoundedData(data);
  return JSON.stringify(roundedData, null, 2);
}

export function exportToCSV(data: AnalysisData): string {
  if (!data.parentRegion || data.childRegions.length === 0) {
    return '';
  }

  const roundedData = createRoundedData(data);

  const headers = [
    'ID', 'Name', 'GridX', 'GridY', 'PixelX', 'PixelY',
    'BoundsX', 'BoundsY', 'Width', 'Height', 
    'AreaRatio(%)', 'GridWidth', 'GridHeight',
    'LeftEdgeX', 'RightEdgeX', 'TopEdgeY', 'BottomEdgeY'
  ];

  const rows = roundedData.childRegions.map((child: ChildRegion) => [
    child.id,
    child.name,
    child.centerCoordinates.grid.x,
    child.centerCoordinates.grid.y,
    child.centerCoordinates.pixel.x,
    child.centerCoordinates.pixel.y,
    child.bounds.x,
    child.bounds.y,
    child.bounds.width,
    child.bounds.height,
    child.ratios.areaRatio, // Already converted to percentage in roundedData
    child.gridDimensions?.gridWidth || '',
    child.gridDimensions?.gridHeight || '',
    child.edgePositions?.left || '',
    child.edgePositions?.right || '',
    child.edgePositions?.top || '',
    child.edgePositions?.bottom || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}