import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Menu, Sprout, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, toggleSidebar, setActivePage, showToast } = useUIStore();
  const { displayName, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      showToast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
    } finally {
      setIsSigningOut(false);
    }
  };

  const roleLabel = role === 'superadmin' ? 'Administrador' : 'Assistente';
  const initials = getInitials(displayName);

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 z-20 sticky top-0">
      <div className="flex items-center space-x-3">
        <Button
          variant="icon"
          onClick={toggleSidebar}
          className="md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <Link
          to="/dashboard"
          className="md:hidden flex items-center cursor-pointer"
          onClick={() => setActivePage('Dashboard')}
        >
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-2">
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">FarmNexus</span>
        </Link>

        {/* Global Search Bar */}
        <div className="relative w-64 md:w-80 hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400 w-4 h-4" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-all"
            placeholder="Buscar ID, Brinco, Pasto, Insumo..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Dark/Light Mode Toggle Button */}
        <Button
          variant="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          aria-label="Alternar Tema"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-colors" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 hover:text-emerald-600 transition-colors" />
          )}
        </Button>

        {/* User Info */}
        <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-800 pl-4">
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-gray-800 dark:text-gray-200 leading-none text-sm">{displayName}</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 font-medium">{roleLabel}</p>
          </div>
          <div
            className="h-9 w-9 rounded-full border-2 border-emerald-100 dark:border-emerald-800 bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs"
            role="img"
            aria-label={displayName}
          >
            {initials}
          </div>
          <Button
            variant="icon"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Sair"
            aria-label="Sair da conta"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
