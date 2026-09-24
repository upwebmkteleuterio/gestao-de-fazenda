import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { appSettingsService, AppSettings } from '@/services/appSettingsService';
import { getOfflineSnapshot, saveOfflineSnapshot } from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';

export const APP_SETTINGS_QUERY_KEY = ['app-settings', 'global'] as const;
const APP_SETTINGS_SNAPSHOT_KEY = 'app-settings-global';

type AppSettingsDataSource = 'online' | 'snapshot' | 'unavailable';

type AppSettingsQueryData = {
  settings?: AppSettings;
  dataSource: AppSettingsDataSource;
  snapshotCapturedAt: string | null;
};

const isOffline = (): boolean => (
  useConnectivityStore.getState().status === 'offline'
  || (typeof navigator !== 'undefined' && !navigator.onLine)
);

const readAppSettingsSnapshot = async (snapshotKey: string) => {
  try {
    return await getOfflineSnapshot<AppSettings>(snapshotKey);
  } catch {
    return undefined;
  }
};

export function useAppSettings() {
  const queryClient = useQueryClient();
  const { role, session } = useAuth();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const canUpdate = role === 'superadmin';
  const snapshotKey = session?.user.id ? `${APP_SETTINGS_SNAPSHOT_KEY}:${session.user.id}` : APP_SETTINGS_SNAPSHOT_KEY;
  const wasOffline = useRef(connectivityStatus === 'offline');

  const query = useQuery<AppSettingsQueryData>({
    queryKey: APP_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      if (isOffline()) {
        const snapshot = await readAppSettingsSnapshot(snapshotKey);
        return snapshot
          ? { settings: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt }
          : { dataSource: 'unavailable', snapshotCapturedAt: null };
      }

      try {
        const settings = await appSettingsService.getGlobal();
        const capturedAt = new Date().toISOString();
        void saveOfflineSnapshot({
          key: snapshotKey,
          scope: 'app-settings',
          data: settings,
          capturedAt,
        }).catch(() => undefined);
        return { settings, dataSource: 'online', snapshotCapturedAt: null };
      } catch (error) {
        const snapshot = await readAppSettingsSnapshot(snapshotKey);
        if (snapshot) {
          return { settings: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt };
        }
        throw error;
      }
    },
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (connectivityStatus === 'online' && wasOffline.current && session) {
      void query.refetch();
    }
    wasOffline.current = connectivityStatus === 'offline';
  }, [connectivityStatus, query.refetch, session]);

  const updateMutation = useMutation({
    mutationFn: (farmName: string) => {
      if (!canUpdate) {
        throw new Error('Você não tem permissão para editar o nome da fazenda.');
      }
      return appSettingsService.updateFarmName(farmName);
    },
    onSuccess: (settings) => {
      const capturedAt = new Date().toISOString();
      void saveOfflineSnapshot({
        key: snapshotKey,
        scope: 'app-settings',
        data: settings,
        capturedAt,
      }).catch(() => undefined);
      queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, {
        settings,
        dataSource: 'online',
        snapshotCapturedAt: null,
      } satisfies AppSettingsQueryData);
      void queryClient.invalidateQueries({ queryKey: APP_SETTINGS_QUERY_KEY });
    },
  });

  const isLoading = query.isPending;

  return {
    settings: query.data?.settings,
    farmName: query.isError ? 'Nome indisponível' : isLoading ? '' : query.data?.settings?.farm_name?.trim() || 'Nome indisponível',
    dataSource: query.data?.dataSource ?? 'unavailable',
    snapshotCapturedAt: query.data?.snapshotCapturedAt ?? null,
    isOffline: isOffline(),
    canUpdateFarmName: canUpdate && !isOffline(),
    isLoading,
    isError: query.isError,
    updateFarmName: canUpdate && !isOffline() ? updateMutation.mutateAsync : undefined,
    isUpdating: canUpdate && updateMutation.isPending,
  };
}
