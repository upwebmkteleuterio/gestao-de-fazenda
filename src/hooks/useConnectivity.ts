import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startConnectivityMonitor } from '@/offline/connectivity';
import { useConnectivityStore } from '@/store/useConnectivityStore';

export const useConnectivity = () => {
  const connectivity = useConnectivityStore();
  const queryClient = useQueryClient();

  useEffect(() => startConnectivityMonitor(), []);

  // Sem internet real, requisições em andamento podem ficar presas esperando a rede
  // (esqueleto infinito). Cancelar e recarregar força a leitura do cache local.
  useEffect(() => {
    if (connectivity.status !== 'offline') return;
    void queryClient.cancelQueries().then(() => queryClient.invalidateQueries());
  }, [connectivity.status, queryClient]);

  return connectivity;
};
