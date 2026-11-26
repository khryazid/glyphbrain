import { GoogleGenAI } from '@google/genai';

/**
 * Instancia singleton de GoogleGenAI para uso server-side.
 * Centraliza la inicialización para evitar múltiples instancias.
 */
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
