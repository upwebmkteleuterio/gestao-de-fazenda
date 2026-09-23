import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/Button';
import { useUIStore } from '@/store/useUIStore';

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    ready: Promise<void>;
  };
};

export const AnimatedThemeToggler: React.FC = () => {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const transitionDocument = document as ViewTransitionDocument;
    const startViewTransition = transitionDocument.startViewTransition;
    const button = event.currentTarget;

    if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toggleTheme();
      return;
    }

    const bounds = button.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const farthestX = Math.max(centerX, window.innerWidth - centerX);
    const farthestY = Math.max(centerY, window.innerHeight - centerY);
    const radius = Math.hypot(farthestX, farthestY);
    const transition = startViewTransition.call(transitionDocument, () => {
      toggleTheme();
    });

    void transition.ready
      .then(() => {
        document.documentElement.animate(
          [
            { clipPath: `circle(0px at ${centerX}px ${centerY}px)` },
            { clipPath: `circle(${radius}px at ${centerX}px ${centerY}px)` },
          ],
          {
            duration: 450,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => undefined);
  };

  return (
    <Button
      variant="icon"
      onClick={handleClick}
      title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      aria-label="Alternar Tema"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600 hover:text-emerald-600 transition-colors" />
      )}
    </Button>
  );
};

export default AnimatedThemeToggler;
