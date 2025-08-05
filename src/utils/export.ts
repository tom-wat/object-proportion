import type { AnalysisData, ChildRegion } from '../types';

export function exportToJSON(data: AnalysisData): string {
  return JSON.stringify(data, null, 2);
}

export function exportToCSV(data: AnalysisData): string {
  if (!data.parentRegion || data.childRegions.length === 0) {
    return '';
  }

  const headers = [
    'ID', 'Name', 'GridX', 'GridY', 'PixelX', 'PixelY',
    'BoundsX', 'BoundsY', 'Width', 'Height', 
    'AreaRatio', 'GridWidth', 'GridHeight',
    'LeftEdgeX', 'RightEdgeX', 'TopEdgeY', 'BottomEdgeY'
  ];

  const rows = data.childRegions.map((child: ChildRegion) => [
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
    child.ratios.areaRatio,
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