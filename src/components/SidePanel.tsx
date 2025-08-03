import type { ParentRegion, ChildRegion, GridSettings } from '../types';
import { CoordinateDisplay } from './CoordinateDisplay';

interface SidePanelProps {
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  gridSettings: GridSettings;
  onChildRegionSelect: (id: number) => void;
  onChildRegionDelete: (id: number) => void;
  onChildRegionRename: (id: number, name: string) => void;
  selectedChildId: number | null;
  className?: string;
}

export function SidePanel({
  parentRegion,
  childRegions,
  gridSettings,
  onChildRegionSelect,
  onChildRegionDelete,
  onChildRegionRename,
  selectedChildId,
  className = ''
}: SidePanelProps) {
  const selectedChild = childRegions.find(child => child.id === selectedChildId) || null;
  return (
    <div className={`bg-gray-50 border-l border-gray-200 p-4 space-y-6 ${className}`}>
      {/* Parent Region Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Parent Region</h3>
        {parentRegion ? (
          <div className="bg-white rounded p-3 border border-gray-200">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Ratio:</span>
                <span className="font-mono">{parentRegion.aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Decimal:</span>
                <span className="font-mono">{parentRegion.aspectRatioDecimal.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Size:</span>
                <span className="font-mono">
                  {Math.round(parentRegion.width)} × {Math.round(parentRegion.height)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rotation:</span>
                <span className="font-mono">
                  {Math.round(parentRegion.rotation * 180 / Math.PI)}°
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-xs">
            No parent region selected
          </div>
        )}
      </div>

      {/* Child Regions List */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Child Regions ({childRegions.length})
        </h3>
        
        {childRegions.length > 0 ? (
          <div className="space-y-2">
            {childRegions.map((region) => (
              <div
                key={region.id}
                className={`bg-white rounded p-2 border cursor-pointer transition-colors ${
                  selectedChildId === region.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onChildRegionSelect(region.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={region.name}
                    onChange={(e) => onChildRegionRename(region.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 rounded px-1"
                  />
                  
                  <div className="flex items-center space-x-2">
                    {!region.isInside && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                        Outside
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChildRegionDelete(region.id);
                      }}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-gray-500">
                  <div className="flex justify-between">
                    <span>Center (grid):</span>
                    <span className="font-mono">
                      ({region.centerCoordinates.grid.x}, {region.centerCoordinates.grid.y})
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">
                      {Math.round(region.bounds.width)} × {Math.round(region.bounds.height)}
                    </span>
                  </div>

                  {region.isInside && (
                    <>
                      <div className="flex justify-between">
                        <span>Area:</span>
                        <span className="font-mono">
                          {(region.ratios.areaRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Width:</span>
                        <span className="font-mono">
                          {(region.ratios.widthRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Height:</span>
                        <span className="font-mono">
                          {(region.ratios.heightRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}

                  {!region.isInside && region.outsideInfo && (
                    <>
                      <div className="flex justify-between">
                        <span>Edge Distance:</span>
                        <span className="font-mono">
                          {region.outsideInfo.distance}px
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Center Distance:</span>
                        <span className="font-mono">
                          {region.outsideInfo.centerDistance}px
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Direction:</span>
                        <span className="font-mono">
                          {region.outsideInfo.direction}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Closest Edge:</span>
                        <span className="font-mono">
                          {region.outsideInfo.shortestEdge}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xs">
            No child regions
          </div>
        )}
      </div>

      {/* Coordinate System */}
      <CoordinateDisplay
        parentRegion={parentRegion}
        selectedChild={selectedChild}
        gridSettings={gridSettings}
      />

      {/* Instructions */}
      <div className="bg-blue-50 rounded p-3">
        <h4 className="text-xs font-medium text-blue-800 mb-2">Controls</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Parent: Drag to draw rectangle</li>
          <li>• Child: Drag inside parent region</li>
          <li>• Rotate: Use top handle</li>
          <li>• Resize: Corner handles</li>
          <li>• Move: Drag inside region</li>
        </ul>
      </div>
    </div>
  );
}