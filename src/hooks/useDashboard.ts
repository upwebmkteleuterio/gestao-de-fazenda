import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardSummary } from '@/services/dashboardService';
import { getOfflineSnapshot, saveOfflineSnapshot } from '@/offline/database';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectivityStore } from '@/store/useConnectivityStore';

const DASHBOARD_SNAPSHOT_KEY = 'dashboard-summary';

type DashboardDataSource = 'online' | 'snapshot' | 'unavailable';

type DashboardQueryData = {
  summary?: DashboardSummary;
  dataSource: DashboardDataSource;
  snapshotCapturedAt: string | null;
};

const isOffline = (): boolean => (
  useConnectivityStore.getState().status === 'offline'
  || (typeof navigator !== 'undefined' && !navigator.onLine)
);

const readDashboardSnapshot = async (snapshotKey: string) => {
  try {
    return await getOfflineSnapshot<DashboardSummary>(snapshotKey);
  } catch {
    return undefined;
  }
};

export const useDashboard = () => {
  const { session } = useAuth();
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const snapshotKey = session?.user.id ? `${DASHBOARD_SNAPSHOT_KEY}:${session.user.id}` : DASHBOARD_SNAPSHOT_KEY;
  const wasOffline = useRef(connectivityStatus === 'offline');
  const query = useQuery<DashboardQueryData>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      if (isOffline()) {
        const snapshot = await readDashboardSnapshot(snapshotKey);
        return snapshot
          ? { summary: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt }
          : { dataSource: 'unavailable', snapshotCapturedAt: null };
      }

      try {
        const summary = await dashboardService.getSummary();
        const capturedAt = new Date().toISOString();
        void saveOfflineSnapshot({
          key: snapshotKey,
          scope: 'dashboard',
          data: summary,
          capturedAt,
        }).catch(() => undefined);
        return { summary, dataSource: 'online', snapshotCapturedAt: null };
      } catch (error) {
        const snapshot = await readDashboardSnapshot(snapshotKey);
        if (snapshot) {
          return { summary: snapshot.data, dataSource: 'snapshot', snapshotCapturedAt: snapshot.capturedAt };
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

  return {
    summary: query.data?.summary,
    dataSource: query.data?.dataSource ?? 'unavailable',
    snapshotCapturedAt: query.data?.snapshotCapturedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
