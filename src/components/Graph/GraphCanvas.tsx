'use client';

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/app-store';
import { useGraphStore } from '@/stores/graph-store';
import type { GraphNode, GraphLink } from '@/types';

// Dynamic import — react-force-graph-2d requires browser APIs
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gb-bg">
      <div className="text-gb-text-secondary text-lg">Cargando grafo...</div>
    </div>
  ),
});

// Helper para convertir hex a rgb para transparencias
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '79, 209, 197';
}

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Stores
  const { hoveredNodeId, setHoveredNode, selectNode, selectedNodeId } = useAppStore();
  const { graphData, loadMockData, fetchGraphFromSupabase, isLoading } = useGraphStore();

  // Cargar datos: intenta Supabase primero, si está vacío usa mock
  useEffect(() => {
    async function loadData() {
      await fetchGraphFromSupabase();
      // Si no hay datos reales, usar mock
      const state = useGraphStore.getState();
      if (state.graphData.nodes.length === 0) {
        loadMockData();
      }
    }
    loadData();
  }, [fetchGraphFromSupabase, loadMockData]);

  // Manejar resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
        setHeight(containerRef.current.offsetHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Set de vecinos del nodo en hover
  const highlightNodes = useMemo(() => {
    const neighbors = new Set<string>();
    if (hoveredNodeId) {
      neighbors.add(hoveredNodeId);
      graphData.links.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === hoveredNodeId) neighbors.add(targetId);
        if (targetId === hoveredNodeId) neighbors.add(sourceId);
      });
    }
    return neighbors;
  }, [hoveredNodeId, graphData.links]);

  // Highlight links
  const highlightLinks = useMemo(() => {
    const links = new Set<string>();
    if (hoveredNodeId) {
      graphData.links.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === hoveredNodeId || targetId === hoveredNodeId) {
          links.add(`${sourceId}-${targetId}`);
        }
      });
    }
    return links;
  }, [hoveredNodeId, graphData.links]);

  // Helper para obtener el color del nodo
  const getNodeColor = (node: any) => {
    const typeColors: Record<string, string> = {
      concepto: '#00f0ff', // Cyan Neon
      proyecto: '#ff003c', // Rosa/Rojo Neon
      persona: '#ffe600',  // Amarillo Neon
      tarea: '#b100e8',    // Púrpura Neon
      recurso: '#0051ff',  // Azul eléctrico
      arquitectura: '#ff7300', // Naranja Neon
      feature: '#00ff00',      // Verde Lima Neon
      database: '#ff00aa',     // Rosa Fuerte Neon
      api: '#aeff00',          // Verde Amarillento Neon
      bug: '#ff0000',          // Rojo Sangre Neon
      seguridad: '#ffffff',    // Blanco / Plata
    };
    return node.color_personalizado || typeColors[node.tipo_nodo || 'concepto'] || '#00f0ff';
  };

  // Custom node rendering (Neon / Cyberpunk style)
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = node.id === hoveredNodeId;
      const isSelected = node.id === selectedNodeId;
      const isNeighbor = hoveredNodeId && highlightNodes.has(node.id) && !isHovered;

      let opacity = 1;
      if (hoveredNodeId && !isHovered && !isNeighbor) {
        opacity = 0.1; // Hacer los no-relacionados muy transparentes
      }

      const baseColor = getNodeColor(node);
      const radius = Math.sqrt(node.val || 4) * 2 + 2;

      ctx.save();
      ctx.globalAlpha = opacity;

      // Glow effect (Sombra de neón)
      ctx.shadowBlur = isHovered || isSelected ? 25 : 12;
      ctx.shadowColor = baseColor;

      // Outer ring (borde neón brillante)
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.lineWidth = isHovered || isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = baseColor;
      ctx.stroke();

      // Inner core (centro oscuro o semi-transparente)
      ctx.shadowBlur = 0; // Apagar glow para el centro
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius - 1, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered || isSelected ? `rgba(${hexToRgb(baseColor)}, 0.4)` : '#0F1117';
      ctx.fill();

      // Extra highlight ring para nodos seleccionados
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      // Dibujar icono si existe y hay suficiente zoom
      if (node.icono && globalScale > 1.5) {
        ctx.font = `${radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = opacity;
        ctx.fillText(node.icono, node.x, node.y + (radius * 0.1));
        ctx.globalAlpha = 1;
      }

      // Label rendering
      if (globalScale > 1.2 || isHovered) {
        const label = node.name || '';
        const fontSize = isHovered ? 13 / globalScale : 10 / globalScale;
        ctx.font = `${isHovered ? '600' : '400'} ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Truncate text if it's too long and not hovered
        const MAX_CHARS = 25;
        let displayText = label;
        if (!isHovered && label.length > MAX_CHARS) {
           displayText = label.substring(0, MAX_CHARS) + '...';
        }
        
        const textY = node.y + radius + (4 / globalScale);
        
        if (isHovered) {
           // Dibujar un fondo estilo "píldora" (pill) para mejorar legibilidad
           const textWidth = ctx.measureText(displayText).width;
           const paddingX = 8 / globalScale;
           const paddingY = 4 / globalScale;
           const bgWidth = textWidth + (paddingX * 2);
           const bgHeight = fontSize + (paddingY * 2);
           const bgX = node.x - (bgWidth / 2);
           const bgY = textY - paddingY;
           
           ctx.fillStyle = 'rgba(15, 17, 23, 0.85)'; // Fondo oscuro semi-transparente
           
           // Soporte para roundRect si el navegador lo soporta, fallback a rect
           if (ctx.roundRect) {
             ctx.beginPath();
             ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4 / globalScale);
             ctx.fill();
           } else {
             ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
           }
           
           // Borde sutil del color del nodo
           ctx.lineWidth = 1 / globalScale;
           ctx.strokeStyle = `rgba(${hexToRgb(baseColor)}, 0.4)`;
           if (typeof ctx.roundRect === 'function') ctx.stroke();
           else ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        } else {
           // Delineado oscuro (Halo) para cuando NO está hovered y cruza líneas de neón
           ctx.lineJoin = 'round';
           ctx.lineWidth = 3 / globalScale;
           ctx.strokeStyle = `rgba(15, 17, 23, ${opacity})`; // Color de fondo del canvas
           ctx.strokeText(displayText, node.x, textY);
        }

        ctx.fillStyle = isHovered ? '#FFFFFF' : `rgba(212, 216, 227, ${opacity})`;
        ctx.fillText(displayText, node.x, textY);
      }
    },
    [hoveredNodeId, selectedNodeId, highlightNodes]
  );

  // Custom link rendering (Gradient lines)
  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const start = link.source;
      const end = link.target;
      
      // Asegurarse de que tenemos coordenadas (en inicialización pueden ser IDs)
      if (typeof start.x !== 'number' || typeof end.x !== 'number') return;

      const linkKey = `${start.id}-${end.id}`;
      const isHighlighted = !hoveredNodeId || highlightLinks.has(linkKey);
      
      ctx.globalAlpha = isHighlighted ? 0.8 : 0.05;
      
      // Crear gradiente lineal entre los dos nodos
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, getNodeColor(start));
      grad.addColorStop(1, getNodeColor(end));

      ctx.strokeStyle = grad;
      ctx.lineWidth = (link.weight || 0.5) * (isHighlighted ? 2.5 : 1);
      
      // Glow suave en las líneas
      ctx.shadowBlur = isHighlighted ? 5 : 0;
      ctx.shadowColor = getNodeColor(start);
      
      // Dibujar línea curva (Bezier) para estilo "orgánico" / "red neuronal"
      // En lugar de línea recta, añadimos una pequeña curvatura
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      // Offset perpendicular
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const offset = 15; // cantidad de curvatura
      const cpX = midX - dy * (offset / Math.sqrt(dx*dx + dy*dy));
      const cpY = midY + dx * (offset / Math.sqrt(dx*dx + dy*dy));

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      // Usar curva si quieres estilo orgánico, o línea recta
      ctx.quadraticCurveTo(cpX, cpY, end.x, end.y); 
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0; // reset
    },
    [hoveredNodeId, highlightLinks]
  );

  // Handlers
  const handleNodeHover = useCallback(
    (node: any) => {
      setHoveredNode(node ? node.id : null);
      if (containerRef.current) {
        containerRef.current.style.cursor = node ? 'pointer' : 'default';
      }
    },
    [setHoveredNode]
  );

  const handleNodeClick = useCallback(
    (node: any) => {
      selectNode(node.id);
      // Centrar cámara en el nodo
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 400);
        graphRef.current.zoom(2.5, 400);
      }
    },
    [selectNode]
  );

  const handleBackgroundClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gb-bg">
        <div className="text-gb-text-secondary text-lg">Cargando red neuronal...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#181B28] via-[#0D0F17] to-[#05060A]">
      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={width}
          height={height}
          graphData={graphData}
          nodeLabel={() => ''}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const radius = Math.sqrt(node.val || 4) * 2 + 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObject={paintLink}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(link: any) => getNodeColor(link.target)}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          backgroundColor="#0F1117"
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          warmupTicks={50}
          cooldownTicks={100}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.3}
          maxZoom={8}
        />
      )}
    </div>
  );
}
