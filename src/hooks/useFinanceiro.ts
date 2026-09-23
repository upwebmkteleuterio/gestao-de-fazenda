import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroService } from '../services/financeiroService';
import { TransacaoFinanceira } from '../types/database';

export const useFinanceiro = (filters?: { search?: string; tipo?: string; categoria?: string; status?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  const transacoesQuery = useQuery({
    queryKey: ['financeiro_transacoes', filters],
    queryFn: () => financeiroService.getAll(filters),
  });

  const resumoQuery = useQuery({
    queryKey: ['financeiro_resumo'],
    queryFn: () => financeiroService.getResumo(),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>) => financeiroService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro_resumo'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TransacaoFinanceira> }) => financeiroService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro_resumo'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeiroService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro_transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro_resumo'] });
    },
  });

  return {
    transacoes: transacoesQuery.data?.data || [],
    totalTransacoes: transacoesQuery.data?.total || 0,
    isLoadingTransacoes: transacoesQuery.isLoading,
    isErrorTransacoes: transacoesQuery.isError,
    errorTransacoes: transacoesQuery.error,
    refetchTransacoes: transacoesQuery.refetch,
    resumo: resumoQuery.data || { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 },
    isLoadingResumo: resumoQuery.isLoading,
    isErrorResumo: resumoQuery.isError,
    refetchResumo: resumoQuery.refetch,
    createTransacao: createMutation.mutateAsync,
    updateTransacao: updateMutation.mutateAsync,
    deleteTransacao: deleteMutation.mutateAsync,
  };
};
