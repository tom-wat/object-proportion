import { useCallback, useRef } from 'react';
import type { Point, ParentRegion, ChildRegion, SelectionMode, ResizeHandle, ResizeHandleInfo, RegionPoint } from '../types';
import { isPointInRotatedBounds, convertToGridCoordinates } from '../utils/geometry';
import { CANVAS_CONSTANTS } from '../utils/constants';

interface UseCanvasInteractionProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionChange?: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  isParentSelected?: boolean;
  onParentDeselect?: () => void;
  onParentSelect?: () => void;
  onSelectionModeChange?: (mode: SelectionMode) => void;
  onPointAdd?: (point: Omit<RegionPoint, 'id'>) => void;
  onTemporaryDraw?: (x: number, y: number, width: number, height: number, isParent: boolean) => void;
  onRedraw: () => void;
  zoom?: number;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  getHandleAtPoint?: (point: { x: number; y: number }, region: { x: number; y: number; width: number; height: number }, zoom?: number, rotation?: number) => ResizeHandleInfo | null;
  calculateResize?: (originalRegion: { x: number; y: number; width: number; height: number }, handleType: ResizeHandle, deltaX: number, deltaY: number, minWidth?: number, minHeight?: number, rotation?: number) => { x: number; y: number; width: number; height: number };
  onCursorChange?: (cursor: string) => void;
}

export function useCanvasInteraction({
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
  // onSelectionModeChange, // Currently unused due to mode restrictions
  onPointAdd,
  onTemporaryDraw,
  onRedraw,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onPanChange,
  getHandleAtPoint,
  calculateResize,
  onCursorChange
}: UseCanvasInteractionProps) {
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const startScreenPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragTypeRef = useRef<'new' | 'move' | 'resize' | 'rotate' | 'pan' | null>(null);
  const selectedHandleRef = useRef<ResizeHandleInfo | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialAngleRef = useRef<number>(0);
  const clickedChildIdRef = useRef<number | null>(null);
  const clickedParentRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getCanvasPoint = useCallback((event: MouseEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Convert screen coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = screenX * scaleX;
    const canvasY = screenY * scaleY;
    
    // Apply inverse zoom and pan transformations only
    const x = (canvasX - pan.x) / zoom;
    const y = (canvasY - pan.y) / zoom;
    
    // Don't apply rotation transformation for mouse coordinates
    // This keeps region creation coordinates aligned with visual display
    
    return { x, y };
  }, [zoom, pan]);


  const updateCursor = useCallback((point: Point) => {
    if (!onCursorChange) return;
    
    let cursor = 'crosshair'; // default cursor
    
    if (selectionMode === 'parent' && parentRegion && isParentSelected) {
      const centerX = parentRegion.x + parentRegion.width / 2;
      const centerY = parentRegion.y + parentRegion.height / 2;
      
      // Check rotation handle (transform point to local coordinate system)
      let localX = point.x;
      let localY = point.y;
      
      if (parentRegion.rotation !== 0) {
        // Apply inverse rotation to point
        const cos = Math.cos(-parentRegion.rotation);
        const sin = Math.sin(-parentRegion.rotation);
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        localX = centerX + dx * cos - dy * sin;
        localY = centerY + dx * sin + dy * cos;
      }
      
      const handleY = parentRegion.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
      const distToRotHandle = Math.sqrt(
        Math.pow(localX - (parentRegion.x + parentRegion.width/2), 2) + 
        Math.pow(localY - handleY, 2)
      );
      
      if (distToRotHandle <= 10 / zoom) {
        cursor = 'grab';
        onCursorChange(cursor);
        return;
      }
      
      // Check resize handles - use simple cursor
      if (getHandleAtPoint) {
        const handle = getHandleAtPoint({x: localX, y: localY}, parentRegion, 0, zoom);
        if (handle) {
          cursor = 'pointer'; // Resize handle cursor
          onCursorChange(cursor);
          return;
        }
      }
      
      // Check if inside region for move
      if (isPointInRotatedBounds(point, parentRegion)) {
        cursor = 'move';
      }
    } else if (selectionMode === 'child') {
      // Check selected child rotation and resize handles first
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild) {
          const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
          const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
          
          // Check rotation handle (transform point to local coordinate system)
          let localX = point.x;
          let localY = point.y;
          
          if (selectedChild.rotation !== 0) {
            // Apply inverse rotation to point
            const cos = Math.cos(-selectedChild.rotation);
            const sin = Math.sin(-selectedChild.rotation);
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            localX = centerX + dx * cos - dy * sin;
            localY = centerY + dx * sin + dy * cos;
          }
          
          const handleY = selectedChild.bounds.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
          const distToRotHandle = Math.sqrt(
            Math.pow(localX - (selectedChild.bounds.x + selectedChild.bounds.width/2), 2) + 
            Math.pow(localY - handleY, 2)
          );
          
          if (distToRotHandle <= 10 / zoom) {
            cursor = 'grab';
            onCursorChange(cursor);
            return;
          }
          
          // Check resize handles - use simple cursor
          if (getHandleAtPoint) {
            const handle = getHandleAtPoint({x: localX, y: localY}, selectedChild.bounds, 0, zoom);
            if (handle) {
              cursor = 'pointer'; // Resize handle cursor
              onCursorChange(cursor);
              return;
            }
          }
        }
      }
      
      // Check if hovering over selected child region (move cursor only for selected child)
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild) {
          // Check if inside region for move (using rotated bounds check)
          if (selectedChild.rotation !== 0) {
            // For rotated child regions, use a more sophisticated bounds check
            const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
            const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
            const cos = Math.cos(-selectedChild.rotation);
            const sin = Math.sin(-selectedChild.rotation);
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const rotatedX = centerX + dx * cos - dy * sin;
            const rotatedY = centerY + dx * sin + dy * cos;
            
            if (rotatedX >= selectedChild.bounds.x && rotatedX <= selectedChild.bounds.x + selectedChild.bounds.width &&
                rotatedY >= selectedChild.bounds.y && rotatedY <= selectedChild.bounds.y + selectedChild.bounds.height) {
              cursor = 'move';
            }
          } else {
            // Simple bounds check for non-rotated child
            if (point.x >= selectedChild.bounds.x && point.x <= selectedChild.bounds.x + selectedChild.bounds.width &&
                point.y >= selectedChild.bounds.y && point.y <= selectedChild.bounds.y + selectedChild.bounds.height) {
              cursor = 'move';
            }
          }
        }
      }
    }
    
    onCursorChange(cursor);
  }, [selectionMode, parentRegion, childRegions, selectedChildId, getHandleAtPoint, onCursorChange, isParentSelected, zoom]);

  const handleMouseDown = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    
    const point = getCanvasPoint(event, canvas);
    isDrawingRef.current = true;
    startPointRef.current = point;

    // Check for Shift+drag pan mode
    if (event.shiftKey) {
      dragTypeRef.current = 'pan';
      // Store initial screen point for pan calculations
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      startScreenPointRef.current = {
        x: screenX * scaleX,
        y: screenY * scaleY
      };
      return;
    }

    // First priority: Check for handles (rotation, resize) even if outside region bounds
    // This ensures handles work even when they extend beyond the visible region
    
    // Check parent rotation/resize handles if parent is selected
    if (parentRegion && isParentSelected) {
      const centerX = parentRegion.x + parentRegion.width / 2;
      const centerY = parentRegion.y + parentRegion.height / 2;
      
      // Check rotation handle using local coordinates
      let localX = point.x;
      let localY = point.y;
      
      if (parentRegion.rotation !== 0) {
        // Apply inverse rotation to point
        const cos = Math.cos(-parentRegion.rotation);
        const sin = Math.sin(-parentRegion.rotation);
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        localX = centerX + dx * cos - dy * sin;
        localY = centerY + dx * sin + dy * cos;
      }
      
      const handleY = parentRegion.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
      const distToRotHandle = Math.sqrt(
        Math.pow(localX - (parentRegion.x + parentRegion.width/2), 2) + 
        Math.pow(localY - handleY, 2)
      );
      
      if (distToRotHandle <= 10 / zoom) {
        dragTypeRef.current = 'rotate';
        // Store initial rotation and angle for relative calculation
        initialRotationRef.current = parentRegion.rotation;
        initialAngleRef.current = Math.atan2(point.y - centerY, point.x - centerX);
        return;
      }

      // Check for resize handles using local coordinate system
      if (getHandleAtPoint) {
        const handle = getHandleAtPoint({x: localX, y: localY}, parentRegion, 0, zoom);
        if (handle) {
          dragTypeRef.current = 'resize';
          selectedHandleRef.current = handle;
          return;
        }
      }
    }
    
    // Check child rotation/resize handles if child is selected
    if (selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild) {
        const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
        const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
        
        // Check rotation handle using local coordinates
        let localX = point.x;
        let localY = point.y;
        
        if (selectedChild.rotation !== 0) {
          // Apply inverse rotation to point
          const cos = Math.cos(-selectedChild.rotation);
          const sin = Math.sin(-selectedChild.rotation);
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          localX = centerX + dx * cos - dy * sin;
          localY = centerY + dx * sin + dy * cos;
        }
        
        const handleY = selectedChild.bounds.y - CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE / zoom;
        const distToRotHandle = Math.sqrt(
          Math.pow(localX - (selectedChild.bounds.x + selectedChild.bounds.width/2), 2) + 
          Math.pow(localY - handleY, 2)
        );
        
        if (distToRotHandle <= 10 / zoom) {
          dragTypeRef.current = 'rotate';
          // Store initial rotation and angle for relative calculation
          initialRotationRef.current = selectedChild.rotation;
          initialAngleRef.current = Math.atan2(point.y - centerY, point.x - centerX);
          return;
        }

        // Check for resize handles using local coordinate system
        if (getHandleAtPoint) {
          const handle = getHandleAtPoint({x: localX, y: localY}, selectedChild.bounds, 0, zoom);
          if (handle) {
            dragTypeRef.current = 'resize';
            selectedHandleRef.current = handle;
            return;
          }
        }
      }
    }

    // Second priority: Mode-restricted region selection
    
    // In parent mode: Only check parent region clicks
    if (selectionMode === 'parent' && parentRegion && isPointInRotatedBounds(point, parentRegion)) {
      // If parent is selected, check for move interaction
      if (isParentSelected) {
        dragTypeRef.current = 'move';
        return;
      } else {
        // Parent exists but not selected, mark for selection
        clickedParentRef.current = true;
        dragTypeRef.current = 'new';
        return;
      }
    }
    
    // In child mode: Only check child region clicks with selection priority
    if (selectionMode === 'child') {
      let clickedChild: ChildRegion | null = null;
      
      // First, check if clicking on the currently selected child (highest priority)
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild) {
          let pointInSelectedChild = false;
          
          if (selectedChild.rotation !== 0) {
            // For rotated child regions, use rotated bounds check
            const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
            const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
            const cos = Math.cos(-selectedChild.rotation);
            const sin = Math.sin(-selectedChild.rotation);
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const rotatedX = centerX + dx * cos - dy * sin;
            const rotatedY = centerY + dx * sin + dy * cos;
            
            pointInSelectedChild = rotatedX >= selectedChild.bounds.x && rotatedX <= selectedChild.bounds.x + selectedChild.bounds.width &&
                         rotatedY >= selectedChild.bounds.y && rotatedY <= selectedChild.bounds.y + selectedChild.bounds.height;
          } else {
            // Simple bounds check for non-rotated child
            pointInSelectedChild = point.x >= selectedChild.bounds.x && point.x <= selectedChild.bounds.x + selectedChild.bounds.width &&
                         point.y >= selectedChild.bounds.y && point.y <= selectedChild.bounds.y + selectedChild.bounds.height;
          }
          
          if (pointInSelectedChild) {
            clickedChild = selectedChild;
          }
        }
      }
      
      // If not clicking on selected child, check other children
      if (!clickedChild) {
        for (const child of childRegions) {
          // Skip already selected child (already checked above)
          if (child.id === selectedChildId) continue;
          
          let pointInChild = false;
          
          if (child.rotation !== 0) {
            // For rotated child regions, use rotated bounds check
            const centerX = child.bounds.x + child.bounds.width / 2;
            const centerY = child.bounds.y + child.bounds.height / 2;
            const cos = Math.cos(-child.rotation);
            const sin = Math.sin(-child.rotation);
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const rotatedX = centerX + dx * cos - dy * sin;
            const rotatedY = centerY + dx * sin + dy * cos;
            
            pointInChild = rotatedX >= child.bounds.x && rotatedX <= child.bounds.x + child.bounds.width &&
                       rotatedY >= child.bounds.y && rotatedY <= child.bounds.y + child.bounds.height;
          } else {
            // Simple bounds check for non-rotated child
            pointInChild = point.x >= child.bounds.x && point.x <= child.bounds.x + child.bounds.width &&
                       point.y >= child.bounds.y && point.y <= child.bounds.y + child.bounds.height;
          }
          
          if (pointInChild) {
            clickedChild = child;
            break;
          }
        }
      }
      
      if (clickedChild) {
        // If this child is already selected, handle move interaction
        if (selectedChildId === clickedChild.id) {
          dragTypeRef.current = 'move';
          return;
        } else {
          // Different child clicked, mark for selection
          clickedChildIdRef.current = clickedChild.id;
          dragTypeRef.current = 'new';
          return;
        }
      }
    }
    
    // Third priority: Handle empty space clicks - deselect current selections
    if (selectedChildId !== null) {
      onChildRegionSelect(-1);
    }
    if (parentRegion && isParentSelected && onParentDeselect) {
      onParentDeselect();
    }
    
    dragTypeRef.current = 'new';
  }, [getCanvasPoint, selectionMode, parentRegion, childRegions, onChildRegionSelect, selectedChildId, getHandleAtPoint, isParentSelected, zoom, onParentDeselect]);

  const handleMouseMove = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    const point = getCanvasPoint(event, canvas);
    
    // Update cursor when not drawing
    if (!isDrawingRef.current) {
      updateCursor(point);
      return;
    }
    const dx = point.x - startPointRef.current.x;
    const dy = point.y - startPointRef.current.y;

    // Handle pan mode
    if (dragTypeRef.current === 'pan' && onPanChange) {
      // For pan, we need screen-space delta, not transformed delta
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentScreenPoint = {
        x: screenX * scaleX,
        y: screenY * scaleY
      };
      
      const screenDx = currentScreenPoint.x - startScreenPointRef.current.x;
      const screenDy = currentScreenPoint.y - startScreenPointRef.current.y;
      
      onPanChange({
        x: pan.x + screenDx,
        y: pan.y + screenDy
      });
      
      // Update stored screen point for next movement
      startScreenPointRef.current = currentScreenPoint;
      return;
    }

    if (dragTypeRef.current === 'new' && (selectionMode === 'parent' || selectionMode === 'child')) {
      onRedraw();
      
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      const x = dx < 0 ? point.x : startPointRef.current.x;
      const y = dy < 0 ? point.y : startPointRef.current.y;

      if (onTemporaryDraw) {
        onTemporaryDraw(x, y, width, height, selectionMode === 'parent');
      }
    } else if (dragTypeRef.current === 'move' && selectionMode === 'parent' && parentRegion) {
      const newRegion = {
        ...parentRegion,
        x: parentRegion.x + dx,
        y: parentRegion.y + dy
      };
      onParentRegionChange(newRegion);
      startPointRef.current = point;
    } else if (dragTypeRef.current === 'move' && selectionMode === 'child' && selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild) {
        const updatedChild = {
          ...selectedChild,
          bounds: {
            ...selectedChild.bounds,
            x: selectedChild.bounds.x + dx,
            y: selectedChild.bounds.y + dy
          }
        };
        if (onChildRegionChange) {
          onChildRegionChange(updatedChild);
        }
        startPointRef.current = point;
      }
    } else if (dragTypeRef.current === 'resize' && selectedHandleRef.current && calculateResize) {
      if (selectionMode === 'parent' && parentRegion) {
        const resized = calculateResize(
          parentRegion,
          selectedHandleRef.current.type,
          dx,
          dy,
          CANVAS_CONSTANTS.MIN_REGION_SIZE,
          CANVAS_CONSTANTS.MIN_REGION_SIZE,
          parentRegion.rotation
        );
        
        const newRegion = {
          ...parentRegion,
          ...resized,
          aspectRatio: `${Math.round(resized.width)}:${Math.round(resized.height)}`,
          aspectRatioDecimal: resized.width / resized.height
        };
        onParentRegionChange(newRegion);
        startPointRef.current = point; // Update start point to prevent cumulative delta
      } else if (selectionMode === 'child' && selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild) {
          const resized = calculateResize(
            selectedChild.bounds,
            selectedHandleRef.current.type,
            dx,
            dy,
            CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE,
            CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE
          );
          
          const updatedChild = {
            ...selectedChild,
            bounds: resized
          };
          
          if (onChildRegionChange) {
            onChildRegionChange(updatedChild);
          }
          startPointRef.current = point; // Update start point to prevent cumulative delta
        }
      }
    } else if (dragTypeRef.current === 'rotate' && selectionMode === 'parent' && parentRegion) {
      const centerX = parentRegion.x + parentRegion.width / 2;
      const centerY = parentRegion.y + parentRegion.height / 2;
      const currentAngle = Math.atan2(point.y - centerY, point.x - centerX);
      
      // Simple relative rotation
      const angleDelta = currentAngle - initialAngleRef.current;
      const newAngle = initialRotationRef.current + angleDelta;

      const newRegion = {
        ...parentRegion,
        rotation: newAngle
      };
      onParentRegionChange(newRegion);
    } else if (dragTypeRef.current === 'rotate' && selectionMode === 'child' && selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild) {
        const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
        const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
        const currentAngle = Math.atan2(point.y - centerY, point.x - centerX);
        
        // Simple relative rotation
        const angleDelta = currentAngle - initialAngleRef.current;
        const newAngle = initialRotationRef.current + angleDelta;

        const updatedChild = {
          ...selectedChild,
          rotation: newAngle
        };
        
        if (onChildRegionChange) {
          onChildRegionChange(updatedChild);
        }
      }
    }
  }, [getCanvasPoint, onRedraw, onTemporaryDraw, selectionMode, parentRegion, childRegions, selectedChildId, onParentRegionChange, onChildRegionChange, onPanChange, pan, calculateResize, updateCursor]);

  const handleMouseUp = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(event, canvas);
    const dx = point.x - startPointRef.current.x;
    const dy = point.y - startPointRef.current.y;

    if (dragTypeRef.current === 'new' && selectionMode === 'parent') {
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      const dragDistance = Math.sqrt(dx * dx + dy * dy);
      
      // If drag distance is small and clicked inside parent region, select it
      if (dragDistance < 5 && clickedParentRef.current && onParentSelect) {
        onParentSelect();
      } else if (width > CANVAS_CONSTANTS.MIN_REGION_SIZE && height > CANVAS_CONSTANTS.MIN_REGION_SIZE) {
        // Create new parent region only if dragged significantly
        const x = dx < 0 ? point.x : startPointRef.current.x;
        const y = dy < 0 ? point.y : startPointRef.current.y;
        
        const newRegion: ParentRegion = {
          x, y, width, height,
          rotation: 0,
          aspectRatio: `${Math.round(width)}:${Math.round(height)}`,
          aspectRatioDecimal: width / height
        };
        onParentRegionChange(newRegion);
      }
    } else if (dragTypeRef.current === 'new' && selectionMode === 'child') {
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      const dragDistance = Math.sqrt(dx * dx + dy * dy);
      
      // If drag distance is small and clicked inside a child region, select it
      if (dragDistance < 5 && clickedChildIdRef.current !== null) {
        onChildRegionSelect(clickedChildIdRef.current);
      } else if (width > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE && height > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE) {
        // Create new child region only if dragged significantly
        const x = dx < 0 ? point.x : startPointRef.current.x;
        const y = dy < 0 ? point.y : startPointRef.current.y;
        
        const newChild: ChildRegion = {
          id: childRegions.length + 1,
          name: `Region ${childRegions.length + 1}`,
          centerCoordinates: {
            grid: { x: 0, y: 0 },
            pixel: { x: x + width/2, y: y + height/2 }
          },
          bounds: { x, y, width, height },
          rotation: 0,
          ratios: {
            areaRatio: 0,
            widthRatio: 0,
            heightRatio: 0
          }
        };
        onChildRegionAdd(newChild);
      }
    }

    // Handle double-click for point creation
    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Check for double-click (only on small drag distance)
    if (dragDistance < 5 && onPointAdd) {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastClickTimeRef.current;
      const distanceFromLastClick = Math.sqrt(
        Math.pow(point.x - lastClickPointRef.current.x, 2) + 
        Math.pow(point.y - lastClickPointRef.current.y, 2)
      );
      
      // Update last click info
      lastClickTimeRef.current = currentTime;
      lastClickPointRef.current = { x: point.x, y: point.y };
      
      // Double-click detected (within 500ms and 10px distance)
      if (timeDiff < 500 && distanceFromLastClick < 10) {
        // Determine which region the point belongs to
        let targetRegion: ParentRegion | null = null;
        let parentRegionId: number | undefined = undefined;
        
        // Check if point is inside selected parent region
        if (parentRegion && isParentSelected && isPointInRotatedBounds(point, parentRegion)) {
          targetRegion = parentRegion;
          parentRegionId = undefined; // null indicates parent region point
        }
        // Check if point is inside selected child region
        else if (selectedChildId !== null) {
          const selectedChild = childRegions.find(c => c.id === selectedChildId);
          if (selectedChild) {
            let isInsideChild = false;
            
            if (selectedChild.rotation !== 0) {
              // For rotated child regions
              const centerX = selectedChild.bounds.x + selectedChild.bounds.width / 2;
              const centerY = selectedChild.bounds.y + selectedChild.bounds.height / 2;
              const cos = Math.cos(-selectedChild.rotation);
              const sin = Math.sin(-selectedChild.rotation);
              const dx_local = point.x - centerX;
              const dy_local = point.y - centerY;
              const rotatedX = centerX + dx_local * cos - dy_local * sin;
              const rotatedY = centerY + dx_local * sin + dy_local * cos;
              
              isInsideChild = rotatedX >= selectedChild.bounds.x && 
                             rotatedX <= selectedChild.bounds.x + selectedChild.bounds.width &&
                             rotatedY >= selectedChild.bounds.y && 
                             rotatedY <= selectedChild.bounds.y + selectedChild.bounds.height;
            } else {
              // Simple bounds check for non-rotated child
              isInsideChild = point.x >= selectedChild.bounds.x && 
                             point.x <= selectedChild.bounds.x + selectedChild.bounds.width &&
                             point.y >= selectedChild.bounds.y && 
                             point.y <= selectedChild.bounds.y + selectedChild.bounds.height;
            }
            
            if (isInsideChild) {
              targetRegion = {
                x: selectedChild.bounds.x,
                y: selectedChild.bounds.y,
                width: selectedChild.bounds.width,
                height: selectedChild.bounds.height,
                rotation: selectedChild.rotation,
                aspectRatio: '',
                aspectRatioDecimal: 0
              };
              parentRegionId = selectedChildId;
            }
          }
        }
        
        // Create point if we have a target region
        if (targetRegion) {
          const gridCoords = convertToGridCoordinates(point, targetRegion, 16);
          
          const newPoint: Omit<RegionPoint, 'id'> = {
            name: '', // Will be set by handlePointAdd
            parentRegionId,
            coordinates: {
              pixel: point,
              grid: gridCoords
            }
          };
          
          onPointAdd(newPoint);
        }
      }
    }

    isDrawingRef.current = false;
    dragTypeRef.current = null;
    selectedHandleRef.current = null;
    clickedChildIdRef.current = null;
    clickedParentRef.current = false;
    onRedraw();
  }, [getCanvasPoint, selectionMode, parentRegion, childRegions, onParentRegionChange, onChildRegionAdd, onChildRegionSelect, onParentSelect, onRedraw, onPointAdd, selectedChildId, isParentSelected]);

  const setupEventListeners = useCallback((canvas: HTMLCanvasElement) => {
    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e, canvas);
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e, canvas);
    const mouseUpHandler = (e: MouseEvent) => handleMouseUp(e, canvas);
    
    // Add mouse leave handler to reset cursor
    const mouseLeaveHandler = () => {
      if (onCursorChange) {
        onCursorChange('default');
      }
    };

    canvas.addEventListener('mousedown', mouseDownHandler);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);

    return () => {
      canvas.removeEventListener('mousedown', mouseDownHandler);
      canvas.removeEventListener('mousemove', mouseMoveHandler);
      canvas.removeEventListener('mouseup', mouseUpHandler);
      canvas.removeEventListener('mouseleave', mouseLeaveHandler);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, onCursorChange]);

  return {
    setupEventListeners,
  };
}