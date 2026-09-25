import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { pastagensService, syncPastagens } from '../services/pastagensService';
import { Pastagem, ServicoPastagem } from '../types/database';

type PastagemFilters = { search?: string; status?: string; page?: number; limit?: number };
type PastagemQueryData = { data: Pastagem[]; total: number; source: 'remote' | 'local'; capturedAt?: string };

export const usePastagens = (filters?: PastagemFilters, pastoIdSelected?: string) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);

  useEffect(() => {
    if (!userId || connectivityStatus !== 'online') return;
    void syncPastagens(userId).catch(() => undefined);
  }, [connectivityStatus, userId]);

  const pastosQuery = useQuery({
    queryKey: ['pastagens', userId, filters],
    queryFn: () => pastagensService.getAll(userId!, filters),
    enabled: Boolean(userId),
  });

  const servicosQuery = useQuery({
    queryKey: ['servicos_pastagens', pastoIdSelected],
    queryFn: () => pastagensService.getServicos(pastoIdSelected),
  });

  const updateLocalPastagemCache = (pastagem: Pastagem) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<PastagemQueryData>({ queryKey: ['pastagens', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const queryFilters = queryKey[2] as PastagemFilters | undefined;
      const exists = current.data.some((item) => item.id === pastagem.id);
      if (!exists && queryFilters?.page !== undefined && queryFilters.page !== 1) return;
      if (!exists && queryFilters?.search && !pastagem.nome_pasto.toLocaleLowerCase().includes(queryFilters.search.toLocaleLowerCase())) return;
      queryClient.setQueryData<PastagemQueryData>(queryKey, {
        ...current,
        data: exists
          ? current.data.map((item) => item.id === pastagem.id ? pastagem : item)
          : [pastagem, ...current.data],
        total: exists ? current.total : current.total + 1,
        source: 'local',
      });
    });
  };

  const removeLocalPastagemFromCache = (id: string) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<PastagemQueryData>({ queryKey: ['pastagens', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const data = current.data.filter((item) => item.id !== id);
      if (data.length === current.data.length) return;
      queryClient.setQueryData<PastagemQueryData>(queryKey, {
        ...current,
        data,
        total: Math.max(0, current.total - 1),
        source: 'local',
      });
    });
  };

  const syncLocalMutation = () => {
    if (!userId) return;
    void syncPastagens(userId)
      .catch(() => undefined)
      .finally(() => {
        void queryClient.invalidateQueries({ queryKey: ['pastagens', userId] });
        void queryClient.invalidateQueries({ queryKey: ['animais'] });
      });
  };

  const createPastoMutation = useMutation({
    networkMode: 'always',
    mutationFn: (item: Omit<Pastagem, 'id' | 'createdAt'>) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return pastagensService.create(userId, item);
    },
    onSuccess: updateLocalPastagemCache,
  });

  const updatePastoMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pastagem> }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return pastagensService.update(userId, id, updates);
    },
    onSuccess: updateLocalPastagemCache,
  });

  const deletePastoMutation = useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return pastagensService.delete(userId, id);
    },
    onSuccess: (_, id) => removeLocalPastagemFromCache(id),
  });

  const addServicoMutation = useMutation({
    networkMode: 'online',
    mutationFn: (item: Omit<ServicoPastagem, 'id' | 'createdAt'>) => pastagensService.addServico(item),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servicos_pastagens'] });
    },
  });

  return {
    pastagens: pastosQuery.data?.data || [],
    total: pastosQuery.data?.total || 0,
    source: pastosQuery.data?.source ?? null,
    capturedAt: pastosQuery.data?.capturedAt,
    isLoadingPastagens: pastosQuery.isLoading,
    isErrorPastagens: pastosQuery.isError,
    errorPastagens: pastosQuery.error,
    refetchPastagens: pastosQuery.refetch,
    servicos: servicosQuery.data || [],
    isLoadingServicos: servicosQuery.isLoading,
    isErrorServicos: servicosQuery.isError,
    refetchServicos: servicosQuery.refetch,
    createPastagem: createPastoMutation.mutateAsync,
    updatePastagem: updatePastoMutation.mutateAsync,
    deletePastagem: deletePastoMutation.mutateAsync,
    isCreatingPastagem: createPastoMutation.isPending,
    isUpdatingPastagem: updatePastoMutation.isPending,
    isDeletingPastagem: deletePastoMutation.isPending,
    addServico: addServicoMutation.mutateAsync,
    syncLocalMutation,
  };
};
