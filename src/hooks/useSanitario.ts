import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanitarioService } from '../services/sanitarioService';
import { ManejoSanitario } from '../types/database';

export const useSanitario = (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sanitario', filters],
    queryFn: () => sanitarioService.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: ['sanitario-stats'],
    queryFn: () => sanitarioService.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<ManejoSanitario, 'id' | 'createdAt' | 'status_sincronizacao'>) => sanitarioService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario'] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ManejoSanitario> }) => sanitarioService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario'] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sanitarioService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitario'] });
      queryClient.invalidateQueries({ queryKey: ['sanitario-stats'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes_insumos'] });
    },
  });

  return {
    manejos: query.data?.data || [],
    totalManejos: query.data?.total || 0,
    stats: statsQuery.data || { andamento: 0, concluido: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createManejo: createMutation.mutateAsync,
    updateManejo: updateMutation.mutateAsync,
    deleteManejo: deleteMutation.mutateAsync,
  };
};
