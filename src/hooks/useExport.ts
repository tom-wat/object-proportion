import { useCallback } from 'react';
import type { AnalysisData } from '../types';
import { exportToJSON, exportToCSV, copyToClipboard, downloadFile } from '../utils/export';

interface UseExportProps {
  analysisData: AnalysisData;
}

export function useExport({ analysisData }: UseExportProps) {
  const handleExportJSON = useCallback(async () => {
    const json = exportToJSON(analysisData);
    try {
      await copyToClipboard(json);
      alert('JSON data copied to clipboard');
    } catch {
      downloadFile(json, `analysis-${Date.now()}.json`, 'application/json');
    }
  }, [analysisData]);

  const handleExportCSV = useCallback(async () => {
    const csv = exportToCSV(analysisData);
    if (csv) {
      try {
        await copyToClipboard(csv);
        alert('CSV data copied to clipboard');
      } catch {
        downloadFile(csv, `analysis-${Date.now()}.csv`, 'text/csv');
      }
    }
  }, [analysisData]);

  return {
    handleExportJSON,
    handleExportCSV,
  };
}