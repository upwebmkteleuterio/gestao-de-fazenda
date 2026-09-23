import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { SessionContextProvider } from '@/contexts/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionContextProvider>
      <App />
    </SessionContextProvider>
  </StrictMode>,
);
