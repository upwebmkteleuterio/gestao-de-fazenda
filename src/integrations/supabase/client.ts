import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const supabaseUrl = 'https://zipoizwadfyatilohcon.supabase.co';
const supabasePublishableKey = 'sb_publishable_WwsF1dYAe_cLVN0S1d3fOg_JXmi3adz';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

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
      return { session: isCurrentRead ? null : cachedSession, error };
    }
    return { session: isCurrentRead ? data.session : cachedSession, error: null };
  } catch (error) {
    if (error instanceof SessionReadTimeoutError) {
      return { session: authStateKnown ? cachedSession : null, error: null };
    }
    const isCurrentRead = authStateVersion === readVersion;
    return { session: isCurrentRead ? null : cachedSession, error };
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
