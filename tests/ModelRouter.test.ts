import { ModelRouter, DevicePerformanceTier, ModelOperatingMode } from '../src/ai/ModelRouter';
import { ModelManager } from '../src/ai/ModelManager';
import { ModelInstallStatus } from '../src/types/model';

describe('ModelRouter Device-Aware AI Routing & Safety Modes', () => {
  let router: ModelRouter;
  let modelManager: ModelManager;

  beforeEach(() => {
    router = ModelRouter.getInstance();
    modelManager = ModelManager.getInstance();
    router.setOperatingMode(ModelOperatingMode.Automatic);
    router.setDetectedRamGb(4.0); // baseline
  });

  test('should route to lightweight Qwen model on < 6GB RAM devices', () => {
    router.setDetectedRamGb(4.0);
    const decision = router.routeModel('general');
    expect(decision.tier).toBe(DevicePerformanceTier.Lightweight);
    expect(decision.selectedModelId).toContain('qwen');
    expect(decision.isMemorySafe).toBe(true);
  });

  test('should route to Gemma 4 E2B on Standard tier (6GB - 8GB RAM)', () => {
    router.setDetectedRamGb(8.0);
    const decision = router.routeModel('general');
    expect(decision.tier).toBe(DevicePerformanceTier.Standard);
    expect(decision.isMemorySafe).toBe(true);
  });

  test('should recommend MedGemma 4B on Ultra tier (12GB+ RAM, e.g. S24 Ultra)', () => {
    router.setDetectedRamGb(12.0);
    const decision = router.routeModel('medical_reasoning');
    expect(decision.tier).toBe(DevicePerformanceTier.Ultra);
    expect(decision.selectedModelId).toBe('medgemma-4b-it-q4');
    expect(decision.isMedGemmaActive).toBe(true);
    expect(decision.isMemorySafe).toBe(true);
  });

  test('should handle user manual override for Medical Reasoning with memory safety flags', () => {
    // Low RAM device, but user manually requested Medical Reasoning mode
    router.setDetectedRamGb(4.0);
    router.setOperatingMode(ModelOperatingMode.MedicalReasoning);

    const decision = router.routeModel();
    expect(decision.mode).toBe(ModelOperatingMode.MedicalReasoning);
    expect(decision.isMedGemmaActive).toBe(true);
    expect(decision.isMemorySafe).toBe(false); // Flagged because < 6GB RAM
    expect(decision.reason).toContain('Manual Override Caution');
  });

  test('should handle user manual override for General Companion mode', () => {
    router.setOperatingMode(ModelOperatingMode.GeneralCompanion);
    const decision = router.routeModel();
    expect(decision.mode).toBe(ModelOperatingMode.GeneralCompanion);
    expect(decision.selectedModelId).toBe('gemma-4-e2b-q4_k_m');
    expect(decision.isMemorySafe).toBe(true);
  });

  test('should handle user manual override for Lightweight mode', () => {
    router.setOperatingMode(ModelOperatingMode.Lightweight);
    const decision = router.routeModel();
    expect(decision.mode).toBe(ModelOperatingMode.Lightweight);
    expect(decision.selectedModelId).toBe('qwen3-0.6b-q4_0');
    expect(decision.isMemorySafe).toBe(true);
  });
});

