import { create } from 'zustand';
import { ChatMessage } from '../types/chat';
import { AIOrchestrator } from '../ai/AIOrchestrator';
import { LocalLLMEngine } from '../ai/LocalLLMEngine';

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  tokensPerSecond: number;
  activeCaseId: string | null;
  setActiveCaseId: (caseId: string | null) => void;
  sendMessage: (text: string, overrideCaseId?: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  clearHistory: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  const orchestrator = AIOrchestrator.getInstance();
  const localLLM = LocalLLMEngine.getInstance();

  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome_1',
    conversationId: 'default',
    role: 'assistant',
    content:
      'Hello, I am **CareBond AI**, your offline-first clinical and recovery companion.\n\nAll AI reasoning runs 100% locally on this device using on-device GGUF intelligence. How can I assist you with your health or case records today?',
    timestamp: new Date().toISOString(),
    modelName: 'CareBond Local AI',
  };

  return {
    messages: [initialWelcomeMessage],
    isGenerating: false,
    streamingContent: '',
    tokensPerSecond: 0,
    activeCaseId: null,

    setActiveCaseId: (caseId: string | null) => {
      set({ activeCaseId: caseId });
    },

    sendMessage: async (text: string, overrideCaseId?: string) => {
      const userText = text.trim();
      if (!userText || get().isGenerating) return;

      const caseIdToUse = overrideCaseId || get().activeCaseId || undefined;

      const userMsg: ChatMessage = {
        id: `usr_${Date.now()}`,
        conversationId: 'default',
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
        modelName: 'User',
      };

      set((state) => ({
        messages: [...state.messages, userMsg],
        isGenerating: true,
        streamingContent: '',
      }));

      const activeModel = localLLM.getActiveModel();
      const modelDisplayName = activeModel?.displayName || 'Local GGUF Model';

      let accumulated = '';
      let isEmergency = false;

      try {
        const stream = orchestrator.streamReasoning(userText, caseIdToUse);

        for await (const chunk of stream) {
          accumulated += chunk.token;
          if (chunk.isEmergencyAlert) {
            isEmergency = true;
          }
          set({ streamingContent: accumulated });
        }

        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          conversationId: 'default',
          role: 'assistant',
          content: accumulated,
          timestamp: new Date().toISOString(),
          modelName: modelDisplayName,
          isEmergencyAlert: isEmergency,
        };

        set((state) => ({
          messages: [...state.messages, assistantMsg],
          streamingContent: '',
          isGenerating: false,
        }));
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          conversationId: 'default',
          role: 'assistant',
          content: `⚠️ **Inference Error**: ${err?.message || err}`,
          timestamp: new Date().toISOString(),
          modelName: 'System Error',
        };

        set((state) => ({
          messages: [...state.messages, errorMsg],
          streamingContent: '',
          isGenerating: false,
        }));
      }
    },

    stopGeneration: async () => {
      await orchestrator.stopGeneration();
      const currentStream = get().streamingContent;
      const activeModel = localLLM.getActiveModel();
      if (currentStream) {
        const stoppedMsg: ChatMessage = {
          id: `stop_${Date.now()}`,
          conversationId: 'default',
          role: 'assistant',
          content: `${currentStream} [Generation stopped by user]`,
          timestamp: new Date().toISOString(),
          modelName: activeModel?.displayName || 'Local GGUF Model',
        };
        set((state) => ({
          messages: [...state.messages, stoppedMsg],
          streamingContent: '',
          isGenerating: false,
        }));
      } else {
        set({ isGenerating: false });
      }
    },

    clearHistory: () => {
      set({ messages: [initialWelcomeMessage], streamingContent: '', isGenerating: false });
    },
  };
});

