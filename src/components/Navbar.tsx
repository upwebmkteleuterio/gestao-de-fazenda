import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Sprout, LogOut } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedThemeToggler } from '@/components/AnimatedThemeToggler';
import { Button } from '@/components/Button';

interface NavbarProps {
  onOpenAccountSettings: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAccountSettings }) => {
  const { toggleSidebar, setActivePage, showToast } = useUIStore();
  const { displayName, isLoadingProfile, role, signOut } = useAuth();
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
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Dark/Light Mode Toggle Button */}
        <AnimatedThemeToggler />

        {/* User Info */}
        <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-800 pl-4">
          <button
            type="button"
            onClick={onOpenAccountSettings}
            className="flex items-center space-x-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label="Abrir configurações da conta"
          >
            <div className="hidden sm:block text-right">
              {isLoadingProfile ? (
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
              ) : (
                <p className="font-semibold text-gray-800 dark:text-gray-200 leading-none text-sm">{displayName}</p>
              )}
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 font-medium">{roleLabel}</p>
            </div>
            <div
              className={isLoadingProfile
                ? 'h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700'
                : 'h-9 w-9 rounded-full border-2 border-emerald-100 dark:border-emerald-800 bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs'}
              aria-hidden="true"
            >
              {!isLoadingProfile && initials}
            </div>
          </button>
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
