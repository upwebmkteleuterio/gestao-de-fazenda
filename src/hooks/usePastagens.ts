import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pastagensService } from '../services/pastagensService';
import { Pastagem, ServicoPastagem } from '../types/database';

export const usePastagens = (filters?: { search?: string; status?: string; page?: number; limit?: number }, pastoIdSelected?: string) => {
  const queryClient = useQueryClient();

  const pastosQuery = useQuery({
    queryKey: ['pastagens', filters],
    queryFn: () => pastagensService.getAll(filters),
  });

  const servicosQuery = useQuery({
    queryKey: ['servicos_pastagens', pastoIdSelected],
    queryFn: () => pastagensService.getServicos(pastoIdSelected),
  });

  const createPastoMutation = useMutation({
    mutationFn: (item: Omit<Pastagem, 'id' | 'createdAt'>) => pastagensService.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
    },
  });

  const updatePastoMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pastagem> }) => pastagensService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
    },
  });

  const deletePastoMutation = useMutation({
    mutationFn: (id: string) => pastagensService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      queryClient.invalidateQueries({ queryKey: ['animais'] });
    },
  });

  const addServicoMutation = useMutation({
    mutationFn: (item: Omit<ServicoPastagem, 'id' | 'createdAt'>) => pastagensService.addServico(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos_pastagens'] });
    },
  });

  return {
    pastagens: pastosQuery.data?.data || [],
    total: pastosQuery.data?.total || 0,
    isLoadingPastagens: pastosQuery.isLoading,
    isErrorPastagens: pastosQuery.isError,
    errorPastagens: pastosQuery.error,
    refetchPastagens: pastosQuery.refetch,
    servicos: servicosQuery.data || [],
    isLoadingServicos: servicosQuery.isLoading,
    isErrorServicos: servicosQuery.isError,
    refetchServicos: servicosQuery.refetch,
    createPastagem: createPastoMutation.mutateAsync,
    updatePastagem: updatePastoMutation.mutateAsync,
    deletePastagem: deletePastoMutation.mutateAsync,
    addServico: addServicoMutation.mutateAsync,
  };
};
