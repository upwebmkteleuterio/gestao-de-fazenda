import { supabase } from '@/integrations/supabase/client';
import {
  deleteOfflineRecord,
  deleteOfflineRecords,
  deleteOutboxOperation,
  enqueueOutboxOperation,
  getOfflineRecord,
  getOfflineSnapshot,
  listOfflineRecords,
  listOutboxOperations,
  markOutboxOperationFailed,
  markOutboxOperationProcessing,
  saveOfflineRecord,
  saveOfflineRecords,
  saveOfflineSnapshot,
} from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { Animal, AnimalSyncStatus, RegistroToqueAno } from '@/types/database';

type AnimalDbRow = {
  id: string;
  brinco: string;
  tipo_animal: Animal['tipo_animal'];
  sexo: Animal['sexo'];
  raca: string | null;
  cor: string | null;
  data_nascimento: string;
  mae_id: string | null;
  pai_id: string | null;
  cdc: string | null;
  cdn: string | null;
  status: Animal['status'];
  motivo_descarte: string | null;
  data_descarte: string | null;
  qtd_descartes_brinco: number | null;
  categoria: Animal['categoria'];
  pasto_id: string | null;
  pasto_nome: string | null;
  status_reprodutivo: string | null;
  touro_cobertura: string | null;
  tipo_cobertura: Animal['tipo_cobertura'] | null;
  filhos_ids: string[] | null;
  historico_toque: RegistroToqueAno[] | null;
  observacoes: string | null;
  peso_atual: number | null;
  data_pesagem_atual: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type AnimalDbWrite = Omit<AnimalDbRow, 'created_at'> & { created_at?: string };
export type AnimalCreateInput = Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao' | 'syncStatus' | 'syncError' | 'localDeleted'>;
type RegistroToqueDbRow = {
  id: string;
  animal_id: string;
  data: string;
  ano: number;
  brinco: string;
  resultado: RegistroToqueAno['resultado'];
  observacoes: string | null;
};
type LegacyArrayRow = { id: string; animais_ids: string[] | null };
type LegacyChildrenRow = { id: string; filhos_ids: string[] | null };
type AnimalCreatePayload = { id: string; animal: AnimalCreateInput };
type AnimalUpdatePayload = { id: string; updates: Partial<Animal> };
type AnimalDeletePayload = { id: string };
type AnimalOutboxPayload = AnimalCreatePayload | AnimalUpdatePayload | AnimalDeletePayload;

const ENTITY = 'animal';
const localRecordKey = (userId: string, animalId: string) => `${ENTITY}:${userId}:${animalId}`;
const snapshotKey = (userId: string) => `${ENTITY}:${userId}:snapshot`;
let remoteSyncInProgress = false;
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);

const getCurrentUserId = async (): Promise<string | undefined> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
};

const toNumberOrUndefined = (value: number | string | null | undefined): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

const toAnimal = (row: AnimalDbRow): Animal => ({
  id: row.id,
  brinco: row.brinco,
  tipo_animal: row.tipo_animal,
  sexo: row.sexo,
  raca: row.raca ?? undefined,
  cor: row.cor ?? undefined,
  data_nascimento: row.data_nascimento,
  mae_id: row.mae_id ?? undefined,
  pai_id: row.pai_id ?? undefined,
  cdc: row.cdc ?? undefined,
  cdn: row.cdn ?? undefined,
  status: row.status,
  motivo_descarte: row.motivo_descarte ?? undefined,
  data_descarte: row.data_descarte ?? undefined,
  qtd_descartes_brinco: toNumberOrUndefined(row.qtd_descartes_brinco),
  categoria: row.categoria,
  pasto_id: row.pasto_id ?? undefined,
  pasto_nome: row.pasto_nome ?? undefined,
  status_reprodutivo: row.status_reprodutivo ?? undefined,
  touro_cobertura: row.touro_cobertura ?? undefined,
  tipo_cobertura: row.tipo_cobertura ?? undefined,
  filhos_ids: row.filhos_ids ?? undefined,
  historico_toque: row.historico_toque ?? undefined,
  observacoes: row.observacoes ?? undefined,
  peso_atual: toNumberOrUndefined(row.peso_atual),
  data_pesagem_atual: row.data_pesagem_atual ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const toRegistroToque = (row: RegistroToqueDbRow): RegistroToqueAno => ({
  id: row.id,
  data: row.data,
  ano: Number(row.ano),
  brinco: row.brinco,
  resultado: row.resultado,
  observacoes: row.observacoes ?? undefined,
});

const withNormalizedToques = async (rows: AnimalDbRow[]): Promise<Animal[]> => {
  const animals = rows.map(toAnimal);
  if (animals.length === 0) return animals;

  const { data, error } = await supabase
    .from('registros_toque')
    .select('id, animal_id, data, ano, brinco, resultado, observacoes')
    .in('animal_id', animals.map((animal) => animal.id))
    .order('data', { ascending: false });
  if (error) throw error;

  const normalizedByAnimal = new Map<string, RegistroToqueAno[]>();
  ((data ?? []) as unknown as RegistroToqueDbRow[]).forEach((row) => {
    const records = normalizedByAnimal.get(row.animal_id) ?? [];
    records.push(toRegistroToque(row));
    normalizedByAnimal.set(row.animal_id, records);
  });

  return animals.map((animal) => {
    const normalized = normalizedByAnimal.get(animal.id);
    return normalized && normalized.length > 0 ? { ...animal, historico_toque: normalized } : animal;
  });
};

const syncNormalizedToques = async (animalId: string, brinco: string, historicoToque: RegistroToqueAno[] | null | undefined): Promise<void> => {
  const { error: deleteError } = await supabase.from('registros_toque').delete().eq('animal_id', animalId);
  if (deleteError) throw deleteError;
  if (!historicoToque || historicoToque.length === 0) return;

  const payload = historicoToque.map((registro) => ({
    id: registro.id,
    animal_id: animalId,
    data: registro.data,
    ano: Number(registro.ano),
    brinco,
    resultado: registro.resultado,
    observacoes: registro.observacoes ?? null,
  }));
  const { error } = await supabase.from('registros_toque').insert(payload);
  if (error) throw error;
};

const sanitizeSearch = (value: string) => value.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
const cleanAnimal = <T extends Partial<Animal>>(animal: T): T => {
  const { syncStatus: _syncStatus, syncError: _syncError, localDeleted: _localDeleted, ...clean } = animal;
  return clean as T;
};

const buildAnimalInsert = (animal: AnimalCreateInput, id: string, qtdDescartes: number): AnimalDbWrite => ({
  id,
  brinco: animal.brinco,
  tipo_animal: animal.tipo_animal,
  sexo: animal.sexo,
  raca: animal.raca ?? null,
  cor: animal.cor ?? null,
  data_nascimento: animal.data_nascimento,
  mae_id: animal.mae_id ?? null,
  pai_id: animal.pai_id ?? null,
  cdc: animal.cdc ?? null,
  cdn: animal.cdn ?? null,
  status: animal.status,
  motivo_descarte: animal.motivo_descarte ?? null,
  data_descarte: animal.data_descarte ?? null,
  qtd_descartes_brinco: qtdDescartes,
  categoria: animal.categoria,
  pasto_id: animal.pasto_id ?? null,
  pasto_nome: animal.pasto_nome ?? null,
  status_reprodutivo: animal.status_reprodutivo ?? null,
  touro_cobertura: animal.touro_cobertura ?? null,
  tipo_cobertura: animal.tipo_cobertura ?? null,
  filhos_ids: animal.filhos_ids ?? [],
  historico_toque: animal.historico_toque ?? [],
  observacoes: animal.observacoes ?? null,
  peso_atual: animal.peso_atual ?? null,
  data_pesagem_atual: animal.data_pesagem_atual ?? null,
  status_sincronizacao: false,
});

const buildAnimalPatch = (updates: Partial<Animal>): Partial<AnimalDbWrite> => {
  const patch: Partial<AnimalDbWrite> = {};
  if (updates.brinco !== undefined) patch.brinco = updates.brinco;
  if (updates.tipo_animal !== undefined) patch.tipo_animal = updates.tipo_animal;
  if (updates.sexo !== undefined) patch.sexo = updates.sexo;
  if (updates.raca !== undefined) patch.raca = updates.raca || null;
  if (updates.cor !== undefined) patch.cor = updates.cor || null;
  if (updates.data_nascimento !== undefined) patch.data_nascimento = updates.data_nascimento;
  if ('mae_id' in updates) patch.mae_id = updates.mae_id ?? null;
  if ('pai_id' in updates) patch.pai_id = updates.pai_id ?? null;
  if ('cdc' in updates) patch.cdc = updates.cdc ?? null;
  if ('cdn' in updates) patch.cdn = updates.cdn ?? null;
  if (updates.status !== undefined) patch.status = updates.status;
  if ('motivo_descarte' in updates) patch.motivo_descarte = updates.motivo_descarte ?? null;
  if ('data_descarte' in updates) patch.data_descarte = updates.data_descarte ?? null;
  if (updates.categoria !== undefined) patch.categoria = updates.categoria;
  if ('pasto_id' in updates) patch.pasto_id = updates.pasto_id ?? null;
  if ('pasto_nome' in updates) patch.pasto_nome = updates.pasto_nome ?? null;
  if ('status_reprodutivo' in updates) patch.status_reprodutivo = updates.status_reprodutivo ?? null;
  if ('touro_cobertura' in updates) patch.touro_cobertura = updates.touro_cobertura ?? null;
  if ('tipo_cobertura' in updates) patch.tipo_cobertura = updates.tipo_cobertura ?? null;
  if ('filhos_ids' in updates) patch.filhos_ids = updates.filhos_ids ?? [];
  if ('historico_toque' in updates) patch.historico_toque = updates.historico_toque ?? [];
  if ('observacoes' in updates) patch.observacoes = updates.observacoes ?? null;
  if ('peso_atual' in updates) patch.peso_atual = updates.peso_atual ?? null;
  if ('data_pesagem_atual' in updates) patch.data_pesagem_atual = updates.data_pesagem_atual ?? null;
  patch.status_sincronizacao = false;
  return patch;
};

const getDiscardCount = async (brinco: string) => {
  const { count, error } = await supabase.from('animais').select('id', { count: 'exact', head: true }).eq('brinco', brinco).eq('status', 'descarte');
  if (error) throw error;
  return count ?? 0;
};

const syncLegacyArray = async (table: 'lotes' | 'manejos_sanitarios', id: string, animalId: string) => {
  const { data, error } = await supabase.from(table).select('id, animais_ids');
  if (error) throw error;
  const rows = (data ?? []) as unknown as LegacyArrayRow[];
  for (const row of rows) {
    const ids = row.animais_ids ?? [];
    if (!ids.includes(animalId)) continue;
    const { error: updateError } = await supabase.from(table).update({ animais_ids: ids.filter((currentId) => currentId !== animalId) }).eq('id', row.id);
    if (updateError) throw updateError;
  }
};

const syncLegacyChildren = async (animalId: string) => {
  const { data, error } = await supabase.from('animais').select('id, filhos_ids');
  if (error) throw error;
  const rows = (data ?? []) as unknown as LegacyChildrenRow[];
  for (const row of rows) {
    const ids = row.filhos_ids ?? [];
    if (row.id === animalId || !ids.includes(animalId)) continue;
    const { error: updateError } = await supabase.from('animais').update({ filhos_ids: ids.filter((currentId) => currentId !== animalId), status_sincronizacao: false }).eq('id', row.id);
    if (updateError) throw updateError;
  }
};

const readLocalAnimals = async (userId: string): Promise<{ data: Animal[]; capturedAt?: string }> => {
  const records = await listOfflineRecords<Animal>({ userId, entity: ENTITY });
  const data = records
    .filter((record) => !record.data.localDeleted)
    .map((record) => record.data);
  const snapshot = await getOfflineSnapshot<{ capturedAt: string }>(snapshotKey(userId));
  return { data, capturedAt: snapshot?.data.capturedAt ?? snapshot?.capturedAt };
};

const saveLocalAnimal = async (userId: string, animal: Animal, syncStatus: AnimalSyncStatus, syncError?: string, localDeleted = false): Promise<Animal> => {
  const localAnimal: Animal = { ...cleanAnimal(animal), syncStatus, syncError, localDeleted };
  await saveOfflineRecord({
    key: localRecordKey(userId, animal.id),
    userId,
    entity: ENTITY,
    entityId: animal.id,
    data: localAnimal,
    updatedAt: new Date().toISOString(),
  });
  return localAnimal;
};

const hasLocalPendingWork = (animal: Animal): boolean => (
  animal.syncStatus === 'pending'
  || animal.syncStatus === 'processing'
  || animal.syncStatus === 'error'
  || Boolean(animal.localDeleted)
);

const cacheOnlineAnimals = async (userId: string, animals: Animal[], replaceCompleteCache: boolean): Promise<Animal[]> => {
  const existing = await listOfflineRecords<Animal>({ userId, entity: ENTITY });
  const pendingAnimals = existing.filter((record) => hasLocalPendingWork(record.data)).map((record) => record.data);
  const existingById = new Map(existing.map((record) => [record.entityId, record.data]));
  const remoteIds = new Set(animals.map((animal) => animal.id));
  const records = animals.map((animal) => {
    const current = existingById.get(animal.id);
    const data = current && hasLocalPendingWork(current)
      ? current
      : { ...animal, syncStatus: 'synced' as const, syncError: undefined, localDeleted: false };
    return {
      key: localRecordKey(userId, animal.id), userId, entity: ENTITY, entityId: animal.id, data, updatedAt: new Date().toISOString(),
    };
  });
  await saveOfflineRecords(records);

  if (replaceCompleteCache) {
    const staleKeys = existing
      .filter((record) => !remoteIds.has(record.entityId) && !hasLocalPendingWork(record.data))
      .map((record) => record.key);
    await deleteOfflineRecords(staleKeys);
  }

  const capturedAt = new Date().toISOString();
  await saveOfflineSnapshot({ key: snapshotKey(userId), scope: userId, data: { capturedAt }, capturedAt });
  return pendingAnimals;
};

const filterLocalAnimals = (animals: Animal[], filters?: { search?: string; sexo?: string; status?: string; categoria?: string; tipo?: string; pasto_id?: string; page?: number; limit?: number }) => {
  const search = filters?.search ? sanitizeSearch(filters.search).toLocaleLowerCase() : '';
  const filtered = animals
    .filter((animal) => !search || [animal.brinco, animal.raca, animal.cdc, animal.cdn].some((value) => value?.toLocaleLowerCase().includes(search)))
    .filter((animal) => !filters?.sexo || filters.sexo === 'all' || animal.sexo === filters.sexo)
    .filter((animal) => !filters?.status || filters.status === 'all' || animal.status === filters.status)
    .filter((animal) => !filters?.categoria || filters.categoria === 'all' || animal.categoria === filters.categoria)
    .filter((animal) => !filters?.tipo || filters.tipo === 'all' || animal.tipo_animal === filters.tipo)
    .filter((animal) => !filters?.pasto_id || filters.pasto_id === 'all' || animal.pasto_id === filters.pasto_id)
    .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''));
  const total = filtered.length;
  if (filters?.page === undefined || filters.limit === undefined) return { data: filtered, total };
  const start = Math.max(0, (filters.page - 1) * filters.limit);
  return { data: filtered.slice(start, start + filters.limit), total };
};

const mergePendingAnimals = (
  animals: Animal[],
  total: number,
  pendingAnimals: Animal[],
  filters?: { search?: string; sexo?: string; status?: string; categoria?: string; tipo?: string; pasto_id?: string; page?: number; limit?: number },
) => {
  if (pendingAnimals.length === 0) return { data: animals, total };
  const remoteIds = new Set(animals.map((animal) => animal.id));
  const merged = new Map(animals.map((animal) => [animal.id, animal]));
  let totalAdjustment = 0;
  pendingAnimals.forEach((animal) => {
    const matches = filterLocalAnimals([animal], { ...filters, page: undefined, limit: undefined }).total > 0;
    if (animal.localDeleted) {
      merged.delete(animal.id);
      if (remoteIds.has(animal.id)) totalAdjustment -= 1;
      return;
    }
    if (remoteIds.has(animal.id)) {
      merged.set(animal.id, animal);
      return;
    }
    if ((!filters?.page || filters.page === 1) && matches) {
      merged.set(animal.id, animal);
      totalAdjustment += 1;
    }
  });
  return {
    data: Array.from(merged.values()).sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || '')),
    total: Math.max(0, total + totalAdjustment),
  };
};

export const animaisService = {
  getAll: async (filters?: { search?: string; sexo?: string; status?: string; categoria?: string; tipo?: string; pasto_id?: string; includeHistorico?: boolean; page?: number; limit?: number }): Promise<{ data: Animal[]; total: number; source: 'remote' | 'local'; capturedAt?: string }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalAnimals(userId);
      const result = filterLocalAnimals(local.data, filters);
      return { ...result, source: 'local', capturedAt: local.capturedAt };
    }

    let query = supabase.from('animais').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    const search = filters?.search ? sanitizeSearch(filters.search) : '';
    if (search) query = query.or(`brinco.ilike.*${search}*,raca.ilike.*${search}*,cdc.ilike.*${search}*,cdn.ilike.*${search}*`);
    if (filters?.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.categoria && filters.categoria !== 'all') query = query.eq('categoria', filters.categoria);
    if (filters?.tipo && filters.tipo !== 'all') query = query.eq('tipo_animal', filters.tipo);
    if (filters?.pasto_id && filters.pasto_id !== 'all') query = query.eq('pasto_id', filters.pasto_id);
    if (filters?.page !== undefined && filters.limit !== undefined) {
      const start = (filters.page - 1) * filters.limit;
      query = query.range(start, start + filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as AnimalDbRow[];
    const animals = filters?.includeHistorico === false ? rows.map(toAnimal) : await withNormalizedToques(rows);
    const isCompleteCacheQuery = !filters?.search
      && (!filters?.sexo || filters.sexo === 'all')
      && (!filters?.status || filters.status === 'all')
      && (!filters?.categoria || filters.categoria === 'all')
      && (!filters?.tipo || filters.tipo === 'all')
      && (!filters?.pasto_id || filters.pasto_id === 'all')
      && filters?.page === undefined
      && filters?.limit === undefined;
    const pendingAnimals = await cacheOnlineAnimals(userId, animals, isCompleteCacheQuery);
    const merged = mergePendingAnimals(animals, count ?? 0, pendingAnimals, filters);
    return { ...merged, source: 'remote' };
  },

  getById: async (id: string): Promise<Animal | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    if (!isBrowserOnline()) {
      if (remoteSyncInProgress) throw new Error('Conexão indisponível para sincronização');
      const record = await getOfflineRecord<Animal>(localRecordKey(userId, id));
      return record && !record.data.localDeleted ? record.data : null;
    }
    const { data, error } = await supabase.from('animais').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [animal] = await withNormalizedToques([data as unknown as AnimalDbRow]);
    return animal ?? null;
  },

  create: async (newAnimal: AnimalCreateInput, clientId?: string): Promise<Animal> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const id = clientId ?? `ani-${crypto.randomUUID()}`;
    if (!isBrowserOnline()) {
      if (remoteSyncInProgress) throw new Error('Conexão indisponível para sincronização');
      const local = await readLocalAnimals(userId);
      const discardCount = newAnimal.status === 'descarte'
        ? local.data.filter((animal) => animal.brinco === newAnimal.brinco && animal.status === 'descarte').length + 1
        : newAnimal.qtd_descartes_brinco || 0;
      const animal: Animal = {
        ...cleanAnimal(newAnimal), id, createdAt: new Date().toISOString(), qtd_descartes_brinco: discardCount,
        status_sincronizacao: false, syncStatus: 'pending', localDeleted: false,
      };
      await saveLocalAnimal(userId, animal, 'pending');
      await enqueueOutboxOperation<AnimalCreatePayload>({ userId, entity: ENTITY, operation: 'create', payload: { id, animal: cleanAnimal(animal) as AnimalCreateInput } });
      return animal;
    }

    const discardCount = newAnimal.status === 'descarte' ? await getDiscardCount(newAnimal.brinco) + 1 : newAnimal.qtd_descartes_brinco || 0;
    const payload = buildAnimalInsert(newAnimal, id, discardCount);
    const { data, error } = await supabase.from('animais').insert(payload).select('*').single();
    if (error) throw error;
    await syncNormalizedToques(id, newAnimal.brinco, newAnimal.historico_toque);
    const [animal] = await withNormalizedToques([data as unknown as AnimalDbRow]);
    return animal;
  },

  update: async (id: string, updates: Partial<Animal>): Promise<Animal> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    if (!isBrowserOnline()) {
      if (remoteSyncInProgress) throw new Error('Conexão indisponível para sincronização');
      const currentRecord = await getOfflineRecord<Animal>(localRecordKey(userId, id));
      if (!currentRecord || currentRecord.data.localDeleted) throw new Error('Animal não encontrado');
      const animal: Animal = { ...currentRecord.data, ...cleanAnimal(updates), id, syncStatus: 'pending', syncError: undefined, localDeleted: false };
      await saveLocalAnimal(userId, animal, 'pending');
      await enqueueOutboxOperation<AnimalUpdatePayload>({ userId, entity: ENTITY, operation: 'update', payload: { id, updates: cleanAnimal(updates) } });
      return animal;
    }

    const current = await animaisService.getById(id);
    if (!current) throw new Error('Animal não encontrado');
    let qtdDescartes = current.qtd_descartes_brinco || 0;
    if (updates.status === 'descarte' && current.status !== 'descarte') {
      const brinco = updates.brinco || current.brinco;
      qtdDescartes = await getDiscardCount(brinco) + 1;
    }
    const patch = buildAnimalPatch(updates);
    patch.qtd_descartes_brinco = qtdDescartes;
    const { data, error } = await supabase.from('animais').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    await syncNormalizedToques(id, updates.brinco ?? current.brinco, updates.historico_toque ?? current.historico_toque);
    const [animal] = await withNormalizedToques([data as unknown as AnimalDbRow]);
    return animal;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    if (!isBrowserOnline()) {
      if (remoteSyncInProgress) throw new Error('Conexão indisponível para sincronização');
      const currentRecord = await getOfflineRecord<Animal>(localRecordKey(userId, id));
      if (!currentRecord) throw new Error('Animal não encontrado');
      const animal: Animal = { ...currentRecord.data, syncStatus: 'pending', syncError: undefined, localDeleted: true };
      await saveLocalAnimal(userId, animal, 'pending', undefined, true);
      await enqueueOutboxOperation<AnimalDeletePayload>({ userId, entity: ENTITY, operation: 'delete', payload: { id } });
      return true;
    }
    await syncLegacyArray('lotes', id, id);
    await syncLegacyArray('manejos_sanitarios', id, id);
    await syncLegacyChildren(id);
    const { error } = await supabase.from('animais').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updatePesoAtual: async (animalId: string, peso: number | null, dataPesagem: string | null): Promise<void> => {
    const { error } = await supabase.from('animais').update({ peso_atual: peso, data_pesagem_atual: dataPesagem, status_sincronizacao: false }).eq('id', animalId);
    if (error) throw error;
  },
};

const setLocalSyncStatus = async (userId: string, animalId: string, status: AnimalSyncStatus, error?: string, localDeleted?: boolean) => {
  const record = await getOfflineRecord<Animal>(localRecordKey(userId, animalId));
  if (!record) return;
  await saveOfflineRecord({ ...record, data: { ...record.data, syncStatus: status, syncError: error, localDeleted: localDeleted ?? record.data.localDeleted }, updatedAt: new Date().toISOString() });
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Falha ao sincronizar animal';
const isCurrentUser = async (userId: string): Promise<boolean> => (await getCurrentUserId()) === userId;
type ActiveAnimalSync = { userId: string; promise: Promise<void> };
type ScheduledAnimalRetry = { userId: string; timeoutId: ReturnType<typeof setTimeout> };
let activeAnimalSync: ActiveAnimalSync | null = null;
let scheduledAnimalRetry: ScheduledAnimalRetry | null = null;

const cancelScheduledAnimalRetry = (userId?: string) => {
  if (!scheduledAnimalRetry || (userId && scheduledAnimalRetry.userId !== userId)) return;
  clearTimeout(scheduledAnimalRetry.timeoutId);
  scheduledAnimalRetry = null;
};

const scheduleAnimalRetry = (userId: string, nextRetryAt: string) => {
  cancelScheduledAnimalRetry();
  const delay = Math.max(0, new Date(nextRetryAt).getTime() - Date.now());
  const timeoutId = setTimeout(() => {
    scheduledAnimalRetry = null;
    if (!isBrowserOnline()) return;
    void getCurrentUserId().then((currentUserId) => {
      if (currentUserId !== userId || !isBrowserOnline()) return;
      return syncAnimais();
    }).catch(() => undefined);
  }, delay);
  scheduledAnimalRetry = { userId, timeoutId };
};

useConnectivityStore.subscribe((state) => {
  if (state.status === 'offline') cancelScheduledAnimalRetry();
});

const runAnimalSync = async (userId: string): Promise<void> => {
  const operations = await listOutboxOperations<AnimalOutboxPayload>({ userId, entity: ENTITY });
  if (operations.length === 0) {
    cancelScheduledAnimalRetry(userId);
    return;
  }
  useConnectivityStore.getState().setSyncing();
  let encounteredFailure = false;
  let failedOperationRetryAt: string | null = null;
  const completedOperationIds = new Set<string>();

  for (let operationIndex = 0; operationIndex < operations.length; operationIndex += 1) {
    const operation = operations[operationIndex];
    if (!(await isCurrentUser(userId))) return;
    const hasBlockingPriorOperation = operations.slice(0, operationIndex).some((priorOperation) => (
      priorOperation.payload.id === operation.payload.id
      && !completedOperationIds.has(priorOperation.id)
      && (priorOperation.status === 'failed'
        || priorOperation.status === 'processing'
        || Boolean(priorOperation.nextRetryAt && priorOperation.nextRetryAt > new Date().toISOString()))
    ));
    if (hasBlockingPriorOperation) break;
    if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) break;
    try {
      await markOutboxOperationProcessing(operation.id);
      const payload = operation.payload;
      await setLocalSyncStatus(userId, payload.id, 'processing', undefined, operation.operation === 'delete');
      if (!(await isCurrentUser(userId))) return;
      let remote: Animal | null = null;
      remoteSyncInProgress = true;
      try {
        if (operation.operation === 'create') {
          const createPayload = payload as AnimalCreatePayload;
          try {
            remote = await animaisService.create(createPayload.animal, createPayload.id);
          } catch (createError) {
            if (!(await isCurrentUser(userId))) return;
            if (!isBrowserOnline()) throw createError;
            const existing = await animaisService.getById(createPayload.id);
            if (!existing) throw createError;
            remote = existing;
          }
        } else if (operation.operation === 'update') {
          const updatePayload = payload as AnimalUpdatePayload;
          remote = await animaisService.update(updatePayload.id, updatePayload.updates);
        } else {
          await animaisService.delete((payload as AnimalDeletePayload).id);
        }
      } finally {
        remoteSyncInProgress = false;
      }

      if (!(await isCurrentUser(userId))) return;
      if (remote) await saveLocalAnimal(userId, remote, 'synced');
      else await deleteOfflineRecord(localRecordKey(userId, payload.id));
      await deleteOutboxOperation(operation.id);
      completedOperationIds.add(operation.id);
    } catch (error) {
      if (!(await isCurrentUser(userId))) return;
      const message = errorMessage(error);
      encounteredFailure = true;
      const failedOperation = await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
      failedOperationRetryAt = failedOperation?.nextRetryAt ?? null;
      await setLocalSyncStatus(userId, operation.payload.id, 'error', message, false);
      useConnectivityStore.getState().setError(message);
      break;
    }
  }

  const remaining = await listOutboxOperations({ userId, entity: ENTITY });
  if (remaining.length === 0 || !encounteredFailure) {
    cancelScheduledAnimalRetry(userId);
    useConnectivityStore.getState().setOnline();
  } else if (failedOperationRetryAt && (await isCurrentUser(userId)) && isBrowserOnline()) {
    scheduleAnimalRetry(userId, failedOperationRetryAt);
  }
};

export const syncAnimais = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId || !isBrowserOnline()) return;

  if (activeAnimalSync) {
    if (activeAnimalSync.userId === userId) return activeAnimalSync.promise;
    await activeAnimalSync.promise;
    if (!isBrowserOnline() || !(await isCurrentUser(userId))) return;
  }

  let promise: Promise<void>;
  promise = runAnimalSync(userId).finally(() => {
    if (activeAnimalSync?.promise === promise) activeAnimalSync = null;
  });
  activeAnimalSync = { userId, promise };
  return promise;
};
