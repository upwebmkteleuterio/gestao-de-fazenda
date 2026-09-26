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
      className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-emerald-950 px-6"
      aria-label="Carregando aplicação"
    >
      <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
      <div className="relative z-10 mb-12 flex h-56 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <img
          src="/assets/logo-faz-carapana.png"
          alt="Logo da fazenda"
          className="h-full w-full rounded-xl object-contain"
        />
      </div>
      <div className="relative z-10 h-2 w-[min(20rem,72vw)] overflow-hidden rounded-full bg-emerald-900/80 shadow-inner shadow-black/20" role="progressbar" aria-label="Carregando" aria-valuemin={0} aria-valuemax={100}>
        <div className="app-splash-progress relative h-full overflow-hidden rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.75)]">
          <span className="app-splash-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
