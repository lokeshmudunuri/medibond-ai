let NativeDocumentCapture: any = null;
let Platform: any = { OS: 'android' };

try {
  const RN = require('react-native');
  NativeDocumentCapture = RN.NativeModules?.NativeDocumentCapture || null;
  Platform = RN.Platform || { OS: 'android' };
} catch (e) {
  // Jest / Node environment
}

export interface CapturedDocumentImage {
  uri: string;
  path: string;
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  source: 'CAMERA' | 'GALLERY' | 'FILE_IMPORT';
}

export class NativeDocumentCaptureService {
  private static instance: NativeDocumentCaptureService;

  private constructor() {}

  public static getInstance(): NativeDocumentCaptureService {
    if (!NativeDocumentCaptureService.instance) {
      NativeDocumentCaptureService.instance = new NativeDocumentCaptureService();
    }
    return NativeDocumentCaptureService.instance;
  }

  public async checkCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeDocumentCapture) return true;
    try {
      return await NativeDocumentCapture.checkCameraPermission();
    } catch {
      return false;
    }
  }

  public async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeDocumentCapture) return true;
    try {
      return await NativeDocumentCapture.requestCameraPermission();
    } catch {
      return false;
    }
  }

  public async captureFromCamera(): Promise<CapturedDocumentImage> {
    if (Platform.OS !== 'android' || !NativeDocumentCapture) {
      throw new Error('Native Camera is only available on Android platform.');
    }
    return await NativeDocumentCapture.launchCamera();
  }

  public async pickFromGallery(): Promise<CapturedDocumentImage> {
    if (Platform.OS !== 'android' || !NativeDocumentCapture) {
      throw new Error('Native Gallery is only available on Android platform.');
    }
    return await NativeDocumentCapture.launchGallery();
  }

  public async importMedicalFile(): Promise<CapturedDocumentImage> {
    if (Platform.OS !== 'android' || !NativeDocumentCapture) {
      throw new Error('Native File Picker is only available on Android platform.');
    }
    return await NativeDocumentCapture.launchDocumentPicker();
  }
}
