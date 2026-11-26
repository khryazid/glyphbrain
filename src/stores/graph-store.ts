import { create } from 'zustand';
import type { GraphData, GraphNode, GraphLink, Nota, Relacion } from '@/types';

// Colores para aristas según tipo
const LINK_COLORS: Record<string, string> = {
  'manual': '#63B3ED',
  'sugerida-por-ia': '#B794F4',
  'semantica': '#68D391',
};

// Convertir datos de Supabase a formato del grafo
function transformToGraphData(notas: Nota[], relaciones: Relacion[]): GraphData {
  // Contar conexiones por nodo
  const connectionCount: Record<string, number> = {};
  relaciones.forEach((r) => {
    connectionCount[r.origen_id] = (connectionCount[r.origen_id] || 0) + 1;
    connectionCount[r.destino_id] = (connectionCount[r.destino_id] || 0) + 1;
  });

  const nodes: GraphNode[] = notas.map((nota) => {
    const connections = connectionCount[nota.id] || 0;
    return {
      id: nota.id,
      name: nota.titulo,
      val: Math.max(2, connections * 2 + nota.importancia * 5),
      color: '#4FD1C5',
      tags: nota.tags,
      importancia: nota.importancia,
      connections: connections,
      tipo_nodo: nota.tipo_nodo || 'concepto',
      icono: nota.icono || '',
    };
  });

  const links: GraphLink[] = relaciones.map((rel) => ({
    source: rel.origen_id,
    target: rel.destino_id,
    type: rel.tipo,
    weight: rel.peso,
    color: LINK_COLORS[rel.tipo] || '#63B3ED',
  }));

  return { nodes, links };
}

// Datos mock para desarrollo
function getMockData(): GraphData {
  const mockNodes: GraphNode[] = [
    { id: '1', name: 'Machine Learning', val: 12, color: '#4FD1C5', tags: ['ia', 'tecnología'], importancia: 0.9, connections: 4, tipo_nodo: 'concepto', icono: '🤖' },
    { id: '2', name: 'Redes Neuronales', val: 10, color: '#4FD1C5', tags: ['ia', 'deep-learning'], importancia: 0.85, connections: 3, tipo_nodo: 'concepto' },
    { id: '3', name: 'Python', val: 8, color: '#4FD1C5', tags: ['programación'], importancia: 0.7, connections: 3, tipo_nodo: 'recurso', icono: '🐍' },
    { id: '4', name: 'TensorFlow', val: 6, color: '#4FD1C5', tags: ['framework', 'ia'], importancia: 0.6, connections: 2, tipo_nodo: 'recurso' },
    { id: '5', name: 'Datos Estructurados', val: 5, color: '#4FD1C5', tags: ['datos'], importancia: 0.5, connections: 2, tipo_nodo: 'concepto' },
    { id: '6', name: 'NLP', val: 7, color: '#4FD1C5', tags: ['ia', 'lenguaje'], importancia: 0.75, connections: 2, tipo_nodo: 'concepto' },
    { id: '7', name: 'Computer Vision', val: 6, color: '#4FD1C5', tags: ['ia', 'visión'], importancia: 0.65, connections: 1, tipo_nodo: 'concepto' },
    { id: '8', name: 'Transfer Learning', val: 5, color: '#4FD1C5', tags: ['ia', 'entrenamiento'], importancia: 0.55, connections: 2, tipo_nodo: 'concepto' },
    { id: '9', name: 'GPT y LLMs', val: 9, color: '#4FD1C5', tags: ['ia', 'lenguaje'], importancia: 0.9, connections: 3, tipo_nodo: 'proyecto', icono: '🚀' },
    { id: '10', name: 'Embeddings', val: 7, color: '#4FD1C5', tags: ['ia', 'vectores'], importancia: 0.7, connections: 3, tipo_nodo: 'concepto' },
    { id: '11', name: 'Bases Vectoriales', val: 5, color: '#4FD1C5', tags: ['bases-de-datos'], importancia: 0.6, connections: 2, tipo_nodo: 'recurso' },
    { id: '12', name: 'RAG', val: 6, color: '#4FD1C5', tags: ['ia', 'retrieval'], importancia: 0.65, connections: 2, tipo_nodo: 'concepto' },
  ];

  const mockLinks: GraphLink[] = [
    { source: '1', target: '2', type: 'manual', weight: 0.9, color: '#63B3ED' },
    { source: '1', target: '3', type: 'manual', weight: 0.7, color: '#63B3ED' },
    { source: '1', target: '5', type: 'semantica', weight: 0.5, color: '#68D391' },
    { source: '2', target: '4', type: 'manual', weight: 0.8, color: '#63B3ED' },
    { source: '2', target: '7', type: 'sugerida-por-ia', weight: 0.6, color: '#B794F4' },
    { source: '3', target: '4', type: 'manual', weight: 0.75, color: '#63B3ED' },
    { source: '6', target: '9', type: 'manual', weight: 0.85, color: '#63B3ED' },
    { source: '6', target: '10', type: 'semantica', weight: 0.7, color: '#68D391' },
    { source: '8', target: '2', type: 'sugerida-por-ia', weight: 0.65, color: '#B794F4' },
    { source: '8', target: '1', type: 'semantica', weight: 0.55, color: '#68D391' },
    { source: '9', target: '10', type: 'manual', weight: 0.8, color: '#63B3ED' },
    { source: '9', target: '6', type: 'semantica', weight: 0.7, color: '#68D391' },
    { source: '10', target: '11', type: 'manual', weight: 0.75, color: '#63B3ED' },
    { source: '10', target: '12', type: 'manual', weight: 0.8, color: '#63B3ED' },
    { source: '11', target: '12', type: 'semantica', weight: 0.65, color: '#68D391' },
    { source: '3', target: '5', type: 'sugerida-por-ia', weight: 0.4, color: '#B794F4' },
  ];

  return { nodes: mockNodes, links: mockLinks };
}

interface GraphState {
  graphData: GraphData;
  rawNotas: Nota[];
  rawRelaciones: Relacion[];
  isLoading: boolean;
  useMockData: boolean;

  // Acciones
  loadMockData: () => void;
  setGraphData: (data: GraphData) => void;
  fetchGraphFromSupabase: () => Promise<void>;
  addNodeToGraph: (nota: Nota) => void;
  removeNodeFromGraph: (id: string) => void;
  addLinkToGraph: (relacion: Relacion) => void;
  refreshGraph: () => void;
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  graphData: { nodes: [], links: [] },
  rawNotas: [],
  rawRelaciones: [],
  isLoading: false,
  useMockData: true,

  loadMockData: () => {
    set({ graphData: getMockData(), useMockData: true, isLoading: false });
  },

  setGraphData: (data) => set({ graphData: data }),

  fetchGraphFromSupabase: async () => {
    set({ isLoading: true });
    try {
      const { supabase } = await import('@/lib/supabase/client');
      
      const [notasRes, relRes] = await Promise.all([
        supabase.from('notas').select('*'),
        supabase.from('relaciones').select('*'),
      ]);

      if (notasRes.error) throw notasRes.error;
      if (relRes.error) throw relRes.error;

      const notas = (notasRes.data || []) as Nota[];
      const relaciones = (relRes.data || []) as Relacion[];
      
      const graphData = transformToGraphData(notas, relaciones);
      set({ graphData, rawNotas: notas, rawRelaciones: relaciones, isLoading: false, useMockData: false });
    } catch (error) {
      console.error('Error fetching graph data:', error);
      // Fallback to mock data on error
      const mock = getMockData();
      set({ graphData: mock, isLoading: false, useMockData: true });
    }
  },

  addNodeToGraph: (nota) => {
    const { graphData, rawNotas, rawRelaciones } = get();
    const updatedNotas = [...rawNotas, nota];
    const newGraphData = transformToGraphData(updatedNotas, rawRelaciones);
    set({ graphData: newGraphData, rawNotas: updatedNotas });
  },

  removeNodeFromGraph: (id) => {
    const { rawNotas, rawRelaciones } = get();
    const updatedNotas = rawNotas.filter((n) => n.id !== id);
    const updatedRelaciones = rawRelaciones.filter((r) => r.origen_id !== id && r.destino_id !== id);
    const newGraphData = transformToGraphData(updatedNotas, updatedRelaciones);
    set({ graphData: newGraphData, rawNotas: updatedNotas, rawRelaciones: updatedRelaciones });
  },

  addLinkToGraph: (relacion) => {
    const { rawNotas, rawRelaciones } = get();
    const updatedRelaciones = [...rawRelaciones, relacion];
    const newGraphData = transformToGraphData(rawNotas, updatedRelaciones);
    set({ graphData: newGraphData, rawRelaciones: updatedRelaciones });
  },

  refreshGraph: () => {
    const { rawNotas, rawRelaciones, useMockData } = get();
    if (useMockData) {
      set({ graphData: getMockData() });
    } else {
      const newGraphData = transformToGraphData(rawNotas, rawRelaciones);
      set({ graphData: newGraphData });
    }
  },
}));

export { transformToGraphData, LINK_COLORS };
