import { useCallback } from 'react';

interface UseImageLoaderProps {
  onImageLoad: (image: HTMLImageElement, canvas: HTMLCanvasElement) => void;
}

export function useImageLoader({ onImageLoad }: UseImageLoaderProps) {
  const resizeCanvas = useCallback((canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    // Get parent container dimensions
    const parentRect = canvas.parentElement?.getBoundingClientRect();
    if (!parentRect) {
      console.warn('Could not get parent container dimensions, using image size');
      canvas.style.width = `${img.width}px`;
      canvas.style.height = `${img.height}px`;
      return;
    }
    
    // Calculate scaling to fit parent width while maintaining aspect ratio
    const containerWidth = parentRect.width - 32; // Account for padding
    const containerHeight = parentRect.height - 32; // Account for padding
    
    const imageAspectRatio = img.width / img.height;
    
    // Scale to fit container width
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / imageAspectRatio;
    
    // If height exceeds container, scale to fit height instead
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspectRatio;
    }
    
    // Set CSS size for display
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    console.log('Canvas display size updated:', displayWidth, 'x', displayHeight);
  }, []);

  const loadImage = useCallback((file: File, canvas: HTMLCanvasElement | null) => {
    if (!file || !(file instanceof File)) {
      console.error('Invalid file provided to loadImage:', file);
      return;
    }

    if (!canvas) {
      console.error('Canvas not available for image loading');
      return;
    }

    const img = new Image();
    img.onload = () => {
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
          onImageLoad(img, canvas);
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
        
        onImageLoad(img, canvas);
      }, 10);
    };
    
    img.onerror = (error) => {
      console.error('Image load error:', error);
    };
    
    try {
      img.src = URL.createObjectURL(file);
      console.log('Loading image from:', img.src);
    } catch (error) {
      console.error('Failed to create object URL:', error);
    }
  }, [onImageLoad]);

  return {
    loadImage,
    resizeCanvas,
  };
}