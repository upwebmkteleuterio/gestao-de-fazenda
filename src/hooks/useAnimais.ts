import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { animaisService } from '../services/animaisService';
import { Animal } from '../types/database';

export const useAnimais = (filters?: {
  search?: string;
  sexo?: string;
  status?: string;
  categoria?: string;
  tipo?: string;
  pasto_id?: string;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['animais', filters],
    queryFn: () => animaisService.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (newAnimal: Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>) => animaisService.create(newAnimal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Animal> }) => animaisService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => animaisService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animais'] });
      queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  return {
    animais: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createAnimal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAnimal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAnimal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
