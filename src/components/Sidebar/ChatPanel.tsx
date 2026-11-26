'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useGraphStore } from '@/stores/graph-store';
import { useAppStore } from '@/stores/app-store';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import ChatMessage from './ChatMessage';

export default function ChatPanel() {
  const { messages, isLoading, addMessage, setLoading, updateLastAssistantMessage, clearChat } = useChatStore();
  const { fetchGraphFromSupabase, graphData } = useGraphStore();
  const { selectedNodeId } = useAppStore();
  const { isConnected, isSpeaking, connect, disconnect } = useGeminiLive();
  const [input, setInput] = useState('');
  const [isDeepMode, setIsDeepMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Resetear altura al enviar
    }
    addMessage({ role: 'user', content: text });

    // Agregar mensaje placeholder del asistente
    addMessage({ role: 'assistant', content: '', isLoading: true });
    setLoading(true);

      try {
      // Construir historial para la API (excluir el placeholder)
      const chatHistory = useChatStore.getState().messages
        .filter((m) => m.role !== 'system' && !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content }));

      const contextNodeId = useAppStore.getState().selectedNodeId;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatHistory,
          contextNodeId,
          isDeepMode,
          stream: true
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(`API Error: ${data.error || res.statusText}`);
      }

      // Leer respuesta como stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let actions: { type: string; description: string }[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Extraer acciones del metadata embebido
          const actionsMatch = fullText.match(/__ACTIONS__(.*?)__ACTIONS_END__/);
          if (actionsMatch) {
            try {
              actions = JSON.parse(actionsMatch[1]);
            } catch { /* ignorar errores de parsing parcial */ }
          }

          // Mostrar solo el texto (sin los markers de actions)
          const displayText = fullText.replace(/__ACTIONS__.*?__ACTIONS_END__/, '');
          updateLastAssistantMessage(displayText, actions);
        }
      }

      // Si la IA creó notas o conexiones, refrescar el grafo
      if (actions.some((a) =>
        a.type === 'crear_nota' || a.type === 'conectar_nodos'
      )) {
        await fetchGraphFromSupabase();
      }
    } catch (error) {
      console.error('Error del asistente:', error);
      updateLastAssistantMessage('Error de conexión con el agente IA.', []);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeNode = selectedNodeId ? graphData.nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="flex flex-col h-full bg-gb-bg">
      {/* Header con botón limpiar y Contexto */}
      <div className="flex flex-col px-4 py-2 border-b border-gb-border gap-2 bg-gb-bg/95 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gb-text-muted">
              {messages.filter((m) => m.role !== 'system').length - 1} msjs
            </span>
            <button
              onClick={() => setIsDeepMode(!isDeepMode)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                isDeepMode 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' 
                  : 'bg-gb-surface text-gb-text-muted border-gb-border'
              }`}
              title={isDeepMode ? 'Modo Profundo Activado (Lento/Potente)' : 'Modo Rápido (Veloz/Ligero)'}
            >
              {isDeepMode ? '🧠 Profundo' : '⚡ Rápido'}
            </button>
            <button
              onClick={isConnected ? disconnect : () => connect(selectedNodeId)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                isConnected 
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' 
                  : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
              }`}
            >
              {isConnected ? (isSpeaking ? '🔊 Hablando...' : '🔴 Colgar') : '🎙️ Llamar'}
            </button>
          </div>
          <button
            onClick={clearChat}
            className="text-xs text-gb-text-muted hover:text-red-400 transition-colors"
          >
            Limpiar chat
          </button>
        </div>
        
        {/* Badge de Contexto Local */}
        {activeNode && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gb-accent/10 border border-gb-accent/20 rounded-md">
            <span className="text-sm">{activeNode.icono || '🎯'}</span>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] uppercase text-gb-accent font-bold tracking-wider leading-none mb-0.5">Contexto Activo</span>
              <span className="text-xs text-gb-text truncate leading-none">{activeNode.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gb-border p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Lógica de auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading || isConnected}
            placeholder={isConnected ? 'Habla por el micrófono...' : 'Escribe un mensaje...'}
            rows={1}
            className="flex-1 bg-gb-surface border border-gb-border rounded-lg px-3 py-2
              text-sm text-gb-text placeholder:text-gb-text-muted resize-none
              focus:outline-none focus:border-gb-accent transition-colors
              max-h-[150px] overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isConnected}
            className="px-3 py-2 rounded-lg bg-gb-accent text-gb-bg
              hover:bg-gb-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
            title="Enviar mensaje"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gb-text-muted mt-1.5">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
