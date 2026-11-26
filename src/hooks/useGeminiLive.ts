import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AudioStreamer } from '@/lib/gemini/live-audio';
import { useChatStore } from '@/stores/chat-store';
import { useGraphStore } from '@/stores/graph-store';
import { agentTools } from '@/lib/gemini/tools';
import { SYSTEM_PROMPT } from '@/lib/gemini/prompts';

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0); // Para visualizador opcional
  
  const streamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);

  const { addMessage, updateLastAssistantMessage } = useChatStore();
  const { fetchGraphFromSupabase } = useGraphStore();

  const connect = useCallback(async (contextNodeId?: string | null) => {
    console.log('[GeminiLive] Iniciando connect...');
    if (isConnected) return;

    try {
      // Obtener API key del servidor (nunca exponerla como NEXT_PUBLIC)
      const tokenRes = await fetch('/api/gemini-token');
      if (!tokenRes.ok) throw new Error('No se pudo obtener la API key del servidor');
      const { apiKey } = await tokenRes.json();
      console.log('[GeminiLive] API Key obtenida del servidor');
      if (!apiKey) throw new Error('API Key no configurada en el servidor');

      console.log('[GeminiLive] Inicializando SDK...');
      const ai = new GoogleGenAI({ apiKey });

      let dynamicSystemPrompt = SYSTEM_PROMPT;

      console.log('[GeminiLive] Conectando al WebSocket (ai.live.connect)...');
      
      const connectPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: {
          systemInstruction: {
            parts: [{ text: dynamicSystemPrompt + '\nIMPORTANTE: Sé muy conciso en tus respuestas por voz. Habla directamente.' }]
          },
          tools: [{ functionDeclarations: agentTools }],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Voces posibles: Aoede, Charon, Fenrir, Kore, Puck
              }
            }
          }
        },
        callbacks: {
          onmessage: async (msg: any) => {
            console.log('[GeminiLive] Recibido:', Object.keys(msg));
            if (msg.serverContent) {
              console.log('[GeminiLive] serverContent parts:', msg.serverContent?.modelTurn?.parts?.length);
            }
            
            // Manejar audio entrante de la IA
            if (msg.serverContent?.modelTurn?.parts) {
              const parts = msg.serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                  setIsSpeaking(true);
                  streamerRef.current?.playAudioChunk(part.inlineData.data);
                  
                  // Reset speaking status after a delay (simplified)
                  setTimeout(() => setIsSpeaking(false), 500);
                }
              }
            }

            // Manejar peticiones de herramientas (Function Calling)
            if (msg.toolCall) {
              const functionCalls = msg.toolCall.functionCalls;
              const responses = [];
              console.log('[GeminiLive] ⚡ Gemini quiere usar herramientas:', functionCalls.map((c: any) => c.name));

              for (const call of functionCalls) {
                try {
                  console.log(`[GeminiLive] Ejecutando: ${call.name}`, call.args);
                  const res = await fetch('/api/tools', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: call.name, args: call.args }),
                  });
                  const data = await res.json();
                  
                  if (res.ok) {
                    console.log(`[GeminiLive] Resultado de ${call.name}:`, data.result);
                    responses.push({
                      id: call.id,
                      name: call.name,
                      response: data.result
                    });
                    
                    if (['crear_nueva_nota', 'conectar_nodos', 'actualizar_nota', 'eliminar_nota'].includes(call.name)) {
                      fetchGraphFromSupabase();
                    }
                  } else {
                    throw new Error(data.error);
                  }
                } catch (e: any) {
                  console.error(`[GeminiLive] Error en ${call.name}:`, e);
                  responses.push({
                    id: call.id,
                    name: call.name,
                    response: { error: e.message }
                  });
                }
              }

              console.log('[GeminiLive] 📤 Enviando resultado de herramienta al WebSocket...');
              sessionRef.current.sendToolResponse({
                functionResponses: responses
              });
            }
          },
          onclose: (e: any) => {
            console.log('[GeminiLive] WebSocket cerrado:', e);
            disconnect();
          },
          onerror: (err: any) => {
            console.error('WebSocket Error:', err);
            disconnect();
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: El servidor de Gemini no respondió (Probablemente el modelo no soporte la Live API).')), 8000)
      );

      sessionRef.current = await Promise.race([connectPromise, timeoutPromise]);

      console.log('[GeminiLive] WebSocket conectado exitosamente. Arrancando micrófono...');
      // Inicializar micrófono y enviador de audio
      let outCounter = 0;
      streamerRef.current = new AudioStreamer((base64pcm) => {
        if (sessionRef.current) {
          outCounter++;
          sessionRef.current.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64pcm
            }
          });
        }
      });
      (streamerRef.current as any)._volCallback = (vol: number) => {
        if (outCounter % 50 === 0) {
          console.log(`[GeminiLive] Micrófono activo. Volumen max: ${vol.toFixed(4)} (Chunk #${outCounter})`);
        }
      };

      await streamerRef.current.startRecording();
      setIsConnected(true);

      // Enviar un mensaje de texto inicial invisible para forzar a la IA a hablar
      // y confirmar que el puente de audio de bajada funciona
      setTimeout(() => {
        if (sessionRef.current) {
          console.log('[GeminiLive] Forzando saludo inicial...');
          sessionRef.current.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: 'Hola, acabo de activar el micrófono. Salúdame brevemente y dime que estás lista.' }] }],
            turnComplete: true
          });
        }
      }, 500);
      
    } catch (err: any) {
      console.error('Error conectando a Live API:', err);
      alert(`Error de conexión: ${err.message || 'Desconocido'}`);
      disconnect();
    }
  }, [isConnected, fetchGraphFromSupabase]);

  const disconnect = useCallback(() => {
    if (streamerRef.current) {
      streamerRef.current.stopRecording();
      streamerRef.current.stopPlayback();
      streamerRef.current = null;
    }
    
    // El SDK no expone un .close() explícito en session todavía, 
    // pero deteniendo el input de audio y cerrando el contexto libera los recursos.
    setIsConnected(false);
    setIsSpeaking(false);
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isSpeaking,
    connect,
    disconnect
  };
}
