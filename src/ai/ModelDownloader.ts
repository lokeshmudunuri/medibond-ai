import { NativeDownloader, NativeDownloadProgressEvent } from '../services/NativeDownloader';

export interface DownloadCallback {
  onProgress?: (event: NativeDownloadProgressEvent) => void;
  onSuccess?: (localPath: string, totalBytes: number) => void;
  onError?: (error: Error) => void;
}

export class ModelDownloader {
  private static instance: ModelDownloader;
  private activeSubscriptions: Map<string, () => void> = new Map();

  private constructor() {}

  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  /**
   * Executes a direct on-device download from Hugging Face with real byte progress
   */
  public async download(
    downloadId: string,
    url: string,
    destPath: string,
    resume = true,
    callbacks?: DownloadCallback
  ): Promise<{ success: boolean; localPath: string; totalBytes: number }> {
    // Unsubscribe any prior listener for this downloadId
    const prevSub = this.activeSubscriptions.get(downloadId);
    if (prevSub) {
      prevSub();
      this.activeSubscriptions.delete(downloadId);
    }

    // Set up real-time progress listener
    if (callbacks?.onProgress) {
      const unsub = NativeDownloader.onProgress(downloadId, (evt) => {
        callbacks.onProgress?.(evt);
      });
      this.activeSubscriptions.set(downloadId, unsub);
    }

    try {
      const result = await NativeDownloader.startDownload(downloadId, url, destPath, resume);
      callbacks?.onSuccess?.(result.localPath, result.totalBytes);
      return result;
    } catch (err: any) {
      const errorObj = new Error(err?.message || 'Download failed');
      callbacks?.onError?.(errorObj);
      throw errorObj;
    } finally {
      const unsub = this.activeSubscriptions.get(downloadId);
      if (unsub) {
        unsub();
        this.activeSubscriptions.delete(downloadId);
      }
    }
  }

  /**
   * Cancels an active download
   */
  public async cancel(downloadId: string): Promise<boolean> {
    const unsub = this.activeSubscriptions.get(downloadId);
    if (unsub) {
      unsub();
      this.activeSubscriptions.delete(downloadId);
    }
    return await NativeDownloader.cancelDownload(downloadId);
  }
}
