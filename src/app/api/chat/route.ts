import { NextRequest, NextResponse } from 'next/server';
import { processAgentTurn, processAgentTurnStreaming } from '@/lib/gemini/agent';

export async function POST(request: NextRequest) {
  try {
    const { messages, contextNodeId, isDeepMode, stream: useStream } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de mensajes' },
        { status: 400 }
      );
    }

    // Modo streaming: devuelve un ReadableStream
    if (useStream) {
      const { stream } = await processAgentTurnStreaming(messages, contextNodeId, isDeepMode);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Modo clásico (fallback): devuelve JSON completo
    const { response, actions } = await processAgentTurn(messages, contextNodeId, isDeepMode);

    return NextResponse.json({ response, actions });
  } catch (error: any) {
    console.error('Error en /api/chat:', error);
    return NextResponse.json(
      { error: `Error procesando el mensaje del chat: ${error.message || String(error)}`, stack: error.stack },
      { status: 500 }
    );
  }
}
