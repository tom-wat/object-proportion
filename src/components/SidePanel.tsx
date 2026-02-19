import { useRef } from 'react';
import type { ParentRegion, ChildRegion, RegionPoint } from '../types';
import { CoordinateDisplay } from './CoordinateDisplay';
import { rotatePoint } from '../utils/geometry';
import { Magnet, Trash2, Download } from 'lucide-react';

interface SidePanelProps {
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onChildRegionSelect: (id: number) => void;
  onChildRegionDelete: (id: number) => void;
  onChildRegionRename: (id: number, name: string) => void;
  selectedChildId: number | null;
  onParentRegionSelect?: () => void;
  onParentRegionRename?: (name: string) => void;
  isParentSelected?: boolean;
  points: RegionPoint[];
  selectedPointId?: number | null;
  onPointSelect?: (id: number | null) => void;
  onPointDelete?: (id: number) => void;
  onPointRename?: (id: number, name: string) => void;
  onPointSnapToEdge?: (id: number) => void;
  onPointSnapToCorner?: (id: number) => void;
  onPointRestore?: (id: number, coordinates: { pixel: { x: number; y: number }; grid: { x: number; y: number } }) => void;
  onExportParentRegion?: () => void;
  onExportChildRegion?: (regionId: number, regionName: string) => void;
  onClearAll?: () => void;
  imageInfo?: { width: number; height: number; name: string } | null;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  unitBasis?: 'height' | 'width';
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
  onParentRegionRename,
  isParentSelected,
  points,
  selectedPointId,
  onPointSelect,
  onPointDelete,
  onPointRename,
  onPointSnapToEdge,
  onPointSnapToCorner,
  onPointRestore,
  onExportParentRegion,
  onExportChildRegion,
  onClearAll,
  imageInfo,
  canvasRef,
  unitBasis = 'height',
  className = ''
}: SidePanelProps) {
  const selectedChild = childRegions.find(child => child.id === selectedChildId) || null;

  // Calculate parent region size in original image pixels
  const getOriginalImageSize = (region: ParentRegion) => {
    if (!imageInfo) {
      return {
        width: Math.round(region.width),
        height: Math.round(region.height)
      };
    }

    // Get current canvas size
    const canvas = canvasRef?.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return {
        width: Math.round(region.width),
        height: Math.round(region.height)
      };
    }

    // Calculate how the image is drawn on the canvas
    // The image is drawn at 95% of canvas size, maintaining aspect ratio
    const imgAspect = imageInfo.width / imageInfo.height;
    const canvasAspect = canvas.width / canvas.height;

    let drawWidth, drawHeight;

    if (imgAspect > canvasAspect) {
      // Image is wider than canvas
      drawWidth = canvas.width * 0.95;
      drawHeight = drawWidth / imgAspect;
    } else {
      // Image is taller than canvas
      drawHeight = canvas.height * 0.95;
      drawWidth = drawHeight * imgAspect;
    }

    // Calculate the scale factor from drawn size to original image size
    // This is how many original pixels per drawn pixel
    const scale = imageInfo.width / drawWidth;

    // Scale the region dimensions
    const scaledWidth = region.width * scale;
    const scaledHeight = region.height * scale;

    return {
      width: Math.round(scaledWidth),
      height: Math.round(scaledHeight)
    };
  };
  
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
    <div id="side-panel-export" className={`bg-gray-50 space-y-8 ${className}`}>
      {/* Parent Region Info */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4">Parent Region</h3>
        {parentRegion ? (
          <div 
            className={`bg-white rounded-lg p-4 border cursor-pointer transition-all ${
              isParentSelected 
                ? 'bg-blue-50 ring-2 ring-blue-200 border-transparent' 
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={onParentRegionSelect}
          >
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={parentRegion.name || "Parent Info"}
                onChange={(e) => onParentRegionRename?.(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-md py-1 flex-1"
              />
              <div className="flex items-center gap-1 ml-1">
                {onExportParentRegion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportParentRegion();
                    }}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all flex-shrink-0"
                    title="Export Parent Region"
                  >
                    <Download size={14} />
                  </button>
                )}
                {onClearAll && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearAll();
                    }}
                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
                    title="Clear All Regions"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Size</span>
                <span className="font-mono text-gray-900 font-medium">
                  {(() => {
                    const size = getOriginalImageSize(parentRegion);
                    return `${size.width} × ${size.height}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ratio</span>
                <span className="font-mono text-gray-900 font-medium">
                  {(() => {
                    const size = getOriginalImageSize(parentRegion);
                    return `${((size.width / size.height) * 100).toFixed(1)} : 100`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rotation</span>
                <span className="font-mono text-gray-900 font-medium">
                  {Math.round(parentRegion.rotation * 180 / Math.PI)}°
                </span>
              </div>
            </div>
            
            {/* Parent Region Points */}
            {(() => {
              const parentPoints = points.filter(point => point.parentRegionId === undefined);
              return parentPoints.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    Points ({parentPoints.length})
                  </div>
                  <div className="space-y-3">
                    {parentPoints.map((point) => (
                      <div
                        key={point.id}
                        className={`bg-white rounded-lg p-3 border cursor-pointer transition-all ${
                          selectedPointId === point.id
                            ? 'bg-blue-50 ring-2 ring-blue-200 border-transparent'
                            : 'border-gray-100 hover:border-gray-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPointSelect?.(point.id);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={point.name}
                            onChange={(e) => onPointRename?.(point.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-md py-1 flex-1 min-w-0"
                          />
                          
                          <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMagnetClick(point.id);
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                              title="Cycle: Original → Edge → Corner → Original"
                            >
                              <Magnet size={12} />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPointDelete?.(point.id);
                              }}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <div className="flex justify-between items-center">
                            <span>Grid</span>
                            <span className="font-mono text-gray-900 font-medium">
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
          <div className="text-gray-400 text-sm bg-gray-50 rounded-lg p-4 text-center">
            No parent region selected
          </div>
        )}
      </div>

      {/* Child Regions List */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Child Regions ({childRegions.length})
        </h3>
        
        {childRegions.length > 0 ? (
          <div className="space-y-4">
            {childRegions.map((region) => (
              <div
                key={region.id}
                data-region-id={region.id}
                className={`bg-white rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedChildId === region.id
                    ? 'bg-blue-50 ring-2 ring-blue-200 border-transparent'
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => onChildRegionSelect(region.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={region.name}
                    onChange={(e) => onChildRegionRename(region.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-md py-1 flex-1"
                  />
                  
                  <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                    {onExportChildRegion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportChildRegion(region.id, region.name);
                        }}
                        className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-all"
                        title={`Export ${region.name}`}
                      >
                        <Download size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChildRegionDelete(region.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-sm space-y-2 text-gray-600">
                  {(() => {
                    // Compute square-cell grid values from current unitBasis
                    const cellSize = parentRegion
                      ? (unitBasis === 'width' ? parentRegion.width : parentRegion.height) / 16
                      : null;
                    const pCx = parentRegion ? parentRegion.x + parentRegion.width / 2 : 0;
                    const pCy = parentRegion ? parentRegion.y + parentRegion.height / 2 : 0;

                    const toGrid = (px: number, py: number) => cellSize
                      ? { x: (px - pCx) / cellSize, y: -(py - pCy) / cellSize }
                      : null;

                    const centerGrid = toGrid(
                      region.centerCoordinates.pixel.x,
                      region.centerCoordinates.pixel.y
                    );

                    // Rectangle edge positions (with rotation)
                    const computeEdges = () => {
                      if (!cellSize) return null;
                      let corners = [
                        { x: region.bounds.x, y: region.bounds.y },
                        { x: region.bounds.x + region.bounds.width, y: region.bounds.y },
                        { x: region.bounds.x + region.bounds.width, y: region.bounds.y + region.bounds.height },
                        { x: region.bounds.x, y: region.bounds.y + region.bounds.height },
                      ];
                      if (region.rotation !== 0) {
                        const rc = { x: region.bounds.x + region.bounds.width / 2, y: region.bounds.y + region.bounds.height / 2 };
                        corners = corners.map(c => rotatePoint(c, rc, region.rotation));
                      }
                      const gs = corners.map(c => ({ x: (c.x - pCx) / cellSize, y: -(c.y - pCy) / cellSize }));
                      const xs = gs.map(c => c.x);
                      const ys = gs.map(c => c.y);
                      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys) };
                    };

                    if (region.shape === 'circle') {
                      const wLabel = cellSize ? (region.bounds.width / cellSize).toFixed(2) : `${Math.round(region.bounds.width)}px`;
                      const hLabel = cellSize ? (region.bounds.height / cellSize).toFixed(2) : `${Math.round(region.bounds.height)}px`;
                      const radiusX = region.bounds.width / 2;
                      const radiusY = region.bounds.height / 2;
                      const isCircle = Math.abs(radiusX - radiusY) < 0.5;
                      const rLabel = cellSize ? (radiusX / cellSize).toFixed(2) : `${Math.round(radiusX)}px`;
                      const rxLabel = cellSize ? (radiusX / cellSize).toFixed(2) : `${Math.round(radiusX)}px`;
                      const ryLabel = cellSize ? (radiusY / cellSize).toFixed(2) : `${Math.round(radiusY)}px`;
                      return (
                        <>
                          {centerGrid && (
                            <div className="flex justify-between items-center">
                              <span>Center</span>
                              <span className="font-mono text-gray-900 font-medium">({centerGrid.x.toFixed(1)}, {centerGrid.y.toFixed(1)})</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span>Width</span>
                            <span className="font-mono text-gray-900 font-medium">{wLabel}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Height</span>
                            <span className="font-mono text-gray-900 font-medium">{hLabel}</span>
                          </div>
                          {isCircle ? (
                            <div className="flex justify-between items-center">
                              <span>Radius</span>
                              <span className="font-mono text-gray-900 font-medium">{rLabel}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-center">
                                <span>Radius X</span>
                                <span className="font-mono text-gray-900 font-medium">{rxLabel}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Radius Y</span>
                                <span className="font-mono text-gray-900 font-medium">{ryLabel}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-center">
                            <span>Rotation</span>
                            <span className="font-mono text-gray-900 font-medium">{Math.round((region.rotation || 0) * 180 / Math.PI)}°</span>
                          </div>
                        </>
                      );
                    }

                    if (region.shape === 'line') {
                      const pixLen = region.lineLength ?? 0;
                      const lenLabel = cellSize ? (pixLen / cellSize).toFixed(2) : `${Math.round(pixLen)}px`;
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span>Length</span>
                            <span className="font-mono text-gray-900 font-medium">{lenLabel}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Angle</span>
                            <span className="font-mono text-gray-900 font-medium">{region.lineAngle !== undefined ? Math.round(region.lineAngle) : 0}°</span>
                          </div>
                        </>
                      );
                    }

                    // Rectangle
                    const edges = computeEdges();
                    const gridW = cellSize ? region.bounds.width / cellSize : null;
                    const gridH = cellSize ? region.bounds.height / cellSize : null;
                    return (
                      <>
                        {centerGrid && (
                          <div className="flex justify-between items-center">
                            <span>Center</span>
                            <span className="font-mono text-gray-900 font-medium">({centerGrid.x.toFixed(1)}, {centerGrid.y.toFixed(1)})</span>
                          </div>
                        )}
                        {edges && (
                          <>
                            <div className="flex justify-between items-center">
                              <span>Left Edge</span>
                              <span className="font-mono text-gray-900 font-medium">{edges.left.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Right Edge</span>
                              <span className="font-mono text-gray-900 font-medium">{edges.right.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Top Edge</span>
                              <span className="font-mono text-gray-900 font-medium">{edges.top.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Bottom Edge</span>
                              <span className="font-mono text-gray-900 font-medium">{edges.bottom.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between items-center">
                          <span>Grid Width</span>
                          <span className="font-mono text-gray-900 font-medium">{gridW !== null ? gridW.toFixed(1) : '–'} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Grid Height</span>
                          <span className="font-mono text-gray-900 font-medium">{gridH !== null ? gridH.toFixed(1) : '–'} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Width Ratio</span>
                          <span className="font-mono text-gray-900 font-medium">{Math.round(region.ratios.widthRatio * 100)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Height Ratio</span>
                          <span className="font-mono text-gray-900 font-medium">{Math.round(region.ratios.heightRatio * 100)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Rotation</span>
                          <span className="font-mono text-gray-900 font-medium">{Math.round(region.rotation * 180 / Math.PI)}°</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Child Region Points */}
                {(() => {
                  const childPoints = points.filter(point => point.parentRegionId === region.id);
                  return childPoints.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Points ({childPoints.length})
                      </div>
                      <div className="space-y-3">
                        {childPoints.map((point) => (
                          <div
                            key={point.id}
                            className={`bg-white rounded-lg p-3 border cursor-pointer transition-all ${
                              selectedPointId === point.id
                                ? 'bg-blue-50 ring-2 ring-blue-200 border-transparent'
                                : 'border-gray-100 hover:border-gray-400'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPointSelect?.(point.id);
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={point.name}
                                onChange={(e) => onPointRename?.(point.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-md py-1 flex-1 min-w-0"
                              />
                              
                              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMagnetClick(point.id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                  title="Cycle: Original → Edge → Corner → Original"
                                >
                                  <Magnet size={12} />
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPointDelete?.(point.id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="text-sm text-gray-600">
                              <div className="flex justify-between items-center">
                                <span>Grid</span>
                                <span className="font-mono text-gray-900 font-medium">
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
          <div className="text-gray-400 text-sm bg-gray-50 rounded-lg p-4 text-center">
            No child regions
          </div>
        )}
      </div>

      {/* Coordinate System */}
      <div className="panel-export-hide">
        <CoordinateDisplay
          parentRegion={parentRegion}
          selectedChild={selectedChild}
        />
      </div>

      {/* Instructions */}
      <div className="panel-export-hide bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-3">Controls</h4>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Parent: Drag to draw rectangle</li>
          <li>• Child: Drag inside parent region</li>
          <li>• Points: Double-click inside region</li>
          <li>• Rotate: Use top handle</li>
          <li>• Resize: Corner handles</li>
          <li>• Move: Drag inside region</li>
          <li>• Pan: Shift + drag</li>
          <li>• Mode Switch: Shift key</li>
          <li>• Pan: Space + drag</li>
        </ul>
      </div>
    </div>
  );
}