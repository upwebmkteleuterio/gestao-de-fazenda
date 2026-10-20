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
import { isNetworkFailure } from '@/offline/network';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { animaisService, syncAnimais } from '@/services/animaisService';
import { validateLoteFields } from '@/services/domainValidation';
import { Lote } from '@/types/database';

export type { Lote };

export interface CreateLoteDTO {
  nome: string;
  animais_ids: string[];
  pasto_id?: string;
  pasto_nome?: string;
}

type LoteDbRow = {
  id: string;
  nome: string;
  data_criacao: string;
  animais_ids: string[] | null;
  pasto_id: string | null;
  pasto_nome: string | null;
};

type LoteSyncStatus = 'synced' | 'pending' | 'processing' | 'error';
type LoteLocal = Lote & { syncStatus?: LoteSyncStatus; syncError?: string; localDeleted?: boolean };
type LoteCreatePayload = { id: string; item: Omit<Lote, 'id'> };
type LoteUpdatePayload = { id: string; updates: Partial<Lote> };
type LoteDeletePayload = { id: string };
type LoteOutboxPayload = LoteCreatePayload | LoteUpdatePayload | LoteDeletePayload;

type LoteFilters = { search?: string; page?: number; limit?: number };

const ENTITY = 'lote';
const localRecordKey = (userId: string, loteId: string) => `${ENTITY}:${userId}:${loteId}`;
const pastureLocalRecordKey = (userId: string, pastureId: string) => `pastagem:${userId}:${pastureId}`;
const snapshotKey = (userId: string) => `${ENTITY}:${userId}:snapshot`;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = (): Promise<string | undefined> => readCurrentUserId(isBrowserOnline());

const toLote = (row: LoteDbRow, animaisIds: string[]): Lote => ({
  id: row.id,
  nome: row.nome,
  data_criacao: row.data_criacao,
  animais_ids: animaisIds,
  pasto_id: row.pasto_id ?? undefined,
  pasto_nome: row.pasto_nome ?? undefined,
});

const getMemberships = async (loteIds?: string[]) => {
  if (loteIds && loteIds.length === 0) return [] as Array<{ lote_id: string; animal_id: string }>;
  let query = supabase.from('lote_animais').select('lote_id, animal_id');
  if (loteIds) query = query.in('lote_id', loteIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Array<{ lote_id: string; animal_id: string }>;
};

const withMemberships = (rows: LoteDbRow[], memberships: Array<{ lote_id: string; animal_id: string }>) => {
  const membershipsByLote = new Map<string, string[]>();
  memberships.forEach(({ lote_id: loteId, animal_id: animalId }) => {
    membershipsByLote.set(loteId, [...(membershipsByLote.get(loteId) ?? []), animalId]);
  });
  return rows.map((row) => toLote(row, membershipsByLote.get(row.id) ?? row.animais_ids ?? []));
};

const getLoteRow = async (id: string) => {
  const { data, error } = await supabase.from('lotes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? data as unknown as LoteDbRow : null;
};

const replaceMemberships = async (loteId: string, animalIds: string[]) => {
  const { error: deleteError } = await supabase.from('lote_animais').delete().eq('lote_id', loteId);
  if (deleteError) throw deleteError;
  if (animalIds.length === 0) return;
  const { error } = await supabase.from('lote_animais').insert(
    animalIds.map((animalId) => ({ lote_id: loteId, animal_id: animalId })),
  );
  if (error) throw error;
};

const syncAnimalPasture = async (animalIds: string[], pastoId?: string, pastoNome?: string) => {
  for (const animalId of animalIds) {
    await animaisService.updateRemote(animalId, { pasto_id: pastoId, pasto_nome: pastoNome });
  }
};

const pendingAnimalCreateIds = async (userId: string): Promise<Set<string>> => {
  const operations = await listOutboxOperations<{ id: string }>({ userId, entity: 'animal' });
  return new Set(
    operations
      .filter((operation) => operation.operation === 'create')
      .map((operation) => operation.payload.id),
  );
};

const validAnimalIdsForSync = async (userId: string, animalIds: string[]): Promise<string[]> => {
  const uniqueIds = [...new Set(animalIds)];
  const pendingCreates = await pendingAnimalCreateIds(userId);
  if (uniqueIds.some((animalId) => pendingCreates.has(animalId))) {
    throw new Error('Aguardando a sincronização dos animais vinculados ao lote.');
  }
  if (uniqueIds.length === 0) return uniqueIds;
  const { data, error } = await supabase.from('animais').select('id').in('id', uniqueIds);
  if (error) throw error;
  const existingIds = new Set(((data ?? []) as Array<{ id: string }>).map((animal) => animal.id));
  if (uniqueIds.some((animalId) => !existingIds.has(animalId))) throw new Error('Um ou mais animais selecionados não foram encontrados.');
  return uniqueIds;
};

const validateLoteInput = async (userId: string, item: Partial<Lote>): Promise<void> => {
  validateLoteFields(item);
  const animalIds = item.animais_ids ?? [];
  if (animalIds.length > 0) {
    const animals = await animaisService.getAll({ includeHistorico: false });
    validateLoteFields(item, animals.data.map((animal) => animal.id));
  }
  if (!item.pasto_id) return;
  const localPasto = await getOfflineRecord<{ id: string; nome_pasto?: string; localDeleted?: boolean }>(pastureLocalRecordKey(userId, item.pasto_id));
  if (localPasto && localPasto.userId === userId && localPasto.entity === 'pastagem' && !localPasto.data.localDeleted) return;
  if (!isBrowserOnline()) throw new Error('O pasto selecionado não está disponível no cache offline.');
  const { data, error } = await supabase.from('pastagens').select('id').eq('id', item.pasto_id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Pasto de destino não encontrado.');
};

const readLocalLotes = async (userId: string): Promise<{ data: LoteLocal[]; capturedAt?: string }> => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LoteLocal>({ userId, entity: ENTITY }),
    getOfflineSnapshot<Lote[]>(snapshotKey(userId)),
  ]);
  const cached = new Map((snapshot?.data ?? []).map((lote) => [lote.id, lote as LoteLocal]));
  records.filter((record) => hasPendingWork(record.data)).forEach((record) => {
    if (record.data.localDeleted) cached.delete(record.entityId);
    else cached.set(record.entityId, record.data);
  });
  return {
    data: Array.from(cached.values()).filter((lote) => !lote.localDeleted),
    capturedAt: snapshot?.capturedAt,
  };
};

const sortRecent = (lotes: Lote[]) => [...lotes].sort((left, right) => (
  right.data_criacao.localeCompare(left.data_criacao) || right.id.localeCompare(left.id)
));

const hasPendingWork = (lote: LoteLocal) => (
  lote.syncStatus === 'pending'
  || lote.syncStatus === 'processing'
  || lote.syncStatus === 'error'
  || Boolean(lote.localDeleted)
);

const cacheOnlineLotes = async (userId: string, items: Lote[], cacheFirstPage: boolean) => {
  const existing = await listOfflineRecords<LoteLocal>({ userId, entity: ENTITY });
  const pending = existing.filter((record) => hasPendingWork(record.data)).map((record) => record.data);
  const existingById = new Map(existing.map((record) => [record.entityId, record.data]));
  const records = items.map((item) => {
    const current = existingById.get(item.id);
    const data: LoteLocal = current && hasPendingWork(current)
      ? current
      : { ...item, syncStatus: 'synced', syncError: undefined, localDeleted: false };
    return {
      key: localRecordKey(userId, item.id),
      userId,
      entity: ENTITY,
      entityId: item.id,
      data,
      updatedAt: new Date().toISOString(),
    };
  });
  await saveOfflineRecords(records);

  let capturedAt: string | undefined;
  if (cacheFirstPage) {
    const remoteIds = new Set(items.map((item) => item.id));
    await deleteOfflineRecords(existing
      .filter((record) => !remoteIds.has(record.entityId) && !hasPendingWork(record.data))
      .map((record) => record.key));
    const snapshot = sortRecent((await listOfflineRecords<LoteLocal>({ userId, entity: ENTITY }))
      .filter((record) => !record.data.localDeleted)
      .map((record) => record.data));
    capturedAt = new Date().toISOString();
    await saveOfflineSnapshot({ key: snapshotKey(userId), scope: userId, data: snapshot, capturedAt });
  }
  return { pending, capturedAt };
};

const matchesSearch = (lote: Lote, search?: string) => (
  !search || lote.nome.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
);

const mergePendingLotes = (items: Lote[], total: number, pending: LoteLocal[], filters?: LoteFilters) => {
  const remoteIds = new Set(items.map((item) => item.id));
  const merged = new Map(items.map((item) => [item.id, item]));
  let totalAdjustment = 0;
  pending.forEach((lote) => {
    if (lote.localDeleted) {
      if (remoteIds.has(lote.id)) {
        merged.delete(lote.id);
        totalAdjustment -= 1;
      }
      return;
    }
    if (remoteIds.has(lote.id)) {
      merged.set(lote.id, lote);
      return;
    }
    if ((!filters?.page || filters.page === 1) && matchesSearch(lote, filters?.search)) {
      merged.set(lote.id, lote);
      totalAdjustment += 1;
    }
  });
  return { data: sortRecent(Array.from(merged.values())), total: Math.max(0, total + totalAdjustment) };
};

const localRecord = (userId: string, lote: LoteLocal) => ({
  key: localRecordKey(userId, lote.id),
  userId,
  entity: ENTITY,
  entityId: lote.id,
  data: lote,
  updatedAt: new Date().toISOString(),
});

const queueAnimalPastureUpdates = async (userId: string, animalIds: string[], pastoId?: string, pastoNome?: string) => {
  const localAnimals = await listOfflineRecords<{ id: string; pasto_id?: string; pasto_nome?: string; localDeleted?: boolean }>({ userId, entity: 'animal' });
  const localIds = new Set(localAnimals.filter((record) => !record.data.localDeleted).map((record) => record.entityId));
  for (const animalId of animalIds) {
    if (!localIds.has(animalId)) continue;
    await animaisService.update(userId, animalId, { pasto_id: pastoId, pasto_nome: pastoNome });
  }
};

const queueLocalCreate = async (userId: string, item: CreateLoteDTO, id: string): Promise<Lote> => {
  const data_criacao = new Date().toISOString();
  await validateLoteInput(userId, { ...item, data_criacao });
  const lote: LoteLocal = {
    id,
    nome: item.nome.trim(),
    data_criacao,
    animais_ids: [...new Set(item.animais_ids)],
    pasto_id: item.pasto_id,
    pasto_nome: item.pasto_nome,
    syncStatus: 'pending',
    localDeleted: false,
  };
  await saveOfflineRecordAndEnqueue(
    localRecord(userId, lote),
    { userId, entity: ENTITY, operation: 'create', payload: { id, item: { ...lote, syncStatus: undefined, localDeleted: undefined } } },
  );
  if (lote.pasto_id && lote.animais_ids.length > 0) {
    await queueAnimalPastureUpdates(userId, lote.animais_ids, lote.pasto_id, lote.pasto_nome);
  }
  return lote;
};

const queueLocalUpdate = async (userId: string, id: string, updates: Partial<Lote>): Promise<Lote> => {
  const current = await getOfflineRecord<LoteLocal>(localRecordKey(userId, id));
  if (!current || current.userId !== userId || current.entity !== ENTITY || current.data.localDeleted) {
    throw new Error('Lote não encontrado');
  }
  const next: Lote = {
    ...current.data,
    ...updates,
    animais_ids: updates.animais_ids ? [...new Set(updates.animais_ids)] : current.data.animais_ids,
    id,
  };
  await validateLoteInput(userId, next);
  const local: LoteLocal = {
    ...next,
    animais_ids: next.animais_ids,
    id,
    syncStatus: 'pending',
    syncError: undefined,
    localDeleted: false,
  };
  await saveOfflineRecordAndEnqueue(
    localRecord(userId, local),
    { userId, entity: ENTITY, operation: 'update', payload: { id, updates } },
  );
  if ('pasto_id' in updates || 'pasto_nome' in updates) {
    await queueAnimalPastureUpdates(userId, local.animais_ids, local.pasto_id, local.pasto_nome);
  }
  return local;
};

const queueLocalDelete = async (userId: string, id: string): Promise<boolean> => {
  const current = await getOfflineRecord<LoteLocal>(localRecordKey(userId, id));
  if (!current || current.userId !== userId || current.entity !== ENTITY) throw new Error('Lote não encontrado');
  await saveOfflineRecordAndEnqueue(
    { ...current, data: { ...current.data, syncStatus: 'pending', syncError: undefined, localDeleted: true }, updatedAt: new Date().toISOString() },
    { userId, entity: ENTITY, operation: 'delete', payload: { id } },
  );
  return true;
};

const remoteCreateLote = async (userId: string, item: Omit<Lote, 'id'>, id: string): Promise<Lote> => {
  await validateLoteInput(userId, { ...item, id });
  const animalIds = await validAnimalIdsForSync(userId, item.animais_ids);
  const { data, error } = await supabase.from('lotes').insert({
    id,
    nome: item.nome,
    data_criacao: item.data_criacao,
    animais_ids: animalIds,
    pasto_id: item.pasto_id ?? null,
    pasto_nome: item.pasto_nome ?? null,
  }).select('*').single();
  let row = data as unknown as LoteDbRow | null;
  if (error) {
    row = await getLoteRow(id);
    if (!row) throw error;
  }
  try {
    await replaceMemberships(id, animalIds);
    if (item.pasto_id && animalIds.length > 0) await syncAnimalPasture(animalIds, item.pasto_id, item.pasto_nome);
  } catch (syncError) {
    await supabase.from('lotes').delete().eq('id', id);
    throw syncError;
  }
  return toLote(row!, animalIds);
};

const remoteUpdateLote = async (userId: string, id: string, updates: Partial<Lote>): Promise<Lote> => {
  const currentRow = await getLoteRow(id);
  if (!currentRow) throw new Error('Lote não encontrado');
  const currentMemberships = await getMemberships([id]);
  const current = withMemberships([currentRow], currentMemberships)[0];
  if (!current) throw new Error('Lote não encontrado');
  const next = { ...current, ...updates, animais_ids: updates.animais_ids ?? current.animais_ids, id };
  await validateLoteInput(userId, next);
  const nextAnimalIds = await validAnimalIdsForSync(userId, next.animais_ids);
  const nextPastoId = 'pasto_id' in updates ? updates.pasto_id : current.pasto_id;
  const nextPastoNome = 'pasto_nome' in updates ? updates.pasto_nome : current.pasto_nome;
  const patch: Record<string, unknown> = {};
  if (updates.nome !== undefined) patch.nome = updates.nome;
  if (updates.data_criacao !== undefined) patch.data_criacao = updates.data_criacao;
  if (updates.animais_ids !== undefined) patch.animais_ids = nextAnimalIds;
  if ('pasto_id' in updates) patch.pasto_id = updates.pasto_id ?? null;
  if ('pasto_nome' in updates) patch.pasto_nome = updates.pasto_nome ?? null;

  let row = currentRow;
  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase.from('lotes').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    row = data as unknown as LoteDbRow;
  }
  if (updates.animais_ids !== undefined) await replaceMemberships(id, nextAnimalIds);
  if ('pasto_id' in updates || 'pasto_nome' in updates) {
    await syncAnimalPasture(nextAnimalIds, nextPastoId, nextPastoNome);
  }
  return toLote(row, nextAnimalIds);
};

const remoteDeleteLote = async (id: string): Promise<void> => {
  const { error } = await supabase.from('lotes').delete().eq('id', id);
  if (error) throw error;
};

export const lotesService = {
  getAll: async (userId: string, filters?: LoteFilters): Promise<{ data: Lote[]; total: number; source: 'remote' | 'local'; capturedAt?: string }> => {
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalLotes(userId);
      const recent = sortRecent(local.data).slice(0, filters?.limit ?? local.data.length);
      return { data: recent, total: recent.length, source: 'local', capturedAt: local.capturedAt };
    }

    try {
      let query = supabase.from('lotes').select('*', { count: 'exact' }).order('data_criacao', { ascending: false });
      if (filters?.search) query = query.ilike('nome', `%${filters.search}%`);
      if (filters?.page !== undefined && filters.limit !== undefined) {
        const start = Math.max(0, (filters.page - 1) * filters.limit);
        query = query.range(start, start + filters.limit - 1);
      }
      const { data, count, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as LoteDbRow[];
      const items = withMemberships(rows, await getMemberships(rows.map((row) => row.id)));
      const isFirstPage = (filters?.page ?? 1) === 1 && !filters?.search;
      let pending: LoteLocal[] = [];
      let capturedAt: string | undefined;
      try {
        const cached = await cacheOnlineLotes(userId, items, isFirstPage);
        pending = cached.pending;
        capturedAt = cached.capturedAt;
      } catch {
        pending = [];
      }
      return { ...mergePendingLotes(items, count ?? 0, pending, filters), source: 'remote', capturedAt };
    } catch (error) {
      if (!isBrowserOnline() || isNetworkFailure(error)) {
        const local = await readLocalLotes(userId);
        const recent = sortRecent(local.data).slice(0, filters?.limit ?? local.data.length);
        return { data: recent, total: recent.length, source: 'local', capturedAt: local.capturedAt };
      }
      throw error;
    }
  },

  getById: async (userId: string, id: string): Promise<Lote | null> => {
    const local = await getOfflineRecord<LoteLocal>(localRecordKey(userId, id));
    if (!isBrowserOnline()) return local && !local.data.localDeleted ? local.data : null;
    try {
      const row = await getLoteRow(id);
      if (!row) return null;
      return withMemberships([row], await getMemberships([id]))[0] ?? null;
    } catch (error) {
      if ((!isBrowserOnline() || isNetworkFailure(error)) && local && !local.data.localDeleted) {
        return local.data;
      }
      throw error;
    }
  },

  create: async (userId: string, data: CreateLoteDTO): Promise<Lote> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    return queueLocalCreate(userId, data, `lote-${crypto.randomUUID()}`);
  },

  update: async (userId: string, id: string, updates: Partial<Lote>): Promise<Lote> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    return queueLocalUpdate(userId, id, updates);
  },

  moverPasto: async (userId: string, loteId: string, pastoId: string, pastoNome: string): Promise<Lote> => {
    const current = await lotesService.getById(userId, loteId);
    if (!current) throw new Error('Lote não encontrado.');
    if (current.pasto_id === pastoId) throw new Error('Selecione um pasto diferente do atual.');
    return lotesService.update(userId, loteId, { pasto_id: pastoId, pasto_nome: pastoNome });
  },

  delete: async (userId: string, id: string): Promise<boolean> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    return queueLocalDelete(userId, id);
  },
};

const setLocalSyncStatus = async (userId: string, loteId: string, status: LoteSyncStatus, error?: string, localDeleted?: boolean) => {
  const record = await getOfflineRecord<LoteLocal>(localRecordKey(userId, loteId));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
  await saveOfflineRecord({
    ...record,
    data: { ...record.data, syncStatus: status, syncError: error, localDeleted: localDeleted ?? record.data.localDeleted },
    updatedAt: new Date().toISOString(),
  });
};

const operationLoteId = (operation: OutboxOperation<LoteOutboxPayload>) => operation.payload.id;

const compactUnsyncedCreateDelete = async (userId: string) => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    const operations = (await offlineDb.outbox.toArray()) as Array<OutboxOperation<LoteOutboxPayload>>;
    const userOperations = operations.filter((operation) => operation.userId === userId && operation.entity === ENTITY);
    const ids = new Set(userOperations.map(operationLoteId));
    for (const loteId of ids) {
      const related = userOperations.filter((operation) => operationLoteId(operation) === loteId);
      const hasCreate = related.some((operation) => operation.operation === 'create');
      const hasDelete = related.some((operation) => operation.operation === 'delete');
      if (!hasCreate || !hasDelete || related.some((operation) => operation.status !== 'pending')) continue;
      await offlineDb.outbox.bulkDelete(related.map((operation) => operation.id));
      await offlineDb.localRecords.delete(localRecordKey(userId, loteId));
    }
  });
};

const isCurrentUser = async (userId: string) => (await getCurrentUserId()) === userId;
let activeLoteSync: { userId: string; promise: Promise<void> } | null = null;
let scheduledLoteRetry: { userId: string; timeoutId: ReturnType<typeof setTimeout> } | null = null;

const cancelScheduledRetry = (userId?: string) => {
  if (!scheduledLoteRetry || (userId && scheduledLoteRetry.userId !== userId)) return;
  clearTimeout(scheduledLoteRetry.timeoutId);
  scheduledLoteRetry = null;
};

const scheduleRetry = (userId: string, nextRetryAt: string) => {
  cancelScheduledRetry();
  const timeoutId = setTimeout(() => {
    scheduledLoteRetry = null;
    if (!isBrowserOnline()) return;
    void getCurrentUserId().then((currentUserId) => {
      if (currentUserId === userId) return syncLotes(userId);
      return undefined;
    }).catch(() => undefined);
  }, Math.max(0, new Date(nextRetryAt).getTime() - Date.now()));
  scheduledLoteRetry = { userId, timeoutId };
};

useConnectivityStore.subscribe((state) => {
  if (state.status === 'offline') cancelScheduledRetry();
});

const runLoteSync = async (userId: string): Promise<void> => {
  await compactUnsyncedCreateDelete(userId);
  const operations = await listOutboxOperations<LoteOutboxPayload>({ userId, entity: ENTITY });
  if (operations.length === 0) return;
  useConnectivityStore.getState().setSyncing();
  let retryAt: string | null = null;

  for (const operation of operations) {
    if (!(await isCurrentUser(userId))) return;
    if (operation.status === 'processing') await markOutboxOperationPending(operation.id);
    if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) {
      retryAt = operation.nextRetryAt;
      break;
    }
    try {
      await markOutboxOperationProcessing(operation.id);
      const payload = operation.payload;
      await setLocalSyncStatus(userId, payload.id, 'processing', undefined, operation.operation === 'delete');
      if (!(await isCurrentUser(userId))) return;
      let remote: Lote | null = null;
      if (operation.operation === 'create') {
        const createPayload = payload as LoteCreatePayload;
        remote = await remoteCreateLote(userId, createPayload.item, createPayload.id);
      } else if (operation.operation === 'update') {
        const updatePayload = payload as LoteUpdatePayload;
        remote = await remoteUpdateLote(userId, updatePayload.id, updatePayload.updates);
      } else {
        await remoteDeleteLote((payload as LoteDeletePayload).id);
      }
      if (!(await isCurrentUser(userId))) return;
      if (remote) {
        await saveOfflineRecord(localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }));
      } else {
        await deleteOfflineRecord(localRecordKey(userId, payload.id));
      }
      await deleteOutboxOperation(operation.id);
    } catch (error) {
      if (!(await isCurrentUser(userId))) return;
      const message = error instanceof Error ? error.message : 'Falha ao sincronizar lote';
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
  } else if (retryAt && isBrowserOnline()) {
    scheduleRetry(userId, retryAt);
  }
  useConnectivityStore.getState().resolveAfterSync();
};

export const syncLotes = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline()) return;
  if (requestedUserId && !(await isCurrentUser(userId))) return;
  if (activeLoteSync) {
    if (activeLoteSync.userId === userId) return activeLoteSync.promise;
    await activeLoteSync.promise;
  }
  let promise: Promise<void>;
  promise = syncAnimais(userId).catch(() => undefined).then(() => runLoteSync(userId)).finally(() => {
    if (activeLoteSync?.promise === promise) activeLoteSync = null;
  });
  activeLoteSync = { userId, promise };
  return promise;
};

export type { LoteSyncStatus };
