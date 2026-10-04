import { create } from 'zustand';
import { MedicineEntity, ReportEntity } from '../types';
import { DocumentProcessor, ProcessedDocumentResult } from '../services/DocumentProcessor';
import { HealthMemoryService } from '../services/HealthMemoryService';

interface DocumentStoreState {
  reports: ReportEntity[];
  isScanning: boolean;
  activeScanResult: ProcessedDocumentResult | null;
  scanDocument: (rawText: string, title: string) => Promise<ProcessedDocumentResult>;
  refreshReports: () => void;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => {
  const processor = DocumentProcessor.getInstance();
  const memory = HealthMemoryService.getInstance();

  return {
    reports: memory.getReports(),
    isScanning: false,
    activeScanResult: null,

    scanDocument: async (rawText: string, title: string) => {
      set({ isScanning: true });
      try {
        const result = await processor.processDocument(rawText, title);
        set({
          isScanning: false,
          activeScanResult: result,
          reports: memory.getReports(),
        });
        return result;
      } catch (err) {
        set({ isScanning: false });
        throw err;
      }
    },

    refreshReports: () => {
      set({ reports: memory.getReports() });
    },
  };
});
