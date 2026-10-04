import { create } from 'zustand';
import { GGUFModelMetadata, ModelInstallStatus, ModelPackage, ModelState } from '../types/model';
import { ModelManager } from '../ai/ModelManager';
import { LocalLLMEngine } from '../ai/LocalLLMEngine';

interface ModelStateStore {
  packages: ModelPackage[];
  activeModelId: string | null;
  activeMetadata: GGUFModelMetadata | null;
  engineState: ModelState;
  isLoadingModel: boolean;
  refreshPackages: () => void;
  registerLocalModel: (metadata: GGUFModelMetadata, path: string) => void;
  loadModel: (modelId: string) => Promise<boolean>;
  unloadModel: () => Promise<void>;
  deleteModel: (modelId: string) => Promise<boolean>;
}

export const useModelStore = create<ModelStateStore>((set, get) => {
  const modelManager = ModelManager.getInstance();
  const llmEngine = LocalLLMEngine.getInstance();

  return {
    packages: modelManager.getPackages(),
    activeModelId: modelManager.getActiveModelId(),
    activeMetadata: llmEngine.getActiveModel(),
    engineState: llmEngine.getState(),
    isLoadingModel: false,

    refreshPackages: () => {
      set({
        packages: modelManager.getPackages(),
        activeModelId: modelManager.getActiveModelId(),
        activeMetadata: llmEngine.getActiveModel(),
        engineState: llmEngine.getState(),
      });
    },

    registerLocalModel: (metadata: GGUFModelMetadata, path: string) => {
      modelManager.registerLocalModel(metadata, path);
      get().refreshPackages();
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
