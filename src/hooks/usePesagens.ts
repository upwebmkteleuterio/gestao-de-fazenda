import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pesagensService } from '@/services/pesagensService';
import { Pesagem } from '@/types/database';

export const usePesagens = (filters?: {
  search?: string;
  tipoAnimal?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pesagens', filters],
    queryFn: () => pesagensService.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>) => pesagensService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (items: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>[]) => pesagensService.createGroup(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pesagem> }) => pesagensService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pesagensService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pesagens-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    pesagens: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createPesagem: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createPesagemGrupo: createGroupMutation.mutateAsync,
    isCreatingGrupo: createGroupMutation.isPending,
    updatePesagem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deletePesagem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const usePesagensRecentes = () => {
  const query = useQuery({
    queryKey: ['pesagens-recentes'],
    queryFn: pesagensService.getRecent,
  });

  return {
    pesagens: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
