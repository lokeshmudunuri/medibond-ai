import {
  DocumentClassificationType,
  HandwritingConfidence,
  DocumentQualityService,
} from './DocumentQualityService';
import { LabResultItem, ProvenanceSource } from '../types';

export type DocumentRecordStatus = 'RAW' | 'OCR_EXTRACTED' | 'USER_REVIEWED' | 'CONFIRMED' | 'STORED';

export interface DocumentVaultRecord {
  id: string;
  caseId: string;
  title: string;
  documentType: DocumentClassificationType;
  originalImageUri: string;
  thumbnailUri?: string;
  captureDate: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  rawOcrText: string;
  userVerifiedText?: string;
  confidence: HandwritingConfidence;
  isHandwritten: boolean;
  status: DocumentRecordStatus;
  doctorName?: string;
  hospitalName?: string;
  structuredLabResults?: LabResultItem[];
  structuredMedicines?: {
    name: string;
    dosage: string;
    frequency: string;
    timing: string;
  }[];
  doctorInstructions?: string[];
  aiExplanation?: string;
  notes?: string;
}

export class DocumentVaultService {
  private static recordsByCase: Map<string, DocumentVaultRecord[]> = new Map();

  /**
   * Ingests a new document into the case vault
   */
  public static addDocumentRecord(
    caseId: string,
    params: {
      title?: string;
      originalImageUri: string;
      thumbnailUri?: string;
      rawOcrText: string;
      userVerifiedText?: string;
      fileSizeBytes?: number;
      doctorName?: string;
      hospitalName?: string;
      status?: DocumentRecordStatus;
    }
  ): DocumentVaultRecord {
    const classification = DocumentQualityService.classifyDocument(params.rawOcrText);
    const handwriting = DocumentQualityService.analyzeHandwriting(params.rawOcrText, params.originalImageUri);

    const fileBytes = params.fileSizeBytes || 1024 * 350; // default ~350KB
    const formattedSize = fileBytes > 1024 * 1024
      ? `${(fileBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(fileBytes / 1024).toFixed(1)} KB`;

    let labResults: LabResultItem[] | undefined;
    if (classification.documentType === 'LabReport') {
      labResults = this.parseLabResults(params.rawOcrText);
    }

    const record: DocumentVaultRecord = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId,
      title: params.title || `${classification.documentType} - ${new Date().toLocaleDateString()}`,
      documentType: classification.documentType,
      originalImageUri: params.originalImageUri,
      thumbnailUri: params.thumbnailUri || params.originalImageUri,
      captureDate: new Date().toISOString(),
      fileSizeBytes: fileBytes,
      fileSizeFormatted: formattedSize,
      rawOcrText: params.rawOcrText,
      userVerifiedText: params.userVerifiedText || params.rawOcrText,
      confidence: handwriting.confidence,
      isHandwritten: handwriting.isHandwritten,
      status: params.status || 'STORED',
      doctorName: params.doctorName,
      hospitalName: params.hospitalName,
      structuredLabResults: labResults,
      aiExplanation: `[CareBond Local Document Intelligence]: Extracted ${classification.documentType} with ${handwriting.confidence} confidence.`,
    };

    const caseRecords = this.recordsByCase.get(caseId) || [];
    caseRecords.unshift(record);
    this.recordsByCase.set(caseId, caseRecords);

    return record;
  }

  /**
   * Retrieves all document vault records for an active case
   */
  public static getRecordsForCase(caseId: string): DocumentVaultRecord[] {
    return this.recordsByCase.get(caseId) || [];
  }

  /**
   * Retrieves all document vault records across all cases (for global vault browser)
   */
  public static getAllRecords(): DocumentVaultRecord[] {
    const all: DocumentVaultRecord[] = [];
    for (const list of this.recordsByCase.values()) {
      all.push(...list);
    }
    return all;
  }

  /**
   * Retrieves a single record by ID
   */
  public static getRecordById(recordId: string): DocumentVaultRecord | undefined {
    for (const list of this.recordsByCase.values()) {
      const found = list.find(r => r.id === recordId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Updates user verified text and transitions state to CONFIRMED / STORED
   */
  public static updateUserVerification(
    caseId: string,
    recordId: string,
    verifiedText: string
  ): DocumentVaultRecord | undefined {
    const records = this.recordsByCase.get(caseId) || [];
    const index = records.findIndex(r => r.id === recordId);
    if (index >= 0) {
      records[index].userVerifiedText = verifiedText;
      records[index].status = 'CONFIRMED';
      this.recordsByCase.set(caseId, records);
      return records[index];
    }
    return undefined;
  }

  /**
   * Parses structured lab results (CBC, Liver, Kidney, Lipid)
   */
  public static parseLabResults(text: string): LabResultItem[] {
    const results: LabResultItem[] = [];
    const lower = (text || '').toLowerCase();

    // Hemoglobin
    const hbMatch = lower.match(/(?:hemoglobin|hb)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*(g\/dl)?/);
    if (hbMatch && hbMatch[1]) {
      const val = parseFloat(hbMatch[1]);
      results.push({
        testName: 'Hemoglobin (Hb)',
        value: hbMatch[1],
        unit: 'g/dL',
        referenceRange: '13.0 - 17.0 g/dL',
        isAbnormal: val < 13.0 || val > 17.0,
        interpretation: val < 13.0 ? 'Low (Mild Anemia)' : val > 17.0 ? 'Elevated' : 'Normal',
      });
    }

    // WBC / TLC
    const wbcMatch = lower.match(/(?:wbc|tlc|total leukocyte count)\s*[:=-]?\s*(\d{4,5}|\d{1,2}(?:\.\d+)?)\s*(cells\/cumm|k\/ul)?/);
    if (wbcMatch && wbcMatch[1]) {
      let val = parseFloat(wbcMatch[1]);
      if (val < 100) val = val * 1000; // e.g. 8.5 -> 8500
      results.push({
        testName: 'Total Leukocyte Count (WBC)',
        value: val.toString(),
        unit: 'cells/cu.mm',
        referenceRange: '4,000 - 11,000 cells/cu.mm',
        isAbnormal: val < 4000 || val > 11000,
        interpretation: val > 11000 ? 'Elevated (Infection/Inflammation)' : val < 4000 ? 'Low' : 'Normal',
      });
    }

    // Platelets
    const pltMatch = lower.match(/(?:platelet|plt|platelet count)\s*[:=-]?\s*(\d{1,3}(?:,\d{3})*|\d{1,3}(?:\.\d+)?)\s*(lakhs|k\/ul|cells\/cumm)?/);
    if (pltMatch && pltMatch[1]) {
      results.push({
        testName: 'Platelet Count',
        value: pltMatch[1].replace(/,/g, ''),
        unit: 'cells/cu.mm',
        referenceRange: '150,000 - 450,000 cells/cu.mm',
        isAbnormal: false,
        interpretation: 'Normal',
      });
    }

    // Serum Creatinine
    const creatMatch = lower.match(/(?:serum creatinine|creatinine)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*(mg\/dl)?/);
    if (creatMatch && creatMatch[1]) {
      const val = parseFloat(creatMatch[1]);
      results.push({
        testName: 'Serum Creatinine',
        value: creatMatch[1],
        unit: 'mg/dL',
        referenceRange: '0.7 - 1.3 mg/dL',
        isAbnormal: val > 1.3,
        interpretation: val > 1.3 ? 'Elevated (Renal strain)' : 'Normal',
      });
    }

    // Liver AST / ALT
    const astMatch = lower.match(/(?:ast|sgot)\s*[:=-]?\s*(\d{1,3})\s*(u\/l)?/);
    if (astMatch && astMatch[1]) {
      const val = parseInt(astMatch[1], 10);
      results.push({
        testName: 'AST / SGOT',
        value: astMatch[1],
        unit: 'U/L',
        referenceRange: '10 - 40 U/L',
        isAbnormal: val > 40,
        interpretation: val > 40 ? 'Elevated' : 'Normal',
      });
    }

    const altMatch = lower.match(/(?:alt|sgpt)\s*[:=-]?\s*(\d{1,3})\s*(u\/l)?/);
    if (altMatch && altMatch[1]) {
      const val = parseInt(altMatch[1], 10);
      results.push({
        testName: 'ALT / SGPT',
        value: altMatch[1],
        unit: 'U/L',
        referenceRange: '10 - 40 U/L',
        isAbnormal: val > 40,
        interpretation: val > 40 ? 'Elevated' : 'Normal',
      });
    }

    return results;
  }
}
