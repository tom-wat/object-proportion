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
          w-full h-full min-h-[80vh] border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center bg-white
          ${isDragOver
            ? 'border-blue-300 bg-blue-50/50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="space-y-4">
          <div className="text-6xl text-gray-300">
            <svg
              className="w-16 h-16 mx-auto"
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
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop image here or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supports: JPEG, PNG, GIF, WebP (Max: 10MB, 8000×8000px)
            </p>
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