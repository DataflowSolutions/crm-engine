import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types for our global state
interface UserState {
  user: {
    id: string;
    email: string;
    name?: string;
  } | null;
  setUser: (user: UserState['user']) => void;
  clearUser: () => void;
}

interface OrganizationState {
  currentOrg: {
    id: string;
    name: string;
    role: string;
    isCreator: boolean;
  } | null;
  setCurrentOrg: (org: OrganizationState['currentOrg']) => void;
  clearCurrentOrg: () => void;
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Loading states
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Error states  
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
}

// Combined store interface
interface AppStore extends UserState, OrganizationState, AppState {}

// Create the main store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        // User state
        user: null,
        setUser: (user) => set({ user }, false, 'setUser'),
        clearUser: () => set({ user: null }, false, 'clearUser'),

        // Organization state  
        currentOrg: null,
        setCurrentOrg: (org) => set({ currentOrg: org }, false, 'setCurrentOrg'),
        clearCurrentOrg: () => set({ currentOrg: null }, false, 'clearCurrentOrg'),

        // App state
        sidebarOpen: false,
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
        
        isGlobalLoading: false,
        setGlobalLoading: (loading) => set({ isGlobalLoading: loading }, false, 'setGlobalLoading'),
        
        globalError: null,
        setGlobalError: (error) => set({ globalError: error }, false, 'setGlobalError'),
      }),
      {
        name: 'crm-app-store',
        // Only persist user and org data, not UI state
        partialize: (state) => ({
          user: state.user,
          currentOrg: state.currentOrg,
        }),
      }
    ),
    {
      name: 'CRM App Store',
    }
  )
);

// Utility selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useCurrentOrg = () => useAppStore((state) => state.currentOrg);

export const useSidebarState = () => {
  const isOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  
  return {
    isOpen,
    toggle: () => setSidebarOpen(!isOpen),
    open: () => setSidebarOpen(true),
    close: () => setSidebarOpen(false),
  };
};

// Global loading state
export const useGlobalLoading = () => {
  const isLoading = useAppStore((state) => state.isGlobalLoading);
  const setLoading = useAppStore((state) => state.setGlobalLoading);
  
  return {
    isLoading,
    setLoading,
  };
};

// Global error state
export const useGlobalError = () => {
  const error = useAppStore((state) => state.globalError);
  const setError = useAppStore((state) => state.setGlobalError);
  
  return {
    error,
    setError,
    clearError: () => setError(null),
  };
};
