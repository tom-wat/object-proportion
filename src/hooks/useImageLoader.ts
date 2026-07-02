import { useCallback } from 'react';

interface UseImageLoaderProps {
  onImageLoad: (image: HTMLImageElement, canvas: HTMLCanvasElement) => void;
}

export function useImageLoader({ onImageLoad }: UseImageLoaderProps) {
  const loadImageFromCached = useCallback((cachedImage: HTMLImageElement, canvas: HTMLCanvasElement | null) => {
    if (!cachedImage) {
      console.error('No cached image provided to loadImageFromCached');
      return;
    }

    if (!canvas) {
      console.error('Canvas not available for image loading');
      return;
    }

    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      // Get the actual parent container
      let container = canvas.parentElement;
      while (container && (container.clientWidth === 0 || container.clientHeight === 0)) {
        container = container.parentElement;
      }
      
      if (!container) {
        // Fallback to viewport-based size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        canvas.width = Math.floor(viewportWidth * 0.8);
        canvas.height = Math.floor(viewportHeight * 0.8);
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        onImageLoad(cachedImage, canvas);
        return;
      }
      
      // Set canvas size to match container exactly
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Canvas size matches container exactly
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;
      
      onImageLoad(cachedImage, canvas);
    }, 10);
  }, [onImageLoad]);

  return {
    loadImageFromCached,
  };
}