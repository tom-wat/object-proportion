import type { AnalysisData, LayoutFile } from '../types';

export function exportLayout(analysisData: AnalysisData, unitBasis: 'height' | 'width'): string {
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
    parentRegion: analysisData.parentRegion,
    childRegions: analysisData.childRegions,
    points: analysisData.points,
    gridSettings: analysisData.gridSettings,
    childGridSettings: analysisData.childGridSettings,
    colorSettings: analysisData.colorSettings,
    imageRotation: analysisData.imageRotation,
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
    'imageRotation', 'unitBasis',
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
  'parentRegion' | 'childRegions' | 'points' | 'gridSettings' | 'childGridSettings' | 'colorSettings' | 'imageRotation'
> & {
  unitBasis: 'height' | 'width';
  scaled: boolean;
};

export function applyLayoutToState(layout: LayoutFile): ApplyLayoutResult {
  return {
    parentRegion: layout.parentRegion,
    childRegions: layout.childRegions,
    points: layout.points,
    gridSettings: layout.gridSettings,
    childGridSettings: layout.childGridSettings,
    colorSettings: layout.colorSettings,
    imageRotation: layout.imageRotation,
    unitBasis: layout.unitBasis,
    scaled: false,
  };
}
