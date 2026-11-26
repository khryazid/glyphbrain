'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useGraphStore } from '@/stores/graph-store';

export default function Toolbar() {
  const { openSidebar, selectNode, triggerNewNote } = useAppStore();
  const { graphData, fetchGraphFromSupabase, isLoading } = useGraphStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Escuchar evento de teclado Ctrl+K disparado desde page.tsx
  useEffect(() => {
    const handleToggleSearch = () => setShowSearch((prev) => !prev);
    window.addEventListener('glyphbrain:toggle-search', handleToggleSearch);
    return () => window.removeEventListener('glyphbrain:toggle-search', handleToggleSearch);
  }, []);

  const filteredNodes = searchQuery.trim()
    ? graphData.nodes.filter((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleNewNote = () => {
    triggerNewNote();
  };

  const handleSelectSearchResult = (nodeId: string) => {
    selectNode(nodeId);
    setSearchQuery('');
    setShowSearch(false);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-20 flex items-center gap-3 pointer-events-none">
      {/* Logo */}
      <div className="glass rounded-xl px-4 py-2.5 pointer-events-auto flex items-center gap-2">
        <span className="text-gb-accent text-lg">🧠</span>
        <span className="font-semibold text-gb-text text-sm">GlyphBrain</span>
      </div>

      {/* Buscador */}
      <div className="relative pointer-events-auto">
        <div className="glass rounded-xl flex items-center">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 text-gb-text-secondary hover:text-gb-accent transition-colors"
            title="Buscar notas"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notas..."
              autoFocus
              className="bg-transparent border-none text-sm text-gb-text placeholder:text-gb-text-muted
                focus:outline-none w-48 pr-3"
            />
          )}
        </div>

        {/* Resultados de búsqueda */}
        {showSearch && filteredNodes.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-64 glass rounded-xl overflow-hidden">
            {filteredNodes.slice(0, 8).map((node) => (
              <button
                key={node.id}
                onClick={() => handleSelectSearchResult(node.id)}
                className="w-full text-left px-3 py-2 text-sm text-gb-text
                  hover:bg-gb-hover transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-gb-accent" />
                {node.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Acciones */}
      <div className="glass rounded-xl flex items-center gap-1 px-1 pointer-events-auto">
        <button
          onClick={handleNewNote}
          className="px-3 py-2 text-sm text-gb-text-secondary hover:text-gb-accent
            transition-colors flex items-center gap-1.5"
          title="Nueva nota"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="hidden sm:inline">Nueva Nota</span>
        </button>

        <div className="w-px h-5 bg-gb-border" />

        <button
          onClick={() => openSidebar('chat')}
          className="px-3 py-2 text-sm text-gb-text-secondary hover:text-gb-accent
            transition-colors flex items-center gap-1.5"
          title="Chat con IA"
        >
          <span>🧠</span>
          <span className="hidden sm:inline">Chat IA</span>
        </button>

        <div className="w-px h-5 bg-gb-border" />

        <button
          onClick={fetchGraphFromSupabase}
          disabled={isLoading}
          className="px-3 py-2 text-sm text-gb-text-secondary hover:text-gb-accent
            transition-colors disabled:opacity-50"
          title="Sincronizar con Supabase"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={isLoading ? 'animate-spin' : ''}
          >
            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="glass rounded-xl px-3 py-2 pointer-events-auto">
        <span className="text-xs text-gb-text-muted">
          {graphData.nodes.length} nodos · {graphData.links.length} conexiones
        </span>
      </div>
    </div>
  );
}
