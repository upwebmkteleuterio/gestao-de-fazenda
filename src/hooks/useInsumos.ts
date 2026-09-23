import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { insumosService } from '../services/insumosService';
import { Insumo, MovimentacaoInsumo } from '../types/database';

export const useInsumos = (
  categoria?: string,
  filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number },
  selectedInsumoId?: string
) => {
  const queryClient = useQueryClient();

  const insumosQuery = useQuery({
    queryKey: ['insumos', categoria, filters],
    queryFn: () => insumosService.getAll(categoria, filters),
  });

  const movsQuery = useQuery({
    queryKey: ['movimentacoes_insumos', selectedInsumoId],
    queryFn: () => insumosService.getMovimentacoes(selectedInsumoId),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<Insumo, 'id' | 'createdAt'>) => insumosService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Insumo> }) => insumosService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => insumosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const registrarMovMutation = useMutation({
    mutationFn: (mov: Omit<MovimentacaoInsumo, 'id' | 'createdAt'>) => insumosService.registrarMovimentacao(mov),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    insumos: insumosQuery.data?.data || [],
    totalInsumos: insumosQuery.data?.total || 0,
    isLoadingInsumos: insumosQuery.isLoading,
    isErrorInsumos: insumosQuery.isError,
    errorInsumos: insumosQuery.error,
    refetchInsumos: insumosQuery.refetch,
    movimentacoes: movsQuery.data || [],
    isLoadingMovimentacoes: movsQuery.isLoading,
    isErrorMovimentacoes: movsQuery.isError,
    refetchMovimentacoes: movsQuery.refetch,
    createInsumo: createMutation.mutateAsync,
    updateInsumo: updateMutation.mutateAsync,
    deleteInsumo: deleteMutation.mutateAsync,
    registrarMovimentacao: registrarMovMutation.mutateAsync,
  };
};
