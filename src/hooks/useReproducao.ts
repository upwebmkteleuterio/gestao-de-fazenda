import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { reproducaoService, ReproducaoReportFilters, type ReproducaoQuery } from '../services/reproducaoService';
import { EventoReproducao } from '../types/database';

type UseReproducaoOptions = {
  includeSummary?: boolean;
  useOfflineCache?: boolean;
  onlineOnly?: boolean;
  enabled?: boolean;
};

export type ReproducaoDiagnostic = {
  list: {
    status: string;
    fetchStatus: string;
    itemCount: number;
    total: number;
    source: ReproducaoQuery['source'] | null;
    error: { name: string; message: string } | null;
  };
  summary: {
    requested: boolean;
    status: string;
    fetchStatus: string;
    error: { name: string; message: string } | null;
  };
};

const getDiagnosticError = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { name?: unknown; message?: unknown };
  if (typeof candidate.name !== 'string' && typeof candidate.message !== 'string') return null;
  return {
    name: typeof candidate.name === 'string' ? candidate.name : 'Error',
    message: typeof candidate.message === 'string' ? candidate.message : 'A consulta falhou.',
  };
};

export const useReproducao = (filters?: ReproducaoReportFilters, options?: UseReproducaoOptions) => {
  const includeSummary = options?.includeSummary ?? false;
  const useOfflineCache = options?.useOfflineCache ?? false;
  const onlineOnly = options?.onlineOnly ?? false;
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const offline = connectivityStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);
  const wasOffline = useRef(offline);

  const query = useQuery<ReproducaoQuery>({
    queryKey: ['reproducao', userId, useOfflineCache, onlineOnly, filters],
    queryFn: () => reproducaoService.getAll(filters, { onlineOnly }),
    enabled: enabled && Boolean(userId) && (onlineOnly ? !offline : useOfflineCache || !offline),
    networkMode: useOfflineCache ? 'always' : 'online',
  });
  const summaryQuery = useQuery({
    queryKey: ['reproducao-report-summary', userId, filters],
    queryFn: () => reproducaoService.getReportSummary(filters),
    enabled: enabled && includeSummary && Boolean(userId) && !offline,
  });
  const refetch = useCallback(async () => {
    await Promise.all([
      query.refetch(),
      includeSummary ? summaryQuery.refetch() : Promise.resolve(),
    ]);
  }, [includeSummary, query.refetch, summaryQuery.refetch]);

  useEffect(() => {
    if (userId && wasOffline.current && !offline) {
      void refetch();
    } else if (userId && !wasOffline.current && offline && useOfflineCache) {
      void query.refetch();
    }
    wasOffline.current = offline;
  }, [connectivityStatus, offline, query.refetch, refetch, useOfflineCache, userId]);

  const fetchAllEventos = useCallback(async () => {
    if (offline && (onlineOnly || !useOfflineCache)) throw new Error('Relatório indisponível offline.');
    const batchSize = 500;
    const first = await reproducaoService.getAll(
      { ...filters, page: 1, limit: batchSize },
      { onlineOnly },
    );
    const batches = [first.data];
    for (let page = 2; (page - 1) * batchSize < first.total; page += 1) {
      if (offline && (onlineOnly || !useOfflineCache)) throw new Error('Relatório indisponível offline.');
      const batch = await reproducaoService.getAll(
        { ...filters, page, limit: batchSize },
        { onlineOnly },
      );
      batches.push(batch.data);
    }
    return batches.flat();
  }, [filters, offline, onlineOnly, useOfflineCache]);

  const createMutation = useMutation({
    mutationFn: (item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>) => reproducaoService.create(item),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reproducao', userId] });
      void queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const createBatchMutation = useMutation({
    mutationFn: (items: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>[]) => reproducaoService.createBatch(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reproducao', userId] });
      void queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventoReproducao> }) => reproducaoService.update(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reproducao', userId] });
      void queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reproducaoService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reproducao', userId] });
      void queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary', userId] });
      void queryClient.invalidateQueries({ queryKey: ['animais'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const showingLocalData = query.data?.source === 'local';
  const errorCoverage = query.error as { capturedAt?: string; coverageStart?: string; coverageEnd?: string } | null;
  const waitingForOfflineCache = offline && useOfflineCache && enabled && Boolean(userId) && !showingLocalData && !query.isError;
  const eventos = offline && (!useOfflineCache || !showingLocalData) ? [] : query.data?.data ?? [];
  const totalEventos = offline && (!useOfflineCache || !showingLocalData) ? 0 : query.data?.total ?? 0;
  const offlineError = onlineOnly && offline
    ? new Error('Conexão necessária para carregar o histórico reprodutivo.')
    : undefined;
  const source = query.data?.source ?? null;
  const diagnostic: ReproducaoDiagnostic = {
    list: {
      status: query.status,
      fetchStatus: query.fetchStatus,
      itemCount: query.data?.data.length ?? 0,
      total: query.data?.total ?? 0,
      source,
      error: getDiagnosticError(query.error),
    },
    summary: {
      requested: includeSummary,
      status: includeSummary ? summaryQuery.status : 'disabled',
      fetchStatus: includeSummary ? summaryQuery.fetchStatus : 'idle',
      error: includeSummary ? getDiagnosticError(summaryQuery.error) : null,
    },
  };

  return {
    eventos,
    totalEventos,
    source,
    capturedAt: query.data?.capturedAt ?? errorCoverage?.capturedAt,
    coverageStart: query.data?.coverageStart ?? errorCoverage?.coverageStart,
    coverageEnd: query.data?.coverageEnd ?? errorCoverage?.coverageEnd,
    summary: summaryQuery.data,
    isOffline: offline,
    isLoading: query.isLoading || waitingForOfflineCache || (includeSummary && !offline && summaryQuery.isLoading),
    isError: query.isError || (includeSummary && summaryQuery.isError) || Boolean(offlineError),
    error: query.error || (includeSummary ? summaryQuery.error : undefined) || offlineError,
    diagnostic,
    refetch,
    fetchAllEventos,
    createEvento: createMutation.mutateAsync,
    createEventosBatch: createBatchMutation.mutateAsync,
    updateEvento: updateMutation.mutateAsync,
    deleteEvento: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || createBatchMutation.isPending || updateMutation.isPending,
  };
};