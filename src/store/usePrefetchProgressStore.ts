import { create } from 'zustand';

export const PREFETCH_STAGES = [
  'Animais (cadastro completo)',
  'Lotes (primeira página)',
  'Pesagens (histórico recente)',
  'Manejo Reprodutivo (últimos 30 dias)',
  'Manejo Sanitário (duas abas, primeira página)',
  'Pastagens (cadastro)',
  'Financeiro (mês atual)',
  'Insumos (cadastro + histórico recente)',
  'Dashboard e configurações',
] as const;
export type PrefetchStage = (typeof PREFETCH_STAGES)[number];
export type PrefetchProgressStatus = 'idle' | 'running' | 'completed' | 'error';

type PrefetchProgressState = {
  status: PrefetchProgressStatus;
  currentStage: PrefetchStage | null;
  completedStages: number;
  completedStageNames: string[];
  totalStages: number;
  errorMessage: string | null;
  userId: string | null;
  start: (userId: string) => void;
  beginStage: (stage: PrefetchStage) => void;
  completeStage: (stage: PrefetchStage) => void;
  failStage: (stage: PrefetchStage, message: string) => void;
  finish: (userId: string) => void;
  reset: () => void;
};

export const usePrefetchProgressStore = create<PrefetchProgressState>((set) => ({
  status: 'idle',
  currentStage: null,
  completedStages: 0,
  completedStageNames: [],
  totalStages: PREFETCH_STAGES.length,
  errorMessage: null,
  userId: null,
  start: (userId) => set({ status: 'running', currentStage: null, completedStages: 0, completedStageNames: [], totalStages: PREFETCH_STAGES.length, errorMessage: null, userId }),
  beginStage: (stage) => set((state) => state.userId ? { status: 'running', currentStage: stage } : state),
  completeStage: (stage) => set((state) => {
    if (!state.userId || state.completedStageNames.includes(stage)) return state;
    const completedStageNames = [...state.completedStageNames, stage];
    return { status: 'running', currentStage: stage, completedStages: completedStageNames.length, completedStageNames };
  }),
  failStage: (stage, message) => set((state) => {
    if (!state.userId || state.completedStageNames.some((item) => item === stage || item === `${stage} · erro`)) return state;
    const completedStageNames = [...state.completedStageNames, `${stage} · erro`];
    return { status: 'error', currentStage: stage, completedStages: completedStageNames.length, completedStageNames, errorMessage: message };
  }),
  finish: (userId) => set((state) => state.userId === userId ? { status: state.errorMessage ? 'error' : 'completed', currentStage: null } : state),
  reset: () => set({ status: 'idle', currentStage: null, completedStages: 0, completedStageNames: [], totalStages: PREFETCH_STAGES.length, errorMessage: null, userId: null }),
}));
