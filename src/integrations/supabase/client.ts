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

let authStateVersion = 0;
let cachedSession: Session | null = null;
const authStateListeners = new Set<AuthStateListener>();

const updateAuthCache = (session: Session | null): void => {
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

// Chave onde a biblioteca do Supabase guarda a sessão no aparelho
// (padrão `sb-<ref do projeto>-auth-token`). Lê-la não depende de rede.
const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

const isStoredSession = (value: unknown): value is Session => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { access_token?: unknown; refresh_token?: unknown; user?: { id?: unknown } };
  return typeof candidate.access_token === 'string'
    && typeof candidate.refresh_token === 'string'
    && typeof candidate.user?.id === 'string';
};

/**
 * Lê a sessão salva no aparelho, sem tocar na rede. É o que permite abrir o app no
 * modo offline: a sessão já está aqui, e quem valida o acesso é o servidor, no momento
 * em que cada gravação é enviada (RLS) — não a tela de login.
 */
const readStoredSession = (): Session | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Sessão conhecida (eventos do Supabase) ou, na falta dela, a sessão salva no aparelho.
 * Uma leitura que não se completa — offline, rede lenta, renovação de token pendente —
 * nunca pode ser tratada como "sem sessão": era isso que expulsava o usuário logado.
 */
const resolveKnownSession = (): Session | null => cachedSession ?? readStoredSession();

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
      cachedSession = data.session;
    }
    if (error) {
      // Falha de leitura (rede/renovação de token) não significa ausência de sessão:
      // mantém a sessão salva no aparelho para não esvaziar as telas offline.
      return { session: resolveKnownSession(), error };
    }
    return { session: isCurrentRead ? data.session : cachedSession, error: null };
  } catch (error) {
    // Falha ou demora na leitura (renovação de token sem rede) não é o mesmo que "deslogado":
    // vale a sessão salva no aparelho. O tempo limite é uma espera nossa, não um erro de login.
    return {
      session: resolveKnownSession(),
      error: error instanceof SessionReadTimeoutError ? null : error,
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

let activeSessionRead: Promise<SessionReadResult> | null = null;

export const readCurrentSession = (isOnline: boolean): Promise<SessionReadResult> => {
  if (!isOnline) {
    // Sem rede não há nada a confirmar: vale a sessão salva no aparelho.
    return Promise.resolve({ session: resolveKnownSession(), error: null });
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
