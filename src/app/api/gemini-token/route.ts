import { NextResponse } from 'next/server';

/**
 * Endpoint que proporciona la API key de Gemini al cliente
 * para sesiones de Gemini Live API.
 * 
 * En producción, este endpoint debería estar protegido por autenticación
 * y rate-limiting para evitar abuso.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no configurada en el servidor' },
      { status: 500 }
    );
  }

  return NextResponse.json({ apiKey });
}
