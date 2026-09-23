import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lotesService, Lote, CreateLoteDTO } from '../services/lotesService';

export const useLotes = (filters?: { search?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lotes', filters],
    queryFn: () => lotesService.getAll(filters),
  });

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
    queryClient.invalidateQueries({ queryKey: ['animais'] });
    queryClient.invalidateQueries({ queryKey: ['pastagens'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateLoteDTO | { nome: string; animais_ids: string[] }) =>
      lotesService.create(data),
    onSuccess: invalidateRelated,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lote> }) =>
      lotesService.update(id, updates),
    onSuccess: invalidateRelated,
  });

  const moverPastoMutation = useMutation({
    mutationFn: ({ loteId, pastoId, pastoNome }: { loteId: string; pastoId: string; pastoNome: string }) =>
      lotesService.moverPasto(loteId, pastoId, pastoNome),
    onSuccess: invalidateRelated,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lotesService.delete(id),
    onSuccess: invalidateRelated,
  });

  return {
    lotes: query.data?.data || [],
    totalLotes: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createLote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    moverPasto: moverPastoMutation.mutateAsync,
    isMovingPasto: moverPastoMutation.isPending,
    deleteLote: deleteMutation.mutateAsync,
  };
};
