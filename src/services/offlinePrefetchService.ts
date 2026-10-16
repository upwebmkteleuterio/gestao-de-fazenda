import { getCurrentUserId as readCurrentUserId } from '@/integrations/supabase/client';
import { getOfflineSnapshot, saveOfflineSnapshot } from '@/offline/database';
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

const PREFETCH_PROGRESS_SCOPE = 'offline-prefetch-progress';
// Um download interrompido (queda de conexão) é retomado de onde parou; passado esse
// intervalo o cache offline é renovado por inteiro.
const PREFETCH_RESUME_WINDOW_MS = 30 * 60 * 1000;

const prefetchProgressKey = (userId: string): string => `${PREFETCH_PROGRESS_SCOPE}:${userId}`;

const readCompletedStages = async (userId: string): Promise<string[]> => {
  try {
    const snapshot = await getOfflineSnapshot<{ completed: string[] }>(prefetchProgressKey(userId));
    const capturedAt = snapshot?.capturedAt ? new Date(snapshot.capturedAt).getTime() : 0;
    if (!capturedAt || Date.now() - capturedAt > PREFETCH_RESUME_WINDOW_MS) return [];
    return snapshot?.data?.completed ?? [];
  } catch {
    return [];
  }
};

const writeCompletedStages = async (userId: string, completed: string[]): Promise<void> => {
  try {
    await saveOfflineSnapshot({
      key: prefetchProgressKey(userId),
      scope: `${PREFETCH_PROGRESS_SCOPE}:${userId}`,
      data: { completed },
      capturedAt: new Date().toISOString(),
    });
  } catch {
    // O progresso é apenas uma otimização: falhar aqui não pode interromper o download.
  }
};

const runSource = async (userId: string, stage: PrefetchStage, source: () => Promise<void>): Promise<boolean> => {
  const progress = usePrefetchProgressStore.getState();
  progress.beginStage(stage);
  try {
    await source();
    progress.completeStage(stage);
    return true;
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
      { name: 'Pesagens (histórico completo)', source: async () => { await syncPesagens(userId); await pesagensService.prefetchFirstPage(userId); } },
      { name: 'Manejo Reprodutivo (últimos 12 meses)', source: async () => { await reproducaoService.prefetchRecentWindow(userId); } },
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

    const completed = await readCompletedStages(userId);
    const progress = usePrefetchProgressStore.getState();
    completed.forEach((stage) => progress.completeStage(stage as PrefetchStage));

    for (const stage of stages) {
      if (completed.includes(stage.name)) continue;
      if (!(await canContinue(userId))) {
        usePrefetchProgressStore.getState().failStage(stage.name, 'Sincronização interrompida antes da conclusão.');
        return;
      }
      if (await runSource(userId, stage.name, stage.source)) {
        completed.push(stage.name);
        await writeCompletedStages(userId, completed);
      }
    }
  } finally {
    usePrefetchProgressStore.getState().finish(userId);
    useConnectivityStore.getState().resolveAfterSync();
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