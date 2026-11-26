import type { Content, Part } from '@google/genai';
import { ai } from './client';
import { agentTools } from './tools';
import { generateEmbedding } from './embeddings';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ChatAction } from '@/types';
import { SYSTEM_PROMPT } from './prompts';

/**
 * Ejecuta una función del agente contra Supabase
 */
export async function executeFunctionCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ result: unknown; action: ChatAction }> {
  const supabase = createServerSupabaseClient();

  switch (name) {
    case 'buscar_notas_por_semantica': {
      const query = args.query as string;
      // Generar embedding de la consulta
      const queryEmbedding = await generateEmbedding(query);
      
      // Buscar en Supabase con pgvector
      const { data, error } = await supabase.rpc('buscar_notas_similares', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_count: 5,
        similarity_threshold: 0.3,
      });

      if (error) throw error;

      const resultados = data || [];
      return {
        result: {
          notas_encontradas: resultados.length,
          notas: resultados.map((n: Record<string, unknown>) => ({
            id: n.id,
            titulo: n.titulo,
            contenido: n.contenido,
            tags: n.tags,
            similarity: n.similarity,
          })),
        },
        action: {
          type: 'buscar_notas',
          description: `Búsqueda semántica: "${query}" — ${resultados.length} resultados`,
        },
      };
    }

    case 'crear_nueva_nota': {
      const titulo = args.titulo as string;
      const contenido = args.contenido as string;
      const tags = (args.tags as string[]) || [];
      const icono = (args.icono as string) || '📄';
      const tipo_nodo = (args.tipo_nodo as string) || 'concepto';

      // Crear nota en Supabase
      const { data: nota, error: insertError } = await supabase
        .from('notas')
        .insert({ titulo, contenido, tags, importancia: 0.5, icono, tipo_nodo })
        .select()
        .single();

      if (insertError) throw insertError;

      // Generar y guardar embedding
      try {
        const embedding = await generateEmbedding(`${titulo}\n\n${contenido}`);
        await supabase
          .from('notas')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', nota.id);

        // MÁGIA SEMÁNTICA: Auto-conectar
        const { data: similares } = await supabase.rpc('buscar_notas_similares', {
          query_embedding: `[${embedding.join(',')}]`,
          match_count: 3,
          similarity_threshold: 0.65
        });

        if (similares && similares.length > 0) {
          for (const sim of similares) {
            if (sim.id !== nota.id) {
              await supabase.from('relaciones').insert({
                origen_id: nota.id,
                destino_id: sim.id,
                tipo: 'semantica',
                peso: sim.similarity
              }).catch(() => {}); // Ignorar duplicates
            }
          }
        }
      } catch (embError) {
        console.warn('Embedding no generado para nota creada por IA:', embError);
      }

      return {
        result: { id: nota.id, titulo: nota.titulo, mensaje: 'Nota creada exitosamente' },
        action: {
          type: 'crear_nota',
          description: `Nota creada: "${titulo}"`,
        },
      };
    }

    case 'conectar_nodos': {
      const origenId = args.id_origen as string;
      const destinoId = args.id_destino as string;
      const tipo = (args.tipo as string) || 'sugerida-por-ia';

      const { data: relacion, error: relError } = await supabase
        .from('relaciones')
        .insert({
          origen_id: origenId,
          destino_id: destinoId,
          tipo,
          peso: 0.7,
        })
        .select()
        .single();

      if (relError) throw relError;

      return {
        result: { id: relacion.id, mensaje: 'Nodos conectados exitosamente' },
        action: {
          type: 'conectar_nodos',
          description: `Conexión creada (${tipo})`,
        },
      };
    }

    default:
      throw new Error(`Función desconocida: ${name}`);
  }
}

/**
 * Procesa un turno del chat con el agente.
 * Maneja el loop de function calling hasta obtener una respuesta de texto.
 */
export async function processAgentTurn(
  messages: { role: string; content: string }[],
  contextNodeId?: string | null,
  isDeepMode: boolean = false
): Promise<{ response: string; actions: ChatAction[] }> {
  if (messages.length === 0) return { response: 'No hay mensajes', actions: [] };

  const lastMessage = messages[messages.length - 1];
  
  // Construir historial en formato Gemini
  const history: Content[] = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const actions: any[] = [];
  let dynamicSystemPrompt = SYSTEM_PROMPT;

  // Inyectar contexto local si hay un nodo seleccionado
  if (contextNodeId) {
    const supabase = createServerSupabaseClient();
    
    // Obtener la nota actual
    const { data: node } = await supabase.from('notas').select('*').eq('id', contextNodeId).single();
    
    if (node) {
      // Obtener conexiones
      const { data: linksOut } = await supabase.from('relaciones').select('destino_id, notas:destino_id(titulo, tipo_nodo)').eq('origen_id', contextNodeId);
      const { data: linksIn } = await supabase.from('relaciones').select('origen_id, notas:origen_id(titulo, tipo_nodo)').eq('destino_id', contextNodeId);
      
      const outgoing = linksOut?.map((l: any) => l.notas?.titulo).filter(Boolean).join(', ') || 'Ninguna';
      const incoming = linksIn?.map((l: any) => l.notas?.titulo).filter(Boolean).join(', ') || 'Ninguna';

      dynamicSystemPrompt += `\n\n[CONTEXTO ACTUAL DEL USUARIO]\nEl usuario tiene actualmente abierta y seleccionada la siguiente nota:\n`;
      dynamicSystemPrompt += `- Título: "${node.titulo}"\n`;
      dynamicSystemPrompt += `- Tipo: ${node.tipo_nodo || 'concepto'}\n`;
      dynamicSystemPrompt += `- Contenido:\n"""\n${node.contenido || '(Vacío)'}\n"""\n`;
      dynamicSystemPrompt += `- Conexiones Salientes (hacia dónde va): ${outgoing}\n`;
      dynamicSystemPrompt += `- Conexiones Entrantes (de dónde viene): ${incoming}\n\n`;
      dynamicSystemPrompt += `IMPORTANTISIMO: Usa este contexto como la base principal para tu respuesta. Si el usuario dice "resume esto", "qué falta aquí", "explícame más", se refiere a esta nota actual.`;
    }
  }

  // Selección dinámica de modelo
  // Modo Rápido (Lite): Ideal para consultas generales y múltiples creaciones de notas (15 RPM)
  // Modo Profundo: Ideal para análisis complejo, razonamiento arquitectónico y contenido largo (5 RPM)
  const selectedModel = isDeepMode ? 'gemini-3.7-flash' : 'gemini-3.5-flash-lite';

  // Crear chat con herramientas
  const chat = ai.chats.create({
    model: selectedModel,
    config: {
      systemInstruction: dynamicSystemPrompt,
      tools: [{ functionDeclarations: agentTools }],
      temperature: 0.3,
    },
    history,
  });

  // Enviar el mensaje del usuario
  let response = await chat.sendMessage({ message: lastMessage.content });

  // Loop de function calling (máx 5 iteraciones para evitar loops infinitos)
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (response.functionCalls && response.functionCalls.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    
    const functionResponses: Part[] = [];

    // Ejecutar todas las funciones solicitadas en paralelo
    await Promise.all(
      response.functionCalls.map(async (functionCall) => {
        try {
          const { result, action } = await executeFunctionCall(
            functionCall.name!,
            (functionCall.args || {}) as Record<string, unknown>
          );
          actions.push(action);

          functionResponses.push({
            functionResponse: {
              name: functionCall.name!,
              response: result as Record<string, unknown>,
            },
          });
        } catch (error) {
          console.error(`Error ejecutando ${functionCall.name}:`, error);
          functionResponses.push({
            functionResponse: {
              name: functionCall.name!,
              response: { error: `Error ejecutando la función: ${(error as Error).message}` },
            },
          });
        }
      })
    );

    // Enviar todos los resultados de vuelta a Gemini en un solo mensaje
    response = await chat.sendMessage({ message: functionResponses });
  }

  let responseText = 'No pude generar una respuesta de texto válida.';
  try {
    if (response.text) {
      responseText = response.text;
    }
  } catch (e) {
    // Si la propiedad text tira error (ej: si solo devolvió functionCalls), lo atrapamos
    responseText = 'He realizado las acciones, pero no pude generar un mensaje de texto de confirmación final.';
  }

  return { response: responseText, actions };
}

/**
 * Versión streaming de processAgentTurn.
 * Resuelve tool calls de forma síncrona en el servidor,
 * luego devuelve un ReadableStream con el texto de respuesta.
 */
export async function processAgentTurnStreaming(
  messages: { role: string; content: string }[],
  contextNodeId?: string | null,
  isDeepMode: boolean = false
): Promise<{ stream: ReadableStream<Uint8Array>; actions: ChatAction[] }> {
  if (messages.length === 0) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('No hay mensajes'));
        controller.close();
      }
    });
    return { stream, actions: [] };
  }

  const lastMessage = messages[messages.length - 1];

  // Construir historial en formato Gemini
  const history: Content[] = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const actions: ChatAction[] = [];
  let dynamicSystemPrompt = SYSTEM_PROMPT;

  // Inyectar contexto local si hay un nodo seleccionado
  if (contextNodeId) {
    const supabase = createServerSupabaseClient();
    const { data: node } = await supabase.from('notas').select('*').eq('id', contextNodeId).single();

    if (node) {
      const { data: linksOut } = await supabase.from('relaciones').select('destino_id, notas:destino_id(titulo, tipo_nodo)').eq('origen_id', contextNodeId);
      const { data: linksIn } = await supabase.from('relaciones').select('origen_id, notas:origen_id(titulo, tipo_nodo)').eq('destino_id', contextNodeId);

      const outgoing = linksOut?.map((l: any) => l.notas?.titulo).filter(Boolean).join(', ') || 'Ninguna';
      const incoming = linksIn?.map((l: any) => l.notas?.titulo).filter(Boolean).join(', ') || 'Ninguna';

      dynamicSystemPrompt += `\n\n[CONTEXTO ACTUAL DEL USUARIO]\nEl usuario tiene actualmente abierta y seleccionada la siguiente nota:\n`;
      dynamicSystemPrompt += `- Título: "${node.titulo}"\n`;
      dynamicSystemPrompt += `- Tipo: ${node.tipo_nodo || 'concepto'}\n`;
      dynamicSystemPrompt += `- Contenido:\n"""\n${node.contenido || '(Vacío)'}\n"""\n`;
      dynamicSystemPrompt += `- Conexiones Salientes: ${outgoing}\n`;
      dynamicSystemPrompt += `- Conexiones Entrantes: ${incoming}\n\n`;
      dynamicSystemPrompt += `IMPORTANTISIMO: Usa este contexto como la base principal para tu respuesta.`;
    }
  }

  const selectedModel = isDeepMode ? 'gemini-3.7-flash' : 'gemini-3.5-flash-lite';

  const chat = ai.chats.create({
    model: selectedModel,
    config: {
      systemInstruction: dynamicSystemPrompt,
      tools: [{ functionDeclarations: agentTools }],
      temperature: 0.3,
    },
    history,
  });

  // Fase 1: Resolver tool calls de forma síncrona
  let response = await chat.sendMessage({ message: lastMessage.content });
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (response.functionCalls && response.functionCalls.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const functionResponses: Part[] = [];

    await Promise.all(
      response.functionCalls.map(async (functionCall) => {
        try {
          const { result, action } = await executeFunctionCall(
            functionCall.name!,
            (functionCall.args || {}) as Record<string, unknown>
          );
          actions.push(action);
          functionResponses.push({
            functionResponse: {
              name: functionCall.name!,
              response: result as Record<string, unknown>,
            },
          });
        } catch (error) {
          console.error(`Error ejecutando ${functionCall.name}:`, error);
          functionResponses.push({
            functionResponse: {
              name: functionCall.name!,
              response: { error: `Error: ${(error as Error).message}` },
            },
          });
        }
      })
    );

    response = await chat.sendMessage({ message: functionResponses });
  }

  // Fase 2: Si todavía hay tool calls pendientes, hacer una última llamada solo de texto
  // Si ya tenemos texto, streamear ese texto
  let textToStream = '';
  try {
    textToStream = response.text || '';
  } catch {
    textToStream = 'He realizado las acciones solicitadas.';
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Enviar las acciones como metadata en la primera línea
      if (actions.length > 0) {
        controller.enqueue(encoder.encode(`__ACTIONS__${JSON.stringify(actions)}__ACTIONS_END__`));
      }
      // Enviar el texto en chunks para simular streaming
      // (el texto ya está completo desde tool calling, pero lo fragmentamos para UX)
      const chunkSize = 12;
      for (let i = 0; i < textToStream.length; i += chunkSize) {
        controller.enqueue(encoder.encode(textToStream.slice(i, i + chunkSize)));
      }
      controller.close();
    }
  });

  return { stream, actions };
}

