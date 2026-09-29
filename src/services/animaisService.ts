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
  saveOfflineRecord,
  saveOfflineRecordAndEnqueue,
  saveOfflineRecords,
  saveOfflineSnapshot,
} from '@/offline/database';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { Animal, AnimalSyncStatus, RegistroToqueAno } from '@/types/database';
import { classifyAnimalType, classifyAnimals } from './animalClassification';
import { DomainValidationError, isValidParentRecord, validateAnimalFields } from './domainValidation';

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
  pai_animal_id: string | null;
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
const isBrowserOnline = () => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);

const REMOTE_TIMEOUT_MS = 4000;
class RemoteTimeoutError extends Error {
  constructor() {
    super('A solicitação excedeu o tempo limite de rede');
    this.name = 'RemoteTimeoutError';
  }
}

const withRemoteTimeout = async <T>(request: PromiseLike<T>, timeoutMs = REMOTE_TIMEOUT_MS): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new RemoteTimeoutError()), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(request), timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === 'number' ? status : undefined;
};

const isTransportError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (status !== undefined) return status === 0;
  if (error instanceof RemoteTimeoutError) return true;
  if (!isBrowserOnline()) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return ['TypeError', 'NetworkError', 'AbortError'].includes(name)
    || /failed to fetch|network request failed|networkerror|load failed|offline/i.test(message);
};

const getCurrentUserId = (): Promise<string | undefined> => readCurrentUserId(isBrowserOnline());

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
  pai_id: row.pai_id ?? row.pai_animal_id ?? undefined,
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

  const normalizedAnimals = animals.map((animal) => {
    const normalized = normalizedByAnimal.get(animal.id);
    return normalized && normalized.length > 0 ? { ...animal, historico_toque: normalized } : animal;
  });
  return classifyAnimals(normalizedAnimals);
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

const toCreatePayload = (animal: Animal): AnimalCreateInput => {
  const {
    id: _id,
    createdAt: _createdAt,
    status_sincronizacao: _statusSincronizacao,
    syncStatus: _syncStatus,
    syncError: _syncError,
    localDeleted: _localDeleted,
    ...payload
  } = animal;
  return payload;
};

const toUpdatePayload = (updates: Partial<Animal>): Partial<Animal> => {
  const {
    id: _id,
    createdAt: _createdAt,
    status_sincronizacao: _statusSincronizacao,
    syncStatus: _syncStatus,
    syncError: _syncError,
    localDeleted: _localDeleted,
    ...payload
  } = updates;
  return payload;
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
  pai_animal_id: animal.pai_id ?? null,
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
  if ('pai_id' in updates) {
    patch.pai_id = updates.pai_id ?? null;
    patch.pai_animal_id = updates.pai_id ?? null;
  }
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

const normalizeBrinco = (brinco: string) => brinco.trim().toLocaleLowerCase();

const findActiveBrincoConflict = async (userId: string, brinco: string, exceptId?: string): Promise<boolean> => {
  const normalizedBrinco = normalizeBrinco(brinco);
  const local = await readLocalAnimals(userId);
  if (local.data.some((animal) => animal.id !== exceptId && animal.status === 'ativo' && normalizeBrinco(animal.brinco) === normalizedBrinco)) return true;
  if (!isBrowserOnline()) return false;
  const { data, error } = await withRemoteTimeout(supabase.from('animais').select('id, brinco').eq('status', 'ativo'));
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; brinco: string }>).some((animal) => animal.id !== exceptId && normalizeBrinco(animal.brinco) === normalizedBrinco);
};

const findParentCandidate = async (
  userId: string,
  reference: string,
  kind: 'mae' | 'pai',
  currentId?: string,
): Promise<Animal | undefined> => {
  const local = await readLocalAnimals(userId);
  const localCandidate = local.data.find((animal) => animal.id === reference || animal.brinco === reference);
  if (localCandidate && isValidParentRecord(reference, [localCandidate], kind, currentId)) return localCandidate;
  if (!isBrowserOnline()) return undefined;

  try {
    const byId = await withRemoteTimeout(supabase.from('animais').select('*').eq('id', reference).maybeSingle());
    if (byId.error) throw byId.error;
    const byIdAnimal = byId.data ? toAnimal(byId.data as unknown as AnimalDbRow) : undefined;
    if (byIdAnimal && isValidParentRecord(reference, [byIdAnimal], kind, currentId)) return byIdAnimal;
    const byBrinco = await withRemoteTimeout(supabase.from('animais').select('*').eq('brinco', reference).maybeSingle());
    if (byBrinco.error) throw byBrinco.error;
    const byBrincoAnimal = byBrinco.data ? toAnimal(byBrinco.data as unknown as AnimalDbRow) : undefined;
    return byBrincoAnimal && isValidParentRecord(reference, [byBrincoAnimal], kind, currentId) ? byBrincoAnimal : undefined;
  } catch (error) {
    if (!isTransportError(error)) throw error;
    return undefined;
  }
};

const normalizeAndValidateAnimal = async (
  userId: string,
  input: AnimalCreateInput,
  currentId?: string,
  originalBrinco?: string,
): Promise<AnimalCreateInput> => {
  const local = await readLocalAnimals(userId);
  const context = currentId
    ? local.data.map((animal) => animal.id === currentId ? { ...animal, ...input } : animal)
    : [...local.data, input];
  const classifiedInput: AnimalCreateInput = {
    ...input,
    tipo_animal: classifyAnimalType(input, context),
  };
  validateAnimalFields(classifiedInput);
  const brinco = classifiedInput.brinco.trim();
  if ((!currentId || brinco !== originalBrinco?.trim()) && await findActiveBrincoConflict(userId, brinco, currentId)) {
    throw new DomainValidationError(`O ID/Brinco ${brinco} já está em uso por outro animal ativo. Os registros existentes foram preservados.`);
  }
  const normalizeParent = async (reference: string | undefined, kind: 'mae' | 'pai') => {
    if (!reference?.trim()) return undefined;
    const parent = await findParentCandidate(userId, reference.trim(), kind, currentId);
    if (!parent) throw new DomainValidationError(kind === 'mae' ? 'Selecione uma mãe adulta válida, sem usar o próprio animal.' : 'Selecione um pai válido, sem usar o próprio animal.');
    return parent.id;
  };
  return {
    ...classifiedInput,
    brinco,
    raca: classifiedInput.raca?.trim() || undefined,
    cor: classifiedInput.cor?.trim() || undefined,
    cdc: classifiedInput.cdc?.trim() || undefined,
    cdn: classifiedInput.cdn?.trim() || undefined,
    touro_cobertura: classifiedInput.touro_cobertura?.trim() || undefined,
    observacoes: classifiedInput.observacoes?.trim() || undefined,
    motivo_descarte: classifiedInput.motivo_descarte?.trim() || undefined,
    data_descarte: classifiedInput.data_descarte || undefined,
    historico_toque: classifiedInput.historico_toque?.map((toque) => ({ ...toque, brinco, observacoes: toque.observacoes?.trim() || undefined })),
    mae_id: await normalizeParent(classifiedInput.mae_id, 'mae'),
    pai_id: await normalizeParent(classifiedInput.pai_id, 'pai'),
  };
};

const annotateBrincoConflicts = (animals: Animal[], activeBrincos?: string[]): Animal[] => {
  const activeCounts = new Map<string, number>();
  animals.filter((animal) => animal.status === 'ativo').forEach((animal) => {
    const key = normalizeBrinco(animal.brinco);
    activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
  });
  activeBrincos?.forEach((brinco) => {
    const key = normalizeBrinco(brinco);
    activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
  });
  return animals.map((animal) => ({ ...animal, brinco_duplicado: (activeCounts.get(normalizeBrinco(animal.brinco)) ?? 0) > 1 }));
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
  const batchSize = 500;
  let offset = 0;
  let total = 0;
  do {
    const { data, count, error } = await supabase
      .from('animais')
      .select('id, filhos_ids', { count: 'exact' })
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as LegacyChildrenRow[];
    for (const row of rows) {
      const ids = row.filhos_ids ?? [];
      if (row.id === animalId || !ids.includes(animalId)) continue;
      const { error: updateError } = await supabase.from('animais').update({ filhos_ids: ids.filter((currentId) => currentId !== animalId), status_sincronizacao: false }).eq('id', row.id);
      if (updateError) throw updateError;
    }
    total = count ?? 0;
    offset += rows.length;
    if (rows.length === 0) break;
  } while (offset < total);
};

const readLocalAnimals = async (userId: string): Promise<{ data: Animal[]; capturedAt?: string }> => {
  const records = await listOfflineRecords<Animal>({ userId, entity: ENTITY });
  const data = classifyAnimals(records
    .filter((record) => !record.data.localDeleted)
    .map((record) => record.data));
  const snapshot = await getOfflineSnapshot<Animal[]>(snapshotKey(userId));
  return { data, capturedAt: snapshot?.capturedAt };
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

  if (!replaceCompleteCache) return pendingAnimals;

  const capturedAt = new Date().toISOString();
  const snapshotAnimals = (await listOfflineRecords<Animal>({ userId, entity: ENTITY }))
    .filter((record) => !record.data.localDeleted)
    .map((record) => record.data);
  await saveOfflineSnapshot({ key: snapshotKey(userId), scope: userId, data: snapshotAnimals, capturedAt });
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

const queueLocalCreate = async (userId: string, newAnimal: AnimalCreateInput, id: string): Promise<Animal> => {
  const local = await readLocalAnimals(userId);
  const discardCount = newAnimal.status === 'descarte'
    ? local.data.filter((animal) => animal.brinco === newAnimal.brinco && animal.status === 'descarte').length + 1
    : newAnimal.qtd_descartes_brinco || 0;
  const animal: Animal = {
    ...cleanAnimal(newAnimal), id, createdAt: new Date().toISOString(), qtd_descartes_brinco: discardCount,
    status_sincronizacao: false, syncStatus: 'pending', localDeleted: false,
  };
  await saveOfflineRecordAndEnqueue(
    {
      key: localRecordKey(userId, id), userId, entity: ENTITY, entityId: id,
      data: animal, updatedAt: new Date().toISOString(),
    },
    { userId, entity: ENTITY, operation: 'create', payload: { id, animal: toCreatePayload(animal) } },
  );
  return animal;
};

const queueLocalUpdate = async (userId: string, id: string, updates: Partial<Animal>, baseAnimal?: Animal): Promise<Animal> => {
  const currentRecord = await getOfflineRecord<Animal>(localRecordKey(userId, id));
  const currentAnimal = currentRecord?.userId === userId && currentRecord.entity === ENTITY
    ? currentRecord.data
    : baseAnimal;
  if (!currentAnimal || currentAnimal.localDeleted) throw new Error('Animal não encontrado');
  const animal: Animal = { ...currentAnimal, ...cleanAnimal(updates), id, syncStatus: 'pending', syncError: undefined, localDeleted: false };
  await saveOfflineRecordAndEnqueue(
    {
      key: localRecordKey(userId, id),
      userId,
      entity: ENTITY,
      entityId: id,
      data: animal,
      updatedAt: new Date().toISOString(),
    },
    { userId, entity: ENTITY, operation: 'update', payload: { id, updates: toUpdatePayload(updates) } },
  );
  return animal;
};

const queueLocalDelete = async (userId: string, id: string): Promise<boolean> => {
  const currentRecord = await getOfflineRecord<Animal>(localRecordKey(userId, id));
  if (!currentRecord || currentRecord.userId !== userId || currentRecord.entity !== ENTITY) throw new Error('Animal não encontrado');
  const animal: Animal = { ...currentRecord.data, syncStatus: 'pending', syncError: undefined, localDeleted: true };
  await saveOfflineRecordAndEnqueue(
    {
      ...currentRecord, data: animal, updatedAt: new Date().toISOString(),
    },
    { userId, entity: ENTITY, operation: 'delete', payload: { id } },
  );
  return true;
};

const findRemoteAnimal = async (id: string): Promise<Animal | null> => {
  const { data, error } = await withRemoteTimeout(supabase.from('animais').select('*').eq('id', id).maybeSingle());
  if (error) throw error;
  if (!data) return null;
  const [animal] = await withRemoteTimeout(withNormalizedToques([data as unknown as AnimalDbRow]));
  return animal ?? null;
};

const remoteCreateAnimal = async (newAnimal: AnimalCreateInput, id: string): Promise<Animal> => {
  validateAnimalFields(newAnimal);
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error('Sua sessão expirou. Entre novamente.');
  if (await findActiveBrincoConflict(currentUserId, newAnimal.brinco, id)) throw new DomainValidationError(`O ID/Brinco ${newAnimal.brinco} já está em uso por outro animal ativo. Os registros existentes foram preservados.`);
  const discardCount = newAnimal.status === 'descarte'
    ? await withRemoteTimeout(getDiscardCount(newAnimal.brinco)) + 1
    : newAnimal.qtd_descartes_brinco || 0;
  const payload = buildAnimalInsert(newAnimal, id, discardCount);
  let data: unknown;
  try {
    const result = await withRemoteTimeout(supabase.from('animais').insert(payload).select('*').single());
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    const existing = await findRemoteAnimal(id);
    if (!existing) throw error;
    await withRemoteTimeout(syncNormalizedToques(id, newAnimal.brinco, newAnimal.historico_toque));
    return existing;
  }
  await withRemoteTimeout(syncNormalizedToques(id, newAnimal.brinco, newAnimal.historico_toque));
  const [animal] = await withRemoteTimeout(withNormalizedToques([data as AnimalDbRow]));
  if (!animal) throw new Error('Animal criado não retornou dados');
  return animal;
};

const remoteUpdateAnimal = async (id: string, updates: Partial<Animal>): Promise<Animal> => {
  const { data: currentData, error: currentError } = await withRemoteTimeout(supabase.from('animais').select('*').eq('id', id).maybeSingle());
  if (currentError) throw currentError;
  if (!currentData) throw new Error('Animal não encontrado');
  const current = (await withRemoteTimeout(withNormalizedToques([currentData as unknown as AnimalDbRow])))[0];
  if (!current) throw new Error('Animal não encontrado');
  const classificationFields = ['sexo', 'data_nascimento', 'status_reprodutivo', 'touro_cobertura', 'filhos_ids', 'mae_id', 'tipo_animal'];
  const shouldReclassify = classificationFields.some((field) => field in updates);
  const next = {
    ...current,
    ...updates,
    tipo_animal: shouldReclassify
      ? classifyAnimalType({ ...current, ...updates }, Boolean(updates.filhos_ids?.length || current.filhos_ids?.length))
      : current.tipo_animal,
  };
  validateAnimalFields(next);
  if (updates.brinco && updates.brinco !== current.brinco) {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId || await findActiveBrincoConflict(currentUserId, updates.brinco, id)) throw new DomainValidationError(`O ID/Brinco ${updates.brinco} já está em uso por outro animal ativo. Os registros existentes foram preservados.`);
  }
  let qtdDescartes = current.qtd_descartes_brinco || 0;
  if (updates.status === 'descarte' && current.status !== 'descarte') {
    qtdDescartes = await withRemoteTimeout(getDiscardCount(updates.brinco || current.brinco)) + 1;
  }
  const normalizedUpdates = { ...updates, tipo_animal: next.tipo_animal };
  const patch = buildAnimalPatch(normalizedUpdates);
  patch.qtd_descartes_brinco = qtdDescartes;
  const { data, error } = await withRemoteTimeout(supabase.from('animais').update(patch).eq('id', id).select('*').single());
  if (error) throw error;
  await withRemoteTimeout(syncNormalizedToques(id, updates.brinco ?? current.brinco, updates.historico_toque ?? current.historico_toque));
  const [animal] = await withRemoteTimeout(withNormalizedToques([data as unknown as AnimalDbRow]));
  if (!animal) throw new Error('Animal atualizado não retornou dados');
  return animal;
};

const remoteDeleteAnimal = async (id: string): Promise<void> => {
  await withRemoteTimeout(syncLegacyArray('lotes', id, id));
  await withRemoteTimeout(syncLegacyArray('manejos_sanitarios', id, id));
  await withRemoteTimeout(syncLegacyChildren(id));
  const { error } = await withRemoteTimeout(supabase.from('animais').delete().eq('id', id));
  if (error) throw error;
};

const MOTHER_TYPES: Animal['tipo_animal'][] = ['vaca', 'matriz', 'novilha'];
const isMotherCandidate = (animal: Animal, excludeId?: string, animals: readonly Animal[] = [animal]): boolean => (
  animal.id !== excludeId
  && MOTHER_TYPES.includes(classifyAnimalType(animal, animals))
  && !['morto', 'vendido'].includes(animal.status)
);

const mergeAnimalsById = (remote: Animal[], local: Animal[]): Animal[] => {
  const merged = new Map(remote.map((animal) => [animal.id, animal]));
  local.forEach((animal) => {
    if (hasLocalPendingWork(animal)) merged.set(animal.id, animal);
  });
  return Array.from(merged.values()).sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''));
};

export type AnimalRelationshipResult = {
  data: Animal[];
  source: 'remote' | 'local';
  capturedAt?: string;
};

const searchMaeCandidates = async (userId: string, value: string, excludeId?: string): Promise<AnimalRelationshipResult> => {
  const local = await readLocalAnimals(userId);
  const search = sanitizeSearch(value).toLocaleLowerCase();
  const localMatches = local.data.filter((animal) => isMotherCandidate(animal, excludeId, local.data)
    && (!search || animal.brinco.toLocaleLowerCase().includes(search)));
  if (!search || !isBrowserOnline()) return { data: localMatches, source: 'local', capturedAt: local.capturedAt };

  try {
    const batchSize = 500;
    const remoteAnimals: Animal[] = [];
    let offset = 0;
    let total = 0;
    do {
      let query = supabase
        .from('animais')
        .select('*', { count: 'exact' })
        .not('status', 'in', '(morto,vendido)')
        .order('brinco', { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (search) query = query.ilike('brinco', `%${search}%`);
      const { data, count, error } = await withRemoteTimeout(query);
      if (error) throw error;
      const rows = (data ?? []) as unknown as AnimalDbRow[];
      remoteAnimals.push(...rows.map(toAnimal));
      total = count ?? 0;
      offset += rows.length;
      if (rows.length === 0) break;
    } while (offset < total);
    const remoteIds = new Set(remoteAnimals.map((animal) => animal.id));
    const derivedRemoteAnimals = classifyAnimals([
      ...local.data.filter((animal) => !remoteIds.has(animal.id)),
      ...remoteAnimals,
    ]).filter((animal) => remoteIds.has(animal.id) && isMotherCandidate(animal, excludeId, [...local.data, ...remoteAnimals]));
    await cacheOnlineAnimals(userId, derivedRemoteAnimals, false);
    return { data: mergeAnimalsById(derivedRemoteAnimals, localMatches), source: 'remote' };
  } catch (error) {
    if (!isTransportError(error)) throw error;
    return { data: localMatches, source: 'local', capturedAt: local.capturedAt };
  }
};

const getChildrenByMother = async (userId: string, motherId: string): Promise<AnimalRelationshipResult> => {
  const local = await readLocalAnimals(userId);
  const localRecords = await listOfflineRecords<Animal>({ userId, entity: ENTITY });
  const localChildren = local.data.filter((animal) => animal.mae_id === motherId);
  const pendingChildrenWithAnotherMother = new Set(
    localRecords
      .filter((record) => hasLocalPendingWork(record.data) && (record.data.localDeleted || record.data.mae_id !== motherId))
      .map((record) => record.entityId),
  );
  if (!isBrowserOnline()) return { data: localChildren, source: 'local', capturedAt: local.capturedAt };

  try {
    const batchSize = 500;
    const remoteChildren: Animal[] = [];
    let offset = 0;
    let total = 0;
    do {
      const { data, count, error } = await withRemoteTimeout(
        supabase.from('animais').select('*', { count: 'exact' }).eq('mae_id', motherId).order('data_nascimento', { ascending: false }).range(offset, offset + batchSize - 1),
      );
      if (error) throw error;
      const rows = (data ?? []) as unknown as AnimalDbRow[];
      remoteChildren.push(...await withRemoteTimeout(withNormalizedToques(rows)));
      total = count ?? 0;
      offset += rows.length;
      if (rows.length === 0) break;
    } while (offset < total);
    await cacheOnlineAnimals(userId, remoteChildren, false);
    const visibleRemoteChildren = remoteChildren.filter((animal) => !pendingChildrenWithAnotherMother.has(animal.id));
    return { data: mergeAnimalsById(visibleRemoteChildren, localChildren), source: 'remote' };
  } catch (error) {
    if (!isTransportError(error)) throw error;
    return { data: localChildren, source: 'local', capturedAt: local.capturedAt };
  }
};

export const animaisService = {
  getAll: async (filters?: { search?: string; sexo?: string; status?: string; categoria?: string; tipo?: string; pasto_id?: string; includeHistorico?: boolean; page?: number; limit?: number }): Promise<{ data: Animal[]; total: number; source: 'remote' | 'local'; capturedAt?: string }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: [], total: 0, source: 'local' };
    if (!isBrowserOnline()) {
      const local = await readLocalAnimals(userId);
      const result = filterLocalAnimals(local.data, filters);
      return { ...result, data: annotateBrincoConflicts(result.data), source: 'local', capturedAt: local.capturedAt };
    }

    try {
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

      const { data, count, error } = await withRemoteTimeout(query);
      if (error) throw error;
      const rows = (data ?? []) as unknown as AnimalDbRow[];
      const fetchedAnimals = filters?.includeHistorico === false
        ? rows.map(toAnimal)
        : await withRemoteTimeout(withNormalizedToques(rows));
      const localContext = await readLocalAnimals(userId);
      const fetchedIds = new Set(fetchedAnimals.map((animal) => animal.id));
      const animals = classifyAnimals([
        ...localContext.data.filter((animal) => !fetchedIds.has(animal.id)),
        ...fetchedAnimals,
      ]).filter((animal) => fetchedIds.has(animal.id));
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
      const { data: activeRows, error: activeError } = await supabase.from('animais').select('id, brinco').eq('status', 'ativo');
      if (activeError) throw activeError;
      const mergedIds = new Set(merged.data.map((animal) => animal.id));
      const activeBrincosOutsidePage = ((activeRows ?? []) as Array<{ id: string; brinco: string }>)
        .filter((row) => !mergedIds.has(row.id)).map((row) => row.brinco);
      return { ...merged, data: annotateBrincoConflicts(merged.data, activeBrincosOutsidePage), source: 'remote' };
    } catch (error) {
      if (!isTransportError(error)) throw error;
      const local = await readLocalAnimals(userId);
      const result = filterLocalAnimals(local.data, filters);
      return { ...result, data: annotateBrincoConflicts(result.data), source: 'local', capturedAt: local.capturedAt };
    }
  },

  searchMaeCandidates: (userId: string, value: string, excludeId?: string): Promise<AnimalRelationshipResult> => (
    searchMaeCandidates(userId, value, excludeId)
  ),

  getChildrenByMother: (userId: string, motherId: string): Promise<AnimalRelationshipResult> => (
    getChildrenByMother(userId, motherId)
  ),

  getById: async (id: string): Promise<Animal | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    if (!isBrowserOnline()) {
      const local = await readLocalAnimals(userId);
      return local.data.find((animal) => animal.id === id) ?? null;
    }
    try {
      const { data, error } = await withRemoteTimeout(supabase.from('animais').select('*').eq('id', id).maybeSingle());
      if (error) throw error;
      if (!data) return null;
      const [fetchedAnimal] = await withRemoteTimeout(withNormalizedToques([data as unknown as AnimalDbRow]));
      if (!fetchedAnimal) return null;
      const local = await readLocalAnimals(userId);
      const context = [...local.data.filter((item) => item.id !== fetchedAnimal.id), fetchedAnimal];
      const animal = { ...fetchedAnimal, tipo_animal: classifyAnimalType(fetchedAnimal, context) };
      const { data: activeRows, error: activeError } = await withRemoteTimeout(supabase.from('animais').select('id, brinco').eq('status', 'ativo'));
      if (activeError) throw activeError;
      const outsidePage = ((activeRows ?? []) as Array<{ id: string; brinco: string }>)
        .filter((row) => row.id !== animal.id).map((row) => row.brinco);
      return annotateBrincoConflicts([animal], outsidePage)[0];
    } catch (error) {
      if (!isTransportError(error)) throw error;
      const local = await readLocalAnimals(userId);
      return local.data.find((candidate) => candidate.id === id) ?? null;
    }
  },

  create: async (userId: string, newAnimal: AnimalCreateInput): Promise<Animal> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const normalized = await normalizeAndValidateAnimal(userId, newAnimal);
    const id = crypto.randomUUID();
    return queueLocalCreate(userId, normalized, id);
  },

  update: async (userId: string, id: string, updates: Partial<Animal>): Promise<Animal> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    const current = await animaisService.getById(id);
    if (!current) throw new DomainValidationError('Animal não encontrado para edição.');
    const normalized = await normalizeAndValidateAnimal(userId, { ...current, ...updates } as AnimalCreateInput, id, current.brinco);
    const { id: _id, createdAt: _createdAt, status_sincronizacao: _status, ...normalizedUpdates } = normalized as Animal & { id?: string; createdAt?: string };
    return queueLocalUpdate(userId, id, normalizedUpdates, current);
  },

  delete: async (userId: string, id: string): Promise<boolean> => {
    if (!userId) throw new Error('Sua sessão expirou. Entre novamente.');
    return queueLocalDelete(userId, id);
  },

  updateRemote: remoteUpdateAnimal,

  updatePesoAtual: async (animalId: string, peso: number | null, dataPesagem: string | null): Promise<void> => {
    if (!(await getCurrentUserId())) throw new Error('Sua sessão expirou. Entre novamente.');
    const { error } = await supabase.from('animais').update({ peso_atual: peso, data_pesagem_atual: dataPesagem, status_sincronizacao: false }).eq('id', animalId);
    if (error) throw error;
  },
};

const setLocalSyncStatus = async (userId: string, animalId: string, status: AnimalSyncStatus, error?: string, localDeleted?: boolean) => {
  const record = await getOfflineRecord<Animal>(localRecordKey(userId, animalId));
  if (!record || record.userId !== userId || record.entity !== ENTITY) return;
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

  for (const operation of operations) {
    if (!(await isCurrentUser(userId))) return;
    if (operation.status === 'processing') await markOutboxOperationPending(operation.id);
    if (operation.nextRetryAt && operation.nextRetryAt > new Date().toISOString()) {
      failedOperationRetryAt = operation.nextRetryAt;
      break;
    }
    try {
      await markOutboxOperationProcessing(operation.id);
      const payload = operation.payload;
      await setLocalSyncStatus(userId, payload.id, 'processing', undefined, operation.operation === 'delete');
      if (!(await isCurrentUser(userId))) return;
      let remote: Animal | null = null;
      if (operation.operation === 'create') {
        const createPayload = payload as AnimalCreatePayload;
        remote = await remoteCreateAnimal(createPayload.animal, createPayload.id);
      } else if (operation.operation === 'update') {
        const updatePayload = payload as AnimalUpdatePayload;
        remote = await remoteUpdateAnimal(updatePayload.id, updatePayload.updates);
      } else {
        await remoteDeleteAnimal((payload as AnimalDeletePayload).id);
      }

      if (!(await isCurrentUser(userId))) return;
      if (remote) await saveLocalAnimal(userId, remote, 'synced');
      else await deleteOfflineRecord(localRecordKey(userId, payload.id));
      await deleteOutboxOperation(operation.id);
    } catch (error) {
      if (!(await isCurrentUser(userId))) return;
      const message = errorMessage(error);
      encounteredFailure = true;
      const failedOperation = await markOutboxOperationFailed(operation.id, message, new Date(Date.now() + 5000).toISOString());
      failedOperationRetryAt = failedOperation?.nextRetryAt ?? null;
      await setLocalSyncStatus(userId, operation.payload.id, 'error', message, operation.operation === 'delete');
      useConnectivityStore.getState().setError(message);
      break;
    }
  }

  const remaining = await listOutboxOperations({ userId, entity: ENTITY });
  if (remaining.length === 0) {
    cancelScheduledAnimalRetry(userId);
    useConnectivityStore.getState().setOnline();
  } else if (failedOperationRetryAt && (await isCurrentUser(userId)) && isBrowserOnline()) {
    scheduleAnimalRetry(userId, failedOperationRetryAt);
  } else if (!encounteredFailure) {
    useConnectivityStore.getState().setOnline();
  }
};

export const syncAnimais = async (requestedUserId?: string): Promise<void> => {
  const userId = requestedUserId ?? await getCurrentUserId();
  if (!userId || !isBrowserOnline()) return;
  if (requestedUserId && (await isCurrentUser(userId)) === false) return;

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
