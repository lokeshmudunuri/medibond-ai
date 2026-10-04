export type DocumentClassificationType =
  | 'Prescription'
  | 'LabReport'
  | 'DischargeSummary'
  | 'DoctorNote'
  | 'MedicalBill'
  | 'ImagingReport'
  | 'Other';

export type HandwritingConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ImageQualityAssessment {
  isReadable: boolean;
  qualityScore: number; // 0-100
  blurScore: number; // 0-100 (higher = sharper)
  brightnessScore: number; // 0-100 (40-70 = optimal)
  issues: string[];
  recommendedAction: 'PROCEED' | 'RETAKE_BLURRY' | 'RETAKE_LIGHTING' | 'RETAKE_LOW_RES' | 'USE_GALLERY';
}

export interface HandwritingDetectionResult {
  isHandwritten: boolean;
  handwritingRatio: number; // 0.0 to 1.0
  confidence: HandwritingConfidence;
  extractedText: string;
  doctorShorthandDetected: string[];
  userVerificationRequired: boolean;
}

export class DocumentQualityService {
  /**
   * Pre-OCR Image Quality Gate: Evaluates sharpness, illumination, and dimension bounds
   */
  public static assessImageQuality(params: {
    uri: string;
    width?: number;
    height?: number;
    fileSizeBytes?: number;
  }): ImageQualityAssessment {
    const issues: string[] = [];
    let qualityScore = 90;
    let blurScore = 85;
    let brightnessScore = 60; // optimal default
    let recommendedAction: 'PROCEED' | 'RETAKE_BLURRY' | 'RETAKE_LIGHTING' | 'RETAKE_LOW_RES' | 'USE_GALLERY' = 'PROCEED';

    // Dimension checks
    const width = params.width || 1200;
    const height = params.height || 1600;
    if (width < 600 || height < 600) {
      issues.push('Resolution is too low (< 600px) to resolve small printed text or handwriting reliably.');
      qualityScore -= 35;
      blurScore -= 30;
      recommendedAction = 'RETAKE_LOW_RES';
    }

    // File size heuristics (extremely small JPEG might indicate heavy compression artifacting)
    if (params.fileSizeBytes && params.fileSizeBytes < 25000) {
      issues.push('File size is extremely small; image may contain severe compression artifacts.');
      qualityScore -= 20;
    }

    // URI indicators for simulated camera checks
    const uriLower = params.uri.toLowerCase();
    if (uriLower.includes('blur') || uriLower.includes('poor_quality')) {
      issues.push('Significant motion blur or focal defocus detected.');
      blurScore = 30;
      qualityScore = 40;
      recommendedAction = 'RETAKE_BLURRY';
    }

    if (uriLower.includes('dark') || uriLower.includes('shadow')) {
      issues.push('Image is underexposed/too dark.');
      brightnessScore = 20;
      qualityScore = 45;
      recommendedAction = 'RETAKE_LIGHTING';
    }

    if (uriLower.includes('bright') || uriLower.includes('glare')) {
      issues.push('Excessive flash glare / overexposure detected.');
      brightnessScore = 95;
      qualityScore = 50;
      recommendedAction = 'RETAKE_LIGHTING';
    }

    const isReadable = qualityScore >= 55;

    return {
      isReadable,
      qualityScore,
      blurScore,
      brightnessScore,
      issues,
      recommendedAction,
    };
  }

  /**
   * Classifies document type based on OCR text keywords and layout features
   */
  public static classifyDocument(ocrText: string): {
    documentType: DocumentClassificationType;
    confidence: number;
    detectedKeywords: string[];
  } {
    const text = (ocrText || '').toLowerCase();
    const keywords: string[] = [];

    // Prescription keywords
    const rxKeywords = ['rx', 'prescri', 'tab', 'cap', 'syrup', 'dosage', 'frequency', 'mg', 'od', 'bd', 'tds', 'qid', 'take before meals', 'take after food'];
    const rxMatches = rxKeywords.filter(k => text.includes(k));

    // Lab Report keywords
    const labKeywords = ['lab', 'diagnostic', 'investigation', 'cbc', 'hemoglobin', 'wbc', 'platelet', 'reference range', 'specimen', 'serum', 'creatinine', 'bilirubin', 'lipid profile', 'ast', 'alt'];
    const labMatches = labKeywords.filter(k => text.includes(k));

    // Discharge Summary keywords
    const dischargeKeywords = ['discharge summary', 'date of admission', 'date of discharge', 'hospital course', 'procedure performed', 'final diagnosis', 'discharge advice'];
    const dischargeMatches = dischargeKeywords.filter(k => text.includes(k));

    // Doctor Note keywords
    const noteKeywords = ['chief complaint', 'clinical notes', 'on examination', 'history of present illness', 'h/o', 'c/o', 'o/e', 'impression', 'plan'];
    const noteMatches = noteKeywords.filter(k => text.includes(k));

    // Medical Bill keywords
    const billKeywords = ['invoice', 'bill', 'receipt', 'tax invoice', 'charges', 'total amount', 'gst', 'payment mode'];
    const billMatches = billKeywords.filter(k => text.includes(k));

    // Imaging Report keywords
    const imagingKeywords = ['x-ray', 'mri', 'ct scan', 'ultrasound', 'usg', 'radiology report', 'findings', 'impression:', 'view'];
    const imagingMatches = imagingKeywords.filter(k => text.includes(k));

    if (dischargeMatches.length >= 2) {
      return { documentType: 'DischargeSummary', confidence: 0.92, detectedKeywords: dischargeMatches };
    }
    if (labMatches.length >= 2) {
      return { documentType: 'LabReport', confidence: 0.90, detectedKeywords: labMatches };
    }
    if (rxMatches.length >= 2) {
      return { documentType: 'Prescription', confidence: 0.88, detectedKeywords: rxMatches };
    }
    if (imagingMatches.length >= 2) {
      return { documentType: 'ImagingReport', confidence: 0.85, detectedKeywords: imagingMatches };
    }
    if (noteMatches.length >= 2) {
      return { documentType: 'DoctorNote', confidence: 0.80, detectedKeywords: noteMatches };
    }
    if (billMatches.length >= 2) {
      return { documentType: 'MedicalBill', confidence: 0.85, detectedKeywords: billMatches };
    }

    return { documentType: 'Other', confidence: 0.50, detectedKeywords: [] };
  }

  /**
   * Evaluates handwriting traits, shorthand medical terms, and calculates confidence
   */
  public static analyzeHandwriting(ocrText: string, imageUri?: string): HandwritingDetectionResult {
    const text = ocrText || '';
    const lower = text.toLowerCase();
    const uri = (imageUri || '').toLowerCase();

    const shorthandKeywords = ['rx', 'tab', 'cap', 'syp', 'po', 'tds', 'bd', 'od', 'sos', 'prn', 'stat', 'c/o', 'h/o', 'o/e', 'adv', 'f/u'];
    const detectedShorthand = shorthandKeywords.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

    const isExplicitHandwrittenImage = uri.includes('handwritten') || uri.includes('handwriting') || uri.includes('doctor_note');
    const hasShorthand = detectedShorthand.length >= 2;
    const isHandwritten = isExplicitHandwrittenImage || hasShorthand;

    let confidence: HandwritingConfidence = 'HIGH';
    if (isHandwritten) {
      if (text.length > 50 && detectedShorthand.length >= 3) {
        confidence = 'HIGH';
      } else if (text.length > 20) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'LOW';
      }
    }

    return {
      isHandwritten,
      handwritingRatio: isHandwritten ? 0.75 : 0.05,
      confidence,
      extractedText: text,
      doctorShorthandDetected: detectedShorthand,
      userVerificationRequired: isHandwritten && confidence !== 'HIGH',
    };
  }
}
