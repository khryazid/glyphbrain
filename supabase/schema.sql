-- ============================================================
-- GlyphBrain — Schema SQL para Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Activar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla: notas (nodos del grafo)
CREATE TABLE IF NOT EXISTS notas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  contenido TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  importancia FLOAT DEFAULT 0.5
    CHECK (importancia >= 0 AND importancia <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(768)
);

-- Tabla: relaciones (aristas del grafo)
CREATE TABLE IF NOT EXISTS relaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  origen_id UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'manual'
    CHECK (tipo IN ('manual', 'sugerida-por-ia', 'semantica')),
  peso FLOAT DEFAULT 0.5
    CHECK (peso >= 0 AND peso <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(origen_id, destino_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notas_embedding ON notas
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_relaciones_origen ON relaciones(origen_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_destino ON relaciones(destino_id);

-- RPC: búsqueda semántica por similitud coseno
CREATE OR REPLACE FUNCTION buscar_notas_similares(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  id UUID, titulo TEXT, contenido TEXT,
  tags TEXT[], importancia FLOAT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT n.id, n.titulo, n.contenido, n.tags, n.importancia,
         1 - (n.embedding <=> query_embedding) AS similarity
  FROM notas n
  WHERE n.embedding IS NOT NULL
    AND 1 - (n.embedding <=> query_embedding) > similarity_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (permisivo para desarrollo)
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notas" ON notas
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on relaciones" ON relaciones
  FOR ALL USING (true) WITH CHECK (true);
