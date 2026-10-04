import {
  DeviceCompatibility,
  GGUFModelMetadata,
  ModelInstallStatus,
  ModelPackage,
  ModelState,
  QuantizationVariant,
} from '../types/model';
import { ModelRegistry } from './ModelRegistry';
import { LocalLLMEngine } from './LocalLLMEngine';
import { ModelDownloader } from './ModelDownloader';
import { NativeDownloader } from '../services/NativeDownloader';
import { HuggingFaceService, HFModelSummary } from '../services/HuggingFaceService';

export class ModelManager {
  private static instance: ModelManager;
  private packages: Map<string, ModelPackage> = new Map();
  private activeModelId: string | null = null;
  private isRestoring = false;
  private listeners: Set<(packages: ModelPackage[]) => void> = new Set();

  private constructor() {
    this.initializeCatalog();
    this.restoreFromDisk();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  public subscribe(listener: (packages: ModelPackage[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPackages());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getPackages();
    this.listeners.forEach((l) => l(list));
  }

  private initializeCatalog() {
    const catalog = ModelRegistry.getCatalog();
    for (const meta of catalog) {
      this.packages.set(meta.modelId, {
        metadata: meta,
        status: ModelInstallStatus.NotInstalled,
        downloadProgress: 0,
        bytesDownloaded: 0,
        totalBytes: meta.sizeBytes,
      });
    }
  }

  private restorePromise: Promise<void> | null = null;

  /**
   * Scans local phone storage, detects previously downloaded GGUF files, and restores registry state
   */
  public async restoreFromDisk(): Promise<void> {
    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.restorePromise = (async () => {
      try {
        const diskFiles = await NativeDownloader.listModelFiles();
        const modelsDir = await NativeDownloader.getModelsDirectory();
        console.log('[ModelManager] Scanned disk files on device:', diskFiles.length, diskFiles);

      for (const file of diskFiles) {
        // Find existing package or create dynamic entry
        let matchedPkg: ModelPackage | undefined;
        for (const pkg of this.packages.values()) {
          if (
            pkg.metadata.localFilename.toLowerCase() === file.name.toLowerCase() ||
            pkg.metadata.downloadUrl.endsWith(file.name)
          ) {
            matchedPkg = pkg;
            break;
          }
        }

        if (matchedPkg) {
          matchedPkg.status = ModelInstallStatus.Installed;
          matchedPkg.downloadProgress = 1.0;
          matchedPkg.bytesDownloaded = file.sizeBytes;
          matchedPkg.totalBytes = file.sizeBytes;
          matchedPkg.localPath = file.path;
          matchedPkg.installedAt = matchedPkg.installedAt || new Date(file.modifiedAt).toISOString();
        } else {
          // Dynamic unregistered model found on disk
          const dynamicMeta: GGUFModelMetadata = {
            modelId: `custom_${file.name.replace('.gguf', '')}`,
            displayName: file.name.replace('.gguf', ''),
            architecture: 'auto',
            parameters: 'unknown',
            quantization: HuggingFaceService.extractQuantization(file.name),
            sizeBytes: file.sizeBytes,
            downloadUrl: '',
            localFilename: file.name,
            contextLength: 2048,
            recommendedGpuLayers: 0,
            recommendedThreads: 4,
            stopTokens: ['<|im_end|>', '</s>', '<end_of_turn>'],
            compatibility: DeviceCompatibility.Good,
          };

          this.packages.set(dynamicMeta.modelId, {
            metadata: dynamicMeta,
            status: ModelInstallStatus.Installed,
            downloadProgress: 1.0,
            bytesDownloaded: file.sizeBytes,
            totalBytes: file.sizeBytes,
            localPath: file.path,
            installedAt: new Date(file.modifiedAt).toISOString(),
          });
        }
      }

      this.notify();
    } catch (err) {
      console.warn('[ModelManager] Restore from disk warning:', err);
    } finally {
      this.restorePromise = null;
    }
  })();

  return this.restorePromise;
}

  public getPackages(): ModelPackage[] {
    return Array.from(this.packages.values());
  }

  public getPackage(modelId: string): ModelPackage | undefined {
    return this.packages.get(modelId);
  }

  public getActiveModelId(): string | null {
    return this.activeModelId;
  }

  /**
   * Search Hugging Face for GGUF models
   */
  public async searchHuggingFace(query: string): Promise<HFModelSummary[]> {
    return await HuggingFaceService.searchModels(query);
  }

  /**
   * Inspect a Hugging Face repo and return quantization files
   */
  public async inspectModelRepo(repoId: string) {
    return await HuggingFaceService.inspectModelRepo(repoId);
  }

  /**
   * Registers a Hugging Face model variant for download
   */
  public registerHuggingFaceModel(
    repoId: string,
    variant: QuantizationVariant,
    architecture = 'auto'
  ): ModelPackage {
    const modelId = `${repoId.replace('/', '_')}_${variant.quantization.toLowerCase()}`;
    const meta: GGUFModelMetadata = {
      modelId,
      displayName: `${repoId.split('/')[1] || repoId} (${variant.quantization})`,
      provider: repoId.split('/')[0],
      repositoryId: repoId,
      architecture,
      parameters: repoId.toLowerCase().includes('0.6b') ? '0.6B' : 'auto',
      quantization: variant.quantization,
      sizeBytes: variant.sizeBytes,
      downloadUrl: variant.downloadUrl,
      localFilename: variant.filename,
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      stopTokens: ['<|im_end|>', '</s>', '<end_of_turn>'],
      compatibility: DeviceCompatibility.Good,
    };

    const pkg: ModelPackage = {
      metadata: meta,
      status: ModelInstallStatus.NotInstalled,
      downloadProgress: 0,
      bytesDownloaded: 0,
      totalBytes: variant.sizeBytes,
    };

    this.packages.set(modelId, pkg);
    this.notify();
    return pkg;
  }

  /**
   * Real streaming download directly on phone with byte progress and ETA
   */
  public async downloadModel(modelId: string, selectedVariant?: QuantizationVariant): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg) {
      throw new Error(`Model package ${modelId} not found.`);
    }

    if (pkg.status === ModelInstallStatus.Downloading) {
      return false;
    }

    const targetUrl = selectedVariant?.downloadUrl || pkg.metadata.downloadUrl;
    const targetFilename = selectedVariant?.filename || pkg.metadata.localFilename;
    const targetSizeBytes = selectedVariant?.sizeBytes || pkg.metadata.sizeBytes;

    if (!targetUrl) {
      throw new Error(`No download URL available for model ${modelId}`);
    }

    const modelsDir = await NativeDownloader.getModelsDirectory();
    const destPath = `${modelsDir}/${targetFilename}`;

    pkg.status = ModelInstallStatus.Downloading;
    pkg.downloadProgress = 0;
    pkg.bytesDownloaded = 0;
    pkg.totalBytes = targetSizeBytes;
    pkg.errorMessage = undefined;
    this.notify();

    const downloader = ModelDownloader.getInstance();
    const downloadId = `dl_${modelId}_${Date.now()}`;

    try {
      const result = await downloader.download(downloadId, targetUrl, destPath, true, {
        onProgress: (evt) => {
          pkg.bytesDownloaded = evt.bytesDownloaded;
          pkg.totalBytes = evt.totalBytes > 0 ? evt.totalBytes : pkg.totalBytes;
          pkg.downloadProgress = evt.progress;
          pkg.downloadSpeedBytesPerSec = evt.speedBytesPerSec;
          if (evt.speedBytesPerSec > 0 && pkg.totalBytes > pkg.bytesDownloaded) {
            pkg.estimatedRemainingSec = Math.round(
              (pkg.totalBytes - pkg.bytesDownloaded) / evt.speedBytesPerSec
            );
          }
          this.notify();
        },
      });

      // Verification phase
      pkg.status = ModelInstallStatus.Verifying;
      this.notify();

      const verify = await NativeDownloader.verifyModelFile(
        result.localPath,
        pkg.totalBytes,
        pkg.metadata.expectedSha256
      );

      if (!verify.valid) {
        throw new Error(`Model file validation failed: ${verify.reason || 'corrupted'}`);
      }

      pkg.status = ModelInstallStatus.Installed;
      pkg.downloadProgress = 1.0;
      pkg.bytesDownloaded = result.totalBytes;
      pkg.totalBytes = result.totalBytes;
      pkg.localPath = result.localPath;
      pkg.installedAt = new Date().toISOString();
      pkg.lastValidatedAt = new Date().toISOString();
      pkg.downloadSpeedBytesPerSec = 0;
      pkg.estimatedRemainingSec = 0;

      this.notify();
      return true;
    } catch (err: any) {
      if (pkg.status === ModelInstallStatus.Downloading || pkg.status === ModelInstallStatus.Verifying) {
        pkg.status = ModelInstallStatus.Error;
        pkg.errorMessage = err?.message || 'Download failed';
        this.notify();
      }
      throw err;
    }
  }

  /**
   * Cancels active model download
   */
  public async cancelDownload(modelId: string): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg || pkg.status !== ModelInstallStatus.Downloading) return false;

    pkg.status = ModelInstallStatus.NotInstalled;
    pkg.downloadProgress = 0;
    pkg.bytesDownloaded = 0;
    pkg.downloadSpeedBytesPerSec = 0;
    pkg.estimatedRemainingSec = 0;
    this.notify();

    const downloader = ModelDownloader.getInstance();
    return await downloader.cancel(`dl_${modelId}`);
  }

  /**
   * Loads an installed GGUF model into llama.rn memory
   */
  public async loadModel(modelId: string): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg) {
      throw new Error(`Model package ${modelId} not found in registry.`);
    }

    if (pkg.status !== ModelInstallStatus.Installed || !pkg.localPath) {
      throw new Error(`Model ${modelId} is not installed locally (status: ${pkg.status})`);
    }

    const engine = LocalLLMEngine.getInstance();
    const success = await engine.loadModel(pkg.localPath, pkg.metadata);
    if (success) {
      this.activeModelId = modelId;
      this.notify();
    }
    return success;
  }

  /**
   * Unloads active model from llama.rn memory
   */
  public async unloadActiveModel(): Promise<void> {
    const engine = LocalLLMEngine.getInstance();
    await engine.unloadModel();
    this.activeModelId = null;
    this.notify();
  }

  /**
   * Deletes a local model file from disk and resets registry
   */
  public async deleteModel(modelId: string): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg) return false;

    if (this.activeModelId === modelId) {
      await this.unloadActiveModel();
    }

    if (pkg.localPath) {
      await NativeDownloader.deleteModelFile(pkg.localPath);
    }

    pkg.status = ModelInstallStatus.NotInstalled;
    pkg.downloadProgress = 0;
    pkg.bytesDownloaded = 0;
    pkg.localPath = undefined;
    pkg.installedAt = undefined;
    pkg.lastValidatedAt = undefined;
    this.notify();
    return true;
  }
}
