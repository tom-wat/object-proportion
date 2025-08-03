import { useState, useCallback } from 'react';
import type { AnalysisData, ParentRegion, ChildRegion, GridSettings, ColorSettings } from '../types';
import { calculateAspectRatio, calculateChildRatios, convertToGridCoordinates, calculateOutsideDistance, isPointInRotatedBounds } from '../utils/geometry';

export function useAnalysisData() {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    parentRegion: null,
    childRegions: [],
    gridSettings: {
      type: '16x16',
      visible: true
    },
    colorSettings: {
      parentColor: '#3b82f6',
      childColor: '#3b82f6',
      gridColor: '#ffffff',
      gridOpacity: 0.5
    },
    imageInfo: null
  });

  const updateChildRegionData = useCallback((
    child: ChildRegion, 
    parent: ParentRegion, 
    gridSettings: GridSettings
  ): ChildRegion => {
    const centerPoint = {
      x: child.bounds.x + child.bounds.width / 2,
      y: child.bounds.y + child.bounds.height / 2
    };
    
    const isInside = isPointInRotatedBounds(centerPoint, parent);
    const gridSize = gridSettings.type === 'custom' ? 
      (gridSettings.customSize || 16) : 
      parseInt(gridSettings.type.split('x')[0]);
    
    const gridCoords = convertToGridCoordinates(centerPoint, parent, gridSize);
    const ratios = calculateChildRatios(child.bounds, parent);
    
    const updatedChild: ChildRegion = {
      ...child,
      isInside,
      centerCoordinates: {
        grid: gridCoords,
        pixel: centerPoint
      },
      ratios
    };

    if (!isInside) {
      updatedChild.outsideInfo = calculateOutsideDistance(child.bounds, parent);
    }

    return updatedChild;
  }, []);

  const handleParentRegionChange = useCallback((region: ParentRegion | null) => {
    if (region) {
      const aspectRatio = calculateAspectRatio(region.width, region.height);
      const updatedRegion = {
        ...region,
        aspectRatio: aspectRatio.ratio,
        aspectRatioDecimal: aspectRatio.decimal
      };
      
      setAnalysisData(prev => ({
        ...prev,
        parentRegion: updatedRegion,
        childRegions: prev.childRegions.map(child => updateChildRegionData(child, updatedRegion, prev.gridSettings))
      }));
    } else {
      setAnalysisData(prev => ({
        ...prev,
        parentRegion: null,
        childRegions: []
      }));
    }
  }, [updateChildRegionData]);

  const handleChildRegionAdd = useCallback((region: ChildRegion) => {
    setAnalysisData(prev => {
      if (!prev.parentRegion) return prev;
      
      const updatedRegion = updateChildRegionData(region, prev.parentRegion, prev.gridSettings);
      return {
        ...prev,
        childRegions: [...prev.childRegions, updatedRegion]
      };
    });
  }, [updateChildRegionData]);

  const handleChildRegionDelete = useCallback((id: number) => {
    setAnalysisData(prev => ({
      ...prev,
      childRegions: prev.childRegions.filter(child => child.id !== id)
    }));
  }, []);

  const handleChildRegionRename = useCallback((id: number, name: string) => {
    setAnalysisData(prev => ({
      ...prev,
      childRegions: prev.childRegions.map(child => 
        child.id === id ? { ...child, name } : child
      )
    }));
  }, []);

  const handleGridSettingsChange = useCallback((settings: GridSettings) => {
    setAnalysisData(prev => ({
      ...prev,
      gridSettings: settings,
      childRegions: prev.parentRegion ? 
        prev.childRegions.map(child => updateChildRegionData(child, prev.parentRegion!, settings)) :
        prev.childRegions
    }));
  }, [updateChildRegionData]);

  const handleColorSettingsChange = useCallback((settings: ColorSettings) => {
    setAnalysisData(prev => ({
      ...prev,
      colorSettings: settings
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setAnalysisData(prev => ({
      ...prev,
      parentRegion: null,
      childRegions: []
    }));
  }, []);

  const setImageInfo = useCallback((imageInfo: AnalysisData['imageInfo']) => {
    setAnalysisData(prev => ({
      ...prev,
      imageInfo,
      parentRegion: null,
      childRegions: []
    }));
  }, []);

  return {
    analysisData,
    handleParentRegionChange,
    handleChildRegionAdd,
    handleChildRegionDelete,
    handleChildRegionRename,
    handleGridSettingsChange,
    handleColorSettingsChange,
    handleClearAll,
    setImageInfo,
  };
}