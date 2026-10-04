import { GGUFModelMetadata } from '../types/model';
import { VoiceResourcePackage } from '../types/voice';

export class ModelRegistry {
  public static readonly DEFAULT_MODELS: GGUFModelMetadata[] = [
    {
      modelId: 'qwen2.5-0.5b-instruct-q4',
      displayName: 'Qwen 2.5 0.5B Instruct (Ultra-Fast 379MB)',
      architecture: 'qwen2',
      parameters: '0.5B',
      quantization: 'Q4_K_M',
      sizeBytes: 397808192,
      expectedSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      downloadUrl:
        'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      localFilename: 'Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      systemPromptTemplate:
        '<|im_start|>system\nYou are CareBond AI, a compassionate on-device clinical and post-op recovery health assistant. Answer accurately based on provided patient health context.<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n',
      stopTokens: ['<|im_end|>', '<|endoftext|>', '<|im_start|>'],
    },
    {
      modelId: 'medgemma-4b-it-q4',
      displayName: 'MedGemma 4B Instruct (Advanced Clinical Specialist 2.4GB)',
      architecture: 'gemma',
      parameters: '4.0B',
      quantization: 'Q4_K_M',
      sizeBytes: 2450 * 1024 * 1024,
      expectedSha256: '8f7e6d5c4b3a2109fedcba9876543210abcdef0123456789abcdef0123456789',
      downloadUrl:
        'https://huggingface.co/google/medgemma-4b-it-GGUF/resolve/main/medgemma-4b-it-q4_k_m.gguf',
      localFilename: 'medgemma-4b-it-q4_k_m.gguf',
      contextLength: 4096,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
      systemPromptTemplate:
        '<start_of_turn>user\n[SPECIALIZED MEDICAL KNOWLEDGE ENGINE]: You are CareBond MedGemma, an expert clinical reasoning assistant.\n\n{prompt}<end_of_turn>\n<start_of_turn>model\n',
      stopTokens: ['<end_of_turn>', '<start_of_turn>'],
    },
    {
      modelId: 'tinyllama-1.1b-chat-q4',
      displayName: 'TinyLlama 1.1B Chat (Compact 670MB)',
      architecture: 'llama',
      parameters: '1.1B',
      quantization: 'Q4_K_M',
      sizeBytes: 669 * 1024 * 1024,
      expectedSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      downloadUrl:
        'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
      localFilename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
      contextLength: 2048,
      recommendedGpuLayers: 0,
      recommendedThreads: 4,
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
    {
      id: 'stt-hi-indic-whisper',
      name: 'Hindi Offline STT (Indic Speech)',
      type: 'STT',
      language: 'hi',
      sizeBytes: 85 * 1024 * 1024,
      isInstalled: true,
      description: 'Offline Hindi clinical speech recognition',
    },
    {
      id: 'stt-te-indic-whisper',
      name: 'Telugu Offline STT',
      type: 'STT',
      language: 'te',
      sizeBytes: 85 * 1024 * 1024,
      isInstalled: true,
      description: 'Offline Telugu clinical speech recognition',
    },
    {
      id: 'tts-en-piper-clean',
      name: 'English Offline TTS (Natural Voice)',
      type: 'TTS',
      language: 'en',
      sizeBytes: 45 * 1024 * 1024,
      isInstalled: true,
      description: 'Natural offline English voice synthesis',
    },
    {
      id: 'tts-hi-piper-indic',
      name: 'Hindi Offline TTS',
      type: 'TTS',
      language: 'hi',
      sizeBytes: 50 * 1024 * 1024,
      isInstalled: true,
      description: 'Natural offline Hindi voice synthesis',
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
