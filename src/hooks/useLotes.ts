import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { lotesService, Lote, CreateLoteDTO, syncLotes } from '@/services/lotesService';

type LoteFilters = { search?: string; page?: number; limit?: number };
type LotesQueryData = { data: Lote[]; total: number; source: 'remote' | 'local'; capturedAt?: string };

export const useLotes = (filters?: LoteFilters) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);

  useEffect(() => {
    if (!userId || connectivityStatus !== 'online') return;
    void syncLotes(userId).catch(() => undefined);
  }, [connectivityStatus, userId]);

  const query = useQuery<LotesQueryData>({
    queryKey: ['lotes', userId, filters],
    queryFn: () => lotesService.getAll(userId!, filters),
    enabled: Boolean(userId),
  });

  const updateLocalLoteCache = (lote: Lote) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<LotesQueryData>({ queryKey: ['lotes', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const queryFilters = queryKey[2] as LoteFilters | undefined;
      const exists = current.data.some((item) => item.id === lote.id);
      if (!exists && queryFilters?.page !== undefined && queryFilters.page !== 1) return;
      if (!exists && queryFilters?.search && !lote.nome.toLocaleLowerCase().includes(queryFilters.search.toLocaleLowerCase())) return;
      queryClient.setQueryData<LotesQueryData>(queryKey, {
        ...current,
        data: exists
          ? current.data.map((item) => item.id === lote.id ? lote : item)
          : [lote, ...current.data].slice(0, queryFilters?.limit ?? current.data.length + 1),
        total: exists ? current.total : current.total + 1,
        source: 'local',
      });
    });
  };

  const removeLocalLoteFromCache = (id: string) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<LotesQueryData>({ queryKey: ['lotes', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const data = current.data.filter((item) => item.id !== id);
      if (data.length === current.data.length) return;
      queryClient.setQueryData<LotesQueryData>(queryKey, {
        ...current,
        data,
        total: Math.max(0, current.total - 1),
        source: 'local',
      });
    });
  };

  const refreshAfterMutation = () => {
    if (!userId) return;
    void syncLotes(userId).catch(() => undefined).finally(() => {
      void queryClient.invalidateQueries({ queryKey: ['lotes', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    });
  };

  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: (data: CreateLoteDTO) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return lotesService.create(userId, data);
    },
    onSuccess: (lote) => {
      updateLocalLoteCache(lote);
      refreshAfterMutation();
    },
  });

  const updateMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lote> }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return lotesService.update(userId, id, updates);
    },
    onSuccess: (lote) => {
      updateLocalLoteCache(lote);
      refreshAfterMutation();
    },
  });

  const moverPastoMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ loteId, pastoId, pastoNome }: { loteId: string; pastoId: string; pastoNome: string }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return lotesService.moverPasto(userId, loteId, pastoId, pastoNome);
    },
    onSuccess: (lote) => {
      updateLocalLoteCache(lote);
      refreshAfterMutation();
    },
  });

  const deleteMutation = useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return lotesService.delete(userId, id);
    },
    onSuccess: (_, id) => {
      removeLocalLoteFromCache(id);
      refreshAfterMutation();
    },
  });

  return {
    lotes: query.data?.data ?? [],
    totalLotes: query.data?.total ?? 0,
    source: query.data?.source ?? null,
    capturedAt: query.data?.capturedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createLote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    moverPasto: moverPastoMutation.mutateAsync,
    isMovingPasto: moverPastoMutation.isPending,
    deleteLote: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
