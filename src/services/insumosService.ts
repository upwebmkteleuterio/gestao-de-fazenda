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
  markOutboxOperationPending,
  markOutboxOperationProcessing,
  offlineDb,
  saveOfflineRecord,
  saveOfflineRecordAndEnqueue,
  saveOfflineRecords,
  saveOfflineSnapshot,
  type OutboxOperation,
} from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import type { Insumo, MovimentacaoInsumo } from '@/types/database';

type InsumoDbRow = {
  id: string;
  nome_produto: string;
  unidade_medida: Insumo['unidade_medida'];
  categoria: Insumo['categoria'];
  estoque_minimo: number | string;
  estoque_atual: number | string;
  custo_unitario: number | string;
  created_at: string;
};

type MovimentacaoDbRow = {
  id: string;
  insumo_id: string;
  nome_insumo: string;
  tipo: MovimentacaoInsumo['tipo'];
  quantidade: number | string;
  data_movimento: string;
  origem_manejo_id: string | null;
  observacao: string | null;
  created_at: string;
};

type LocalInsumo = Insumo & { syncStatus?: 'synced' | 'pending' | 'processing' | 'error'; syncError?: string; localDeleted?: boolean };
type CreatePayload = { id: string; remoteId: string; item: Omit<Insumo, 'id' | 'createdAt'> };
type UpdatePayload = { id: string; updates: Partial<Insumo> };
type DeletePayload = { id: string };
type InsumoOutboxPayload = CreatePayload | UpdatePayload | DeletePayload;
type InsumosQuery = { data: Insumo[]; total: number; source: 'remote' | 'local'; capturedAt?: string };

const ENTITY = 'insumo';
const MOVIMENTACOES_ENTITY = 'movimentacao_insumo';
const HISTORY_LIMIT = 10;
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;
const snapshotKey = (userId: string) => `${ENTITY}:${userId}:snapshot`;
const historySnapshotKey = (userId: string) => `${MOVIMENTACOES_ENTITY}:${userId}:recent`;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());
const isCurrentUser = async (userId: string) => (await getCurrentUserId()) === userId;
const toNumber = (value: number | string): number => Number(value);

const toInsumo = (row: InsumoDbRow): Insumo => ({
  id: row.id,
  nome_produto: row.nome_produto,
  unidade_medida: row.unidade_medida,
  categoria: row.categoria,
  estoque_minimo: toNumber(row.estoque_minimo),
  estoque_atual: toNumber(row.estoque_atual),
  custo_unitario: toNumber(row.custo_unitario),
  createdAt: row.created_at,
});

const toMovimentacao = (row: MovimentacaoDbRow): MovimentacaoInsumo => ({
  id: row.id,
  insumo_id: row.insumo_id,
  nome_insumo: row.nome_insumo,
  tipo: row.tipo,
  quantidade: toNumber(row.quantidade),
  data_movimento: row.data_movimento,
  origem_manejo_id: row.origem_manejo_id ?? undefined,
  observacao: row.observacao ?? undefined,
  createdAt: row.created_at,
});

const localRecord = (userId: string, item: LocalInsumo) => ({
  key: localRecordKey(userId, item.id), userId, entity: ENTITY, entityId: item.id,
  data: item, updatedAt: new Date().toISOString(),
});
const hasPendingWork = (item: LocalInsumo) => item.syncStatus === 'pending' || item.syncStatus === 'processing' || item.syncStatus === 'error' || Boolean(item.localDeleted);

const readLocalInsumos = async (userId: string): Promise<{ data: LocalInsumo[]; capturedAt?: string }> => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalInsumo>({ userId, entity: ENTITY }),
    getOfflineSnapshot<Insumo[]>(snapshotKey(userId)),
  ]);
  const cached = new Map((snapshot?.data ?? []).map((item) => [item.id, item as LocalInsumo]));
  records.filter((record) => hasPendingWork(record.data)).forEach((record) => {
    if (record.data.localDeleted) cached.delete(record.entityId);
    else cached.set(record.entityId, record.data);
  });
  return { data: Array.from(cached.values()).filter((item) => !item.localDeleted), capturedAt: snapshot?.capturedAt };
};

const filterLocal = (items: Insumo[], categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }) => {
  const search = filters?.search?.trim().toLocaleLowerCase() ?? '';
  const filtered = items.filter((item) => (
    (!categoria || categoria === 'all' || item.categoria === categoria)
    && (!search || item.nome_produto.toLocaleLowerCase().includes(search))
    && (!filters?.estoqueBaixo || item.estoque_atual <= item.estoque_minimo)
  ));
  const total = filtered.length;
  if (filters?.page === undefined || filters.limit === undefined) return { data: filtered, total };
  const start = Math.max(0, (filters.page - 1) * filters.limit);
  return { data: filtered.slice(start, start + filters.limit), total };
};

const mergePending = async (userId: string, items: Insumo[], total: number, categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }) => {
  const pending = (await listOfflineRecords<LocalInsumo>({ userId, entity: ENTITY })).map((record) => record.data).filter(hasPendingWork);
  const merged = new Map(items.map((item) => [item.id, item]));
  let adjustedTotal = total;
  pending.forEach((item) => {
    if (item.localDeleted) {
      if (merged.delete(item.id)) adjustedTotal -= 1;
      return;
    }
    const matches = filterLocal([item], categoria, { ...filters, page: undefined, limit: undefined }).total > 0;
    if (!matches) return;
    if (merged.has(item.id)) merged.set(item.id, item);
    else if (!filters?.page || filters.page === 1) {
      merged.set(item.id, item);
      adjustedTotal += 1;
    }
  });
  return { data: Array.from(merged.values()), total: Math.max(0, adjustedTotal) };
};

const cacheOnlineInsumos = async (userId: string, items: Insumo[], complete: boolean) => {
  const existing = await listOfflineRecords<LocalInsumo>({ userId, entity: ENTITY });
  const existingById = new Map(existing.map((record) => [record.entityId, record.data]));
  const remoteIds = new Set(items.map((item) => item.id));
  await saveOfflineRecords(items.map((item) => {
    const current = existingById.get(item.id);
    return localRecord(userId, current && hasPendingWork(current) ? current : { ...item, syncStatus: 'synced', localDeleted: false });
  }));
  if (!complete) return;
  await deleteOfflineRecords(existing.filter((record) => !remoteIds.has(record.entityId) && !hasPendingWork(record.data)).map((record) => record.key));
  const current = (await listOfflineRecords<LocalInsumo>({ userId, entity: ENTITY })).filter((record) => !record.data.localDeleted).map((record) => record.data);
  await saveOfflineSnapshot({ key: snapshotKey(userId), scope: `${ENTITY}:${userId}`, data: current, capturedAt: new Date().toISOString() });
};

const getInsumosRows = async (): Promise<InsumoDbRow[]> => {
  const { data, error } = await supabase.from('insumos').select('*');
  if (error) throw error;
  return (data ?? []) as unknown as InsumoDbRow[];
};
const getInsumoRow = async (id: string): Promise<InsumoDbRow | null> => {
  const { data, error } = await supabase.from('insumos').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as InsumoDbRow | null;
};

const getRecentMovimentacoes = async (): Promise<MovimentacaoInsumo[]> => {
  const { data, error } = await supabase.from('movimentacoes_insumos').select('*').order('created_at', { ascending: false }).range(0, HISTORY_LIMIT - 1);
  if (error) throw error;
  return ((data ?? []) as unknown as MovimentacaoDbRow[]).map(toMovimentacao);
};

const setLocalStatus = async (userId: string, id: string, status: LocalInsumo['syncStatus'], error?: string, localDeleted?: boolean) => {
  const record = await getOfflineRecord<LocalInsumo>(localRecordKey(userId, id));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
  await saveOfflineRecord({ ...record, data: { ...record.data, syncStatus: status, syncError: error, localDeleted: localDeleted ?? record.data.localDeleted }, updatedAt: new Date().toISOString() });
};

const remoteCreate = async (payload: CreatePayload): Promise<Insumo> => {
  const item = payload.item;
  const { data, error } = await supabase.from('insumos').insert({
    id: payload.remoteId,
    nome_produto: item.nome_produto,
    unidade_medida: item.unidade_medida,
    categoria: item.categoria,
    estoque_minimo: item.estoque_minimo,
    estoque_atual: item.estoque_atual,
    custo_unitario: item.custo_unitario,
  }).select('*').single();
  if (!error) return toInsumo(data as unknown as InsumoDbRow);
  const { data: existing, error: lookupError } = await supabase.from('insumos').select('*').eq('id', payload.remoteId).maybeSingle();
  if (!lookupError && existing) return toInsumo(existing as unknown as InsumoDbRow);
  throw error;
};

const buildUpdatePatch = (updates: Partial<Insumo>): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (updates.nome_produto !== undefined) patch.nome_produto = updates.nome_produto;
  if (updates.unidade_medida !== undefined) patch.unidade_medida = updates.unidade_medida;
  if (updates.categoria !== undefined) patch.categoria = updates.categoria;
  if (updates.estoque_minimo !== undefined) patch.estoque_minimo = updates.estoque_minimo;
  if (updates.estoque_atual !== undefined) patch.estoque_atual = updates.estoque_atual;
  if (updates.custo_unitario !== undefined) patch.custo_unitario = updates.custo_unitario;
  return patch;
};

const remoteUpdate = async (payload: UpdatePayload): Promise<Insumo> => {
  const { data, error } = await supabase.from('insumos').update(buildUpdatePatch(payload.updates)).eq('id', payload.id).select('*').single();
  if (error) throw error;
  return toInsumo(data as unknown as InsumoDbRow);
};
const remoteDelete = async (id: string): Promise<void> => {
  const { error } = await supabase.from('insumos').delete().eq('id', id);
  if (error) throw error;
};

const remapCreatedId = async (userId: string, temporaryId: string, remote: Insumo) => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    const temporaryKey = localRecordKey(userId, temporaryId);
    const record = await offlineDb.localRecords.get(temporaryKey);
    if (record) {
      await offlineDb.localRecords.delete(temporaryKey);
      await offlineDb.localRecords.put(localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }));
    }
    const operations = await offlineDb.outbox.toArray() as Array<OutboxOperation<InsumoOutboxPayload>>;
    for (const operation of operations.filter((current) => current.userId === userId && current.entity === ENTITY)) {
      const payload = operation.payload;
      if (payload.id !== temporaryId) continue;
      await offlineDb.outbox.put({ ...operation, payload: { ...payload, id: remote.id }, updatedAt: new Date().toISOString() });
    }
  });
};

let activeSync: { userId: string; promise: Promise<void> } | null = null;
const isTransportError = (error: unknown) => !isBrowserOnline() || /network|fetch|offline|load failed|failed to fetch/i.test(error instanceof Error ? error.message : '');

export const syncInsumos = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline() || !(await isCurrentUser(userId))) return;
  if (activeSync) {
    if (activeSync.userId === userId) return activeSync.promise;
    await activeSync.promise;
  }
  let promise: Promise<void>;
  promise = (async () => {
    while (await isCurrentUser(userId)) {
      const operations = await listOutboxOperations<InsumoOutboxPayload>({ userId, entity: ENTITY });
      const operation = operations[0];
      if (!operation) break;
      if (operation.status === 'processing') await markOutboxOperationPending(operation.id);
      if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) break;
      try {
        await markOutboxOperationProcessing(operation.id);
        const currentId = operation.payload.id;
        await setLocalStatus(userId, currentId, 'processing', undefined, operation.operation === 'delete');
        if (operation.operation === 'create') {
          const remote = await remoteCreate(operation.payload as CreatePayload);
          await remapCreatedId(userId, currentId, remote);
          await deleteOutboxOperation(operation.id);
        } else if (operation.operation === 'update') {
          const remote = await remoteUpdate(operation.payload as UpdatePayload);
          await saveOfflineRecord(localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }));
          await deleteOutboxOperation(operation.id);
        } else {
          await remoteDelete((operation.payload as DeletePayload).id);
          await deleteOfflineRecord(localRecordKey(userId, currentId));
          await deleteOutboxOperation(operation.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao sincronizar insumo.';
        await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
        await setLocalStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
        if (!isTransportError(error)) useConnectivityStore.getState().setError(message);
        break;
      }
    }
    if ((await listOutboxOperations({ userId, entity: ENTITY })).length === 0) useConnectivityStore.getState().setOnline();
  })().finally(() => { if (activeSync?.promise === promise) activeSync = null; });
  activeSync = { userId, promise };
  return promise;
};

const queueCreate = async (userId: string, item: Omit<Insumo, 'id' | 'createdAt'>): Promise<LocalInsumo> => {
  const local: LocalInsumo = { ...item, id: `local-insumo-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), syncStatus: 'pending', localDeleted: false };
  await saveOfflineRecordAndEnqueue(localRecord(userId, local), { userId, entity: ENTITY, operation: 'create', payload: { id: local.id, remoteId: `ins-${crypto.randomUUID()}`, item } });
  return local;
};
const queueUpdate = async (userId: string, id: string, updates: Partial<Insumo>): Promise<LocalInsumo> => {
  const current = await getOfflineRecord<LocalInsumo>(localRecordKey(userId, id));
  if (!current || current.data.localDeleted) throw new Error('Insumo não encontrado no cache local.');
  const local: LocalInsumo = { ...current.data, ...updates, id, syncStatus: 'pending', syncError: undefined, localDeleted: false };
  await saveOfflineRecordAndEnqueue({ ...current, data: local, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'update', payload: { id, updates } });
  return local;
};
const queueDelete = async (userId: string, id: string): Promise<boolean> => {
  const current = await getOfflineRecord<LocalInsumo>(localRecordKey(userId, id));
  if (!current || current.data.localDeleted) throw new Error('Insumo não encontrado no cache local.');
  await saveOfflineRecordAndEnqueue({ ...current, data: { ...current.data, syncStatus: 'pending', syncError: undefined, localDeleted: true }, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'delete', payload: { id } });
  return true;
};

const getMovimentacoesRows = async (origemManejoId: string): Promise<MovimentacaoDbRow[]> => {
  const { data, error } = await supabase.from('movimentacoes_insumos').select('*').eq('origem_manejo_id', origemManejoId);
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoDbRow[];
};

const restoreStock = async (movimentacoes: MovimentacaoDbRow[]): Promise<void> => {
  for (const movimentacao of movimentacoes) {
    const insumo = await getInsumoRow(movimentacao.insumo_id);
    if (!insumo) continue;
    const currentStock = toNumber(insumo.estoque_atual);
    const quantity = toNumber(movimentacao.quantidade);
    const nextStock = movimentacao.tipo === 'saida' ? currentStock + quantity : Math.max(0, currentStock - quantity);
    const { error } = await supabase.from('insumos').update({ estoque_atual: nextStock }).eq('id', movimentacao.insumo_id);
    if (error) throw error;
  }
};

export const removerMovimentacoesPorOrigem = async (origemManejoId: string): Promise<MovimentacaoDbRow[]> => {
  const movimentacoes = await getMovimentacoesRows(origemManejoId);
  if (movimentacoes.length === 0) return [];
  await restoreStock(movimentacoes);
  const { error } = await supabase.from('movimentacoes_insumos').delete().eq('origem_manejo_id', origemManejoId);
  if (error) {
    await restoreStock(movimentacoes.map((movimentacao) => ({ ...movimentacao, tipo: movimentacao.tipo === 'saida' ? 'entrada' : 'saida' })));
    throw error;
  }
  return movimentacoes;
};

export const insumosService = {
  getAll: async (categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }): Promise<InsumosQuery> => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };
    const completeLookup = !categoria && !filters?.search && !filters?.estoqueBaixo && filters?.page === undefined && filters?.limit === undefined;
    if (!isBrowserOnline()) {
      const local = await readLocalInsumos(userId);
      return { ...filterLocal(local.data, categoria, filters), source: 'local', capturedAt: local.capturedAt };
    }
    try {
      if (completeLookup) {
        const items = (await getInsumosRows()).map(toInsumo);
        await cacheOnlineInsumos(userId, items, true);
        const merged = await mergePending(userId, items, items.length);
        return { ...merged, source: 'remote' };
      }
      const { data, error } = await supabase.rpc('get_insumos_page', {
        p_categoria: categoria && categoria !== 'all' ? categoria : null,
        p_search: filters?.search || null,
        p_estoque_baixo: filters?.estoqueBaixo ?? false,
        p_page: filters?.page ?? 1,
        p_limit: filters?.limit ?? 10,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as (InsumoDbRow & { total_count: number | string })[];
      let total = rows.length > 0 ? Number(rows[0].total_count) : 0;
      if (rows.length === 0 && filters?.page && filters.page > 1) {
        const { data: firstPage, error: firstPageError } = await supabase.rpc('get_insumos_page', {
          p_categoria: categoria && categoria !== 'all' ? categoria : null,
          p_search: filters.search || null,
          p_estoque_baixo: filters.estoqueBaixo ?? false,
          p_page: 1,
          p_limit: 1,
        });
        if (firstPageError) throw firstPageError;
        const firstRow = (firstPage ?? [])[0] as { total_count?: number | string } | undefined;
        total = firstRow?.total_count === undefined ? 0 : Number(firstRow.total_count);
      }
      const items = rows.map(toInsumo);
      await cacheOnlineInsumos(userId, items, false);
      const merged = await mergePending(userId, items, total, categoria, filters);
      return { ...merged, source: 'remote' };
    } catch (error) {
      if (!isTransportError(error)) throw error;
      const local = await readLocalInsumos(userId);
      return { ...filterLocal(local.data, categoria, filters), source: 'local', capturedAt: local.capturedAt };
    }
  },

  prefetch: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || !(await isCurrentUser(userId))) return;
    const items = (await getInsumosRows()).map(toInsumo);
    await cacheOnlineInsumos(userId, items, true);
    const recent = await getRecentMovimentacoes();
    await saveOfflineSnapshot({ key: historySnapshotKey(userId), scope: `${MOVIMENTACOES_ENTITY}:${userId}`, data: recent, capturedAt: new Date().toISOString() });
  },

  getById: async (id: string): Promise<Insumo | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const local = await getOfflineRecord<LocalInsumo>(localRecordKey(userId, id));
    if (!isBrowserOnline()) return local && !local.data.localDeleted ? local.data : null;
    const row = await getInsumoRow(id);
    return row ? toInsumo(row) : local?.data ?? null;
  },

  create: async (item: Omit<Insumo, 'id' | 'createdAt'>): Promise<Insumo> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const local = await queueCreate(userId, item);
    if (isBrowserOnline()) void syncInsumos(userId).catch(() => undefined);
    return local;
  },
  update: async (id: string, updates: Partial<Insumo>): Promise<Insumo> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const local = await queueUpdate(userId, id, updates);
    if (isBrowserOnline()) void syncInsumos(userId).catch(() => undefined);
    return local;
  },
  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const result = await queueDelete(userId, id);
    if (isBrowserOnline()) void syncInsumos(userId).catch(() => undefined);
    return result;
  },
  registrarMovimentacao: async (mov: Omit<MovimentacaoInsumo, 'id' | 'createdAt'>): Promise<MovimentacaoInsumo> => {
    if (!isBrowserOnline()) throw new Error('Offline: registrar movimentação está indisponível para preservar o saldo e o histórico.');
    if (mov.quantidade <= 0) throw new Error('A quantidade deve ser maior que zero');
    const rows = await getInsumosRows();
    const insumo = rows.find((row) => row.id === mov.insumo_id);
    if (!insumo) throw new Error('Insumo não encontrado');
    const currentStock = toNumber(insumo.estoque_atual);
    if (mov.tipo === 'saida' && mov.quantidade > currentStock) throw new Error('Estoque insuficiente para registrar a saída');
    const nextStock = mov.tipo === 'entrada' ? currentStock + mov.quantidade : currentStock - mov.quantidade;
    const { error: stockError } = await supabase.from('insumos').update({ estoque_atual: nextStock }).eq('id', insumo.id);
    if (stockError) throw stockError;
    const movementId = `mov-${crypto.randomUUID()}`;
    const { data, error } = await supabase.from('movimentacoes_insumos').insert({
      id: movementId,
      insumo_id: insumo.id,
      nome_insumo: mov.nome_insumo || insumo.nome_produto,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      data_movimento: mov.data_movimento,
      origem_manejo_id: mov.origem_manejo_id ?? null,
      observacao: mov.observacao ?? null,
    }).select('*').single();
    if (error) {
      const { data: existingMovement } = await supabase.from('movimentacoes_insumos').select('*').eq('id', movementId).maybeSingle();
      if (existingMovement) return toMovimentacao(existingMovement as unknown as MovimentacaoDbRow);
      await supabase.from('insumos').update({ estoque_atual: currentStock }).eq('id', insumo.id);
      throw error;
    }
    return toMovimentacao(data as unknown as MovimentacaoDbRow);
  },
  getMovimentacoes: async (insumoId?: string): Promise<MovimentacaoInsumo[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    if (!isBrowserOnline()) {
      const snapshot = await getOfflineSnapshot<MovimentacaoInsumo[]>(historySnapshotKey(userId));
      return (snapshot?.data ?? []).filter((item) => !insumoId || item.insumo_id === insumoId).slice(0, HISTORY_LIMIT);
    }
    let query = supabase.from('movimentacoes_insumos').select('*').order('created_at', { ascending: false });
    if (insumoId) query = query.eq('insumo_id', insumoId);
    const { data, error } = await query;
    if (error) throw error;
    const items = ((data ?? []) as unknown as MovimentacaoDbRow[]).map(toMovimentacao);
    if (!insumoId) await saveOfflineSnapshot({ key: historySnapshotKey(userId), scope: `${MOVIMENTACOES_ENTITY}:${userId}`, data: items.slice(0, HISTORY_LIMIT), capturedAt: new Date().toISOString() });
    return items;
  },
};

export type { InsumoOutboxPayload, LocalInsumo, InsumosQuery };
export { historySnapshotKey };
