-- ============================================================
-- GlyphBrain — Migración v2.0 (Metadatos estilo Notion)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir el tipo de nodo (ej: concepto, proyecto, persona, tarea)
ALTER TABLE notas 
ADD COLUMN IF NOT EXISTS tipo_nodo TEXT DEFAULT 'concepto'
CHECK (tipo_nodo IN ('concepto', 'proyecto', 'persona', 'tarea', 'recurso'));

-- 2. Añadir campo para icono personalizado (ej: un emoji o URL corta)
ALTER TABLE notas 
ADD COLUMN IF NOT EXISTS icono TEXT;

-- 3. Añadir color personalizado opcional para sobrescribir el del tipo
ALTER TABLE notas 
ADD COLUMN IF NOT EXISTS color_personalizado TEXT;

-- 4. Añadir el campo de propiedades dinámicas (JSONB)
-- Aquí guardaremos campos como { "status": "en curso", "dueDate": "2024-12-31" }
ALTER TABLE notas 
ADD COLUMN IF NOT EXISTS propiedades JSONB DEFAULT '{}'::jsonb;

-- 5. Crear índice para optimizar consultas por propiedades JSON (útil para el futuro)
CREATE INDEX IF NOT EXISTS idx_notas_propiedades ON notas USING GIN (propiedades);
CREATE INDEX IF NOT EXISTS idx_notas_tipo_nodo ON notas(tipo_nodo);
