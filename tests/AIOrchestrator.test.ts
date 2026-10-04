import { AIOrchestrator } from '../src/ai/AIOrchestrator';
import { HealthMemoryService } from '../src/services/HealthMemoryService';
import { LocalLLMEngine } from '../src/ai/LocalLLMEngine';
import { DeviceCompatibility, GGUFModelMetadata, ModelState } from '../src/types/model';

describe('AIOrchestrator Unified Clinical Reasoning Engine', () => {
  let orchestrator: AIOrchestrator;
  let memory: HealthMemoryService;
  let localLLM: LocalLLMEngine;

  const mockModelMetadata: GGUFModelMetadata = {
    modelId: 'qwen2.5-0.5b-instruct-q4',
    displayName: 'Qwen 2.5 0.5B Instruct',
    architecture: 'qwen2',
    parameters: '0.5B',
    quantization: 'Q4_K_M',
    sizeBytes: 397808192,
    downloadUrl: 'https://example.com/qwen.gguf',
    localFilename: 'qwen.gguf',
    contextLength: 2048,
    recommendedGpuLayers: 0,
    recommendedThreads: 4,
    compatibility: DeviceCompatibility.Good,
    systemPromptTemplate: '<|im_start|>system\nYou are CareBond AI.<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n',
    stopTokens: ['<|im_end|>'],
  };

  beforeEach(() => {
    orchestrator = AIOrchestrator.getInstance();
    memory = HealthMemoryService.getInstance();
    localLLM = LocalLLMEngine.getInstance();
    memory.clearAllData();

    // Mock local LLM context
    localLLM.setInitLlama(async () => ({
      completion: async (params, callback) => {
        const responseText = 'Your blood pressure medication Telmisartan 40mg is active. [DOCUMENTED FACT]';
        if (callback) {
          callback({ token: 'Your blood pressure ' });
          callback({ token: 'medication Telmisartan 40mg ' });
          callback({ token: 'is active. ' });
          callback({ token: '[DOCUMENTED FACT]' });
        }
        return { text: responseText };
      },
      stopCompletion: async () => {},
      release: async () => {},
    }));
  });

  afterEach(async () => {
    await localLLM.unloadModel();
  });

  test('should intercept acute emergencies immediately before model inference', async () => {
    const emergencyPrompt = 'I have sudden severe chest pain and left arm numbness';
    const stream = orchestrator.streamReasoning(emergencyPrompt);

    let emergencyCaptured = false;
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk.token;
      if (chunk.isEmergencyAlert) {
        emergencyCaptured = true;
      }
    }

    expect(emergencyCaptured).toBe(true);
    expect(fullText).toContain('EMERGENCY MEDICAL ALERT');
    expect(fullText).toContain('112 / 911 / 108');
  });

  test('should filter out-of-scope non-medical queries before model inference', async () => {
    const outOfScopePrompt = 'How do I configure nginx reverse proxy on ubuntu?';
    const stream = orchestrator.streamReasoning(outOfScopePrompt);

    let policyWarning = false;
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk.token;
      if (chunk.isPolicyWarning) {
        policyWarning = true;
      }
    }

    expect(policyWarning).toBe(true);
    expect(fullText).toContain('CareBond AI');
  });

  test('should ground diet guidance strictly in active case notes or return clear uncertainty', async () => {
    // 1. Case with specific diet guidance
    const caseA = memory.createCase({
      title: 'Dr. Ravi Cardiology',
      doctorName: 'Dr. Ravi',
      hospitalName: 'Rashi Hospital',
      dietGuidance: 'Low sodium diet, avoid deep fried and salty foods.',
    });

    await localLLM.loadModel('/dummy/path', mockModelMetadata);

    const streamA = orchestrator.streamReasoning('Can I eat biryani?', caseA.id);
    let outputA = '';
    for await (const chunk of streamA) {
      outputA += chunk.token;
    }
    expect(outputA.length).toBeGreaterThan(0);

    // 2. Case without diet guidance
    const caseEmpty = memory.createCase({
      title: 'General Review',
      doctorName: 'Dr. Smith',
      hospitalName: 'Clinic',
    });

    const streamEmpty = orchestrator.streamReasoning('Can I eat biryani?', caseEmpty.id);
    let outputEmpty = '';
    for await (const chunk of streamEmpty) {
      outputEmpty += chunk.token;
    }
    expect(outputEmpty).toContain("I don't have enough information in this case to give you a reliable personalized answer");
  });

  test('should stream sentence-by-sentence chunks for optimal voice TTS latency', async () => {
    await localLLM.loadModel('/dummy/path', mockModelMetadata);

    const stream = orchestrator.streamReasoning('What is my medicine schedule?');
    const sentences: string[] = [];

    for await (const chunk of stream) {
      if (chunk.sentenceComplete && chunk.completedSentence) {
        sentences.push(chunk.completedSentence);
      }
    }

    expect(sentences.length).toBeGreaterThan(0);
  });
});
