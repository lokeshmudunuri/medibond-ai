import { create } from 'zustand';
import { MedicineEntity, ReportEntity } from '../types';
import {
  DocumentClassificationType,
  DocumentProcessor,
  ProcessedDocumentResult,
} from '../services/DocumentProcessor';
import { HealthMemoryService } from '../services/HealthMemoryService';
import {
  CapturedDocumentImage,
  NativeDocumentCaptureService,
} from '../services/NativeDocumentCapture';
import { NativeOCRService } from '../services/NativeOCRService';

export type DocumentProcessingState =
  | 'IDLE'
  | 'SELECTING_IMAGE'
  | 'PREPARING_IMAGE'
  | 'LOADING_OCR'
  | 'EXTRACTING_TEXT'
  | 'ANALYZING_DOCUMENT'
  | 'READY_FOR_REVIEW'
  | 'ERROR';

interface DocumentStoreState {
  reports: ReportEntity[];
  processingState: DocumentProcessingState;
  statusMessage: string;
  capturedImage: CapturedDocumentImage | null;
  activeScanResult: ProcessedDocumentResult | null;
  selectedCaseId?: string;

  // Actions
  captureFromCamera: () => Promise<ProcessedDocumentResult | null>;
  pickFromGallery: () => Promise<ProcessedDocumentResult | null>;
  importFile: () => Promise<ProcessedDocumentResult | null>;
  processRawText: (text: string, title?: string, overrideType?: DocumentClassificationType, caseId?: string) => Promise<ProcessedDocumentResult>;
  reprocessWithOcrText: (editedText: string, overrideType?: DocumentClassificationType) => Promise<ProcessedDocumentResult>;
  confirmAndCommitToCase: (targetCaseId?: string) => void;
  setSelectedCaseId: (caseId?: string) => void;
  deleteReport: (docId: string) => boolean;
  refreshReports: () => void;
  resetActiveScan: () => void;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => {
  const processor = DocumentProcessor.getInstance();
  const memory = HealthMemoryService.getInstance();
  const captureService = NativeDocumentCaptureService.getInstance();
  const ocrService = NativeOCRService.getInstance();

  const runOcrPipeline = async (image: CapturedDocumentImage): Promise<ProcessedDocumentResult> => {
    set({
      processingState: 'PREPARING_IMAGE',
      statusMessage: 'Preprocessing image for contrast & clarity...',
      capturedImage: image,
    });

    set({
      processingState: 'LOADING_OCR',
      statusMessage: 'Initializing on-device offline OCR model...',
    });

    set({
      processingState: 'EXTRACTING_TEXT',
      statusMessage: 'Reading document text blocks locally...',
    });

    const ocrResult = await ocrService.recognizeText(image.path || image.uri, {
      enhanceContrast: true,
    });

    set({
      processingState: 'ANALYZING_DOCUMENT',
      statusMessage: 'Classifying document and extracting clinical entities...',
    });

    const docTitle = image.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const activeCase = get().selectedCaseId;

    const processed = await processor.processDocument(
      ocrResult.text || '',
      docTitle,
      image.path,
      undefined,
      activeCase
    );

    set({
      processingState: 'READY_FOR_REVIEW',
      statusMessage: 'Extracted medical data ready for verification',
      activeScanResult: processed,
    });

    return processed;
  };

  return {
    reports: memory.getReports(),
    processingState: 'IDLE',
    statusMessage: '',
    capturedImage: null,
    activeScanResult: null,
    selectedCaseId: undefined,

    captureFromCamera: async () => {
      try {
        set({ processingState: 'SELECTING_IMAGE', statusMessage: 'Launching Camera...' });
        const image = await captureService.captureFromCamera();
        return await runOcrPipeline(image);
      } catch (err: any) {
        if (err?.message?.includes('CANCELLED')) {
          set({ processingState: 'IDLE', statusMessage: '' });
          return null;
        }
        set({
          processingState: 'ERROR',
          statusMessage: err?.message || 'Failed to capture from camera',
        });
        throw err;
      }
    },

    pickFromGallery: async () => {
      try {
        set({ processingState: 'SELECTING_IMAGE', statusMessage: 'Opening Gallery...' });
        const image = await captureService.pickFromGallery();
        return await runOcrPipeline(image);
      } catch (err: any) {
        if (err?.message?.includes('CANCELLED')) {
          set({ processingState: 'IDLE', statusMessage: '' });
          return null;
        }
        set({
          processingState: 'ERROR',
          statusMessage: err?.message || 'Failed to select image from gallery',
        });
        throw err;
      }
    },

    importFile: async () => {
      try {
        set({ processingState: 'SELECTING_IMAGE', statusMessage: 'Opening Document Picker...' });
        const image = await captureService.importMedicalFile();
        return await runOcrPipeline(image);
      } catch (err: any) {
        if (err?.message?.includes('CANCELLED')) {
          set({ processingState: 'IDLE', statusMessage: '' });
          return null;
        }
        set({
          processingState: 'ERROR',
          statusMessage: err?.message || 'Failed to import medical document',
        });
        throw err;
      }
    },

    processRawText: async (text: string, title = 'Medical Document', overrideType?: DocumentClassificationType, caseId?: string) => {
      set({ processingState: 'ANALYZING_DOCUMENT', statusMessage: 'Extracting medical entities...' });
      try {
        const result = await processor.processDocument(text, title, undefined, overrideType, caseId);
        set({
          processingState: 'READY_FOR_REVIEW',
          statusMessage: 'Document processed',
          activeScanResult: result,
        });
        return result;
      } catch (err: any) {
        set({ processingState: 'ERROR', statusMessage: err?.message || 'Processing error' });
        throw err;
      }
    },

    reprocessWithOcrText: async (editedText: string, overrideType?: DocumentClassificationType) => {
      const current = get().activeScanResult;
      const title = current?.documentTitle || 'Updated Medical Document';
      const path = current?.localFilePath;
      const caseId = get().selectedCaseId;

      set({ processingState: 'ANALYZING_DOCUMENT', statusMessage: 'Re-analyzing updated OCR text...' });
      const updated = await processor.processDocument(editedText, title, path, overrideType, caseId);
      set({
        processingState: 'READY_FOR_REVIEW',
        statusMessage: 'Updated entities ready for review',
        activeScanResult: updated,
      });
      return updated;
    },

    confirmAndCommitToCase: (targetCaseId?: string) => {
      const active = get().activeScanResult;
      if (!active) return;

      const caseIdToUse = targetCaseId || get().selectedCaseId;
      processor.commitDocumentToCase(active, caseIdToUse);

      set({
        processingState: 'IDLE',
        statusMessage: 'Document successfully saved to Case Memory',
        activeScanResult: null,
        capturedImage: null,
        reports: memory.getReports(),
      });
    },

    setSelectedCaseId: (caseId?: string) => {
      set({ selectedCaseId: caseId });
    },

    deleteReport: (docId: string) => {
      const success = processor.deleteDocument(docId);
      if (success) {
        set({ reports: memory.getReports() });
      }
      return success;
    },

    refreshReports: () => {
      set({ reports: memory.getReports() });
    },

    resetActiveScan: () => {
      set({
        processingState: 'IDLE',
        statusMessage: '',
        activeScanResult: null,
        capturedImage: null,
      });
    },
  };
});
