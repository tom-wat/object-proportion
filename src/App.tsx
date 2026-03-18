import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCanvas } from './components/ImageCanvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { MobileMenuDrawer } from './components/MobileMenuDrawer';
import { useAnalysisData } from './hooks/useAnalysisData';
import { useImageHandling } from './hooks/useImageHandling';
import { useExport } from './hooks/useExport';
import { useImport } from './hooks/useImport';
import { usePanelExport } from './hooks/usePanelExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Download, Upload, Undo, Redo, Copy, X, Info } from 'lucide-react';
import type { ChildDrawMode, LayoutFile } from './types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPanMode, setIsPanMode] = useState(false);
  const [childDrawMode, setChildDrawMode] = useState<ChildDrawMode>('rectangle');
  const [unitBasis, setUnitBasis] = useState<'height' | 'width'>('height');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  const {
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
  } = useAnalysisData(unitBasis);

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
    resetImageState,
  } = useImageHandling({
    onImageInfoSet: setImageInfo
  });

  const { handleExportPNG, handleExportPNGOverlayOnly, handleExportLayout } = useExport({ analysisData, canvasRef, cachedImage, unitBasis });
  const { exportSingleRegion } = usePanelExport();

  const handleImport = useCallback((layout: LayoutFile) => {
    const result = handleImportLayout(layout);
    setUnitBasis(result.unitBasis);
    setSelectedChildId(null);
    setIsParentSelected(false);
    setSelectionMode('parent');
  }, [handleImportLayout, setUnitBasis, setSelectedChildId, setIsParentSelected, setSelectionMode]);

  const { fileInputRef, handleImportClick, handleFileChange } = useImport({ onImportLayout: handleImport });

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
      // Switching to parent mode - deselect child and reset draw mode
      setSelectedChildId(null);
      setChildDrawMode('rectangle');
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

  const handleTitleClick = useCallback(() => {
    if (!imageLoaded) return;
    handleClearAll();
    resetImageState();
  }, [imageLoaded, handleClearAll, resetImageState]);


  const handleExportParentRegion = useCallback(() => {
    exportSingleRegion('side-panel-export', 'parent', undefined, `parent-region-${Date.now()}.png`);
  }, [exportSingleRegion]);

  const handleExportChildRegion = useCallback((regionId: number, regionName: string) => {
    exportSingleRegion('side-panel-export', 'child', regionId, `child-region-${regionName}-${Date.now()}.png`);
  }, [exportSingleRegion]);


  // Auto-switch to parent mode if child mode is selected but no parent region exists
  useEffect(() => {
    if (selectionMode === 'child' && !analysisData.parentRegion) {
      setSelectionMode('parent');
    }
  }, [selectionMode, analysisData.parentRegion, setSelectionMode]);

  const canExport = !(!analysisData.parentRegion && analysisData.childRegions.length === 0);

  const handleMobileCopy = useCallback(() => {
    if (selectedChildId === null) return;
    const newId = Math.max(0, ...analysisData.childRegions.map(c => c.id)) + 1;
    handleChildRegionCopy(selectedChildId);
    handleChildRegionSelect(newId);
  }, [selectedChildId, analysisData.childRegions, handleChildRegionCopy, handleChildRegionSelect]);

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 h-14 flex-shrink-0">
        <div className="px-4 md:px-6 h-full flex items-center justify-between">
          <h1
            className={`text-lg font-semibold text-gray-800 ${imageLoaded ? 'cursor-pointer hover:text-gray-500 transition-colors' : ''}`}
            onClick={handleTitleClick}
            title={imageLoaded ? 'Click to return to start' : undefined}
          >
            Object Proportion
          </h1>

          {/* Desktop Action Buttons */}
          {imageLoaded && (
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => {
                  if (selectedChildId === null) return;
                  const newId = Math.max(0, ...analysisData.childRegions.map(c => c.id)) + 1;
                  handleChildRegionCopy(selectedChildId);
                  handleChildRegionSelect(newId);
                }}
                disabled={selectedChildId === null}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                title="Duplicate selected region"
              >
                <Copy size={16} />
                Copy
              </button>
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
              <button
                onClick={handleExportPNG}
                disabled={!canExport}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Download size={16} />
                PNG
              </button>
              <button
                onClick={handleExportPNGOverlayOnly}
                disabled={!canExport}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                title="Download regions only (transparent background)"
              >
                <Download size={16} />
                PNG (overlay)
              </button>
              <button
                onClick={handleExportLayout}
                disabled={!canExport}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-green-50 hover:text-green-700 hover:border-green-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                title="Export layout (regions & settings)"
              >
                <Download size={16} />
                Layout
              </button>
              <button
                onClick={handleImportClick}
                className="px-3 py-1.5 text-sm font-medium bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all flex items-center gap-2"
                title="Import layout"
              >
                <Upload size={16} />
                Import
              </button>
            </div>
          )}

          {/* Mobile Undo/Redo (always visible when image loaded) */}
          {imageLoaded && (
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 transition-colors"
              >
                <Undo size={20} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 transition-colors"
              >
                <Redo size={20} />
              </button>
              <button
                onClick={() => setMobileInfoOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Region info"
              >
                <Info size={20} />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </header>

      {/* Desktop Toolbar */}
      {imageLoaded && (
        <div className="hidden md:block">
          <Toolbar
            selectionMode={selectionMode}
            onSelectionModeChange={handleSelectionModeChange}
            childDrawMode={childDrawMode}
            onChildDrawModeChange={setChildDrawMode}
            gridSettings={analysisData.gridSettings}
            onGridSettingsChange={handleGridSettingsChange}
            childGridSettings={analysisData.childGridSettings}
            onChildGridSettingsChange={handleChildGridSettingsChange}
            colorSettings={analysisData.colorSettings}
            onColorSettingsChange={handleColorSettingsChange}
            hasParentRegion={!!analysisData.parentRegion}
            childCount={analysisData.childRegions.length}
            selectedChildId={selectedChildId}
            onCreateFullCanvasParent={() => handleCreateFullCanvasParent(canvasRef)}
            onFitChildHeightToImage={(childId) => handleFitChildHeightToImage(childId, canvasRef)}
            onFitChildWidthToImage={(childId) => handleFitChildWidthToImage(childId, canvasRef)}
            unitBasis={unitBasis}
            onUnitBasisChange={setUnitBasis}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Side Panel */}
        {imageLoaded && (
          <div className="hidden md:block">
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
              onExportParentRegion={handleExportParentRegion}
              onExportChildRegion={handleExportChildRegion}
              onClearAll={handleClearAllWithReset}
              imageInfo={analysisData.imageInfo}
              canvasRef={canvasRef}
              unitBasis={unitBasis}
              className="w-72 h-full overflow-y-auto border-r border-gray-100 p-6"
            />
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 p-2 md:p-6 overflow-hidden">
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
              canvasRef={canvasRef}
              isPanMode={isPanMode}
              childDrawMode={childDrawMode}
              unitBasis={unitBasis}
              className="h-full bg-gray-100 border border-gray-100 rounded-lg shadow-sm"
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Toolbar */}
      {imageLoaded && (
        <div className="md:hidden">
          <MobileBottomToolbar
            selectionMode={selectionMode}
            onSelectionModeChange={handleSelectionModeChange}
            childDrawMode={childDrawMode}
            onChildDrawModeChange={setChildDrawMode}
            hasParentRegion={!!analysisData.parentRegion}
            isPanMode={isPanMode}
            onPanModeToggle={() => setIsPanMode(v => !v)}
            onMenuOpen={() => setMobileMenuOpen(true)}
          />
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <MobileMenuDrawer
            onClose={() => setMobileMenuOpen(false)}
            canCopy={selectedChildId !== null}
            onCopy={handleMobileCopy}
            canUndo={canUndo}
            onUndo={handleUndo}
            canRedo={canRedo}
            onRedo={handleRedo}
            canExport={canExport}
            onExportPNG={handleExportPNG}
            onExportPNGOverlay={handleExportPNGOverlayOnly}
            onExportLayout={handleExportLayout}
            onImport={handleImportClick}
            selectionMode={selectionMode}
            childDrawMode={childDrawMode}
            gridSettings={analysisData.gridSettings}
            onGridSettingsChange={handleGridSettingsChange}
            childGridSettings={analysisData.childGridSettings}
            onChildGridSettingsChange={handleChildGridSettingsChange}
            colorSettings={analysisData.colorSettings}
            onColorSettingsChange={handleColorSettingsChange}
            unitBasis={unitBasis}
            onUnitBasisChange={setUnitBasis}
            hasParentRegion={!!analysisData.parentRegion}
            childCount={analysisData.childRegions.length}
            selectedChildId={selectedChildId}
            onCreateFullCanvasParent={() => handleCreateFullCanvasParent(canvasRef)}
            onFitChildHeightToImage={(childId) => handleFitChildHeightToImage(childId, canvasRef)}
            onFitChildWidthToImage={(childId) => handleFitChildWidthToImage(childId, canvasRef)}
          />
        </div>
      )}

      {/* Mobile Info Panel (SidePanel as full-screen overlay) */}
      {mobileInfoOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="font-semibold text-gray-800">Region Info</span>
            <button
              onClick={() => setMobileInfoOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
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
              onExportParentRegion={handleExportParentRegion}
              onExportChildRegion={handleExportChildRegion}
              onClearAll={handleClearAllWithReset}
              imageInfo={analysisData.imageInfo}
              canvasRef={canvasRef}
              unitBasis={unitBasis}
              className="p-4"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
