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

  public static selectModelForTask(
    taskType: 'medical_reasoning' | 'fast_checkin' | 'recovery_escalation' | 'general' = 'general',
    ramGb?: number
  ): { modelId: string; displayName: string } {
    const router = ModelRouter.getInstance();
    if (ramGb) {
      router.setDetectedRamGb(ramGb);
    }
    const t = taskType === 'recovery_escalation' ? 'medical_reasoning' : taskType;
    const decision = router.routeModel(t as any);
    return {
      modelId: decision.selectedModelId,
      displayName: decision.modelDisplayName,
    };
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

    const gemmaPkg =
      packages.find((p) => p.metadata.modelId.includes('gemma-4-e2b-it')) ||
      packages.find((p) => p.metadata.modelId.includes('gemma-4')) ||
      this.modelManager.getPackage('gemma-4-e2b-it-q4_0');

    const qwenPkg =
      packages.find(
        (p) =>
          p.metadata.modelId === 'qwen3-0.6b-q4_0' ||
          p.metadata.modelId === 'qwen2.5-0.5b-instruct-q4' ||
          p.metadata.modelId.includes('qwen')
      ) || this.modelManager.getPackage('qwen3-0.6b-q4_0');

    // 1. Determine Device Tier
    let tier = DevicePerformanceTier.Lightweight;
    if (this.detectedRamGb >= 12) {
      tier = DevicePerformanceTier.Ultra;
    } else if (this.detectedRamGb >= 6) {
      tier = DevicePerformanceTier.Standard;
    }

    // 2. User Manual Overrides
    if (this.userMode === ModelOperatingMode.MedicalReasoning || this.userMode === ModelOperatingMode.GeneralCompanion) {
      const targetId = gemmaPkg?.metadata.modelId || 'gemma-4-e2b-it-q4_0';
      return {
        selectedModelId: targetId,
        modelDisplayName: gemmaPkg?.metadata.displayName || 'Gemma 4 E2B IT (Large Model)',
        isMedGemmaActive: false,
        tier,
        mode: this.userMode,
        isMemorySafe: true,
        reason: 'Large Offline Model Mode: Gemma 4 E2B IT selected for on-device reasoning and companion dialogue.',
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
    const isGemmaInstalled = gemmaPkg?.status === ModelInstallStatus.Installed;
    const isQwenInstalled = qwenPkg?.status === ModelInstallStatus.Installed;

    if (isGemmaInstalled) {
      return {
        selectedModelId: gemmaPkg!.metadata.modelId,
        modelDisplayName: gemmaPkg!.metadata.displayName,
        isMedGemmaActive: false,
        tier,
        mode: ModelOperatingMode.Automatic,
        isMemorySafe: true,
        reason: 'Installed Large Model Detected: Automatic route to Gemma 4 E2B IT.',
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
        reason: 'Automatic route to installed Qwen Lightweight model.',
        deviceRamEstimateGb: this.detectedRamGb,
      };
    }

    // Fallback recommendation based on device hardware
    const defaultModelId =
      tier === DevicePerformanceTier.Ultra || tier === DevicePerformanceTier.Standard
        ? 'gemma-4-e2b-it-q4_0'
        : 'qwen3-0.6b-q4_0';

    return {
      selectedModelId: defaultModelId,
      modelDisplayName: this.modelManager.getPackage(defaultModelId)?.metadata.displayName || 'Gemma 4 E2B IT',
      isMedGemmaActive: false,
      tier,
      mode: ModelOperatingMode.Automatic,
      isMemorySafe: true,
      reason: `Device RAM (${this.detectedRamGb} GB) suggests ${tier} tier. Ready for model download.`,
      deviceRamEstimateGb: this.detectedRamGb,
    };
  }
}
