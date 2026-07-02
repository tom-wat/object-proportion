import type { GridSettings, ChildGridSettings, ColorSettings } from '../types';

// Typed localStorage persistence for toolbar settings. Keeps the historical
// per-key storage format (property name == storage key, except
// gridSettings.visible which lives under 'parentGridVisible'), so existing
// saved settings keep working without migration.

const str = (key: string, fallback: string): string =>
  localStorage.getItem(key) ?? fallback;

const num = (key: string, fallback: number): number =>
  parseFloat(localStorage.getItem(key) ?? String(fallback));

const bool = (key: string): boolean =>
  localStorage.getItem(key) === 'true';

function saveByPropertyName(settings: object): void {
  for (const [key, value] of Object.entries(settings)) {
    localStorage.setItem(key, String(value));
  }
}

export function loadGridSettings(): GridSettings {
  // Historical quirk: parent grid defaults to visible, so absence != false.
  return { visible: localStorage.getItem('parentGridVisible') !== 'false' };
}

export function saveGridSettings(settings: GridSettings): void {
  localStorage.setItem('parentGridVisible', String(settings.visible));
}

export function loadChildGridSettings(): ChildGridSettings {
  return {
    rectVisible: bool('rectVisible'),
    circleVisible: bool('circleVisible'),
    lineModuleVisible: bool('lineModuleVisible'),
    circleModuleVisible: bool('circleModuleVisible'),
    lineModuleLength: Number(localStorage.getItem('lineModuleLength')) || 1,
    lineAngleGuideVisible: bool('lineAngleGuideVisible'),
  };
}

export function saveChildGridSettings(settings: ChildGridSettings): void {
  saveByPropertyName(settings);
}

export function loadColorSettings(): ColorSettings {
  return {
    parentColor: str('parentColor', '#3b82f6'),
    parentColorOpacity: num('parentColorOpacity', 1),
    childRectColor: str('childRectColor', '#3b82f6'),
    childRectColorOpacity: num('childRectColorOpacity', 1),
    childCircleColor: str('childCircleColor', '#3b82f6'),
    childCircleColorOpacity: num('childCircleColorOpacity', 1),
    childLineColor: str('childLineColor', '#3b82f6'),
    childLineColorOpacity: num('childLineColorOpacity', 1),
    gridColor: str('gridColor', '#ffffff'),
    gridOpacity: num('gridOpacity', 0.5),
    childRectGridColor: str('childRectGridColor', '#ffffff'),
    childCircleGridColor: str('childCircleGridColor', '#ffffff'),
    childRectGridOpacity: num('childRectGridOpacity', 0.3),
    childCircleGridOpacity: num('childCircleGridOpacity', 0.3),
    lineModuleColor: str('lineModuleColor', '#3b82f6'),
    lineModuleOpacity: num('lineModuleOpacity', 0.5),
    circleModuleColor: str('circleModuleColor', '#3b82f6'),
    circleModuleOpacity: num('circleModuleOpacity', 0.5),
    dotColor: str('dotColor', '#ffffff'),
    dotColorOpacity: num('dotColorOpacity', 1),
  };
}

export function saveColorSettings(settings: ColorSettings): void {
  saveByPropertyName(settings);
}

export function loadUnitBasis(): 'height' | 'width' {
  return localStorage.getItem('unitBasis') === 'width' ? 'width' : 'height';
}

export function saveUnitBasis(basis: 'height' | 'width'): void {
  localStorage.setItem('unitBasis', basis);
}
