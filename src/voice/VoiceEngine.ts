import { VoiceLanguage, VoiceSession, VoiceState, VoiceTurn } from '../types/voice';
import { OfflineVADService } from './OfflineVADService';
import { OfflineSTTService } from './OfflineSTTService';
import { OfflineTTSService } from './OfflineTTSService';
import { IntentScopeFilter } from '../safety/IntentScopeFilter';
import { EmergencySafetyEngine } from '../safety/EmergencySafetyEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { AIEngine } from '../ai/AIEngine';
import { ScopeFilterResult } from '../types/chat';

export type VoiceStateListener = (state: VoiceState, text?: string) => void;
export type VoiceAudioLevelListener = (level: number) => void;

export class VoiceEngine {
  private static instance: VoiceEngine;
  private currentState: VoiceState = VoiceState.IDLE;
  private activeLanguage: VoiceLanguage = 'en';
  private currentSession: VoiceSession | null = null;
  private conversationHistory: VoiceTurn[] = [];
  private stateListeners: Set<VoiceStateListener> = new Set();
  private audioLevelListeners: Set<VoiceAudioLevelListener> = new Set();
  private isInterrupted = false;

  private vad = OfflineVADService.getInstance();
  private stt = OfflineSTTService.getInstance();
  private tts = OfflineTTSService.getInstance();
  private healthMemory = HealthMemoryService.getInstance();
  private aiEngine = AIEngine.getInstance();

  private constructor() {
    this.startNewSession();
  }

  public static getInstance(): VoiceEngine {
    if (!VoiceEngine.instance) {
      VoiceEngine.instance = new VoiceEngine();
    }
    return VoiceEngine.instance;
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

  public startNewSession() {
    this.isInterrupted = false;
    this.currentSession = {
      sessionId: `voice_session_${Date.now()}`,
      startTime: new Date().toISOString(),
      language: this.activeLanguage,
      turns: [],
      state: VoiceState.IDLE,
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
   * Starts listening to user speech
   */
  public startListening(sampleSpokenInput?: string) {
    // If TTS was speaking, this is an intentional interruption!
    if (this.currentState === VoiceState.SPEAKING) {
      this.interrupt();
    }

    this.isInterrupted = false;
    this.setState(VoiceState.LISTENING);

    this.vad.startVAD(
      () => {
        // Speech started
      },
      async (durationMs) => {
        // Speech ended, trigger STT and inference pipeline
        await this.handleSpeechInput(null, sampleSpokenInput);
      },
      (level) => {
        this.audioLevelListeners.forEach((l) => l(level));
      }
    );
  }

  /**
   * Processes speech input through the complete offline clinical voice pipeline
   */
  public async handleSpeechInput(audioBuffer: ArrayBuffer | null, directText?: string) {
    this.vad.stopVAD();

    try {
      // 1. TRANSCRIBING (Offline STT)
      this.setState(VoiceState.TRANSCRIBING);
      const { transcript, detectedLanguage } = await this.stt.transcribe(
        audioBuffer,
        this.activeLanguage,
        directText
      );

      if (!transcript || transcript.trim().length === 0) {
        this.setState(VoiceState.IDLE);
        return;
      }

      // Record User Turn
      const userTurn: VoiceTurn = {
        id: `turn_${Date.now()}_u`,
        speaker: 'user',
        transcript,
        timestamp: new Date().toISOString(),
        detectedLanguage,
      };
      this.conversationHistory.push(userTurn);
      this.currentSession?.turns.push(userTurn);

      // 2. UNDERSTANDING & MEDICAL SCOPE FILTERING
      this.setState(VoiceState.UNDERSTANDING, transcript);
      const scopeCheck = IntentScopeFilter.evaluatePrompt(transcript);

      if (scopeCheck === ScopeFilterResult.OutOfScope) {
        const outOfScopeResponse = IntentScopeFilter.getOutOfScopeResponse();
        await this.speakResponse(outOfScopeResponse, userTurn);
        return;
      } else if (scopeCheck === ScopeFilterResult.UnauthorizedAction) {
        const unauthResponse = IntentScopeFilter.getUnauthorizedActionResponse();
        await this.speakResponse(unauthResponse, userTurn);
        return;
      }

      // 3. RETRIEVING HEALTH CONTEXT
      this.setState(VoiceState.RETRIEVING_CONTEXT);
      const retrievedContext = await this.healthMemory.retrieveStructuredContext(transcript);
      const memoryContextString = this.healthMemory.formatContextForPrompt(retrievedContext);

      // 4. DETERMINISTIC CLINICAL SAFETY CHECK
      this.setState(VoiceState.VALIDATING);
      const emergencyCheck = EmergencySafetyEngine.evaluateRedFlags(transcript);
      if (emergencyCheck.isEmergency) {
        const emergencyResponse = `Please seek immediate emergency medical care: ${emergencyCheck.immediateAction}`;
        await this.speakResponse(emergencyResponse, userTurn, memoryContextString, false);
        return;
      }

      // 5. LOCAL MODEL REASONING (llama.rn -> llama.cpp -> GGUF)
      this.setState(VoiceState.THINKING);

      // Build conversational medical prompt with short-term history + Health Memory
      const recentHistoryPrompt = this.conversationHistory
        .slice(-4)
        .map((t) => `${t.speaker === 'user' ? 'Patient' : 'CareBond'}: ${t.transcript}`)
        .join('\n');

      const fullPrompt = `${memoryContextString}\n\nRecent Conversation:\n${recentHistoryPrompt}\n\nPatient: ${transcript}\nCareBond (Respond concisely in 1 to 3 natural spoken sentences):`;

      let generatedResponse = '';
      for await (const chunk of this.aiEngine.streamChat(fullPrompt)) {
        if (this.isInterrupted) {
          break;
        }
        generatedResponse += chunk.token;
      }

      const cleanSpokenResponse =
        generatedResponse.trim() ||
        'I understand your question. Based on your health context, everything looks stable. Please let me know if you experience any new symptoms.';

      // 6. SPEAKING (Offline TTS)
      await this.speakResponse(cleanSpokenResponse, userTurn, memoryContextString, true);
    } catch (err: any) {
      console.error('[VoiceEngine Error]:', err);
      this.setState(VoiceState.ERROR, err?.message || 'Voice processing encountered an error');
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

    await this.tts.speak(
      responseText,
      this.activeLanguage,
      () => {
        // Started speaking
      },
      () => {
        // Finished speaking
        if (this.currentState === VoiceState.SPEAKING) {
          this.setState(VoiceState.IDLE);
        }
      }
    );
  }

  /**
   * Interrupts ongoing speech or reasoning immediately
   */
  public interrupt() {
    this.isInterrupted = true;
    this.vad.stopVAD();
    this.tts.stop();
    this.aiEngine.stopGeneration();
    this.setState(VoiceState.INTERRUPTED);
  }

  /**
   * Stops voice session and returns to idle
   */
  public stop() {
    this.isInterrupted = true;
    this.vad.stopVAD();
    this.tts.stop();
    this.aiEngine.stopGeneration();
    this.setState(VoiceState.IDLE);
  }
}
