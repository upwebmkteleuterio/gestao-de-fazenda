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
import { animaisService, syncAnimais } from './animaisService';
import { Animal, Pesagem } from '@/types/database';
import { DomainValidationError, validatePesagemFields } from './domainValidation';

type PesagemDbRow = {
  id: string;
  animal_id: string;
  brinco_animal: string;
  tipo_animal: Pesagem['tipo_animal'] | null;
  peso_kg: number | string;
  data_pesagem: string;
  peso_anterior: number | string | null;
  data_pesagem_anterior: string | null;
  ganho_peso_kg: number | string | null;
  gmd_calculado: number | string | null;
  dias_intervalo: number | null;
  observacoes: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type LocalPesagem = Pesagem & {
  syncStatus?: 'synced' | 'pending' | 'processing' | 'error';
  syncError?: string;
  localDeleted?: boolean;
};
type PesagemInput = Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>;
type CreatePayload = { id: string; item: PesagemInput };
type UpdatePayload = { id: string; updates: Partial<Pesagem> };
type DeletePayload = { id: string };
type PesagemOutboxPayload = CreatePayload | UpdatePayload | DeletePayload;
type PesagensQuery = { data: Pesagem[]; total: number; source: 'remote' | 'local'; capturedAt?: string };

const ENTITY = 'pesagem';
const PAGE_SIZE = 10;
const SNAPSHOT_KEY = (userId: string) => `${ENTITY}:first-page:${userId}`;
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());

const toPesagem = (row: PesagemDbRow): Pesagem => ({
  id: row.id,
  animal_id: row.animal_id,
  brinco_animal: row.brinco_animal,
  tipo_animal: row.tipo_animal ?? undefined,
  peso_kg: Number(row.peso_kg),
  data_pesagem: row.data_pesagem,
  peso_anterior: row.peso_anterior === null ? undefined : Number(row.peso_anterior),
  data_pesagem_anterior: row.data_pesagem_anterior ?? undefined,
  ganho_peso_kg: row.ganho_peso_kg === null ? undefined : Number(row.ganho_peso_kg),
  gmd_calculado: row.gmd_calculado === null ? undefined : Number(row.gmd_calculado),
  dias_intervalo: row.dias_intervalo === null ? undefined : Number(row.dias_intervalo),
  observacoes: row.observacoes ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const validateInput = (item: Partial<Pesagem>): PesagemInput => {
  validatePesagemFields(item);
  return {
    animal_id: item.animal_id as string,
    brinco_animal: item.brinco_animal!.trim(),
    tipo_animal: item.tipo_animal,
    peso_kg: item.peso_kg as number,
    data_pesagem: item.data_pesagem as string,
    observacoes: item.observacoes?.trim() || undefined,
  };
};

const sortPesagens = (items: Pesagem[]) => [...items].sort((a, b) => {
  const dateDiff = new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime();
  return dateDiff !== 0 ? dateDiff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});

const calcularGMD = (animalId: string, novoPeso: number, dataNova: string, pesagensExistentes: Pesagem[]) => {
  const sameDay = pesagensExistentes.some((item) => item.animal_id === animalId && item.data_pesagem === dataNova);
  const anterior = sortPesagens(
    pesagensExistentes.filter((item) => item.animal_id === animalId && item.data_pesagem < dataNova),
  )[0];
  if (sameDay) return { gmd: undefined, diasIntervalo: undefined, pesoAnterior: undefined, dataAnterior: undefined, ganhoPeso: undefined };
  if (!anterior) return { gmd: undefined, diasIntervalo: undefined, pesoAnterior: undefined, dataAnterior: undefined, ganhoPeso: undefined };
  const dias = Math.ceil((new Date(dataNova).getTime() - new Date(anterior.data_pesagem).getTime()) / 86400000);
  if (dias <= 0) return { gmd: undefined, diasIntervalo: undefined, pesoAnterior: anterior.peso_kg, dataAnterior: anterior.data_pesagem, ganhoPeso: undefined };
  const ganho = Number((novoPeso - anterior.peso_kg).toFixed(2));
  return { gmd: Number((ganho / dias).toFixed(2)), diasIntervalo: dias, pesoAnterior: anterior.peso_kg, dataAnterior: anterior.data_pesagem, ganhoPeso: ganho };
};

const buildCreatePayload = (item: PesagemInput, id: string, calc: ReturnType<typeof calcularGMD>) => ({
  id,
  animal_id: item.animal_id,
  brinco_animal: item.brinco_animal,
  tipo_animal: item.tipo_animal ?? null,
  peso_kg: item.peso_kg,
  data_pesagem: item.data_pesagem,
  peso_anterior: calc.pesoAnterior ?? null,
  data_pesagem_anterior: calc.dataAnterior ?? null,
  ganho_peso_kg: calc.ganhoPeso ?? null,
  gmd_calculado: calc.gmd ?? null,
  dias_intervalo: calc.diasIntervalo ?? null,
  observacoes: item.observacoes ?? null,
  status_sincronizacao: false,
});

const toCreateItem = (item: LocalPesagem): PesagemInput => ({
  animal_id: item.animal_id,
  brinco_animal: item.brinco_animal,
  tipo_animal: item.tipo_animal,
  peso_kg: item.peso_kg,
  data_pesagem: item.data_pesagem,
  observacoes: item.observacoes,
});

const toUpdatePayload = (updates: Partial<Pesagem>): Partial<Pesagem> => {
  const { id: _id, createdAt: _createdAt, status_sincronizacao: _status, syncStatus: _sync, syncError: _error, localDeleted: _deleted, ...payload } = updates as Partial<LocalPesagem>;
  return payload;
};

const localRecord = (userId: string, item: LocalPesagem) => ({
  key: localRecordKey(userId, item.id),
  userId,
  entity: ENTITY,
  entityId: item.id,
  data: item,
  updatedAt: new Date().toISOString(),
});

const readLocalPage = async (userId: string) => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY }),
    getOfflineSnapshot<Pesagem[]>(SNAPSHOT_KEY(userId)),
  ]);
  const data = sortPesagens(records.filter((record) => !record.data.localDeleted).map((record) => record.data)).slice(0, PAGE_SIZE);
  return { data, capturedAt: snapshot?.capturedAt };
};

const cacheOnlinePage = async (userId: string, items: Pesagem[]) => {
  const existing = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  const pending = new Map(existing.filter((record) => record.data.syncStatus && record.data.syncStatus !== 'synced').map((record) => [record.entityId, record.data]));
  await saveOfflineRecords(items.map((item) => localRecord(userId, pending.get(item.id) ?? { ...item, syncStatus: 'synced', localDeleted: false })));
  const ids = new Set(items.map((item) => item.id));
  await deleteOfflineRecords(existing.filter((record) => !ids.has(record.entityId) && !pending.has(record.entityId)).map((record) => record.key));
  await saveOfflineSnapshot({ key: SNAPSHOT_KEY(userId), scope: `${ENTITY}:${userId}`, data: items, capturedAt: new Date().toISOString() });
};

const fetchAllRemote = async (): Promise<Pesagem[]> => {
  const { data, error } = await supabase.from('pesagens').select('*');
  if (error) throw error;
  return ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
};

const findAnimalForPesagem = async (animalId: string): Promise<Animal | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const local = await listOfflineRecords<Animal>({ userId, entity: 'animal' });
  const localAnimal = local.find((record) => record.entityId === animalId && !record.data.localDeleted)?.data;
  if (localAnimal) return localAnimal;
  if (!isBrowserOnline()) return null;
  const { data, error } = await supabase.from('animais').select('*').eq('id', animalId).maybeSingle();
  if (error) throw error;
  return data as unknown as Animal | null;
};

const ensurePesagemReference = async (
  item: PesagemInput,
  exceptId?: string,
  originalAnimalId?: string,
  originalDate?: string,
): Promise<void> => {
  const animal = await findAnimalForPesagem(item.animal_id);
  if (!animal || animal.brinco !== item.brinco_animal) throw new DomainValidationError('O animal selecionado não corresponde ao brinco informado. Selecione o animal novamente.');
  const identityChanged = !exceptId || item.animal_id !== originalAnimalId || item.data_pesagem !== originalDate;
  if (!identityChanged) return;
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
  const existing = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  if (existing.some((record) => !record.data.localDeleted && record.data.id !== exceptId && record.data.animal_id === item.animal_id && record.data.data_pesagem === item.data_pesagem)) throw new DomainValidationError('Já existe uma pesagem deste animal nesta data. Confira o histórico para evitar duplicidade.');
  if (isBrowserOnline()) {
    const { data, error } = await supabase.from('pesagens').select('id').eq('animal_id', item.animal_id).eq('data_pesagem', item.data_pesagem).limit(2);
    if (error) throw error;
    if (((data ?? []) as Array<{ id: string }>).some((row) => row.id !== exceptId)) throw new DomainValidationError('Já existe uma pesagem deste animal nesta data. Confira o histórico para evitar duplicidade.');
  }
};

const annotatePesagens = async (items: Pesagem[]): Promise<Pesagem[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return items;
  let activeBrincos: string[] = [];
  if (isBrowserOnline()) {
    const { data, error } = await supabase.from('animais').select('id, brinco').eq('status', 'ativo');
    if (error) throw error;
    activeBrincos = ((data ?? []) as Array<{ id: string; brinco: string }>).map((row) => row.brinco);
  } else {
    const records = await listOfflineRecords<Animal>({ userId, entity: 'animal' });
    activeBrincos = records.filter((record) => !record.data.localDeleted && record.data.status === 'ativo').map((record) => record.data.brinco);
  }
  const counts = new Map<string, number>();
  activeBrincos.forEach((brinco) => {
    const key = brinco.trim().toLocaleLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return items.map((item) => ({
    ...item,
    brinco_duplicado: (counts.get(item.brinco_animal.trim().toLocaleLowerCase()) ?? 0) > 1,
  }));
};

const recalculateLocalChain = async (userId: string, animalIds: string[]) => {
  const records = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  const activeRecords = records.filter((record) => !record.data.localDeleted);
  const all = activeRecords.map((record) => record.data);
  for (const animalId of [...new Set(animalIds)]) {
    const chain = sortPesagens(all.filter((item) => item.animal_id === animalId));
    for (const item of chain) {
      const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, all.filter((other) => other.id !== item.id));
      const record = activeRecords.find((candidate) => candidate.data.id === item.id);
      if (!record) continue;
      const changed = record.data.peso_anterior !== calc.pesoAnterior
        || record.data.data_pesagem_anterior !== calc.dataAnterior
        || record.data.ganho_peso_kg !== calc.ganhoPeso
        || record.data.gmd_calculado !== calc.gmd
        || record.data.dias_intervalo !== calc.diasIntervalo;
      if (!changed) continue;
      const updated = {
        ...record,
        data: {
          ...record.data,
          peso_anterior: calc.pesoAnterior,
          data_pesagem_anterior: calc.dataAnterior,
          ganho_peso_kg: calc.ganhoPeso,
          gmd_calculado: calc.gmd,
          dias_intervalo: calc.diasIntervalo,
        },
        updatedAt: new Date().toISOString(),
      };
      await saveOfflineRecord(updated);
      const index = all.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) all[index] = updated.data;
    }
  }
};

const syncRemoteAnimalWeight = async (animalIds: string[], pesagens: Pesagem[]) => {
  for (const animalId of [...new Set(animalIds)]) {
    const latest = sortPesagens(pesagens.filter((item) => item.animal_id === animalId))[0];
    await animaisService.updatePesoAtual(animalId, latest?.peso_kg ?? null, latest?.data_pesagem ?? null);
  }
};

const recalculateRemoteChain = async (animalIds: string[]): Promise<Pesagem[]> => {
  const all = await fetchAllRemote();
  for (const animalId of [...new Set(animalIds)]) {
    const chain = sortPesagens(all.filter((item) => item.animal_id === animalId)).reverse();
    for (const item of chain) {
      const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, all.filter((other) => other.id !== item.id));
      const patch = { peso_anterior: calc.pesoAnterior ?? null, data_pesagem_anterior: calc.dataAnterior ?? null, ganho_peso_kg: calc.ganhoPeso ?? null, gmd_calculado: calc.gmd ?? null, dias_intervalo: calc.diasIntervalo ?? null };
      if (item.peso_anterior !== calc.pesoAnterior || item.data_pesagem_anterior !== calc.dataAnterior || item.ganho_peso_kg !== calc.ganhoPeso || item.gmd_calculado !== calc.gmd || item.dias_intervalo !== calc.diasIntervalo) {
        const { error } = await supabase.from('pesagens').update(patch).eq('id', item.id);
        if (error) throw error;
      }
    }
  }
  return fetchAllRemote();
};

const remoteCreate = async (payload: CreatePayload): Promise<Pesagem> => {
  validateInput(payload.item);
  await ensurePesagemReference(payload.item);
  const existing = await fetchAllRemote();
  const calc = calcularGMD(payload.item.animal_id, payload.item.peso_kg, payload.item.data_pesagem, existing);
  const { data, error } = await supabase.from('pesagens').insert(buildCreatePayload(payload.item, payload.id, calc)).select('*').single();
  if (error) {
    const found = (await fetchAllRemote()).find((item) => item.id === payload.id);
    if (!found) throw error;
    const all = await recalculateRemoteChain([found.animal_id]);
    await syncRemoteAnimalWeight([found.animal_id], all);
    return all.find((item) => item.id === payload.id) ?? found;
  }
  const all = await recalculateRemoteChain([payload.item.animal_id]);
  await syncRemoteAnimalWeight([payload.item.animal_id], all);
  return all.find((item) => item.id === payload.id) ?? toPesagem(data as unknown as PesagemDbRow);
};

const remoteUpdate = async (payload: UpdatePayload): Promise<Pesagem> => {
  const before = await fetchAllRemote();
  const current = before.find((item) => item.id === payload.id);
  if (!current) throw new Error('Pesagem não encontrada.');
  const next = validateInput({ ...current, ...payload.updates });
  await ensurePesagemReference(next, payload.id, current.animal_id, current.data_pesagem);
  const calc = calcularGMD(next.animal_id, next.peso_kg, next.data_pesagem, before.filter((item) => item.id !== payload.id));
  const updatePayload = buildCreatePayload(next, payload.id, calc);
  const { id: _id, ...patch } = updatePayload;
  const { data, error } = await supabase.from('pesagens').update(patch).eq('id', payload.id).select('*').single();
  if (error) throw error;
  const all = await recalculateRemoteChain([current.animal_id, next.animal_id]);
  await syncRemoteAnimalWeight([current.animal_id, next.animal_id], all);
  return all.find((item) => item.id === payload.id) ?? toPesagem(data as unknown as PesagemDbRow);
};

const remoteDelete = async (id: string): Promise<void> => {
  const before = await fetchAllRemote();
  const current = before.find((item) => item.id === id);
  const { error } = await supabase.from('pesagens').delete().eq('id', id);
  if (error) throw error;
  if (current) {
    const all = await recalculateRemoteChain([current.animal_id]);
    await syncRemoteAnimalWeight([current.animal_id], all);
  }
};

const getOperationId = (operation: OutboxOperation<PesagemOutboxPayload>) => operation.payload.id;
const compactCreateDelete = async (userId: string) => {
  await offlineDb.transaction('rw', offlineDb.localRecords, offlineDb.outbox, async () => {
    const operations = await offlineDb.outbox.toArray() as Array<OutboxOperation<PesagemOutboxPayload>>;
    const scoped = operations.filter((operation) => operation.userId === userId && operation.entity === ENTITY);
    for (const id of new Set(scoped.map(getOperationId))) {
      const related = scoped.filter((operation) => getOperationId(operation) === id);
      if (!related.some((operation) => operation.operation === 'create') || !related.some((operation) => operation.operation === 'delete')) continue;
      if (related.some((operation) => operation.status !== 'pending')) continue;
      await offlineDb.outbox.bulkDelete(related.map((operation) => operation.id));
      await offlineDb.localRecords.delete(localRecordKey(userId, id));
    }
  });
};

let activeSync: { userId: string; promise: Promise<void> } | null = null;
let retryTimer: { userId: string; timeoutId: ReturnType<typeof setTimeout> } | null = null;
const cancelRetry = () => { if (retryTimer) { clearTimeout(retryTimer.timeoutId); retryTimer = null; } };
const scheduleRetry = (userId: string, nextRetryAt: string) => {
  cancelRetry();
  const timeoutId = setTimeout(() => { retryTimer = null; if (isBrowserOnline()) void syncPesagens(userId).catch(() => undefined); }, Math.max(0, new Date(nextRetryAt).getTime() - Date.now()));
  retryTimer = { userId, timeoutId };
};
useConnectivityStore.subscribe((state) => { if (state.status === 'offline') cancelRetry(); });

const setLocalStatus = async (userId: string, id: string, status: LocalPesagem['syncStatus'], error?: string, deleted?: boolean) => {
  const record = await getOfflineRecord<LocalPesagem>(localRecordKey(userId, id));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
  await saveOfflineRecord({ ...record, data: { ...record.data, syncStatus: status, syncError: error, localDeleted: deleted ?? record.data.localDeleted }, updatedAt: new Date().toISOString() });
};

const readMutationRecord = async (userId: string, id: string) => {
  const local = await getOfflineRecord<LocalPesagem>(localRecordKey(userId, id));
  if (local) return local;
  if (!isBrowserOnline()) return null;
  const remote = (await fetchAllRemote()).find((item) => item.id === id);
  return remote ? localRecord(userId, { ...remote, syncStatus: 'synced', localDeleted: false }) : null;
};

export const syncPesagens = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline() || (await getCurrentUserId()) !== userId) return;
  if (activeSync) return activeSync.promise;
  let promise: Promise<void>;
  promise = (async () => {
    await compactCreateDelete(userId);
    const operations = await listOutboxOperations<PesagemOutboxPayload>({ userId, entity: ENTITY });
    if (operations.length === 0) return;
    useConnectivityStore.getState().setSyncing();
    let retryAt: string | null = null;
    for (const operation of operations) {
      if ((await getCurrentUserId()) !== userId) return;
      if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) {
        retryAt = operation.nextRetryAt;
        break;
      }
      try {
        await markOutboxOperationProcessing(operation.id);
        await setLocalStatus(userId, operation.payload.id, 'processing', undefined, operation.operation === 'delete');
        if (operation.operation === 'create') await remoteCreate(operation.payload as CreatePayload);
        else if (operation.operation === 'update') await remoteUpdate(operation.payload as UpdatePayload);
        else await remoteDelete((operation.payload as DeletePayload).id);
        await deleteOfflineRecord(localRecordKey(userId, operation.payload.id));
        await deleteOutboxOperation(operation.id);
      } catch (error) {
        console.error('[SYNC PESAGENS ERROR]', error);
        const message = error instanceof Error ? error.message : 'Falha ao sincronizar pesagem';
        const failed = await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
        retryAt = failed?.nextRetryAt ?? null;
        await setLocalStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
        useConnectivityStore.getState().setError(message);
        break;
      }
    }
    if (retryAt) scheduleRetry(userId, retryAt);
    else {
      await syncAnimais(userId);
      useConnectivityStore.getState().setOnline();
    }
  })().finally(() => { if (activeSync?.promise === promise) activeSync = null; });
  activeSync = { userId, promise };
  return promise;
};

export const pesagensService = {
  getAll: async (filters?: { search?: string; tipoAnimal?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<PesagensQuery> => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalPage(userId);
      const data = await annotatePesagens(local.data);
      return { data, total: data.length, source: 'local', capturedAt: local.capturedAt };
    }
    try {
      let query = supabase.from('pesagens').select('*', { count: 'exact' });
      if (filters?.search) query = query.ilike('brinco_animal', `%${filters.search}%`);
      if (filters?.tipoAnimal && filters.tipoAnimal !== 'all') query = query.eq('tipo_animal', filters.tipoAnimal);
      if (filters?.startDate) query = query.gte('data_pesagem', filters.startDate);
      if (filters?.endDate) query = query.lte('data_pesagem', filters.endDate);
      query = query.order('data_pesagem', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false });
      if (filters?.page !== undefined && filters.limit !== undefined) query = query.range(Math.max(0, (filters.page - 1) * filters.limit), filters.page * filters.limit - 1);
      const { data, count, error } = await query;
      if (error) throw error;
      const items = ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
      const itemsWithConflicts = await annotatePesagens(items);
      const isFirstPage = !filters?.search && (!filters?.tipoAnimal || filters.tipoAnimal === 'all') && !filters?.startDate && !filters?.endDate && filters?.page === 1 && filters.limit === PAGE_SIZE;
      if (isFirstPage) await cacheOnlinePage(userId, itemsWithConflicts);
      const localPending = (await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY })).map((record) => record.data).filter((item) => item.syncStatus && item.syncStatus !== 'synced');
      const merged = new Map(itemsWithConflicts.map((item) => [item.id, item]));
      localPending.forEach((item) => { if (item.localDeleted) merged.delete(item.id); else if (item.data_pesagem) merged.set(item.id, item); });
      const mergedData = await annotatePesagens(sortPesagens([...merged.values()]));
      return { data: mergedData, total: Math.max(0, (count ?? itemsWithConflicts.length) + localPending.filter((item) => !itemsWithConflicts.some((remote) => remote.id === item.id) && !item.localDeleted).length), source: 'remote' };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!isBrowserOnline() || /network|fetch|offline|load failed|failed to fetch/.test(message)) {
        const local = await readLocalPage(userId);
        const data = await annotatePesagens(local.data);
        return { data, total: data.length, source: 'local', capturedAt: local.capturedAt };
      }
      throw error;
    }
  },

  prefetchFirstPage: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || (await getCurrentUserId()) !== userId) return;
    const { data, error } = await supabase.from('pesagens').select('*').order('data_pesagem', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, PAGE_SIZE - 1);
    if (error) throw error;
    const items = await annotatePesagens(((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem));
    await cacheOnlinePage(userId, items);
  },

  getRecent: async (): Promise<Pesagem[]> => {
    const { data, error } = await supabase.from('pesagens').select('id, animal_id, brinco_animal, tipo_animal, peso_kg, data_pesagem, peso_anterior, data_pesagem_anterior, ganho_peso_kg, gmd_calculado, dias_intervalo, observacoes, status_sincronizacao, created_at').order('data_pesagem', { ascending: false }).order('created_at', { ascending: false }).range(0, 4);
    if (error) throw error;
    return ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
  },

  getById: async (id: string): Promise<Pesagem | null> => {
    const list = enrichPesagensComComparativo(await fetchAllRemote());
    return list.find((item) => item.id === id) ?? null;
  },

  create: async (item: PesagemInput): Promise<LocalPesagem> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const valid = validateInput(item);
    await ensurePesagemReference(valid);
    const existing = (await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY })).map((record) => record.data).filter((record) => !record.localDeleted);
    const calc = calcularGMD(valid.animal_id, valid.peso_kg, valid.data_pesagem, existing);
    const id = `pes-${crypto.randomUUID()}`;
    const local: LocalPesagem = { ...valid, id, createdAt: new Date().toISOString(), status_sincronizacao: false, peso_anterior: calc.pesoAnterior, data_pesagem_anterior: calc.dataAnterior, ganho_peso_kg: calc.ganhoPeso, gmd_calculado: calc.gmd, dias_intervalo: calc.diasIntervalo, syncStatus: 'pending', localDeleted: false };
    await saveOfflineRecordAndEnqueue(localRecord(userId, local), { userId, entity: ENTITY, operation: 'create', payload: { id, item: toCreateItem(local) } });
    await recalculateLocalChain(userId, [valid.animal_id]);
    return local;
  },

  createGroup: async (items: PesagemInput[]): Promise<LocalPesagem[]> => {
    const results: LocalPesagem[] = [];
    for (const item of items) results.push(await pesagensService.create(item));
    return results;
  },

  update: async (id: string, updates: Partial<Pesagem>): Promise<LocalPesagem> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const current = await readMutationRecord(userId, id);
    if (!current || current.data.localDeleted) throw new Error('Pesagem não encontrada no cache local.');
    const valid = validateInput({ ...current.data, ...updates });
    await ensurePesagemReference(valid, id, current.data.animal_id, current.data.data_pesagem);
    const allLocal = (await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY })).map((record) => record.data).filter((record) => !record.localDeleted && record.id !== id);
    const calc = calcularGMD(valid.animal_id, valid.peso_kg, valid.data_pesagem, allLocal);
    const local: LocalPesagem = { ...current.data, ...valid, peso_anterior: calc.pesoAnterior, data_pesagem_anterior: calc.dataAnterior, ganho_peso_kg: calc.ganhoPeso, gmd_calculado: calc.gmd, dias_intervalo: calc.diasIntervalo, syncStatus: 'pending', syncError: undefined, localDeleted: false };
    await saveOfflineRecordAndEnqueue({ ...current, data: local, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'update', payload: { id, updates: toUpdatePayload(valid) } });
    await recalculateLocalChain(userId, [current.data.animal_id, valid.animal_id]);
    return local;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const current = await readMutationRecord(userId, id);
    if (!current) throw new Error('Pesagem não encontrada no cache local.');
    const local: LocalPesagem = { ...current.data, syncStatus: 'pending', syncError: undefined, localDeleted: true };
    await saveOfflineRecordAndEnqueue({ ...current, data: local, updatedAt: new Date().toISOString() }, { userId, entity: ENTITY, operation: 'delete', payload: { id } });
    await recalculateLocalChain(userId, [current.data.animal_id]);
    return true;
  },
};

export const usePesagemSnapshotKey = (userId: string) => SNAPSHOT_KEY(userId);
export type { LocalPesagem, PesagemOutboxPayload, PesagensQuery };

const fetchPesagens = fetchAllRemote;
const enrichPesagensComComparativo = (list: Pesagem[]): Pesagem[] => list.map((item) => {
  const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, list.filter((other) => other.id !== item.id));
  return {
    ...item,
    peso_anterior: item.peso_anterior ?? calc.pesoAnterior,
    data_pesagem_anterior: item.data_pesagem_anterior ?? calc.dataAnterior,
    ganho_peso_kg: item.ganho_peso_kg ?? calc.ganhoPeso,
    gmd_calculado: item.gmd_calculado ?? calc.gmd,
    dias_intervalo: item.dias_intervalo ?? calc.diasIntervalo,
  };
});
export { calcularGMD, enrichPesagensComComparativo, fetchPesagens, syncRemoteAnimalWeight };
