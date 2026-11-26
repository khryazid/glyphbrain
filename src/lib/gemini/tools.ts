import { Type, type FunctionDeclaration } from '@google/genai';

/**
 * Herramienta: buscar notas por similitud semántica
 * Usa pgvector para encontrar notas relacionadas con una consulta.
 */
export const buscarNotasPorSemantica: FunctionDeclaration = {
  name: 'buscar_notas_por_semantica',
  description:
    'Busca notas en la base de conocimiento por similitud semántica. ' +
    'Úsala cuando el usuario pregunte sobre un tema, quiera encontrar información relacionada, ' +
    'o cuando necesites contexto antes de responder.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'La consulta de búsqueda semántica en lenguaje natural',
      },
    },
    required: ['query'],
  },
};

/**
 * Herramienta: crear una nueva nota en la red de conocimiento
 */
export const crearNuevaNota: FunctionDeclaration = {
  name: 'crear_nueva_nota',
  description:
    'Crea una nueva nota en la red de conocimiento. ' +
    'Úsala cuando el usuario quiera guardar información nueva, ideas, o cuando identifiques ' +
    'conceptos importantes en la conversación que deberían ser parte de la red.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      titulo: {
        type: Type.STRING,
        description: 'Título conciso y descriptivo para la nota',
      },
      contenido: {
        type: Type.STRING,
        description: 'Contenido de la nota en formato Markdown',
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Etiquetas temáticas para la nota (ej: ["ia", "programación"])',
      },
      icono: {
        type: Type.STRING,
        description: 'Un emoji representativo para la nota (ej: 🤖, 🏗️, 🧠)',
      },
      tipo_nodo: {
        type: Type.STRING,
        description: 'El tipo de nota. Debe ser exactamente uno de: "concepto", "proyecto", "arquitectura", "feature", "database", "api", "seguridad", "persona", "tarea", "recurso", "bug".',
      },
    },
    required: ['titulo', 'contenido'],
  },
};

/**
 * Herramienta: conectar dos nodos en la red de conocimiento
 */
export const conectarNodos: FunctionDeclaration = {
  name: 'conectar_nodos',
  description:
    'Crea una conexión (arista) entre dos notas en la red de conocimiento. ' +
    'Úsala cuando identifiques relaciones conceptuales entre notas existentes, ' +
    'o cuando el usuario pida conectar ideas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id_origen: {
        type: Type.STRING,
        description: 'UUID de la nota de origen',
      },
      id_destino: {
        type: Type.STRING,
        description: 'UUID de la nota de destino',
      },
      tipo: {
        type: Type.STRING,
        enum: ['manual', 'sugerida-por-ia', 'semantica'],
        description: 'Tipo de relación: "sugerida-por-ia" cuando la crea el agente',
      },
    },
    required: ['id_origen', 'id_destino', 'tipo'],
  },
};

/** Todas las herramientas del agente */
export const agentTools: FunctionDeclaration[] = [
  buscarNotasPorSemantica,
  crearNuevaNota,
  conectarNodos,
];
