import { LocalLLMEngine } from '../src/ai/LocalLLMEngine';
import { GGUFModelMetadata, ModelState } from '../src/types/model';

describe('PocketPal-style LocalLLMEngine & llama.rn Bridge', () => {
  let engine: LocalLLMEngine;

  const mockMetadata: GGUFModelMetadata = {
    modelId: 'test-qwen-0.5b',
    displayName: 'Test Qwen 0.5B GGUF',
    architecture: 'qwen2',
    parameters: '0.5B',
    quantization: 'Q4_K_M',
    sizeBytes: 400 * 1024 * 1024,
    expectedSha256: 'abc123',
    downloadUrl: 'https://example.com/model.gguf',
    localFilename: 'model.gguf',
    contextLength: 2048,
    recommendedGpuLayers: 0,
    recommendedThreads: 4,
    stopTokens: ['<|im_end|>', '<|endoftext|>'],
  };

  beforeEach(() => {
    engine = LocalLLMEngine.getInstance();
  });

  afterEach(async () => {
    await engine.unloadModel();
  });

  test('should initialize in Unloaded state', () => {
    expect(engine.getState()).toBe(ModelState.Unloaded);
    expect(engine.getActiveModel()).toBeNull();
  });

  test('should load GGUF model via mock llama.rn initLlama binding and enter Ready state', async () => {
    // Mock native llama.rn initLlama
    let stopCalled = false;
    let releaseCalled = false;

    engine.setInitLlama(async options => {
      expect(options.model).toBe('/data/local/model.gguf');
      expect(options.n_ctx).toBe(2048);
      expect(options.n_threads).toBe(4);

      return {
        completion: async (params, callback) => {
          // Emit streamed tokens
          callback?.({ token: 'Telmisartan ' });
          callback?.({ token: 'is ' });
          callback?.({ token: 'an ' });
          callback?.({ token: 'antihypertensive.' });
          return {
            text: 'Telmisartan is an antihypertensive.',
            timings: {
              predicted_per_second: 32.5,
              predicted_ms: 120,
              predicted_n: 4,
            },
          };
        },
        stopCompletion: async () => {
          stopCalled = true;
        },
        release: async () => {
          releaseCalled = true;
        },
      };
    });

    const success = await engine.loadModel('/data/local/model.gguf', mockMetadata);
    expect(success).toBe(true);
    expect(engine.getState()).toBe(ModelState.Ready);
    expect(engine.getActiveModel()?.modelId).toBe('test-qwen-0.5b');
  });

  test('should stream generated tokens asynchronously from llama.rn', async () => {
    engine.setInitLlama(async () => ({
      completion: async (params, callback) => {
        const tokens = ['Take ', 'Pantoprazole ', '40mg ', 'before ', 'breakfast.'];
        for (const t of tokens) {
          callback?.({ token: t });
        }
        return { text: tokens.join('') };
      },
      stopCompletion: async () => {},
      release: async () => {},
    }));

    await engine.loadModel('/data/local/model.gguf', mockMetadata);

    const stream = engine.generateStream('When should I take Pantoprazole?');
    const receivedTokens: string[] = [];

    for await (const token of stream) {
      receivedTokens.push(token);
    }

    expect(receivedTokens).toEqual(['Take ', 'Pantoprazole ', '40mg ', 'before ', 'breakfast.']);
    expect(engine.getState()).toBe(ModelState.Ready);
  });

  test('should trigger stopCompletion and cancel generation when requested', async () => {
    let stopTriggered = false;

    engine.setInitLlama(async () => ({
      completion: async (params, callback) => {
        callback?.({ token: 'Starting response...' });
        return { text: 'Starting response...' };
      },
      stopCompletion: async () => {
        stopTriggered = true;
      },
      release: async () => {},
    }));

    await engine.loadModel('/data/local/model.gguf', mockMetadata);
    await engine.stopGeneration();

    expect(engine.getState()).toBe(ModelState.Ready);
  });

  test('should release native context when model is unloaded', async () => {
    let released = false;

    engine.setInitLlama(async () => ({
      completion: async () => ({ text: '' }),
      stopCompletion: async () => {},
      release: async () => {
        released = true;
      },
    }));

    await engine.loadModel('/data/local/model.gguf', mockMetadata);
    await engine.unloadModel();

    expect(released).toBe(true);
    expect(engine.getState()).toBe(ModelState.Unloaded);
    expect(engine.getActiveModel()).toBeNull();
  });
});
