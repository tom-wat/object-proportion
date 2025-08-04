import { useState, useCallback } from 'react';
import type { SelectionMode } from '../types';

interface UseImageHandlingProps {
  onImageInfoSet: (imageInfo: { width: number; height: number; name: string }) => void;
}

export function useImageHandling({ onImageInfoSet }: UseImageHandlingProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('parent');
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [isParentSelected, setIsParentSelected] = useState(false);
  const [cachedImage, setCachedImage] = useState<HTMLImageElement | null>(null);
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);

  const handleImageLoad = useCallback((file: File) => {
    if (!file || !(file instanceof File)) {
      console.error('Invalid file provided to handleImageLoad:', file);
      return;
    }

    // Clean up previous blob URL if exists
    if (cachedBlobUrl) {
      URL.revokeObjectURL(cachedBlobUrl);
    }

    const img = new Image();
    img.onload = () => {
      onImageInfoSet({
        width: img.width,
        height: img.height,
        name: file.name
      });
      setImageLoaded(true);
      setSelectionMode('parent');
      setImageFile(file);
      setCachedImage(img);
    };
    img.onerror = (error) => {
      console.error('Failed to load image in App component:', error);
    };
    
    try {
      const blobUrl = URL.createObjectURL(file);
      setCachedBlobUrl(blobUrl);
      img.src = blobUrl;
    } catch (error) {
      console.error('Failed to create object URL in App component:', error);
    }
  }, [onImageInfoSet, cachedBlobUrl]);

  const handleParentRegionSelect = useCallback(() => {
    setIsParentSelected(true);
    setSelectedChildId(null);
    setSelectionMode('parent');
  }, []);

  const resetImageState = useCallback(() => {
    setSelectedChildId(null);
    setIsParentSelected(false);
    setSelectionMode('parent');
    
    // Clean up cached resources
    if (cachedBlobUrl) {
      URL.revokeObjectURL(cachedBlobUrl);
      setCachedBlobUrl(null);
    }
    setCachedImage(null);
  }, [cachedBlobUrl]);

  return {
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
    resetImageState,
  };
}