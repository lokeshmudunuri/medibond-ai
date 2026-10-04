import { ModelManager } from '../src/ai/ModelManager';
import { ModelRegistry } from '../src/ai/ModelRegistry';
import { ModelInstallStatus } from '../src/types/model';
import { HuggingFaceService } from '../src/services/HuggingFaceService';

describe('PocketPal-style ModelManager & Hugging Face Discovery', () => {
  let manager: ModelManager;

  beforeEach(() => {
    manager = ModelManager.getInstance();
  });

  test('should initialize catalog with default models in NotInstalled state', () => {
    const packages = manager.getPackages();
    expect(packages.length).toBeGreaterThanOrEqual(3);

    const qwen = packages.find((p) => p.metadata.modelId === 'qwen3-0.6b-q4_0');
    expect(qwen).toBeDefined();
    expect(qwen?.metadata.displayName).toContain('Qwen3 0.6B');
    expect(qwen?.metadata.quantization).toBe('Q4_0');
  });

  test('should parse GGUF quantization types accurately', () => {
    expect(HuggingFaceService.extractQuantization('Qwen3-0.6B-Q4_0.gguf')).toBe('Q4_0');
    expect(HuggingFaceService.extractQuantization('qwen2.5-0.5b-instruct-q4_k_m.gguf')).toBe('Q4_K_M');
    expect(HuggingFaceService.extractQuantization('model-q8_0.gguf')).toBe('Q8_0');
    expect(HuggingFaceService.extractQuantization('model-bf16.gguf')).toBe('BF16');
  });

  test('should register a custom Hugging Face model variant', () => {
    const pkg = manager.registerHuggingFaceModel('ggml-org/Qwen3-0.6B-GGUF', {
      quantization: 'Q8_0',
      filename: 'Qwen3-0.6B-Q8_0.gguf',
      sizeBytes: 805306368,
      downloadUrl: 'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    });

    expect(pkg).toBeDefined();
    expect(pkg.metadata.quantization).toBe('Q8_0');
    expect(pkg.status).toBe(ModelInstallStatus.NotInstalled);

    const retrieved = manager.getPackage(pkg.metadata.modelId);
    expect(retrieved).toBeDefined();
  });

  test('should handle model deletion cleanly', async () => {
    const pkg = manager.getPackage('qwen3-0.6b-q4_0');
    expect(pkg).toBeDefined();

    const deleted = await manager.deleteModel('qwen3-0.6b-q4_0');
    expect(deleted).toBe(true);
    expect(pkg?.status).toBe(ModelInstallStatus.NotInstalled);
    expect(pkg?.localPath).toBeUndefined();
  });
});
