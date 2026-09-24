import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Toast } from '@/components/Toast';
import { AccountSettingsPanel } from '@/components/AccountSettingsPanel';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { syncAnimais } from '@/services/animaisService';

export const AppLayout: React.FC = () => {
  const { theme, toast, hideToast, slidePanel, closeSlidePanel } = useUIStore();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { status: connectivityStatus } = useConnectivityStore();
  useConnectivity();
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!session || connectivityStatus === 'offline') return;
    void syncAnimais().then(() => {
      void queryClient.invalidateQueries({ queryKey: ['animais', session.user.id] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['pastagens'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    });
  }, [connectivityStatus, queryClient, session]);

  // Listener de Atalho de Teclado Global: 'Esc' para fechar formulários e modais abertos
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && slidePanel.isOpen) {
        closeSlidePanel();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [slidePanel.isOpen, closeSlidePanel]);

  // Garante que ao trocar de rota, a página role para o topo automaticamente
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Aplica classe 'dark' no html / root element de forma reativa e não travada no navegador
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex transition-colors duration-200 font-sans">
      {/* Sidebar Global */}
      <Sidebar />

      {/* Main Container Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Navbar Global */}
        <Navbar onOpenAccountSettings={() => setIsAccountSettingsOpen(true)} />

        {/* Dynamic Page Content Rendered via Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <AccountSettingsPanel
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />

      {/* Toast Notification Handler Global */}
      {toast && toast.visible && (
        <Toast
          isVisible={toast.visible}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default AppLayout;
