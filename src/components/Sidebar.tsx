import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard,
  Layers,
  Scale,
  Map,
  HeartHandshake,
  Syringe,
  Package,
  DollarSign,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sprout
} from 'lucide-react';
import { BovinoSidebarIcon } from './BovinoSidebarIcon';
import { useUIStore, PageRoute } from '../store/useUIStore';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { PrefetchProgress } from '@/components/PrefetchProgress';

export const Sidebar: React.FC = () => {
  const { setActivePage, sidebarOpen, toggleSidebar } = useUIStore();
  const { role } = useAuth();
  const { farmName, isLoading: isLoadingFarmName } = useAppSettings();
  const location = useLocation();
  const isOffline = useConnectivityStore((state) => state.status === 'offline');
  const [hoveredItem, setHoveredItem] = useState<PageRoute | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const highlightTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30 };

  const menuItems: { name: PageRoute; path: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Animais', path: '/animais', icon: BovinoSidebarIcon },
    { name: 'Lotes', path: '/lotes', icon: Layers },
    { name: 'Pesagens', path: '/pesagens', icon: Scale },
    { name: 'Pastagens', path: '/pastagens', icon: Map },
    { name: 'Manejo Reprodutivo', path: '/reproducao', icon: HeartHandshake },
    { name: 'Manejo Sanitário', path: '/sanitario', icon: Syringe },
    { name: 'Insumos', path: '/insumos', icon: Package },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { name: 'Relatórios', path: '/relatorios', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`bg-emerald-950 dark:bg-gray-950 text-white flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
        } shrink-0 fixed md:sticky top-0 h-screen z-50 md:z-30 shadow-2xl shadow-emerald-950/30 border-r border-emerald-900/40 dark:border-gray-800`}
      >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-emerald-900/50 dark:border-gray-800 bg-emerald-950 dark:bg-gray-950">
        <Link
          to="/dashboard"
          className="flex items-center cursor-pointer"
          onClick={() => {
            setActivePage('Dashboard');
            if (window.innerWidth < 768 && sidebarOpen) {
              toggleSidebar();
            }
          }}
        >
          <div className={`w-9 h-9 bg-emerald-500 dark:bg-emerald-600 rounded-xl flex items-center justify-center ${sidebarOpen ? 'mr-3' : 'mr-1'} shadow-md shrink-0`}>
            <Sprout className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-xl tracking-tight text-white/95">
              Farm<span className="text-emerald-400">Nexus</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:block text-white bg-emerald-900 dark:bg-gray-900 border-2 border-emerald-500 p-1.5 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shrink-0 transition-all hover:bg-emerald-800 dark:hover:bg-gray-800"
          title={sidebarOpen ? 'Recolher Menu' : 'Expandir Menu'}
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-emerald-300" /> : <ChevronRight className="w-5 h-5 text-emerald-300" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 sidebar-scrollbar">
        <div>
          {sidebarOpen && (
            <p className="px-6 text-xs font-bold text-emerald-400/80 dark:text-emerald-500 uppercase tracking-wider mb-3">
              Módulos Principais
            </p>
          )}
          <nav className="space-y-1 px-3">
            {menuItems.filter((item) => item.path !== '/financeiro' || role === 'superadmin').map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              const isReportsOffline = item.path === '/relatorios' && isOffline;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onMouseEnter={() => {
                    if (!isReportsOffline) setHoveredItem(item.name);
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={(event) => {
                    if (isReportsOffline) {
                      event.preventDefault();
                      return;
                    }
                    setActivePage(item.name);
                    if (window.innerWidth < 768 && sidebarOpen) {
                      toggleSidebar();
                    }
                  }}
                  aria-disabled={isReportsOffline || undefined}
                  className={`relative flex items-center w-full px-3.5 py-3 rounded-xl transition-all duration-200 group text-left overflow-hidden ${
                    isReportsOffline
                      ? 'text-emerald-100/40 dark:text-gray-500 opacity-60 cursor-not-allowed'
                      : isActive
                        ? 'text-white font-semibold pl-4.5 cursor-pointer'
                        : 'text-emerald-100/70 dark:text-gray-400 hover:text-white cursor-pointer'
                  }`}
                  title={isReportsOffline ? 'Relatórios exigem conexão com a internet' : !sidebarOpen ? item.name : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-highlight"
                      transition={highlightTransition}
                      className="absolute inset-0 bg-emerald-800 dark:bg-emerald-900/80 rounded-xl shadow-md shadow-emerald-950/20 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  {hoveredItem === item.name && !isActive && !isReportsOffline && (
                    <motion.span
                      layoutId="sidebar-hover-highlight"
                      transition={highlightTransition}
                      className="absolute inset-0 bg-emerald-900/60 dark:bg-gray-900 rounded-xl pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-emerald-300 dark:bg-emerald-300 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.9)] z-10"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-emerald-400' : 'group-hover:scale-110'
                    }`}
                  />
                  {sidebarOpen && <span className="relative z-10 ml-3 text-sm truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className={sidebarOpen ? 'px-3' : 'px-2'}>
        <PrefetchProgress />
      </div>

      {/* Sidebar Footer info */}
      {sidebarOpen && (
        <div className="p-4 m-3 bg-emerald-900/40 dark:bg-gray-900 border border-emerald-800/40 dark:border-gray-800 rounded-xl">
          {isLoadingFarmName ? (
            <div className="h-3 w-36 animate-pulse rounded bg-emerald-800/70" aria-label="Carregando nome da fazenda" />
          ) : (
            <p className="text-xs font-semibold text-emerald-300 dark:text-emerald-400 truncate" title={farmName}>{farmName}</p>
          )}
          <ConnectionStatus />
        </div>
      )}
    </aside>
    </>
  );
};
