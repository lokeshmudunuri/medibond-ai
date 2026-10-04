export enum ModelInstallStatus {
  NotInstalled = 'not_installed',
  Downloading = 'downloading',
  Verifying = 'verifying',
  Installed = 'installed',
  Error = 'error',
}

export enum ModelState {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Ready = 'ready',
  Generating = 'generating',
  Unloading = 'unloading',
  Error = 'error',
}

export interface GGUFModelMetadata {
  modelId: string;
  displayName: string;
  architecture: string;
  parameters: string;
  quantization: string; // e.g. 'Q4_K_M', 'Q8_0'
  sizeBytes: number;
  expectedSha256: string;
  downloadUrl: string;
  localFilename: string;
  contextLength: number;
  recommendedGpuLayers: number;
  recommendedThreads: number;
  systemPromptTemplate?: string;
  stopTokens: string[];
}

export interface ModelPackage {
  metadata: GGUFModelMetadata;
  status: ModelInstallStatus;
  downloadProgress: number; // 0.0 to 1.0
  bytesDownloaded: number;
  localPath?: string;
  errorMessage?: string;
  installedAt?: string;
}

export interface InferenceMetrics {
  modelName: string;
  promptTokens: number;
  generatedTokens: number;
  loadTimeMs: number;
  firstTokenLatencyMs: number;
  tokensPerSecond: number;
  totalTimeMs: number;
}
