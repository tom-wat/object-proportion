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

  const handleImageLoad = useCallback((file: File) => {
    if (!file || !(file instanceof File)) {
      console.error('Invalid file provided to handleImageLoad:', file);
      return;
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
    };
    img.onerror = (error) => {
      console.error('Failed to load image in App component:', error);
    };
    
    try {
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Failed to create object URL in App component:', error);
    }
  }, [onImageInfoSet]);

  const resetImageState = useCallback(() => {
    setSelectedChildId(null);
    setSelectionMode('parent');
  }, []);

  return {
    imageFile,
    imageLoaded,
    selectionMode,
    selectedChildId,
    setSelectionMode,
    setSelectedChildId,
    handleImageLoad,
    resetImageState,
  };
}