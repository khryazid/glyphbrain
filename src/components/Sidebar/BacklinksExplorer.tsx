'use client';

import React from 'react';
import type { GraphData } from '@/types';

interface BacklinksExplorerProps {
  selectedNodeId: string;
  graphData: GraphData;
  onSelectNode: (id: string) => void;
}

export default function BacklinksExplorer({
  selectedNodeId,
  graphData,
  onSelectNode,
}: BacklinksExplorerProps) {
  // Get connections for the selected node
  const getConexiones = () => {
    if (!selectedNodeId || !graphData.nodes.length) return [];
    
    return graphData.links
      .filter((link) => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        return sourceId === selectedNodeId || targetId === selectedNodeId;
      })
      .map((link) => {
        const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        
        const isSaliente = sourceId === selectedNodeId;
        const otherNodeId = isSaliente ? targetId : sourceId;
        const otherNode = graphData.nodes.find(n => n.id === otherNodeId);
        
        return {
          otherNode,
          isSaliente,
          tipo: link.tipo || 'relacionado',
          metadata: link.metadata,
        };
      })
      .filter((c) => c.otherNode !== undefined);
  };

  const conexiones = getConexiones();

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gb-text">
        <span>🔗</span> Conexiones (Backlinks)
      </h3>
      
      {conexiones.length > 0 ? (
        <div className="flex flex-col gap-2">
          {conexiones.map((conn, idx) => {
            const nodo = conn.otherNode!;
            return (
              <div
                key={`${nodo.id}-${idx}`}
                onClick={() => onSelectNode(nodo.id)}
                className="p-3 rounded-lg bg-gb-surface border border-gb-border hover:border-gb-accent hover:bg-gb-accent/5 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gb-text/60">
                    {conn.isSaliente ? '↗️ Saliente' : '↙️ Entrante'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gb-bg border border-gb-border text-gb-text/80 capitalize">
                    {conn.tipo}
                  </span>
                  {conn.tipo === 'semantica' && conn.metadata?.similitud && (
                    <span className="text-xs text-gb-accent/80 ml-auto">
                      {Math.round(conn.metadata.similitud * 100)}% sim.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{nodo.icono || '📄'}</span>
                  <span className="font-medium text-sm text-gb-text group-hover:text-gb-accent transition-colors truncate">
                    {nodo.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-gb-text/50 border border-dashed border-gb-border rounded-xl">
          <p className="text-sm">No hay conexiones para esta nota aún.</p>
        </div>
      )}
    </div>
  );
}
