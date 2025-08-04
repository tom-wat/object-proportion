import type { ParentRegion, ChildRegion } from '../types';

interface CoordinateDisplayProps {
  parentRegion: ParentRegion | null;
  selectedChild: ChildRegion | null;
  className?: string;
}

export function CoordinateDisplay({
  parentRegion,
  selectedChild,
  className = ''
}: CoordinateDisplayProps) {
  if (!parentRegion) {
    return null;
  }

  const gridSize = 16; // Fixed 16x16 grid

  return (
    <div className={`bg-white border border-gray-200 rounded p-3 ${className}`}>
      <h4 className="text-xs font-medium text-gray-900 mb-2">Coordinate System</h4>
      
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Grid Size:</span>
          <span className="font-mono">{gridSize}×{gridSize}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Origin:</span>
          <span className="font-mono">Center of parent</span>
        </div>

        {parentRegion.rotation !== 0 && (
          <div className="flex justify-between">
            <span>Rotation:</span>
            <span className="font-mono">
              {Math.round(parentRegion.rotation * 180 / Math.PI)}°
            </span>
          </div>
        )}

        {selectedChild && (
          <>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Selected: {selectedChild.name}
              </div>
            </div>
            
            <div className="flex justify-between">
              <span>Grid Position:</span>
              <span className="font-mono">
                ({selectedChild.centerCoordinates.grid.x}, {selectedChild.centerCoordinates.grid.y})
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Pixel Position:</span>
              <span className="font-mono">
                ({Math.round(selectedChild.centerCoordinates.pixel.x)}, {Math.round(selectedChild.centerCoordinates.pixel.y)})
              </span>
            </div>

            {selectedChild.isInside ? (
              <div className="text-green-600 text-xs">
                ✓ Inside parent region
              </div>
            ) : (
              <div className="text-orange-600 text-xs">
                ⚠ Outside parent region
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}