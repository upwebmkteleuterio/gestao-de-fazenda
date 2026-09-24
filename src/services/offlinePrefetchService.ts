import { supabase } from '@/integrations/supabase/client';
import { saveOfflineSnapshot } from '@/offline/database';
import { animaisService, syncAnimais } from '@/services/animaisService';
import { appSettingsService } from '@/services/appSettingsService';
import { dashboardService } from '@/services/dashboardService';
import { pesagensService } from '@/services/pesagensService';
import { useConnectivityStore } from '@/store/useConnectivityStore';

const DASHBOARD_SNAPSHOT_KEY = 'dashboard-summary';
const PESAGENS_RECENTES_SNAPSHOT_KEY = 'pesagens-recentes';
const APP_SETTINGS_SNAPSHOT_KEY = 'app-settings-global';

type ActivePrefetch = {
  userId: string;
  promise: Promise<void>;
};

let activePrefetch: ActivePrefetch | null = null;

const isBrowserOnline = (): boolean => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);

const getCurrentUserId = async (): Promise<string | undefined> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
};

const canContinue = async (userId: string): Promise<boolean> => (
  isBrowserOnline() && (await getCurrentUserId()) === userId
);

const runSource = async (userId: string, source: () => Promise<void>): Promise<boolean> => {
  if (!(await canContinue(userId))) return false;
  try {
    await source();
  } catch {
    if (!(await canContinue(userId))) return false;
  }
  return canContinue(userId);
};

const runPrefetch = async (userId: string): Promise<void> => {
  useConnectivityStore.getState().setSyncing();

  try {
    await runSource(userId, async () => {
      await syncAnimais();
      if (!(await canContinue(userId))) return;
      await animaisService.getAll({ includeHistorico: true });
    });

    if (!(await canContinue(userId))) return;
    useConnectivityStore.getState().setSyncing();
    await runSource(userId, async () => {
      const summary = await dashboardService.getSummary();
      if (!(await canContinue(userId))) return;
      const capturedAt = new Date().toISOString();
      await saveOfflineSnapshot({
        key: `${DASHBOARD_SNAPSHOT_KEY}:${userId}`,
        scope: 'dashboard',
        data: summary,
        capturedAt,
      });
    });

    if (!(await canContinue(userId))) return;
    useConnectivityStore.getState().setSyncing();
    await runSource(userId, async () => {
      const pesagens = await pesagensService.getRecent();
      if (!(await canContinue(userId))) return;
      const capturedAt = new Date().toISOString();
      await saveOfflineSnapshot({
        key: `${PESAGENS_RECENTES_SNAPSHOT_KEY}:${userId}`,
        scope: 'pesagens-recentes',
        data: pesagens,
        capturedAt,
      });
    });

    if (!(await canContinue(userId))) return;
    useConnectivityStore.getState().setSyncing();
    await runSource(userId, async () => {
      const settings = await appSettingsService.getGlobal();
      if (!(await canContinue(userId))) return;
      const capturedAt = new Date().toISOString();
      await saveOfflineSnapshot({
        key: `${APP_SETTINGS_SNAPSHOT_KEY}:${userId}`,
        scope: 'app-settings',
        data: settings,
        capturedAt,
      });
    });
  } finally {
    if ((await getCurrentUserId()) === userId) {
      if (isBrowserOnline()) useConnectivityStore.getState().setOnline();
      else useConnectivityStore.getState().setOffline();
    }
  }
};

export const prefetchOfflineData = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId || !isBrowserOnline()) return;

  if (activePrefetch) {
    if (activePrefetch.userId === userId) return activePrefetch.promise;
    await activePrefetch.promise;
    if (!(await canContinue(userId))) return;
  }

  let promise: Promise<void>;
  promise = runPrefetch(userId).finally(() => {
    if (activePrefetch?.promise === promise) activePrefetch = null;
  });
  activePrefetch = { userId, promise };
  return promise;
};