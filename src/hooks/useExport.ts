import { useCallback } from 'react';
import type { AnalysisData } from '../types';
import { exportToJSON, exportToCSV, downloadFile } from '../utils/export';

interface UseExportProps {
  analysisData: AnalysisData;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function useExport({ analysisData, canvasRef }: UseExportProps) {
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(analysisData);
    downloadFile(json, `analysis-${Date.now()}.json`, 'application/json');
  }, [analysisData]);

  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(analysisData);
    if (csv) {
      downloadFile(csv, `analysis-${Date.now()}.csv`, 'text/csv');
    }
  }, [analysisData]);

  const handleExportPNG = useCallback(() => {
    if (!canvasRef?.current) {
      alert('Canvas not available for export');
      return;
    }

    try {
      // Convert canvas to blob
      canvasRef.current.toBlob((blob) => {
        if (!blob) {
          alert('Failed to export PNG');
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analysis-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export PNG');
    }
  }, [canvasRef]);

  return {
    handleExportJSON,
    handleExportCSV,
    handleExportPNG,
  };
}