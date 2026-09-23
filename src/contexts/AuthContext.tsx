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
  isLoading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function deriveRole(session: Session | null): Role {
  return session?.user.app_metadata?.role === 'superadmin' ? 'superadmin' : 'assistant';
}

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
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
    isLoading,
    authError,
    signOut,
  }), [authError, isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de SessionContextProvider.');
  }
  return context;
}
