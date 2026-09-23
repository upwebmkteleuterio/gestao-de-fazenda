import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reproducaoService, ReproducaoReportFilters } from '../services/reproducaoService';
import { EventoReproducao } from '../types/database';

export const useReproducao = (filters?: ReproducaoReportFilters, options?: { includeSummary?: boolean }) => {
  const includeSummary = options?.includeSummary ?? false;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['reproducao', filters],
    queryFn: () => reproducaoService.getAll(filters),
  });
  const summaryQuery = useQuery({
    queryKey: ['reproducao-report-summary', filters],
    queryFn: () => reproducaoService.getReportSummary(filters),
    enabled: includeSummary,
  });

  const fetchAllEventos = useCallback(async () => {
    const batchSize = 500;
    const first = await reproducaoService.getAll({ ...filters, page: 1, limit: batchSize });
    const batches = [first.data];
    for (let page = 2; (page - 1) * batchSize < first.total; page += 1) {
      const batch = await reproducaoService.getAll({ ...filters, page, limit: batchSize });
      batches.push(batch.data);
    }
    return batches.flat();
  }, [filters]);

  const createMutation = useMutation({
    mutationFn: (item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>) => reproducaoService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventoReproducao> }) => reproducaoService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reproducaoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['reproducao-report-summary'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    eventos: query.data?.data || [],
    totalEventos: query.data?.total || 0,
    summary: summaryQuery.data,
    isLoading: query.isLoading || summaryQuery.isLoading,
    isError: query.isError || summaryQuery.isError,
    error: query.error || summaryQuery.error,
    refetch: query.refetch,
    fetchAllEventos,
    createEvento: createMutation.mutateAsync,
    updateEvento: updateMutation.mutateAsync,
    deleteEvento: deleteMutation.mutateAsync,
  };
};