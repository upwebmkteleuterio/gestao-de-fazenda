import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import type { ConnectivityStatus } from '@/store/useConnectivityStore';

const statusLabels: Record<ConnectivityStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Sincronizando',
  error: 'Erro',
};

const statusStyles: Record<ConnectivityStatus, string> = {
  online: 'text-emerald-300 dark:text-emerald-400',
  offline: 'text-amber-300 dark:text-amber-400',
  syncing: 'text-sky-300 dark:text-sky-400',
  error: 'text-red-300 dark:text-red-400',
};

const statusIcons: Record<ConnectivityStatus, React.ComponentType<{ className?: string }>> = {
  online: Wifi,
  offline: WifiOff,
  syncing: RefreshCw,
  error: AlertCircle,
};

export const ConnectionStatus: React.FC = () => {
  const { status, errorMessage } = useConnectivityStore();
  const Icon = statusIcons[status];

  return (
    <p
      className={`text-[10px] mt-0.5 flex items-center gap-1 ${statusStyles[status]}`}
      aria-live="polite"
      title={errorMessage ?? undefined}
    >
      <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>Status: {statusLabels[status]}</span>
    </p>
  );
};
