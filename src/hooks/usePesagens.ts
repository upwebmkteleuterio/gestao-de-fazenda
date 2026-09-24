import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pesagensService } from '@/services/pesagensService';
import { Pesagem } from '@/types/database';
import { getOfflineSnapshot, saveOfflineSnapshot } from '@/offline/database';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';

const PESAGENS_RECENTES_SNAPSHOT_KEY = 'pesagens-recentes';

type PesagensRecentesDataSource = 'online' | 'snapshot' | 'unavailable';

type PesagensRecentesQueryData = {
  pesagens: Pesagem[];
  dataSource: PesagensRecentesDataSource;
  snapshotCapturedAt: string | null;
};

const isOffline = (): boolean => (
  useConnectivityStore.getState().status === 'offline'
  || (typeof navigator !== 'undefined' && !navigator.onLine)
);

const readPesagensRecentesSnapshot = async (snapshotKey: string) => {
  try {
    return await getOfflineSnapshot<Pesagem[]>(snapshotKey);
  } catch {
    return undefined;
  }
};

export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pesagens', filters],
    queryFn: () => pesagensService.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>) => pesagensService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (items: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>[]) => pesagensService.createGroup(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pesagem> }) => pesagensService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pesagensService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    pesagens: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createPesagem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createPesagemGrupo: createGroupMutation.mutateAsync,
    isCreatingGrupo: createGroupMutation.isPending,
    updatePesagem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePesagem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const usePesagensRecentes = () => {
  const { session } = useAuth();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const snapshotKey = session?.user.id ? `${PESAGENS_RECENTES_SNAPSHOT_KEY}:${session.user.id}` : PESAGENS_RECENTES_SNAPSHOT_KEY;
  const wasOffline = useRef(connectivityStatus === 'offline');
  const query = useQuery<PesagensRecentesQueryData>({
    queryKey: ['pesagens-recentes'],
    queryFn: async () => {
      if (isOffline()) {
        const snapshot = await readPesagensRecentesSnapshot(snapshotKey);
        return snapshot
          ? { pesagens: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt }
          : { pesagens: [], dataSource: 'unavailable', snapshotCapturedAt: null };
      }

      try {
        const pesagens = await pesagensService.getRecent();
        const capturedAt = new Date().toISOString();
        void saveOfflineSnapshot({
          key: snapshotKey,
          scope: 'pesagens-recentes',
          data: pesagens,
          capturedAt,
        }).catch(() => undefined);
        return { pesagens, dataSource: 'online', snapshotCapturedAt: null };
      } catch (error) {
        const snapshot = await readPesagensRecentesSnapshot(snapshotKey);
        if (snapshot) {
          return { pesagens: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt };
        }
        throw error;
      }
    },
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (connectivityStatus === 'online' && wasOffline.current && session) {
      void query.refetch();
    }
    wasOffline.current = connectivityStatus === 'offline';
  }, [connectivityStatus, query.refetch, session]);

  return {
    pesagens: query.data?.pesagens ?? [],
    dataSource: query.data?.dataSource ?? 'unavailable',
    snapshotCapturedAt: query.data?.snapshotCapturedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
