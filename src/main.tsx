import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { AppSplashScreen } from '@/components/AppSplashScreen';
import { SessionContextProvider } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { registerServiceWorker } from '@/offline/serviceWorker';
import './index.css';

registerServiceWorker();

function AppBootstrap() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const handleSplashComplete = useCallback(() => setIsSplashVisible(false), []);

  if (isSplashVisible) {
    return <AppSplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <App />
      </SessionContextProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
);
