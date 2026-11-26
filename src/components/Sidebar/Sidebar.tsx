'use client';

import { useAppStore } from '@/stores/app-store';
import NoteEditor from './NoteEditor';
import ChatPanel from './ChatPanel';

export default function Sidebar() {
  const { sidebarOpen, sidebarTab, setSidebarTab, closeSidebar } = useAppStore();

  return (
    <>
      {/* Overlay sutil cuando sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] z-40
          glass flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header con tabs */}
        <div className="flex items-center border-b border-gb-border px-4 py-3">
          {/* Tabs */}
          <div className="flex gap-1 flex-1">
            <button
              onClick={() => setSidebarTab('editor')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${sidebarTab === 'editor'
                  ? 'bg-gb-accent/15 text-gb-accent'
                  : 'text-gb-text-secondary hover:text-gb-text hover:bg-gb-hover'}`}
            >
              ✏️ Editor
            </button>
            <button
              onClick={() => setSidebarTab('chat')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${sidebarTab === 'chat'
                  ? 'bg-gb-accent/15 text-gb-accent'
                  : 'text-gb-text-secondary hover:text-gb-text hover:bg-gb-hover'}`}
            >
              🧠 Chat IA
            </button>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={closeSidebar}
            className="p-1.5 rounded-lg text-gb-text-muted hover:text-gb-text hover:bg-gb-hover transition-colors"
            title="Cerrar panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {sidebarTab === 'editor' ? <NoteEditor /> : <ChatPanel />}
        </div>
      </aside>
    </>
  );
}
