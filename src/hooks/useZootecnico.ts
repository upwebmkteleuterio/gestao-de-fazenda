import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pesagensService } from '@/services/pesagensService';
import { zootecnicoService } from '@/services/zootecnicoService';

export const useZootecnico = (pesagemPage: number, pesagemLimit: number, enabled = true) => {
  const summaryQuery = useQuery({
    queryKey: ['zootecnico-report-summary'],
    queryFn: zootecnicoService.getSummary,
    enabled,
  });
  const pastoQuery = useQuery({
    queryKey: ['zootecnico-gmd-por-pasto'],
    queryFn: () => zootecnicoService.getGmdPorPasto(100),
    enabled,
  });
  const pesagensQuery = useQuery({
    queryKey: ['zootecnico-pesagens', pesagemPage, pesagemLimit],
    queryFn: () => pesagensService.getAll({ page: pesagemPage, limit: pesagemLimit }),
    enabled,
  });
  const fetchAllData = useCallback(() => zootecnicoService.getAllData(), []);

  return {
    summary: summaryQuery.data,
    pastos: pastoQuery.data ?? [],
    pesagens: pesagensQuery.data?.data ?? [],
    totalPesagens: pesagensQuery.data?.total ?? 0,
    fetchAllData,
    isLoading: summaryQuery.isLoading || pastoQuery.isLoading || pesagensQuery.isLoading,
    isError: summaryQuery.isError || pastoQuery.isError || pesagensQuery.isError,
    refetch: () => Promise.all([summaryQuery.refetch(), pastoQuery.refetch(), pesagensQuery.refetch()]),
  };
};