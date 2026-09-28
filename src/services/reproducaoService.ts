import { getCurrentUserId as readCurrentUserId, supabase } from '@/integrations/supabase/client';
import { getOfflineSnapshot, listOfflineRecords, saveOfflineRecords, saveOfflineSnapshot, deleteOfflineRecords, replaceOfflineRecordsAndSnapshot } from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { Animal, EventoReproducao } from '@/types/database';
import { DomainValidationError, sanitizeReportSearch, validateReportFilters, validateReproducaoFields } from './domainValidation';
import { animaisService } from './animaisService';

export type ReproducaoQuery = {
  data: EventoReproducao[];
  total: number;
  source: 'remote' | 'local';
  capturedAt?: string;
  coverageStart?: string;
  coverageEnd?: string;
};

type LocalEvento = EventoReproducao;

const PAGE_SIZE = 10;
const PREFETCH_BATCH_SIZE = 500;
const ENTITY = 'evento_reproducao';
const RECENT_WINDOW_ENTITY = 'evento_reproducao:recent-30-days';
const firstPageSnapshotKey = (userId: string) => `${ENTITY}:first-page:${userId}`;
const recentWindowSnapshotKey = (userId: string) => `${RECENT_WINDOW_ENTITY}:snapshot:${userId}`;
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;
const recentWindowRecordKey = (userId: string, id: string) => `${RECENT_WINDOW_ENTITY}:${userId}:${id}`;
const isBrowserOnline = (): boolean => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());

export class ReproducaoOfflineCoverageError extends Error {
  readonly capturedAt?: string;
  readonly coverageStart?: string;
  readonly coverageEnd?: string;

  constructor(message: string, coverage?: { capturedAt?: string; coverageStart?: string; coverageEnd?: string }) {
    super(message);
    this.name = 'ReproducaoOfflineCoverageError';
    this.capturedAt = coverage?.capturedAt;
    this.coverageStart = coverage?.coverageStart;
    this.coverageEnd = coverage?.coverageEnd;
  }
}

const localDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRecentWindow = (): { coverageStart: string; coverageEnd: string } => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { coverageStart: localDateString(start), coverageEnd: localDateString(end) };
};

const isNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return !isBrowserOnline() || /network|fetch|offline|load failed|failed to fetch/.test(message);
};

const localRecord = (userId: string, evento: LocalEvento) => ({
  key: localRecordKey(userId, evento.id),
  userId,
  entity: ENTITY,
  entityId: evento.id,
  data: evento,
  updatedAt: new Date().toISOString(),
});


const cacheFirstPage = async (userId: string, eventos: EventoReproducao[]): Promise<void> => {
  const existing = await listOfflineRecords<LocalEvento>({ userId, entity: ENTITY });
  await saveOfflineRecords(eventos.map((evento) => localRecord(userId, evento)));
  const ids = new Set(eventos.map((evento) => evento.id));
  await deleteOfflineRecords(existing.filter((record) => !ids.has(record.entityId)).map((record) => record.key));
  await saveOfflineSnapshot({
    key: firstPageSnapshotKey(userId),
    scope: `${ENTITY}:${userId}`,
    data: eventos,
    capturedAt: new Date().toISOString(),
  });
};

const cacheFirstPageSafely = async (userId: string, eventos: EventoReproducao[]): Promise<void> => {
  try {
    await cacheFirstPage(userId, eventos);
  } catch {
    return;
  }
};

const cacheRecentWindow = async (
  userId: string,
  eventos: EventoReproducao[],
  coverageStart: string,
  coverageEnd: string,
): Promise<void> => {
  const capturedAt = new Date().toISOString();
  await replaceOfflineRecordsAndSnapshot({
    userId,
    entity: RECENT_WINDOW_ENTITY,
    records: eventos.map((evento) => ({
      key: recentWindowRecordKey(userId, evento.id),
      userId,
      entity: RECENT_WINDOW_ENTITY,
      entityId: evento.id,
      data: evento,
      updatedAt: capturedAt,
    })),
    snapshot: {
      key: recentWindowSnapshotKey(userId),
      scope: `${RECENT_WINDOW_ENTITY}:${userId}`,
      data: { count: eventos.length },
      capturedAt,
      coverageStart,
      coverageEnd,
    },
  });
};

const readCapturedAtSafely = async (userId: string): Promise<string | undefined> => {
  try {
    const snapshot = await getOfflineSnapshot<EventoReproducao[]>(firstPageSnapshotKey(userId));
    return snapshot?.capturedAt;
  } catch {
    return undefined;
  }
};

type ReproducaoDbRow = {
  id: string;
  animal_id: string;
  brinco_matriz: string;
  tipo_protocolo: EventoReproducao['tipo_protocolo'];
  data_principal: string;
  dados_protocolo: EventoReproducao['dados_protocolo'];
  resultado_dg: EventoReproducao['resultado_dg'] | null;
  data_dg: string | null;
  previsao_parto: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type ReproducaoDbWrite = {
  id?: string;
  animal_id: string;
  brinco_matriz: string;
  tipo_protocolo: EventoReproducao['tipo_protocolo'];
  data_principal: string;
  dados_protocolo: EventoReproducao['dados_protocolo'];
  resultado_dg?: EventoReproducao['resultado_dg'] | null;
  data_dg?: string | null;
  previsao_parto?: string | null;
  status_sincronizacao: boolean;
};

const toEvento = (row: ReproducaoDbRow): EventoReproducao => ({
  id: row.id,
  animal_id: row.animal_id,
  brinco_matriz: row.brinco_matriz,
  tipo_protocolo: row.tipo_protocolo,
  data_principal: row.data_principal,
  dados_protocolo: row.dados_protocolo ?? {},
  resultado_dg: row.resultado_dg ?? undefined,
  data_dg: row.data_dg ?? undefined,
  previsao_parto: row.previsao_parto ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const fetchEventos = async (): Promise<EventoReproducao[]> => {
  if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
  const { data, error } = await supabase
    .from('eventos_reproducao')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
};

const calcularPrevisaoParto = (dataRef?: string, dias = 285): string => {
  if (!dataRef || !Number.isInteger(dias)) return '';
  const date = new Date(`${dataRef}T00:00:00`);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + dias);
  return date.toISOString().split('T')[0];
};

const statusReprodutivoPorEvento = (evento: Pick<EventoReproducao, 'resultado_dg' | 'tipo_protocolo'>) => {
  if (evento.resultado_dg === 'cheia') return 'Gestante';
  if (evento.resultado_dg === 'vazia') return 'Vazia';
  if (evento.tipo_protocolo === 'iatf') return 'Inseminada (IATF)';
  if (evento.tipo_protocolo === 'monta_natural') return 'Coberta (Monta)';
  if (evento.tipo_protocolo === 'tetf') return 'Receptora (TETF)';
  return 'Diagnóstico';
};

const compareEventosMaisRecentes = (a: EventoReproducao, b: EventoReproducao): number => {
  const dataPrincipalDiff = b.data_principal.localeCompare(a.data_principal);
  if (dataPrincipalDiff !== 0) return dataPrincipalDiff;
  const createdAtDiff = b.createdAt.localeCompare(a.createdAt);
  if (createdAtDiff !== 0) return createdAtDiff;
  return b.id.localeCompare(a.id);
};

const getEventoMaisRecente = (
  eventos: EventoReproducao[],
  animalId: string,
): EventoReproducao | undefined =>
  eventos
    .filter((evento) => evento.animal_id === animalId)
    .sort(compareEventosMaisRecentes)[0];

const syncMatrizStatus = async (animalId: string, evento?: EventoReproducao) => {
  if (!evento) {
    await animaisService.updateRemote(animalId, {
      status_reprodutivo: 'Vazia',
      touro_cobertura: undefined,
    });
    return;
  }

  const updates: Partial<Animal> = {
    status_reprodutivo: statusReprodutivoPorEvento(evento),
  };
  if (evento.dados_protocolo?.touro !== undefined) {
    updates.touro_cobertura = evento.dados_protocolo.touro;
  }
  await animaisService.updateRemote(animalId, updates);
};

const syncAffectedMatrizes = async (animalIds: string[], eventos: EventoReproducao[]) => {
  for (const animalId of new Set(animalIds)) {
    await syncMatrizStatus(animalId, getEventoMaisRecente(eventos, animalId));
  }
};

const buildEventoPayload = (
  item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>,
  id: string,
  previsaoParto: string,
): ReproducaoDbWrite => ({
  id,
  animal_id: item.animal_id,
  brinco_matriz: item.brinco_matriz,
  tipo_protocolo: item.tipo_protocolo,
  data_principal: item.data_principal,
  dados_protocolo: item.dados_protocolo,
  resultado_dg: item.resultado_dg ?? null,
  data_dg: item.data_dg ?? null,
  previsao_parto: previsaoParto || null,
  status_sincronizacao: false,
});

const buildEventoPatch = (
  updates: Partial<EventoReproducao>,
  previsaoParto: string,
): Partial<ReproducaoDbWrite> => {
  const patch: Partial<ReproducaoDbWrite> = {
    previsao_parto: previsaoParto || null,
    status_sincronizacao: false,
  };

  if (updates.animal_id !== undefined) patch.animal_id = updates.animal_id;
  if (updates.brinco_matriz !== undefined) patch.brinco_matriz = updates.brinco_matriz;
  if (updates.tipo_protocolo !== undefined) patch.tipo_protocolo = updates.tipo_protocolo;
  if (updates.data_principal !== undefined) patch.data_principal = updates.data_principal;
  if (updates.dados_protocolo !== undefined) patch.dados_protocolo = updates.dados_protocolo;
  if ('resultado_dg' in updates) patch.resultado_dg = updates.resultado_dg ?? null;
  if ('data_dg' in updates) patch.data_dg = updates.data_dg ?? null;

  return patch;
};

type ReproducaoInput = Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>;

const resolveAnimalReference = async (
  item: Pick<EventoReproducao, 'animal_id' | 'brinco_matriz'>,
  allowInactive = false,
): Promise<{ id: string; brinco: string }> => {
  const brinco = item.brinco_matriz.trim();
  const animalId = typeof item.animal_id === 'string' ? item.animal_id.trim() : '';
  if (animalId) {
    const { data, error } = await supabase
      .from('animais')
      .select('id, brinco, status, sexo')
      .eq('id', animalId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new DomainValidationError('O animal selecionado não está cadastrado. Cadastre o animal antes de lançar o evento.');
    if (data.sexo !== 'F') throw new DomainValidationError('O evento reprodutivo deve estar vinculado a uma matriz/vaca cadastrada.');
    if (data.status !== 'ativo' && !allowInactive) throw new DomainValidationError('A matriz selecionada não está ativa. Selecione um animal ativo cadastrado.');
    if (brinco && data.brinco.trim().toLocaleLowerCase() !== brinco.toLocaleLowerCase()) {
      throw new DomainValidationError('O brinco informado não corresponde ao animal selecionado. Selecione o animal cadastrado correto.');
    }
    return { id: data.id, brinco: data.brinco };
  }

  if (!brinco) throw new DomainValidationError('Informe o brinco de um animal cadastrado antes de salvar.');
  const { data, error } = await supabase
    .from('animais')
    .select('id, brinco, status, sexo')
    .eq('brinco', brinco)
    .eq('status', 'ativo')
    .limit(2);
  if (error) throw error;
  if (!data?.length) throw new DomainValidationError(`O animal com brinco "${brinco}" não está cadastrado como ativo. Cadastre o animal primeiro.`);
  if (data.length > 1) throw new DomainValidationError(`Há mais de um animal ativo com o brinco "${brinco}". Corrija o cadastro antes de salvar.`);
  if (data[0].sexo !== 'F') throw new DomainValidationError('O brinco informado não pertence a uma matriz/vaca cadastrada.');
  return { id: data[0].id, brinco: data[0].brinco };
};

const resolveActiveAnimalByBrinco = async (brinco: string, label: string): Promise<{ id: string; brinco: string }> => {
  const normalizedBrinco = brinco.trim();
  const { data, error } = await supabase
    .from('animais')
    .select('id, brinco, status, sexo')
    .eq('brinco', normalizedBrinco)
    .eq('status', 'ativo')
    .limit(2);
  if (error) throw error;
  if (!data?.length) throw new DomainValidationError(`A ${label} informada não está cadastrada como ativa. Cadastre o animal antes de salvar.`);
  if (data.length > 1) throw new DomainValidationError(`Há mais de um animal ativo com o brinco da ${label}. Corrija o cadastro antes de salvar.`);
  if (data[0].sexo !== 'F') throw new DomainValidationError(`A ${label} deve ser uma matriz cadastrada e ativa.`);
  return { id: data[0].id, brinco: data[0].brinco };
};

const normalizeEventInput = async (item: ReproducaoInput, allowInactive = false): Promise<ReproducaoInput> => {
  const dados = item.dados_protocolo ?? {};
  const dias = dados.dias_gestacao_previsao;
  const baseDate = dados.d10 || dados.d0 || item.data_principal;
  const itemWithPrediction = item.tipo_protocolo === 'iatf' && !item.previsao_parto
    ? { ...item, previsao_parto: calcularPrevisaoParto(baseDate, dias) }
    : item;
  validateReproducaoFields(itemWithPrediction);
  const animal = await resolveAnimalReference(itemWithPrediction, allowInactive);
  const normalizedDados = {
    ...dados,
    touro: dados.touro?.trim(),
    tipo_semen: dados.tipo_semen?.trim(),
    condicao_corporal: dados.condicao_corporal?.trim(),
    doadora: dados.doadora?.trim(),
    tipo_embriao: dados.tipo_embriao?.trim(),
    receptora: dados.receptora?.trim(),
    observacoes: dados.observacoes?.trim(),
  };
  if (itemWithPrediction.tipo_protocolo === 'tetf') {
    const receptora = await resolveAnimalReference(
      { animal_id: animal.id, brinco_matriz: normalizedDados.receptora ?? '' },
      allowInactive,
    );
    if (receptora.id !== animal.id) throw new DomainValidationError('A receptora informada não corresponde ao animal selecionado.');
    normalizedDados.receptora = receptora.brinco;
    const doadora = await resolveActiveAnimalByBrinco(normalizedDados.doadora ?? '', 'doadora');
    normalizedDados.doadora = doadora.brinco;
  }
  return {
    ...itemWithPrediction,
    animal_id: animal.id,
    brinco_matriz: animal.brinco,
    dados_protocolo: normalizedDados,
  };
};

const ensureNoLogicalDuplicate = async (items: ReproducaoInput[], currentId?: string): Promise<void> => {
  const keys = new Set<string>();
  for (const item of items) {
    const key = `${item.animal_id}|${item.tipo_protocolo}|${item.data_principal}`;
    if (keys.has(key)) throw new DomainValidationError('A lista contém o mesmo animal mais de uma vez para o mesmo protocolo e data.');
    keys.add(key);
  }
  if (!items.length) return;
  const { data, error } = await supabase
    .from('eventos_reproducao')
    .select('id, animal_id, tipo_protocolo, data_principal')
    .in('animal_id', items.map((item) => item.animal_id))
    .in('tipo_protocolo', [...new Set(items.map((item) => item.tipo_protocolo))])
    .in('data_principal', [...new Set(items.map((item) => item.data_principal))]);
  if (error) throw error;
  const conflict = (data ?? []).find((row) => {
    if (row.id === currentId) return false;
    return items.some((item) => row.animal_id === item.animal_id && row.tipo_protocolo === item.tipo_protocolo && row.data_principal === item.data_principal);
  });
  if (conflict) throw new DomainValidationError('Já existe um lançamento para este animal, protocolo e data. A duplicidade não foi criada.');
};

export type ReproducaoReportFilters = {
  dataEspecifica?: string;
  dataInicio?: string;
  dataFim?: string;
  touro?: string;
  protocolo?: string;
  resultadoDg?: string;
  search?: string;
  page?: number;
  limit?: number;
};

const readRecentWindow = async (
  userId: string,
  filters?: ReproducaoReportFilters,
): Promise<ReproducaoQuery> => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalEvento>({ userId, entity: RECENT_WINDOW_ENTITY }),
    getOfflineSnapshot<{ count: number }>(recentWindowSnapshotKey(userId)),
  ]);
  const coverage = {
    capturedAt: snapshot?.capturedAt,
    coverageStart: snapshot?.coverageStart,
    coverageEnd: snapshot?.coverageEnd,
  };
  if (!snapshot?.coverageStart || !snapshot.coverageEnd) {
    throw new ReproducaoOfflineCoverageError(
      'O histórico reprodutivo offline ainda não foi sincronizado. Conecte-se para baixar os últimos 30 dias.',
      coverage,
    );
  }
  if (snapshot.data?.count !== records.length) {
    throw new ReproducaoOfflineCoverageError(
      'O cache offline do histórico reprodutivo está incompleto. Conecte-se para sincronizar novamente.',
      coverage,
    );
  }

  const requestedDates = [filters?.dataEspecifica, filters?.dataInicio, filters?.dataFim]
    .filter((value): value is string => Boolean(value))
    .sort();
  const requestedStart = requestedDates[0];
  const requestedEnd = requestedDates[requestedDates.length - 1];
  const requestOutsideCachedWindow = (
    !requestedStart
    || !requestedEnd
    || requestedStart < snapshot.coverageStart
    || requestedStart > snapshot.coverageEnd
    || requestedEnd < snapshot.coverageStart
  );
  if (requestOutsideCachedWindow) {
    throw new ReproducaoOfflineCoverageError(
      `A consulta offline está limitada a ${snapshot.coverageStart} até ${snapshot.coverageEnd}. Conecte-se para consultar um período mais amplo ou Todo o histórico.`,
      coverage,
    );
  }

  const normalizedSearch = sanitizeReportSearch(filters?.search).toLocaleLowerCase();
  const data = records
    .map((record) => record.data)
    .filter((evento) => {
      const brinco = evento.brinco_matriz.toLocaleLowerCase();
      const touro = typeof evento.dados_protocolo?.touro === 'string'
        ? evento.dados_protocolo.touro.toLocaleLowerCase()
        : '';
      if (normalizedSearch && !brinco.includes(normalizedSearch) && !touro.includes(normalizedSearch)) return false;
      if (filters?.dataEspecifica && evento.data_principal !== filters.dataEspecifica) return false;
      if (filters?.dataInicio && evento.data_principal < filters.dataInicio) return false;
      if (filters?.dataFim && evento.data_principal > filters.dataFim) return false;
      if (filters?.touro && filters.touro !== 'all' && evento.dados_protocolo?.touro !== filters.touro) return false;
      if (filters?.protocolo && filters.protocolo !== 'all' && evento.tipo_protocolo !== filters.protocolo) return false;
      if (filters?.resultadoDg && filters.resultadoDg !== 'all') {
        if (filters.resultadoDg === 'pendente' && evento.resultado_dg !== undefined) return false;
        if (filters.resultadoDg !== 'pendente' && evento.resultado_dg !== filters.resultadoDg) return false;
      }
      return true;
    })
    .sort(compareEventosMaisRecentes);
  const page = filters?.page;
  const limit = filters?.limit;
  const pageData = page !== undefined && limit !== undefined
    ? data.slice((page - 1) * limit, page * limit)
    : data;
  return {
    data: pageData,
    total: data.length,
    source: 'local',
    capturedAt: snapshot.capturedAt,
    coverageStart: snapshot.coverageStart,
    coverageEnd: snapshot.coverageEnd,
  };
};

export type ReproducaoReportSummary = {
  total_count: number;
  touros_count: number;
  prenhas_count: number;
  vazias_count: number;
  aguardando_count: number;
  iatf_count: number;
  datas_com_registros: string[];
  touros: string[];
};

const toReportParams = (filters?: ReproducaoReportFilters) => ({
  p_data_especifica: filters?.dataEspecifica || null,
  p_data_inicio: filters?.dataInicio || null,
  p_data_fim: filters?.dataFim || null,
  p_touro: filters?.touro && filters.touro !== 'all' ? sanitizeReportSearch(filters.touro) : null,
  p_protocolo: filters?.protocolo && filters.protocolo !== 'all' ? filters.protocolo : null,
  p_resultado_dg: filters?.resultadoDg && filters.resultadoDg !== 'all' ? filters.resultadoDg : null,
  p_search: sanitizeReportSearch(filters?.search) || null,
});

export const reproducaoService = {
  getReportSummary: async (filters?: ReproducaoReportFilters): Promise<ReproducaoReportSummary> => {
    validateReportFilters(filters ?? {});
    if (!isBrowserOnline()) throw new Error('Relatório indisponível offline.');
    const { data, error } = await supabase.rpc('get_reproducao_report_summary', toReportParams(filters));
    if (error) throw error;
    const row = ((data ?? [])[0] ?? {}) as Partial<ReproducaoReportSummary>;
    return {
      total_count: Number(row.total_count ?? 0),
      touros_count: Number(row.touros_count ?? 0),
      prenhas_count: Number(row.prenhas_count ?? 0),
      vazias_count: Number(row.vazias_count ?? 0),
      aguardando_count: Number(row.aguardando_count ?? 0),
      iatf_count: Number(row.iatf_count ?? 0),
      datas_com_registros: row.datas_com_registros ?? [],
      touros: row.touros ?? [],
    };
  },

  getAll: async (
    filters?: ReproducaoReportFilters,
    options?: { onlineOnly?: boolean },
  ): Promise<ReproducaoQuery> => {
    validateReportFilters(filters ?? {});
    const onlineOnly = options?.onlineOnly ?? false;
    if (onlineOnly && !isBrowserOnline()) {
      throw new Error('Conexão necessária para carregar o histórico reprodutivo.');
    }
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };

    const isFirstPage = !filters?.search
      && (!filters?.protocolo || filters.protocolo === 'all')
      && !filters?.dataEspecifica
      && !filters?.dataInicio
      && !filters?.dataFim
      && !filters?.touro
      && !filters?.resultadoDg
      && filters?.page === 1
      && filters.limit === PAGE_SIZE;

    if (!isBrowserOnline()) {
      if (onlineOnly) throw new Error('Conexão necessária para carregar o histórico reprodutivo.');
      return readRecentWindow(userId, filters);
    }

    try {
      let query = supabase
        .from('eventos_reproducao')
        .select('*', { count: 'exact' });

      const search = sanitizeReportSearch(filters?.search);
      if (search) query = query.or(`brinco_matriz.ilike.%${search}%,dados_protocolo->>touro.ilike.%${search}%`);
      if (filters?.dataEspecifica) query = query.eq('data_principal', filters.dataEspecifica);
      if (filters?.dataInicio) query = query.gte('data_principal', filters.dataInicio);
      if (filters?.dataFim) query = query.lte('data_principal', filters.dataFim);
      if (filters?.touro && filters.touro !== 'all') query = query.eq('dados_protocolo->>touro', filters.touro);
      if (filters?.protocolo && filters.protocolo !== 'all') query = query.eq('tipo_protocolo', filters.protocolo);
      if (filters?.resultadoDg && filters.resultadoDg !== 'all') {
        query = filters.resultadoDg === 'pendente'
          ? query.is('resultado_dg', null)
          : query.eq('resultado_dg', filters.resultadoDg);
      }

      query = query
        .order('data_principal', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (filters?.page !== undefined && filters.limit !== undefined) {
        query = query.range(Math.max(0, (filters.page - 1) * filters.limit), filters.page * filters.limit - 1);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      const items = ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
      if (isFirstPage && !onlineOnly) await cacheFirstPageSafely(userId, items);
      const capturedAt = onlineOnly ? undefined : await readCapturedAtSafely(userId);
      return { data: items, total: count ?? items.length, source: 'remote', capturedAt };
    } catch (error) {
      if (onlineOnly || !isNetworkError(error)) throw error;
      return readRecentWindow(userId, filters);
    }
  },

  prefetchRecentWindow: async (userId: string): Promise<void> => {
    if (!userId) return;
    if (!isBrowserOnline() || (await getCurrentUserId()) !== userId) throw new Error('Prefetch interrompido antes da conclusão.');
    const { coverageStart, coverageEnd } = getRecentWindow();
    const eventos: EventoReproducao[] = [];
    let offset = 0;

    while (true) {
      if (!isBrowserOnline() || (await getCurrentUserId()) !== userId) throw new Error('Prefetch interrompido antes da conclusão.');
      const { data, error } = await supabase
        .from('eventos_reproducao')
        .select('*')
        .gte('data_principal', coverageStart)
        .lte('data_principal', coverageEnd)
        .order('data_principal', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + PREFETCH_BATCH_SIZE - 1);
      if (error) throw error;
      const batch = ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
      eventos.push(...batch);
      if (batch.length < PREFETCH_BATCH_SIZE) break;
      offset += PREFETCH_BATCH_SIZE;
    }

    if (!isBrowserOnline() || (await getCurrentUserId()) !== userId) throw new Error('Prefetch interrompido antes da conclusão.');
    await cacheRecentWindow(userId, eventos, coverageStart, coverageEnd);
  },

  prefetchFirstPage: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || (await getCurrentUserId()) !== userId) return;
    const { data, error } = await supabase
      .from('eventos_reproducao')
      .select('*')
      .order('data_principal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (error) throw error;
    const items = ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
    await cacheFirstPage(userId, items);
  },

  getById: async (id: string): Promise<EventoReproducao | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    if (!isBrowserOnline()) {
      const records = await listOfflineRecords<LocalEvento>({ userId, entity: RECENT_WINDOW_ENTITY });
      return records.map((record) => record.data).find((evento) => evento.id === id) ?? null;
    }
    const list = await fetchEventos();
    return list.find((evento) => evento.id === id) ?? null;
  },

  create: async (item: ReproducaoInput): Promise<EventoReproducao> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const normalized = await normalizeEventInput(item);
    await ensureNoLogicalDuplicate([normalized]);
    let previsaoParto = normalized.previsao_parto ?? '';
    if (normalized.resultado_dg === 'cheia' && !previsaoParto) {
      previsaoParto = calcularPrevisaoParto(normalized.data_principal || normalized.data_dg);
    }
    const payload = buildEventoPayload(normalized, `rep-${crypto.randomUUID()}`, previsaoParto);
    const { data, error } = await supabase.from('eventos_reproducao').insert(payload).select('*').single();
    if (error) throw error;

    const created = toEvento(data as unknown as ReproducaoDbRow);
    await syncAffectedMatrizes([created.animal_id], await fetchEventos());
    return created;
  },

  createBatch: async (items: ReproducaoInput[]): Promise<EventoReproducao[]> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    if (!items.length) throw new DomainValidationError('Selecione ao menos uma matriz para registrar a Monta Natural.');
    const normalized = await Promise.all(items.map((item) => normalizeEventInput(item)));
    await ensureNoLogicalDuplicate(normalized);
    const payload = normalized.map((item) => buildEventoPayload(item, `rep-${crypto.randomUUID()}`, item.previsao_parto ?? ''));
    const { data, error } = await supabase.from('eventos_reproducao').insert(payload).select('*');
    if (error) throw error;
    const created = ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
    if (created.length !== payload.length) throw new Error('O banco não confirmou todos os lançamentos da Monta Natural.');
    await syncAffectedMatrizes(created.map((evento) => evento.animal_id), await fetchEventos());
    return created;
  },

  update: async (id: string, updates: Partial<EventoReproducao>): Promise<EventoReproducao> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const list = await fetchEventos();
    const current = list.find((evento) => evento.id === id);
    if (!current) throw new Error('Evento não encontrado');

    const merged = {
      ...current,
      ...updates,
      dados_protocolo: { ...current.dados_protocolo, ...(updates.dados_protocolo ?? {}) },
    } as ReproducaoInput;
    const identityChanged = (
      updates.animal_id !== undefined && updates.animal_id !== current.animal_id
    ) || (
      updates.brinco_matriz !== undefined
      && updates.brinco_matriz.trim().toLocaleLowerCase() !== current.brinco_matriz.trim().toLocaleLowerCase()
    );
    const normalized = await normalizeEventInput(merged, !identityChanged);
    await ensureNoLogicalDuplicate([normalized], id);
    let previsaoParto = normalized.previsao_parto || current.previsao_parto || '';
    if (normalized.resultado_dg === 'cheia' && !previsaoParto) {
      previsaoParto = calcularPrevisaoParto(normalized.data_principal || normalized.data_dg);
    }
    const normalizedUpdates = {
      ...updates,
      animal_id: normalized.animal_id,
      brinco_matriz: normalized.brinco_matriz,
      dados_protocolo: normalized.dados_protocolo,
    };
    const patch = buildEventoPatch(normalizedUpdates, previsaoParto);
    const { data, error } = await supabase.from('eventos_reproducao').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    const updated = toEvento(data as unknown as ReproducaoDbRow);
    await syncAffectedMatrizes([current.animal_id, updated.animal_id], await fetchEventos());
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const list = await fetchEventos();
    const eventToDelete = list.find((evento) => evento.id === id);
    const { error } = await supabase.from('eventos_reproducao').delete().eq('id', id);
    if (error) throw error;

    if (eventToDelete) {
      await syncAffectedMatrizes([eventToDelete.animal_id], await fetchEventos());
    }

    return true;
  },
};
