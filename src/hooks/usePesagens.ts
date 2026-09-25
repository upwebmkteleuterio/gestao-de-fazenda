import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pesagensService, syncPesagens, type PesagensQuery, type LocalPesagem } from '@/services/pesagensService';
import { Pesagem } from '@/types/database';
import { getOfflineSnapshot, saveOfflineSnapshot } from '@/offline/database';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';

const PESAGENS_RECENTES_SNAPSHOT_KEY = 'pesagens-recentes';
type PesagensRecentesDataSource = 'online' | 'snapshot' | 'unavailable';
type PesagensRecentesQueryData = { pesagens: Pesagem[]; dataSource: PesagensRecentesDataSource; snapshotCapturedAt: string | null };

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
  const { session } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);

  useEffect(() => {
    if (!userId || connectivityStatus !== 'online') return;
    void syncPesagens(userId).catch(() => undefined);
  }, [connectivityStatus, userId]);

  const query = useQuery<PesagensQuery>({
    queryKey: ['pesagens', userId, filters],
    queryFn: () => pesagensService.getAll(filters),
    enabled: Boolean(userId),
  });

  const updateLocalQuery = (item: LocalPesagem, deleted = false) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<PesagensQuery>({ queryKey: ['pesagens', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const queryFilters = queryKey[2] as typeof filters | undefined;
      const isCurrentPage = !queryFilters?.search && (!queryFilters?.tipoAnimal || queryFilters.tipoAnimal === 'all') && !queryFilters?.startDate && !queryFilters?.endDate;
      if (!isCurrentPage) return;
      const exists = current.data.some((pesagem) => pesagem.id === item.id);
      const data = deleted
        ? current.data.filter((pesagem) => pesagem.id !== item.id)
        : exists
          ? current.data.map((pesagem) => pesagem.id === item.id ? item : pesagem)
          : [item, ...current.data].sort((left, right) => `${right.data_pesagem}${right.createdAt}`.localeCompare(`${left.data_pesagem}${left.createdAt}`)).slice(0, 10);
      queryClient.setQueryData<PesagensQuery>(queryKey, {
        ...current,
        data,
        total: deleted && exists ? Math.max(0, current.total - 1) : current.total,
        source: 'local',
      });
    });
  };

  const refreshAfterMutation = () => {
    if (!userId) return;
    void syncPesagens(userId).catch(() => undefined).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ['pesagens', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
    });
  };

  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: (item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>) => pesagensService.create(item),
    onSuccess: (item) => { updateLocalQuery(item); refreshAfterMutation(); },
  });

  const createGroupMutation = useMutation({
    networkMode: 'always',
    mutationFn: (items: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>[]) => pesagensService.createGroup(items),
    onSuccess: (items) => { items.forEach((item) => updateLocalQuery(item)); refreshAfterMutation(); },
  });

  const updateMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pesagem> }) => pesagensService.update(id, updates),
    onSuccess: (item) => { updateLocalQuery(item); refreshAfterMutation(); },
  });

  const deleteMutation = useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => pesagensService.delete(id),
    onSuccess: (_, id) => { updateLocalQuery({ id } as LocalPesagem, true); refreshAfterMutation(); },
  });

  return {
    pesagens: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    source: query.data?.source ?? null,
    capturedAt: query.data?.capturedAt,
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
        return snapshot ? { pesagens: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt } : { pesagens: [], dataSource: 'unavailable', snapshotCapturedAt: null };
      }
      try {
        const pesagens = await pesagensService.getRecent();
        const capturedAt = new Date().toISOString();
        void saveOfflineSnapshot({ key: snapshotKey, scope: 'pesagens-recentes', data: pesagens, capturedAt }).catch(() => undefined);
        return { pesagens, dataSource: 'online', snapshotCapturedAt: null };
      } catch (error) {
        const snapshot = await readPesagensRecentesSnapshot(snapshotKey);
        if (snapshot) return { pesagens: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt };
        throw error;
      }
    },
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (connectivityStatus === 'online' && wasOffline.current && session) void query.refetch();
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
