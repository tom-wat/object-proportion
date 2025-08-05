import { useRef } from 'react';
import type { ParentRegion, ChildRegion, RegionPoint } from '../types';
import { CoordinateDisplay } from './CoordinateDisplay';
import { Magnet, Trash2 } from 'lucide-react';

interface SidePanelProps {
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onChildRegionSelect: (id: number) => void;
  onChildRegionDelete: (id: number) => void;
  onChildRegionRename: (id: number, name: string) => void;
  selectedChildId: number | null;
  onParentRegionSelect?: () => void;
  isParentSelected?: boolean;
  points: RegionPoint[];
  selectedPointId?: number | null;
  onPointSelect?: (id: number | null) => void;
  onPointDelete?: (id: number) => void;
  onPointRename?: (id: number, name: string) => void;
  onPointSnapToEdge?: (id: number) => void;
  onPointSnapToCorner?: (id: number) => void;
  onPointRestore?: (id: number, coordinates: { pixel: { x: number; y: number }; grid: { x: number; y: number } }) => void;
  className?: string;
}

export function SidePanel({
  parentRegion,
  childRegions,
  onChildRegionSelect,
  onChildRegionDelete,
  onChildRegionRename,
  selectedChildId,
  onParentRegionSelect,
  isParentSelected,
  points,
  selectedPointId,
  onPointSelect,
  onPointDelete,
  onPointRename,
  onPointSnapToEdge,
  onPointSnapToCorner,
  onPointRestore,
  className = ''
}: SidePanelProps) {
  const selectedChild = childRegions.find(child => child.id === selectedChildId) || null;
  
  // Store point states: 0=original, 1=edge, 2=corner
  const pointStateRef = useRef<{ [key: number]: number }>({});
  // Store original coordinates when first clicked
  const originalCoordsRef = useRef<{ [key: number]: { pixel: { x: number; y: number }; grid: { x: number; y: number } } }>({});
  
  const handleMagnetClick = (pointId: number) => {
    const currentPoint = points.find(p => p.id === pointId);
    if (!currentPoint) return;
    
    // Initialize state if not exists
    if (!(pointId in pointStateRef.current)) {
      pointStateRef.current[pointId] = 0;
      // Store original coordinates
      originalCoordsRef.current[pointId] = {
        pixel: { ...currentPoint.coordinates.pixel },
        grid: { ...currentPoint.coordinates.grid }
      };
    }
    
    // Cycle through states: original -> edge -> corner -> original
    const currentState = pointStateRef.current[pointId];
    const nextState = (currentState + 1) % 3;
    pointStateRef.current[pointId] = nextState;
    
    switch (nextState) {
      case 0: // Back to original position
        onPointRestore?.(pointId, originalCoordsRef.current[pointId]);
        break;
      case 1: // Move to edge
        onPointSnapToEdge?.(pointId);
        break;
      case 2: // Move to corner
        onPointSnapToCorner?.(pointId);
        break;
    }
  };
  return (
    <div className={`bg-gray-50 border-r border-gray-200 p-4 space-y-6 ${className}`}>
      {/* Parent Region Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Parent Region</h3>
        {parentRegion ? (
          <div 
            className={`bg-white rounded p-3 border cursor-pointer transition-colors ${
              isParentSelected 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={onParentRegionSelect}
          >
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
            
            {/* Parent Region Points */}
            {(() => {
              const parentPoints = points.filter(point => point.parentRegionId === undefined);
              return parentPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Points ({parentPoints.length})
                  </div>
                  <div className="space-y-2">
                    {parentPoints.map((point) => (
                      <div
                        key={point.id}
                        className={`bg-gray-50 rounded p-2 border cursor-pointer transition-colors ${
                          selectedPointId === point.id
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPointSelect?.(point.id);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <input
                            type="text"
                            value={point.name}
                            onChange={(e) => onPointRename?.(point.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 rounded px-1 flex-1"
                          />
                          
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMagnetClick(point.id);
                              }}
                              className="text-gray-600 hover:text-blue-600 text-xs px-1 py-0.5 rounded border border-gray-200 hover:border-blue-300"
                              title="Cycle: Original → Edge → Corner → Original"
                            >
                              <Magnet size={10} />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPointDelete?.(point.id);
                              }}
                              className="text-gray-600 hover:text-red-600 text-xs px-1 py-0.5 rounded border border-gray-200 hover:border-red-300"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          <div className="flex justify-between">
                            <span>Grid:</span>
                            <span className="font-mono">
                              ({point.coordinates.grid.x.toFixed(1)}, {point.coordinates.grid.y.toFixed(1)})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChildRegionDelete(region.id);
                      }}
                      className="text-gray-700 hover:text-red-600 text-xs px-1 py-0.5 rounded border border-gray-300 hover:border-red-300"
                    >
                      <Trash2 size={12} />
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
                  

                  {region.edgePositions && (
                    <>
                      <div className="flex justify-between">
                        <span>Left Edge (X):</span>
                        <span className="font-mono">{region.edgePositions.left.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Right Edge (X):</span>
                        <span className="font-mono">{region.edgePositions.right.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Top Edge (Y):</span>
                        <span className="font-mono">{region.edgePositions.top.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bottom Edge (Y):</span>
                        <span className="font-mono">{region.edgePositions.bottom.toFixed(1)}</span>
                      </div>
                    </>
                  )}

                  
                  <div className="flex justify-between">
                    <span>Grid Width:</span>
                    <span className="font-mono">
                      {region.gridDimensions?.gridWidth.toFixed(1)} units
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Grid Height:</span>
                    <span className="font-mono">
                      {region.gridDimensions?.gridHeight.toFixed(1)} units
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Width Ratio:</span>
                    <span className="font-mono">
                      {(region.ratios.widthRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Height Ratio:</span>
                    <span className="font-mono">
                      {(region.ratios.heightRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Rotation:</span>
                    <span className="font-mono">
                      {Math.round(region.rotation * 180 / Math.PI)}°
                    </span>
                  </div>
                </div>

                {/* Child Region Points */}
                {(() => {
                  const childPoints = points.filter(point => point.parentRegionId === region.id);
                  return childPoints.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        Points ({childPoints.length})
                      </div>
                      <div className="space-y-2">
                        {childPoints.map((point) => (
                          <div
                            key={point.id}
                            className={`bg-gray-50 rounded p-2 border cursor-pointer transition-colors ${
                              selectedPointId === point.id
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-100 hover:border-gray-200'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPointSelect?.(point.id);
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <input
                                type="text"
                                value={point.name}
                                onChange={(e) => onPointRename?.(point.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 rounded px-1 flex-1"
                              />
                              
                              <div className="flex items-center space-x-1 ml-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMagnetClick(point.id);
                                  }}
                                  className="text-gray-600 hover:text-blue-600 text-xs px-1 py-0.5 rounded border border-gray-200 hover:border-blue-300"
                                  title="Cycle: Original → Edge → Corner → Original"
                                >
                                  <Magnet size={10} />
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPointDelete?.(point.id);
                                  }}
                                  className="text-gray-600 hover:text-red-600 text-xs px-1 py-0.5 rounded border border-gray-200 hover:border-red-300"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              <div className="flex justify-between">
                                <span>Grid:</span>
                                <span className="font-mono">
                                  ({point.coordinates.grid.x.toFixed(1)}, {point.coordinates.grid.y.toFixed(1)})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
      />

      {/* Instructions */}
      <div className="bg-blue-50 rounded p-3">
        <h4 className="text-xs font-medium text-blue-800 mb-2">Controls</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Parent: Drag to draw rectangle</li>
          <li>• Child: Drag inside parent region</li>
          <li>• Points: Double-click inside region</li>
          <li>• Rotate: Use top handle</li>
          <li>• Resize: Corner handles</li>
          <li>• Move: Drag inside region</li>
          <li>• Pan: Shift + drag</li>
        </ul>
      </div>
    </div>
  );
}