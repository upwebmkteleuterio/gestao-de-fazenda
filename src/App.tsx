import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/layouts/AppLayout';

// Pages
import { DashboardPage } from '@/pages/Dashboard';
import { AnimaisPage } from '@/pages/Animais';
import { Lotes as LotesPage } from '@/pages/Lotes';
import { PesagensPage } from '@/pages/Pesagens';
import { PastagensPage } from '@/pages/Pastagens';
import { ManejoReprodutivoPage } from '@/pages/ManejoReprodutivo';
import { ManejoSanitarioPage } from '@/pages/ManejoSanitario';
import { InsumosPage } from '@/pages/Insumos';
import { FinanceiroPage } from '@/pages/Financeiro';
import { IndicadoresPage } from '@/pages/Indicadores';
import { UIKitPage } from '@/pages/UIKit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/animais" element={<AnimaisPage />} />
            <Route path="/lotes" element={<LotesPage />} />
            <Route path="/pesagens" element={<PesagensPage />} />
            <Route path="/pastagens" element={<PastagensPage />} />
            <Route path="/reproducao" element={<ManejoReprodutivoPage />} />
            <Route path="/manejo-reprodutivo" element={<Navigate to="/reproducao" replace />} />
            <Route path="/sanitario" element={<ManejoSanitarioPage />} />
            <Route path="/manejo-sanitario" element={<Navigate to="/sanitario" replace />} />
            <Route path="/insumos" element={<InsumosPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/relatorios" element={<IndicadoresPage />} />
            <Route path="/indicadores" element={<Navigate to="/relatorios" replace />} />
            <Route path="/uikit" element={<UIKitPage />} />
            {/* Redirecionamento 404 para dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
