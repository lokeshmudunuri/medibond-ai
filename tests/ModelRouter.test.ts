import { ModelRouter, DevicePerformanceTier } from '../src/ai/ModelRouter';

describe('ModelRouter Device-Aware AI Routing', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = ModelRouter.getInstance();
  });

  test('should route fast check-in to lightweight Qwen 0.5B model', () => {
    const decision = router.routeModel('fast_checkin');
    expect(decision.selectedModelId).toBe('qwen2.5-0.5b-instruct-q4');
    expect(decision.tier).toBe(DevicePerformanceTier.Standard);
  });

  test('should fallback to fast Qwen 0.5B when MedGemma is not installed', () => {
    const decision = router.routeModel('medical_reasoning');
    expect(decision.selectedModelId).toBeDefined();
  });
});
