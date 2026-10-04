import { GGUFModelMetadata, InferenceMetrics, ModelState } from '../types/model';

// Interface representing the LlamaContext from llama.rn
export interface LlamaContextInterface {
  completion(
    params: {
      prompt: string;
      n_predict?: number;
      temperature?: number;
      top_p?: number;
      top_k?: number;
      stop?: string[];
      emit_partial_completion?: boolean;
    },
    callback?: (data: { token: string }) => void
  ): Promise<{
    text: string;
    timings?: {
      predicted_per_second?: number;
      predicted_ms?: number;
      prompt_per_second?: number;
      prompt_ms?: number;
      predicted_n?: number;
      prompt_n?: number;
    };
  }>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
}

export type InitLlamaFn = (options: {
  model: string;
  n_ctx?: number;
  n_threads?: number;
  n_gpu_layers?: number;
  use_mlock?: boolean;
  use_mmap?: boolean;
}) => Promise<LlamaContextInterface>;

export class LocalLLMEngine {
  private static instance: LocalLLMEngine;
  private context: LlamaContextInterface | null = null;
  private activeMetadata: GGUFModelMetadata | null = null;
  private state: ModelState = ModelState.Unloaded;
  private isGenerating = false;
  private customInitLlama: InitLlamaFn | null = null;

  private constructor() {}

  public static getInstance(): LocalLLMEngine {
    if (!LocalLLMEngine.instance) {
      LocalLLMEngine.instance = new LocalLLMEngine();
    }
    return LocalLLMEngine.instance;
  }

  /**
   * Set custom initLlama implementation (used for dependency injection / native loader / testing)
   */
  public setInitLlama(fn: InitLlamaFn) {
    this.customInitLlama = fn;
  }

  public getState(): ModelState {
    return this.state;
  }

  public getActiveModel(): GGUFModelMetadata | null {
    return this.activeMetadata;
  }

  /**
   * Loads a local GGUF model via llama.rn initLlama()
   */
  public async loadModel(
    modelPath: string,
    metadata: GGUFModelMetadata,
    options?: { n_ctx?: number; n_threads?: number; n_gpu_layers?: number }
  ): Promise<boolean> {
    try {
      if (this.context) {
        await this.unloadModel();
      }

      this.state = ModelState.Loading;
      const ctxLength = options?.n_ctx ?? metadata.contextLength ?? 2048;
      const threads = options?.n_threads ?? metadata.recommendedThreads ?? 4;
      const gpuLayers = options?.n_gpu_layers ?? metadata.recommendedGpuLayers ?? 0;

      let initFn: InitLlamaFn;
      if (this.customInitLlama) {
        initFn = this.customInitLlama;
      } else {
        // Dynamically resolve llama.rn native binding
        try {
          const llamaRN = require('llama.rn');
          initFn = llamaRN.initLlama;
        } catch (nativeErr) {
          throw new Error(`llama.rn native module not available: ${nativeErr}`);
        }
      }

      this.context = await initFn({
        model: modelPath,
        n_ctx: ctxLength,
        n_threads: threads,
        n_gpu_layers: gpuLayers,
        use_mmap: true,
        use_mlock: false,
      });

      this.activeMetadata = metadata;
      this.state = ModelState.Ready;
      return true;
    } catch (err) {
      this.state = ModelState.Error;
      this.activeMetadata = null;
      this.context = null;
      throw err;
    }
  }

  /**
   * Real streaming inference yielding tokens to caller in real-time
   */
  public async *generateStream(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      stopTokens?: string[];
    }
  ): AsyncGenerator<string, InferenceMetrics, void> {
    if (!this.context || this.state !== ModelState.Ready) {
      throw new Error(`Cannot generate: Model is not in Ready state (current: ${this.state})`);
    }

    this.state = ModelState.Generating;
    this.isGenerating = true;

    const stopTokens = options?.stopTokens ?? this.activeMetadata?.stopTokens ?? ['</s>', '<|im_end|>', '<end_of_turn>'];
    const maxTokens = options?.maxTokens ?? 512;
    const temperature = options?.temperature ?? 0.7;
    const topP = options?.topP ?? 0.9;

    const startTime = Date.now();
    let firstTokenTime = 0;
    let generatedCount = 0;

    // Token channel queue for async generator streaming
    const tokenQueue: string[] = [];
    let resolveTokenAvailable: (() => void) | null = null;
    let isCompleted = false;
    let completionError: Error | null = null;
    let finalTimings: any = null;

    const onToken = (data: { token: string }) => {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }
      generatedCount++;
      tokenQueue.push(data.token);
      if (resolveTokenAvailable) {
        resolveTokenAvailable();
        resolveTokenAvailable = null;
      }
    };

    // Trigger async completion on llama.rn context
    const completionPromise = this.context
      .completion(
        {
          prompt,
          n_predict: maxTokens,
          temperature,
          top_p: topP,
          stop: stopTokens,
          emit_partial_completion: true,
        },
        onToken
      )
      .then(res => {
        finalTimings = res.timings;
        isCompleted = true;
        if (resolveTokenAvailable) {
          resolveTokenAvailable();
          resolveTokenAvailable = null;
        }
      })
      .catch(err => {
        completionError = err;
        isCompleted = true;
        if (resolveTokenAvailable) {
          resolveTokenAvailable();
          resolveTokenAvailable = null;
        }
      });

    try {
      while (!isCompleted || tokenQueue.length > 0) {
        if (tokenQueue.length > 0) {
          const token = tokenQueue.shift()!;
          yield token;
        } else if (!isCompleted) {
          await new Promise<void>(resolve => {
            resolveTokenAvailable = resolve;
          });
        }
      }

      await completionPromise;

      if (completionError) {
        throw completionError;
      }

      const totalTimeMs = Date.now() - startTime;
      const firstTokenLatencyMs = firstTokenTime > 0 ? firstTokenTime - startTime : totalTimeMs;
      const tokensPerSecond =
        finalTimings?.predicted_per_second ??
        (generatedCount > 0 && totalTimeMs > 0 ? generatedCount / (totalTimeMs / 1000) : 0);

      this.state = ModelState.Ready;
      this.isGenerating = false;

      return {
        modelName: this.activeMetadata?.displayName ?? 'Local GGUF',
        promptTokens: finalTimings?.prompt_n ?? prompt.split(/\s+/).length,
        generatedTokens: generatedCount,
        loadTimeMs: 0,
        firstTokenLatencyMs,
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
        totalTimeMs,
      };
    } finally {
      this.isGenerating = false;
      if (this.state === ModelState.Generating) {
        this.state = ModelState.Ready;
      }
    }
  }

  /**
   * Real interruption stopping native llama.cpp execution
   */
  public async stopGeneration(): Promise<void> {
    if (this.context && this.isGenerating) {
      try {
        await this.context.stopCompletion();
      } catch (e) {
        console.warn('Error during stopCompletion:', e);
      }
      this.isGenerating = false;
      this.state = ModelState.Ready;
    }
  }

  /**
   * Release native resources and free model memory
   */
  public async unloadModel(): Promise<void> {
    if (this.context) {
      this.state = ModelState.Unloading;
      try {
        await this.stopGeneration();
        await this.context.release();
      } catch (e) {
        console.warn('Error during context release:', e);
      }
      this.context = null;
      this.activeMetadata = null;
      this.state = ModelState.Unloaded;
    }
  }
}
