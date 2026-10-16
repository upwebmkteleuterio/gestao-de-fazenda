import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnimalSortField, SortDirection } from '@/utils/animalSort';

export type PageRoute =
  | 'Dashboard'
  | 'Animais'
  | 'Pesagens'
  | 'Pastagens' 
  | 'Manejo Reprodutivo' 
  | 'Manejo Sanitário' 
  | 'Insumos' 
  | 'Financeiro' 
  | 'Relatórios' 
  | 'Lotes'
   | 'UI Kit';

export type SlidePanelMode = 'create' | 'edit' | 'view';

interface SlidePanelState {
  isOpen: boolean;
  mode: SlidePanelMode;
  title: string;
  entityType?: 'animal' | 'pesagem' | 'pastagem' | 'servico_pastagem' | 'reproducao' | 'sanitario' | 'insumo' | 'financeiro';
  data?: any;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  data?: any;
  onConfirm?: () => void;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIStore {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  activePage: PageRoute;
  setActivePage: (page: PageRoute) => void;

  animaisSortBy: AnimalSortField;
  setAnimaisSortBy: (sortBy: AnimalSortField) => void;
  animaisSortDir: SortDirection;
  setAnimaisSortDir: (sortDir: SortDirection) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  slidePanel: SlidePanelState;
  openSlidePanel: (params: Omit<SlidePanelState, 'isOpen'>) => void;
  closeSlidePanel: () => void;

  modal: ModalState;
  openModal: (params: Omit<ModalState, 'isOpen'>) => void;
  closeModal: () => void;

  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Seleção múltipla para ações em lote (e.g., Criar Lote de Animais)
  selectedAnimalIds: string[];
  toggleSelectAnimal: (id: string) => void;
  selectAllAnimals: (ids: string[]) => void;
  clearSelectedAnimals: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(nextTheme);
      },

      activePage: 'Dashboard',
      setActivePage: (activePage) => set({ activePage }),

      animaisSortBy: 'created_at',
      setAnimaisSortBy: (animaisSortBy) => set({ animaisSortBy }),
      animaisSortDir: 'desc',
      setAnimaisSortDir: (animaisSortDir) => set({ animaisSortDir }),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      slidePanel: {
        isOpen: false,
        mode: 'create',
        title: '',
      },
      openSlidePanel: ({ mode, title, entityType, data }) => set({
        slidePanel: { isOpen: true, mode, title, entityType, data }
      }),
      closeSlidePanel: () => set((state) => ({
        slidePanel: { ...state.slidePanel, isOpen: false }
      })),

      modal: {
        isOpen: false,
        title: '',
        message: '',
      },
      openModal: (params) => set({
        modal: { ...params, isOpen: true }
      }),
      closeModal: () => set((state) => ({
        modal: { ...state.modal, isOpen: false }
      })),

      toast: {
        visible: false,
        message: '',
        type: 'success',
      },
      showToast: (message, type = 'success') => set({
        toast: { visible: true, message, type }
      }),
      hideToast: () => set((state) => ({
        toast: { ...state.toast, visible: false }
      })),

      selectedAnimalIds: [],
      toggleSelectAnimal: (id) => set((state) => {
        const exists = state.selectedAnimalIds.includes(id);
        if (exists) {
          return { selectedAnimalIds: state.selectedAnimalIds.filter(i => i !== id) };
        } else {
          return { selectedAnimalIds: [...state.selectedAnimalIds, id] };
        }
      }),
      selectAllAnimals: (ids) => set({ selectedAnimalIds: ids }),
      clearSelectedAnimals: () => set({ selectedAnimalIds: [] }),
    }),
    {
      name: 'farmnexus_ui_state',
      partialize: (state) => ({
        theme: state.theme,
        activePage: state.activePage,
        sidebarOpen: state.sidebarOpen,
        animaisSortBy: state.animaisSortBy,
        animaisSortDir: state.animaisSortDir,
      }),
    }
  )
);
