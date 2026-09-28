import { getCurrentUserId as readCurrentUserId } from '@/integrations/supabase/client';
import { saveOfflineSnapshot } from '@/offline/database';
import { animaisService, syncAnimais } from '@/services/animaisService';
import { pastagensService, syncPastagens } from '@/services/pastagensService';
import { appSettingsService } from '@/services/appSettingsService';
import { dashboardService } from '@/services/dashboardService';
import { financeiroService, syncFinanceiro } from '@/services/financeiroService';
import { pesagensService, syncPesagens } from '@/services/pesagensService';
import { lotesService, syncLotes } from '@/services/lotesService';
import { reproducaoService } from '@/services/reproducaoService';
import { sanitarioService } from '@/services/sanitarioService';
import { insumosService, syncInsumos } from '@/services/insumosService';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { usePrefetchProgressStore, type PrefetchStage } from '@/store/usePrefetchProgressStore';

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

const getCurrentUserId = (): Promise<string | undefined> => readCurrentUserId(isBrowserOnline());

const canContinue = async (userId: string): Promise<boolean> => (
  isBrowserOnline() && (await getCurrentUserId()) === userId
);

const runSource = async (userId: string, stage: PrefetchStage, source: () => Promise<void>): Promise<boolean> => {
  const progress = usePrefetchProgressStore.getState();
  progress.beginStage(stage);
  if (!(await canContinue(userId))) {
    progress.failStage(stage, 'Sincronização interrompida antes da conclusão.');
    return false;
  }
  try {
    await source();
    progress.completeStage(stage);
    return await canContinue(userId);
  } catch (error) {
    if (usePrefetchProgressStore.getState().userId === userId) {
      progress.failStage(stage, error instanceof Error ? error.message : 'Não foi possível baixar esta etapa.');
    }
    return false;
  }
};

const runPrefetch = async (userId: string): Promise<void> => {
  usePrefetchProgressStore.getState().start(userId);
  useConnectivityStore.getState().setSyncing();

  try {
    const stages: Array<{ name: PrefetchStage; source: () => Promise<void> }> = [
      { name: 'Animais (cadastro completo)', source: async () => { await syncAnimais(userId); await animaisService.getAll({ includeHistorico: true }); } },
      { name: 'Lotes (primeira página)', source: async () => { await syncLotes(userId); await lotesService.getAll(userId, { page: 1, limit: 10 }); } },
      { name: 'Pesagens (histórico recente)', source: async () => { await syncPesagens(userId); await pesagensService.prefetchFirstPage(userId); } },
      { name: 'Manejo Reprodutivo (últimos 30 dias)', source: async () => { await reproducaoService.prefetchRecentWindow(userId); } },
      { name: 'Manejo Sanitário (duas abas, primeira página)', source: async () => { await sanitarioService.prefetchFirstPages(userId); } },
      { name: 'Pastagens (cadastro)', source: async () => { await syncPastagens(userId); await pastagensService.getAll(userId); } },
      { name: 'Financeiro (mês atual)', source: async () => { await syncFinanceiro(userId); await financeiroService.prefetchCurrentMonth(userId); } },
      { name: 'Insumos (cadastro + histórico recente)', source: async () => { await syncInsumos(userId); await insumosService.prefetch(userId); } },
      {
        name: 'Dashboard e configurações',
        source: async () => {
          const summary = await dashboardService.getSummary();
          await saveOfflineSnapshot({ key: `${DASHBOARD_SNAPSHOT_KEY}:${userId}`, scope: 'dashboard', data: summary, capturedAt: new Date().toISOString() });
          const pesagens = await pesagensService.getRecent();
          await saveOfflineSnapshot({ key: `${PESAGENS_RECENTES_SNAPSHOT_KEY}:${userId}`, scope: 'pesagens-recentes', data: pesagens, capturedAt: new Date().toISOString() });
          const settings = await appSettingsService.getGlobal();
          await saveOfflineSnapshot({ key: `${APP_SETTINGS_SNAPSHOT_KEY}:${userId}`, scope: 'app-settings', data: settings, capturedAt: new Date().toISOString() });
        },
      },
    ];

    for (const stage of stages) {
      if (!(await canContinue(userId))) return;
      await runSource(userId, stage.name, stage.source);
    }
  } finally {
    usePrefetchProgressStore.getState().finish(userId);
    if (isBrowserOnline() && (await getCurrentUserId()) === userId) {
      useConnectivityStore.getState().setOnline();
    } else if (!isBrowserOnline()) {
      useConnectivityStore.getState().setOffline();
    }
  }
};

export const prefetchOfflineData = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
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