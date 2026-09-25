import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { sanitarioService } from '@/services/sanitarioService';
import { ManejoSanitario } from '@/types/database';

export const useSanitario = (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const userId = session?.user.id;
  const isOffline = connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);
  const query = useQuery({
    queryKey: ['sanitario', userId, filters],
    queryFn: () => sanitarioService.getAll(filters),
    enabled: Boolean(userId),
    refetchOnReconnect: true,
  });

  const statsQuery = useQuery({
    queryKey: ['sanitario-stats', userId],
    queryFn: () => sanitarioService.getStats(),
    enabled: Boolean(userId),
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!userId) return;
    void queryClient.invalidateQueries({ queryKey: ['sanitario', userId] });
    void queryClient.invalidateQueries({ queryKey: ['sanitario-stats', userId] });
  }, [connectivityStatus, queryClient, userId]);

  const createMutation = useMutation({
    mutationFn: (item: Omit<ManejoSanitario, 'id' | 'createdAt' | 'status_sincronizacao'>) => sanitarioService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario', userId] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ManejoSanitario> }) => sanitarioService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario', userId] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sanitarioService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario', userId] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  const localQuery = isOffline && query.data?.source !== 'local' ? undefined : query.data;
  const localStats = isOffline && statsQuery.data?.source !== 'local' ? undefined : statsQuery.data;
  const source = localQuery?.source ?? (isOffline ? 'local' : 'remote');
  const capturedAt = localQuery?.capturedAt ?? localStats?.capturedAt;

  return {
    manejos: localQuery?.data ?? [],
    totalManejos: localQuery?.total ?? 0,
    stats: localStats ?? { andamento: 0, concluido: 0 },
    source,
    capturedAt,
    isOffline,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createManejo: createMutation.mutateAsync,
    updateManejo: updateMutation.mutateAsync,
    deleteManejo: deleteMutation.mutateAsync,
  };
};