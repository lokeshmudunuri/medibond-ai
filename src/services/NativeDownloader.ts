export interface StorageInfo {
  freeBytes: number;
  totalBytes: number;
}

export interface NativeDownloadProgressEvent {
  downloadId: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
  speedBytesPerSec: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  size?: number;
  sha256?: string;
  path?: string;
}

export interface LocalFileRecord {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedAt: number;
}

// Safely resolve native modules without breaking Jest / Node test runner
let CareBondModelDownloader: any = null;
let eventEmitter: any = null;

try {
  const RN = require('react-native');
  CareBondModelDownloader = RN.NativeModules?.CareBondModelDownloader || null;
  if (CareBondModelDownloader && RN.NativeEventEmitter) {
    eventEmitter = new RN.NativeEventEmitter(CareBondModelDownloader);
  }
} catch (e) {
  // Running in Node / Jest environment
}

export class NativeDownloader {
  /**
   * Set custom native downloader implementation (for testing / mocking)
   */
  public static setMockDownloader(mock: any) {
    CareBondModelDownloader = mock;
  }

  /**
   * Retrieves the absolute path to the app's models directory
   */
  public static async getModelsDirectory(): Promise<string> {
    if (CareBondModelDownloader?.getModelsDirectory) {
      return await CareBondModelDownloader.getModelsDirectory();
    }
    return '/data/user/0/com.carewatch.medicalcompanion/files/models/gguf';
  }

  /**
   * Retrieves available and total disk storage
   */
  public static async getStorageInfo(): Promise<StorageInfo> {
    if (CareBondModelDownloader?.getStorageInfo) {
      return await CareBondModelDownloader.getStorageInfo();
    }
    return { freeBytes: 8.6 * 1024 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 * 1024 };
  }

  /**
   * Starts a direct streamed download on the Android device
   */
  public static async startDownload(
    downloadId: string,
    url: string,
    destPath: string,
    resume = false
  ): Promise<{ success: boolean; localPath: string; totalBytes: number }> {
    if (!CareBondModelDownloader?.downloadModel) {
      // Return simulated success in mock test environment
      return { success: true, localPath: destPath, totalBytes: 429496729 };
    }
    return await CareBondModelDownloader.downloadModel(downloadId, url, destPath, resume);
  }

  /**
   * Cancels an ongoing download
   */
  public static async cancelDownload(downloadId: string): Promise<boolean> {
    if (CareBondModelDownloader?.cancelDownload) {
      return await CareBondModelDownloader.cancelDownload(downloadId);
    }
    return true;
  }

  /**
   * Subscribes to real-time download progress events
   */
  public static onProgress(
    downloadId: string,
    callback: (event: NativeDownloadProgressEvent) => void
  ): () => void {
    if (!eventEmitter) return () => {};

    const subscription = eventEmitter.addListener(
      'onModelDownloadProgress',
      (event: NativeDownloadProgressEvent) => {
        if (event.downloadId === downloadId) {
          callback(event);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }

  /**
   * Verifies that a local file exists, is valid size, and optionally matches SHA-256
   */
  public static async verifyModelFile(
    filePath: string,
    expectedSize = 0,
    expectedSha256?: string
  ): Promise<VerifyResult> {
    if (CareBondModelDownloader?.verifyModelFile) {
      return await CareBondModelDownloader.verifyModelFile(
        filePath,
        expectedSize,
        expectedSha256 || null
      );
    }
    return { valid: true, path: filePath, size: expectedSize };
  }

  /**
   * Deletes a local model file and its .part temporary file
   */
  public static async deleteModelFile(filePath: string): Promise<boolean> {
    if (CareBondModelDownloader?.deleteModelFile) {
      return await CareBondModelDownloader.deleteModelFile(filePath);
    }
    return true;
  }

  /**
   * Lists all .gguf files currently on disk
   */
  public static async listModelFiles(): Promise<LocalFileRecord[]> {
    if (CareBondModelDownloader?.listModelFiles) {
      return await CareBondModelDownloader.listModelFiles();
    }
    return [];
  }
}
