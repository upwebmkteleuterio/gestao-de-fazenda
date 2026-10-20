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
  saveOfflineRecordsAndEnqueue,
  saveOfflineSnapshot,
  type OutboxOperation,
} from '@/offline/database';
import { isNetworkFailure } from '@/offline/network';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { animaisService, syncAnimais } from './animaisService';
import { lotesService } from './lotesService';
import { Animal, Pesagem } from '@/types/database';
import { DomainValidationError, validatePesagemFields } from './domainValidation';

type PesagemDbRow = {
  id: string;
  animal_id: string;
  brinco_animal: string;
  tipo_animal: Pesagem['tipo_animal'] | null;
  lote_id: string | null;
  lote_nome: string | null;
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
const isTransportError = (error: unknown) => !isBrowserOnline() || isNetworkFailure(error);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());
const sanitizeSearchForPostgrest = (value: string) => value
  .trim()
  .replace(/[\\,().:"']/g, ' ')
  .replace(/[%_]/g, (character) => `\\${character}`)
  .replace(/\s+/g, ' ')
  .trim();

const toPesagem = (row: PesagemDbRow): Pesagem => ({
  id: row.id,
  animal_id: row.animal_id,
  brinco_animal: row.brinco_animal,
  tipo_animal: row.tipo_animal ?? undefined,
  lote_id: row.lote_id ?? undefined,
  lote_nome: row.lote_nome ?? undefined,
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
    lote_id: item.lote_id,
    lote_nome: item.lote_nome?.trim() || undefined,
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
  ...(item.lote_id ? { lote_id: item.lote_id, lote_nome: item.lote_nome ?? null } : {}),
  status_sincronizacao: false,
});

const toCreateItem = (item: LocalPesagem): PesagemInput => ({
  animal_id: item.animal_id,
  brinco_animal: item.brinco_animal,
  tipo_animal: item.tipo_animal,
  lote_id: item.lote_id,
  lote_nome: item.lote_nome,
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

const matchesPesagemFilters = (item: Pesagem, filters?: { search?: string; tipoAnimal?: string; startDate?: string; endDate?: string }) => {
  const search = filters?.search?.trim().toLocaleLowerCase();
  const matchesSearch = !search
    || item.brinco_animal.toLocaleLowerCase().includes(search)
    || item.lote_nome?.toLocaleLowerCase().includes(search);
  return Boolean(matchesSearch)
    && (!filters?.tipoAnimal || filters.tipoAnimal === 'all' || item.tipo_animal === filters.tipoAnimal)
    && (!filters?.startDate || item.data_pesagem >= filters.startDate)
    && (!filters?.endDate || item.data_pesagem <= filters.endDate);
};

const readLocalPage = async (userId: string, filters?: { search?: string; tipoAnimal?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
  const [records, snapshot] = await Promise.all([
    listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY }),
    getOfflineSnapshot<Pesagem[]>(SNAPSHOT_KEY(userId)),
  ]);
  const all = sortPesagens(records
    .filter((record) => !record.data.localDeleted && matchesPesagemFilters(record.data, filters))
    .map((record) => record.data));
  const limit = filters?.limit ?? PAGE_SIZE;
  const start = Math.max(0, ((filters?.page ?? 1) - 1) * limit);
  return { data: all.slice(start, start + limit), total: all.length, capturedAt: snapshot?.capturedAt };
};

const cacheOnlinePage = async (userId: string, items: Pesagem[]) => {
  const existing = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  const pending = new Map(existing.filter((record) => isPendingPesagem(record.data)).map((record) => [record.entityId, record.data]));
  await saveOfflineRecords(items.map((item) => localRecord(userId, pending.get(item.id) ?? { ...item, syncStatus: 'synced', localDeleted: false })));
  await saveOfflineSnapshot({ key: SNAPSHOT_KEY(userId), scope: `${ENTITY}:${userId}`, data: items, capturedAt: new Date().toISOString() });
};

const HISTORY_PAGE_SIZE = 1000;

const fetchHistory = async (): Promise<Pesagem[]> => {
  const all: Pesagem[] = [];
  for (let from = 0; ; from += HISTORY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('pesagens')
      .select('*')
      .order('data_pesagem', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + HISTORY_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data) throw new Error('Não foi possível carregar as pesagens do servidor. Tente novamente.');
    const rows = ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
    all.push(...rows);
    if (rows.length < HISTORY_PAGE_SIZE) break;
  }
  return all;
};

const fetchAllRemote = (): Promise<Pesagem[]> => fetchHistory();

const isPendingPesagem = (item: LocalPesagem): boolean => Boolean(item.localDeleted) || Boolean(item.syncStatus && item.syncStatus !== 'synced');

const getHistoryForCalc = async (userId: string): Promise<Pesagem[]> => {
  const records = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  const localActive = records.filter((record) => !record.data.localDeleted).map((record) => record.data);
  if (!isBrowserOnline()) return localActive;
  try {
    const remote = await fetchHistory();
    const localById = new Map(records.map((record) => [record.entityId, record.data]));
    const byId = new Map<string, Pesagem>();
    remote.forEach((item) => {
      const local = localById.get(item.id);
      if (local?.localDeleted) return;
      byId.set(item.id, local && isPendingPesagem(local) ? local : item);
    });
    localActive.forEach((item) => {
      if (!byId.has(item.id) && isPendingPesagem(item)) byId.set(item.id, item);
    });
    return [...byId.values()];
  } catch {
    return localActive;
  }
};

const cacheFullHistory = async (userId: string): Promise<void> => {
  if (!isBrowserOnline()) return;
  let remote: Pesagem[];
  try {
    remote = await fetchHistory();
  } catch {
    return;
  }
  const existing = await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY });
  const existingById = new Map(existing.map((record) => [record.entityId, record]));
  const remoteIds = new Set(remote.map((item) => item.id));
  await saveOfflineRecords(remote.map((item) => {
    const local = existingById.get(item.id);
    if (local && isPendingPesagem(local.data)) return local;
    return localRecord(userId, { ...item, syncStatus: 'synced', localDeleted: false });
  }));
  await deleteOfflineRecords(existing
    .filter((record) => !remoteIds.has(record.entityId) && !isPendingPesagem(record.data))
    .map((record) => record.key));
  await saveOfflineSnapshot({
    key: SNAPSHOT_KEY(userId),
    scope: `${ENTITY}:${userId}`,
    data: sortPesagens(remote).slice(0, PAGE_SIZE),
    capturedAt: new Date().toISOString(),
  });
};

type PesagemAnimalReference =
  | { status: 'found'; animal: Animal }
  | { status: 'missing' }
  | { status: 'unknown' };

const findAnimalForPesagem = async (animalId: string): Promise<PesagemAnimalReference> => {
  const userId = await getCurrentUserId();
  if (!userId) return { status: 'unknown' };
  const local = await listOfflineRecords<Animal>({ userId, entity: 'animal' });
  const localAnimal = local.find((record) => record.entityId === animalId && !record.data.localDeleted)?.data;
  if (localAnimal) return { status: 'found', animal: localAnimal };
  if (!isBrowserOnline()) return { status: 'unknown' };
  try {
    const { data, error } = await supabase.from('animais').select('*').eq('id', animalId).maybeSingle();
    if (error) throw error;
    return data ? { status: 'found', animal: data as unknown as Animal } : { status: 'missing' };
  } catch (error) {
    if (isTransportError(error)) return { status: 'unknown' };
    throw error;
  }
};

const ensurePesagemReference = async (
  item: PesagemInput,
  exceptId?: string,
  originalAnimalId?: string,
  originalDate?: string,
): Promise<void> => {
  const reference = await findAnimalForPesagem(item.animal_id);
  // Sem rede (ou sem sessão) não é possível conferir a referência agora: a sincronização
  // continua e a conferência fica com o servidor, em vez de marcar o registro como inválido.
  if (reference.status === 'missing') throw new DomainValidationError('O animal selecionado não corresponde ao brinco informado. Selecione o animal novamente.');
  if (reference.status === 'found' && reference.animal.brinco !== item.brinco_animal) throw new DomainValidationError('O animal selecionado não corresponde ao brinco informado. Selecione o animal novamente.');
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

const ensureGroupLote = async (userId: string, items: PesagemInput[]) => {
  const loteIds = new Set(items.map((item) => item.lote_id).filter((id): id is string => Boolean(id)));
  if (loteIds.size !== 1 || items.some((item) => !item.lote_id || !item.lote_nome)) {
    throw new DomainValidationError('Selecione um lote cadastrado para a pesagem em grupo.');
  }
  const loteId = [...loteIds][0];
  if (items.some((item) => item.lote_nome !== items[0].lote_nome)) {
    throw new DomainValidationError('O lote selecionado deve ser o mesmo em todas as linhas.');
  }
  const lote = await lotesService.getById(userId, loteId);
  if (!lote || lote.nome !== items[0].lote_nome) {
    throw new DomainValidationError('O lote selecionado não foi encontrado. Selecione um lote cadastrado.');
  }
  return lote;
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
  const all = await getHistoryForCalc(userId);
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
  await ensurePesagemReference(payload.item, payload.id);
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
  if (!current) {
    // A pesagem ainda não existe no servidor (ex.: criada/alterada offline e a criação
    // ainda não foi enviada). Envia como criação com o mesmo id para não travar a sincronização.
    return remoteCreate({ id: payload.id, item: payload.updates as PesagemInput });
  }
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
  const { data: stillThere, error: verifyError } = await supabase.from('pesagens').select('id').eq('id', id).maybeSingle();
  if (verifyError) throw verifyError;
  if (stillThere) throw new Error('A exclusão da pesagem não foi confirmada pelo servidor. Tente novamente.');
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
let resyncRequested = false;
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
  if (activeSync) {
    resyncRequested = true;
    return activeSync.promise;
  }
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
        if (!retryAt || operation.nextRetryAt < retryAt) retryAt = operation.nextRetryAt;
        continue;
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
        const failedRetryAt = failed?.nextRetryAt ?? null;
        if (failedRetryAt && (!retryAt || failedRetryAt < retryAt)) retryAt = failedRetryAt;
        await setLocalStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
        if (!isTransportError(error)) useConnectivityStore.getState().setError(message);
        continue;
      }
    }
    if (retryAt) scheduleRetry(userId, retryAt);
    else {
      await cacheFullHistory(userId).catch(() => undefined);
      await syncAnimais(userId);
    }
    useConnectivityStore.getState().resolveAfterSync();
  })().finally(() => {
    if (activeSync?.promise === promise) activeSync = null;
    if (resyncRequested) {
      resyncRequested = false;
      void syncPesagens(userId).catch(() => undefined);
    }
  });
  activeSync = { userId, promise };
  return promise;
};

export const pesagensService = {
  getAll: async (filters?: { search?: string; tipoAnimal?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<PesagensQuery> => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalPage(userId, filters);
      const data = await annotatePesagens(local.data);
      return { data, total: local.total, source: 'local', capturedAt: local.capturedAt };
    }
    try {
      let query = supabase.from('pesagens').select('*', { count: 'exact' });
      const search = filters?.search ? sanitizeSearchForPostgrest(filters.search) : '';
      if (search) query = query.or(`brinco_animal.ilike.%${search}%,lote_nome.ilike.%${search}%`);
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
      const localPending = (await listOfflineRecords<LocalPesagem>({ userId, entity: ENTITY }))
        .map((record) => record.data)
        .filter((item) => item.syncStatus && item.syncStatus !== 'synced' && matchesPesagemFilters(item, filters));
      const merged = new Map(itemsWithConflicts.map((item) => [item.id, item]));
      localPending.forEach((item) => { if (item.localDeleted) merged.delete(item.id); else if (item.data_pesagem) merged.set(item.id, item); });
      const mergedData = await annotatePesagens(sortPesagens([...merged.values()]));
      return { data: mergedData, total: Math.max(0, (count ?? itemsWithConflicts.length) + localPending.filter((item) => !itemsWithConflicts.some((remote) => remote.id === item.id) && !item.localDeleted).length), source: 'remote' };
    } catch (error) {
      if (!isBrowserOnline() || isNetworkFailure(error)) {
        const local = await readLocalPage(userId, filters);
        const data = await annotatePesagens(local.data);
        return { data, total: local.total, source: 'local', capturedAt: local.capturedAt };
      }
      throw error;
    }
  },

  prefetchFirstPage: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || (await getCurrentUserId()) !== userId) return;
    await cacheFullHistory(userId);
  },

  getRecent: async (): Promise<Pesagem[]> => {
    const { data, error } = await supabase.from('pesagens').select('id, animal_id, brinco_animal, tipo_animal, lote_id, lote_nome, peso_kg, data_pesagem, peso_anterior, data_pesagem_anterior, ganho_peso_kg, gmd_calculado, dias_intervalo, observacoes, status_sincronizacao, created_at').order('data_pesagem', { ascending: false }).order('created_at', { ascending: false }).range(0, 4);
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
    const history = await getHistoryForCalc(userId);
    const calc = calcularGMD(valid.animal_id, valid.peso_kg, valid.data_pesagem, history);
    const id = `pes-${crypto.randomUUID()}`;
    const local: LocalPesagem = { ...valid, id, createdAt: new Date().toISOString(), status_sincronizacao: false, peso_anterior: calc.pesoAnterior, data_pesagem_anterior: calc.dataAnterior, ganho_peso_kg: calc.ganhoPeso, gmd_calculado: calc.gmd, dias_intervalo: calc.diasIntervalo, syncStatus: 'pending', localDeleted: false };
    await saveOfflineRecordAndEnqueue(localRecord(userId, local), { userId, entity: ENTITY, operation: 'create', payload: { id, item: toCreateItem(local) } });
    await recalculateLocalChain(userId, [valid.animal_id]);
    return local;
  },

  createGroup: async (items: PesagemInput[]): Promise<LocalPesagem[]> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    if (items.length === 0) throw new DomainValidationError('Informe ao menos um animal para a pesagem em grupo.');
    const validItems = items.map((item) => validateInput(item));
    await ensureGroupLote(userId, validItems);
    const keys = new Set<string>();
    validItems.forEach((item) => {
      const key = `${item.animal_id}:${item.data_pesagem}`;
      if (keys.has(key)) throw new DomainValidationError('Há animais repetidos na mesma data na pesagem em grupo.');
      keys.add(key);
    });
    for (const item of validItems) await ensurePesagemReference(item);

    const working = [...(await getHistoryForCalc(userId))];
    const locals: LocalPesagem[] = [];
    const records = [] as ReturnType<typeof localRecord>[];
    const operations: Array<{ userId: string; entity: string; operation: 'create'; payload: CreatePayload }> = [];
    validItems.forEach((item) => {
      const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, working);
      const local: LocalPesagem = {
        ...item,
        id: `pes-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        status_sincronizacao: false,
        peso_anterior: calc.pesoAnterior,
        data_pesagem_anterior: calc.dataAnterior,
        ganho_peso_kg: calc.ganhoPeso,
        gmd_calculado: calc.gmd,
        dias_intervalo: calc.diasIntervalo,
        syncStatus: 'pending',
        localDeleted: false,
      };
      locals.push(local);
      records.push(localRecord(userId, local));
      operations.push({ userId, entity: ENTITY, operation: 'create', payload: { id: local.id, item: toCreateItem(local) } });
      working.push(local);
    });
    await saveOfflineRecordsAndEnqueue(records, operations);
    await recalculateLocalChain(userId, validItems.map((item) => item.animal_id));
    return locals;
  },

  update: async (id: string, updates: Partial<Pesagem>): Promise<LocalPesagem> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const current = await readMutationRecord(userId, id);
    if (!current || current.data.localDeleted) throw new Error('Pesagem não encontrada no cache local.');
    const valid = validateInput({ ...current.data, ...updates });
    await ensurePesagemReference(valid, id, current.data.animal_id, current.data.data_pesagem);
    const history = (await getHistoryForCalc(userId)).filter((item) => item.id !== id);
    const calc = calcularGMD(valid.animal_id, valid.peso_kg, valid.data_pesagem, history);
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
