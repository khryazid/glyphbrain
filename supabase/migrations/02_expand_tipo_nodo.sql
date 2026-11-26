-- ============================================================
-- GlyphBrain — Migración v2.1 (Expandir tipos de nodo)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Expandir el CHECK constraint de tipo_nodo para incluir todos
-- los tipos usados en la UI (arquitectura, feature, database, etc.)
ALTER TABLE notas DROP CONSTRAINT IF EXISTS notas_tipo_nodo_check;
ALTER TABLE notas ADD CONSTRAINT notas_tipo_nodo_check
  CHECK (tipo_nodo IN (
    'concepto', 'proyecto', 'persona', 'tarea', 'recurso',
    'arquitectura', 'feature', 'database', 'api', 'bug', 'seguridad'
  ));
