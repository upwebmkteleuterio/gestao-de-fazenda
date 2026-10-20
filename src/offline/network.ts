import { useConnectivityStore } from '@/store/useConnectivityStore';

/**
 * Tempo máximo que uma requisição ao servidor pode ficar pendente antes de ser tratada
 * como falha de rede. Sem esse limite, uma conexão "meio aberta" (Wi-Fi ligado sem
 * internet, roteador do pasto, portal cativo) deixa a tela presa no esqueleto para sempre,
 * porque o fetch só falha quando o navegador desiste — o que pode levar minutos.
 */
export const REMOTE_REQUEST_TIMEOUT_MS = 8000;

export class RemoteTimeoutError extends Error {
  constructor(message = 'A solicitação excedeu o tempo limite de rede.') {
    super(message);
    this.name = 'RemoteTimeoutError';
  }
}

/**
 * Uma requisição real que não completou é a evidência mais confiável de que a rede está
 * indisponível. `navigator.onLine` e sondagens `no-cors` continuam dizendo "online" quando
 * um portal cativo, antivírus ou proxy responde no lugar do servidor — foi exatamente esse
 * cenário que fez o app ficar "Online" sem carregar nenhuma tela.
 */
export const reportNetworkFailure = (): void => {
  useConnectivityStore.getState().markNetworkFailure();
};

/**
 * Envolve o `fetch` global com um tempo limite. É instalado como `global.fetch` do cliente
 * Supabase, então toda requisição (dados, RPC e sessão) falha rápido em vez de pendurar.
 */
export const fetchWithRemoteTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REMOTE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      reportNetworkFailure();
      throw new RemoteTimeoutError();
    }
    reportNetworkFailure();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const NETWORK_ERROR_NAMES = new Set([
  'RemoteTimeoutError',
  'AbortError',
  'TimeoutError',
  'TypeError',
  'NetworkError',
]);

// Inclui as mensagens em português do nosso próprio tempo limite: quando a biblioteca do
// Supabase reembala o erro, o `name` da classe se perde e só sobra o texto.
const NETWORK_ERROR_MESSAGE = /failed to fetch|fetch failed|network|networkerror|offline|load failed|timeout|timed out|aborted|tempo limite|econnrefused|enotfound|socket hang up|dns/i;

/**
 * Diz se o erro representa indisponibilidade de rede (e não um erro de dados/permissão).
 * Um erro de negócio do banco não deve ser tratado como offline: só nome, status 0 e
 * padrões de falha de transporte entram aqui.
 */
export const isNetworkFailure = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof RemoteTimeoutError) return true;

  const candidate = error as { name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown };
  const status = typeof candidate.status === 'number'
    ? candidate.status
    : (typeof candidate.statusCode === 'number' ? candidate.statusCode : undefined);
  if (status === 0) return true;
  if (typeof candidate.name === 'string' && NETWORK_ERROR_NAMES.has(candidate.name)) return true;

  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return NETWORK_ERROR_MESSAGE.test(message);
};
