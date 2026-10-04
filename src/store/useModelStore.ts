import { create } from 'zustand';
import {
  GGUFModelMetadata,
  ModelInstallStatus,
  ModelPackage,
  ModelState,
  QuantizationVariant,
} from '../types/model';
import { ModelManager } from '../ai/ModelManager';
import { LocalLLMEngine } from '../ai/LocalLLMEngine';

interface ModelStateStore {
  packages: ModelPackage[];
  activeModelId: string | null;
  activeMetadata: GGUFModelMetadata | null;
  engineState: ModelState;
  isLoadingModel: boolean;
  isDownloading: boolean;
  refreshPackages: () => void;
  downloadModel: (modelId: string, variant?: QuantizationVariant) => Promise<boolean>;
  cancelDownload: (modelId: string) => Promise<boolean>;
  loadModel: (modelId: string) => Promise<boolean>;
  unloadModel: () => Promise<void>;
  deleteModel: (modelId: string) => Promise<boolean>;
}

export const useModelStore = create<ModelStateStore>((set, get) => {
  const modelManager = ModelManager.getInstance();
  const llmEngine = LocalLLMEngine.getInstance();

  // Subscribe to ModelManager updates
  modelManager.subscribe((packages) => {
    set({
      packages,
      activeModelId: modelManager.getActiveModelId(),
      activeMetadata: llmEngine.getActiveModel(),
      engineState: llmEngine.getState(),
      isDownloading: packages.some((p) => p.status === ModelInstallStatus.Downloading),
    });
  });

  return {
    packages: modelManager.getPackages(),
    activeModelId: modelManager.getActiveModelId(),
    activeMetadata: llmEngine.getActiveModel(),
    engineState: llmEngine.getState(),
    isLoadingModel: false,
    isDownloading: false,

    refreshPackages: () => {
      set({
        packages: modelManager.getPackages(),
        activeModelId: modelManager.getActiveModelId(),
        activeMetadata: llmEngine.getActiveModel(),
        engineState: llmEngine.getState(),
        isDownloading: modelManager
          .getPackages()
          .some((p) => p.status === ModelInstallStatus.Downloading),
      });
    },

    downloadModel: async (modelId: string, variant?: QuantizationVariant) => {
      try {
        const success = await modelManager.downloadModel(modelId, variant);
        get().refreshPackages();
        return success;
      } catch (err) {
        get().refreshPackages();
        throw err;
      }
    },

    cancelDownload: async (modelId: string) => {
      const res = await modelManager.cancelDownload(modelId);
      get().refreshPackages();
      return res;
    },

    loadModel: async (modelId: string) => {
      set({ isLoadingModel: true });
      try {
        const success = await modelManager.loadModel(modelId);
        get().refreshPackages();
        return success;
      } finally {
        set({ isLoadingModel: false });
      }
    },

    unloadModel: async () => {
      await modelManager.unloadActiveModel();
      get().refreshPackages();
    },

    deleteModel: async (modelId: string) => {
      const res = await modelManager.deleteModel(modelId);
      get().refreshPackages();
      return res;
    },
  };
});
