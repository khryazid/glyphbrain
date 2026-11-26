import { supabase } from './client';
import type { Nota, Relacion } from '@/types';

// === NOTAS (CRUD) ===

export async function fetchAllNotas(): Promise<Nota[]> {
  const { data, error } = await supabase
    .from('notas')
    .select('id, titulo, contenido, tags, importancia, created_at, updated_at, tipo_nodo, icono, color_personalizado, propiedades')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Nota[];
}

export async function fetchNotaById(id: string): Promise<Nota | null> {
  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Nota;
}

export async function createNota(nota: {
  titulo: string;
  contenido: string;
  tags: string[];
  importancia: number;
  tipo_nodo?: string;
  icono?: string;
  color_personalizado?: string;
  propiedades?: Record<string, any>;
}): Promise<Nota> {
  const { data, error } = await supabase
    .from('notas')
    .insert({
      ...nota,
      tipo_nodo: nota.tipo_nodo || 'concepto',
      propiedades: nota.propiedades || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data as Nota;
}

export async function updateNota(
  id: string,
  updates: Partial<Pick<Nota, 'titulo' | 'contenido' | 'tags' | 'importancia' | 'tipo_nodo' | 'icono' | 'color_personalizado' | 'propiedades'>>
): Promise<Nota> {
  const { data, error } = await supabase
    .from('notas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Nota;
}

export async function deleteNota(id: string): Promise<void> {
  const { error } = await supabase
    .from('notas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateNotaEmbedding(
  id: string,
  embedding: number[]
): Promise<void> {
  // pgvector expects the embedding as a string like '[0.1, 0.2, ...]'
  const embeddingStr = `[${embedding.join(',')}]`;
  
  const { error } = await supabase
    .from('notas')
    .update({ embedding: embeddingStr })
    .eq('id', id);

  if (error) throw error;
}

// === RELACIONES (CRUD) ===

export async function fetchAllRelaciones(): Promise<Relacion[]> {
  const { data, error } = await supabase
    .from('relaciones')
    .select('*');

  if (error) throw error;
  return (data || []) as Relacion[];
}

export async function createRelacion(relacion: {
  origen_id: string;
  destino_id: string;
  tipo: 'manual' | 'sugerida-por-ia' | 'semantica';
  peso: number;
}): Promise<Relacion> {
  const { data, error } = await supabase
    .from('relaciones')
    .insert(relacion)
    .select()
    .single();

  if (error) throw error;
  return data as Relacion;
}

export async function deleteRelacion(id: string): Promise<void> {
  const { error } = await supabase
    .from('relaciones')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// === BÚSQUEDA SEMÁNTICA ===

export async function buscarNotasSimilares(
  queryEmbedding: number[],
  matchCount: number = 5,
  threshold: number = 0.3
): Promise<(Nota & { similarity: number })[]> {
  const { data, error } = await supabase.rpc('buscar_notas_similares', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: matchCount,
    similarity_threshold: threshold,
  });

  if (error) throw error;
  return (data || []) as (Nota & { similarity: number })[];
}
