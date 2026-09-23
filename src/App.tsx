import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import SuperadminRoute from '@/components/SuperadminRoute';
import { LoginPage } from '@/pages/Login';

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
      staleTime: 1000 * 60 * 5,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
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
              <Route element={<SuperadminRoute />}>
                <Route path="/financeiro" element={<FinanceiroPage />} />
              </Route>
              <Route path="/relatorios" element={<IndicadoresPage />} />
              <Route path="/indicadores" element={<Navigate to="/relatorios" replace />} />
              <Route path="/uikit" element={<UIKitPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
