// === Entidades de Base de Datos ===

export interface Nota {
  id: string;
  titulo: string;
  contenido: string;
  tags: string[];
  importancia: number;
  created_at: string;
  updated_at: string;
  embedding?: number[];
}

export interface Relacion {
  id: string;
  origen_id: string;
  destino_id: string;
  tipo: 'manual' | 'sugerida-por-ia' | 'semantica';
  peso: number;
  created_at: string;
}

// === Datos del Grafo (react-force-graph) ===

export interface GraphNode {
  id: string;
  name: string;
  val: number;          // tamaño del nodo (basado en grado o importancia)
  color: string;
  tags: string[];
  importancia: number;
  connections: number;  // grado del nodo
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'manual' | 'sugerida-por-ia' | 'semantica';
  weight: number;
  color: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// === Chat ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'crear_nota' | 'conectar_nodos' | 'buscar_notas';
  description: string;
  result?: string;
}

// === Sidebar ===

export type SidebarTab = 'editor' | 'chat';
