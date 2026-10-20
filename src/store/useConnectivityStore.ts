import { create } from 'zustand';

export type ConnectivityStatus = 'online' | 'offline' | 'syncing' | 'error';

type ConnectivityState = {
  status: ConnectivityStatus;
  errorMessage: string | null;
  /** Resultado da última sondagem real de rede. `null` = ainda desconhecido. */
  reachable: boolean | null;
  /** Momento da última falha de rede observada em uma requisição real. */
  lastNetworkFailureAt: number | null;
  setOnline: () => void;
  setOffline: () => void;
  setSyncing: () => void;
  setError: (message: string) => void;
  clearError: () => void;
  setReachable: (reachable: boolean) => void;
  resolveAfterSync: () => void;
  markNetworkFailure: () => void;
};

/**
 * Janela em que uma falha real de rede tem prioridade sobre o resultado da sondagem.
 * Evita o vaivém "Offline/Online" quando um proxy ou portal cativo responde à sondagem
 * mas as requisições de dados continuam falhando.
 */
export const NETWORK_FAILURE_GRACE_MS = 30_000;

const isDeviceOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine;

const getInitialStatus = (): ConnectivityStatus => (isDeviceOnline() ? 'online' : 'offline');

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: getInitialStatus(),
  errorMessage: null,
  reachable: isDeviceOnline() ? null : false,
  lastNetworkFailureAt: null,
  setOnline: () => set({ status: 'online', errorMessage: null, reachable: null }),
  setOffline: () => set({ status: 'offline', errorMessage: null, reachable: false }),
  setSyncing: () => set((state) => state.status === 'offline' ? state : { status: 'syncing', errorMessage: null }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  clearError: () => set((state) => ({
    status: state.status === 'error'
      ? (isDeviceOnline() && state.reachable !== false ? 'online' : 'offline')
      : state.status,
    errorMessage: null,
  })),
  setReachable: (reachable) => set((state) => {
    if (reachable) {
      const failedRecently = state.lastNetworkFailureAt !== null
        && Date.now() - state.lastNetworkFailureAt < NETWORK_FAILURE_GRACE_MS;
      if (failedRecently) {
        if (state.reachable === false && state.status === 'offline') return state;
        return { reachable: false, status: 'offline', errorMessage: null };
      }
      if (state.reachable === true && (state.status === 'online' || state.status === 'syncing')) return state;
      return { reachable: true, status: state.status === 'syncing' ? 'syncing' : 'online', errorMessage: null };
    }
    if (state.reachable === false && state.status === 'offline') return state;
    return { reachable: false, status: 'offline', errorMessage: null };
  }),
  // Uma requisição real que não completou vale mais que qualquer sondagem: o app passa a
  // operar com o cache local e a enfileirar as alterações até a rede voltar de verdade.
  markNetworkFailure: () => set({
    status: 'offline',
    errorMessage: null,
    reachable: false,
    lastNetworkFailureAt: Date.now(),
  }),
  // Fim de um ciclo de sincronização: o status volta a refletir a conectividade real,
  // considerando o resultado da última sondagem de rede.
  resolveAfterSync: () => set((state) => ({
    status: isDeviceOnline() && state.reachable !== false ? 'online' : 'offline',
    errorMessage: null,
  })),
}));
