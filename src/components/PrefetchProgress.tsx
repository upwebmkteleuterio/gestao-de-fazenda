import React from 'react';
import { Check, CircleAlert, Download } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { usePrefetchProgressStore } from '@/store/usePrefetchProgressStore';

export const PrefetchProgress: React.FC = () => {
  const { status, currentStage, completedStages, completedStageNames, totalStages, errorMessage } = usePrefetchProgressStore();
  const reduceMotion = useReducedMotion() ?? false;

  if (status === 'idle') return null;
  if (status === 'completed') {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300/70 dark:text-emerald-400/70" aria-live="polite">
        <Check className="h-3 w-3" aria-hidden="true" /> Dados offline atualizados
      </p>
    );
  }

  const isError = status === 'error';
  const Icon = isError ? CircleAlert : Download;
  const currentNumber = Math.min(completedStages + 1, totalStages);
  const label = currentStage ? `Baixando dados: ${currentStage} · etapa ${currentNumber} de ${totalStages}` : `Baixando dados · etapa ${currentNumber} de ${totalStages}`;

  return (
    <div
      className={`mt-2 rounded-lg border px-2.5 py-2 text-[10px] ${isError ? 'border-red-400/30 bg-red-950/30 text-red-200' : 'border-sky-400/20 bg-sky-950/20 text-sky-200'}`}
      aria-live="polite"
      role="status"
      title={isError ? errorMessage ?? label : label}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 shrink-0 ${!reduceMotion && !isError ? 'animate-pulse' : ''}`} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      {completedStageNames.length > 0 && (
        <p className="mt-1 truncate text-[9px] text-emerald-200/70">Concluído: {completedStageNames.slice(-2).join(' · ')}</p>
      )}
      {isError && <p className="mt-1 truncate text-[9px] text-red-300/80">Etapa com erro; o restante continua.</p>}
    </div>
  );
};
