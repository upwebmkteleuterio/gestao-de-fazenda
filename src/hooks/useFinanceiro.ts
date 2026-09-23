import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeiroService } from '../services/financeiroService';
import { TransacaoFinanceira } from '../types/database';
import { useAuth } from '@/contexts/AuthContext';

export const useFinanceiro = (filters?: { search?: string; tipo?: string; categoria?: string; status?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isFinanceiroEnabled = role === 'superadmin';

  const transacoesQuery = useQuery({
    queryKey: ['financeiro_transacoes', filters],
    queryFn: () => financeiroService.getAll(filters),
    enabled: isFinanceiroEnabled,
  });

  const resumoQuery = useQuery({
    queryKey: ['financeiro_resumo'],
    queryFn: () => financeiroService.getResumo(),
    enabled: isFinanceiroEnabled,
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
    transacoes: isFinanceiroEnabled ? transacoesQuery.data?.data || [] : [],
    totalTransacoes: isFinanceiroEnabled ? transacoesQuery.data?.total || 0 : 0,
    isLoadingTransacoes: isFinanceiroEnabled && transacoesQuery.isLoading,
    isErrorTransacoes: isFinanceiroEnabled && transacoesQuery.isError,
    errorTransacoes: isFinanceiroEnabled ? transacoesQuery.error : null,
    refetchTransacoes: transacoesQuery.refetch,
    resumo: isFinanceiroEnabled ? resumoQuery.data || { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 } : { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 },
    isLoadingResumo: isFinanceiroEnabled && resumoQuery.isLoading,
    isErrorResumo: isFinanceiroEnabled && resumoQuery.isError,
    refetchResumo: resumoQuery.refetch,
    createTransacao: createMutation.mutateAsync,
    updateTransacao: updateMutation.mutateAsync,
    deleteTransacao: deleteMutation.mutateAsync,
  };
};
