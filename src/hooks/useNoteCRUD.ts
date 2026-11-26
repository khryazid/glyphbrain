import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useGraphStore } from '@/stores/graph-store';
import {
  fetchNotaById,
  createNota,
  updateNota,
  deleteNota,
  updateNotaEmbedding,
  buscarNotasSimilares,
  createRelacion,
} from '@/lib/supabase/notas';
import type { TipoNodo } from '@/types';

export function useNoteCRUD() {
  const { selectedNodeId, newNoteTrigger, closeSidebar } = useAppStore();
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const resetForm = useCallback(() => {
    setTitulo('');
    setContenido('');
    setTags([]);
    setTagInput('');
    setImportancia(0.5);
    setTipoNodo('concepto');
    setIcono('');
    setSaveStatus('idle');
  }, []);

  const loadNota = useCallback(async (id: string) => {
    if (useMockData) {
      const node = graphData.nodes.find(n => n.id === id);
      if (node) {
        setTitulo(node.name || '');
        setContenido(node.content || '');
        setTags(node.tags || []);
        setImportancia(node.importancia || 0.5);
        setTipoNodo(node.tipo || 'concepto');
        setIcono(node.icono || '');
      }
      return;
    }

    setIsLoadingNota(true);
    try {
      const nota = await fetchNotaById(id);
      if (nota) {
        setTitulo(nota.titulo || '');
        setContenido(nota.contenido || '');
        setTags(nota.tags || []);
        setImportancia(nota.importancia || 0.5);
        setTipoNodo(nota.tipo || 'concepto');
        setIcono(nota.icono || '');
      }
    } catch (error) {
      console.error('Error al cargar nota:', error);
    } finally {
      setIsLoadingNota(false);
    }
  }, [useMockData, graphData.nodes]);

  useEffect(() => {
    if (selectedNodeId) {
      loadNota(selectedNodeId);
    } else {
      resetForm();
    }
  }, [selectedNodeId, newNoteTrigger, loadNota, resetForm]);

  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleSave = useCallback(async () => {
    if (useMockData || !titulo.trim()) return;

    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const notaData = {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tags,
        importancia,
        tipo: tipoNodo,
        icono: icono.trim() || undefined,
      };

      let currentNotaId = selectedNodeId;

      if (currentNotaId) {
        await updateNota(currentNotaId, notaData);
      } else {
        const newNota = await createNota(notaData);
        currentNotaId = newNota.id;
      }

      // Generate embedding and find similar
      try {
        const res = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${titulo}\n\n${contenido}` }),
        });

        if (res.ok) {
          const { embedding } = await res.json();
          if (embedding && currentNotaId) {
            await updateNotaEmbedding(currentNotaId, embedding);
            
            // Auto link similar
            const similarNotas = await buscarNotasSimilares(embedding, 3, 0.65);
            for (const sim of similarNotas) {
              if (sim.id !== currentNotaId) {
                // Ensure we don't have this relation already
                const existRel = graphData.links.find(
                  l => (l.source === currentNotaId && l.target === sim.id) ||
                       (l.source === sim.id && l.target === currentNotaId)
                );
                if (!existRel) {
                  await createRelacion(currentNotaId, sim.id, 'semantica', { similitud: sim.similitud });
                }
              }
            }
          }
        }
      } catch (embErr) {
        console.error('Error generando embeddings o enlaces semánticos:', embErr);
      }

      await fetchGraphFromSupabase();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      if (!selectedNodeId) {
         // Optionally close or select the new note
         closeSidebar();
      }
    } catch (error) {
      console.error('Error guardando nota:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [
    useMockData, titulo, contenido, tags, importancia, tipoNodo, icono,
    selectedNodeId, graphData.links, fetchGraphFromSupabase, closeSidebar
  ]);

  const handleDelete = useCallback(async () => {
    if (useMockData || !selectedNodeId) return;

    if (window.confirm('¿Seguro que deseas eliminar esta nota?')) {
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
    }
  }, [useMockData, selectedNodeId, fetchGraphFromSupabase, closeSidebar]);

  return {
    titulo,
    setTitulo,
    contenido,
    setContenido,
    tags,
    setTags,
    tagInput,
    setTagInput,
    importancia,
    setImportancia,
    tipoNodo,
    setTipoNodo,
    icono,
    setIcono,
    isSaving,
    isDeleting,
    isLoadingNota,
    saveStatus,
    loadNota,
    handleSave,
    handleDelete,
    handleAddTag,
    handleRemoveTag,
    handleTagKeyDown,
    resetForm,
  };
}
