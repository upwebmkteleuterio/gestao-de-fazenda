import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { animaisService, AnimalCreateInput, syncAnimais } from '../services/animaisService';
import { Animal } from '../types/database';
import { AnimalSortField, SortDirection } from '@/utils/animalSort';

export const useMaeCandidates = (search: string, excludeId?: string) => {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['animais-maes', userId, search.trim().toLocaleLowerCase(), excludeId],
    queryFn: () => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return animaisService.searchMaeCandidates(userId, search, excludeId);
    },
    enabled: Boolean(userId && search.trim()),
    staleTime: 30_000,
    refetchOnReconnect: true,
  });
};

export const useAnimalChildren = (motherId?: string) => {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['animais-filhos', userId, motherId],
    queryFn: () => {
      if (!userId || !motherId) throw new Error('Mãe não informada.');
      return animaisService.getChildrenByMother(userId, motherId);
    },
    enabled: Boolean(userId && motherId),
    refetchOnReconnect: true,
  });
};

type AnimalFilters = {
  search?: string;
  sexo?: string;
  status?: string;
  categoria?: string;
  tipo?: string;
  pasto_id?: string;
  includeHistorico?: boolean;
  page?: number;
  limit?: number;
  sortBy?: AnimalSortField;
  sortDir?: SortDirection;
};

type AnimalQueryData = {
  data: Animal[];
  total: number;
  source: 'remote' | 'local';
  capturedAt?: string;
};

const matchesAnimalFilters = (animal: Animal, filters?: AnimalFilters): boolean => {
  const search = filters?.search?.trim().toLocaleLowerCase();
  return (!search || [animal.brinco, animal.raca, animal.cdc, animal.cdn].some((value) => value?.toLocaleLowerCase().includes(search)))
    && (!filters?.sexo || filters.sexo === 'all' || animal.sexo === filters.sexo)
    && (!filters?.status || filters.status === 'all' || animal.status === filters.status)
    && (!filters?.categoria || filters.categoria === 'all' || animal.categoria === filters.categoria)
    && (!filters?.tipo || filters.tipo === 'all' || animal.tipo_animal === filters.tipo)
    && (!filters?.pasto_id || filters.pasto_id === 'all' || animal.pasto_id === filters.pasto_id);
};

export const useAnimais = (filters?: AnimalFilters) => {
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
    void queryClient.invalidateQueries({ queryKey: ['animais', userId] });
    void queryClient.invalidateQueries({ queryKey: ['animais-filhos', userId] });
    void queryClient.invalidateQueries({ queryKey: ['animais-maes', userId] });
    void queryClient.invalidateQueries({ queryKey: ['lotes'] });
    void queryClient.invalidateQueries({ queryKey: ['pastagens'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const syncLocalMutation = () => {
    if (!userId) return;
    void syncAnimais(userId)
      .catch(() => undefined)
      .finally(invalidateAnimalQueries);
  };

  const updateLocalAnimalCache = (animal: Animal) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<AnimalQueryData>({ queryKey: ['animais', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const queryFilters = queryKey[2] as AnimalFilters | undefined;
      const exists = current.data.some((item) => item.id === animal.id);
      const matches = matchesAnimalFilters(animal, queryFilters);
      if (!matches && !exists) return;
      if (!matches) {
        const data = current.data.filter((item) => item.id !== animal.id);
        queryClient.setQueryData<AnimalQueryData>(queryKey, {
          ...current,
          data,
          total: Math.max(0, current.total - (data.length === current.data.length ? 0 : 1)),
          source: 'local',
        });
        return;
      }
      if (!exists && queryFilters?.page !== undefined && queryFilters.page !== 1) return;
      queryClient.setQueryData<AnimalQueryData>(queryKey, {
        ...current,
        data: exists
          ? current.data.map((item) => item.id === animal.id ? animal : item)
          : [animal, ...current.data],
        total: exists ? current.total : current.total + 1,
        source: 'local',
      });
    });
  };

  const removeLocalAnimalFromCache = (id: string) => {
    if (!userId) return;
    const queries = queryClient.getQueriesData<AnimalQueryData>({ queryKey: ['animais', userId] });
    queries.forEach(([queryKey, current]) => {
      if (!current) return;
      const data = current.data.filter((item) => item.id !== id);
      if (data.length === current.data.length) return;
      queryClient.setQueryData<AnimalQueryData>(queryKey, {
        ...current,
        data,
        total: Math.max(0, current.total - 1),
        source: 'local',
      });
    });
  };

  const createMutation = useMutation({
    networkMode: 'always',
    mutationFn: (newAnimal: AnimalCreateInput) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return animaisService.create(userId, newAnimal);
    },
    onSuccess: (animal) => {
      updateLocalAnimalCache(animal);
      invalidateAnimalQueries();
    },
  });

  const updateMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Animal> }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return animaisService.update(userId, id, updates);
    },
    onSuccess: (animal) => {
      updateLocalAnimalCache(animal);
      invalidateAnimalQueries();
    },
  });

  const updateAnimalPastureMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, pastoId, pastoNome }: { id: string; pastoId?: string; pastoNome?: string }) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return animaisService.updateAnimalPasture(userId, id, pastoId, pastoNome);
    },
    onSuccess: (animal) => {
      updateLocalAnimalCache(animal);
      invalidateAnimalQueries();
    },
  });

  const deleteMutation = useMutation({
    networkMode: 'always',
    mutationFn: (id: string) => {
      if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
      return animaisService.delete(userId, id);
    },
    onSuccess: (_, id) => {
      removeLocalAnimalFromCache(id);
      invalidateAnimalQueries();
    },
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
    updateAnimalPasture: updateAnimalPastureMutation.mutateAsync,
    deleteAnimal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    syncLocalMutation,
  };
};
