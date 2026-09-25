import { AlertCircle, CloudUpload, RefreshCw } from 'lucide-react';

export type SyncStatus = 'pending' | 'processing' | 'error' | 'synced' | undefined;

interface SyncStatusIndicatorProps {
  status?: SyncStatus;
  error?: string;
}

export const SyncStatusIndicator = ({ status, error }: SyncStatusIndicatorProps) => {
  if (!status || status === 'synced') return null;

  const label = status === 'error'
    ? error || 'Falha na sincronização'
    : status === 'processing'
      ? 'Sincronização em andamento'
      : 'Alteração pendente de sincronização';
  const className = status === 'error'
    ? 'text-red-600 dark:text-red-300'
    : status === 'processing'
      ? 'text-blue-600 dark:text-blue-300'
      : 'text-amber-600 dark:text-amber-300';

  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {status === 'processing' ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : status === 'error' ? (
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </span>
  );
};
