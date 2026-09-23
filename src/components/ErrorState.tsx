import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Falha ao carregar dados',
  message = 'Não foi possível conectar ao servidor ou a solicitação excedeu o tempo limite. Verifique sua conexão e tente novamente.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 transition-all ${className}`}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 shadow-sm">
        <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button variant="primary" icon={RotateCcw} onClick={onRetry}>
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  );
};
