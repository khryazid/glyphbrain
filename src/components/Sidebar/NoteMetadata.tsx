'use client';

import React from 'react';
import type { TipoNodo } from '@/types';

interface NoteMetadataProps {
  tipoNodo: TipoNodo;
  setTipoNodo: (tipo: TipoNodo) => void;
  importancia: number;
  setImportancia: (val: number) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (val: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent) => void;
}

const TIPO_OPCIONES: { value: TipoNodo; label: string }[] = [
  { value: 'concepto', label: '🧠 Concepto' },
  { value: 'proyecto', label: '🚀 Proyecto' },
  { value: 'arquitectura', label: '🏗️ Arquitectura' },
  { value: 'feature', label: '✨ Feature' },
  { value: 'database', label: '🗄️ Database' },
  { value: 'api', label: '🔌 API' },
  { value: 'seguridad', label: '🛡️ Seguridad' },
  { value: 'persona', label: '👤 Persona' },
  { value: 'tarea', label: '✅ Tarea' },
  { value: 'recurso', label: '📚 Recurso' },
  { value: 'bug', label: '🐛 Bug' },
];

export default function NoteMetadata({
  tipoNodo,
  setTipoNodo,
  importancia,
  setImportancia,
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  onTagKeyDown,
}: NoteMetadataProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 p-4 bg-gb-surface rounded-xl border border-gb-border">
      {/* Tipo de Nodo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gb-text/80">Tipo</label>
        <select
          value={tipoNodo}
          onChange={(e) => setTipoNodo(e.target.value as TipoNodo)}
          className="bg-gb-bg border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gb-accent text-gb-text"
        >
          {TIPO_OPCIONES.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>

      {/* Importancia */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gb-text/80 flex justify-between">
          <span>Importancia</span>
          <span>{Math.round(importancia * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={importancia}
          onChange={(e) => setImportancia(parseFloat(e.target.value))}
          className="w-full accent-gb-accent"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gb-text/80">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gb-accent/20 text-gb-accent text-xs rounded-full flex items-center gap-1 border border-gb-accent/30"
            >
              #{tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:text-gb-error ml-1 focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            placeholder="Añadir tag (Enter)"
            className="flex-1 bg-gb-bg border border-gb-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gb-accent text-gb-text"
          />
          <button
            onClick={onAddTag}
            className="px-3 py-1.5 bg-gb-surface border border-gb-border hover:bg-gb-accent/10 rounded-lg text-sm text-gb-text transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
