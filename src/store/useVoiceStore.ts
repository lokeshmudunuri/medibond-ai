import { create } from 'zustand';
import { VoiceLanguage, VoiceState, VoiceTurn } from '../types/voice';
import { VoiceEngine } from '../voice/VoiceEngine';

interface VoiceStoreState {
  state: VoiceState;
  activeLanguage: VoiceLanguage;
  transcript: string;
  audioLevel: number;
  conversation: VoiceTurn[];
  statusMessage: string;
  setLanguage: (lang: VoiceLanguage) => void;
  startListening: (sampleText?: string) => void;
  stop: () => void;
  interrupt: () => void;
  clearConversation: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
  const engine = VoiceEngine.getInstance();

  engine.subscribeState((newState, text) => {
    let msg = 'Ready';
    if (newState === VoiceState.LISTENING) msg = 'Listening...';
    if (newState === VoiceState.TRANSCRIBING) msg = 'Transcribing speech...';
    if (newState === VoiceState.UNDERSTANDING) msg = 'Understanding medical intent...';
    if (newState === VoiceState.RETRIEVING_CONTEXT) msg = 'Retrieving health memory...';
    if (newState === VoiceState.VALIDATING) msg = 'Checking clinical safety...';
    if (newState === VoiceState.THINKING) msg = 'Thinking with local medical AI...';
    if (newState === VoiceState.SPEAKING) msg = 'Speaking...';
    if (newState === VoiceState.INTERRUPTED) msg = 'Interrupted';
    if (newState === VoiceState.ERROR) msg = text || 'Error encountered';

    set({
      state: newState,
      transcript: text || (newState === VoiceState.IDLE ? '' : get().transcript),
      conversation: engine.getConversationHistory(),
      statusMessage: msg,
    });
  });

  engine.subscribeAudioLevel((level) => {
    set({ audioLevel: level });
  });

  return {
    state: engine.getState(),
    activeLanguage: engine.getLanguage(),
    transcript: '',
    audioLevel: 0,
    conversation: engine.getConversationHistory(),
    statusMessage: 'Ready',

    setLanguage: (lang: VoiceLanguage) => {
      engine.setLanguage(lang);
      set({ activeLanguage: lang });
    },

    startListening: (sampleText?: string) => {
      engine.startListening(sampleText);
    },

    stop: () => {
      engine.stop();
    },

    interrupt: () => {
      engine.interrupt();
    },

    clearConversation: () => {
      engine.startNewSession();
      set({ conversation: [], transcript: '', state: VoiceState.IDLE, statusMessage: 'Ready' });
    },
  };
});
