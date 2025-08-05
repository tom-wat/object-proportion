import { useState, useCallback } from 'react';
import type { AnalysisData, ParentRegion, ChildRegion, GridSettings, ChildGridSettings, ColorSettings, RegionPoint, Point } from '../types';
import { calculateAspectRatio, calculateChildRatios, convertToGridCoordinates, calculateEdgePositions, calculateGridDimensions } from '../utils/geometry';

// Helper function to update point coordinates based on child region changes
const updatePointCoordinatesForChildChange = (
  points: RegionPoint[],
  oldChild: ChildRegion,
  newChild: ChildRegion
): RegionPoint[] => {
  return points.map(point => {
    // Only update points that belong to this specific child region
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
    let nonRotatedRelative = pointRelativeToOldCenter;
    if (oldChild.rotation !== 0) {
      const cos = Math.cos(-oldChild.rotation); // Inverse rotation
      const sin = Math.sin(-oldChild.rotation);
      
      nonRotatedRelative = {
        x: pointRelativeToOldCenter.x * cos - pointRelativeToOldCenter.y * sin,
        y: pointRelativeToOldCenter.x * sin + pointRelativeToOldCenter.y * cos
      };
    }

    // Step 3: Convert to normalized coordinates (0-1 range within region)
    const normalizedX = nonRotatedRelative.x / (oldChild.bounds.width / 2);
    const normalizedY = nonRotatedRelative.y / (oldChild.bounds.height / 2);

    // Step 4: Scale to new region size
    const newRelativeToCenter = {
      x: normalizedX * (newChild.bounds.width / 2),
      y: normalizedY * (newChild.bounds.height / 2)
    };

    // Step 5: Apply new rotation
    let rotatedRelative = newRelativeToCenter;
    if (newChild.rotation !== 0) {
      const cos = Math.cos(newChild.rotation);
      const sin = Math.sin(newChild.rotation);
      
      rotatedRelative = {
        x: newRelativeToCenter.x * cos - newRelativeToCenter.y * sin,
        y: newRelativeToCenter.x * sin + newRelativeToCenter.y * cos
      };
    }

    // Step 6: Calculate final absolute position
    const newCenterX = newChild.bounds.x + newChild.bounds.width / 2;
    const newCenterY = newChild.bounds.y + newChild.bounds.height / 2;
    
    const newPixelX = newCenterX + rotatedRelative.x;
    const newPixelY = newCenterY + rotatedRelative.y;

    // For resize operations, maintain grid coordinates
    // For move/rotate operations, update grid coordinates
    const isResize = oldChild.bounds.width !== newChild.bounds.width || 
                    oldChild.bounds.height !== newChild.bounds.height;
    let newGridCoords = point.coordinates.grid;

    if (!isResize) {
      // For move/rotate, recalculate grid coordinates based on child region
      const childRegionAsParent = {
        x: newChild.bounds.x,
        y: newChild.bounds.y,
        width: newChild.bounds.width,
        height: newChild.bounds.height,
        rotation: newChild.rotation,
        aspectRatio: '',
        aspectRatioDecimal: 0
      };
      newGridCoords = convertToGridCoordinates({ x: newPixelX, y: newPixelY }, childRegionAsParent, 16);
    } else {
      // For resize, maintain grid coordinates but update pixel position based on grid
      const gridSize = 16;
      const cellWidth = newChild.bounds.width / gridSize;
      const cellHeight = newChild.bounds.height / gridSize;
      
      // Calculate pixel position from grid coordinates
      const gridPixelX = newChild.bounds.x + (point.coordinates.grid.x + 8) * cellWidth;
      const gridPixelY = newChild.bounds.y + (8 - point.coordinates.grid.y) * cellHeight;

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
    let nonRotatedRelative = pointRelativeToOldCenter;
    if (oldParent.rotation !== 0) {
      const cos = Math.cos(-oldParent.rotation); // Inverse rotation
      const sin = Math.sin(-oldParent.rotation);
      
      nonRotatedRelative = {
        x: pointRelativeToOldCenter.x * cos - pointRelativeToOldCenter.y * sin,
        y: pointRelativeToOldCenter.x * sin + pointRelativeToOldCenter.y * cos
      };
    }

    // Step 3: Convert to normalized coordinates (0-1 range within region)
    const normalizedX = nonRotatedRelative.x / (oldParent.width / 2);
    const normalizedY = nonRotatedRelative.y / (oldParent.height / 2);

    // Step 4: Scale to new region size
    const newRelativeToCenter = {
      x: normalizedX * (newParent.width / 2),
      y: normalizedY * (newParent.height / 2)
    };

    // Step 5: Apply new rotation
    let rotatedRelative = newRelativeToCenter;
    if (newParent.rotation !== 0) {
      const cos = Math.cos(newParent.rotation);
      const sin = Math.sin(newParent.rotation);
      
      rotatedRelative = {
        x: newRelativeToCenter.x * cos - newRelativeToCenter.y * sin,
        y: newRelativeToCenter.x * sin + newRelativeToCenter.y * cos
      };
    }

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

export function useAnalysisData() {
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    parentRegion: null,
    childRegions: [],
    points: [],
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
    
    const gridSize = 16; // Fixed 16x16 grid
    
    const gridCoords = convertToGridCoordinates(centerPoint, parent, gridSize);
    const ratios = calculateChildRatios(child.bounds, parent);
    
    const edgePositions = calculateEdgePositions(child.bounds, parent, gridSize);
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
        aspectRatio: aspectRatio.ratio,
        aspectRatioDecimal: aspectRatio.decimal
      };
      
      setAnalysisData(prev => {
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
      setAnalysisData(prev => ({
        ...prev,
        parentRegion: null,
        childRegions: [],
        points: []
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
      
      // Find the old child region to compare changes
      const oldChild = prev.childRegions.find(child => child.id === region.id);
      let updatedPoints = prev.points;
      
      if (oldChild) {
        // Update points that belong to this child region
        updatedPoints = updatePointCoordinatesForChildChange(
          prev.points,
          oldChild,
          updatedRegion
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
  }, [updateChildRegionData]);

  const handleChildRegionDelete = useCallback((id: number) => {
    setAnalysisData(prev => ({
      ...prev,
      childRegions: prev.childRegions.filter(child => child.id !== id),
      points: prev.points.filter(point => point.parentRegionId !== id) // Remove points that belonged to this child region
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



  const handlePointAdd = useCallback((point: Omit<RegionPoint, 'id'>) => {
    setAnalysisData(prev => {
      const newId = Math.max(0, ...prev.points.map(p => p.id)) + 1;
      const pointName = point.name || `Point ${newId}`; // Use sequential ID for naming
      return {
        ...prev,
        points: [...prev.points, { ...point, id: newId, name: pointName }]
      };
    });
  }, []);

  const handlePointDelete = useCallback((id: number) => {
    setAnalysisData(prev => ({
      ...prev,
      points: prev.points.filter(point => point.id !== id)
    }));
  }, []);

  const handlePointRename = useCallback((id: number, name: string) => {
    setAnalysisData(prev => ({
      ...prev,
      points: prev.points.map(point => 
        point.id === id ? { ...point, name } : point
      )
    }));
  }, []);

  const handlePointUpdate = useCallback((id: number, newCoordinates: { pixel: Point; grid: Point }) => {
    setAnalysisData(prev => ({
      ...prev,
      points: prev.points.map(point => 
        point.id === id ? { ...point, coordinates: newCoordinates } : point
      )
    }));
  }, []);

  const handleClearAll = useCallback(() => {
    setAnalysisData(prev => ({
      ...prev,
      parentRegion: null,
      childRegions: [],
      points: [] // Clear all points when clearing all regions
    }));
  }, []);

  const setImageInfo = useCallback((imageInfo: AnalysisData['imageInfo']) => {
    setAnalysisData(prev => ({
      ...prev,
      imageInfo,
      parentRegion: null,
      childRegions: [],
      points: [] // Clear all points when new image is loaded
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
    handlePointAdd,
    handlePointDelete,
    handlePointRename,
    handlePointUpdate,
    handleClearAll,
    setImageInfo,
  };
}