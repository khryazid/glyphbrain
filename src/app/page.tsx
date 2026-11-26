'use client';

import GraphCanvas from '@/components/Graph/GraphCanvas';
import Sidebar from '@/components/Sidebar/Sidebar';
import Toolbar from '@/components/Toolbar/Toolbar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/stores/app-store';

export default function Home() {
  const { openSidebar, closeSidebar, triggerNewNote, sidebarOpen } = useAppStore();

  useKeyboardShortcuts({
    onSearch: () => {
      // Dispara un evento custom que el Toolbar puede escuchar
      window.dispatchEvent(new CustomEvent('glyphbrain:toggle-search'));
    },
    onNewNote: () => triggerNewNote(),
    onToggleChat: () => openSidebar('chat'),
    onEscape: () => {
      if (sidebarOpen) closeSidebar();
    },
  });

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gb-bg">
      {/* Grafo a pantalla completa */}
      <ErrorBoundary>
        <GraphCanvas />
      </ErrorBoundary>
      
      {/* Toolbar flotante superior */}
      <Toolbar />
      
      {/* Sidebar retractable */}
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
    </main>
  );
}
