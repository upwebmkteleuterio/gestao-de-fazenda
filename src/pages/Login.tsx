import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, ShieldCheck, Sprout } from 'lucide-react';
import { Card } from '@/components/Card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { getAuthErrorMessage } from '@/utils/authError';

const FALLBACK_FARM_NAME = 'Gestão de Fazenda';

export function LoginPage() {
  const { authError, session, isLoading } = useAuth();
  const { settings, isLoading: isLoadingFarmName, isError: hasFarmNameError } = useAppSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const displayedFarmName = hasFarmNameError || !settings?.farm_name?.trim()
    ? FALLBACK_FARM_NAME
    : settings.farm_name.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError(null);
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setSignInError(getAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!isLoading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-[#f4f8f4] text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-emerald-950 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/30">
            <Sprout className="h-6 w-6" />
          </div>
          {isLoadingFarmName ? (
            <span role="status" aria-label="Carregando nome da fazenda" className="block h-6 w-36 animate-pulse rounded-md bg-emerald-200/30" />
          ) : (
            <span className="text-xl font-bold tracking-tight">{displayedFarmName}</span>
          )}
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <Leaf className="h-4 w-4" /> Gestão inteligente no campo
          </p>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Mais clareza para cuidar do rebanho e da sua operação.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-100/75">
            Acompanhe cada detalhe da fazenda em um só lugar, com uma experiência feita para decisões mais seguras e resultados consistentes.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-emerald-100/70">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          Acesso protegido e feito para sua equipe
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sprout className="h-5 w-5" />
            </div>
            {isLoadingFarmName ? (
              <span role="status" aria-label="Carregando nome da fazenda" className="block h-6 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            ) : (
              <span className="text-xl font-bold tracking-tight">{displayedFarmName}</span>
            )}
          </div>

          <Card noPadding className="rounded-2xl border-slate-200/80 bg-white p-7 shadow-xl shadow-emerald-950/5 dark:border-slate-800 dark:bg-slate-900 sm:p-9">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Bem-vindo de volta</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Entre na sua conta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Acesse o painel da sua operação rural com segurança.</p>
            </div>

            {(signInError || authError) && (
              <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {signInError || authError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">E-mail</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 hover:border-emerald-400 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 hover:border-emerald-400 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSigningIn}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningIn ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </Card>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">FarmNexus · Gestão rural com propósito</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
