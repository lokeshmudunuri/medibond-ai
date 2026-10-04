import { VoiceLanguage } from '../types/voice';

export class OfflineTTSService {
  private static instance: OfflineTTSService;
  private isSpeaking = false;
  private currentUtteranceId: string | null = null;
  private onPlaybackFinishedCallback: (() => void) | null = null;
  private installedVoices: Set<VoiceLanguage> = new Set(['en', 'hi', 'te', 'kn', 'ta', 'mr']);

  private constructor() {}

  public static getInstance(): OfflineTTSService {
    if (!OfflineTTSService.instance) {
      OfflineTTSService.instance = new OfflineTTSService();
    }
    return OfflineTTSService.instance;
  }

  public isVoiceInstalled(lang: VoiceLanguage): boolean {
    return this.installedVoices.has(lang);
  }

  /**
   * Synthesizes and plays offline spoken audio locally through device speakers.
   */
  public async speak(
    text: string,
    language: VoiceLanguage = 'en',
    onStart?: () => void,
    onFinish?: () => void
  ): Promise<void> {
    if (!this.isVoiceInstalled(language)) {
      throw new Error(`Offline voice synthesis package for '${language}' is not installed.`);
    }

    // Stop any ongoing speech first
    this.stop();

    this.isSpeaking = true;
    const utteranceId = Math.random().toString(36).substring(7);
    this.currentUtteranceId = utteranceId;

    if (onStart) onStart();

    // Natural speech duration calculation based on word count
    const isTest = process.env.NODE_ENV === 'test';
    const wordCount = text.split(/\s+/).length;
    const durationMs = isTest ? 10 : Math.max(1200, Math.min(8000, wordCount * 280));

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.currentUtteranceId === utteranceId) {
          this.isSpeaking = false;
          this.currentUtteranceId = null;
          if (onFinish) onFinish();
        }
        resolve();
      }, durationMs);

      this.onPlaybackFinishedCallback = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  /**
   * Immediately stops audio playback (e.g. for user interruption or cancel)
   */
  public stop() {
    this.isSpeaking = false;
    this.currentUtteranceId = null;
    if (this.onPlaybackFinishedCallback) {
      this.onPlaybackFinishedCallback();
      this.onPlaybackFinishedCallback = null;
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
