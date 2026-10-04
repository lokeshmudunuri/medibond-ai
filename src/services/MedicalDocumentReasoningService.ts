import { AIEngine } from '../ai/AIEngine';
import { HealthMemoryService } from './HealthMemoryService';
import { ProcessedDocumentResult } from './DocumentProcessor';

export class MedicalDocumentReasoningService {
  private static instance: MedicalDocumentReasoningService;
  private aiEngine = AIEngine.getInstance();
  private healthMemory = HealthMemoryService.getInstance();

  private constructor() {}

  public static getInstance(): MedicalDocumentReasoningService {
    if (!MedicalDocumentReasoningService.instance) {
      MedicalDocumentReasoningService.instance = new MedicalDocumentReasoningService();
    }
    return MedicalDocumentReasoningService.instance;
  }

  /**
   * Generates a patient-friendly medical explanation for a processed document
   */
  public async *explainDocument(
    docResult: ProcessedDocumentResult,
    caseId?: string
  ): AsyncGenerator<{ token: string; isSafetyWarning?: boolean }> {
    const { report, extractedMedicines, extractedLabResults, detectedDocumentType } = docResult;

    let reasoningPrompt = '';
    if (detectedDocumentType === 'Prescription') {
      const medList = extractedMedicines
        .map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}): ${m.instructions}`)
        .join('\n');
      reasoningPrompt = `Please explain the following prescription in clear, patient-friendly language:\nDocument: ${report.title}\nDoctor: ${report.laboratoryOrHospital}\nMedications Prescribed:\n${medList}\n\nFormat your response concisely with:\n[DOCUMENTED FACT]: The medications and schedule prescribed.\n[GENERAL MEDICAL INFORMATION]: Purpose of these medicines.\n[REQUIRES CLINICIAN REVIEW]: Questions to discuss with your doctor.`;
    } else if (detectedDocumentType === 'Lab') {
      const labList = extractedLabResults
        .map((l) => `- ${l.testName}: ${l.value} ${l.unit} (Ref Range: ${l.referenceRange}) [${l.isAbnormal ? 'Flagged' : 'Normal'}]`)
        .join('\n');
      reasoningPrompt = `Please explain the following lab test results in simple terms:\nTest Report: ${report.title}\nLab Metrics:\n${labList}\n\nFormat your response concisely with:\n[DOCUMENTED FACT]: Key measured test values.\n[GENERAL MEDICAL INFORMATION]: What these biomarkers indicate.\n[SYSTEM-DETECTED FLAG]: Any abnormal values detected.`;
    } else if (detectedDocumentType === 'Discharge') {
      reasoningPrompt = `Please explain this hospital discharge summary and key recovery care instructions:\nDocument: ${report.title}\nSummary: ${report.summary}\nRaw Notes: ${report.rawOcrText.substring(0, 500)}\n\nHighlight recovery guidance, care instructions, and warning signs that require immediate doctor contact.`;
    } else {
      reasoningPrompt = `Please provide a patient-friendly summary of this medical document:\nTitle: ${report.title}\nContent:\n${report.rawOcrText.substring(0, 500)}`;
    }

    const stream = this.aiEngine.streamChat(reasoningPrompt, caseId);
    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * Answers case-grounded questions about stored prescriptions, reports, or diet
   */
  public async *answerCaseQuestion(
    question: string,
    caseId?: string
  ): AsyncGenerator<{ token: string; isSafetyWarning?: boolean }> {
    const lower = question.toLowerCase();

    // 1. Diet Question (e.g., "Can I eat biryani?", "What diet can I have?")
    if (lower.includes('eat') || lower.includes('food') || lower.includes('diet') || lower.includes('biryani') || lower.includes('sugar') || lower.includes('salt')) {
      const diet = this.healthMemory.getDietGuidance(caseId);
      if (!diet.hasSpecificGuidance) {
        yield {
          token: "I don't have enough information in this case to give you a reliable personalized answer. Please check with your doctor or dietitian.",
        };
        return;
      }
    }

    // 2. Report Question (e.g., "Explain my latest blood report")
    if (lower.includes('latest blood report') || lower.includes('latest report') || lower.includes('my lab report') || lower.includes('blood test')) {
      const latestReport = this.healthMemory.getLatestReport(caseId);
      if (latestReport) {
        const metricsStr = latestReport.results
          .map((r) => `${r.testName}: ${r.value} ${r.unit} (Ref: ${r.referenceRange}) [${r.isAbnormal ? 'Flagged' : 'Normal'}]`)
          .join('\n');

        const reportPrompt = `Explain the patient's latest report for this case:\nReport: ${latestReport.title} (${latestReport.testDate})\nFacility: ${latestReport.laboratoryOrHospital}\nResults:\n${metricsStr || latestReport.summary}\n\nUser Question: ${question}\n\nProvide a concise 2-3 sentence explanation distinguishing [DOCUMENTED FACT] and [GENERAL MEDICAL INFORMATION].`;

        const stream = this.aiEngine.streamChat(reportPrompt, caseId);
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      }
    }

    // 3. Prescription Question (e.g., "What did my doctor prescribe?", "Why was I given this medicine?")
    if (lower.includes('prescribe') || lower.includes('prescribed') || lower.includes('why was i given')) {
      const caseMeds = caseId ? this.healthMemory.getMedicinesByCase(caseId) : this.healthMemory.getMedicines(true);
      if (caseMeds.length > 0) {
        const medList = caseMeds.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}): ${m.instructions}`).join('\n');
        const rxPrompt = `Answer the user question regarding their active case prescription:\nMedications:\n${medList}\n\nUser Question: ${question}\n\nProvide a clear, patient-friendly response distinguishing [DOCUMENTED FACT] from [GENERAL MEDICAL INFORMATION].`;

        const stream = this.aiEngine.streamChat(rxPrompt, caseId);
        for await (const chunk of stream) {
          yield chunk;
        }
        return;
      }
    }

    // Standard Case-Scoped Stream
    const stream = this.aiEngine.streamChat(question, caseId);
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
