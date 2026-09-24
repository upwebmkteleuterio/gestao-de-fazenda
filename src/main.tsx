import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { SessionContextProvider } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { registerServiceWorker } from '@/offline/serviceWorker';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <App />
      </SessionContextProvider>
    </QueryClientProvider>
  </StrictMode>,
);
