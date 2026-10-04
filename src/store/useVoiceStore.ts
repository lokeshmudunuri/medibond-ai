import { create } from 'zustand';
import {
  VoiceDoctorInstructionPayload,
  VoiceLanguage,
  VoiceRecoveryCheckInPayload,
  VoiceState,
  VoiceTurn,
} from '../types/voice';
import { VoiceEngine } from '../voice/VoiceEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';
import { ProvenanceSource } from '../types';

interface VoiceStoreState {
  state: VoiceState;
  activeLanguage: VoiceLanguage;
  activeCaseId?: string;
  transcript: string;
  audioLevel: number;
  conversation: VoiceTurn[];
  statusMessage: string;
  pendingCheckIn: VoiceRecoveryCheckInPayload | null;
  pendingDoctorInstruction: VoiceDoctorInstructionPayload | null;

  // Actions
  setLanguage: (lang: VoiceLanguage) => void;
  setActiveCaseId: (caseId?: string) => void;
  startListening: (sampleText?: string) => void;
  stop: () => void;
  interrupt: () => void;
  confirmCheckIn: () => void;
  confirmDoctorInstruction: (targetCaseId?: string) => void;
  discardPendingExtraction: () => void;
  clearConversation: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
  const engine = VoiceEngine.getInstance();
  const memory = HealthMemoryService.getInstance();

  engine.subscribeState((newState, text) => {
    let msg = 'Ready';
    if (newState === VoiceState.LISTENING) msg = 'Listening to speech...';
    if (newState === VoiceState.TRANSCRIBING) msg = 'Transcribing on-device speech...';
    if (newState === VoiceState.UNDERSTANDING) msg = 'Understanding medical intent...';
    if (newState === VoiceState.RETRIEVING_CONTEXT) msg = 'Retrieving case health memory...';
    if (newState === VoiceState.VALIDATING) msg = 'Checking clinical safety...';
    if (newState === VoiceState.THINKING) msg = 'Thinking with local medical AI...';
    if (newState === VoiceState.SPEAKING) msg = 'Speaking response via speaker...';
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

  engine.subscribeExtraction((type, payload) => {
    if (type === 'checkin') {
      set({ pendingCheckIn: payload as VoiceRecoveryCheckInPayload });
    } else if (type === 'doctor_instruction') {
      set({ pendingDoctorInstruction: payload as VoiceDoctorInstructionPayload });
    }
  });

  return {
    state: engine.getState(),
    activeLanguage: engine.getLanguage(),
    activeCaseId: undefined,
    transcript: '',
    audioLevel: 0,
    conversation: engine.getConversationHistory(),
    statusMessage: 'Ready',
    pendingCheckIn: null,
    pendingDoctorInstruction: null,

    setLanguage: (lang: VoiceLanguage) => {
      engine.setLanguage(lang);
      set({ activeLanguage: lang });
    },

    setActiveCaseId: (caseId?: string) => {
      engine.setActiveCaseId(caseId);
      set({ activeCaseId: caseId });
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

    confirmCheckIn: () => {
      const checkIn = get().pendingCheckIn;
      if (!checkIn) return;

      memory.addCheckIn({
        id: `chk_voice_${Date.now()}`,
        checkInDate: new Date().toISOString(),
        painScore: checkIn.painScore ?? 3,
        fatigueScore: checkIn.fatigueScore ?? 2,
        moodScore: checkIn.moodScore ?? 4,
        sleepHours: checkIn.sleepHours ?? 7,
        tookAllMedications: checkIn.tookAllMedications ?? true,
        reportedSymptoms: checkIn.reportedSymptoms || checkIn.rawTranscript,
        patientSpokenTranscript: checkIn.rawTranscript,
        provenance: {
          source: ProvenanceSource.UserReported,
          confidence: 0.95,
          recordedAt: new Date().toISOString(),
        },
      });

      set({ pendingCheckIn: null });
    },

    confirmDoctorInstruction: (targetCaseId?: string) => {
      const instruction = get().pendingDoctorInstruction;
      if (!instruction) return;

      const caseIdToUse = targetCaseId || get().activeCaseId;
      if (caseIdToUse) {
        memory.addInstructionToCase(
          caseIdToUse,
          `${instruction.restriction} (Duration: ${instruction.duration}, Follow-up: ${instruction.followUpDays} days)`
        );
      }

      set({ pendingDoctorInstruction: null });
    },

    discardPendingExtraction: () => {
      set({ pendingCheckIn: null, pendingDoctorInstruction: null });
    },

    clearConversation: () => {
      engine.startNewSession();
      set({
        conversation: [],
        transcript: '',
        state: VoiceState.IDLE,
        statusMessage: 'Ready',
        pendingCheckIn: null,
        pendingDoctorInstruction: null,
      });
    },
  };
});
