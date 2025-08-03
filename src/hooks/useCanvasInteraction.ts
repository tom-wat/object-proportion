import { useCallback, useRef } from 'react';
import type { Point, ParentRegion, ChildRegion, SelectionMode } from '../types';
import { isPointInRotatedBounds } from '../utils/geometry';
import { CANVAS_CONSTANTS } from '../utils/constants';

interface UseCanvasInteractionProps {
  selectionMode: SelectionMode;
  parentRegion: ParentRegion | null;
  childRegions: ChildRegion[];
  onParentRegionChange: (region: ParentRegion | null) => void;
  onChildRegionAdd: (region: ChildRegion) => void;
  onChildRegionSelect: (id: number) => void;
  selectedChildId: number | null;
  onTemporaryDraw?: (x: number, y: number, width: number, height: number, isParent: boolean) => void;
  onRedraw: () => void;
  zoom?: number;
  pan?: { x: number; y: number };
  onPanChange?: (pan: { x: number; y: number }) => void;
}

export function useCanvasInteraction({
  selectionMode,
  parentRegion,
  childRegions,
  onParentRegionChange,
  onChildRegionAdd,
  onChildRegionSelect,
  selectedChildId,
  onTemporaryDraw,
  onRedraw,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onPanChange
}: UseCanvasInteractionProps) {
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const startScreenPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragTypeRef = useRef<'new' | 'move' | 'resize' | 'rotate' | 'pan' | null>(null);
  const selectedHandleRef = useRef<string | null>(null);
  const initialRotationRef = useRef<number>(0);
  const initialAngleRef = useRef<number>(0);

  const getCanvasPoint = useCallback((event: MouseEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Convert screen coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = screenX * scaleX;
    const canvasY = screenY * scaleY;
    
    // Apply inverse zoom and pan transformations
    const x = (canvasX - pan.x) / zoom;
    const y = (canvasY - pan.y) / zoom;
    
    return { x, y };
  }, [zoom, pan]);

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

    if (selectionMode === 'parent') {
      if (parentRegion) {
        const centerX = parentRegion.x + parentRegion.width / 2;
        const centerY = parentRegion.y + parentRegion.height / 2;
        
        // Calculate actual rotated handle position
        const handleDistance = CANVAS_CONSTANTS.ROTATION_HANDLE_DISTANCE + parentRegion.height / 2;
        const actualHandleX = centerX + Math.sin(parentRegion.rotation) * handleDistance;
        const actualHandleY = centerY - Math.cos(parentRegion.rotation) * handleDistance;
        
        const distToRotHandle = Math.sqrt(
          Math.pow(point.x - actualHandleX, 2) + Math.pow(point.y - actualHandleY, 2)
        );
        
        console.log('Handle check:', {
          clickPoint: {x: point.x, y: point.y},
          handlePos: {x: actualHandleX, y: actualHandleY},
          distance: distToRotHandle,
          rotation: parentRegion.rotation
        });
        
        if (distToRotHandle <= 10) {
          dragTypeRef.current = 'rotate';
          // Store initial rotation and angle for relative calculation
          initialRotationRef.current = parentRegion.rotation;
          initialAngleRef.current = Math.atan2(point.y - centerY, point.x - centerX);
          return;
        }

        const handleSize = CANVAS_CONSTANTS.HANDLE_SIZE;
        const handles = [
          { name: 'tl', x: parentRegion.x, y: parentRegion.y },
          { name: 'tr', x: parentRegion.x + parentRegion.width, y: parentRegion.y },
          { name: 'br', x: parentRegion.x + parentRegion.width, y: parentRegion.y + parentRegion.height },
          { name: 'bl', x: parentRegion.x, y: parentRegion.y + parentRegion.height },
        ];

        for (const handle of handles) {
          if (Math.abs(point.x - handle.x) <= handleSize && Math.abs(point.y - handle.y) <= handleSize) {
            dragTypeRef.current = 'resize';
            selectedHandleRef.current = handle.name;
            return;
          }
        }

        if (isPointInRotatedBounds(point, parentRegion)) {
          dragTypeRef.current = 'move';
          return;
        }
      }
      
      // Clicked on empty space, deselect child if any selected
      if (selectedChildId !== null) {
        onChildRegionSelect(-1);
      }
      
      dragTypeRef.current = 'new';
    } else if (selectionMode === 'child') {
      // Always start creating new child region, no selection on canvas
      dragTypeRef.current = 'new';
      // Deselect if something was selected
      if (selectedChildId !== null) {
        onChildRegionSelect(-1);
      }
    }
  }, [getCanvasPoint, selectionMode, parentRegion, onChildRegionSelect, selectedChildId]);

  const handleMouseMove = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(event, canvas);
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
    } else if (dragTypeRef.current === 'move' && parentRegion) {
      const newRegion = {
        ...parentRegion,
        x: parentRegion.x + dx,
        y: parentRegion.y + dy
      };
      onParentRegionChange(newRegion);
      startPointRef.current = point;
    } else if (dragTypeRef.current === 'rotate' && parentRegion) {
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
    }
  }, [getCanvasPoint, onRedraw, onTemporaryDraw, selectionMode, parentRegion, onParentRegionChange, onPanChange, pan]);

  const handleMouseUp = useCallback((event: MouseEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(event, canvas);
    const dx = point.x - startPointRef.current.x;
    const dy = point.y - startPointRef.current.y;

    if (dragTypeRef.current === 'new' && selectionMode === 'parent') {
      const width = Math.abs(dx);
      const height = Math.abs(dy);
      
      if (width > CANVAS_CONSTANTS.MIN_REGION_SIZE && height > CANVAS_CONSTANTS.MIN_REGION_SIZE) {
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
      
      if (width > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE && height > CANVAS_CONSTANTS.MIN_CHILD_REGION_SIZE) {
        const x = dx < 0 ? point.x : startPointRef.current.x;
        const y = dy < 0 ? point.y : startPointRef.current.y;
        
        const newChild: ChildRegion = {
          id: childRegions.length + 1,
          name: `Region ${childRegions.length + 1}`,
          isInside: parentRegion ? isPointInRotatedBounds({ x: x + width/2, y: y + height/2 }, parentRegion) : false,
          centerCoordinates: {
            grid: { x: 0, y: 0 },
            pixel: { x: x + width/2, y: y + height/2 }
          },
          bounds: { x, y, width, height },
          ratios: {
            areaRatio: 0,
            widthRatio: 0,
            heightRatio: 0
          }
        };
        onChildRegionAdd(newChild);
      }
    }

    isDrawingRef.current = false;
    dragTypeRef.current = null;
    selectedHandleRef.current = null;
    onRedraw();
  }, [getCanvasPoint, selectionMode, parentRegion, childRegions, onParentRegionChange, onChildRegionAdd, onRedraw]);

  const setupEventListeners = useCallback((canvas: HTMLCanvasElement) => {
    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e, canvas);
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e, canvas);
    const mouseUpHandler = (e: MouseEvent) => handleMouseUp(e, canvas);

    canvas.addEventListener('mousedown', mouseDownHandler);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseup', mouseUpHandler);

    return () => {
      canvas.removeEventListener('mousedown', mouseDownHandler);
      canvas.removeEventListener('mousemove', mouseMoveHandler);
      canvas.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    setupEventListeners,
  };
}