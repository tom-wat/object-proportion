import React from 'react';
import type { SelectionMode, ParentRegion, ChildRegion, GridSettings, ColorSettings } from '../types';
import { useImageCanvas } from '../hooks/useImageCanvas';


interface ImageCanvasProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  gridSettings: GridSettings;
  colorSettings: ColorSettings;
  imageFile: File | null;
  className?: string;
}

export function ImageCanvas({
  selectionMode,
  parentRegion,
  childRegions,
  gridSettings,
  colorSettings,
  onParentRegionChange,
  onChildRegionAdd,
  onChildRegionSelect,
  selectedChildId,
  imageFile,
  className = ''
}: ImageCanvasProps) {
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);
  
  const { canvasRef, loadImage, zoom, zoomIn, zoomOut, resetZoom } = useImageCanvas({
    selectionMode,
    parentRegion,
    childRegions,
    onParentRegionChange,
    onChildRegionAdd,
    onChildRegionSelect,
    selectedChildId,
    colorSettings,
    gridSettings
  });

  React.useEffect(() => {
    if (imageFile && typeof loadImage === 'function') {
      loadImage(imageFile);
    }
  }, [imageFile, loadImage]);

  // Track Shift key state for cursor changes
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);



  return (
    <div className={`w-full h-full bg-gray-100 ${className}`}>
      <div className="w-full h-full flex justify-center items-center overflow-hidden relative">


        <canvas
          ref={canvasRef}
          style={{
            cursor: isShiftPressed ? 'grab' : 'crosshair',
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