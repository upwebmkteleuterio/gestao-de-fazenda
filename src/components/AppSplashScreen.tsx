import { useEffect } from 'react';

type AppSplashScreenProps = {
  onComplete: () => void;
};

export function AppSplashScreen({ onComplete }: AppSplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3000);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <main
      className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-emerald-950 px-6"
      aria-label="Carregando aplicação"
    >
      <img
        src="/assets/logo-faz-carapana.png"
        alt="Logo da fazenda"
        className="mb-12 max-h-56 w-[min(24rem,80vw)] object-contain"
      />
      <div className="h-2 w-[min(20rem,72vw)] overflow-hidden rounded-full bg-emerald-900/80 shadow-inner shadow-black/20" role="progressbar" aria-label="Carregando" aria-valuemin={0} aria-valuemax={100}>
        <div className="app-splash-progress h-full rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.75)]" />
      </div>
    </main>
  );
}
