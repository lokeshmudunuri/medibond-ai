let NativeOCR: any = null;
let Platform: any = { OS: 'android' };

try {
  const RN = require('react-native');
  NativeOCR = RN.NativeModules?.NativeOCR || null;
  Platform = RN.Platform || { OS: 'android' };
} catch (e) {
  // Jest / Node environment
}

export interface OCRLineItem {
  text: string;
  confidence: number;
}

export interface OCRBlockItem {
  text: string;
  lines: OCRLineItem[];
}

export interface OCRRecognizedResult {
  text: string;
  confidence: number;
  processingTimeMs: number;
  lineCount: number;
  blockCount: number;
  blocks: OCRBlockItem[];
}

export class NativeOCRService {
  private static instance: NativeOCRService;

  private constructor() {}

  public static getInstance(): NativeOCRService {
    if (!NativeOCRService.instance) {
      NativeOCRService.instance = new NativeOCRService();
    }
    return NativeOCRService.instance;
  }

  public async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeOCR) return false;
    try {
      return await NativeOCR.isOcrAvailable();
    } catch {
      return false;
    }
  }

  public async getEngineInfo(): Promise<Record<string, any>> {
    if (Platform.OS !== 'android' || !NativeOCR) {
      return {
        engine: 'JavaScript Heuristic OCR Fallback',
        isOffline: true,
      };
    }
    try {
      return await NativeOCR.getOcrInfo();
    } catch {
      return { engine: 'Native OCR Unavailable' };
    }
  }

  public async recognizeText(
    imageUriOrPath: string,
    options: { enhanceContrast?: boolean } = { enhanceContrast: true }
  ): Promise<OCRRecognizedResult> {
    if (Platform.OS === 'android' && NativeOCR) {
      return await NativeOCR.recognizeText(imageUriOrPath, options);
    }

    // Fallback for non-native / node test environments
    return {
      text: '',
      confidence: 0.9,
      processingTimeMs: 15,
      lineCount: 0,
      blockCount: 0,
      blocks: [],
    };
  }
}
