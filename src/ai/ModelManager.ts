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
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
      this.restoreFromDisk();
    }
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
        // First, dynamically discover and sync Gemma 4 E2B IT from Hugging Face
        await this.syncGemmaFromHuggingFace();

        const diskFiles = await NativeDownloader.listModelFiles();
        console.log('[ModelManager] Scanned disk files on device:', diskFiles.length, diskFiles);

        for (const file of diskFiles) {
          // Reject partial, 0-byte or corrupted files (< 10 MB)
          if (!file.path || file.sizeBytes < 10 * 1024 * 1024) {
            console.log('[ModelManager] Skipping invalid/partial file on disk:', file.name, file.sizeBytes);
            continue;
          }

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
            console.log('[ModelManager] Verified local installed model:', matchedPkg.metadata.modelId, file.path, `${(file.sizeBytes / 1e6).toFixed(1)} MB`);
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
              stopTokens: ['<|im_end|>', '</s>', '<end_of_turn>', '<eos>'],
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
            console.log('[ModelManager] Registered custom model from disk:', dynamicMeta.modelId, file.path);
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

  /**
   * Dynamically queries Hugging Face API for ggml-org/gemma-4-E2B-it-GGUF and updates metadata
   */
  public async syncGemmaFromHuggingFace(): Promise<void> {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return;
    }
    const repoId = 'ggml-org/gemma-4-E2B-it-GGUF';
    const targetModelId = 'gemma-4-e2b-it-q4_0';
    console.log(`[ModelManager] HF Sync: GET https://huggingface.co/api/models/${repoId}`);

    try {
      const details = await HuggingFaceService.inspectModelRepo(repoId);
      if (details && details.files.length > 0) {
        // Find Q4_0 artifact or default to primary file
        const q4File =
          details.files.find((f) => f.filename.includes('Q4_0') || f.quantization.includes('Q4_0')) ||
          details.files[0];

        const existingPkg = this.packages.get(targetModelId);
        if (existingPkg && q4File) {
          existingPkg.metadata.localFilename = q4File.filename;
          existingPkg.metadata.downloadUrl = q4File.downloadUrl;
          existingPkg.metadata.sizeBytes = q4File.sizeBytes > 0 ? q4File.sizeBytes : 2841481184;
          existingPkg.totalBytes = existingPkg.metadata.sizeBytes;
          console.log('[ModelManager] Dynamically resolved Gemma 4 E2B IT artifact:', {
            repo: repoId,
            filename: q4File.filename,
            url: q4File.downloadUrl,
            sizeBytes: existingPkg.metadata.sizeBytes,
          });
        }
      }
    } catch (e) {
      console.warn('[ModelManager] HF dynamic sync notice (offline or network fallback):', e);
    }
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

    console.log('[ModelManager:DiagnosticLog]', {
      step: 'START_DOWNLOAD',
      modelId,
      repositoryId: pkg.metadata.repositoryId,
      resolvedFilename: targetFilename,
      resolveUrl: targetUrl,
      expectedSizeBytes: targetSizeBytes,
      destinationPath: destPath,
    });

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

      console.log('[ModelManager:DiagnosticLog]', {
        step: 'DOWNLOAD_COMPLETE',
        modelId,
        contentLength: result.totalBytes,
        downloadedBytes: result.totalBytes,
        finalFilePath: result.localPath,
      });

      // Verification phase
      pkg.status = ModelInstallStatus.Verifying;
      this.notify();

      const verify = await NativeDownloader.verifyModelFile(
        result.localPath,
        pkg.totalBytes,
        pkg.metadata.expectedSha256
      );

      console.log('[ModelManager:DiagnosticLog]', {
        step: 'VERIFY_RESULT',
        modelId,
        filePath: result.localPath,
        checksumValid: verify.valid,
        actualSize: verify.size,
        reason: verify.reason || 'OK',
      });

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
      console.error('[ModelManager:DiagnosticLog]', {
        step: 'DOWNLOAD_ERROR',
        modelId,
        error: err?.message || err,
      });
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

    console.log('[ModelManager:DiagnosticLog]', {
      step: 'CANCEL_DOWNLOAD',
      modelId,
    });

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

    console.log('[ModelManager:DiagnosticLog]', {
      step: 'LLAMA_LOAD_INIT',
      modelId,
      localPath: pkg.localPath,
      contextLength: pkg.metadata.contextLength,
    });

    const engine = LocalLLMEngine.getInstance();
    const success = await engine.loadModel(pkg.localPath, pkg.metadata);
    console.log('[ModelManager:DiagnosticLog]', {
      step: 'LLAMA_LOAD_RESULT',
      modelId,
      success,
      engineState: engine.getState(),
    });

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

    try {
      const modelsDir = await NativeDownloader.getModelsDirectory();
      const targetFilename = pkg.metadata.localFilename;
      const pathsToDelete = new Set<string>();

      if (pkg.localPath) {
        pathsToDelete.add(pkg.localPath);
      }
      if (modelsDir && targetFilename) {
        pathsToDelete.add(`${modelsDir}/${targetFilename}`);
      }

      for (const p of pathsToDelete) {
        await NativeDownloader.deleteModelFile(p);
      }
    } catch (e) {
      console.warn('[ModelManager] Error deleting model files from disk:', e);
    }

    pkg.status = ModelInstallStatus.NotInstalled;
    pkg.downloadProgress = 0;
    pkg.bytesDownloaded = 0;
    pkg.localPath = undefined;
    pkg.installedAt = undefined;
    pkg.lastValidatedAt = undefined;
    pkg.errorMessage = undefined;
    this.notify();
    return true;
  }
}
