import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { appSettingsService } from '@/services/appSettingsService';

export const APP_SETTINGS_QUERY_KEY = ['app-settings', 'global'] as const;
const DEFAULT_FARM_NAME = 'Fazenda Boa Esperança';

export function useAppSettings() {
  const queryClient = useQueryClient();
  const { role, session } = useAuth();
  const canUpdate = role === 'superadmin';

  const query = useQuery({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: appSettingsService.getGlobal,
    enabled: Boolean(session),
  });

  const updateMutation = useMutation({
    mutationFn: (farmName: string) => {
      if (!canUpdate) {
        throw new Error('Você não tem permissão para editar o nome da fazenda.');
      }
      return appSettingsService.updateFarmName(farmName);
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, settings);
      void queryClient.invalidateQueries({ queryKey: APP_SETTINGS_QUERY_KEY });
    },
  });

  return {
    settings: query.data,
    farmName: query.data?.farm_name?.trim() || DEFAULT_FARM_NAME,
    isLoading: query.isLoading,
    isError: query.isError,
    updateFarmName: canUpdate ? updateMutation.mutateAsync : undefined,
    isUpdating: canUpdate && updateMutation.isPending,
  };
}
