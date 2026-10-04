import { AIEngine } from '../src/ai/AIEngine';
import { LocalLLMEngine } from '../src/ai/LocalLLMEngine';
import { HealthMemoryService } from '../src/services/HealthMemoryService';
import { GGUFModelMetadata } from '../src/types/model';

describe('AIEngine (End-to-End Safety + llama.rn Inference Pipeline)', () => {
  let aiEngine: AIEngine;
  let localLLM: LocalLLMEngine;
  let memory: HealthMemoryService;

  const mockMeta: GGUFModelMetadata = {
    modelId: 'qwen2.5-0.5b',
    displayName: 'Qwen 2.5 0.5B Instruct',
    architecture: 'qwen2',
    parameters: '0.5B',
    quantization: 'Q4_K_M',
    sizeBytes: 400 * 1024 * 1024,
    expectedSha256: 'abc',
    downloadUrl: '',
    localFilename: 'qwen.gguf',
    contextLength: 2048,
    recommendedGpuLayers: 0,
    recommendedThreads: 4,
    systemPromptTemplate: '<|system|>\nYou are CareBond AI.\n<|user|>\n{prompt}<|assistant|>\n',
    stopTokens: ['<|im_end|>'],
  };

  beforeEach(() => {
    aiEngine = AIEngine.getInstance();
    localLLM = LocalLLMEngine.getInstance();
    memory = HealthMemoryService.getInstance();
    memory.loadDemoData();
  });

  test('should trigger deterministic emergency alert before hitting LLM', async () => {
    const stream = aiEngine.streamChat('I have crushing chest pain radiating to left arm');
    const chunks: string[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk.token);
      expect(chunk.isEmergencyAlert).toBe(true);
    }

    const fullAlert = chunks.join('');
    expect(fullAlert).toContain('EMERGENCY SAFETY ALERT');
    expect(fullAlert).toContain('Cardiac Emergency');
  });

  test('should intercept out-of-scope non-medical queries before hitting LLM', async () => {
    const stream = aiEngine.streamChat('Please write python code for web scraping');
    const chunks: string[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk.token);
      expect(chunk.isPolicyWarning).toBe(true);
    }

    const response = chunks.join('');
    expect(response).toContain('specialized on-device clinical and recovery health assistant');
  });

  test('should inject patient health context and stream real LLM tokens', async () => {
    // Mock llama.rn native completion
    let capturedPrompt = '';
    localLLM.setInitLlama(async () => ({
      completion: async (params, callback) => {
        capturedPrompt = params.prompt;
        callback?.({ token: 'Telmisartan ' });
        callback?.({ token: '40mg ' });
        callback?.({ token: 'controls ' });
        callback?.({ token: 'blood ' });
        callback?.({ token: 'pressure.' });
        return { text: 'Telmisartan 40mg controls blood pressure.' };
      },
      stopCompletion: async () => {},
      release: async () => {},
    }));

    await localLLM.loadModel('/path/to/qwen.gguf', mockMeta);
    const context = memory.buildCurrentContext();

    const stream = aiEngine.streamChat('What is my Telmisartan for?', context);
    const receivedTokens: string[] = [];

    for await (const chunk of stream) {
      receivedTokens.push(chunk.token);
    }

    // Verify context was injected into prompt
    expect(capturedPrompt).toContain('[PATIENT HEALTH RECORD]');
    expect(capturedPrompt).toContain('Telmisartan 40mg');
    expect(capturedPrompt).toContain('Essential Hypertension');

    // Verify tokens were received via stream
    expect(receivedTokens.join('')).toBe('Telmisartan 40mg controls blood pressure.');
  });

  test('should extract check-in intent for pain and sleep from natural language', () => {
    const action = aiEngine.extractCheckInAction('I slept for 6 hours and my pain is 4 today');
    expect(action).not.toBeNull();
    expect(action?.type).toBe('log_checkin');
    expect(action?.payload).toContain('pain=4');
    expect(action?.payload).toContain('sleep=6');
  });
});
