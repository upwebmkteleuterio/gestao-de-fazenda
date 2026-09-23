import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Navigate } from 'react-router-dom';
import { Leaf, ShieldCheck, Sprout } from 'lucide-react';
import { Card } from '@/components/Card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { authError, session, isLoading } = useAuth();

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
          <span className="text-xl font-bold tracking-tight">FarmNexus</span>
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
            <span className="text-xl font-bold tracking-tight">FarmNexus</span>
          </div>

          <Card noPadding className="rounded-2xl border-slate-200/80 bg-white p-7 shadow-xl shadow-emerald-950/5 dark:border-slate-800 dark:bg-slate-900 sm:p-9">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Bem-vindo de volta</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Entre na sua conta</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Acesse o painel da sua operação rural com segurança.</p>
            </div>

            {authError && (
              <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {authError}
              </p>
            )}

            <Auth
              supabaseClient={supabase}
              view="sign_in"
              showLinks={false}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#059669',
                      brandAccent: '#047857',
                      inputText: '#0f172a',
                      inputPlaceholder: '#94a3b8',
                    },
                    radii: {
                      borderRadiusButton: '0.625rem',
                      inputBorderRadius: '0.625rem',
                    },
                  },
                },
              }}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'E-mail',
                    password_label: 'Senha',
                    email_input_placeholder: 'seu@email.com',
                    password_input_placeholder: 'Sua senha',
                    button_label: 'Entrar',
                    loading_button_label: 'Entrando...',
                  },
                },
              }}
            />
          </Card>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">FarmNexus · Gestão rural com propósito</p>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
