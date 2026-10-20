import { SUPABASE_URL } from '@/integrations/supabase/client';
import { useConnectivityStore } from '@/store/useConnectivityStore';

/** Tempo máximo de espera de uma sondagem antes de considerarmos a rede inacessível. */
export const REACHABILITY_TIMEOUT_MS = 4000;
/** Intervalo entre sondagens enquanto o app está aberto. */
export const REACHABILITY_INTERVAL_MS = 10000;

export const isBrowserOnline = (): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const { status, reachable } = useConnectivityStore.getState();
  return status !== 'offline' && reachable !== false;
};

/**
 * Sonda a rede de verdade. `navigator.onLine` continua verdadeiro quando o aparelho
 * está ligado a uma rede sem internet (roteador sem sinal, Wi-Fi do pasto), então
 * precisamos de uma requisição real. `mode: 'no-cors'` garante que qualquer resposta
 * HTTP signifique "há rede", sem depender dos cabeçalhos de CORS do servidor.
 *
 * Atenção: esta sondagem é apenas uma pista — uma resposta opaca pode vir de um portal
 * cativo ou proxy no lugar do servidor. Por isso uma requisição de dados que falha
 * (`markNetworkFailure`) sempre tem a palavra final sobre o status.
 */
export const probeReachability = async (timeoutMs = REACHABILITY_TIMEOUT_MS): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Mantém o status de conectividade alinhado com a rede real: sonda imediatamente,
 * depois periodicamente, e também quando o sistema/navegador avisa que a conexão
 * mudou ou quando a janela volta a ficar visível.
 */
export const startConnectivityMonitor = (): (() => void) => {
  let stopped = false;
  let probing = false;

  const runProbe = async () => {
    if (stopped || probing) return;
    probing = true;
    try {
      const reachable = await probeReachability();
      if (!stopped) useConnectivityStore.getState().setReachable(reachable);
    } finally {
      probing = false;
    }
  };

  // O evento `online` só indica que o dispositivo voltou a ter uma interface de rede:
  // confirmamos com uma sondagem antes de voltar a tentar o servidor.
  const handleOnline = () => void runProbe();
  const handleOffline = () => useConnectivityStore.getState().setOffline();
  const handleFocus = () => {
    if (document.visibilityState !== 'hidden') void runProbe();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleFocus);

  void runProbe();
  const intervalId = setInterval(() => void runProbe(), REACHABILITY_INTERVAL_MS);

  return () => {
    stopped = true;
    clearInterval(intervalId);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleFocus);
  };
};
