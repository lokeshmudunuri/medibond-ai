import { create } from 'zustand';
import { ChatMessage } from '../types/chat';
import { AIEngine } from '../ai/AIEngine';
import { HealthMemoryService } from '../services/HealthMemoryService';

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  tokensPerSecond: number;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  clearHistory: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  const aiEngine = AIEngine.getInstance();
  const memory = HealthMemoryService.getInstance();

  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome_1',
    conversationId: 'default',
    role: 'assistant',
    content:
      'Hello Alex, I am **CareBond AI**, your offline-first personal clinical and recovery companion. I have your health records, active medications (Telmisartan, Metformin, Pantoprazole), and post-op appendectomy recovery protocol loaded.\n\nHow are you feeling today?',
    timestamp: new Date().toISOString(),
    modelName: 'CareBond Local AI',
  };

  return {
    messages: [initialWelcomeMessage],
    isGenerating: false,
    streamingContent: '',
    tokensPerSecond: 0,

    sendMessage: async (text: string) => {
      const userText = text.trim();
      if (!userText || get().isGenerating) return;

      const userMsg: ChatMessage = {
        id: `usr_${Date.now()}`,
        conversationId: 'default',
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString(),
        modelName: 'User',
      };

      set(state => ({
        messages: [...state.messages, userMsg],
        isGenerating: true,
        streamingContent: '',
      }));

      // Extract action intent if any (e.g. check-in statement)
      const action = aiEngine.extractCheckInAction(userText);

      const context = memory.buildCurrentContext();
      let accumulated = '';
      let isEmergency = false;

      try {
        const stream = aiEngine.streamChat(userText, context);

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
          modelName: 'Local GGUF Model',
          isEmergencyAlert: isEmergency,
          suggestedActionType: action?.type,
          suggestedActionPayload: action?.payload,
        };

        set(state => ({
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

        set(state => ({
          messages: [...state.messages, errorMsg],
          streamingContent: '',
          isGenerating: false,
        }));
      }
    },

    stopGeneration: async () => {
      await aiEngine.stopGeneration();
      const currentStream = get().streamingContent;
      if (currentStream) {
        const stoppedMsg: ChatMessage = {
          id: `stop_${Date.now()}`,
          conversationId: 'default',
          role: 'assistant',
          content: `${currentStream} [Generation stopped]`,
          timestamp: new Date().toISOString(),
          modelName: 'Local GGUF Model',
        };
        set(state => ({
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
