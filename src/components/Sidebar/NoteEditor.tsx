'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/app-store';
import { useGraphStore } from '@/stores/graph-store';
import type { TipoNodo } from '@/types';
import {
  fetchNotaById,
  createNota,
  updateNota,
  deleteNota,
  updateNotaEmbedding,
  buscarNotasSimilares,
  createRelacion,
} from '@/lib/supabase/notas';

// Dynamic import del editor de bloques
const BlockEditor = dynamic(() => import('./BlockEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gb-surface rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-gb-text-muted text-sm">Cargando editor...</span>
    </div>
  ),
});

export default function NoteEditor() {
  const { selectedNodeId, newNoteTrigger, setSidebarTab, closeSidebar } = useAppStore();
  const { fetchGraphFromSupabase, graphData, useMockData } = useGraphStore();

  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [importancia, setImportancia] = useState(0.5);
  const [tipoNodo, setTipoNodo] = useState<TipoNodo>('concepto');
  const [icono, setIcono] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingNota, setIsLoadingNota] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle' as 'idle' | 'saved' | 'error');

  // Cargar datos del nodo seleccionado
  const loadNota = useCallback(async (id: string) => {
    setIsLoadingNota(true);
    try {
      if (useMockData) {
        // En modo mock, usar datos del graph store
        const node = graphData.nodes.find((n) => n.id === id);
        if (node) {
          setTitulo(node.name);
          setContenido(`# ${node.name}\n\nContenido de ejemplo para **${node.name}**.\n\nCrea notas reales desde el editor para reemplazar los datos mock.`);
          setTags(node.tags || []);
          setImportancia(node.importancia || 0.5);
          setTipoNodo(node.tipo_nodo || 'concepto');
          setIcono(node.icono || '');
        }
      } else {
        // En modo real, cargar desde Supabase
        const nota = await fetchNotaById(id);
        if (nota) {
          setTitulo(nota.titulo);
          setContenido(nota.contenido);
          setTags(nota.tags || []);
          setImportancia(nota.importancia);
          setTipoNodo(nota.tipo_nodo || 'concepto');
          setIcono(nota.icono || '');
        }
      }
    } catch (error) {
      console.error('Error cargando nota:', error);
    } finally {
      setIsLoadingNota(false);
    }
  }, [useMockData, graphData.nodes]);

  useEffect(() => {
    if (selectedNodeId) {
      loadNota(selectedNodeId);
    } else {
      // Nueva nota — limpiar campos
      setTitulo('');
      setContenido('');
      setTags([]);
      setTagInput('');
      setImportancia(0.5);
      setTipoNodo('concepto');
      setIcono('');
    }
    setSaveStatus('idle');
  }, [selectedNodeId, newNoteTrigger, loadNota]);

  // Tags
  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Guardar nota (crear o actualizar)
  const handleSave = async () => {
    if (!titulo.trim()) return;
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      let notaId = selectedNodeId;

      if (selectedNodeId) {
        // Actualizar nota existente
        await updateNota(selectedNodeId, { titulo, contenido, tags, importancia, tipo_nodo: tipoNodo, icono });
      } else {
        // Crear nueva nota
        const nuevaNota = await createNota({ titulo, contenido, tags, importancia, tipo_nodo: tipoNodo, icono });
        notaId = nuevaNota.id;
      }

      // Generar y guardar embedding
      if (notaId) {
        try {
          const res = await fetch('/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, contenido }),
          });
          
          if (res.ok) {
            const { embedding } = await res.json();
            await updateNotaEmbedding(notaId, embedding);
            
            // MÁGIA SEMÁNTICA: Buscar notas similares y conectarlas automáticamente
            try {
              const similares = await buscarNotasSimilares(embedding, 3, 0.65); // Threshold alto para evitar falsos positivos
              for (const sim of similares) {
                if (sim.id !== notaId) {
                  try {
                    await createRelacion({
                      origen_id: notaId,
                      destino_id: sim.id,
                      tipo: 'semantica',
                      peso: sim.similarity
                    });
                  } catch (relError) {
                    // Ignorar error si la relación ya existe (restricción UNIQUE)
                  }
                }
              }
            } catch (err) {
              console.error('Error creando relaciones semánticas:', err);
            }
          }
        } catch (embError) {
          console.warn('Embedding no generado (la nota se guardó sin vector):', embError);
        }
      }

      // Refrescar el grafo
      await fetchGraphFromSupabase();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error guardando nota:', error.message || error.details || JSON.stringify(error) || error);
      alert(`Error de base de datos: ${error.message || error.details || 'Error desconocido'}`);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar nota
  const handleDelete = async () => {
    if (!selectedNodeId) return;
    if (!confirm('¿Eliminar esta nota? Se eliminarán también sus conexiones.')) return;

    setIsDeleting(true);
    try {
      await deleteNota(selectedNodeId);
      await fetchGraphFromSupabase();
      closeSidebar();
    } catch (error) {
      console.error('Error eliminando nota:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingNota) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gb-text-secondary">Cargando nota...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gb-bg relative">
      {/* Top Banner & Actions */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-gb-border bg-gb-bg/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gb-text-secondary">
            {saveStatus === 'saved' ? '✅ Guardado' : saveStatus === 'error' ? '❌ Error' : isSaving ? 'Guardando...' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedNodeId && (
            <button onClick={handleDelete} disabled={isDeleting} className="p-1.5 text-gb-text-muted hover:text-gb-error transition-colors" title="Eliminar nota">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={!titulo.trim() || isSaving} 
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-gb-accent text-gb-bg hover:bg-gb-accent/90 disabled:opacity-50 transition-colors"
          >
            {selectedNodeId ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 max-w-3xl mx-auto w-full gap-4">
        {/* ICON & TITLE (Notion style) */}
        <div className="group relative">
          <input
            type="text"
            value={icono}
            onChange={(e) => setIcono(e.target.value)}
            placeholder="📄"
            className="text-6xl mb-4 bg-transparent outline-none w-24 cursor-text hover:bg-white/5 rounded-lg transition-colors placeholder:opacity-50"
          />
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Sin Título..."
            className="w-full text-4xl font-bold bg-transparent outline-none text-gb-text placeholder:text-gb-text-muted hover:bg-white/5 rounded-lg py-1 transition-colors"
          />
        </div>

        {/* METADATA PROPERTIES */}
        <div className="flex flex-col gap-2 py-4 border-y border-gb-border/50 text-sm">
          {/* Tipo */}
          <div className="flex items-center gap-4">
            <span className="text-gb-text-muted w-24">Tipo</span>
            <select
              value={tipoNodo}
              onChange={(e) => setTipoNodo(e.target.value as TipoNodo)}
              className="bg-transparent text-gb-text hover:bg-white/5 outline-none rounded-md px-1 py-0.5 cursor-pointer appearance-none border border-transparent hover:border-gb-border/50 transition-all"
            >
              <option className="bg-gb-bg text-gb-text" value="concepto">💡 Concepto</option>
              <option className="bg-gb-bg text-gb-text" value="proyecto">🏗️ Proyecto</option>
              <option className="bg-gb-bg text-gb-text" value="arquitectura">🏛️ Arquitectura</option>
              <option className="bg-gb-bg text-gb-text" value="feature">✨ Feature / Módulo</option>
              <option className="bg-gb-bg text-gb-text" value="database">🗄️ Base de Datos</option>
              <option className="bg-gb-bg text-gb-text" value="api">🔌 API / Endpoint</option>
              <option className="bg-gb-bg text-gb-text" value="seguridad">🛡️ Seguridad</option>
              <option className="bg-gb-bg text-gb-text" value="persona">👤 Persona</option>
              <option className="bg-gb-bg text-gb-text" value="tarea">✅ Tarea</option>
              <option className="bg-gb-bg text-gb-text" value="recurso">📚 Recurso</option>
              <option className="bg-gb-bg text-gb-text" value="bug">🐛 Bug / Problema</option>
            </select>
          </div>
          
          {/* Importancia */}
          <div className="flex items-center gap-4 group">
            <span className="text-gb-text-muted w-24">Importancia</span>
            <div className="flex-1 flex items-center gap-3">
              <input 
                type="range" 
                min="0" max="1" step="0.05" 
                value={importancia} 
                onChange={(e) => setImportancia(parseFloat(e.target.value))} 
                className="w-32 accent-gb-accent opacity-60 group-hover:opacity-100 transition-opacity" 
              />
              <span className="text-gb-text-secondary text-xs">{Math.round(importancia * 100)}%</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-4">
            <span className="text-gb-text-muted w-24 pt-1">Etiquetas</span>
            <div className="flex-1 flex flex-wrap gap-1.5 items-center">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-gb-surface border border-gb-border text-gb-text-secondary">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-gb-error text-gb-text-muted">×</button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="+ Agregar"
                className="bg-transparent text-gb-text placeholder:text-gb-text-muted/50 text-xs w-24 px-2 py-1 outline-none hover:bg-white/5 rounded-md transition-colors"
              />
            </div>
          </div>
        </div>



        {/* EDITOR DE BLOQUES */}
        <div className="flex-1 min-h-[400px] -mx-4 mt-4">
          <BlockEditor
            key={selectedNodeId ? `edit-${selectedNodeId}` : `new-${newNoteTrigger}`}
            initialMarkdown={contenido}
            onChange={(val) => setContenido(val)}
            availableNodes={graphData.nodes.map(n => ({ id: n.id, title: n.name, icon: n.icono }))}
            onNodeLinked={async (targetId) => {
              if (!selectedNodeId) return; // Si es una nota nueva, aún no se puede enlazar hasta guardar
              try {
                await createRelacion({
                  origen_id: selectedNodeId,
                  destino_id: targetId,
                  tipo: 'manual',
                  peso: 1.0
                });
                await fetchGraphFromSupabase(); // Refrescar grafo para mostrar la línea
              } catch (e) {
                console.error("Relación ya existe o error:", e);
              }
            }}
          />
        </div>

        {/* EXPLORADOR DE CONTEXTO (Backlinks) */}
        {selectedNodeId && (
          <div className="mt-12 pt-8 border-t border-gb-border pb-12">
            <h3 className="text-sm font-semibold text-gb-text-secondary mb-4 flex items-center gap-2">
              <span>🔗</span> Conexiones (Backlinks)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {graphData.nodes.length > 0 && graphData.links.length > 0 ? (
                graphData.links
                  .filter((l: any) => (typeof l.source === 'object' ? l.source.id : l.source) === selectedNodeId || (typeof l.target === 'object' ? l.target.id : l.target) === selectedNodeId)
                  .map((link: any, i: number) => {
                    const sId = typeof link.source === 'object' ? link.source.id : link.source;
                    const tId = typeof link.target === 'object' ? link.target.id : link.target;
                    const isSource = sId === selectedNodeId;
                    const otherNodeId = isSource ? tId : sId;
                    const otherNode = graphData.nodes.find((n: any) => n.id === otherNodeId);
                    
                    if (!otherNode) return null;
                    
                    return (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 p-3 rounded-lg border border-gb-border/50 bg-gb-surface/30 hover:bg-gb-surface cursor-pointer transition-colors group"
                        onClick={() => selectNode(otherNode.id)}
                      >
                        <div className="text-2xl">{otherNode.icono || '📄'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gb-text truncate group-hover:text-gb-accent transition-colors">
                            {otherNode.name}
                          </div>
                          <div className="text-xs text-gb-text-muted flex items-center gap-2 mt-1">
                            {isSource ? <span title="Conexión saliente">↗️ Saliente</span> : <span title="Conexión entrante">↙️ Entrante</span>}
                            <span>•</span>
                            <span className="capitalize">{link.type || 'Manual'}</span>
                            {link.type === 'semantica' && link.weight && (
                              <>
                                <span>•</span>
                                <span className="text-gb-accent">{(link.weight * 100).toFixed(0)}% similitud</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs text-gb-text-muted">No hay conexiones para esta nota aún.</p>
              )}
              {graphData.links.filter((l: any) => (typeof l.source === 'object' ? l.source.id : l.source) === selectedNodeId || (typeof l.target === 'object' ? l.target.id : l.target) === selectedNodeId).length === 0 && (
                <p className="text-xs text-gb-text-muted">Este nodo está flotando en el espacio sin conexiones.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
