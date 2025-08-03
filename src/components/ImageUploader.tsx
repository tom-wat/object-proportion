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
          w-full h-full min-h-96 border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <svg 
          className="w-16 h-16 text-gray-400 mb-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
          />
        </svg>
        
        <div className="space-y-3">
          <p className="text-lg font-medium text-gray-700">
            Drop image here
          </p>
          <p className="text-sm text-gray-500">
            or click to select file
          </p>
          <div className="text-sm text-gray-400 pt-2">
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