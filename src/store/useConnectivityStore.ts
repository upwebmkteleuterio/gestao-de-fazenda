import { create } from 'zustand';

export type ConnectivityStatus = 'online' | 'offline' | 'syncing' | 'error';

type ConnectivityState = {
  status: ConnectivityStatus;
  errorMessage: string | null;
  setOnline: () => void;
  setOffline: () => void;
  setSyncing: () => void;
  setError: (message: string) => void;
  clearError: () => void;
};

const getInitialStatus = (): ConnectivityStatus => (
  typeof navigator === 'undefined' || navigator.onLine ? 'online' : 'offline'
);

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: getInitialStatus(),
  errorMessage: null,
  setOnline: () => set({ status: 'online', errorMessage: null }),
  setOffline: () => set({ status: 'offline', errorMessage: null }),
  setSyncing: () => set((state) => state.status === 'offline' ? state : { status: 'syncing', errorMessage: null }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  clearError: () => set((state) => ({ status: state.status === 'error' ? 'online' : state.status, errorMessage: null })),
}));
