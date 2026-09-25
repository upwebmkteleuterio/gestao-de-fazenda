import { getCurrentUserId as readCurrentUserId, supabase } from '@/integrations/supabase/client';
import {
  deleteOfflineRecord,
  deleteOfflineRecords,
  deleteOutboxOperation,
  getOfflineRecord,
  getOfflineSnapshot,
  listOfflineRecords,
  listOutboxOperations,
  markOutboxOperationFailed,
  markOutboxOperationProcessing,
  offlineDb,
  saveOfflineRecord,
  saveOfflineRecordAndEnqueue,
  saveOfflineRecords,
  saveOfflineSnapshot,
  type OutboxOperation,
} from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { animaisService } from '@/services/animaisService';
import { Pastagem, ServicoPastagem } from '@/types/database';

export type { Pastagem };

type PastagemDbRow = {
  id: string;
  nome_pasto: string;
  tipo_capim: string;
  area_ha: number;
  lotacao_maxima: number;
  data_entrada: string;
  data_saida_prevista: string | null;
  qtd_manual: number | null;
  usar_qtd_manual: boolean;
  vacas_count_manual: number | null;
  bezerros_count_manual: number | null;
  matrizes_count_manual: number | null;
  touros_count_manual: number | null;
  qtd_animais: number | null;
  vacas_count: number | null;
  bezerros_count: number | null;
  matrizes_count: number | null;
  touros_count: number | null;
  created_at: string;
};

type PastagemDbWrite = Omit<PastagemDbRow, 'created_at'> & { created_at?: string };
type PastagemLocal = Pastagem;
type PastagemCreatePayload = { id: string; item: Omit<Pastagem, 'id' | 'createdAt'> };
type PastagemUpdatePayload = { id: string; updates: Partial<Pastagem> };
type PastagemDeletePayload = { id: string };
type PastagemOutboxPayload = PastagemCreatePayload | PastagemUpdatePayload | PastagemDeletePayload;

export interface CreatePastagemInput {
  nome_pasto: string;
  tipo_capim: string;
  area_ha: number;
  lotacao_maxima: number;
  data_entrada: string;
  data_saida_prevista?: string;
  qtd_manual?: number;
  usar_qtd_manual?: boolean;
  vacas_count_manual?: number;
  bezerros_count_manual?: number;
  matrizes_count_manual?: number;
  touros_count_manual?: number;
}

type ServicoDbRow = {
  id: string;
  pasto_id: string;
  nome_pasto: string | null;
  tipo_servico: ServicoPastagem['tipo_servico'];
  data: string;
  responsavel: string | null;
  observacoes: string | null;
  created_at: string;
};

const ENTITY = 'pastagem';
const localRecordKey = (userId: string, pastagemId: string) => `${ENTITY}:${userId}:${pastagemId}`;
const snapshotKey = (userId: string) => `${ENTITY}:${userId}`;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = (): Promise<string | undefined> => readCurrentUserId(isBrowserOnline());

const toNumberOrUndefined = (value: number | string | null | undefined): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

const toPastagem = (row: PastagemDbRow): Pastagem => ({
  id: row.id,
  nome_pasto: row.nome_pasto,
  tipo_capim: row.tipo_capim,
  area_ha: Number(row.area_ha),
  lotacao_maxima: Number(row.lotacao_maxima),
  data_entrada: row.data_entrada,
  data_saida_prevista: row.data_saida_prevista ?? undefined,
  qtd_manual: toNumberOrUndefined(row.qtd_manual),
  usar_qtd_manual: row.usar_qtd_manual,
  vacas_count_manual: toNumberOrUndefined(row.vacas_count_manual),
  bezerros_count_manual: toNumberOrUndefined(row.bezerros_count_manual),
  matrizes_count_manual: toNumberOrUndefined(row.matrizes_count_manual),
  touros_count_manual: toNumberOrUndefined(row.touros_count_manual),
  qtd_animais: toNumberOrUndefined(row.qtd_animais),
  vacas_count: toNumberOrUndefined(row.vacas_count),
  bezerros_count: toNumberOrUndefined(row.bezerros_count),
  matrizes_count: toNumberOrUndefined(row.matrizes_count),
  touros_count: toNumberOrUndefined(row.touros_count),
  createdAt: row.created_at,
});

const toServico = (row: ServicoDbRow): ServicoPastagem => ({
  id: row.id,
  pasto_id: row.pasto_id,
  nome_pasto: row.nome_pasto ?? undefined,
  tipo_servico: row.tipo_servico,
  data: row.data,
  responsavel: row.responsavel ?? undefined,
  observacoes: row.observacoes ?? undefined,
  createdAt: row.created_at,
});

const normalizeOptionalString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() === '' ? null : (value as string | null | undefined) ?? null
);

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Informe ${field}.`);
  return value;
};

const requiredNumber = (value: unknown, field: string): number => {
  const number = normalizeOptionalNumber(value);
  if (number === null) throw new Error(`Informe ${field}.`);
  return number;
};

const buildPastagemInsert = (item: Omit<Pastagem, 'id' | 'createdAt'>, id: string): PastagemDbWrite => ({
  id,
  nome_pasto: requiredString(item.nome_pasto, 'o nome da pastagem'),
  tipo_capim: requiredString(item.tipo_capim, 'o tipo de capim'),
  area_ha: requiredNumber(item.area_ha, 'a área em hectares'),
  lotacao_maxima: requiredNumber(item.lotacao_maxima, 'a lotação máxima'),
  data_entrada: requiredString(item.data_entrada, 'a data de entrada'),
  data_saida_prevista: normalizeOptionalString(item.data_saida_prevista),
  qtd_manual: normalizeOptionalNumber(item.qtd_manual),
  usar_qtd_manual: item.usar_qtd_manual ?? false,
  vacas_count_manual: normalizeOptionalNumber(item.vacas_count_manual),
  bezerros_count_manual: normalizeOptionalNumber(item.bezerros_count_manual),
  matrizes_count_manual: normalizeOptionalNumber(item.matrizes_count_manual),
  touros_count_manual: normalizeOptionalNumber(item.touros_count_manual),
  qtd_animais: 0,
  vacas_count: 0,
  bezerros_count: 0,
  matrizes_count: 0,
  touros_count: 0,
});

const buildPastagemPatch = (updates: Partial<Pastagem>): Partial<PastagemDbWrite> => {
  const patch: Partial<PastagemDbWrite> = {};
  if (updates.nome_pasto !== undefined) patch.nome_pasto = requiredString(updates.nome_pasto, 'o nome da pastagem');
  if (updates.tipo_capim !== undefined) patch.tipo_capim = requiredString(updates.tipo_capim, 'o tipo de capim');
  if (updates.area_ha !== undefined) patch.area_ha = requiredNumber(updates.area_ha, 'a área em hectares');
  if (updates.lotacao_maxima !== undefined) patch.lotacao_maxima = requiredNumber(updates.lotacao_maxima, 'a lotação máxima');
  if (updates.data_entrada !== undefined) patch.data_entrada = requiredString(updates.data_entrada, 'a data de entrada');
  if ('data_saida_prevista' in updates) patch.data_saida_prevista = normalizeOptionalString(updates.data_saida_prevista);
  if ('qtd_manual' in updates) patch.qtd_manual = normalizeOptionalNumber(updates.qtd_manual);
  if (updates.usar_qtd_manual !== undefined) patch.usar_qtd_manual = updates.usar_qtd_manual;
  if ('vacas_count_manual' in updates) patch.vacas_count_manual = normalizeOptionalNumber(updates.vacas_count_manual);
  if ('bezerros_count_manual' in updates) patch.bezerros_count_manual = normalizeOptionalNumber(updates.bezerros_count_manual);
  if ('matrizes_count_manual' in updates) patch.matrizes_count_manual = normalizeOptionalNumber(updates.matrizes_count_manual);
  if ('touros_count_manual' in updates) patch.touros_count_manual = normalizeOptionalNumber(updates.touros_count_manual);
  return patch;
};

const toCreatePayload = (item: PastagemLocal): Omit<Pastagem, 'id' | 'createdAt'> => {
  const { id: _id, createdAt: _createdAt, syncStatus: _syncStatus, syncError: _syncError, localDeleted: _localDeleted, ...payload } = item;
  return payload;
};

const toUpdatePayload = (updates: Partial<Pastagem>): Partial<Pastagem> => {
  const {
    id: _id,
    createdAt: _createdAt,
    syncStatus: _syncStatus,
    syncError: _syncError,
    localDeleted: _localDeleted,
    ...payload
  } = updates;
  return payload;
};

const localRecord = (userId: string, item: PastagemLocal) => ({
  key: localRecordKey(userId, item.id),
  userId,
  entity: ENTITY,
  entityId: item.id,
  data: item,
  updatedAt: new Date().toISOString(),
});

const filterMatches = (
  item: Pastagem,
  filters?: { search?: string; status?: string; page?: number; limit?: number },
): boolean => {
  const search = filters?.search?.trim().toLocaleLowerCase();
  if (search && !item.nome_pasto.toLocaleLowerCase().includes(search)) return false;
  if (!filters?.status || filters.status === 'todos') return true;
  const total = item.usar_qtd_manual ? item.qtd_manual ?? 0 : item.qtd_animais ?? 0;
  if (filters.status === 'vazio') return total === 0;
  if (filters.status === 'excedido') return total > item.lotacao_maxima;
  if (filters.status === 'normal') return total > 0 && total <= item.lotacao_maxima;
  return true;
};

const filterLocalPastagens = (items: Pastagem[], filters?: { search?: string; status?: string; page?: number; limit?: number }) => {
  const filtered = items
    .filter((item) => filterMatches(item, filters))
    .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''));
  const total = filtered.length;
  if (filters?.page === undefined || filters.limit === undefined) return { data: filtered, total };
  const start = Math.max(0, (filters.page - 1) * filters.limit);
  return { data: filtered.slice(start, start + filters.limit), total };
};

const readLocalPastagens = async (userId: string): Promise<{ data: Pastagem[]; capturedAt?: string }> => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<PastagemLocal>({ userId, entity: ENTITY }),
    getOfflineSnapshot<Pastagem[]>(snapshotKey(userId)),
  ]);
  return {
    data: records.filter((record) => !record.data.localDeleted).map((record) => record.data),
    capturedAt: snapshot?.capturedAt,
  };
};

const hasPendingWork = (item: PastagemLocal) => (
  item.syncStatus === 'pending'
  || item.syncStatus === 'processing'
  || item.syncStatus === 'error'
  || Boolean(item.localDeleted)
);

const cacheOnlinePastagens = async (userId: string, items: Pastagem[], replaceCompleteCache: boolean) => {
  const existing = await listOfflineRecords<PastagemLocal>({ userId, entity: ENTITY });
  const pending = existing.filter((record) => hasPendingWork(record.data)).map((record) => record.data);
  const existingById = new Map(existing.map((record) => [record.entityId, record.data]));
  const remoteIds = new Set(items.map((item) => item.id));
  const records = items.map((item) => {
    const current = existingById.get(item.id);
    const data: PastagemLocal = current && hasPendingWork(current)
      ? current
      : { ...item, syncStatus: 'synced', syncError: undefined, localDeleted: false };
    return localRecord(userId, data);
  });
  await saveOfflineRecords(records);
  let capturedAt: string | undefined;
  if (replaceCompleteCache) {
    const staleKeys = existing
      .filter((record) => !remoteIds.has(record.entityId) && !hasPendingWork(record.data))
      .map((record) => record.key);
    await deleteOfflineRecords(staleKeys);
    capturedAt = new Date().toISOString();
    await saveOfflineSnapshot({
      key: snapshotKey(userId),
      scope: userId,
      data: items,
      capturedAt,
    });
  }
  return { pending, capturedAt };
};

const mergePendingPastagens = (
  items: Pastagem[],
  total: number,
  pending: PastagemLocal[],
  filters?: { search?: string; status?: string; page?: number; limit?: number },
) => {
  const remoteIds = new Set(items.map((item) => item.id));
  const merged = new Map(items.map((item) => [item.id, item]));
  let totalAdjustment = 0;
  pending.forEach((item) => {
    if (item.localDeleted) {
      if (remoteIds.has(item.id)) {
        merged.delete(item.id);
        totalAdjustment -= 1;
      }
      return;
    }
    if (remoteIds.has(item.id)) {
      merged.set(item.id, item);
      return;
    }
    if ((!filters?.page || filters.page === 1) && filterMatches(item, filters)) {
      merged.set(item.id, item);
      totalAdjustment += 1;
    }
  });
  return {
    data: Array.from(merged.values()).sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || '')),
    total: Math.max(0, total + totalAdjustment),
  };
};

const queueLocalCreate = async (userId: string, item: Omit<Pastagem, 'id' | 'createdAt'>, id: string): Promise<Pastagem> => {
  const local: PastagemLocal = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    qtd_animais: item.qtd_animais ?? 0,
    vacas_count: item.vacas_count ?? 0,
    bezerros_count: item.bezerros_count ?? 0,
    matrizes_count: item.matrizes_count ?? 0,
    touros_count: item.touros_count ?? 0,
    syncStatus: 'pending',
    localDeleted: false,
  };
  await saveOfflineRecordAndEnqueue(
    localRecord(userId, local),
    {
      userId,
      entity: ENTITY,
      operation: 'create',
      payload: { id, item: toCreatePayload(local) },
    },
  );
  return local;
};

const queueLocalUpdate = async (userId: string, id: string, updates: Partial<Pastagem>): Promise<Pastagem> => {
  const current = await getOfflineRecord<PastagemLocal>(localRecordKey(userId, id));
  if (!current || current.userId !== userId || current.entity !== ENTITY || current.data.localDeleted) {
    throw new Error('Pastagem não encontrada');
  }
  const local: PastagemLocal = {
    ...current.data,
    ...updates,
    id,
    syncStatus: 'pending',
    syncError: undefined,
    localDeleted: false,
  };
  await saveOfflineRecordAndEnqueue(
    { ...current, data: local, updatedAt: new Date().toISOString() },
    {
      userId,
      entity: ENTITY,
      operation: 'update',
      payload: { id, updates: toUpdatePayload(updates) },
    },
  );
  return local;
};

const queueLocalDelete = async (userId: string, id: string): Promise<boolean> => {
  const current = await getOfflineRecord<PastagemLocal>(localRecordKey(userId, id));
  if (!current || current.userId !== userId || current.entity !== ENTITY) {
    throw new Error('Pastagem não encontrada');
  }
  const local: PastagemLocal = {
    ...current.data,
    syncStatus: 'pending',
    syncError: undefined,
    localDeleted: true,
  };
  await saveOfflineRecordAndEnqueue(
    { ...current, data: local, updatedAt: new Date().toISOString() },
    {
      userId,
      entity: ENTITY,
      operation: 'delete',
      payload: { id },
    },
  );
  return true;
};

const remoteCreatePastagem = async (item: Omit<Pastagem, 'id' | 'createdAt'>, id: string): Promise<Pastagem> => {
  const { data, error } = await supabase.from('pastagens').insert(buildPastagemInsert(item, id)).select('*').single();
  if (!error) return toPastagem(data as unknown as PastagemDbRow);

  const { data: existing, error: lookupError } = await supabase
    .from('pastagens')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!lookupError && existing) return toPastagem(existing as unknown as PastagemDbRow);
  throw error;
};

const remoteUpdatePastagem = async (id: string, updates: Partial<Pastagem>): Promise<Pastagem> => {
  const { data, error } = await supabase.from('pastagens').update(buildPastagemPatch(updates)).eq('id', id).select('*').single();
  if (error) throw error;
  return toPastagem(data as unknown as PastagemDbRow);
};

const remoteDeletePastagem = async (id: string): Promise<void> => {
  const { data, error } = await supabase.from('animais').select('id').eq('pasto_id', id);
  if (error) throw error;
  for (const animal of (data ?? []) as Array<{ id: string }>) {
    await animaisService.updateRemote(animal.id, { pasto_id: undefined, pasto_nome: undefined });
  }
  const { error: deleteError } = await supabase.from('pastagens').delete().eq('id', id);
  if (deleteError) throw deleteError;
};

export const pastagensService = {
  getAll: async (userId: string, filters?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Pastagem[]; total: number; source: 'remote' | 'local'; capturedAt?: string }> => {
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalPastagens(userId);
      return { ...filterLocalPastagens(local.data, filters), source: 'local', capturedAt: local.capturedAt };
    }

    try {
      const hasListFilters = Boolean(filters?.search)
        || Boolean(filters?.status && filters.status !== 'todos')
        || filters?.page !== undefined
        || filters?.limit !== undefined;
      let items: Pastagem[];
      let total: number;
      if (!hasListFilters) {
        const { data, error } = await supabase
          .from('pastagens')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
        if (error) throw error;
        items = ((data ?? []) as unknown as PastagemDbRow[]).map(toPastagem);
        total = items.length;
      } else {
        const { data, error } = await supabase.rpc('get_pastagens_page', {
          p_search: filters?.search || null,
          p_status: filters?.status || 'todos',
          p_page: filters?.page ?? 1,
          p_limit: filters?.limit ?? 10,
        });
        if (error) throw error;
        const rows = (data ?? []) as unknown as (PastagemDbRow & { total_count: number | string })[];
        items = rows.map(toPastagem);
        total = rows.length > 0 ? Number(rows[0].total_count) : 0;
        if (rows.length === 0 && filters?.page && filters.page > 1) {
          const { data: firstPage, error: firstPageError } = await supabase.rpc('get_pastagens_page', {
            p_search: filters.search || null,
            p_status: filters.status || 'todos',
            p_page: 1,
            p_limit: 1,
          });
          if (firstPageError) throw firstPageError;
          const firstRow = (firstPage ?? [])[0] as { total_count?: number | string } | undefined;
          total = firstRow?.total_count === undefined ? 0 : Number(firstRow.total_count);
        }
      }

      let pending: PastagemLocal[] = [];
      let capturedAt: string | undefined;
      try {
        const replaceComplete = !hasListFilters;
        const cached = await cacheOnlinePastagens(userId, items, replaceComplete);
        pending = cached.pending;
        capturedAt = cached.capturedAt;
      } catch {
        pending = [];
      }
      return { ...mergePendingPastagens(items, total, pending, filters), source: 'remote', capturedAt };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!isBrowserOnline() || /network|fetch|offline|load failed/.test(message)) {
        const local = await readLocalPastagens(userId);
        return { ...filterLocalPastagens(local.data, filters), source: 'local', capturedAt: local.capturedAt };
      }
      throw error;
    }
  },

  getById: async (id: string): Promise<Pastagem | null> => {
    const { data, error } = await supabase.from('pastagens').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPastagem(data as unknown as PastagemDbRow) : null;
  },

  create: async (userId: string, item: Omit<Pastagem, 'id' | 'createdAt'>): Promise<Pastagem> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const id = crypto.randomUUID();
    buildPastagemInsert(item, id);
    return queueLocalCreate(userId, item, id);
  },

  update: async (userId: string, id: string, updates: Partial<Pastagem>): Promise<Pastagem> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const patch = buildPastagemPatch(updates);
    if (Object.keys(patch).length === 0) throw new Error('Nenhuma alteração válida foi informada.');
    return queueLocalUpdate(userId, id, updates);
  },

  delete: async (userId: string, id: string): Promise<boolean> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    return queueLocalDelete(userId, id);
  },

  getServicos: async (pastoId?: string): Promise<ServicoPastagem[]> => {
    let query = supabase.from('servicos_pastagem').select('*').order('data', { ascending: false });
    if (pastoId) query = query.eq('pasto_id', pastoId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as unknown as ServicoDbRow[]).map(toServico);
  },

  addServico: async (item: Omit<ServicoPastagem, 'id' | 'createdAt'>): Promise<ServicoPastagem> => {
    const id = `ser-${crypto.randomUUID()}`;
    const payload = {
      id,
      pasto_id: item.pasto_id,
      nome_pasto: item.nome_pasto ?? null,
      tipo_servico: item.tipo_servico,
      data: item.data,
      responsavel: item.responsavel ?? null,
      observacoes: item.observacoes ?? null,
    };
    const { data, error } = await supabase.from('servicos_pastagem').insert(payload).select('*').single();
    if (error) throw error;
    return toServico(data as unknown as ServicoDbRow);
  },
};

const setLocalSyncStatus = async (userId: string, pastagemId: string, status: PastagemLocal['syncStatus'], error?: string, localDeleted?: boolean) => {
  const record = await getOfflineRecord<PastagemLocal>(localRecordKey(userId, pastagemId));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
  await saveOfflineRecord({
    ...record,
    data: { ...record.data, syncStatus: status, syncError: error, localDeleted: localDeleted ?? record.data.localDeleted },
    updatedAt: new Date().toISOString(),
  });
};

const isCurrentUser = async (userId: string) => (await getCurrentUserId()) === userId;
let activePastagemSync: { userId: string; promise: Promise<void> } | null = null;
let scheduledPastagemRetry: { userId: string; timeoutId: ReturnType<typeof setTimeout> } | null = null;

const cancelScheduledRetry = (userId?: string) => {
  if (!scheduledPastagemRetry || (userId && scheduledPastagemRetry.userId !== userId)) return;
  clearTimeout(scheduledPastagemRetry.timeoutId);
  scheduledPastagemRetry = null;
};

const scheduleRetry = (userId: string, nextRetryAt: string) => {
  cancelScheduledRetry();
  const timeoutId = setTimeout(() => {
    scheduledPastagemRetry = null;
    if (!isBrowserOnline()) return;
    void getCurrentUserId().then((currentUserId) => {
      if (currentUserId === userId) return syncPastagens(userId);
      return undefined;
    }).catch(() => undefined);
  }, Math.max(0, new Date(nextRetryAt).getTime() - Date.now()));
  scheduledPastagemRetry = { userId, timeoutId };
};

useConnectivityStore.subscribe((state) => {
  if (state.status === 'offline') cancelScheduledRetry();
});

const getPastagemOperationId = (operation: OutboxOperation<PastagemOutboxPayload>): string => operation.payload.id;

const compactUnsyncedCreateDelete = async (userId: string): Promise<void> => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    const operations = await offlineDb.outbox.toArray() as Array<OutboxOperation<PastagemOutboxPayload>>;
    const userOperations = operations.filter((operation) => operation.userId === userId && operation.entity === ENTITY);
    const ids = new Set(userOperations.map(getPastagemOperationId));

    for (const pastagemId of ids) {
      const related = userOperations.filter((operation) => getPastagemOperationId(operation) === pastagemId);
      const create = related.find((operation) => operation.operation === 'create');
      const deletion = related.find((operation) => operation.operation === 'delete');
      if (!create || !deletion || create.status !== 'pending' || deletion.status !== 'pending') continue;
      if (related.some((operation) => operation.status !== 'pending')) continue;

      await offlineDb.outbox.bulkDelete(related.map((operation) => operation.id));
      await offlineDb.localRecords.delete(localRecordKey(userId, pastagemId));
    }
  });
};

const runPastagemSync = async (userId: string): Promise<void> => {
  await compactUnsyncedCreateDelete(userId);
  const operations = await listOutboxOperations<PastagemOutboxPayload>({ userId, entity: ENTITY });
  if (operations.length === 0) return;
  useConnectivityStore.getState().setSyncing();
  let retryAt: string | null = null;

  for (const operation of operations) {
    if (!(await isCurrentUser(userId))) return;
    if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) {
      retryAt = operation.nextRetryAt;
      break;
    }
    try {
      await markOutboxOperationProcessing(operation.id);
      const payload = operation.payload;
      await setLocalSyncStatus(userId, payload.id, 'processing', undefined, operation.operation === 'delete');
      if (!(await isCurrentUser(userId))) return;
      let remote: Pastagem | null = null;
      if (operation.operation === 'create') {
        const createPayload = payload as PastagemCreatePayload;
        remote = await remoteCreatePastagem(createPayload.item, createPayload.id);
      } else if (operation.operation === 'update') {
        const updatePayload = payload as PastagemUpdatePayload;
        remote = await remoteUpdatePastagem(updatePayload.id, updatePayload.updates);
      } else {
        await remoteDeletePastagem((payload as PastagemDeletePayload).id);
      }
      if (!(await isCurrentUser(userId))) return;
      if (remote) {
        await saveOfflineRecord(localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }));
      } else {
        await deleteOfflineRecord(localRecordKey(userId, payload.id));
      }
      await deleteOutboxOperation(operation.id);
    } catch (error) {
      console.error('[SYNC PASTAGENS ERROR]', error);
      if (!(await isCurrentUser(userId))) return;
      const message = error instanceof Error ? error.message : 'Falha ao sincronizar pastagem';
      const failed = await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
      retryAt = failed?.nextRetryAt ?? null;
      await setLocalSyncStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
      useConnectivityStore.getState().setError(message);
      break;
    }
  }
  const remaining = await listOutboxOperations({ userId, entity: ENTITY });
  if (remaining.length === 0) {
    cancelScheduledRetry(userId);
    useConnectivityStore.getState().setOnline();
  } else if (retryAt && isBrowserOnline()) {
    scheduleRetry(userId, retryAt);
  }
};

export const syncPastagens = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline()) return;
  if (requestedUserId && !(await isCurrentUser(userId))) return;
  if (activePastagemSync) {
    if (activePastagemSync.userId === userId) return activePastagemSync.promise;
    await activePastagemSync.promise;
  }
  let promise: Promise<void>;
  promise = runPastagemSync(userId).finally(() => {
    if (activePastagemSync?.promise === promise) activePastagemSync = null;
  });
  activePastagemSync = { userId, promise };
  return promise;
};
