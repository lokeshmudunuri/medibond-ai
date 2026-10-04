export type VoiceLanguage = 'en' | 'te' | 'hi' | 'kn';

export enum VoiceState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TRANSCRIBING = 'TRANSCRIBING',
  UNDERSTANDING = 'UNDERSTANDING',
  RETRIEVING_CONTEXT = 'RETRIEVING_CONTEXT',
  VALIDATING = 'VALIDATING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  INTERRUPTED = 'INTERRUPTED',
  ERROR = 'ERROR',
}

export interface VoiceTurn {
  id: string;
  speaker: 'user' | 'assistant';
  transcript: string;
  timestamp: string;
  detectedLanguage?: VoiceLanguage;
  retrievedContextSummary?: string;
  safetyPassed?: boolean;
}

export interface VoiceSession {
  sessionId: string;
  startTime: string;
  language: VoiceLanguage;
  turns: VoiceTurn[];
  state: VoiceState;
  activeCaseId?: string;
}

export interface VoiceRecoveryCheckInPayload {
  painScore?: number;
  sleepHours?: number;
  fatigueScore?: number;
  moodScore?: number;
  tookAllMedications?: boolean;
  reportedSymptoms?: string;
  rawTranscript: string;
}

export interface VoiceDoctorInstructionPayload {
  restriction?: string;
  duration?: string;
  followUpDays?: number;
  guidance?: string;
  rawTranscript: string;
}

export interface VoiceResourcePackage {
  id: string;
  name: string;
  type: 'VAD' | 'STT' | 'TTS';
  language: VoiceLanguage | 'all';
  sizeBytes: number;
  isInstalled: boolean;
  description: string;
}
