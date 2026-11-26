import { create } from 'zustand';
import type { ChatMessage, ChatAction } from '@/types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  updateLastAssistantMessage: (content: string, actions?: ChatAction[]) => void;
  clearChat: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de GlyphBrain. Puedo ayudarte a buscar información en tu red de conocimiento, crear nuevas notas, o conectar ideas relacionadas. ¿En qué puedo ayudarte?',
      timestamp: new Date(),
    },
  ],
  isLoading: false,

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: generateId(), timestamp: new Date() },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  updateLastAssistantMessage: (content, actions) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content, isLoading: false, actions };
      }
      return { messages: msgs };
    }),

  clearChat: () =>
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Chat reiniciado. ¿En qué puedo ayudarte?',
          timestamp: new Date(),
        },
      ],
    }),
}));
