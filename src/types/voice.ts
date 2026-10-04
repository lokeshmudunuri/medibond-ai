export enum VoiceState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TRANSCRIBING = 'TRANSCRIBING',
  UNDERSTANDING = 'UNDERSTANDING',
  RETRIEVING_CONTEXT = 'RETRIEVING_CONTEXT',
  THINKING = 'THINKING',
  VALIDATING = 'VALIDATING',
  SPEAKING = 'SPEAKING',
  INTERRUPTED = 'INTERRUPTED',
  ERROR = 'ERROR',
}

export type VoiceLanguage = 'en' | 'hi' | 'te' | 'kn' | 'ta' | 'mr';

export interface VoiceLanguageMeta {
  code: VoiceLanguage;
  name: string;
  nativeName: string;
  sttInstalled: boolean;
  ttsInstalled: boolean;
}

export interface VoiceTurn {
  id: string;
  speaker: 'user' | 'assistant';
  transcript: string;
  timestamp: string;
  durationMs?: number;
  detectedLanguage?: VoiceLanguage;
  retrievedContextSummary?: string;
  safetyPassed?: boolean;
}

export interface VoiceSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  language: VoiceLanguage;
  turns: VoiceTurn[];
  state: VoiceState;
}

export interface VoiceMetrics {
  sttLatencyMs: number;
  contextRetrievalMs: number;
  llmFirstTokenMs: number;
  llmTotalGenerationMs: number;
  ttsStartupMs: number;
  totalTurnMs: number;
}

export interface VoiceResourcePackage {
  id: string;
  name: string;
  type: 'VAD' | 'STT' | 'TTS';
  language: VoiceLanguage | 'all';
  sizeBytes: number;
  isInstalled: boolean;
  localPath?: string;
  description: string;
}
