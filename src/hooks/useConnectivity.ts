import { useEffect } from 'react';
import { useConnectivityStore } from '@/store/useConnectivityStore';

export const useConnectivity = () => {
  const connectivity = useConnectivityStore();

  useEffect(() => {
    const handleOnline = () => useConnectivityStore.getState().setOnline();
    const handleOffline = () => useConnectivityStore.getState().setOffline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return connectivity;
};
