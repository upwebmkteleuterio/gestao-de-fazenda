import { getCurrentUserId as readCurrentUserId, supabase } from '@/integrations/supabase/client';
import { getOfflineSnapshot, listOfflineRecords, saveOfflineRecords, saveOfflineSnapshot, deleteOfflineRecords } from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { Animal, EventoReproducao } from '@/types/database';
import { animaisService } from './animaisService';

export type ReproducaoQuery = {
  data: EventoReproducao[];
  total: number;
  source: 'remote' | 'local';
  capturedAt?: string;
};

type LocalEvento = EventoReproducao;

const PAGE_SIZE = 10;
const ENTITY = 'evento_reproducao';
const firstPageSnapshotKey = (userId: string) => `${ENTITY}:first-page:${userId}`;
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;
const isBrowserOnline = (): boolean => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());
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

const readLocalFirstPage = async (userId: string): Promise<{ data: EventoReproducao[]; capturedAt?: string }> => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalEvento>({ userId, entity: ENTITY }),
    getOfflineSnapshot<EventoReproducao[]>(firstPageSnapshotKey(userId)),
  ]);
  const localData = records
    .filter((record) => record.userId === userId)
    .map((record) => record.data);
  const data = (localData.length > 0 ? localData : snapshot?.data ?? [])
    .sort(compareEventosMaisRecentes)
    .slice(0, PAGE_SIZE);
  return { data, capturedAt: snapshot?.capturedAt };
};

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

const calcularPrevisaoParto = (dataRef?: string): string => {
  if (!dataRef) return '';
  const date = new Date(dataRef);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 285);
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
  const dataPrincipalDiff = new Date(b.data_principal).getTime() - new Date(a.data_principal).getTime();
  if (dataPrincipalDiff !== 0) return dataPrincipalDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

const sanitizeSearch = (value: string) => value.replace(/[^\p{L}\p{N} _-]/gu, ' ').trim();

const toReportParams = (filters?: ReproducaoReportFilters) => ({
  p_data_especifica: filters?.dataEspecifica || null,
  p_data_inicio: filters?.dataInicio || null,
  p_data_fim: filters?.dataFim || null,
  p_touro: filters?.touro && filters.touro !== 'all' ? filters.touro : null,
  p_protocolo: filters?.protocolo && filters.protocolo !== 'all' ? filters.protocolo : null,
  p_resultado_dg: filters?.resultadoDg && filters.resultadoDg !== 'all' ? filters.resultadoDg : null,
  p_search: filters?.search?.trim() ? sanitizeSearch(filters.search) : null,
});

export const reproducaoService = {
  getReportSummary: async (filters?: ReproducaoReportFilters): Promise<ReproducaoReportSummary> => {
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

  getAll: async (filters?: ReproducaoReportFilters): Promise<ReproducaoQuery> => {
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
      const local = await readLocalFirstPage(userId);
      return { data: local.data, total: local.data.length, source: 'local', capturedAt: local.capturedAt };
    }

    try {
      let query = supabase
        .from('eventos_reproducao')
        .select('*', { count: 'exact' });

      if (filters?.search?.trim()) {
        const search = sanitizeSearch(filters.search);
        query = query.or(`brinco_matriz.ilike.%${search}%,dados_protocolo->>touro.ilike.%${search}%`);
      }
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
      if (isFirstPage) await cacheFirstPage(userId, items);
      const snapshot = await getOfflineSnapshot<EventoReproducao[]>(firstPageSnapshotKey(userId));
      return { data: items, total: count ?? items.length, source: 'remote', capturedAt: snapshot?.capturedAt };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const local = await readLocalFirstPage(userId);
      return { data: local.data, total: local.data.length, source: 'local', capturedAt: local.capturedAt };
    }
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
      const local = await readLocalFirstPage(userId);
      return local.data.find((evento) => evento.id === id) ?? null;
    }
    const list = await fetchEventos();
    return list.find((evento) => evento.id === id) ?? null;
  },

  create: async (
    item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>,
  ): Promise<EventoReproducao> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const previsaoParto =
      item.resultado_dg === 'cheia' && !item.previsao_parto
        ? calcularPrevisaoParto(item.data_principal || item.data_dg)
        : item.previsao_parto ?? '';
    const payload = buildEventoPayload(item, `rep-${crypto.randomUUID()}`, previsaoParto);
    const { data, error } = await supabase.from('eventos_reproducao').insert(payload).select('*').single();
    if (error) throw error;

    const created = toEvento(data as unknown as ReproducaoDbRow);
    await syncAffectedMatrizes([created.animal_id], await fetchEventos());
    return created;
  },

  update: async (id: string, updates: Partial<EventoReproducao>): Promise<EventoReproducao> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const list = await fetchEventos();
    const current = list.find((evento) => evento.id === id);
    if (!current) throw new Error('Evento não encontrado');

    const merged = { ...current, ...updates };
    let previsaoParto = updates.previsao_parto || current.previsao_parto;
    if (merged.resultado_dg === 'cheia' && !previsaoParto) {
      previsaoParto = calcularPrevisaoParto(merged.data_principal || merged.data_dg);
    }

    const patch = buildEventoPatch(updates, previsaoParto ?? '');
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
