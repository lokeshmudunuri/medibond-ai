import { VoiceEngine } from '../src/voice/VoiceEngine';
import { VoiceState } from '../src/types/voice';
import { VoiceExtractionEngine } from '../src/voice/VoiceExtractionEngine';
import { HealthMemoryService } from '../src/services/HealthMemoryService';

describe('VoiceEngine Offline State Machine & Safety Pipeline', () => {
  let voiceEngine: VoiceEngine;
  let extractionEngine: VoiceExtractionEngine;
  let memory: HealthMemoryService;

  beforeEach(() => {
    voiceEngine = VoiceEngine.getInstance();
    extractionEngine = VoiceExtractionEngine.getInstance();
    memory = HealthMemoryService.getInstance();
    memory.clearAllData();
    voiceEngine.startNewSession();
  });

  afterEach(() => {
    voiceEngine.stop();
  });

  test('should initialize in IDLE state', () => {
    expect(voiceEngine.getState()).toBe(VoiceState.IDLE);
    expect(voiceEngine.getConversationHistory().length).toBe(0);
  });

  test('should transition to LISTENING when startListening is called', () => {
    voiceEngine.startListening();
    expect(voiceEngine.getState()).toBe(VoiceState.LISTENING);
  });

  test('should support multi-language switching for 4 required languages (en, te, hi, kn)', () => {
    voiceEngine.setLanguage('te');
    expect(voiceEngine.getLanguage()).toBe('te');

    voiceEngine.setLanguage('hi');
    expect(voiceEngine.getLanguage()).toBe('hi');

    voiceEngine.setLanguage('kn');
    expect(voiceEngine.getLanguage()).toBe('kn');

    voiceEngine.setLanguage('en');
    expect(voiceEngine.getLanguage()).toBe('en');
  });

  test('should extract structured recovery check-in from natural English, Telugu, and Hindi speech', () => {
    // English
    const enResult = extractionEngine.extractRecoveryCheckIn('I slept four hours and my pain is seven today', 'en');
    expect(enResult).not.toBeNull();
    expect(enResult?.painScore).toBe(7);
    expect(enResult?.sleepHours).toBe(4);
    expect(enResult?.tookAllMedications).toBe(true);

    // Telugu
    const teResult = extractionEngine.extractRecoveryCheckIn('నాకు నొప్పి ఏడు ఉంది మరియు నిన్నటి కంటే ఎక్కువ', 'te');
    expect(teResult).not.toBeNull();
    expect(teResult?.painScore).toBe(7);

    // Hindi
    const hiResult = extractionEngine.extractRecoveryCheckIn('आज दर्द सात है और मैं चार घंटे सोया', 'hi');
    expect(hiResult).not.toBeNull();
    expect(hiResult?.painScore).toBe(7);
    expect(hiResult?.sleepHours).toBe(4);
  });

  test('should extract doctor verbal instructions from consultation speech', () => {
    const docSpeech = 'Do not put weight on the leg for two weeks and return after 10 days.';
    const instruction = extractionEngine.extractDoctorInstruction(docSpeech, 'en');

    expect(instruction).not.toBeNull();
    expect(instruction?.restriction).toContain('No Weight-Bearing');
    expect(instruction?.duration).toContain('2 weeks');
    expect(instruction?.followUpDays).toBe(10);
  });

  test('should handle out-of-scope prompt by refusing non-medical queries', async () => {
    const nonMedicalPrompt = 'write python code for a web server';
    await voiceEngine.handleSpeechInput(nonMedicalPrompt);

    const history = voiceEngine.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].transcript).toBe(nonMedicalPrompt);
    expect(history[1].speaker).toBe('assistant');
    expect(history[1].transcript).toContain('CareBond AI');
  });

  test('should evaluate emergency chest pain and escalate with safety advice', async () => {
    const emergencyPrompt = 'I have crushing chest pain radiating to my left arm';
    await voiceEngine.handleSpeechInput(emergencyPrompt);

    const history = voiceEngine.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[1].transcript.toLowerCase()).toContain('emergency');
    expect(history[1].safetyPassed).toBe(false);
  });

  test('should support immediate interruption during speech', () => {
    voiceEngine.startListening();
    voiceEngine.interrupt();
    expect(voiceEngine.getState()).toBe(VoiceState.INTERRUPTED);
  });

  test('should cleanly stop and return to IDLE', () => {
    voiceEngine.startListening();
    voiceEngine.stop();
    expect(voiceEngine.getState()).toBe(VoiceState.IDLE);
  });
});
