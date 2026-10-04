import { DeviceCompatibility, GGUFModelMetadata } from '../types/model';
import { VoiceResourcePackage } from '../types/voice';

export class ModelRegistry {
  public static readonly DEFAULT_MODELS: GGUFModelMetadata[] = [
    // PROFILE A — PRIMARY MEDICAL REASONING
    {
      modelId: 'medgemma-4b-it-q4',
      displayName: 'MedGemma 4B Instruct (Medical Specialist 2.4GB)',
      provider: 'Google Health / gguf-org',
      repositoryId: 'gguf-org/medgemma-1.5-4b-it-gguf',
      architecture: 'gemma',
      parameters: '4.0B',
      quantization: 'Q4_K_M',
      sizeBytes: 2570000000,
      downloadUrl:
        'https://huggingface.co/gguf-org/medgemma-1.5-4b-it-gguf/resolve/main/medgemma-1.5-4b-it-q4_k_m.gguf',
      localFilename: 'medgemma-1.5-4b-it-q4_k_m.gguf',
      contextLength: 4096,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      compatibility: DeviceCompatibility.Caution,
      systemPromptTemplate:
        '<start_of_turn>user\n[SPECIALIZED MEDICAL KNOWLEDGE ENGINE]: You are CareBond MedGemma, an expert clinical reasoning and medical explanation assistant. Provide empathetic, accurate, patient-friendly explanations based on the provided Case File context and clinical records. Do not prescribe, change dosages, or override attending physician instructions.\n\n{prompt}<end_of_turn>\n<start_of_turn>model\n',
      stopTokens: ['<end_of_turn>', '<start_of_turn>'],
      variants: [
        {
          quantization: 'Q4_K_M',
          filename: 'medgemma-1.5-4b-it-q4_k_m.gguf',
          sizeBytes: 2570000000,
          downloadUrl:
            'https://huggingface.co/gguf-org/medgemma-1.5-4b-it-gguf/resolve/main/medgemma-1.5-4b-it-q4_k_m.gguf',
          isRecommended: true,
        },
        {
          quantization: 'Q8_0',
          filename: 'medgemma-1.5-4b-it-q8_0.gguf',
          sizeBytes: 4480000000,
          downloadUrl:
            'https://huggingface.co/gguf-org/medgemma-1.5-4b-it-gguf/resolve/main/medgemma-1.5-4b-it-q8_0.gguf',
        },
      ],
    },

    // PROFILE B — GENERAL LOCAL CAREBOND COMPANION
    {
      modelId: 'gemma-4-e2b-q4_k_m',
      displayName: 'Gemma 4 E2B Instruct (General Companion 1.4GB)',
      provider: 'Google / ggml-org',
      repositoryId: 'ggml-org/gemma-4-E2B-GGUF',
      architecture: 'gemma',
      parameters: '2.0B',
      quantization: 'Q4_K_M',
      sizeBytes: 1540000000,
      downloadUrl:
        'https://huggingface.co/ggml-org/gemma-4-E2B-GGUF/resolve/main/gemma-4-e2b-q4_k_m.gguf',
      localFilename: 'gemma-4-e2b-q4_k_m.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      compatibility: DeviceCompatibility.Good,
      systemPromptTemplate:
        '<start_of_turn>user\nYou are CareBond AI, a compassionate personal health and recovery companion. Answer clearly and supportively using the patient health context provided.\n\n{prompt}<end_of_turn>\n<start_of_turn>model\n',
      stopTokens: ['<end_of_turn>', '<start_of_turn>'],
      variants: [
        {
          quantization: 'Q4_K_M',
          filename: 'gemma-4-e2b-q4_k_m.gguf',
          sizeBytes: 1540000000,
          downloadUrl:
            'https://huggingface.co/ggml-org/gemma-4-E2B-GGUF/resolve/main/gemma-4-e2b-q4_k_m.gguf',
          isRecommended: true,
        },
        {
          quantization: 'Q4_0',
          filename: 'gemma-4-e2b-q4_0.gguf',
          sizeBytes: 1380000000,
          downloadUrl:
            'https://huggingface.co/ggml-org/gemma-4-E2B-GGUF/resolve/main/gemma-4-e2b-q4_0.gguf',
        },
        {
          quantization: 'Q8_0',
          filename: 'gemma-4-e2b-q8_0.gguf',
          sizeBytes: 2700000000,
          downloadUrl:
            'https://huggingface.co/ggml-org/gemma-4-E2B-GGUF/resolve/main/gemma-4-e2b-q8_0.gguf',
        },
      ],
    },

    // PROFILE C — LIGHTWEIGHT LOW-RAM FALLBACK
    {
      modelId: 'qwen3-0.6b-q4_0',
      displayName: 'Qwen3 0.6B Instruct (Lightweight Fallback 429MB)',
      provider: 'Qwen / ggml-org',
      repositoryId: 'ggml-org/Qwen3-0.6B-GGUF',
      architecture: 'qwen3',
      parameters: '0.6B',
      quantization: 'Q4_0',
      sizeBytes: 429496729,
      downloadUrl:
        'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf',
      localFilename: 'Qwen3-0.6B-Q4_0.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      compatibility: DeviceCompatibility.Good,
      systemPromptTemplate:
        '<|im_start|>system\nYou are CareBond AI (Lightweight Mode), a concise offline health assistant. Give direct, safe medical answers using the provided context.<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n',
      stopTokens: ['<|im_end|>', '<|endoftext|>', '<|im_start|>'],
      variants: [
        {
          quantization: 'Q4_0',
          filename: 'Qwen3-0.6B-Q4_0.gguf',
          sizeBytes: 429496729,
          downloadUrl:
            'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf',
          isRecommended: true,
        },
        {
          quantization: 'Q8_0',
          filename: 'Qwen3-0.6B-Q8_0.gguf',
          sizeBytes: 805306368,
          downloadUrl:
            'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
        },
      ],
    },
    {
      modelId: 'qwen2.5-0.5b-instruct-q4',
      displayName: 'Qwen 2.5 0.5B Instruct (Ultra-Fast 397MB)',
      provider: 'Qwen',
      repositoryId: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
      architecture: 'qwen2',
      parameters: '0.5B',
      quantization: 'Q4_K_M',
      sizeBytes: 397808192,
      downloadUrl:
        'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      localFilename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      compatibility: DeviceCompatibility.Good,
      systemPromptTemplate:
        '<|im_start|>system\nYou are CareBond AI (Lightweight Mode), a concise offline clinical health assistant. Answer accurately based on provided patient health context.<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n',
      stopTokens: ['<|im_end|>', '<|endoftext|>', '<|im_start|>'],
      variants: [
        {
          quantization: 'Q4_K_M',
          filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
          sizeBytes: 397808192,
          downloadUrl:
            'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
          isRecommended: true,
        },
        {
          quantization: 'Q8_0',
          filename: 'qwen2.5-0.5b-instruct-q8_0.gguf',
          sizeBytes: 672000000,
          downloadUrl:
            'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q8_0.gguf',
        },
      ],
    },
    {
      modelId: 'tinyllama-1.1b-chat-q4',
      displayName: 'TinyLlama 1.1B Chat (Compact 669MB)',
      provider: 'TheBloke',
      repositoryId: 'TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF',
      architecture: 'llama',
      parameters: '1.1B',
      quantization: 'Q4_K_M',
      sizeBytes: 669 * 1024 * 1024,
      downloadUrl:
        'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
      localFilename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      compatibility: DeviceCompatibility.Good,
      systemPromptTemplate:
        '<|system|>\nYou are CareBond AI, an offline personal recovery health companion.<|user|>\n{prompt}<|assistant|>\n',
      stopTokens: ['</s>', '<|user|>', '<|system|>'],
    },
  ];

  public static readonly VOICE_PACKAGES: VoiceResourcePackage[] = [
    {
      id: 'vad-silero-offline',
      name: 'Silero Offline VAD Engine',
      type: 'VAD',
      language: 'all',
      sizeBytes: 2 * 1024 * 1024,
      isInstalled: true,
      description: 'Ultra-lightweight offline Voice Activity Detector',
    },
    {
      id: 'stt-en-whisper-tiny',
      name: 'English Offline STT (Whisper Tiny)',
      type: 'STT',
      language: 'en',
      sizeBytes: 75 * 1024 * 1024,
      isInstalled: true,
      description: 'Accurate offline English speech recognition',
    },
  ];

  public static getCatalog(): GGUFModelMetadata[] {
    return [...this.DEFAULT_MODELS];
  }

  public static getVoicePackages(): VoiceResourcePackage[] {
    return [...this.VOICE_PACKAGES];
  }

  public static getById(modelId: string): GGUFModelMetadata | undefined {
    return this.DEFAULT_MODELS.find((m) => m.modelId === modelId);
  }
}
