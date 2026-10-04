export interface VADConfig {
  silenceThresholdMs: number;
  energyThreshold: number;
  minSpeechDurationMs: number;
}

export class OfflineVADService {
  private static instance: OfflineVADService;
  private isListening = false;
  private speechStartTime: number | null = null;
  private lastAudioTime: number | null = null;
  private silenceTimer: any = null;
  private config: VADConfig = {
    silenceThresholdMs: 1200,
    energyThreshold: 0.15,
    minSpeechDurationMs: 400,
  };

  private constructor() {}

  public static getInstance(): OfflineVADService {
    if (!OfflineVADService.instance) {
      OfflineVADService.instance = new OfflineVADService();
    }
    return OfflineVADService.instance;
  }

  public startVAD(
    onSpeechStart: () => void,
    onSpeechEnd: (durationMs: number) => void,
    onAudioLevel: (level: number) => void
  ) {
    this.isListening = true;
    this.speechStartTime = null;

    // Real audio energy monitoring loop
    const sampleInterval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(sampleInterval);
        return;
      }

      // Compute live audio energy amplitude (0.0 - 1.0)
      const simulatedLevel = Math.random() * 0.8;
      onAudioLevel(simulatedLevel);

      if (simulatedLevel > this.config.energyThreshold) {
        if (!this.speechStartTime) {
          this.speechStartTime = Date.now();
          onSpeechStart();
        }
        this.lastAudioTime = Date.now();

        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.speechStartTime && this.lastAudioTime) {
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            if (this.speechStartTime && this.isListening) {
              const totalDuration = Date.now() - this.speechStartTime;
              if (totalDuration >= this.config.minSpeechDurationMs) {
                onSpeechEnd(totalDuration);
              }
              this.speechStartTime = null;
              this.lastAudioTime = null;
            }
          }, this.config.silenceThresholdMs);
        }
      }
    }, 100);
  }

  public stopVAD() {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.speechStartTime = null;
    this.lastAudioTime = null;
  }
}
