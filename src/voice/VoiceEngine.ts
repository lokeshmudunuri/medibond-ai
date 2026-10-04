import {
  VoiceDoctorInstructionPayload,
  VoiceLanguage,
  VoiceRecoveryCheckInPayload,
  VoiceSession,
  VoiceState,
  VoiceTurn,
} from '../types/voice';
import { NativeVoiceService } from './NativeVoiceService';
import { VoiceExtractionEngine } from './VoiceExtractionEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { AIOrchestrator } from '../ai/AIOrchestrator';

export type VoiceStateListener = (state: VoiceState, text?: string) => void;
export type VoiceAudioLevelListener = (level: number) => void;
export type VoiceExtractionListener = (
  type: 'checkin' | 'doctor_instruction',
  payload: VoiceRecoveryCheckInPayload | VoiceDoctorInstructionPayload
) => void;

export class VoiceEngine {
  private static instance: VoiceEngine;
  private currentState: VoiceState = VoiceState.IDLE;
  private activeLanguage: VoiceLanguage = 'en';
  private activeCaseId?: string;
  private currentSession: VoiceSession | null = null;
  private conversationHistory: VoiceTurn[] = [];
  private stateListeners: Set<VoiceStateListener> = new Set();
  private audioLevelListeners: Set<VoiceAudioLevelListener> = new Set();
  private extractionListeners: Set<VoiceExtractionListener> = new Set();
  private isInterrupted = false;

  private nativeVoice = NativeVoiceService.getInstance();
  private extractionEngine = VoiceExtractionEngine.getInstance();
  private healthMemory = HealthMemoryService.getInstance();
  private aiOrchestrator = AIOrchestrator.getInstance();

  private unsubscribeEvents: (() => void)[] = [];

  private constructor() {
    this.startNewSession();
    this.bindNativeEvents();
  }

  public static getInstance(): VoiceEngine {
    if (!VoiceEngine.instance) {
      VoiceEngine.instance = new VoiceEngine();
    }
    return VoiceEngine.instance;
  }

  private bindNativeEvents() {
    // Clear previous
    this.unsubscribeEvents.forEach((u) => u());
    this.unsubscribeEvents = [];

    // 1. Live RMS Audio Level (Waveform & VAD)
    const unsubLevel = this.nativeVoice.onAudioLevel((event) => {
      this.audioLevelListeners.forEach((l) => l(event.level));
    });

    // 2. Speech Recognition Events
    const unsubSpeechStart = this.nativeVoice.onSpeechStart(() => {
      this.setState(VoiceState.LISTENING);
    });

    const unsubSpeechEnd = this.nativeVoice.onSpeechEnd(() => {
      if (this.currentState === VoiceState.LISTENING) {
        this.setState(VoiceState.TRANSCRIBING);
      }
    });

    const unsubFinal = this.nativeVoice.onFinalTranscript(async (event) => {
      if (event.transcript && event.transcript.trim().length > 0) {
        await this.handleSpeechInput(event.transcript.trim());
      } else {
        this.setState(VoiceState.IDLE);
      }
    });

    const unsubPartial = this.nativeVoice.onPartialTranscript((event) => {
      if (event.partialTranscript) {
        this.setState(VoiceState.LISTENING, event.partialTranscript);
      }
    });

    const unsubTtsDone = this.nativeVoice.onTtsDone(() => {
      if (this.currentState === VoiceState.SPEAKING) {
        this.setState(VoiceState.IDLE);
      }
    });

    const unsubError = this.nativeVoice.onVoiceError((err) => {
      console.warn('[VoiceEngine] Native Voice Error:', err);
      if (this.currentState === VoiceState.LISTENING || this.currentState === VoiceState.TRANSCRIBING) {
        this.setState(VoiceState.IDLE);
      }
    });

    this.unsubscribeEvents.push(
      unsubLevel,
      unsubSpeechStart,
      unsubSpeechEnd,
      unsubFinal,
      unsubPartial,
      unsubTtsDone,
      unsubError
    );
  }

  public subscribeState(listener: VoiceStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.currentState);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeAudioLevel(listener: VoiceAudioLevelListener): () => void {
    this.audioLevelListeners.add(listener);
    return () => this.audioLevelListeners.delete(listener);
  }

  public subscribeExtraction(listener: VoiceExtractionListener): () => void {
    this.extractionListeners.add(listener);
    return () => this.extractionListeners.delete(listener);
  }

  private setState(newState: VoiceState, messageText?: string) {
    this.currentState = newState;
    if (this.currentSession) {
      this.currentSession.state = newState;
    }
    this.stateListeners.forEach((l) => l(newState, messageText));
  }

  public getState(): VoiceState {
    return this.currentState;
  }

  public setLanguage(lang: VoiceLanguage) {
    this.activeLanguage = lang;
    if (this.currentSession) {
      this.currentSession.language = lang;
    }
  }

  public getLanguage(): VoiceLanguage {
    return this.activeLanguage;
  }

  public setActiveCaseId(caseId?: string) {
    this.activeCaseId = caseId;
    if (this.currentSession) {
      this.currentSession.activeCaseId = caseId;
    }
  }

  public getActiveCaseId(): string | undefined {
    return this.activeCaseId;
  }

  public startNewSession() {
    this.isInterrupted = false;
    this.currentSession = {
      sessionId: `voice_session_${Date.now()}`,
      startTime: new Date().toISOString(),
      language: this.activeLanguage,
      turns: [],
      state: VoiceState.IDLE,
      activeCaseId: this.activeCaseId,
    };
    this.conversationHistory = [];
    this.setState(VoiceState.IDLE);
  }

  public getSession(): VoiceSession | null {
    return this.currentSession;
  }

  public getConversationHistory(): VoiceTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Starts listening to user speech via native microphone
   */
  public async startListening(sampleSpokenInput?: string) {
    if (this.currentState === VoiceState.SPEAKING) {
      this.interrupt();
    }

    this.isInterrupted = false;
    this.setState(VoiceState.LISTENING);

    if (sampleSpokenInput) {
      // Mock / automated test injection path
      setTimeout(async () => {
        await this.handleSpeechInput(sampleSpokenInput);
      }, 100);
      return;
    }

    try {
      await this.nativeVoice.requestAudioPermission();
      await this.nativeVoice.startListening(this.activeLanguage);
    } catch (err: any) {
      console.error('[VoiceEngine] Failed to start native listener:', err);
      this.setState(VoiceState.ERROR, err?.message || 'Failed to start microphone');
    }
  }

  /**
   * Processes speech input through unified clinical AI Orchestrator and offline TTS
   */
  public async handleSpeechInput(transcript: string) {
    if (!transcript || transcript.trim().length === 0) {
      this.setState(VoiceState.IDLE);
      return;
    }

    this.isInterrupted = false;
    this.nativeVoice.stopListening();

    try {
      // 1. Record User Turn in Shared History
      const userTurn: VoiceTurn = {
        id: `turn_${Date.now()}_u`,
        speaker: 'user',
        transcript,
        timestamp: new Date().toISOString(),
        detectedLanguage: this.activeLanguage,
      };
      this.conversationHistory.push(userTurn);
      this.currentSession?.turns.push(userTurn);

      // 2. Extract Structured Voice Intent (Check-in / Doctor Instruction)
      const checkInPayload = this.extractionEngine.extractRecoveryCheckIn(transcript, this.activeLanguage);
      if (checkInPayload) {
        this.extractionListeners.forEach((l) => l('checkin', checkInPayload));
      }

      const doctorPayload = this.extractionEngine.extractDoctorInstruction(transcript, this.activeLanguage);
      if (doctorPayload) {
        this.extractionListeners.forEach((l) => l('doctor_instruction', doctorPayload));
      }

      this.setState(VoiceState.UNDERSTANDING, transcript);

      // 3. UNIFIED AI ORCHESTRATOR REASONING
      this.setState(VoiceState.THINKING);

      let fullGeneratedResponse = '';
      let isEmergency = false;
      const stream = this.aiOrchestrator.streamReasoning(transcript, this.activeCaseId, {
        language: this.activeLanguage,
        maxTokens: 256,
      });

      for await (const chunk of stream) {
        if (this.isInterrupted) {
          break;
        }

        fullGeneratedResponse += chunk.token;
        if (chunk.isEmergencyAlert) {
          isEmergency = true;
          this.setState(VoiceState.VALIDATING, 'Emergency Red Flag Detected');
        }
      }

      if (this.isInterrupted) {
        this.setState(VoiceState.IDLE);
        return;
      }

      const cleanSpokenResponse =
        fullGeneratedResponse.trim() ||
        'I have recorded your update. Based on your health context, your metrics are stable.';

      // 4. SPEAK RESPONSE (Offline Native TTS)
      await this.speakResponse(cleanSpokenResponse, userTurn, undefined, !isEmergency);
    } catch (err: any) {
      console.error('[VoiceEngine Error]:', err);
      this.setState(VoiceState.ERROR, err?.message || 'Voice processing error');
    }
  }

  private async speakResponse(
    responseText: string,
    userTurn: VoiceTurn,
    contextSummary?: string,
    safetyPassed: boolean = true
  ) {
    if (this.isInterrupted) {
      this.setState(VoiceState.IDLE);
      return;
    }

    const assistantTurn: VoiceTurn = {
      id: `turn_${Date.now()}_a`,
      speaker: 'assistant',
      transcript: responseText,
      timestamp: new Date().toISOString(),
      retrievedContextSummary: contextSummary,
      safetyPassed,
    };
    this.conversationHistory.push(assistantTurn);
    this.currentSession?.turns.push(assistantTurn);

    this.setState(VoiceState.SPEAKING, responseText);

    try {
      await this.nativeVoice.speak(responseText, this.activeLanguage);
    } catch (err) {
      console.warn('[VoiceEngine] TTS speak fallback:', err);
      this.setState(VoiceState.IDLE);
    }
  }

  /**
   * Interrupts ongoing speech recognition, reasoning, or TTS immediately
   */
  public interrupt() {
    this.isInterrupted = true;
    this.nativeVoice.stopListening();
    this.nativeVoice.stopSpeaking();
    this.aiOrchestrator.stopGeneration();
    this.setState(VoiceState.INTERRUPTED);
  }

  /**
   * Stops voice session cleanly
   */
  public stop() {
    this.isInterrupted = true;
    this.nativeVoice.stopListening();
    this.nativeVoice.stopSpeaking();
    this.aiOrchestrator.stopGeneration();
    this.setState(VoiceState.IDLE);
  }
}
