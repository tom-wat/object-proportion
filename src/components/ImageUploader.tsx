import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageLoad: (file: File) => void;
  className?: string;
}

export function ImageUploader({ onImageLoad, className = '' }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      onImageLoad(file);
    }
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);


  return (
    <div className={className}>
      <div
        className={`
          w-full h-full min-h-96 border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer flex flex-col items-center justify-center
          ${isDragOver 
            ? 'border-blue-300 bg-blue-50/50' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <svg 
          className="w-12 h-12 text-gray-300 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        
        <div className="space-y-2">
          <p className="text-base font-medium text-gray-700">
            Drop image here
          </p>
          <p className="text-sm text-gray-500">
            or click to select file
          </p>
          <div className="text-xs text-gray-400 pt-1">
            JPEG, PNG, GIF, WebP (max 10MB)
          </div>
        </div>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}