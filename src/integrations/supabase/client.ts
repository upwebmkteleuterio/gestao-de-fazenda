import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { fetchWithRemoteTimeout } from '@/offline/network';

export const SUPABASE_URL = 'https://zipoizwadfyatilohcon.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WwsF1dYAe_cLVN0S1d3fOg_JXmi3adz';

// Toda requisição feita pelo cliente Supabase passa por aqui: se o servidor não responder
// dentro do tempo limite, a requisição é abortada, o app assume o modo offline e as telas
// caem para o cache local em vez de ficarem presas no esqueleto.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: fetchWithRemoteTimeout },
});

type AuthStateListener = (session: Session | null) => void;
type SessionReadResult = { session: Session | null; error: unknown | null };

let authStateKnown = false;
let authStateVersion = 0;
let cachedSession: Session | null = null;
const authStateListeners = new Set<AuthStateListener>();

const updateAuthCache = (session: Session | null): void => {
  authStateKnown = true;
  authStateVersion += 1;
  cachedSession = session;
  authStateListeners.forEach((listener) => listener(session));
};

supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthCache(session);
});

export const subscribeToAuthState = (listener: AuthStateListener): (() => void) => {
  authStateListeners.add(listener);
  return () => authStateListeners.delete(listener);
};

const AUTH_SESSION_TIMEOUT_MS = 3000;
class SessionReadTimeoutError extends Error {
  constructor() {
    super('Leitura da sessão excedeu o tempo limite');
    this.name = 'SessionReadTimeoutError';
  }
}

const readOnlineSession = async (): Promise<SessionReadResult> => {
  const readVersion = authStateVersion;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new SessionReadTimeoutError()), AUTH_SESSION_TIMEOUT_MS);
  });

  try {
    const { data, error } = await Promise.race([supabase.auth.getSession(), timeout]);
    const isCurrentRead = authStateVersion === readVersion;
    if (!error && isCurrentRead) {
      authStateKnown = true;
      cachedSession = data.session;
    }
    if (error) {
      // Falha de leitura (rede/renovação de token) não significa ausência de sessão:
      // mantém a última sessão conhecida para não esvaziar as telas offline.
      return { session: cachedSession, error };
    }
    return { session: isCurrentRead ? data.session : cachedSession, error: null };
  } catch (error) {
    if (error instanceof SessionReadTimeoutError) {
      return { session: authStateKnown ? cachedSession : null, error: null };
    }
    return { session: cachedSession, error };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

let activeSessionRead: Promise<SessionReadResult> | null = null;

export const readCurrentSession = (isOnline: boolean): Promise<SessionReadResult> => {
  if (!isOnline) {
    return Promise.resolve({ session: authStateKnown ? cachedSession : null, error: null });
  }
  if (activeSessionRead) return activeSessionRead;

  let promise: Promise<SessionReadResult>;
  promise = readOnlineSession().finally(() => {
    if (activeSessionRead === promise) activeSessionRead = null;
  });
  activeSessionRead = promise;
  return promise;
};

export const getCurrentUserId = async (isOnline: boolean): Promise<string | undefined> => {
  const { session } = await readCurrentSession(isOnline);
  return session?.user.id;
};
