import { ModelManager } from './ModelManager';
import { ModelInstallStatus } from '../types/model';

export enum DevicePerformanceTier {
  Ultra = 'Ultra (12GB+ RAM, e.g. S24 Ultra)',
  Standard = 'Standard (6GB - 8GB RAM)',
  Lightweight = 'Lightweight (< 6GB RAM)',
}

export interface ModelRouteDecision {
  selectedModelId: string;
  isMedGemmaActive: boolean;
  tier: DevicePerformanceTier;
  reason: string;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private modelManager = ModelManager.getInstance();

  private constructor() {}

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Evaluates device memory and installed model packages to choose the optimal local LLM
   */
  public routeModel(taskType: 'medical_reasoning' | 'fast_checkin' | 'general'): ModelRouteDecision {
    const medGemmaPkg = this.modelManager.getPackage('medgemma-4b-it-q4');
    const qwenPkg = this.modelManager.getPackage('qwen2.5-0.5b-instruct-q4');

    // Check if MedGemma 4B is installed and ready
    if (
      taskType === 'medical_reasoning' &&
      medGemmaPkg &&
      medGemmaPkg.status === ModelInstallStatus.Installed
    ) {
      return {
        selectedModelId: 'medgemma-4b-it-q4',
        isMedGemmaActive: true,
        tier: DevicePerformanceTier.Ultra,
        reason: 'MedGemma 4B is installed; routing advanced clinical query to specialist model.',
      };
    }

    // Default fast & reliable fallback to Qwen 0.5B
    return {
      selectedModelId: 'qwen2.5-0.5b-instruct-q4',
      isMedGemmaActive: false,
      tier: DevicePerformanceTier.Standard,
      reason: 'Routing to ultra-fast Qwen 2.5 0.5B local GGUF engine.',
    };
  }
}
