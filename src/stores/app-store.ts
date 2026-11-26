import { create } from 'zustand';
import type { SidebarTab } from '@/types';

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarTab: SidebarTab;
  
  // Selección
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  
  // Acciones
  openSidebar: (tab?: SidebarTab) => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  
  newNoteTrigger: number;
  triggerNewNote: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: false,
  sidebarTab: 'editor',
  selectedNodeId: null,
  hoveredNodeId: null,

  openSidebar: (tab) => set({ sidebarOpen: true, ...(tab ? { sidebarTab: tab } : {}) }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  selectNode: (id) => set({ selectedNodeId: id, sidebarOpen: id !== null, sidebarTab: 'editor' }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  
  newNoteTrigger: 0,
  triggerNewNote: () => set((state) => ({ newNoteTrigger: state.newNoteTrigger + 1, selectedNodeId: null, sidebarOpen: true, sidebarTab: 'editor' })),
}));
