import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCanvas } from './components/ImageCanvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';
import { useAnalysisData } from './hooks/useAnalysisData';
import { useImageHandling } from './hooks/useImageHandling';
import { useExport } from './hooks/useExport';
import { usePanelExport } from './hooks/usePanelExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { snapToNearestEdge, snapToNearestCorner, convertToPixelCoordinates } from './utils/geometry';
import { Download, Undo, Redo } from 'lucide-react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    analysisData,
    handleParentRegionChange,
    handleParentRegionRename,
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
    handleImageRotationChange,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useAnalysisData();

  const [isPanMode, setIsPanMode] = useState(false);

  const {
    imageFile,
    imageLoaded,
    selectionMode,
    selectedChildId,
    selectedPointId,
    isParentSelected,
    cachedImage,
    setSelectionMode,
    setSelectedChildId,
    setIsParentSelected,
    handleImageLoad,
    handleParentRegionSelect,
    handleParentDeselect,
    handlePointSelect,
    handlePointDeselect,
  } = useImageHandling({
    onImageInfoSet: setImageInfo
  });

  const { handleExportJSON, handleExportPNG } = useExport({ analysisData, canvasRef });
  const { exportSingleRegion } = usePanelExport();

  // Handle child region selection with deselection support
  const handleChildRegionSelect = useCallback((id: number) => {
    if (id === -1) {
      setSelectedChildId(null); // Deselect
    } else {
      setSelectedChildId(id);
      setIsParentSelected(false); // Deselect parent when child is selected
      handlePointDeselect(); // Deselect point when child is selected
      setSelectionMode('child'); // Switch to child mode when child is selected
    }
  }, [setSelectedChildId, setIsParentSelected, setSelectionMode, handlePointDeselect]);

  // Handle mode switching with proper selection state clearing
  const handleSelectionModeChange = useCallback((mode: 'parent' | 'child') => {
    // Clear current selections when switching modes
    if (mode === 'parent') {
      // Switching to parent mode - deselect child
      setSelectedChildId(null);
    } else {
      // Switching to child mode - deselect parent and points
      setIsParentSelected(false);
      handlePointDeselect();
    }
    
    setSelectionMode(mode);
  }, [setSelectedChildId, setIsParentSelected, handlePointDeselect, setSelectionMode]);

  // Keyboard shortcuts for better UX
  useKeyboardShortcuts({
    selectedChildId,
    selectedPointId,
    isParentSelected,
    onChildRegionDelete: handleChildRegionDelete,
    onChildRegionSelect: handleChildRegionSelect,
    onPointDelete: handlePointDelete,
    onPointDeselect: handlePointDeselect,
    onParentDeselect: handleParentDeselect,
    selectionMode,
    onSelectionModeChange: handleSelectionModeChange,
    onPanModeChange: setIsPanMode,
    enabled: imageLoaded
  });

  const handleClearAllWithReset = useCallback(() => {
    handleClearAll();
    // Reset only selection states, keep image cache
    setSelectedChildId(null);
    setIsParentSelected(false);
    setSelectionMode('parent');
  }, [handleClearAll, setSelectedChildId, setIsParentSelected, setSelectionMode]);


  const handleExportParentRegion = useCallback(() => {
    exportSingleRegion('side-panel-export', 'parent', undefined, `parent-region-${Date.now()}.png`);
  }, [exportSingleRegion]);

  const handleExportChildRegion = useCallback((regionId: number, regionName: string) => {
    exportSingleRegion('side-panel-export', 'child', regionId, `child-region-${regionName}-${Date.now()}.png`);
  }, [exportSingleRegion]);

  // Handle point snap to nearest edge
  const handlePointSnapToEdge = useCallback((pointId: number) => {
    const point = analysisData.points.find(p => p.id === pointId);
    if (!point) return;

    // Get the appropriate parent region for coordinate conversion
    let parentRegion = analysisData.parentRegion;
    
    if (point.parentRegionId !== undefined) {
      // Point belongs to a child region
      const childRegion = analysisData.childRegions.find(c => c.id === point.parentRegionId);
      if (childRegion) {
        parentRegion = {
          x: childRegion.bounds.x,
          y: childRegion.bounds.y,
          width: childRegion.bounds.width,
          height: childRegion.bounds.height,
          rotation: childRegion.rotation,
          aspectRatio: '',
          aspectRatioDecimal: 0
        };
      }
    }

    if (!parentRegion) return;

    // Snap grid coordinates to nearest edge
    const snappedGridCoords = snapToNearestEdge(point.coordinates.grid);
    
    // Convert back to pixel coordinates
    const snappedPixelCoords = convertToPixelCoordinates(snappedGridCoords, parentRegion, 16);

    // Update the point
    handlePointUpdate(pointId, {
      pixel: snappedPixelCoords,
      grid: snappedGridCoords
    });
  }, [analysisData.points, analysisData.parentRegion, analysisData.childRegions, handlePointUpdate]);

  // Handle point snap to nearest corner
  const handlePointSnapToCorner = useCallback((pointId: number) => {
    const point = analysisData.points.find(p => p.id === pointId);
    if (!point) return;

    // Get the appropriate parent region for coordinate conversion
    let parentRegion = analysisData.parentRegion;
    
    if (point.parentRegionId !== undefined) {
      // Point belongs to a child region
      const childRegion = analysisData.childRegions.find(c => c.id === point.parentRegionId);
      if (childRegion) {
        parentRegion = {
          x: childRegion.bounds.x,
          y: childRegion.bounds.y,
          width: childRegion.bounds.width,
          height: childRegion.bounds.height,
          rotation: childRegion.rotation,
          aspectRatio: '',
          aspectRatioDecimal: 0
        };
      }
    }

    if (!parentRegion) return;

    // Snap grid coordinates to nearest corner
    const snappedGridCoords = snapToNearestCorner(point.coordinates.grid);
    
    // Convert back to pixel coordinates
    const snappedPixelCoords = convertToPixelCoordinates(snappedGridCoords, parentRegion, 16);

    // Update the point
    handlePointUpdate(pointId, {
      pixel: snappedPixelCoords,
      grid: snappedGridCoords
    });
  }, [analysisData.points, analysisData.parentRegion, analysisData.childRegions, handlePointUpdate]);

  // Handle point restore to original position
  const handlePointRestore = useCallback((pointId: number, coordinates: { pixel: { x: number; y: number }; grid: { x: number; y: number } }) => {
    handlePointUpdate(pointId, coordinates);
  }, [handlePointUpdate]);

  // Auto-switch to parent mode if child mode is selected but no parent region exists
  useEffect(() => {
    if (selectionMode === 'child' && !analysisData.parentRegion) {
      setSelectionMode('parent');
    }
  }, [selectionMode, analysisData.parentRegion, setSelectionMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">
            Object Proportion
          </h1>

          {/* Action Buttons */}
          {imageLoaded && (
            <div className="flex items-center gap-4">
              {/* Image Rotation */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Rotate</span>
                <div className="flex items-center gap-3">
                  {/* Rotation slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">0°</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={Math.round((analysisData.imageRotation * 180) / Math.PI)}
                      onChange={(e) => {
                        const degrees = parseInt(e.target.value);
                        const radians = (degrees * Math.PI) / 180;
                        handleImageRotationChange(radians);
                      }}
                      className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      title={`Current rotation: ${Math.round((analysisData.imageRotation * 180) / Math.PI)}°`}
                    />
                    <span className="text-xs text-gray-500">360°</span>
                  </div>

                  {/* Current angle display */}
                  <input
                    type="number"
                    value={Math.round((analysisData.imageRotation * 180) / Math.PI)}
                    onChange={(e) => {
                      const degrees = parseInt(e.target.value) || 0;
                      const clampedDegrees = Math.max(0, Math.min(360, degrees));
                      const radians = (clampedDegrees * Math.PI) / 180;
                      handleImageRotationChange(radians);
                    }}
                    className="w-12 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    min="0"
                    max="360"
                    step="1"
                  />
                </div>
              </div>

              {/* Undo/Redo Buttons */}
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Undo size={16} />
                Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Redo size={16} />
                Redo
              </button>

              {/* Export Buttons */}
              <button
                onClick={handleExportPNG}
                disabled={!analysisData.parentRegion && analysisData.childRegions.length === 0}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Download size={16} />
                PNG
              </button>
              <button
                onClick={handleExportJSON}
                disabled={!analysisData.parentRegion && analysisData.childRegions.length === 0}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Download size={16} />
                JSON
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Toolbar */}
      {imageLoaded && (
        <Toolbar
          selectionMode={selectionMode}
          onSelectionModeChange={handleSelectionModeChange}
          gridSettings={analysisData.gridSettings}
          onGridSettingsChange={handleGridSettingsChange}
          childGridSettings={analysisData.childGridSettings}
          onChildGridSettingsChange={handleChildGridSettingsChange}
          colorSettings={analysisData.colorSettings}
          onColorSettingsChange={handleColorSettingsChange}
          hasParentRegion={!!analysisData.parentRegion}
          childCount={analysisData.childRegions.length}
        />
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-125px)]">
        {/* Side Panel - moved to left */}
        {imageLoaded && (
          <SidePanel
            parentRegion={analysisData.parentRegion}
            childRegions={analysisData.childRegions}
            onChildRegionSelect={handleChildRegionSelect}
            onChildRegionDelete={handleChildRegionDelete}
            onChildRegionRename={handleChildRegionRename}
            selectedChildId={selectedChildId}
            onParentRegionSelect={handleParentRegionSelect}
            onParentRegionRename={handleParentRegionRename}
            isParentSelected={isParentSelected}
            points={analysisData.points}
            selectedPointId={selectedPointId}
            onPointSelect={handlePointSelect}
            onPointDelete={handlePointDelete}
            onPointRename={handlePointRename}
            onPointSnapToEdge={handlePointSnapToEdge}
            onPointSnapToCorner={handlePointSnapToCorner}
            onPointRestore={handlePointRestore}
            onExportParentRegion={handleExportParentRegion}
            onExportChildRegion={handleExportChildRegion}
            onClearAll={handleClearAllWithReset}
            className="w-72 h-full overflow-y-auto border-r border-gray-100 p-6"
          />
        )}

        {/* Canvas Area */}
        <div className="flex-1 p-6">
          {!imageLoaded ? (
            <ImageUploader
              onImageLoad={handleImageLoad}
              className="h-full flex items-center justify-center"
            />
          ) : (
            <ImageCanvas
              selectionMode={selectionMode}
              parentRegion={analysisData.parentRegion}
              childRegions={analysisData.childRegions}
              gridSettings={analysisData.gridSettings}
              childGridSettings={analysisData.childGridSettings}
              onParentRegionChange={handleParentRegionChange}
              onChildRegionAdd={handleChildRegionAdd}
              onChildRegionChange={handleChildRegionChange}
              onChildRegionSelect={handleChildRegionSelect}
              selectedChildId={selectedChildId}
              onParentDeselect={handleParentDeselect}
              onParentSelect={handleParentRegionSelect}
              onSelectionModeChange={handleSelectionModeChange}
              points={analysisData.points}
              selectedPointId={selectedPointId}
              onPointAdd={handlePointAdd}
              imageFile={imageFile}
              cachedImage={cachedImage}
              isParentSelected={isParentSelected}
              colorSettings={analysisData.colorSettings}
              imageRotation={analysisData.imageRotation}
              canvasRef={canvasRef}
              isPanMode={isPanMode}
              className="h-full bg-white border border-gray-100 rounded-lg shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
