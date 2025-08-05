import React from 'react';
import type { SelectionMode, ParentRegion, ChildRegion, GridSettings, ChildGridSettings, ColorSettings, RegionPoint } from '../types';
import { useImageCanvas } from '../hooks/useImageCanvas';


interface ImageCanvasProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionChange?: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  onParentDeselect?: () => void;
  onParentSelect?: () => void;
  onSelectionModeChange?: (mode: SelectionMode) => void;
  gridSettings: GridSettings;
  childGridSettings: ChildGridSettings;
  colorSettings: ColorSettings;
  points: RegionPoint[];
  selectedPointId?: number | null;
  onPointAdd: (point: Omit<RegionPoint, 'id'>) => void;
  imageFile: File | null;
  cachedImage?: HTMLImageElement | null;
  isParentSelected?: boolean;
  className?: string;
}

export function ImageCanvas({
  selectionMode,
  parentRegion,
  childRegions,
  gridSettings,
  childGridSettings,
  colorSettings,
  onParentRegionChange,
  onChildRegionAdd,
  onChildRegionChange,
  onChildRegionSelect,
  selectedChildId,
  onParentDeselect,
  onParentSelect,
  onSelectionModeChange,
  points,
  selectedPointId,
  onPointAdd,
  imageFile,
  cachedImage,
  isParentSelected,
  className = ''
}: ImageCanvasProps) {
  
  const { canvasRef, loadImage, loadImageFromCached, zoom, zoomIn, zoomOut, resetZoom } = useImageCanvas({
    selectionMode,
    parentRegion,
    childRegions,
    onParentRegionChange,
    onChildRegionAdd,
    onChildRegionChange,
    onChildRegionSelect,
    selectedChildId,
    isParentSelected,
    onParentDeselect,
    onParentSelect,
    onSelectionModeChange,
    points,
    selectedPointId,
    onPointAdd,
    colorSettings,
    gridSettings,
    childGridSettings
  });

  React.useEffect(() => {
    if (cachedImage && loadImageFromCached) {
      // Use cached image for better performance
      loadImageFromCached(cachedImage);
    } else if (imageFile && loadImage) {
      // Fallback to loading from file
      loadImage(imageFile);
    }
  }, [imageFile, cachedImage, loadImage, loadImageFromCached]);



  return (
    <div className={`w-full h-full bg-gray-100 ${className}`}>
      <div className="w-full h-full flex justify-center items-center overflow-hidden relative">

        <canvas
          ref={canvasRef}
          style={{
            imageRendering: 'pixelated',
            position: 'relative',
            zIndex: 2
          }}
          className="w-full h-full"
        />

        {/* Zoom Controls - positioned relative to canvas */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
          <button 
            onClick={zoomIn}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm shadow-sm"
            title="Zoom In"
          >
            +
          </button>
          <button 
            onClick={zoomOut}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm shadow-sm"
            title="Zoom Out"
          >
            −
          </button>
          <button 
            onClick={resetZoom}
            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs shadow-sm"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

      </div>
    </div>
  );
}