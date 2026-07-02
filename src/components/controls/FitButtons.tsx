interface FitButtonsProps {
  isParentMode: boolean;
  isChildRect: boolean;
  hasParentRegion: boolean;
  selectedChildId: number | null;
  onCreateFullCanvasParent: () => void;
  onFitChildHeightToImage: (id: number) => void;
  onFitChildWidthToImage: (id: number) => void;
  // Drawer layout: full-width stacked buttons, no tooltips.
  fullWidth?: boolean;
  // Called after a fit action fires (the drawer closes itself).
  onAfterAction?: () => void;
}

export function FitButtons({
  isParentMode,
  isChildRect,
  hasParentRegion,
  selectedChildId,
  onCreateFullCanvasParent,
  onFitChildHeightToImage,
  onFitChildWidthToImage,
  fullWidth = false,
  onAfterAction,
}: FitButtonsProps) {
  const buttonClass = fullWidth
    ? 'w-full px-3 py-2 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all'
    : 'px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all';

  return (
    <>
      {isParentMode && (
        <button
          onClick={() => { onCreateFullCanvasParent(); onAfterAction?.(); }}
          className={buttonClass}
          title={fullWidth ? undefined : hasParentRegion ? 'Fit parent region to image size' : 'Create parent region matching image size'}
        >
          Fit to Image
        </button>
      )}

      {/* Child region fit buttons: only for rectangle in child mode */}
      {isChildRect && (
        <>
          <button
            onClick={() => { if (selectedChildId !== null) { onFitChildHeightToImage(selectedChildId); onAfterAction?.(); } }}
            disabled={selectedChildId === null}
            className={buttonClass}
            title={fullWidth ? undefined : selectedChildId !== null ? 'Fit child region height to image height' : 'Select a child region first'}
          >
            Fit Height
          </button>
          <button
            onClick={() => { if (selectedChildId !== null) { onFitChildWidthToImage(selectedChildId); onAfterAction?.(); } }}
            disabled={selectedChildId === null}
            className={buttonClass}
            title={fullWidth ? undefined : selectedChildId !== null ? 'Fit child region width to image width' : 'Select a child region first'}
          >
            Fit Width
          </button>
        </>
      )}
    </>
  );
}
