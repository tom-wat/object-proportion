import { useCallback, useRef } from 'react';
import type { LayoutFile } from '../types';
import { validateLayout } from '../utils/layoutIO';

interface UseImportProps {
  onImportLayout: (layout: LayoutFile) => void;
}

export function useImport({ onImportLayout }: UseImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text) as unknown;
          const layout = validateLayout(parsed);
          onImportLayout(layout);
        } catch (error) {
          alert(`Failed to import layout: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      };
      reader.readAsText(file);

      // Reset so the same file can be re-imported
      e.target.value = '';
    },
    [onImportLayout]
  );

  return { fileInputRef, handleImportClick, handleFileChange };
}
