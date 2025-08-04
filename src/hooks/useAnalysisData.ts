import { useState, useCallback } from 'react';
import type { AnalysisData, ParentRegion, ChildRegion, GridSettings, ChildGridSettings, ColorSettings } from '../types';
import { calculateAspectRatio, calculateChildRatios, convertToGridCoordinates, calculateOutsideDistance, isPointInRotatedBounds } from '../utils/geometry';

export function useAnalysisData() {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    parentRegion: null,
    childRegions: [],
    gridSettings: {
      visible: true
    },
    childGridSettings: {
      visible: false
    },
    colorSettings: {
      parentColor: '#3b82f6',
      childColor: '#3b82f6',
      gridColor: '#ffffff',
      gridOpacity: 0.5,
      childGridColor: '#ffffff',
      childGridOpacity: 0.3
    },
    imageInfo: null
  });

  const updateChildRegionData = useCallback((
    child: ChildRegion, 
    parent: ParentRegion
  ): ChildRegion => {
    const centerPoint = {
      x: child.bounds.x + child.bounds.width / 2,
      y: child.bounds.y + child.bounds.height / 2
    };
    
    const isInside = isPointInRotatedBounds(centerPoint, parent);
    const gridSize = 16; // Fixed 16x16 grid
    
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
        childRegions: prev.childRegions.map(child => updateChildRegionData(child, updatedRegion))
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
      
      const updatedRegion = updateChildRegionData(region, prev.parentRegion);
      return {
        ...prev,
        childRegions: [...prev.childRegions, updatedRegion]
      };
    });
  }, [updateChildRegionData]);

  const handleChildRegionChange = useCallback((region: ChildRegion) => {
    setAnalysisData(prev => {
      if (!prev.parentRegion) return prev;
      
      const updatedRegion = updateChildRegionData(region, prev.parentRegion);
      return {
        ...prev,
        childRegions: prev.childRegions.map(child => 
          child.id === region.id ? updatedRegion : child
        )
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
        prev.childRegions.map(child => updateChildRegionData(child, prev.parentRegion!)) :
        prev.childRegions
    }));
  }, [updateChildRegionData]);

  const handleChildGridSettingsChange = useCallback((settings: ChildGridSettings) => {
    setAnalysisData(prev => ({
      ...prev,
      childGridSettings: settings
    }));
  }, []);

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
    handleChildRegionChange,
    handleChildRegionDelete,
    handleChildRegionRename,
    handleGridSettingsChange,
    handleChildGridSettingsChange,
    handleColorSettingsChange,
    handleClearAll,
    setImageInfo,
  };
}