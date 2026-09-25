import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insumosService, syncInsumos } from '@/services/insumosService';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import type { Insumo, MovimentacaoInsumo } from '@/types/database';

export const useInsumos = (
  categoria?: string,
  filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number },
  selectedInsumoId?: string,
) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const isOffline = connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);

  const insumosQuery = useQuery({
    queryKey: ['insumos', userId, categoria, filters],
    queryFn: () => insumosService.getAll(categoria, filters),
    enabled: Boolean(userId),
  });
  const lowStockCountQuery = useQuery({
    queryKey: ['insumos', 'estoque-baixo-total', userId],
    queryFn: () => insumosService.getAll(undefined, { estoqueBaixo: true, page: 1, limit: 1 }),
    enabled: Boolean(userId),
  });
  const movsQuery = useQuery({
    queryKey: ['movimentacoes_insumos', userId, selectedInsumoId],
    queryFn: () => insumosService.getMovimentacoes(selectedInsumoId),
    enabled: Boolean(userId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['insumos'] });
    void queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };
  const refreshAfterMutation = () => {
    if (!userId) return;
    void syncInsumos(userId).catch(() => undefined).finally(invalidate);
  };

  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: (item: Omit<Insumo, 'id' | 'createdAt'>) => insumosService.create(item),
    onSuccess: refreshAfterMutation,
  });
  const updateMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Insumo> }) => insumosService.update(id, updates),
    onSuccess: refreshAfterMutation,
  });
  const deleteMutation = useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => insumosService.delete(id),
    onSuccess: refreshAfterMutation,
  });
  const registrarMovMutation = useMutation({
    networkMode: 'always',
    mutationFn: (mov: Omit<MovimentacaoInsumo, 'id' | 'createdAt'>) => insumosService.registrarMovimentacao(mov),
    onSuccess: invalidate,
  });

  return {
    insumos: insumosQuery.data?.data ?? [],
    totalInsumos: insumosQuery.data?.total ?? 0,
    totalEstoqueBaixoCount: lowStockCountQuery.data?.total ?? 0,
    isLoadingInsumos: insumosQuery.isLoading,
    isErrorInsumos: insumosQuery.isError,
    errorInsumos: insumosQuery.error,
    refetchInsumos: insumosQuery.refetch,
    source: insumosQuery.data?.source ?? null,
    capturedAt: insumosQuery.data?.capturedAt,
    movimentacoes: movsQuery.data ?? [],
    isLoadingMovimentacoes: movsQuery.isLoading,
    isErrorMovimentacoes: movsQuery.isError,
    refetchMovimentacoes: movsQuery.refetch,
    isOffline,
    isMovimentacaoDisabledOffline: isOffline || insumosQuery.data?.source === 'local',
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || registrarMovMutation.isPending,
    isMovementPending: registrarMovMutation.isPending,
    createInsumo: createMutation.mutateAsync,
    updateInsumo: updateMutation.mutateAsync,
    deleteInsumo: deleteMutation.mutateAsync,
    registrarMovimentacao: registrarMovMutation.mutateAsync,
  };
};
