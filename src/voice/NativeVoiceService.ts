import { VoiceLanguage } from '../types/voice';

let NativeVoice: any = null;
let voiceEmitter: any = null;
let Platform: any = { OS: 'android' };

try {
  const RN = require('react-native');
  NativeVoice = RN.NativeModules?.NativeVoice || null;
  Platform = RN.Platform || { OS: 'android' };
  if (NativeVoice && RN.NativeEventEmitter) {
    voiceEmitter = new RN.NativeEventEmitter(NativeVoice);
  }
} catch (e) {
  // Jest / Node environment
}

export interface VoiceAudioLevelEvent {
  level: number;
  rawRmsDb: number;
}

export interface VoiceTranscriptEvent {
  transcript: string;
  confidence: number;
  alternatives?: string[];
}

export class NativeVoiceService {
  private static instance: NativeVoiceService;

  private constructor() {}

  public static getInstance(): NativeVoiceService {
    if (!NativeVoiceService.instance) {
      NativeVoiceService.instance = new NativeVoiceService();
    }
    return NativeVoiceService.instance;
  }

  public async requestAudioPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeVoice) return true;
    try {
      return await NativeVoice.requestAudioPermission();
    } catch {
      return false;
    }
  }

  public async checkAudioPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeVoice) return true;
    try {
      return await NativeVoice.checkAudioPermission();
    } catch {
      return false;
    }
  }

  public async startListening(
    language: VoiceLanguage = 'en',
    options: Record<string, any> = {}
  ): Promise<any> {
    if (Platform.OS !== 'android' || !NativeVoice) {
      return { started: true, language: 'en-IN' };
    }
    return await NativeVoice.startListening(language, options);
  }

  public async stopListening(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeVoice) return true;
    try {
      return await NativeVoice.stopListening();
    } catch {
      return false;
    }
  }

  public async cancelListening(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeVoice) return true;
    try {
      return await NativeVoice.cancelListening();
    } catch {
      return false;
    }
  }

  public async speak(text: string, language: VoiceLanguage = 'en'): Promise<any> {
    if (Platform.OS !== 'android' || !NativeVoice) {
      return { success: true };
    }
    return await NativeVoice.speak(text, language);
  }

  public async stopSpeaking(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeVoice) return true;
    try {
      return await NativeVoice.stopSpeaking();
    } catch {
      return false;
    }
  }

  public async getTtsInfo(): Promise<any> {
    if (Platform.OS !== 'android' || !NativeVoice) {
      return { isInitialized: true, defaultEngine: 'Mock TTS' };
    }
    try {
      return await NativeVoice.getTtsEngines();
    } catch {
      return { isInitialized: false };
    }
  }

  // ==========================================
  // EVENT SUBSCRIPTIONS
  // ==========================================

  public onAudioLevel(callback: (event: VoiceAudioLevelEvent) => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onAudioLevel', callback);
    return () => sub.remove();
  }

  public onSpeechStart(callback: () => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onSpeechStart', callback);
    return () => sub.remove();
  }

  public onSpeechEnd(callback: () => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onSpeechEnd', callback);
    return () => sub.remove();
  }

  public onPartialTranscript(callback: (event: { partialTranscript: string }) => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onPartialTranscript', callback);
    return () => sub.remove();
  }

  public onFinalTranscript(callback: (event: VoiceTranscriptEvent) => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onFinalTranscript', callback);
    return () => sub.remove();
  }

  public onTtsStart(callback: () => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onTtsStart', callback);
    return () => sub.remove();
  }

  public onTtsDone(callback: () => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onTtsDone', callback);
    return () => sub.remove();
  }

  public onVoiceError(callback: (event: { errorCode: number; errorMessage: string }) => void): () => void {
    if (!voiceEmitter) return () => {};
    const sub = voiceEmitter.addListener('onVoiceError', callback);
    return () => sub.remove();
  }
}
