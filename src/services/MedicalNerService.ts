export interface ExtractedMedicineDraft {
  rawText: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  timing: string;
  instructions: string;
  confidence: number;
}

export interface ExtractedLabItemDraft {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  interpretation?: string;
}

export class MedicalNerService {
  private static readonly DOSAGE_PATTERN = /\b(\d+(?:\.\d+)?)\s*(mg|g|mcg|ml|iu|tablets?|capsules?)\b/i;
  private static readonly FREQUENCY_PATTERN = /\b(once daily|twice daily|thrice daily|bid|tid|qid|od|hs|sos|every\s+\d+\s+hours?)\b/i;

  public static extractMedications(rawText: string): ExtractedMedicineDraft[] {
    const drafts: ExtractedMedicineDraft[] = [];
    const lines = rawText.split(/[\r\n]+/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (this.containsMedicineKeyword(trimmed)) {
        const doseMatch = trimmed.match(this.DOSAGE_PATTERN);
        const freqMatch = trimmed.match(this.FREQUENCY_PATTERN);

        let name = trimmed;
        const dose = doseMatch ? doseMatch[0] : '1 tablet';
        const freq = freqMatch ? this.normalizeFrequency(freqMatch[0]) : 'Once daily';

        const parts = trimmed.split(/[-–:]|\b\d+\s*mg\b/i);
        if (parts.length > 0 && parts[0].trim().length > 0) {
          name = parts[0].replace(/^\d+\.?\s*/, '').trim();
        }

        drafts.push({
          rawText: trimmed,
          medicineName: name,
          genericName: '',
          dosage: dose,
          frequency: freq,
          timing: trimmed.toLowerCase().includes('before') ? 'Before food' : 'After food',
          instructions: 'As prescribed on document',
          confidence: 0.92,
        });
      }
    }

    return drafts;
  }

  public static extractLabResults(rawText: string): ExtractedLabItemDraft[] {
    const results: ExtractedLabItemDraft[] = [];

    const labSignatures = [
      { name: 'Hemoglobin', unit: 'g/dL', range: '13.0 - 17.0', regex: /hemo(?:globin)?\s*[:=-]?\s*(\d+(?:\.\d+)?)/i },
      { name: 'Fasting Blood Sugar', unit: 'mg/dL', range: '70 - 100', regex: /(?:fbs|fasting\s+blood\s+sugar|glucose)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i },
      { name: 'Total Leukocyte Count (WBC)', unit: '/uL', range: '4,000 - 11,000', regex: /(?:wbc|tlc|leukocytes?)\s*[:=-]?\s*(\d+(?:,\d+)?)/i },
      { name: 'Platelets', unit: '/uL', range: '150,000 - 450,000', regex: /platelets?\s*[:=-]?\s*(\d+(?:,\d+)?)/i },
      { name: 'Serum Creatinine', unit: 'mg/dL', range: '0.7 - 1.2', regex: /creatinine\s*[:=-]?\s*(\d+(?:\.\d+)?)/i },
    ];

    for (const sig of labSignatures) {
      const match = rawText.match(sig.regex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        let abnormal = false;
        let interp = 'Normal';

        if (sig.name === 'Fasting Blood Sugar' && val > 100) {
          abnormal = true;
          interp = val > 125 ? 'High (Diabetic Range)' : 'Elevated (Pre-diabetic Range)';
        } else if (sig.name === 'Serum Creatinine' && val > 1.2) {
          abnormal = true;
          interp = 'Elevated Renal Marker';
        } else if (sig.name === 'Hemoglobin' && val < 12.0) {
          abnormal = true;
          interp = 'Low (Mild Anemia)';
        }

        results.push({
          testName: sig.name,
          value: match[1],
          unit: sig.unit,
          referenceRange: sig.range,
          isAbnormal: abnormal,
          interpretation: interp,
        });
      }
    }

    return results;
  }

  private static containsMedicineKeyword(s: string): boolean {
    const lower = s.toLowerCase();
    const keywords = ['tab', 'cap', 'syp', 'inj', 'mg', 'od', 'bid', 'tid', 'daily', 'telma', 'metformin', 'pantoprazole', 'amox', 'paracetamol', 'atorva'];
    return keywords.some(k => lower.includes(k));
  }

  private static normalizeFrequency(raw: string): string {
    const l = raw.toLowerCase();
    if (l === 'bid' || l.includes('twice')) return 'Twice daily (BID)';
    if (l === 'tid' || l.includes('thrice')) return 'Thrice daily (TID)';
    if (l === 'od' || l.includes('once')) return 'Once daily (OD)';
    if (l === 'hs' || l.includes('night')) return 'At bedtime (HS)';
    if (l === 'sos' || l.includes('needed')) return 'As needed (SOS)';
    return raw;
  }
}
