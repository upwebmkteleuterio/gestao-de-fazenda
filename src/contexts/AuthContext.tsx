import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { readCurrentSession, subscribeToAuthState, supabase } from '@/integrations/supabase/client';
import { getAuthErrorMessage } from '@/utils/authError';

export const ROLES = ['superadmin', 'assistant'] as const;
export type Role = (typeof ROLES)[number];

interface AuthContextValue {
  session: Session | null;
  role: Role;
  displayName: string;
  isLoading: boolean;
  isLoadingProfile: boolean;
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

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()
    .returns<Profile | null>();

  if (error) throw error;
  return data;
}

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | undefined>();
  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id;
      if (previousUserIdRef.current !== nextUserId || !nextSession) {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      previousUserIdRef.current = nextUserId;
      setSession(nextSession);
      setAuthError(null);
      setIsLoading(false);
    };
    const unsubscribe = subscribeToAuthState((nextSession) => {
      if (!mounted) return;
      applySession(nextSession);
    });

    const isOnline = typeof navigator === 'undefined' || navigator.onLine;
    void readCurrentSession(isOnline).then(({ session: nextSession, error }) => {
      if (!mounted) return;
      applySession(nextSession);
      if (error) setAuthError(getAuthErrorMessage(error));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const displayName = profileQuery.data?.display_name?.trim() || deriveFallbackDisplayName(session);
  const isLoadingProfile = Boolean(session) && profileQuery.isLoading;

  const updateDisplayName = useCallback(async (nextDisplayName: string) => {
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
    queryClient.setQueryData<Profile>(['profile', session.user.id], { display_name: displayNameToSave });
  }, [queryClient, session]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }

    await queryClient.cancelQueries();
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    role: deriveRole(session),
    displayName,
    isLoading,
    isLoadingProfile,
    authError,
    updateDisplayName,
    signOut,
  }), [authError, displayName, isLoading, isLoadingProfile, session, signOut, updateDisplayName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de SessionContextProvider.');
  }
  return context;
}
