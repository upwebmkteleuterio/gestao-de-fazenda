import React from 'react';
import { Button } from '@/components/Button';

interface ReprodutivoBatchBarProps {
  selectedCount: number;
  onRegistrarLote: () => void;
  onLimparSelecao: () => void;
}

export const ReprodutivoBatchBar: React.FC<ReprodutivoBatchBarProps> = ({
  selectedCount,
  onRegistrarLote,
  onLimparSelecao,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-900/95 text-white border border-gray-700/80 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md max-w-2xl w-11/12 animate-slide-up">
      <div className="flex items-center space-x-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-gray-950 font-bold text-xs">
          {selectedCount}
        </span>
        <span className="text-sm font-semibold text-gray-100">
          {selectedCount === 1
            ? '1 evento selecionado'
            : `${selectedCount} eventos selecionados`}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="primary"
          onClick={onRegistrarLote}
          className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-3 py-1.5 text-xs min-h-[44px]"
        >
          Registrar Lote ({selectedCount})
        </Button>
        <Button
          variant="ghost"
          onClick={onLimparSelecao}
          className="!bg-slate-800 hover:!bg-slate-700 !text-white hover:!text-white border border-slate-600 font-bold px-3.5 py-1.5 text-xs rounded-lg transition-all shadow-sm min-h-[44px]"
        >
          Desmarcar Todos
        </Button>
      </div>
    </div>
  );
};
