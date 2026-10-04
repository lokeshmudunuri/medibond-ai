import { ModelManager } from './ModelManager';
import { ModelInstallStatus } from '../types/model';
import { NativeDownloader, StorageInfo } from '../services/NativeDownloader';

export enum DevicePerformanceTier {
  Ultra = 'Ultra (12GB+ RAM, e.g. S24 Ultra)',
  Standard = 'Standard (6GB - 8GB RAM)',
  Lightweight = 'Lightweight (< 6GB RAM)',
}

export enum ModelOperatingMode {
  Automatic = 'automatic',
  Lightweight = 'lightweight',
  GeneralCompanion = 'general_companion',
  MedicalReasoning = 'medical_reasoning',
}

export interface ModelRouteDecision {
  selectedModelId: string;
  modelDisplayName: string;
  isMedGemmaActive: boolean;
  tier: DevicePerformanceTier;
  mode: ModelOperatingMode;
  isMemorySafe: boolean;
  reason: string;
  deviceRamEstimateGb: number;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private modelManager = ModelManager.getInstance();
  private userMode: ModelOperatingMode = ModelOperatingMode.Automatic;
  private cachedStorage: StorageInfo | null = null;
  private detectedRamGb = 4.0; // Default estimate, updated dynamically

  private constructor() {
    this.detectDeviceProfile();
  }

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  public async detectDeviceProfile(): Promise<void> {
    try {
      this.cachedStorage = await NativeDownloader.getStorageInfo();
      // Estimate RAM tier: High-end phones with > 100GB total internal storage and high free storage
      const totalDiskGb = this.cachedStorage.totalBytes / (1024 * 1024 * 1024);
      if (totalDiskGb >= 200) {
        this.detectedRamGb = 12.0; // S24 Ultra class
      } else if (totalDiskGb >= 100) {
        this.detectedRamGb = 8.0;
      } else {
        this.detectedRamGb = 4.0; // Standard / Emulator
      }
    } catch (e) {
      console.warn('[ModelRouter] Error detecting device profile:', e);
    }
  }

  public setOperatingMode(mode: ModelOperatingMode) {
    this.userMode = mode;
  }

  public getOperatingMode(): ModelOperatingMode {
    return this.userMode;
  }

  public getDeviceRamGb(): number {
    return this.detectedRamGb;
  }

  public setDetectedRamGb(ramGb: number) {
    this.detectedRamGb = ramGb;
  }

  /**
   * Evaluates device memory, task type, and user preferences to select optimal local LLM
   */
  public routeModel(taskType: 'medical_reasoning' | 'fast_checkin' | 'general' = 'general'): ModelRouteDecision {
    const packages = this.modelManager.getPackages();

    const medGemmaPkg =
      packages.find((p) => p.metadata.modelId.includes('medgemma')) ||
      this.modelManager.getPackage('medgemma-4b-it-q4');

    const gemmaPkg =
      packages.find(
        (p) =>
          (p.metadata.modelId.startsWith('gemma-4') || p.metadata.modelId.includes('gemma-4')) &&
          !p.metadata.modelId.includes('medgemma')
      ) || this.modelManager.getPackage('gemma-4-e2b-q4_k_m');

    const qwenPkg =
      packages.find(
        (p) =>
          p.metadata.modelId === 'qwen3-0.6b-q4_0' ||
          (p.metadata.modelId.includes('qwen') && !p.metadata.modelId.includes('gemma'))
      ) || this.modelManager.getPackage('qwen3-0.6b-q4_0');

    // 1. Determine Device Tier
    let tier = DevicePerformanceTier.Lightweight;
    if (this.detectedRamGb >= 12) {
      tier = DevicePerformanceTier.Ultra;
    } else if (this.detectedRamGb >= 6) {
      tier = DevicePerformanceTier.Standard;
    }

    // 2. User Manual Overrides
    if (this.userMode === ModelOperatingMode.MedicalReasoning) {
      const isMemorySafe = this.detectedRamGb >= 6.0;
      const targetId = medGemmaPkg?.metadata.modelId || 'medgemma-4b-it-q4';
      return {
        selectedModelId: targetId,
        modelDisplayName: medGemmaPkg?.metadata.displayName || 'MedGemma 4B Instruct',
        isMedGemmaActive: true,
        tier,
        mode: ModelOperatingMode.MedicalReasoning,
        isMemorySafe,
        reason: isMemorySafe
          ? 'Manual Medical Reasoning Mode: MedGemma 4B selected for clinical depth.'
          : '⚠️ Manual Override Caution: MedGemma 4B selected on a device with limited RAM. Safe execution enabled with 2048 context.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    if (this.userMode === ModelOperatingMode.GeneralCompanion) {
      const targetId = gemmaPkg?.metadata.modelId || 'gemma-4-e2b-q4_k_m';
      return {
        selectedModelId: targetId,
        modelDisplayName: gemmaPkg?.metadata.displayName || 'Gemma 4 E2B Instruct',
        isMedGemmaActive: false,
        tier,
        mode: ModelOperatingMode.GeneralCompanion,
        isMemorySafe: true,
        reason: 'Manual General Companion Mode: Gemma 4 E2B selected for conversational balance.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    if (this.userMode === ModelOperatingMode.Lightweight) {
      const targetId = qwenPkg?.metadata.modelId || 'qwen3-0.6b-q4_0';
      return {
        selectedModelId: targetId,
        modelDisplayName: qwenPkg?.metadata.displayName || 'Qwen3 0.6B Instruct (Lightweight)',
        isMedGemmaActive: false,
        tier,
        mode: ModelOperatingMode.Lightweight,
        isMemorySafe: true,
        reason: 'Manual Lightweight Mode: Ultra-fast 0.6B engine selected for minimal RAM footprint.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    // 3. Automatic Device-Based Routing
    // Check what is currently installed on disk
    const isMedGemmaInstalled = medGemmaPkg?.status === ModelInstallStatus.Installed;
    const isGemmaInstalled = gemmaPkg?.status === ModelInstallStatus.Installed;
    const isQwenInstalled = qwenPkg?.status === ModelInstallStatus.Installed;

    if (tier === DevicePerformanceTier.Ultra && isMedGemmaInstalled) {
      return {
        selectedModelId: medGemmaPkg!.metadata.modelId,
        modelDisplayName: medGemmaPkg!.metadata.displayName,
        isMedGemmaActive: true,
        tier,
        mode: ModelOperatingMode.Automatic,
        isMemorySafe: true,
        reason: 'Ultra Device Detected (12GB+ RAM): Automatic route to MedGemma 4B Medical Specialist.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    if ((tier === DevicePerformanceTier.Standard || tier === DevicePerformanceTier.Ultra) && isGemmaInstalled) {
      return {
        selectedModelId: gemmaPkg!.metadata.modelId,
        modelDisplayName: gemmaPkg!.metadata.displayName,
        isMedGemmaActive: false,
        tier,
        mode: ModelOperatingMode.Automatic,
        isMemorySafe: true,
        reason: 'Standard Device Detected (6GB - 8GB RAM): Automatic route to Gemma 4 E2B General Companion.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    if (isQwenInstalled) {
      return {
        selectedModelId: qwenPkg!.metadata.modelId,
        modelDisplayName: qwenPkg!.metadata.displayName,
        isMedGemmaActive: false,
        tier,
        mode: ModelOperatingMode.Automatic,
        isMemorySafe: true,
        reason: 'Automatic route to installed Qwen 0.6B Lightweight model.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    // Fallback recommendation based on device hardware
    const defaultModelId =
      tier === DevicePerformanceTier.Ultra
        ? 'medgemma-4b-it-q4'
        : tier === DevicePerformanceTier.Standard
        ? 'gemma-4-e2b-q4_k_m'
        : 'qwen3-0.6b-q4_0';

    return {
      selectedModelId: defaultModelId,
      modelDisplayName: this.modelManager.getPackage(defaultModelId)?.metadata.displayName || 'Local GGUF Model',
      isMedGemmaActive: defaultModelId.includes('medgemma'),
      tier,
      mode: ModelOperatingMode.Automatic,
      isMemorySafe: true,
      reason: `Device RAM (${this.detectedRamGb} GB) suggests ${tier} tier. Ready for model download.`,
      deviceRamEstimateGb: this.detectedRamGb,
    };
  }
}
