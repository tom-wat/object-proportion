import { useState, useCallback } from 'react';
import { useHistory } from './useHistory';
import type { AnalysisData, ParentRegion, ChildRegion, GridSettings, ChildGridSettings, ColorSettings, RegionPoint, LayoutFile } from '../types';
import { calculateAspectRatio, calculateChildRatios, convertToGridCoordinates, calculateEdgePositions, calculateGridDimensions, rotatePoint } from '../utils/geometry';
import { getImageFitLayout } from '../utils/imageFit';
import { applyLayoutToState } from '../utils/layoutIO';
import {
  loadGridSettings, saveGridSettings,
  loadChildGridSettings, saveChildGridSettings,
  loadColorSettings, saveColorSettings,
} from '../utils/settingsStorage';

const ORIGIN = { x: 0, y: 0 };

// Helper function to update point coordinates based on child region changes
const updatePointCoordinatesForChildChange = (
  points: RegionPoint[],
  oldChild: ChildRegion,
  newChild: ChildRegion,
  parentRegion: ParentRegion | null,
  unitBasis: 'height' | 'width'
): RegionPoint[] => {
  const cellSize = parentRegion
    ? (unitBasis === 'width' ? parentRegion.width : parentRegion.height) / 16
    : null;

  return points.map(point => {
    if (point.parentRegionId !== oldChild.id) {
      return point;
    }

    // Step 1: Get point position relative to old child region center
    const oldCenterX = oldChild.bounds.x + oldChild.bounds.width / 2;
    const oldCenterY = oldChild.bounds.y + oldChild.bounds.height / 2;

    const pointRelativeToOldCenter = {
      x: point.coordinates.pixel.x - oldCenterX,
      y: point.coordinates.pixel.y - oldCenterY
    };

    // Step 2: Remove old rotation to get non-rotated relative position
    const nonRotatedRelative = rotatePoint(pointRelativeToOldCenter, ORIGIN, -oldChild.rotation);

    // Step 3: Convert to normalized coordinates (0-1 range within old region)
    const normalizedX = nonRotatedRelative.x / (oldChild.bounds.width / 2);
    const normalizedY = nonRotatedRelative.y / (oldChild.bounds.height / 2);

    // Step 4: Scale to new region size
    const newRelativeToCenter = {
      x: normalizedX * (newChild.bounds.width / 2),
      y: normalizedY * (newChild.bounds.height / 2)
    };

    // Step 5: Apply new rotation
    const rotatedRelative = rotatePoint(newRelativeToCenter, ORIGIN, newChild.rotation);

    // Step 6: Calculate final absolute pixel position
    const newCenterX = newChild.bounds.x + newChild.bounds.width / 2;
    const newCenterY = newChild.bounds.y + newChild.bounds.height / 2;
    const newPixelX = newCenterX + rotatedRelative.x;
    const newPixelY = newCenterY + rotatedRelative.y;

    // Recalculate grid coordinates: child center as origin, parent cell size as unit
    const newChildAsParent = {
      x: newChild.bounds.x,
      y: newChild.bounds.y,
      width: newChild.bounds.width,
      height: newChild.bounds.height,
      rotation: newChild.rotation,
      aspectRatio: '',
      aspectRatioDecimal: 0
    };
    const newGridCoords = convertToGridCoordinates(
      { x: newPixelX, y: newPixelY },
      newChildAsParent,
      16,
      cellSize ?? undefined
    );

    return {
      ...point,
      coordinates: {
        pixel: { x: newPixelX, y: newPixelY },
        grid: newGridCoords
      }
    };
  });
};

// Helper function to update point coordinates based on parent region changes
const updatePointCoordinatesForParentChange = (
  points: RegionPoint[],
  oldParent: ParentRegion,
  newParent: ParentRegion
): RegionPoint[] => {
  return points.map(point => {
    // Only update points that belong to parent region (not child regions)
    if (point.parentRegionId !== undefined) {
      return point; // Child region points are handled separately
    }

    // Step 1: Get point position relative to old parent region center
    const oldCenterX = oldParent.x + oldParent.width / 2;
    const oldCenterY = oldParent.y + oldParent.height / 2;
    
    const pointRelativeToOldCenter = {
      x: point.coordinates.pixel.x - oldCenterX,
      y: point.coordinates.pixel.y - oldCenterY
    };

    // Step 2: Remove old rotation to get non-rotated relative position
    const nonRotatedRelative = rotatePoint(pointRelativeToOldCenter, ORIGIN, -oldParent.rotation);

    // Step 3: Convert to normalized coordinates (0-1 range within region)
    const normalizedX = nonRotatedRelative.x / (oldParent.width / 2);
    const normalizedY = nonRotatedRelative.y / (oldParent.height / 2);

    // Step 4: Scale to new region size
    const newRelativeToCenter = {
      x: normalizedX * (newParent.width / 2),
      y: normalizedY * (newParent.height / 2)
    };

    // Step 5: Apply new rotation
    const rotatedRelative = rotatePoint(newRelativeToCenter, ORIGIN, newParent.rotation);

    // Step 6: Calculate final absolute position
    const newCenterX = newParent.x + newParent.width / 2;
    const newCenterY = newParent.y + newParent.height / 2;
    
    const newPixelX = newCenterX + rotatedRelative.x;
    const newPixelY = newCenterY + rotatedRelative.y;

    // For resize operations, maintain grid coordinates
    // For move/rotate operations, update grid coordinates
    const isResize = oldParent.width !== newParent.width || oldParent.height !== newParent.height;
    let newGridCoords = point.coordinates.grid;

    if (!isResize) {
      // For move/rotate, recalculate grid coordinates
      newGridCoords = convertToGridCoordinates({ x: newPixelX, y: newPixelY }, newParent, 16);
    } else {
      // For resize, maintain grid coordinates but update pixel position based on grid
      const gridSize = 16;
      const cellWidth = newParent.width / gridSize;
      const cellHeight = newParent.height / gridSize;
      
      // Calculate pixel position from grid coordinates
      const gridPixelX = newParent.x + (point.coordinates.grid.x + 8) * cellWidth;
      const gridPixelY = newParent.y + (8 - point.coordinates.grid.y) * cellHeight;

      return {
        ...point,
        coordinates: {
          pixel: { x: gridPixelX, y: gridPixelY },
          grid: point.coordinates.grid // Maintain original grid coordinates
        }
      };
    }

    return {
      ...point,
      coordinates: {
        pixel: { x: newPixelX, y: newPixelY },
        grid: newGridCoords
      }
    };
  });
};

export function useAnalysisData(unitBasis: 'height' | 'width' = 'height') {
  // Lazy initializer: read persisted settings once on mount instead of on
  // every render.
  const [analysisData, setAnalysisData] = useState<AnalysisData>(() => ({
    parentRegion: null,
    childRegions: [],
    points: [],
    gridSettings: loadGridSettings(),
    childGridSettings: loadChildGridSettings(),
    colorSettings: loadColorSettings(),
    imageInfo: null,
  }));

  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    clearHistory, 
    recordImmediately, 
    recordWithDebounce,
    commitPending 
  } = useHistory();

  // Helper function to update state with immediate history recording
  const updateStateWithHistory = useCallback((updater: (prev: AnalysisData) => AnalysisData, skipHistory = false) => {
    setAnalysisData(prev => {
      if (!skipHistory) {
        recordImmediately(prev);
      }
      return updater(prev);
    });
  }, [recordImmediately]);

  // Helper function to update state with debounced history recording (for continuous operations)
  const updateStateWithDebouncedHistory = useCallback((updater: (prev: AnalysisData) => AnalysisData) => {
    setAnalysisData(prev => {
      recordWithDebounce(prev);
      return updater(prev);
    });
  }, [recordWithDebounce]);

  const updateChildRegionData = useCallback((
    child: ChildRegion, 
    parent: ParentRegion
  ): ChildRegion => {
    const centerPoint = {
      x: child.bounds.x + child.bounds.width / 2,
      y: child.bounds.y + child.bounds.height / 2
    };
    
    const gridSize = 16; // Fixed 16x16 grid
    
    const gridCoords = convertToGridCoordinates(centerPoint, parent, gridSize);
    const ratios = calculateChildRatios(child.bounds, parent);
    
    const edgePositions = calculateEdgePositions(child.bounds, parent, gridSize, child.rotation);
    const gridDimensions = calculateGridDimensions(child.bounds, parent, gridSize);
    
    const updatedChild: ChildRegion = {
      ...child,
      centerCoordinates: {
        grid: gridCoords,
        pixel: centerPoint
      },
      ratios,
      edgePositions,
      gridDimensions
    };

    return updatedChild;
  }, []);

  const handleParentRegionChange = useCallback((region: ParentRegion | null) => {
    if (region) {
      const aspectRatio = calculateAspectRatio(region.width, region.height);
      const updatedRegion = {
        ...region,
        name: region.name || "Parent Region",
        aspectRatio: aspectRatio.ratio,
        aspectRatioDecimal: aspectRatio.decimal
      };
      
      updateStateWithDebouncedHistory(prev => {
        // If this is the first parent region (from empty state), 
        // the empty state is automatically saved by updateStateWithDebouncedHistory
        
        // Update points coordinates if there was a previous parent region
        let updatedPoints = prev.points;
        if (prev.parentRegion) {
          updatedPoints = updatePointCoordinatesForParentChange(
            prev.points,
            prev.parentRegion,
            updatedRegion
          );
        }

        return {
          ...prev,
          parentRegion: updatedRegion,
          childRegions: prev.childRegions.map(child => updateChildRegionData(child, updatedRegion)),
          points: updatedPoints
        };
      });
    } else {
      updateStateWithHistory(prev => ({
        ...prev,
        parentRegion: null,
        childRegions: [],
        points: []
      }));
    }
  }, [updateChildRegionData, updateStateWithHistory, updateStateWithDebouncedHistory]);

  const handleParentRegionRename = useCallback((name: string) => {
    updateStateWithHistory(prev => ({
      ...prev,
      parentRegion: prev.parentRegion ? { ...prev.parentRegion, name } : null
    }));
  }, [updateStateWithHistory]);

  const handleChildRegionCopy = useCallback((id: number) => {
    updateStateWithHistory(prev => {
      if (!prev.parentRegion) return prev;
      const source = prev.childRegions.find(c => c.id === id);
      if (!source) return prev;
      const newId = Math.max(0, ...prev.childRegions.map(c => c.id)) + 1;
      const copy: ChildRegion = { ...source, id: newId, name: `${source.name} copy` };
      return { ...prev, childRegions: [...prev.childRegions, copy] };
    });
  }, [updateStateWithHistory]);

  const handleChildRegionAdd = useCallback((region: ChildRegion) => {
    updateStateWithHistory(prev => {
      if (!prev.parentRegion) return prev;
      
      const updatedRegion = updateChildRegionData(region, prev.parentRegion);
      return {
        ...prev,
        childRegions: [...prev.childRegions, updatedRegion]
      };
    });
  }, [updateChildRegionData, updateStateWithHistory]);

  const handleChildRegionChange = useCallback((region: ChildRegion) => {
    updateStateWithDebouncedHistory(prev => {
      if (!prev.parentRegion) return prev;
      
      const updatedRegion = updateChildRegionData(region, prev.parentRegion);
      
      // Find the old child region to compare changes
      const oldChild = prev.childRegions.find(child => child.id === region.id);
      let updatedPoints = prev.points;
      
      if (oldChild) {
        // Update points that belong to this child region
        updatedPoints = updatePointCoordinatesForChildChange(
          prev.points,
          oldChild,
          updatedRegion,
          prev.parentRegion,
          unitBasis
        );
      }
      
      return {
        ...prev,
        childRegions: prev.childRegions.map(child => 
          child.id === region.id ? updatedRegion : child
        ),
        points: updatedPoints
      };
    });
  }, [updateChildRegionData, updateStateWithDebouncedHistory, unitBasis]);

  const handleChildRegionDelete = useCallback((id: number) => {
    updateStateWithHistory(prev => ({
      ...prev,
      childRegions: prev.childRegions.filter(child => child.id !== id),
      points: prev.points.filter(point => point.parentRegionId !== id) // Remove points that belonged to this child region
    }));
  }, [updateStateWithHistory]);

  const handleChildRegionRename = useCallback((id: number, name: string) => {
    updateStateWithHistory(prev => ({
      ...prev,
      childRegions: prev.childRegions.map(child => 
        child.id === id ? { ...child, name } : child
      )
    }));
  }, [updateStateWithHistory]);

  const handleGridSettingsChange = useCallback((settings: GridSettings) => {
    saveGridSettings(settings);
    setAnalysisData(prev => ({
      ...prev,
      gridSettings: settings,
      childRegions: prev.parentRegion ? 
        prev.childRegions.map(child => updateChildRegionData(child, prev.parentRegion!)) :
        prev.childRegions
    }));
  }, [updateChildRegionData]);

  const handleChildGridSettingsChange = useCallback((settings: ChildGridSettings) => {
    saveChildGridSettings(settings);
    setAnalysisData(prev => ({
      ...prev,
      childGridSettings: settings
    }));
  }, []);

  const handleColorSettingsChange = useCallback((settings: ColorSettings) => {
    saveColorSettings(settings);
    setAnalysisData(prev => ({
      ...prev,
      colorSettings: settings
    }));
  }, []);

  const handlePointAdd = useCallback((point: Omit<RegionPoint, 'id'>) => {
    updateStateWithHistory(prev => {
      const newId = Math.max(0, ...prev.points.map(p => p.id)) + 1;
      const pointName = point.name || `Point ${newId}`; // Use sequential ID for naming
      return {
        ...prev,
        points: [...prev.points, { ...point, id: newId, name: pointName }]
      };
    });
  }, [updateStateWithHistory]);

  const handlePointDelete = useCallback((id: number) => {
    updateStateWithHistory(prev => ({
      ...prev,
      points: prev.points.filter(point => point.id !== id)
    }));
  }, [updateStateWithHistory]);

  const handlePointRename = useCallback((id: number, name: string) => {
    updateStateWithHistory(prev => ({
      ...prev,
      points: prev.points.map(point => 
        point.id === id ? { ...point, name } : point
      )
    }));
  }, [updateStateWithHistory]);

  const handleClearAll = useCallback(() => {
    updateStateWithHistory(prev => ({
      ...prev,
      parentRegion: null,
      childRegions: [],
      points: [] // Clear all points when clearing all regions
    }));
  }, [updateStateWithHistory]);

  const setImageInfo = useCallback((imageInfo: AnalysisData['imageInfo']) => {
    commitPending(); // Commit any pending debounced history
    clearHistory(); // Clear history when loading new image
    setAnalysisData(prev => ({
      ...prev,
      imageInfo,
      parentRegion: null,
      childRegions: [],
      points: [] // Clear all points when new image is loaded
    }));
  }, [commitPending, clearHistory]);

  const handleImportLayout = useCallback((layout: LayoutFile, currentCanvasSize?: { width: number; height: number }): { scaled: boolean; unitBasis: 'height' | 'width' } => {
    const result = applyLayoutToState(layout, currentCanvasSize);

    commitPending();
    clearHistory();

    const importedChildGridSettings = {
      ...result.childGridSettings,
      lineModuleLength: result.childGridSettings.lineModuleLength || 1,
      lineAngleGuideVisible: result.childGridSettings.lineAngleGuideVisible ?? false
    };
    // Older layout files may lack the dot color fields; default them so both
    // state and persisted settings stay complete.
    const importedColorSettings = {
      dotColor: '#ffffff',
      dotColorOpacity: 1,
      ...(result.colorSettings as Partial<typeof result.colorSettings>),
    } as typeof result.colorSettings;

    saveGridSettings(result.gridSettings);
    saveChildGridSettings(importedChildGridSettings);
    saveColorSettings(importedColorSettings);

    setAnalysisData(prev => ({
      ...prev,
      parentRegion: result.parentRegion,
      childRegions: result.childRegions,
      points: result.points,
      gridSettings: result.gridSettings,
      childGridSettings: importedChildGridSettings,
      colorSettings: importedColorSettings,
    }));

    return { scaled: result.scaled, unitBasis: result.unitBasis };
  }, [commitPending, clearHistory]);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    commitPending(); // Commit any pending history before undo
    const previousState = undo(analysisData);
    if (previousState) {
      // Use direct setAnalysisData to avoid adding undo operation to history
      setAnalysisData(previousState);
    }
  }, [commitPending, undo, analysisData]);

  const handleRedo = useCallback(() => {
    commitPending(); // Commit any pending history before redo
    const nextState = redo(analysisData);
    if (nextState) {
      // Use direct setAnalysisData to avoid adding redo operation to history
      setAnalysisData(nextState);
    }
  }, [commitPending, redo, analysisData]);

  // Create or fit parent region to actual drawn image size
  const handleCreateFullCanvasParent = useCallback((canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    updateStateWithHistory(prev => {
      if (!prev.imageInfo) return prev;

      const canvas = canvasRef.current;
      if (!canvas) return prev;

      // Calculate actual drawn image dimensions
      const ctx = canvas.getContext('2d');
      if (!ctx) return prev;

      const { drawWidth, drawHeight, offsetX, offsetY } = getImageFitLayout(
        canvas.width, canvas.height, prev.imageInfo.width, prev.imageInfo.height
      );

      const aspectRatio = calculateAspectRatio(drawWidth, drawHeight);
      const newParentRegion: ParentRegion = {
        x: offsetX,
        y: offsetY,
        width: drawWidth,
        height: drawHeight,
        rotation: 0,
        name: prev.parentRegion?.name || "Parent Region",
        aspectRatio: aspectRatio.ratio,
        aspectRatioDecimal: aspectRatio.decimal
      };

      return {
        ...prev,
        parentRegion: newParentRegion,
        // Only clear child regions when creating a new parent (not when fitting existing)
        childRegions: prev.parentRegion ? prev.childRegions : []
      };
    });
  }, [updateStateWithHistory]);

  // Fit child region height to image height
  const handleFitChildHeightToImage = useCallback((childId: number, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    updateStateWithHistory(prev => {
      if (!prev.imageInfo || !prev.parentRegion) return prev;

      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const child = prev.childRegions.find(c => c.id === childId);
      if (!child) return prev;

      // Calculate actual drawn image dimensions
      const { drawHeight, offsetY } = getImageFitLayout(
        canvas.width, canvas.height, prev.imageInfo.width, prev.imageInfo.height
      );

      // Update child region bounds
      const childWithNewBounds: ChildRegion = {
        ...child,
        bounds: {
          ...child.bounds,
          y: offsetY,
          height: drawHeight
        }
      };

      // Recalculate all child region data (ratios, centerCoordinates, etc.)
      const updatedChild = updateChildRegionData(childWithNewBounds, prev.parentRegion);

      return {
        ...prev,
        childRegions: prev.childRegions.map(c => c.id === childId ? updatedChild : c)
      };
    });
  }, [updateStateWithHistory, updateChildRegionData]);

  // Fit child region width to image width
  const handleFitChildWidthToImage = useCallback((childId: number, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    updateStateWithHistory(prev => {
      if (!prev.imageInfo || !prev.parentRegion) return prev;

      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const child = prev.childRegions.find(c => c.id === childId);
      if (!child) return prev;

      // Calculate actual drawn image dimensions
      const { drawWidth, offsetX } = getImageFitLayout(
        canvas.width, canvas.height, prev.imageInfo.width, prev.imageInfo.height
      );

      // Update child region bounds
      const childWithNewBounds: ChildRegion = {
        ...child,
        bounds: {
          ...child.bounds,
          x: offsetX,
          width: drawWidth
        }
      };

      // Recalculate all child region data (ratios, centerCoordinates, etc.)
      const updatedChild = updateChildRegionData(childWithNewBounds, prev.parentRegion);

      return {
        ...prev,
        childRegions: prev.childRegions.map(c => c.id === childId ? updatedChild : c)
      };
    });
  }, [updateStateWithHistory, updateChildRegionData]);

  return {
    analysisData,
    handleParentRegionChange,
    handleParentRegionRename,
    handleChildRegionAdd,
    handleChildRegionCopy,
    handleChildRegionChange,
    handleChildRegionDelete,
    handleChildRegionRename,
    handleGridSettingsChange,
    handleChildGridSettingsChange,
    handleColorSettingsChange,
    handlePointAdd,
    handlePointDelete,
    handlePointRename,
    handleClearAll,
    setImageInfo,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleCreateFullCanvasParent,
    handleFitChildHeightToImage,
    handleFitChildWidthToImage,
    handleImportLayout,
  };
}