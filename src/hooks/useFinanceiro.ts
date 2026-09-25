import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { financeiroService, syncFinanceiro, type FinanceiroFilters, type FinanceiroQuery, type FinanceiroResumo, type LocalTransaction } from '@/services/financeiroService';
import type { TransacaoFinanceira } from '@/types/database';

type SummaryQuery = { resumo: FinanceiroResumo; source: 'remote' | 'local'; capturedAt?: string };
const emptyResumo: FinanceiroResumo = { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 };

const currentMonth = () => {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  return { startDate, endDate: end.toISOString().slice(0, 10) };
};

const matchesFilters = (item: TransacaoFinanceira, filters?: FinanceiroFilters) => {
  if (filters?.startDate && item.data < filters.startDate) return false;
  if (filters?.endDate && item.data >= filters.endDate) return false;
  if (filters?.tipo && filters.tipo !== 'all' && item.tipo !== filters.tipo) return false;
  if (filters?.categoria && filters.categoria !== 'all' && item.categoria !== filters.categoria) return false;
  if (filters?.status && filters.status !== 'all' && item.status !== filters.status) return false;
  if (filters?.search) {
    const search = filters.search.trim().toLocaleLowerCase();
    if (search && !`${item.descricao} ${item.categoria}`.toLocaleLowerCase().includes(search)) return false;
  }
  return true;
};

export const useFinanceiro = (filters?: FinanceiroFilters) => {
  const queryClient = useQueryClient();
  const { session, role } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const isOffline = connectivityStatus === 'offline';
  const isFinanceiroEnabled = role === 'superadmin' && Boolean(userId);
  const effectiveFilters: FinanceiroFilters | undefined = isOffline
    ? { startDate: currentMonth().startDate, endDate: currentMonth().endDate }
    : filters;

  const refreshAuthoritativeFinanceiro = async () => {
    if (!userId || !isFinanceiroEnabled) return;
    await syncFinanceiro(userId);
    await financeiroService.prefetchCurrentMonth(userId);
    await queryClient.invalidateQueries({ queryKey: ['financeiro_transacoes', userId] });
    await queryClient.invalidateQueries({ queryKey: ['financeiro_resumo', userId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  useEffect(() => {
    if (!userId || !isFinanceiroEnabled || connectivityStatus !== 'online') return;
    void refreshAuthoritativeFinanceiro().catch(() => undefined);
  }, [connectivityStatus, userId, isFinanceiroEnabled]);

  const transacoesQuery = useQuery<FinanceiroQuery>({
    queryKey: ['financeiro_transacoes', userId, effectiveFilters],
    queryFn: () => financeiroService.getAll(userId!, effectiveFilters),
    enabled: isFinanceiroEnabled,
  });

  const resumoQuery = useQuery<SummaryQuery>({
    queryKey: ['financeiro_resumo', userId, effectiveFilters?.startDate, effectiveFilters?.endDate],
    queryFn: () => financeiroService.getResumo(userId!, effectiveFilters?.startDate, effectiveFilters?.endDate),
    enabled: isFinanceiroEnabled,
  });

  const updateLocalTransactionQueries = (item: LocalTransaction, deleted = false) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<FinanceiroQuery>({ queryKey: ['financeiro_transacoes', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const queryFilters = queryKey[2] as FinanceiroFilters | undefined;
      const exists = current.data.some((transaction) => transaction.id === item.id);
      const matches = matchesFilters(item, queryFilters);
      if (!deleted && !matches && !exists) return;
      if (!exists && queryFilters?.page !== undefined && queryFilters.page > 1) return;
      const shouldRemove = deleted || (exists && !matches);
      const data = shouldRemove
        ? current.data.filter((transaction) => transaction.id !== item.id)
        : exists
          ? current.data.map((transaction) => transaction.id === item.id ? item : transaction)
          : [item, ...current.data];
      queryClient.setQueryData<FinanceiroQuery>(queryKey, {
        ...current,
        data,
        total: shouldRemove && exists ? Math.max(0, current.total - 1) : !exists && !deleted ? current.total + 1 : current.total,
        source: 'local',
      });
    });
  };

  const updateSummaryQueries = async (item: LocalTransaction, oldItem?: TransacaoFinanceira, deleted = false) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<SummaryQuery>({ queryKey: ['financeiro_resumo', userId] });
    const currentRange = currentMonth();
    for (const [queryKey, current] of queries) {
      if (!current) continue;
      const startDate = queryKey[2] as string | undefined;
      const endDate = queryKey[3] as string | undefined;
      if (startDate === currentRange.startDate && endDate === currentRange.endDate) {
        queryClient.setQueryData<SummaryQuery>(queryKey, {
          resumo: await financeiroService.getLocalResumo(userId),
          source: 'local',
          capturedAt: current.capturedAt,
        });
        continue;
      }
      const adjust = (summary: FinanceiroResumo, transaction: TransacaoFinanceira, sign: number) => {
        const next = { ...summary };
        if (transaction.status === 'pago') {
          if (transaction.tipo === 'receita') next.receitas += sign * transaction.valor;
          else next.despesas += sign * transaction.valor;
        } else {
          next.pendentes += sign * transaction.valor;
        }
        next.saldo = next.receitas - next.despesas;
        return next;
      };
      let resumo = current.resumo;
      if (oldItem && matchesFilters(oldItem, { startDate, endDate })) resumo = adjust(resumo, oldItem, -1);
      if (!deleted && matchesFilters(item, { startDate, endDate })) resumo = adjust(resumo, item, 1);
      queryClient.setQueryData<SummaryQuery>(queryKey, { ...current, resumo, source: 'local' });
    }
  };

  const onLocalMutationSuccess = async (item: LocalTransaction, oldItem?: TransacaoFinanceira, deleted = false) => {
    updateLocalTransactionQueries(item, deleted);
    await updateSummaryQueries(item, oldItem, deleted);
    void refreshAuthoritativeFinanceiro().catch(() => undefined);
  };

  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: (item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return financeiroService.create(userId, item);
    },
    onSuccess: (item) => onLocalMutationSuccess(item),
  });

  const updateMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TransacaoFinanceira> }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return financeiroService.update(userId, id, updates);
    },
    onSuccess: (item, variables) => {
      const oldItem = transacoesQuery.data?.data.find((transaction) => transaction.id === variables.id);
      return onLocalMutationSuccess(item, oldItem);
    },
  });

  const deleteMutation = useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      const oldItem = transacoesQuery.data?.data.find((transaction) => transaction.id === id);
      await financeiroService.delete(userId, id);
      return { id, oldItem };
    },
    onSuccess: ({ id, oldItem }) => onLocalMutationSuccess({ ...(oldItem ?? { id, tipo: 'despesa', categoria: 'outros', descricao: '', valor: 0, data: '', status: 'pago', createdAt: '' }), id, localDeleted: true, syncStatus: 'pending' }, oldItem, true),
  });

  return {
    transacoes: isFinanceiroEnabled ? transacoesQuery.data?.data ?? [] : [],
    totalTransacoes: isFinanceiroEnabled ? transacoesQuery.data?.total ?? 0 : 0,
    source: isFinanceiroEnabled ? transacoesQuery.data?.source ?? null : null,
    capturedAt: isFinanceiroEnabled ? transacoesQuery.data?.capturedAt : undefined,
    isLoadingTransacoes: isFinanceiroEnabled && transacoesQuery.isLoading,
    isErrorTransacoes: isFinanceiroEnabled && transacoesQuery.isError,
    errorTransacoes: isFinanceiroEnabled ? transacoesQuery.error : null,
    refetchTransacoes: transacoesQuery.refetch,
    resumo: isFinanceiroEnabled ? resumoQuery.data?.resumo ?? emptyResumo : emptyResumo,
    resumoSource: isFinanceiroEnabled ? resumoQuery.data?.source ?? null : null,
    isLoadingResumo: isFinanceiroEnabled && resumoQuery.isLoading,
    isErrorResumo: isFinanceiroEnabled && resumoQuery.isError,
    refetchResumo: resumoQuery.refetch,
    createTransacao: createMutation.mutateAsync,
    updateTransacao: updateMutation.mutateAsync,
    deleteTransacao: deleteMutation.mutateAsync,
    isOffline,
  };
};
