export enum ModelInstallStatus {
  NotInstalled = 'not_installed',
  Downloading = 'downloading',
  Paused = 'paused',
  Verifying = 'verifying',
  Installing = 'installing',
  Installed = 'installed',
  Error = 'error',
  Corrupted = 'corrupted',
}

export enum ModelState {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Ready = 'ready',
  Generating = 'generating',
  Unloading = 'unloading',
  Error = 'error',
}

export enum DeviceCompatibility {
  Good = 'good',
  Caution = 'caution',
  NotRecommended = 'not_recommended',
  Incompatible = 'incompatible',
}

export interface QuantizationVariant {
  quantization: string;
  filename: string;
  sizeBytes: number;
  downloadUrl: string;
  isRecommended?: boolean;
}

export interface GGUFModelMetadata {
  modelId: string;
  displayName: string;
  provider?: string;
  repositoryId?: string;
  architecture: string;
  parameters: string;
  quantization: string; // e.g. 'Q4_0', 'Q4_K_M', 'Q8_0'
  sizeBytes: number;
  expectedSha256?: string;
  downloadUrl: string;
  localFilename: string;
  contextLength: number;
  recommendedGpuLayers: number;
  recommendedThreads: number;
  systemPromptTemplate?: string;
  stopTokens: string[];
  variants?: QuantizationVariant[];
  compatibility?: DeviceCompatibility;
}

export interface ModelPackage {
  metadata: GGUFModelMetadata;
  status: ModelInstallStatus;
  downloadProgress: number; // 0.0 to 1.0
  bytesDownloaded: number;
  totalBytes: number;
  downloadSpeedBytesPerSec?: number;
  estimatedRemainingSec?: number;
  localPath?: string;
  errorMessage?: string;
  installedAt?: string;
  lastValidatedAt?: string;
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
