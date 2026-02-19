import { useCallback, useEffect, useRef } from 'react';
import type { Point, ParentRegion, ChildRegion, SelectionMode, ResizeHandle, ResizeHandleInfo, RegionPoint, ChildDrawMode } from '../types';
import { isPointInRotatedBounds, convertToGridCoordinates, distanceToSegment } from '../utils/geometry';
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
  childDrawMode?: ChildDrawMode;
  onTemporaryCircleDraw?: (cx: number, cy: number, radius: number) => void;
  onTemporaryLineDraw?: (x1: number, y1: number, x2: number, y2: number) => void;
  zoom?: number;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
  getHandleAtPoint?: (point: { x: number; y: number }, region: { x: number; y: number; width: number; height: number }, zoom?: number, rotation?: number) => ResizeHandleInfo | null;
  calculateResize?: (originalRegion: { x: number; y: number; width: number; height: number }, handleType: ResizeHandle, deltaX: number, deltaY: number, minWidth?: number, minHeight?: number, rotation?: number) => { x: number; y: number; width: number; height: number };
  onCursorChange?: (cursor: string) => void;
  isPanMode?: boolean;
  unitBasis?: 'height' | 'width';
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
  childDrawMode,
  onTemporaryCircleDraw,
  onTemporaryLineDraw,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onPanChange,
  getHandleAtPoint,
  calculateResize,
  onCursorChange,
  isPanMode = false,
  unitBasis = 'height'
}: UseCanvasInteractionProps) {
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const startScreenPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragTypeRef = useRef<'new' | 'move' | 'resize' | 'rotate' | 'pan' | 'line-endpoint' | null>(null);
  const selectedHandleRef = useRef<ResizeHandleInfo | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialAngleRef = useRef<number>(0);
  const clickedChildIdRef = useRef<number | null>(null);
  const clickedParentRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lineFirstPointRef = useRef<Point | null>(null);
  const didDeselectRef = useRef(false);
  const dragLineEndpointRef = useRef<'start' | 'end' | null>(null);

  useEffect(() => {
    lineFirstPointRef.current = null;
  }, [childDrawMode]);

  // Cancel line drawing on Escape (capture phase – fires before other keydown listeners)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && childDrawMode === 'line' && lineFirstPointRef.current !== null) {
        lineFirstPointRef.current = null;
        onRedraw();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [childDrawMode, onRedraw]);

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
    
    // Pan mode takes priority
    if (isPanMode) {
      onCursorChange('grab');
      return;
    }
    
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
      // Check line endpoint handles
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild?.shape === 'line' && selectedChild.lineStart && selectedChild.lineEnd) {
          const threshold = 10 / zoom;
          const distToStart = Math.sqrt(
            (point.x - selectedChild.lineStart.x) ** 2 + (point.y - selectedChild.lineStart.y) ** 2
          );
          const distToEnd = Math.sqrt(
            (point.x - selectedChild.lineEnd.x) ** 2 + (point.y - selectedChild.lineEnd.y) ** 2
          );
          if (distToStart <= threshold || distToEnd <= threshold) {
            onCursorChange('pointer');
            return;
          }
        }
      }

      // Check selected child rotation and resize handles (rectangle and circle shapes)
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild && (!selectedChild.shape || selectedChild.shape === 'rectangle' || selectedChild.shape === 'circle')) {
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
  }, [selectionMode, parentRegion, childRegions, selectedChildId, getHandleAtPoint, onCursorChange, isParentSelected, zoom, isPanMode]);

  const handleMouseDown = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    // If a color picker input is currently active, this mousedown is dismissing it.
    // document.activeElement still points to the input at mousedown time (before blur fires).
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLInputElement && activeEl.type === 'color') {
      return;
    }

    const point = getCanvasPoint(event, canvas);
    isDrawingRef.current = true;
    startPointRef.current = point;

    // Check for Space+drag pan mode
    if (isPanMode) {
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

    // In line mode with first point already placed, skip ALL region interaction.
    // The next mouseUp is always the second click of the new line.
    if (selectionMode === 'child' && childDrawMode === 'line' && lineFirstPointRef.current !== null) {
      dragTypeRef.current = 'new';
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
    
    // Check line endpoint handles if line child is selected
    if (selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild?.shape === 'line' && selectedChild.lineStart && selectedChild.lineEnd) {
        const threshold = 10 / zoom;
        const distToStart = Math.sqrt(
          (point.x - selectedChild.lineStart.x) ** 2 + (point.y - selectedChild.lineStart.y) ** 2
        );
        const distToEnd = Math.sqrt(
          (point.x - selectedChild.lineEnd.x) ** 2 + (point.y - selectedChild.lineEnd.y) ** 2
        );
        if (distToStart <= threshold) {
          dragTypeRef.current = 'line-endpoint';
          dragLineEndpointRef.current = 'start';
          return;
        }
        if (distToEnd <= threshold) {
          dragTypeRef.current = 'line-endpoint';
          dragLineEndpointRef.current = 'end';
          return;
        }
      }
    }

    // Check child rotation/resize handles if child is selected (rectangle and circle shapes)
    if (selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild && (!selectedChild.shape || selectedChild.shape === 'rectangle' || selectedChild.shape === 'circle')) {
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
      
      const LINE_HIT_PX = 8 / zoom;

      const isPointInChild = (child: ChildRegion, p: Point): boolean => {
        if (child.shape === 'line' && child.lineStart && child.lineEnd) {
          return distanceToSegment(p, child.lineStart, child.lineEnd) <= LINE_HIT_PX;
        }
        if (child.rotation !== 0) {
          const centerX = child.bounds.x + child.bounds.width / 2;
          const centerY = child.bounds.y + child.bounds.height / 2;
          const cos = Math.cos(-child.rotation);
          const sin = Math.sin(-child.rotation);
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const rx = centerX + dx * cos - dy * sin;
          const ry = centerY + dx * sin + dy * cos;
          return rx >= child.bounds.x && rx <= child.bounds.x + child.bounds.width &&
                 ry >= child.bounds.y && ry <= child.bounds.y + child.bounds.height;
        }
        return p.x >= child.bounds.x && p.x <= child.bounds.x + child.bounds.width &&
               p.y >= child.bounds.y && p.y <= child.bounds.y + child.bounds.height;
      };

      // First, check if clicking on the currently selected child (highest priority)
      if (selectedChildId !== null) {
        const selectedChild = childRegions.find(c => c.id === selectedChildId);
        if (selectedChild && isPointInChild(selectedChild, point)) {
          clickedChild = selectedChild;
        }
      }

      // If not clicking on selected child, check other children
      if (!clickedChild) {
        for (const child of childRegions) {
          if (child.id === selectedChildId) continue;
          if (isPointInChild(child, point)) {
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
    didDeselectRef.current = false;
    if (selectedChildId !== null) {
      onChildRegionSelect(-1);
      didDeselectRef.current = true;
    }
    if (parentRegion && isParentSelected && onParentDeselect) {
      onParentDeselect();
      didDeselectRef.current = true;
    }

    dragTypeRef.current = 'new';
  }, [getCanvasPoint, selectionMode, parentRegion, childRegions, onChildRegionSelect, selectedChildId, getHandleAtPoint, isParentSelected, zoom, onParentDeselect, isPanMode, childDrawMode]);

  const handleMouseMove = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    const point = getCanvasPoint(event, canvas);

    // Update cursor when not drawing
    if (!isDrawingRef.current) {
      updateCursor(point);
      // Line preview: show temporary line from first click to current cursor
      if (childDrawMode === 'line' && lineFirstPointRef.current !== null) {
        onRedraw();
        if (onTemporaryLineDraw) {
          onTemporaryLineDraw(lineFirstPointRef.current.x, lineFirstPointRef.current.y, point.x, point.y);
        }
      }
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

      if (selectionMode === 'parent' || !childDrawMode || childDrawMode === 'rectangle') {
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        const x = dx < 0 ? point.x : startPointRef.current.x;
        const y = dy < 0 ? point.y : startPointRef.current.y;
        if (onTemporaryDraw) {
          onTemporaryDraw(x, y, width, height, selectionMode === 'parent');
        }
      } else if (childDrawMode === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (onTemporaryCircleDraw) {
          onTemporaryCircleDraw(startPointRef.current.x, startPointRef.current.y, radius);
        }
      }
      // 'line': no drag preview (two-click model)
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
        const updatedChild: typeof selectedChild = {
          ...selectedChild,
          bounds: {
            ...selectedChild.bounds,
            x: selectedChild.bounds.x + dx,
            y: selectedChild.bounds.y + dy
          }
        };
        // Also translate line endpoints
        if (selectedChild.shape === 'line' && selectedChild.lineStart && selectedChild.lineEnd) {
          updatedChild.lineStart = { x: selectedChild.lineStart.x + dx, y: selectedChild.lineStart.y + dy };
          updatedChild.lineEnd = { x: selectedChild.lineEnd.x + dx, y: selectedChild.lineEnd.y + dy };
        }
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
          let resized = calculateResize(
            selectedChild.bounds,
            selectedHandleRef.current.type,
            dx,
            dy,
            CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE,
            CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE
          );

          // For circle shapes with corner handles, maintain current aspect ratio (supports ellipses)
          const cornerHandles: ResizeHandle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
          if (selectedChild.shape === 'circle' && cornerHandles.includes(selectedHandleRef.current.type)) {
            const origW = selectedChild.bounds.width;
            const origH = selectedChild.bounds.height;
            const scaleW = resized.width / origW;
            const scaleH = resized.height / origH;
            const scale = Math.max(scaleW, scaleH);
            const newW = origW * scale;
            const newH = origH * scale;
            const handle = selectedHandleRef.current.type;
            let adjustedX = resized.x;
            let adjustedY = resized.y;
            if (handle === 'top-left') {
              adjustedX = resized.x + resized.width - newW;
              adjustedY = resized.y + resized.height - newH;
            } else if (handle === 'top-right') {
              adjustedY = resized.y + resized.height - newH;
            } else if (handle === 'bottom-left') {
              adjustedX = resized.x + resized.width - newW;
            }
            resized = { x: adjustedX, y: adjustedY, width: newW, height: newH };
          }

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
    } else if (dragTypeRef.current === 'line-endpoint' && selectionMode === 'child' && selectedChildId !== null) {
      const selectedChild = childRegions.find(c => c.id === selectedChildId);
      if (selectedChild?.shape === 'line' && selectedChild.lineStart && selectedChild.lineEnd) {
        const newStart = dragLineEndpointRef.current === 'start' ? point : selectedChild.lineStart;
        const newEnd = dragLineEndpointRef.current === 'end' ? point : selectedChild.lineEnd;
        const lx = newEnd.x - newStart.x;
        const ly = newEnd.y - newStart.y;
        const length = Math.sqrt(lx * lx + ly * ly);
        const angle = Math.atan2(ly, lx) * 180 / Math.PI;
        const updatedChild = {
          ...selectedChild,
          lineStart: newStart,
          lineEnd: newEnd,
          lineLength: length,
          lineAngle: angle,
          bounds: {
            x: Math.min(newStart.x, newEnd.x),
            y: Math.min(newStart.y, newEnd.y),
            width: Math.max(1, Math.abs(lx)),
            height: Math.max(1, Math.abs(ly))
          },
          centerCoordinates: {
            ...selectedChild.centerCoordinates,
            pixel: { x: (newStart.x + newEnd.x) / 2, y: (newStart.y + newEnd.y) / 2 }
          }
        };
        if (onChildRegionChange) {
          onChildRegionChange(updatedChild);
        }
      }
    }
  }, [getCanvasPoint, onRedraw, onTemporaryDraw, onTemporaryCircleDraw, onTemporaryLineDraw, childDrawMode, selectionMode, parentRegion, childRegions, selectedChildId, onParentRegionChange, onChildRegionChange, onPanChange, pan, calculateResize, updateCursor]);

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
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (childDrawMode === 'circle') {
        if (dragDistance < 5 && clickedChildIdRef.current !== null) {
          onChildRegionSelect(clickedChildIdRef.current);
        } else {
          const radius = Math.sqrt(dx * dx + dy * dy);
          if (radius > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE) {
            const cx = startPointRef.current.x;
            const cy = startPointRef.current.y;
            const newChild: ChildRegion = {
              id: childRegions.length + 1,
              name: `Circle ${childRegions.filter(c => c.shape === 'circle').length + 1}`,
              shape: 'circle',
              radius,
              centerCoordinates: { grid: { x: 0, y: 0 }, pixel: { x: cx, y: cy } },
              bounds: { x: cx - radius, y: cy - radius, width: 2 * radius, height: 2 * radius },
              rotation: 0,
              ratios: { areaRatio: 0, widthRatio: 0, heightRatio: 0 }
            };
            onChildRegionAdd(newChild);

          }
        }
      } else if (childDrawMode === 'line') {
        if (dragDistance < 5 && clickedChildIdRef.current !== null) {
          // Clicked on existing child – select it and reset any pending first point
          onChildRegionSelect(clickedChildIdRef.current);
          lineFirstPointRef.current = null;
        } else if (dragDistance < 5) {
          // Two-click model
          if (lineFirstPointRef.current === null) {
            // Record first click only if this mousedown didn't just deselect a region
            if (!didDeselectRef.current) {
              lineFirstPointRef.current = { x: startPointRef.current.x, y: startPointRef.current.y };
            }
          } else {
            // Second click – create line
            const fp = lineFirstPointRef.current;
            const lx = point.x - fp.x;
            const ly = point.y - fp.y;
            const length = Math.sqrt(lx * lx + ly * ly);
            const angle = Math.atan2(ly, lx) * 180 / Math.PI;
            const minX = Math.min(fp.x, point.x);
            const minY = Math.min(fp.y, point.y);
            const bWidth = Math.max(1, Math.abs(lx));
            const bHeight = Math.max(1, Math.abs(ly));
            const newChild: ChildRegion = {
              id: childRegions.length + 1,
              name: `Line ${childRegions.filter(c => c.shape === 'line').length + 1}`,
              shape: 'line',
              lineStart: { x: fp.x, y: fp.y },
              lineEnd: { x: point.x, y: point.y },
              lineLength: length,
              lineAngle: angle,
              centerCoordinates: { grid: { x: 0, y: 0 }, pixel: { x: (fp.x + point.x) / 2, y: (fp.y + point.y) / 2 } },
              bounds: { x: minX, y: minY, width: bWidth, height: bHeight },
              rotation: 0,
              ratios: { areaRatio: 0, widthRatio: 0, heightRatio: 0 }
            };
            onChildRegionAdd(newChild);
            lineFirstPointRef.current = null;
          }
        } else if (lineFirstPointRef.current !== null) {
          // Large drag after first click – cancel
          lineFirstPointRef.current = null;
        }
      } else {
        // Rectangle (default)
        const width = Math.abs(dx);
        const height = Math.abs(dy);

        if (dragDistance < 5 && clickedChildIdRef.current !== null) {
          onChildRegionSelect(clickedChildIdRef.current);
        } else if (width > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE && height > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE) {
          const x = dx < 0 ? point.x : startPointRef.current.x;
          const y = dy < 0 ? point.y : startPointRef.current.y;
          const newChild: ChildRegion = {
            id: childRegions.length + 1,
            name: `Rectangle ${childRegions.filter(c => !c.shape || c.shape === 'rectangle').length + 1}`,
            centerCoordinates: { grid: { x: 0, y: 0 }, pixel: { x: x + width/2, y: y + height/2 } },
            bounds: { x, y, width, height },
            rotation: 0,
            ratios: { areaRatio: 0, widthRatio: 0, heightRatio: 0 }
          };
          onChildRegionAdd(newChild);
        }
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
        // Check if point is inside selected child region (line regions do not support points)
        else if (selectedChildId !== null) {
          const selectedChild = childRegions.find(c => c.id === selectedChildId);
          if (selectedChild && selectedChild.shape !== 'line') {
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
          // Child region points: origin = child center, unit = parent cell size (parentBasis/16)
          let cellSizeOverride: number | undefined;
          if (parentRegionId !== undefined && parentRegion) {
            const parentBasis = unitBasis === 'width' ? parentRegion.width : parentRegion.height;
            cellSizeOverride = parentBasis / 16;
          }
          const gridCoords = convertToGridCoordinates(point, targetRegion, 16, cellSizeOverride);
          
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
    dragLineEndpointRef.current = null;
    onRedraw();
  }, [getCanvasPoint, selectionMode, parentRegion, childRegions, onParentRegionChange, onChildRegionAdd, onChildRegionSelect, onParentSelect, onRedraw, onPointAdd, selectedChildId, isParentSelected, childDrawMode, unitBasis]);

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