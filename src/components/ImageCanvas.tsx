import React from 'react';
import type { SelectionMode, ParentRegion, ChildRegion, GridSettings, ChildGridSettings, ColorSettings, RegionPoint, ChildDrawMode } from '../types';
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
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  imageRotation?: number;
  isPanMode?: boolean;
  childDrawMode?: ChildDrawMode;
  unitBasis?: 'height' | 'width';
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
  className = '',
  canvasRef: externalCanvasRef,
  imageRotation = 0,
  isPanMode = false,
  childDrawMode,
  unitBasis = 'height'
}: ImageCanvasProps) {

  const { canvasRef, loadImage, loadImageFromCached, zoom, zoomIn, zoomOut, resetZoom, getImageDrawInfo, drawVersion, setZoomToActualPct } = useImageCanvas({
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
    childGridSettings,
    externalCanvasRef,
    imageRotation,
    isPanMode,
    childDrawMode,
    unitBasis
  });

  // Keep refs pointing to the latest versions so the effect below can always
  // call the most up-to-date function without re-triggering on every re-render.
  const loadImageFromCachedRef = React.useRef(loadImageFromCached);
  loadImageFromCachedRef.current = loadImageFromCached;
  const loadImageRef = React.useRef(loadImage);
  loadImageRef.current = loadImage;

  // Only re-run when the actual image data changes, not when function references
  // change.  Depending on loadImage / loadImageFromCached directly would cause
  // the effect to fire on every render (those functions are recreated whenever
  // any canvas state changes), which schedules a setTimeout inside useImageLoader
  // that clears the canvas mid-drag and erases the temporary dashed preview.
  React.useEffect(() => {
    if (cachedImage) {
      loadImageFromCachedRef.current(cachedImage);
    } else if (imageFile) {
      loadImageRef.current(imageFile);
    }
  }, [imageFile, cachedImage]);



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
            title="Fit to canvas"
          >
            Fit
          </button>
          <button
            onClick={() => setZoomToActualPct(100)}
            className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs text-gray-500 text-center shadow-sm cursor-pointer"
            title="Click to set 100% actual scale"
          >
            {(() => {
              void drawVersion;
              const drawInfo = getImageDrawInfo?.();
              if (drawInfo && cachedImage?.naturalWidth) {
                return Math.round(drawInfo.drawWidth / cachedImage.naturalWidth * zoom * 100) + '%';
              }
              return null;
            })()}
          </button>
        </div>

      </div>
    </div>
  );
}