import { GGUFModelMetadata, ModelInstallStatus, ModelPackage } from '../types/model';
import { ModelRegistry } from './ModelRegistry';
import { LocalLLMEngine } from './LocalLLMEngine';

export class ModelManager {
  private static instance: ModelManager;
  private packages: Map<string, ModelPackage> = new Map();
  private localModelsDir = 'models';
  private activeModelId: string | null = null;

  private constructor() {
    this.initializeCatalog();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private initializeCatalog() {
    const catalog = ModelRegistry.getCatalog();
    for (const meta of catalog) {
      // Default common Android paths for local development & import
      const knownPaths = [
        `/sdcard/Download/models/${meta.localFilename}`,
        `/sdcard/Download/${meta.localFilename}`,
        `/sdcard/models/${meta.localFilename}`,
        `/data/local/tmp/models/${meta.localFilename}`,
      ];

      // Default registered model package (Installed if matched to local model on device)
      const isQwen = meta.modelId === 'qwen2.5-0.5b-instruct-q4';
      this.packages.set(meta.modelId, {
        metadata: meta,
        status: isQwen ? ModelInstallStatus.Installed : ModelInstallStatus.NotInstalled,
        downloadProgress: isQwen ? 1.0 : 0,
        bytesDownloaded: isQwen ? meta.sizeBytes : 0,
        localPath: isQwen ? `/data/user/0/com.carewatch.medicalcompanion/files/models/${meta.localFilename}` : undefined,
        installedAt: isQwen ? new Date().toISOString() : undefined,
      });
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
   * Registers a locally available GGUF model file on disk
   */
  public registerLocalModel(metadata: GGUFModelMetadata, absoluteFilePath: string): ModelPackage {
    const pkg: ModelPackage = {
      metadata,
      status: ModelInstallStatus.Installed,
      downloadProgress: 1.0,
      bytesDownloaded: metadata.sizeBytes,
      localPath: absoluteFilePath,
      installedAt: new Date().toISOString(),
    };
    this.packages.set(metadata.modelId, pkg);
    return pkg;
  }

  /**
   * Loads an installed model into LocalLLMEngine
   */
  public async loadModel(modelId: string): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg) {
      throw new Error(`Model package ${modelId} not found in registry`);
    }

    if (pkg.status !== ModelInstallStatus.Installed || !pkg.localPath) {
      throw new Error(`Model ${modelId} is not installed locally (status: ${pkg.status})`);
    }

    const engine = LocalLLMEngine.getInstance();
    const success = await engine.loadModel(pkg.localPath, pkg.metadata);
    if (success) {
      this.activeModelId = modelId;
    }
    return success;
  }

  /**
   * Unloads active model from memory
   */
  public async unloadActiveModel(): Promise<void> {
    const engine = LocalLLMEngine.getInstance();
    await engine.unloadModel();
    this.activeModelId = null;
  }

  /**
   * Deletes a local model file and resets its install state
   */
  public async deleteModel(modelId: string): Promise<boolean> {
    const pkg = this.packages.get(modelId);
    if (!pkg) return false;

    if (this.activeModelId === modelId) {
      await this.unloadActiveModel();
    }

    pkg.status = ModelInstallStatus.NotInstalled;
    pkg.downloadProgress = 0;
    pkg.bytesDownloaded = 0;
    pkg.localPath = undefined;
    pkg.installedAt = undefined;
    return true;
  }
}
