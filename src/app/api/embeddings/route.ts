import { NextRequest, NextResponse } from 'next/server';
import { generateNotaEmbedding } from '@/lib/gemini/embeddings';

export async function POST(request: NextRequest) {
  try {
    const { titulo, contenido } = await request.json();

    if (!titulo && !contenido) {
      return NextResponse.json(
        { error: 'Se requiere al menos un título o contenido' },
        { status: 400 }
      );
    }

    const embedding = await generateNotaEmbedding(titulo || '', contenido || '');

    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (error) {
    console.error('Error en /api/embeddings:', error);
    return NextResponse.json(
      { error: 'Error generando embedding' },
      { status: 500 }
    );
  }
}
