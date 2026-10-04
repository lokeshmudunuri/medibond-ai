import { VoiceEngine } from '../src/voice/VoiceEngine';
import { VoiceState } from '../src/types/voice';

describe('VoiceEngine Offline State Machine & Safety Pipeline', () => {
  let voiceEngine: VoiceEngine;

  beforeEach(() => {
    voiceEngine = VoiceEngine.getInstance();
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

  test('should handle out-of-scope prompt by refusing non-medical queries', async () => {
    const nonMedicalPrompt = 'write python code for a web server';
    await voiceEngine.handleSpeechInput(null, nonMedicalPrompt);

    const history = voiceEngine.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].transcript).toBe(nonMedicalPrompt);
    expect(history[1].speaker).toBe('assistant');
    expect(history[1].transcript).toContain('CareBond AI');
  });

  test('should evaluate emergency chest pain and escalate with safety advice', async () => {
    const emergencyPrompt = 'I have crushing chest pain radiating to my left arm';
    await voiceEngine.handleSpeechInput(null, emergencyPrompt);

    const history = voiceEngine.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[1].transcript).toContain('immediate emergency medical care');
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
