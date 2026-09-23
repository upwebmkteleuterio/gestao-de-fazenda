import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getAuthErrorMessage } from '@/utils/authError';

export const ROLES = ['superadmin', 'assistant'] as const;
export type Role = (typeof ROLES)[number];

interface AuthContextValue {
  session: Session | null;
  role: Role;
  displayName: string;
  isLoading: boolean;
  authError: string | null;
  updateDisplayName: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

type Profile = {
  display_name: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function deriveRole(session: Session | null): Role {
  return session?.user.app_metadata?.role === 'superadmin' ? 'superadmin' : 'assistant';
}

function deriveFallbackDisplayName(session: Session | null): string {
  if (!session) return 'Usuário';

  const metadata = session.user.user_metadata;
  const metadataName = [metadata?.display_name, metadata?.full_name, metadata?.name]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return metadataName?.trim() || session.user.email || 'Usuário';
}

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState('Usuário');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthError(null);
      setIsLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(getAuthErrorMessage(error));
      } else {
        setSession(data.session);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDisplayName(deriveFallbackDisplayName(session));

    if (!session) {
      return () => {
        cancelled = true;
      };
    }

    const loadProfileName = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle()
        .returns<Profile | null>();

      if (!cancelled && !error && data?.display_name?.trim()) {
        setDisplayName(data.display_name.trim());
      }
    };

    void loadProfileName();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const updateDisplayName = async (nextDisplayName: string) => {
    if (!session) {
      throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const displayNameToSave = nextDisplayName.trim();
    if (!displayNameToSave) {
      throw new Error('Informe um nome válido.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayNameToSave })
      .eq('id', session.user.id);

    if (error) throw error;
    setDisplayName(displayNameToSave);
  };

  const signOut = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    role: deriveRole(session),
    displayName,
    isLoading,
    authError,
    updateDisplayName,
    signOut,
  }), [authError, displayName, isLoading, session, signOut, updateDisplayName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de SessionContextProvider.');
  }
  return context;
}
