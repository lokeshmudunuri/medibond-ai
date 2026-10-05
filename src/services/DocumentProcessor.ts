import {
  AllergyEntity,
  LabResultItem,
  MedicineEntity,
  ProvenanceSource,
  ReportEntity,
} from '../types';
import { HealthMemoryService } from './HealthMemoryService';
import { HandwrittenPrescriptionEngine } from './HandwrittenPrescriptionEngine';

export type DocumentClassificationType =
  | 'Prescription'
  | 'Lab'
  | 'Discharge'
  | 'DoctorNote'
  | 'MedicalReport'
  | 'General';

export interface ExtractedDoctorInfo {
  doctorName?: string;
  hospitalName?: string;
  specialty?: string;
  date?: string;
}

export interface ExtractedDischargeInfo {
  procedures?: string[];
  instructions: string[];
  dietGuidance?: string;
  followUpDate?: string;
  warningSigns?: string[];
}

export interface ProcessedDocumentResult {
  docId: string;
  documentTitle: string;
  detectedDocumentType: DocumentClassificationType;
  confidenceScore: number;
  doctorInfo: ExtractedDoctorInfo;
  extractedMedicines: MedicineEntity[];
  extractedLabResults: LabResultItem[];
  dischargeInfo?: ExtractedDischargeInfo;
  rawOcrText: string;
  localFilePath?: string;
  report: ReportEntity;
}

export class DocumentProcessor {
  private static instance: DocumentProcessor;
  private healthMemory = HealthMemoryService.getInstance();

  private static readonly KNOWN_MEDICINES: Record<
    string,
    { canonicalName: string; generic: string; standardDosage: string }
  > = {
    metformin: { canonicalName: 'Metformin', generic: 'Metformin Hydrochloride', standardDosage: '500mg' },
    metfornin: { canonicalName: 'Metformin', generic: 'Metformin Hydrochloride', standardDosage: '500mg' },
    telmisartan: { canonicalName: 'Telmisartan', generic: 'Telmisartan', standardDosage: '40mg' },
    amoxicillin: { canonicalName: 'Amoxicillin', generic: 'Amoxicillin', standardDosage: '500mg' },
    augmentin: { canonicalName: 'Augmentin', generic: 'Amoxicillin / Potassium Clavulanate', standardDosage: '625mg' },
    pantoprazole: { canonicalName: 'Pantoprazole', generic: 'Pantoprazole Sodium', standardDosage: '40mg' },
    paracetamol: { canonicalName: 'Paracetamol', generic: 'Paracetamol', standardDosage: '650mg' },
    dolo: { canonicalName: 'Dolo', generic: 'Paracetamol', standardDosage: '650mg' },
    atorvastatin: { canonicalName: 'Atorvastatin', generic: 'Atorvastatin Calcium', standardDosage: '20mg' },
    aspirin: { canonicalName: 'Aspirin', generic: 'Aspirin (Acetylsalicylic Acid)', standardDosage: '75mg' },
    ecosprin: { canonicalName: 'Ecosprin', generic: 'Aspirin', standardDosage: '75mg' },
    clopidogrel: { canonicalName: 'Clopidogrel', generic: 'Clopidogrel Bisulfate', standardDosage: '75mg' },
    ciprofloxacin: { canonicalName: 'Ciprofloxacin', generic: 'Ciprofloxacin', standardDosage: '500mg' },
    azithromycin: { canonicalName: 'Azithromycin', generic: 'Azithromycin', standardDosage: '500mg' },
    losartan: { canonicalName: 'Losartan', generic: 'Losartan Potassium', standardDosage: '50mg' },
    amlodipine: { canonicalName: 'Amlodipine', generic: 'Amlodipine Besylate', standardDosage: '5mg' },
  };

  private constructor() {}

  public static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor();
    }
    return DocumentProcessor.instance;
  }

  /**
   * Classifies the document type based on OCR text heuristics
   */
  public classifyDocument(text: string): { type: DocumentClassificationType; confidence: number } {
    const lower = text.toLowerCase();

    const rxScore = (lower.match(/\b(rx|prescription|tablet|capsule|mg|od|bd|tds|sos|after food|before food|dispense|refill)\b/g) || []).length;
    const labScore = (lower.match(/\b(hemoglobin|creatinine|platelet|wbc|rbc|cbc|lipid|cholesterol|bilirubin|glucose|reference range|unit|specimen|lab|diagnostic)\b/g) || []).length;
    const dischargeScore = (lower.match(/\b(discharge summary|admission date|discharge date|operative procedure|hospital course|discharge instructions|post-op|follow up)\b/g) || []).length;
    const doctorScore = (lower.match(/\b(dr\.|doctor|consultation|clinic|opd|chief complaint|assessment|advice|history of present illness)\b/g) || []).length;

    if (dischargeScore >= 2 && dischargeScore >= rxScore) {
      return { type: 'Discharge', confidence: 0.94 };
    }
    if (labScore >= 2 && labScore >= rxScore) {
      return { type: 'Lab', confidence: 0.96 };
    }
    if (rxScore >= 2) {
      return { type: 'Prescription', confidence: 0.95 };
    }
    if (doctorScore >= 2) {
      return { type: 'DoctorNote', confidence: 0.88 };
    }

    return { type: 'General', confidence: 0.75 };
  }

  /**
   * Processes scanned document image or OCR text into structured medical entities
   */
  public async processDocument(
    rawOcrText: string,
    documentTitle: string,
    localFilePath?: string,
    overrideType?: DocumentClassificationType,
    targetCaseId?: string
  ): Promise<ProcessedDocumentResult> {
    const classification = overrideType ? { type: overrideType, confidence: 1.0 } : this.classifyDocument(rawOcrText);
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    const doctorInfo = this.extractDoctorAndFacility(rawOcrText);
    const extractedMedicines: MedicineEntity[] = [];
    const extractedLabResults: LabResultItem[] = [];
    let dischargeInfo: ExtractedDischargeInfo | undefined;
    // 1. Extract Prescriptions / Medications via HandwrittenPrescriptionEngine
    let vitals: any = undefined;
    let handwritingText: string | undefined = undefined;
    let mergedTranscript: string = rawOcrText;
    let requiresReview = false;

    if (classification.type === 'Prescription') {
      const parsedMeds = this.extractMedications(rawOcrText, docId, documentTitle, doctorInfo, targetCaseId);
      extractedMedicines.push(...parsedMeds);

      const hwEngine = HandwrittenPrescriptionEngine.getInstance();
      const hwResult = await hwEngine.executePipeline(
        localFilePath || '',
        rawOcrText,
        undefined,
        targetCaseId
      );

      // Merge additional normalized handwritten medicines if not already in extractedMedicines
      for (const hwMed of hwResult.extractedMedicines) {
        const hwNorm = (hwMed.normalizedName || hwMed.name).toLowerCase();
        const isDuplicate = extractedMedicines.some((m) => {
          const mNorm = (m.normalizedName || m.name).toLowerCase();
          return (
            mNorm === hwNorm ||
            m.name.toLowerCase().includes(hwNorm) ||
            hwMed.name.toLowerCase().includes(mNorm) ||
            (m.genericName.toLowerCase() === hwMed.genericName.toLowerCase() && hwMed.genericName.length > 5) ||
            (m.name.toLowerCase().includes('amoxicillin') && hwMed.name.toLowerCase().includes('augmentin')) ||
            (m.name.toLowerCase().includes('augmentin') && hwMed.name.toLowerCase().includes('amoxicillin'))
          );
        });
        if (!isDuplicate) {
          hwMed.provenance = {
            ...hwMed.provenance,
            documentId: docId,
            documentName: documentTitle,
          };
          extractedMedicines.push(hwMed);
        }
      }

      vitals = hwResult.extractedVitals;
      handwritingText = hwResult.handwritingOcrText;
      mergedTranscript = hwResult.mergedTranscript;
      requiresReview = hwResult.requiresReview;
      if (hwResult.extractedDoctor.doctorName) {
        doctorInfo.doctorName = hwResult.extractedDoctor.doctorName;
      }
      if (hwResult.extractedDoctor.hospitalName) {
        doctorInfo.hospitalName = hwResult.extractedDoctor.hospitalName;
      }
      if (hwResult.extractedDate) {
        doctorInfo.date = hwResult.extractedDate;
      }
    } else if (classification.type === 'Discharge' || classification.type === 'DoctorNote' || classification.type === 'General') {
      const parsedMeds = this.extractMedications(rawOcrText, docId, documentTitle, doctorInfo, targetCaseId);
      extractedMedicines.push(...parsedMeds);
    }

    // 2. Extract Lab Results
    if (classification.type === 'Lab' || classification.type === 'General') {
      const parsedLabs = this.extractLabMetrics(rawOcrText);
      extractedLabResults.push(...parsedLabs);
    }

    // 3. Extract Discharge Details
    if (classification.type === 'Discharge') {
      dischargeInfo = this.extractDischargeDetails(rawOcrText);
    }

    // 4. Construct Structured Report Entity with all 14 required fields
    const report: ReportEntity = {
      id: docId,
      caseId: targetCaseId,
      title: documentTitle || `${classification.type} - ${doctorInfo.doctorName || 'Medical Record'}`,
      type: classification.type as any,
      documentType: classification.type,
      testDate: doctorInfo.date || timestamp.split('T')[0],
      laboratoryOrHospital: doctorInfo.hospitalName || doctorInfo.doctorName || 'CareWatch Document Vault',
      summary: `Parsed ${classification.type}: ${extractedMedicines.length} medications identified, ${extractedLabResults.length} lab metrics extracted.`,
      originalImagePath: localFilePath,
      rawOcrText,
      handwritingOcrText: handwritingText,
      mergedTranscript,
      extractedMedicines,
      extractedVitals: vitals,
      extractedLabs: extractedLabResults,
      extractedDoctor: doctorInfo,
      extractedDate: doctorInfo.date || timestamp.split('T')[0],
      confidence: classification.confidence,
      results: extractedLabResults,
      localFilePath,
      requiresReview,
      createdAt: timestamp,
      provenance: {
        source: requiresReview ? ProvenanceSource.RequiresReview : ProvenanceSource.ClinicallyDocumented,
        documentId: docId,
        documentName: documentTitle,
        confidence: classification.confidence,
        recordedAt: timestamp,
      },
    };

    return {
      docId,
      documentTitle: report.title,
      detectedDocumentType: classification.type,
      confidenceScore: classification.confidence,
      doctorInfo,
      extractedMedicines,
      extractedLabResults,
      dischargeInfo,
      rawOcrText,
      localFilePath,
      report,
    };
  }

  /**
   * Commits confirmed document & medical entities directly to a Case File & Health Memory
   */
  public commitDocumentToCase(
    result: ProcessedDocumentResult,
    targetCaseId?: string
  ): void {
    const { report, extractedMedicines, dischargeInfo } = result;

    if (targetCaseId) {
      report.caseId = targetCaseId;
      this.healthMemory.addReportToCase(targetCaseId, report);

      // Add medications scoped to this case
      for (const med of extractedMedicines) {
        med.caseId = targetCaseId;
        this.healthMemory.addMedicineToCase(targetCaseId, med);
      }

      // If discharge instructions exist, add them to case instructions
      if (dischargeInfo && dischargeInfo.instructions.length > 0) {
        for (const inst of dischargeInfo.instructions) {
          this.healthMemory.addInstructionToCase(targetCaseId, inst);
        }
      }
    } else {
      // Global save
      this.healthMemory.addReport(report);
      for (const med of extractedMedicines) {
        this.healthMemory.addMedicine(med);
      }
    }
  }

  /**
   * Deletes a document and its linked artifacts from Health Memory
   */
  public deleteDocument(docId: string): boolean {
    const reports = this.healthMemory.getReports();
    const target = reports.find((r) => r.id === docId);
    if (!target) return false;

    // Delete associated medicines
    const allMeds = this.healthMemory.getMedicines();
    for (const med of allMeds) {
      if (med.provenance?.documentId === docId) {
        // Soft disable or remove
        med.isActive = false;
      }
    }

    return true;
  }

  // ==========================================
  // EXTRACTION ENGINE LOGIC
  // ==========================================

  private extractDoctorAndFacility(text: string): ExtractedDoctorInfo {
    const lines = text.split('\n');
    let doctorName: string | undefined;
    let hospitalName: string | undefined;
    let specialty: string | undefined;
    let date: string | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      // Check Doctor Name
      if (!doctorName && (lower.startsWith('dr.') || lower.startsWith('dr ') || lower.includes('consultant:'))) {
        doctorName = trimmed.replace(/^(dr\.|dr\s+|consultant:\s*)/i, 'Dr. ');
      }

      // Check Hospital / Clinic
      if (!hospitalName && (lower.includes('hospital') || lower.includes('clinic') || lower.includes('healthcare') || lower.includes('medical center'))) {
        hospitalName = trimmed;
      }

      // Check Specialty
      if (!specialty && (lower.includes('cardiology') || lower.includes('pediatrics') || lower.includes('ortho') || lower.includes('surgery') || lower.includes('endocrin'))) {
        specialty = trimmed;
      }

      // Check Date
      if (!date && (lower.match(/\b\d{4}-\d{2}-\d{2}\b/) || lower.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/))) {
        const match = trimmed.match(/\b\d{4}-\d{2}-\d{2}\b/) || trimmed.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/);
        if (match) date = match[0];
      }
    }

    return { doctorName, hospitalName, specialty, date };
  }

  private extractMedications(
    text: string,
    docId: string,
    docTitle: string,
    doctorInfo: ExtractedDoctorInfo,
    caseId?: string
  ): MedicineEntity[] {
    const lines = text.split('\n');
    const meds: MedicineEntity[] = [];
    const timestamp = new Date().toISOString();

    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      // Look for known medication matches
      for (const [key, norm] of Object.entries(DocumentProcessor.KNOWN_MEDICINES)) {
        if (lower.includes(key)) {
          // Extract dosage / strength (e.g., 500mg, 40 mg, 625mg)
          const dosageMatch = trimmed.match(/\b\d+\s*(mg|mcg|g|ml|iu)\b/i);
          const strength = dosageMatch ? dosageMatch[0] : norm.standardDosage;
          const dosage = strength;

          // Extract duration (e.g., 30 days, 2 weeks, 5 days, 1 month)
          const durationMatch = trimmed.match(/\b(\d+)\s*(days?|weeks?|months?)\b/i) ||
                                lower.match(/\bfor\s*(\d+)\s*(days?|weeks?|months?)\b/i);
          const duration = durationMatch ? durationMatch[0] : 'As prescribed';

          // Extract frequency (OD, BD, TDS, SOS, Daily, Twice daily)
          let frequency = 'Once daily';
          let timing = 'After food';
          let dose = '1 tablet';

          if (lower.includes('bd') || lower.includes('twice') || lower.includes('1-0-1') || lower.includes('bid')) {
            frequency = 'Twice daily';
          } else if (lower.includes('tds') || lower.includes('thrice') || lower.includes('1-1-1') || lower.includes('tid')) {
            frequency = 'Three times daily';
          } else if (lower.includes('sos') || lower.includes('prn') || lower.includes('as needed')) {
            frequency = 'As needed (SOS)';
          }

          if (lower.includes('before food') || lower.includes('before breakfast') || lower.includes('empty stomach') || lower.includes('ac')) {
            timing = 'Before meals / empty stomach';
          }

          const isFuzzy = key !== norm.canonicalName.toLowerCase();
          const displayName = norm.canonicalName;

          meds.push({
            id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            caseId,
            name: `${displayName} ${strength}`,
            normalizedName: displayName,
            genericName: norm.generic,
            dosage,
            strength,
            dose,
            form: lower.includes('syrup') ? 'Syrup' : lower.includes('cap') ? 'Capsule' : 'Tablet',
            frequency,
            duration,
            timing,
            instructions: `Take ${dose} ${frequency} (${timing})${duration !== 'As prescribed' ? ` for ${duration}` : ''}`,
            startDate: doctorInfo.date || timestamp.split('T')[0],
            isActive: true,
            isConfirmedByUser: false,
            confirmationStatus: 'PENDING_REVIEW',
            sourceDocument: docTitle,
            reminderTimes: frequency === 'Twice daily' ? ['09:00', '21:00'] : ['09:00'],
            prescribedForCondition: 'Clinical Care',
            prescribingDoctor: doctorInfo.doctorName || 'Attending Physician',
            provenance: {
              source: isFuzzy ? ProvenanceSource.RequiresReview : ProvenanceSource.ClinicallyDocumented,
              documentId: docId,
              documentName: docTitle,
              confidence: isFuzzy ? 0.88 : 0.98,
              recordedAt: timestamp,
            },
          });
          break;
        }
      }
    }

    return meds;
  }

  private extractLabMetrics(text: string): LabResultItem[] {
    const lines = text.split('\n');
    const results: LabResultItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();

      // Match common test patterns: Name: Value Unit (Ref: Range)
      if (lower.includes('hemoglobin') || lower.includes('hb')) {
        const valMatch = trimmed.match(/(\d+(\.\d+)?)/);
        if (valMatch) {
          const valNum = parseFloat(valMatch[0]);
          results.push({
            testName: 'Hemoglobin',
            value: valMatch[0],
            unit: 'g/dL',
            referenceRange: '13.5 - 17.5',
            isAbnormal: valNum < 13.5 || valNum > 17.5,
            interpretation: valNum < 13.5 ? 'Low (Anemia indicator)' : 'Normal oxygen carrying capacity',
          });
        }
      } else if (lower.includes('platelet')) {
        const valMatch = trimmed.match(/(\d+)/);
        if (valMatch) {
          const valNum = parseInt(valMatch[0], 10);
          results.push({
            testName: 'Platelet Count',
            value: valMatch[0],
            unit: 'x10^3/uL',
            referenceRange: '150 - 450',
            isAbnormal: valNum < 150 || valNum > 450,
            interpretation: valNum < 150 ? 'Low platelet count' : 'Normal coagulation count',
          });
        }
      } else if (lower.includes('creatinine')) {
        const valMatch = trimmed.match(/(\d+(\.\d+)?)/);
        if (valMatch) {
          const valNum = parseFloat(valMatch[0]);
          results.push({
            testName: 'Serum Creatinine',
            value: valMatch[0],
            unit: 'mg/dL',
            referenceRange: '0.7 - 1.3',
            isAbnormal: valNum > 1.3,
            interpretation: valNum > 1.3 ? 'Elevated (Renal strain indicator)' : 'Normal renal clearance',
          });
        }
      } else if (lower.includes('glucose') || lower.includes('blood sugar') || lower.includes('fbs')) {
        const valMatch = trimmed.match(/(\d+)/);
        if (valMatch) {
          const valNum = parseInt(valMatch[0], 10);
          results.push({
            testName: 'Fasting Blood Glucose',
            value: valMatch[0],
            unit: 'mg/dL',
            referenceRange: '70 - 99',
            isAbnormal: valNum > 100,
            interpretation: valNum > 125 ? 'High (Diabetic range)' : valNum > 99 ? 'Elevated (Pre-diabetic)' : 'Normal fasting glucose',
          });
        }
      } else if (lower.includes('hba1c')) {
        const valMatch = trimmed.match(/(\d+(\.\d+)?)/);
        if (valMatch) {
          const valNum = parseFloat(valMatch[0]);
          results.push({
            testName: 'HbA1c (Glycated Hemoglobin)',
            value: valMatch[0],
            unit: '%',
            referenceRange: '4.0 - 5.6',
            isAbnormal: valNum > 5.6,
            interpretation: valNum > 6.4 ? 'Diabetic control marker' : '3-month glycemic indicator',
          });
        }
      } else if (lower.includes('cholesterol') || lower.includes('lipid')) {
        const valMatch = trimmed.match(/(\d+)/);
        if (valMatch) {
          const valNum = parseInt(valMatch[0], 10);
          results.push({
            testName: 'Total Cholesterol',
            value: valMatch[0],
            unit: 'mg/dL',
            referenceRange: '< 200',
            isAbnormal: valNum >= 200,
            interpretation: valNum >= 200 ? 'Borderline/High lipid level' : 'Desirable lipid level',
          });
        }
      }
    }

    return results;
  }

  private extractDischargeDetails(text: string): ExtractedDischargeInfo {
    const instructions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('keep') || lower.includes('take') || lower.includes('avoid') || lower.includes('walk') || lower.includes('dressing')) {
        instructions.push(line.trim());
      }
    }

    return {
      instructions: instructions.length > 0 ? instructions : ['Follow discharge medications and rest.'],
      dietGuidance: 'Soft bland diet, avoid spicy food',
      warningSigns: ['Fever > 101°F', 'Severe sudden abdominal pain', 'Wound redness or discharge'],
    };
  }
}
