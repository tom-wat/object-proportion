import { useCallback, useEffect, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCanvas } from './components/ImageCanvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';
import { useAnalysisData } from './hooks/useAnalysisData';
import { useImageHandling } from './hooks/useImageHandling';
import { useExport } from './hooks/useExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { snapToNearestEdge, snapToNearestCorner, convertToPixelCoordinates } from './utils/geometry';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
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
  } = useAnalysisData();

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

  const { handleExportJSON, handleExportCSV, handleExportPNG } = useExport({ analysisData, canvasRef });

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
    enabled: imageLoaded
  });

  const handleClearAllWithReset = useCallback(() => {
    handleClearAll();
    // Reset only selection states, keep image cache
    setSelectedChildId(null);
    setIsParentSelected(false);
    setSelectionMode('parent');
  }, [handleClearAll, setSelectedChildId, setIsParentSelected, setSelectionMode]);

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
        <div className="px-6 py-3">
          <h1 className="text-lg font-semibold text-gray-800">
            Object Proportion
          </h1>
        </div>
      </header>

      {/* Toolbar */}
      {imageLoaded && (
        <Toolbar
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          gridSettings={analysisData.gridSettings}
          onGridSettingsChange={handleGridSettingsChange}
          childGridSettings={analysisData.childGridSettings}
          onChildGridSettingsChange={handleChildGridSettingsChange}
          colorSettings={analysisData.colorSettings}
          onColorSettingsChange={handleColorSettingsChange}
          onExportPNG={handleExportPNG}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          onClearAll={handleClearAllWithReset}
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
            isParentSelected={isParentSelected}
            points={analysisData.points}
            selectedPointId={selectedPointId}
            onPointSelect={handlePointSelect}
            onPointDelete={handlePointDelete}
            onPointRename={handlePointRename}
            onPointSnapToEdge={handlePointSnapToEdge}
            onPointSnapToCorner={handlePointSnapToCorner}
            onPointRestore={handlePointRestore}
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
              onSelectionModeChange={setSelectionMode}
              points={analysisData.points}
              selectedPointId={selectedPointId}
              onPointAdd={handlePointAdd}
              imageFile={imageFile}
              cachedImage={cachedImage}
              isParentSelected={isParentSelected}
              colorSettings={analysisData.colorSettings}
              canvasRef={canvasRef}
              className="h-full bg-white border border-gray-100 rounded-lg shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
