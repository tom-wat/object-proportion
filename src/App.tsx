import { useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageCanvas } from './components/ImageCanvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';
import { useAnalysisData } from './hooks/useAnalysisData';
import { useImageHandling } from './hooks/useImageHandling';
import { useExport } from './hooks/useExport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
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
    handleClearAll,
    setImageInfo,
  } = useAnalysisData();

  const {
    imageFile,
    imageLoaded,
    selectionMode,
    selectedChildId,
    isParentSelected,
    cachedImage,
    setSelectionMode,
    setSelectedChildId,
    setIsParentSelected,
    handleImageLoad,
    handleParentRegionSelect,
    handleParentDeselect,
    resetImageState,
  } = useImageHandling({
    onImageInfoSet: setImageInfo
  });

  const { handleExportJSON, handleExportCSV } = useExport({ analysisData });

  // Handle child region selection with deselection support
  const handleChildRegionSelect = useCallback((id: number) => {
    if (id === -1) {
      setSelectedChildId(null); // Deselect
    } else {
      setSelectedChildId(id);
      setIsParentSelected(false); // Deselect parent when child is selected
      setSelectionMode('child'); // Switch to child mode when child is selected
    }
  }, [setSelectedChildId, setIsParentSelected, setSelectionMode]);

  // Keyboard shortcuts for better UX
  useKeyboardShortcuts({
    selectedChildId,
    isParentSelected,
    onChildRegionDelete: handleChildRegionDelete,
    onChildRegionSelect: handleChildRegionSelect,
    onParentDeselect: handleParentDeselect,
    enabled: imageLoaded
  });

  const handleClearAllWithReset = useCallback(() => {
    handleClearAll();
    resetImageState();
  }, [handleClearAll, resetImageState]);

  // Auto-switch to parent mode if child mode is selected but no parent region exists
  useEffect(() => {
    if (selectionMode === 'child' && !analysisData.parentRegion) {
      setSelectionMode('parent');
    }
  }, [selectionMode, analysisData.parentRegion, setSelectionMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-xl font-medium text-gray-900">
            Object Proportion
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze object proportions and positions in images
          </p>
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
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          onClearAll={handleClearAllWithReset}
          hasParentRegion={!!analysisData.parentRegion}
          childCount={analysisData.childRegions.length}
        />
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-150px)]">
        {/* Canvas Area */}
        <div className="flex-1 p-4">
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
              imageFile={imageFile}
              cachedImage={cachedImage}
              isParentSelected={isParentSelected}
              colorSettings={analysisData.colorSettings}
              className="h-full bg-white border border-gray-200 rounded"
            />
          )}
        </div>

        {/* Side Panel */}
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
            className="w-80 h-full overflow-y-auto"
          />
        )}
      </div>
    </div>
  );
}

export default App;
