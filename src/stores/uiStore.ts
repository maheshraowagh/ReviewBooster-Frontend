import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isMobileDrawerOpen: boolean;
  theme: 'light' | 'dark';
  activeDialog: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleMobileDrawer: () => void;
  setMobileDrawerOpen: (isOpen: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveDialog: (dialogId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isMobileDrawerOpen: false,
  theme: 'light',
  activeDialog: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  toggleMobileDrawer: () => set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),
  setMobileDrawerOpen: (isOpen) => set({ isMobileDrawerOpen: isOpen }),
  setTheme: (theme) => set({ theme }),
  setActiveDialog: (activeDialog) => set({ activeDialog }),
}));
