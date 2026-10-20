import { getCurrentUserId as readCurrentUserId, readCurrentSession, supabase } from '@/integrations/supabase/client';
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
import { isNetworkFailure } from '@/offline/network';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { MAX_FINANCEIRO_DESCRIPTION_LENGTH, MAX_FINANCEIRO_VALUE, sanitizeReportSearch, validateFinanceiroFields } from '@/services/domainValidation';
import type { TransacaoFinanceira } from '@/types/database';

export type FinanceiroResumo = { receitas: number; despesas: number; saldo: number; pendentes: number };
export type FinanceiroSource = 'remote' | 'local';
export type FinanceiroQuery = { data: TransacaoFinanceira[]; total: number; source: FinanceiroSource; capturedAt?: string };
export type FinanceiroFilters = {
  search?: string;
  tipo?: string;
  categoria?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

type DbRow = {
  id: string;
  tipo: TransacaoFinanceira['tipo'];
  categoria: TransacaoFinanceira['categoria'];
  descricao: string;
  valor: number | string;
  data: string;
  status: TransacaoFinanceira['status'];
  animal_id: string | null;
  pasto_id: string | null;
  created_at: string;
};
type LocalTransaction = TransacaoFinanceira & {
  syncStatus?: 'synced' | 'pending' | 'processing' | 'error';
  syncError?: string;
  localDeleted?: boolean;
};
type CreatePayload = { id: string; item: Omit<TransacaoFinanceira, 'id' | 'createdAt'> };
type UpdatePayload = { id: string; updates: Record<string, unknown> };
type DeletePayload = { id: string };
type OutboxPayload = CreatePayload | UpdatePayload | DeletePayload;
type SummarySnapshot = { resumo: FinanceiroResumo };

const ENTITY = 'transacao_financeira';
const SUMMARY_FUNCTION = 'get_financeiro_resumo_mensal';
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;
const snapshotKey = (userId: string) => `${ENTITY}:current-month:${userId}`;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());
const isCurrentUser = async (userId: string) => (await getCurrentUserId()) === userId;
const isCurrentSuperadmin = async (userId: string) => {
  const { session } = await readCurrentSession(isBrowserOnline());
  return session?.user.id === userId && session.user.app_metadata?.role === 'superadmin';
};

const currentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  return { startDate, endDate: end.toISOString().slice(0, 10) };
};

const isCurrentMonthDate = (value: string) => {
  const { startDate, endDate } = currentMonthRange();
  return value >= startDate && value < endDate;
};

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const validateDateRange = (startDate?: string, endDate?: string) => {
  if (startDate !== undefined && !isDate(startDate)) throw new Error('Período inicial inválido.');
  if (endDate !== undefined && !isDate(endDate)) throw new Error('Período final inválido.');
  if (startDate && endDate && startDate >= endDate) throw new Error('O período financeiro deve ser válido.');
};

const isCurrentMonthRange = (startDate?: string, endDate?: string) => {
  const current = currentMonthRange();
  return startDate === current.startDate && endDate === current.endDate;
};

const toTransaction = (row: DbRow): TransacaoFinanceira => ({
  id: row.id,
  tipo: row.tipo,
  categoria: row.categoria,
  descricao: row.descricao,
  valor: Number(row.valor),
  data: row.data,
  status: row.status,
  animal_id: row.animal_id ?? undefined,
  pasto_id: row.pasto_id ?? undefined,
  createdAt: row.created_at,
});

const normalizeOptionalId = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Identificador relacionado inválido.');
  const normalized = value.trim();
  if (!normalized || normalized.length > 200 || /[\u0000-\u001F\u007F]/.test(normalized)) throw new Error('Identificador relacionado inválido.');
  return normalized;
};

const allowedTipo = new Set<TransacaoFinanceira['tipo']>(['receita', 'despesa']);
const allowedCategoria = new Set<TransacaoFinanceira['categoria']>([
  'venda_gado', 'venda_leite', 'compra_insumo', 'manutencao', 'veterinario', 'salarios', 'outros',
]);
const allowedStatus = new Set<TransacaoFinanceira['status']>(['pago', 'pendente']);

const normalizeTipo = (value: unknown): TransacaoFinanceira['tipo'] => {
  if (typeof value !== 'string' || !allowedTipo.has(value as TransacaoFinanceira['tipo'])) throw new Error('Tipo financeiro inválido.');
  return value as TransacaoFinanceira['tipo'];
};
const normalizeCategoria = (value: unknown): TransacaoFinanceira['categoria'] => {
  if (typeof value !== 'string' || !allowedCategoria.has(value as TransacaoFinanceira['categoria'])) throw new Error('Categoria financeira inválida.');
  return value as TransacaoFinanceira['categoria'];
};
const normalizeStatus = (value: unknown): TransacaoFinanceira['status'] => {
  if (typeof value !== 'string' || !allowedStatus.has(value as TransacaoFinanceira['status'])) throw new Error('Status financeiro inválido.');
  return value as TransacaoFinanceira['status'];
};
const normalizeDescription = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('Informe a descrição.');
  const normalized = value.trim();
  if (normalized.length > MAX_FINANCEIRO_DESCRIPTION_LENGTH) throw new Error(`A descrição deve ter no máximo ${MAX_FINANCEIRO_DESCRIPTION_LENGTH} caracteres.`);
  return normalized;
};
const normalizeValor = (value: unknown): number => {
  const valor = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(valor) || valor < 0 || valor > MAX_FINANCEIRO_VALUE) throw new Error(`O valor deve ser um número entre 0 e ${MAX_FINANCEIRO_VALUE.toLocaleString('pt-BR')}.`);
  return valor;
};

const buildInsert = (item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>, id: string) => {
  validateFinanceiroFields(item);
  return ({
  id,
  tipo: normalizeTipo(item.tipo),
  categoria: normalizeCategoria(item.categoria),
  descricao: normalizeDescription(item.descricao),
  valor: normalizeValor(item.valor),
  data: isDate(item.data) ? item.data : (() => { throw new Error('Data financeira inválida.'); })(),
  status: normalizeStatus(item.status),
  animal_id: normalizeOptionalId(item.animal_id),
  pasto_id: normalizeOptionalId(item.pasto_id),
  });
};

const buildPatch = (updates: Record<string, unknown>): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (updates.tipo !== undefined) patch.tipo = normalizeTipo(updates.tipo);
  if (updates.categoria !== undefined) patch.categoria = normalizeCategoria(updates.categoria);
  if (updates.descricao !== undefined) patch.descricao = normalizeDescription(updates.descricao);
  if (updates.valor !== undefined) patch.valor = normalizeValor(updates.valor);
  if (updates.data !== undefined) {
    if (!isDate(updates.data)) throw new Error('Data financeira inválida.');
    patch.data = updates.data;
  }
  if (updates.status !== undefined) patch.status = normalizeStatus(updates.status);
  if ('animal_id' in updates) patch.animal_id = normalizeOptionalId(updates.animal_id);
  if ('pasto_id' in updates) patch.pasto_id = normalizeOptionalId(updates.pasto_id);
  if (Object.keys(patch).length === 0) throw new Error('Nenhuma alteração válida foi informada.');
  return patch;
};

const toCreatePayload = (item: LocalTransaction): Omit<TransacaoFinanceira, 'id' | 'createdAt'> => ({
  tipo: item.tipo,
  categoria: item.categoria,
  descricao: item.descricao,
  valor: item.valor,
  data: item.data,
  status: item.status,
  animal_id: item.animal_id ?? undefined,
  pasto_id: item.pasto_id ?? undefined,
});
const toUpdatePayload = (updates: Record<string, unknown>): Record<string, unknown> => {
  const { id: _id, createdAt: _createdAt, syncStatus: _syncStatus, syncError: _syncError, localDeleted: _localDeleted, ...payload } = updates;
  return payload;
};
const localRecord = (userId: string, item: LocalTransaction) => ({
  key: localRecordKey(userId, item.id), userId, entity: ENTITY, entityId: item.id, data: item, updatedAt: new Date().toISOString(),
});

const localSummary = (items: TransacaoFinanceira[], cached?: FinanceiroResumo, hasLocalRecords = items.length > 0): FinanceiroResumo => {
  if (!hasLocalRecords && cached) return cached;
  const resumo = items.reduce<FinanceiroResumo>((current, item) => {
    if (item.status === 'pago') {
      if (item.tipo === 'receita') current.receitas += item.valor;
      else current.despesas += item.valor;
    } else {
      current.pendentes += item.valor;
    }
    return current;
  }, { receitas: 0, despesas: 0, saldo: 0, pendentes: 0 });
  resumo.saldo = resumo.receitas - resumo.despesas;
  return resumo;
};

const readLocalCurrentMonth = async (userId: string) => {
  const { startDate, endDate } = currentMonthRange();
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalTransaction>({ userId, entity: ENTITY }),
    getOfflineSnapshot<SummarySnapshot>(snapshotKey(userId)),
  ]);
  const currentMonthRecords = records.filter((record) => record.data.data >= startDate && record.data.data < endDate);
  const data = currentMonthRecords
    .filter((record) => !record.data.localDeleted)
    .map((record) => record.data)
    .sort((left, right) => `${right.data}${right.createdAt}`.localeCompare(`${left.data}${left.createdAt}`));
  return {
    data,
    capturedAt: snapshot?.capturedAt,
    cachedResumo: snapshot?.data.resumo,
    hasLocalRecords: currentMonthRecords.length > 0,
  };
};

const cacheOnlineTransactions = async (userId: string, items: TransacaoFinanceira[], complete: boolean) => {
  const existing = await listOfflineRecords<LocalTransaction>({ userId, entity: ENTITY });
  const pendingIds = new Set(existing.filter((record) => record.data.syncStatus && record.data.syncStatus !== 'synced').map((record) => record.entityId));
  await saveOfflineRecords(items.map((item) => {
    const current = existing.find((record) => record.entityId === item.id);
    return localRecord(userId, current && pendingIds.has(item.id) ? current.data : { ...item, syncStatus: 'synced', localDeleted: false });
  }));
  if (!complete) return;
  const ids = new Set(items.map((item) => item.id));
  await deleteOfflineRecords(existing.filter((record) => !ids.has(record.entityId) && !pendingIds.has(record.entityId)).map((record) => record.key));
};

const validateFinanceiroFilters = (filters?: FinanceiroFilters) => {
  if (!filters) return;
  validateDateRange(filters.startDate, filters.endDate);
  sanitizeReportSearch(filters.search);
  if (filters.tipo !== undefined && !['all', ...allowedTipo].includes(filters.tipo)) throw new Error('Tipo financeiro inválido.');
  if (filters.categoria !== undefined && !['all', ...allowedCategoria].includes(filters.categoria)) throw new Error('Categoria financeira inválida.');
  if (filters.status !== undefined && !['all', ...allowedStatus].includes(filters.status)) throw new Error('Status financeiro inválido.');
  if (filters.page !== undefined && (!Number.isInteger(filters.page) || filters.page < 1)) throw new Error('Página financeira inválida.');
  if (filters.limit !== undefined && (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 500)) throw new Error('O limite financeiro deve estar entre 1 e 500.');
};

const filterRemote = (filters?: FinanceiroFilters) => {
  const search = sanitizeReportSearch(filters?.search);
  return { search, tipo: filters?.tipo, categoria: filters?.categoria, status: filters?.status };
};

const filterLocalCurrentMonth = (items: TransacaoFinanceira[]) => ({ data: items, total: items.length });

const pendingMatchesFilters = (item: LocalTransaction, filters?: FinanceiroFilters) => {
  if (filters?.startDate && item.data < filters.startDate) return false;
  if (filters?.endDate && item.data >= filters.endDate) return false;
  if (filters?.tipo && filters.tipo !== 'all' && item.tipo !== filters.tipo) return false;
  if (filters?.categoria && filters.categoria !== 'all' && item.categoria !== filters.categoria) return false;
  if (filters?.status && filters.status !== 'all' && item.status !== filters.status) return false;
  const search = sanitizeReportSearch(filters?.search).toLocaleLowerCase();
  return !search || `${item.descricao} ${item.categoria}`.toLocaleLowerCase().includes(search);
};

const mergePendingTransactions = (items: TransacaoFinanceira[], total: number, pending: LocalTransaction[], filters?: FinanceiroFilters) => {
  const merged = new Map(items.map((item) => [item.id, item]));
  let totalAdjustment = 0;
  pending.forEach((item) => {
    if (item.localDeleted) {
      if (merged.delete(item.id)) totalAdjustment -= 1;
      return;
    }
    if (merged.has(item.id)) {
      if (pendingMatchesFilters(item, filters)) merged.set(item.id, item);
      else {
        merged.delete(item.id);
        totalAdjustment -= 1;
      }
      return;
    }
    if ((!filters?.page || filters.page === 1) && pendingMatchesFilters(item, filters)) {
      merged.set(item.id, item);
      totalAdjustment += 1;
    }
  });
  return { data: Array.from(merged.values()).sort((left, right) => `${right.data}${right.createdAt}`.localeCompare(`${left.data}${left.createdAt}`)), total: Math.max(0, total + totalAdjustment) };
};

const isNetworkError = (error: unknown) => !isBrowserOnline() || isNetworkFailure(error);

const querySummary = async (startDate?: string, endDate?: string): Promise<FinanceiroResumo> => {
  validateDateRange(startDate, endDate);
  const { data, error } = await supabase.rpc(SUMMARY_FUNCTION, {
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const resumo = (row ?? {}) as Partial<Record<keyof FinanceiroResumo, number | string>>;
  return {
    receitas: Number(resumo.receitas ?? 0),
    despesas: Number(resumo.despesas ?? 0),
    saldo: Number(resumo.saldo ?? 0),
    pendentes: Number(resumo.pendentes ?? 0),
  };
};

export const financeiroService = {
  getAll: async (userId: string, filters?: FinanceiroFilters): Promise<FinanceiroQuery> => {
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    const { startDate, endDate } = filters ?? {};
    validateFinanceiroFilters(filters);
    if (!isBrowserOnline()) {
      const local = await readLocalCurrentMonth(userId);
      return { ...filterLocalCurrentMonth(local.data), source: 'local', capturedAt: local.capturedAt };
    }

    try {
      let query = supabase.from('transacoes_financeiras').select('*', { count: 'exact' })
        .order('data', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
      const remoteFilters = filterRemote(filters);
      if (remoteFilters.search) query = query.or(`descricao.ilike.*${remoteFilters.search}*,categoria.ilike.*${remoteFilters.search}*`);
      if (remoteFilters.tipo && remoteFilters.tipo !== 'all') query = query.eq('tipo', remoteFilters.tipo);
      if (remoteFilters.categoria && remoteFilters.categoria !== 'all') query = query.eq('categoria', remoteFilters.categoria);
      if (remoteFilters.status && remoteFilters.status !== 'all') query = query.eq('status', remoteFilters.status);
      if (startDate) query = query.gte('data', startDate);
      if (endDate) query = query.lt('data', endDate);
      if (filters?.page !== undefined && filters.limit !== undefined) {
        const start = Math.max(0, (filters.page - 1) * filters.limit);
        query = query.range(start, start + filters.limit - 1);
      }
      const { data, count, error } = await query;
      if (error) throw error;
      const items = ((data ?? []) as unknown as DbRow[]).map(toTransaction);
      await cacheOnlineTransactions(userId, items, !filters?.search && (!filters?.tipo || filters.tipo === 'all') && (!filters?.categoria || filters.categoria === 'all') && (!filters?.status || filters.status === 'all') && filters?.page === undefined);
      const pending = (await listOfflineRecords<LocalTransaction>({ userId, entity: ENTITY }))
        .map((record) => record.data)
        .filter((item) => item.syncStatus && item.syncStatus !== 'synced');
      const merged = mergePendingTransactions(items, count ?? items.length, pending, filters);
      const snapshot = isCurrentMonthRange(startDate, endDate)
        ? await getOfflineSnapshot<SummarySnapshot>(snapshotKey(userId))
        : undefined;
      return { ...merged, source: 'remote', capturedAt: snapshot?.capturedAt };
    } catch (error) {
      if (!isNetworkError(error) || !isCurrentMonthRange(startDate, endDate)) throw error;
      const local = await readLocalCurrentMonth(userId);
      return { ...filterLocalCurrentMonth(local.data), source: 'local', capturedAt: local.capturedAt };
    }
  },

  prefetchCurrentMonth: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || !(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) return;
    const { startDate, endDate } = currentMonthRange();
    const { data, error } = await supabase.from('transacoes_financeiras').select('*')
      .gte('data', startDate).lt('data', endDate).order('data', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (error) throw error;
    const transactions = ((data ?? []) as unknown as DbRow[]).map(toTransaction);
    const resumo = await querySummary(startDate, endDate);
    await cacheOnlineTransactions(userId, transactions, true);
    await saveOfflineSnapshot({ key: snapshotKey(userId), scope: `${ENTITY}:${userId}`, data: { resumo }, capturedAt: new Date().toISOString() });
  },

  getResumo: async (userId: string, startDate?: string, endDate?: string): Promise<{ resumo: FinanceiroResumo; source: FinanceiroSource; capturedAt?: string }> => {
    if (!(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    validateDateRange(startDate, endDate);
    const isCurrent = isCurrentMonthRange(startDate, endDate);
    if (!isBrowserOnline() || isCurrent && useConnectivityStore.getState().status === 'offline') {
      const local = await readLocalCurrentMonth(userId);
      return { resumo: localSummary(local.data, local.cachedResumo, local.hasLocalRecords), source: 'local', capturedAt: local.capturedAt };
    }
    try {
      return { resumo: await querySummary(startDate, endDate), source: 'remote' };
    } catch (error) {
      if (!isNetworkError(error) || !isCurrent) throw error;
      const local = await readLocalCurrentMonth(userId);
      return { resumo: localSummary(local.data, local.cachedResumo, local.hasLocalRecords), source: 'local', capturedAt: local.capturedAt };
    }
  },

  getLocalResumo: async (userId: string): Promise<FinanceiroResumo> => {
    if (!(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    const local = await readLocalCurrentMonth(userId);
    return localSummary(local.data, local.cachedResumo, local.hasLocalRecords);
  },

  create: async (userId: string, item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>): Promise<LocalTransaction> => {
    if (!userId || !(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    const id = `fin-${crypto.randomUUID()}`;
    const payload = buildInsert(item, id);
    if (!isBrowserOnline() && !isCurrentMonthDate(payload.data)) throw new Error('Offline: lançamentos só podem usar o mês atual.');
    const local: LocalTransaction = {
      id,
      tipo: payload.tipo,
      categoria: payload.categoria,
      descricao: payload.descricao,
      valor: payload.valor,
      data: payload.data,
      status: payload.status,
      animal_id: payload.animal_id ?? undefined,
      pasto_id: payload.pasto_id ?? undefined,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      localDeleted: false,
    };
    await saveOfflineRecordAndEnqueue(localRecord(userId, local), { userId, entity: ENTITY, operation: 'create', payload: { id, item: toCreatePayload(local) } });
    return local;
  },

  update: async (userId: string, id: string, updates: Partial<TransacaoFinanceira>): Promise<LocalTransaction> => {
    if (!userId || !(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    if (typeof id !== 'string' || !id.trim()) throw new Error('Lançamento financeiro inválido.');
    const patch = buildPatch({ ...updates });
    if (!isBrowserOnline() && typeof patch.data === 'string' && !isCurrentMonthDate(patch.data)) throw new Error('Offline: lançamentos só podem usar o mês atual.');
    const current = await getOfflineRecord<LocalTransaction>(localRecordKey(userId, id));
    if (!current || current.userId !== userId || current.entity !== ENTITY || current.data.localDeleted) throw new Error('Lançamento financeiro não encontrado no cache local.');
    const local: LocalTransaction = { ...current.data, ...patch, id, syncStatus: 'pending', syncError: undefined, localDeleted: false };
    if (!isBrowserOnline() && !isCurrentMonthDate(local.data)) throw new Error('Offline: lançamentos só podem usar o mês atual.');
    await saveOfflineRecordAndEnqueue({ ...current, data: local, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'update', payload: { id, updates: toUpdatePayload(patch) } });
    return local;
  },

  delete: async (userId: string, id: string): Promise<boolean> => {
    if (!userId || !(await isCurrentUser(userId)) || !(await isCurrentSuperadmin(userId))) throw new Error('Acesso não autorizado ao financeiro.');
    if (typeof id !== 'string' || !id.trim()) throw new Error('Lançamento financeiro inválido.');
    const current = await getOfflineRecord<LocalTransaction>(localRecordKey(userId, id));
    if (!current || current.userId !== userId || current.entity !== ENTITY) throw new Error('Lançamento financeiro não encontrado no cache local.');
    if (!isBrowserOnline() && !isCurrentMonthDate(current.data.data)) throw new Error('Offline: lançamentos só podem usar o mês atual.');
    const local: LocalTransaction = { ...current.data, syncStatus: 'pending', syncError: undefined, localDeleted: true };
    await saveOfflineRecordAndEnqueue({ ...current, data: local, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'delete', payload: { id } });
    return true;
  },
};

const remoteCreate = async (payload: CreatePayload): Promise<TransacaoFinanceira> => {
  const { data, error } = await supabase.from('transacoes_financeiras').insert(buildInsert(payload.item, payload.id)).select('*').single();
  if (!error) return toTransaction(data as unknown as DbRow);
  const { data: existing, error: lookupError } = await supabase.from('transacoes_financeiras').select('*').eq('id', payload.id).maybeSingle();
  if (!lookupError && existing) return toTransaction(existing as unknown as DbRow);
  throw error;
};
const remoteUpdate = async (payload: UpdatePayload): Promise<TransacaoFinanceira> => {
  const { data, error } = await supabase.from('transacoes_financeiras').update(buildPatch(payload.updates)).eq('id', payload.id).select('*').single();
  if (error) throw error;
  return toTransaction(data as unknown as DbRow);
};
const remoteDelete = async (id: string) => {
  const { error } = await supabase.from('transacoes_financeiras').delete().eq('id', id);
  if (error) throw error;
};

const operationId = (operation: OutboxOperation<OutboxPayload>) => operation.operation === 'create'
  ? operation.payload.id : operation.payload.id;
const compactCreateDelete = async (userId: string) => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    const operations = (await offlineDb.outbox.toArray()) as Array<OutboxOperation<OutboxPayload>>;
    const scoped = operations.filter((operation) => operation.userId === userId && operation.entity === ENTITY);
    for (const id of new Set(scoped.map(operationId))) {
      const related = scoped.filter((operation) => operationId(operation) === id);
      if (!related.some((operation) => operation.operation === 'create') || !related.some((operation) => operation.operation === 'delete')) continue;
      if (related.some((operation) => operation.status !== 'pending')) continue;
      await offlineDb.outbox.bulkDelete(related.map((operation) => operation.id));
      await offlineDb.localRecords.delete(localRecordKey(userId, id));
    }
  });
};

const setLocalStatus = async (userId: string, id: string, status: LocalTransaction['syncStatus'], error?: string, deleted?: boolean) => {
  const record = await getOfflineRecord<LocalTransaction>(localRecordKey(userId, id));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
  await saveOfflineRecord({ ...record, data: { ...record.data, syncStatus: status, syncError: error, localDeleted: deleted ?? record.data.localDeleted }, updatedAt: new Date().toISOString() });
};

let activeSync: { userId: string; promise: Promise<void> } | null = null;
let retryTimer: { userId: string; timeoutId: ReturnType<typeof setTimeout> } | null = null;
const cancelRetry = (userId?: string) => {
  if (!retryTimer || userId && retryTimer.userId !== userId) return;
  clearTimeout(retryTimer.timeoutId);
  retryTimer = null;
};
const scheduleRetry = (userId: string, nextRetryAt: string) => {
  cancelRetry();
  const timeoutId = setTimeout(() => {
    retryTimer = null;
    if (isBrowserOnline()) void syncFinanceiro(userId).catch(() => undefined);
  }, Math.max(0, new Date(nextRetryAt).getTime() - Date.now()));
  retryTimer = { userId, timeoutId };
};
useConnectivityStore.subscribe((state) => { if (state.status === 'offline') cancelRetry(); });

export const syncFinanceiro = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline() || !(await isCurrentSuperadmin(userId)) || requestedUserId && !(await isCurrentUser(userId))) return;
  if (activeSync) {
    if (activeSync.userId === userId) return activeSync.promise;
    await activeSync.promise;
  }
  let promise: Promise<void>;
  promise = (async () => {
    await compactCreateDelete(userId);
    const operations = await listOutboxOperations<OutboxPayload>({ userId, entity: ENTITY });
    if (operations.length === 0) return;
    useConnectivityStore.getState().setSyncing();
    let retryAt: string | null = null;
    for (const operation of operations) {
      if (!(await isCurrentUser(userId))) return;
      if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) { retryAt = operation.nextRetryAt; break; }
      try {
        await markOutboxOperationProcessing(operation.id);
        await setLocalStatus(userId, operation.payload.id, 'processing', undefined, operation.operation === 'delete');
        let remote: TransacaoFinanceira | null = null;
        if (operation.operation === 'create') remote = await remoteCreate(operation.payload as CreatePayload);
        else if (operation.operation === 'update') remote = await remoteUpdate(operation.payload as UpdatePayload);
        else await remoteDelete((operation.payload as DeletePayload).id);
        if (!(await isCurrentUser(userId))) return;
        if (remote) await saveOfflineRecord(localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }));
        else await deleteOfflineRecord(localRecordKey(userId, operation.payload.id));
        await deleteOutboxOperation(operation.id);
      } catch (error) {
        console.error('[SYNC FINANCEIRO ERROR]', error);
        if (!(await isCurrentUser(userId))) return;
        const message = error instanceof Error ? error.message : 'Falha ao sincronizar lançamento financeiro';
        const failed = await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
        retryAt = failed?.nextRetryAt ?? null;
        await setLocalStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
        useConnectivityStore.getState().setError(message);
        break;
      }
    }
    const remaining = await listOutboxOperations({ userId, entity: ENTITY });
    if (remaining.length === 0) cancelRetry(userId);
    else if (retryAt && isBrowserOnline()) scheduleRetry(userId, retryAt);
    useConnectivityStore.getState().resolveAfterSync();
  })().finally(() => { if (activeSync?.promise === promise) activeSync = null; });
  activeSync = { userId, promise };
  return promise;
};

export { currentMonthRange, localSummary };
export type { LocalTransaction, OutboxPayload };
