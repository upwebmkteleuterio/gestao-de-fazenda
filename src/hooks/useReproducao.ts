import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reproducaoService } from '../services/reproducaoService';
import { EventoReproducao } from '../types/database';

export const useReproducao = (filters?: { search?: string; protocolo?: string; resultadoDg?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reproducao', filters],
    queryFn: () => reproducaoService.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>) => reproducaoService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventoReproducao> }) => reproducaoService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reproducaoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reproducao'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    eventos: query.data?.data || [],
    totalEventos: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createEvento: createMutation.mutateAsync,
    updateEvento: updateMutation.mutateAsync,
    deleteEvento: deleteMutation.mutateAsync,
  };
};
