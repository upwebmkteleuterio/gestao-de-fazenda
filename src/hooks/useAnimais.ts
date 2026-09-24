import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { animaisService, AnimalCreateInput } from '../services/animaisService';
import { Animal } from '../types/database';

export const useAnimais = (filters?: {
  search?: string;
  sexo?: string;
  status?: string;
  categoria?: string;
  tipo?: string;
  pasto_id?: string;
  includeHistorico?: boolean;
  page?: number;
  limit?: number;
}) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['animais', userId, filters],
    queryFn: () => animaisService.getAll(filters),
    enabled: Boolean(userId),
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!userId || connectivityStatus !== 'offline') return;
    void queryClient.invalidateQueries({ queryKey: ['animais', userId] });
  }, [connectivityStatus, queryClient, userId]);

  const invalidateAnimalQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['animais'] });
    queryClient.invalidateQueries({ queryKey: ['lotes'] });
    queryClient.invalidateQueries({ queryKey: ['pastagens'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: (newAnimal: AnimalCreateInput) => animaisService.create(newAnimal),
    onSuccess: invalidateAnimalQueries,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Animal> }) => animaisService.update(id, updates),
    onSuccess: invalidateAnimalQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => animaisService.delete(id),
    onSuccess: invalidateAnimalQueries,
  });

  const fetchAllAnimais = useCallback(async (): Promise<Animal[]> => {
    const batchSize = 500;
    const first = await animaisService.getAll({ page: 1, limit: batchSize, includeHistorico: false });
    const batches = [first.data];
    for (let page = 2; (page - 1) * batchSize < first.total; page += 1) {
      const batch = await animaisService.getAll({ page, limit: batchSize, includeHistorico: false });
      batches.push(batch.data);
    }
    return batches.flat();
  }, []);

  return {
    animais: query.data?.data || [],
    total: query.data?.total || 0,
    source: query.data?.source ?? null,
    lastSyncedAt: query.data?.capturedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchAllAnimais,
    createAnimal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAnimal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAnimal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
