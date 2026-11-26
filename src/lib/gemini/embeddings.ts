import { ai } from './client';

/**
 * Genera un embedding de 768 dimensiones para el texto dado
 * usando el modelo text-embedding-004 de Google Gemini.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    throw new Error('El texto para generar embedding no puede estar vacío');
  }

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: { outputDimensionality: 768 }
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('El modelo no devolvió un embedding válido');
    }

    return values;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

/**
 * Genera embedding combinando título y contenido de una nota
 * para obtener un vector semántico más rico.
 */
export async function generateNotaEmbedding(
  titulo: string,
  contenido: string
): Promise<number[]> {
  const textoCombinado = `${titulo}\n\n${contenido}`.trim();
  return generateEmbedding(textoCombinado);
}
