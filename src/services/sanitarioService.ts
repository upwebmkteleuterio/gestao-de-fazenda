import { getCurrentUserId as readCurrentUserId, supabase } from '@/integrations/supabase/client';
import {
  deleteOfflineRecords,
  getOfflineSnapshot,
  listOfflineRecords,
  saveOfflineRecords,
  saveOfflineSnapshot,
} from '@/offline/database';
import { isNetworkFailure } from '@/offline/network';
import { useConnectivityStore } from '@/store/useConnectivityStore';
import { ManejoSanitario, MedicamentoAplicado } from '@/types/database';
import { MAX_DOMAIN_QUANTITY, validateSanitarioFields } from '@/services/domainValidation';
import { insumosService, removerMovimentacoesPorOrigem } from '@/services/insumosService';

type ManejoDbRow = {
  id: string;
  nome_lote: string;
  data_manejo: string;
  responsavel_tecnico: string;
  tipo_manejo: ManejoSanitario['tipo_manejo'];
  observacoes: string | null;
  status: ManejoSanitario['status'];
  medicamentos: unknown;
  animais_ids: string[] | null;
  criar_lembrete: boolean;
  data_lembrete: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type MedicamentoDbRow = {
  id: string;
  manejo_id: string;
  insumo_id: string;
  nome_produto: string;
  dose: string;
  quantidade_total: number | string;
};

type AnimalRelationRow = { manejo_id: string; animal_id: string };
type Relations = {
  medicamentos: Map<string, MedicamentoDbRow[]>;
  animais: Map<string, string[]>;
};

export type SanitarioQuery = {
  data: ManejoSanitario[];
  total: number;
  source: 'remote' | 'local';
  capturedAt?: string;
};

export type SanitarioStats = {
  andamento: number;
  concluido: number;
  source: 'remote' | 'local';
  capturedAt?: string;
};

const ENTITY = 'manejo_sanitario';
const PAGE_SIZE = 10;
const PAGE_SNAPSHOT_KEY = (userId: string, status: ManejoSanitario['status']) => `${ENTITY}:first-page:${status}:${userId}`;
const STATS_SNAPSHOT_KEY = (userId: string) => `${ENTITY}:stats:${userId}`;
const localRecordKey = (userId: string, id: string) => `${ENTITY}:${userId}:${id}`;

const isBrowserOnline = (): boolean => (
  (typeof navigator === 'undefined' || navigator.onLine)
  && useConnectivityStore.getState().status !== 'offline'
);
const getCurrentUserId = () => readCurrentUserId(isBrowserOnline());
const isNetworkError = (error: unknown): boolean => !isBrowserOnline() || isNetworkFailure(error);

const toNumber = (value: number | string): number => Number(value);

type SupabasePersistenceError = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

const withPersistenceError = (operation: string, error: unknown): Error => {
  if (!(error instanceof Error)) return new Error(`${operation}: ${String(error)}`);
  const details = error as Error & SupabasePersistenceError;
  const parts = [details.message ?? error.message];
  if (details.code) parts.push(`código ${String(details.code)}`);
  if (details.details) parts.push(`detalhes: ${String(details.details)}`);
  if (details.hint) parts.push(`orientação: ${String(details.hint)}`);
  return new Error(`${operation}: ${parts.join(' · ')}`);
};

const legacyMedicamentos = (value: unknown): MedicamentoAplicado[] => {
  if (!Array.isArray(value)) return [];
  return value.map((medicamento) => {
    const item = medicamento as Partial<MedicamentoAplicado>;
    return {
      insumo_id: item.insumo_id ?? '',
      nome_produto: item.nome_produto ?? '',
      dose: item.dose ?? '',
      quantidade_total: Number(item.quantidade_total ?? 0),
    };
  });
};

const toMedicamentos = (rows: MedicamentoDbRow[]): MedicamentoAplicado[] => rows.map((row) => ({
  insumo_id: row.insumo_id,
  nome_produto: row.nome_produto,
  dose: row.dose,
  quantidade_total: toNumber(row.quantidade_total),
}));

const toManejo = (row: ManejoDbRow, relations: Relations): ManejoSanitario => {
  const normalizedMedicamentos = relations.medicamentos.get(row.id);
  const normalizedAnimais = relations.animais.get(row.id);
  return {
    id: row.id,
    nome_lote: row.nome_lote,
    data_manejo: row.data_manejo,
    responsavel_tecnico: row.responsavel_tecnico,
    tipo_manejo: row.tipo_manejo,
    observacoes: row.observacoes ?? undefined,
    status: row.status,
    medicamentos: normalizedMedicamentos === undefined
      ? legacyMedicamentos(row.medicamentos)
      : toMedicamentos(normalizedMedicamentos),
    animais_ids: normalizedAnimais === undefined ? row.animais_ids ?? [] : normalizedAnimais,
    criar_lembrete: row.criar_lembrete,
    data_lembrete: row.data_lembrete ?? undefined,
    status_sincronizacao: row.status_sincronizacao,
    createdAt: row.created_at,
  };
};

const getRelations = async (manejoIds: string[]): Promise<Relations> => {
  if (manejoIds.length === 0) return { medicamentos: new Map(), animais: new Map() };

  const [medicamentosResult, animaisResult] = await Promise.all([
    supabase.from('manejo_sanitario_medicamentos').select('*').in('manejo_id', manejoIds),
    supabase.from('manejo_sanitario_animais').select('*').in('manejo_id', manejoIds),
  ]);
  if (medicamentosResult.error) throw medicamentosResult.error;
  if (animaisResult.error) throw animaisResult.error;

  const medicamentos = new Map<string, MedicamentoDbRow[]>();
  for (const row of (medicamentosResult.data ?? []) as unknown as MedicamentoDbRow[]) {
    const current = medicamentos.get(row.manejo_id) ?? [];
    current.push(row);
    medicamentos.set(row.manejo_id, current);
  }

  const animais = new Map<string, string[]>();
  for (const row of (animaisResult.data ?? []) as unknown as AnimalRelationRow[]) {
    const current = animais.get(row.manejo_id) ?? [];
    current.push(row.animal_id);
    animais.set(row.manejo_id, current);
  }

  return { medicamentos, animais };
};

const getManejoRow = async (id: string): Promise<ManejoDbRow | null> => {
  if (!isBrowserOnline()) throw new Error('Consulta indisponível offline.');
  const { data, error } = await supabase.from('manejos_sanitarios').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as ManejoDbRow | null;
};

const getManejos = async (rows: ManejoDbRow[]): Promise<ManejoSanitario[]> => {
  const relations = await getRelations(rows.map((row) => row.id));
  return rows.map((row) => toManejo(row, relations));
};

const compareMaisRecentes = (left: ManejoSanitario, right: ManejoSanitario): number => {
  const dateDiff = new Date(right.data_manejo).getTime() - new Date(left.data_manejo).getTime();
  if (dateDiff !== 0) return dateDiff;
  const createdDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  if (createdDiff !== 0) return createdDiff;
  return right.id.localeCompare(left.id);
};

const localRecord = (userId: string, manejo: ManejoSanitario) => ({
  key: localRecordKey(userId, manejo.id),
  userId,
  entity: ENTITY,
  entityId: manejo.id,
  data: manejo,
  updatedAt: new Date().toISOString(),
});

const readLocalPage = async (
  userId: string,
  status: ManejoSanitario['status'],
): Promise<{ data: ManejoSanitario[]; capturedAt?: string }> => {
  const [snapshot, records] = await Promise.all([
    getOfflineSnapshot<ManejoSanitario[]>(PAGE_SNAPSHOT_KEY(userId, status)),
    listOfflineRecords<ManejoSanitario>({ userId, entity: ENTITY }),
  ]);
  const snapshotData = Array.isArray(snapshot?.data) ? snapshot.data : undefined;
  const data = (snapshotData ?? records
    .filter((record) => record.userId === userId && record.data.status === status)
    .map((record) => record.data))
    .filter((manejo) => manejo.status === status)
    .sort(compareMaisRecentes)
    .slice(0, PAGE_SIZE);
  return { data, capturedAt: snapshot?.capturedAt };
};

const readLocalStats = async (userId: string): Promise<SanitarioStats> => {
  const [snapshot, records] = await Promise.all([
    getOfflineSnapshot<{ andamento: number; concluido: number }>(STATS_SNAPSHOT_KEY(userId)),
    listOfflineRecords<ManejoSanitario>({ userId, entity: ENTITY }),
  ]);
  if (snapshot?.data) {
    return { ...snapshot.data, source: 'local', capturedAt: snapshot.capturedAt };
  }
  return {
    andamento: records.filter((record) => record.data.status === 'andamento').length,
    concluido: records.filter((record) => record.data.status === 'concluido').length,
    source: 'local',
  };
};

const cachePage = async (
  userId: string,
  status: ManejoSanitario['status'],
  data: ManejoSanitario[],
): Promise<void> => {
  const existing = await listOfflineRecords<ManejoSanitario>({ userId, entity: ENTITY });
  await saveOfflineRecords(data.map((manejo) => localRecord(userId, manejo)));
  const ids = new Set(data.map((manejo) => manejo.id));
  await deleteOfflineRecords(existing
    .filter((record) => record.data.status === status && !ids.has(record.entityId))
    .map((record) => record.key));
  await saveOfflineSnapshot({
    key: PAGE_SNAPSHOT_KEY(userId, status),
    scope: `${ENTITY}:${userId}:${status}`,
    data,
    capturedAt: new Date().toISOString(),
  });
};

const cacheStats = async (userId: string, stats: { andamento: number; concluido: number }): Promise<string> => {
  const capturedAt = new Date().toISOString();
  await saveOfflineSnapshot({
    key: STATS_SNAPSHOT_KEY(userId),
    scope: `${ENTITY}:${userId}:stats`,
    data: stats,
    capturedAt,
  });
  return capturedAt;
};

const getRemotePage = async (status: ManejoSanitario['status']): Promise<ManejoSanitario[]> => {
  if (!isBrowserOnline()) throw new Error('Consulta indisponível offline.');
  const { data, error } = await supabase
    .from('manejos_sanitarios')
    .select('*')
    .eq('status', status)
    .order('data_manejo', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(0, PAGE_SIZE - 1);
  if (error) throw error;
  return getManejos((data ?? []) as unknown as ManejoDbRow[]);
};

const syncRelations = async (manejo: ManejoSanitario): Promise<void> => {
  const { error: deleteMedicamentosError } = await supabase
    .from('manejo_sanitario_medicamentos')
    .delete()
    .eq('manejo_id', manejo.id);
  if (deleteMedicamentosError) throw deleteMedicamentosError;

  const { error: deleteAnimaisError } = await supabase
    .from('manejo_sanitario_animais')
    .delete()
    .eq('manejo_id', manejo.id);
  if (deleteAnimaisError) throw deleteAnimaisError;

  if (manejo.medicamentos.length > 0) {
    const { error } = await supabase.from('manejo_sanitario_medicamentos').insert(
      manejo.medicamentos.map((medicamento) => ({
        id: `man-med-${crypto.randomUUID()}`,
        manejo_id: manejo.id,
        insumo_id: medicamento.insumo_id,
        nome_produto: medicamento.nome_produto,
        dose: medicamento.dose,
        quantidade_total: medicamento.quantidade_total,
      })),
    );
    if (error) throw error;
  }

  if (manejo.animais_ids.length > 0) {
    const { error } = await supabase.from('manejo_sanitario_animais').insert(
      manejo.animais_ids.map((animalId) => ({ manejo_id: manejo.id, animal_id: animalId })),
    );
    if (error) throw error;
  }
};

const generateMovimentacoes = async (manejo: ManejoSanitario): Promise<void> => {
  for (const medicamento of manejo.medicamentos) {
    if (medicamento.insumo_id && medicamento.quantidade_total > 0) {
      await insumosService.registrarMovimentacao({
        insumo_id: medicamento.insumo_id,
        nome_insumo: medicamento.nome_produto,
        tipo: 'saida',
        quantidade: medicamento.quantidade_total,
        data_movimento: manejo.data_manejo,
        origem_manejo_id: manejo.id,
        observacao: `Baixa automática via Manejo Sanitário ${manejo.nome_lote}`,
      });
    }
  }
};

const restoreAutomaticMovimentacoes = async (movimentacoes: Awaited<ReturnType<typeof removerMovimentacoesPorOrigem>>) => {
  for (const movimentacao of movimentacoes) {
    await insumosService.registrarMovimentacao({
      insumo_id: movimentacao.insumo_id,
      nome_insumo: movimentacao.nome_insumo,
      tipo: movimentacao.tipo,
      quantidade: toNumber(movimentacao.quantidade),
      data_movimento: movimentacao.data_movimento,
      origem_manejo_id: movimentacao.origem_manejo_id ?? undefined,
      observacao: movimentacao.observacao ?? undefined,
    });
  }
};

const validatePersistence = async (manejo: ManejoSanitario, previous?: ManejoSanitario): Promise<void> => {
  const animalIds = manejo.animais_ids;
  const insumoIds = [...new Set(manejo.medicamentos.map((medicamento) => medicamento.insumo_id))];
  const [animalsResult, insumosResult] = await Promise.all([
    animalIds.length > 0 ? supabase.from('animais').select('id').in('id', animalIds) : Promise.resolve({ data: [], error: null }),
    insumoIds.length > 0 ? supabase.from('insumos').select('id, estoque_atual').in('id', insumoIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (animalsResult.error) throw animalsResult.error;
  if (insumosResult.error) throw insumosResult.error;
  const animals = (animalsResult.data ?? []) as unknown as Array<{ id: string }>;
  const insumos = (insumosResult.data ?? []) as unknown as Array<{ id: string; estoque_atual: number | string }>;
  validateSanitarioFields(manejo, animals.map((animal) => animal.id), insumos.map((insumo) => insumo.id));

  if (manejo.status !== 'concluido') return;
  const previousMovimentacoes = previous?.status === 'concluido'
    ? await supabase.from('movimentacoes_insumos').select('insumo_id, quantidade, tipo').eq('origem_manejo_id', manejo.id)
    : { data: [], error: null };
  if (previousMovimentacoes.error) throw previousMovimentacoes.error;
  const restoredByInsumo = new Map<string, number>();
  for (const movimentacao of (previousMovimentacoes.data ?? []) as unknown as Array<{ insumo_id: string; quantidade: number | string; tipo: 'entrada' | 'saida' }>) {
    const quantity = toNumber(movimentacao.quantidade);
    restoredByInsumo.set(movimentacao.insumo_id, (restoredByInsumo.get(movimentacao.insumo_id) ?? 0) + (movimentacao.tipo === 'saida' ? quantity : -quantity));
  }
  const stockByInsumo = new Map(insumos.map((insumo) => [insumo.id, toNumber(insumo.estoque_atual)]));
  stockByInsumo.forEach((stock) => {
    if (!Number.isFinite(stock) || stock < 0 || stock > MAX_DOMAIN_QUANTITY) throw new Error('O saldo atual de um insumo é inválido.');
  });
  const requestedByInsumo = new Map<string, number>();
  manejo.medicamentos.forEach((medicamento) => {
    requestedByInsumo.set(medicamento.insumo_id, (requestedByInsumo.get(medicamento.insumo_id) ?? 0) + medicamento.quantidade_total);
  });
  requestedByInsumo.forEach((quantity, insumoId) => {
    const available = (stockByInsumo.get(insumoId) ?? 0) + (restoredByInsumo.get(insumoId) ?? 0);
    if (quantity > available) throw new Error('Estoque insuficiente para registrar as baixas automáticas do manejo.');
  });
};

export const sanitarioService = {
  getAll: async (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }): Promise<SanitarioQuery> => {
    const userId = await getCurrentUserId();
    const status = filters?.status === 'concluido' ? 'concluido' : 'andamento';
    if (!userId) return { data: [], total: 0, source: 'local' };

    if (!isBrowserOnline()) {
      const local = await readLocalPage(userId, status);
      return { data: local.data, total: local.data.length, source: 'local', capturedAt: local.capturedAt };
    }

    try {
      let query = supabase.from('manejos_sanitarios').select('*', { count: 'exact' });
      if (filters?.search?.trim()) {
        const search = filters.search.replace(/[^\p{L}\p{N} _-]/gu, ' ');
        query = query.or(`nome_lote.ilike.%${search}%,responsavel_tecnico.ilike.%${search}%`);
      }
      if (filters?.tipo && filters.tipo !== 'all') query = query.eq('tipo_manejo', filters.tipo);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      query = query
        .order('data_manejo', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (filters?.page !== undefined && filters.limit !== undefined) {
        query = query.range(Math.max(0, (filters.page - 1) * filters.limit), filters.page * filters.limit - 1);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as unknown as ManejoDbRow[];
      const items = await getManejos(rows);
      const isFirstPage = (!filters?.search?.trim())
        && (!filters?.tipo || filters.tipo === 'all')
        && filters?.page === 1
        && filters.limit === PAGE_SIZE;
      if (isFirstPage) await cachePage(userId, status, items);
      return { data: items, total: count ?? items.length, source: 'remote' };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const local = await readLocalPage(userId, status);
      return { data: local.data, total: local.data.length, source: 'local', capturedAt: local.capturedAt };
    }
  },

  getStats: async (): Promise<SanitarioStats> => {
    const userId = await getCurrentUserId();
    if (!userId) return { andamento: 0, concluido: 0, source: 'local' };
    if (!isBrowserOnline()) return readLocalStats(userId);

    try {
      const [andamentoResult, concluidoResult] = await Promise.all([
        supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'andamento'),
        supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
      ]);
      if (andamentoResult.error) throw andamentoResult.error;
      if (concluidoResult.error) throw concluidoResult.error;
      const stats = { andamento: andamentoResult.count ?? 0, concluido: concluidoResult.count ?? 0 };
      const capturedAt = await cacheStats(userId, stats);
      return { ...stats, source: 'remote', capturedAt };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      return readLocalStats(userId);
    }
  },

  prefetchFirstPages: async (userId: string): Promise<void> => {
    if (!userId || !isBrowserOnline() || (await getCurrentUserId()) !== userId) return;
    const [andamento, concluido, andamentoResult, concluidoResult] = await Promise.all([
      getRemotePage('andamento'),
      getRemotePage('concluido'),
      supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'andamento'),
      supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
    ]);
    if (andamentoResult.error) throw andamentoResult.error;
    if (concluidoResult.error) throw concluidoResult.error;
    await Promise.all([
      cachePage(userId, 'andamento', andamento),
      cachePage(userId, 'concluido', concluido),
      cacheStats(userId, { andamento: andamentoResult.count ?? 0, concluido: concluidoResult.count ?? 0 }),
    ]);
  },

  getById: async (id: string): Promise<ManejoSanitario | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const readLocal = async (): Promise<ManejoSanitario | null> => {
      const [andamento, concluido] = await Promise.all([
        readLocalPage(userId, 'andamento'),
        readLocalPage(userId, 'concluido'),
      ]);
      return [...andamento.data, ...concluido.data].find((manejo) => manejo.id === id) ?? null;
    };
    if (!isBrowserOnline()) return readLocal();

    try {
      const row = await getManejoRow(id);
      if (!row) return null;
      const manejos = await getManejos([row]);
      return manejos[0] ?? null;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      return readLocal();
    }
  },

  create: async (item: Omit<ManejoSanitario, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<ManejoSanitario> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    try {
      const id = `man-${crypto.randomUUID()}`;
      const manejo: ManejoSanitario = { ...item, id, status_sincronizacao: false, createdAt: '' };
      await validatePersistence(manejo);
      const payload = {
        id,
        nome_lote: manejo.nome_lote.trim(),
        data_manejo: manejo.data_manejo,
        responsavel_tecnico: manejo.responsavel_tecnico.trim(),
        tipo_manejo: manejo.tipo_manejo.trim(),
        observacoes: manejo.observacoes?.trim() || null,
        status: manejo.status,
        medicamentos: manejo.medicamentos.map((medicamento) => ({
          insumo_id: medicamento.insumo_id,
          nome_produto: medicamento.nome_produto.trim(),
          dose: medicamento.dose.trim(),
          quantidade_total: medicamento.quantidade_total,
        })),
        animais_ids: [...manejo.animais_ids],
        criar_lembrete: manejo.criar_lembrete ?? false,
        data_lembrete: manejo.data_lembrete || null,
        status_sincronizacao: false,
      };
      const { error } = await supabase.from('manejos_sanitarios').insert(payload);
      if (error) throw error;

      try {
        await syncRelations(manejo);
        if (manejo.status === 'concluido') await generateMovimentacoes(manejo);
      } catch (createError) {
        await removerMovimentacoesPorOrigem(id);
        await supabase.from('manejos_sanitarios').delete().eq('id', id);
        throw createError;
      }
      const created = await sanitarioService.getById(id);
      if (!created) throw new Error('Manejo não encontrado');
      return created;
    } catch (error) {
      if (error instanceof Error && error.name === 'DomainValidationError') throw error;
      throw withPersistenceError('Não foi possível salvar o manejo sanitário', error);
    }
  },

  update: async (id: string, updates: Partial<ManejoSanitario>): Promise<ManejoSanitario> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const previous = await sanitarioService.getById(id);
    if (!previous) throw new Error('Manejo não encontrado');
    const updated: ManejoSanitario = { ...previous, ...updates, id, status_sincronizacao: false };
    await validatePersistence(updated, previous);
    const { error } = await supabase.from('manejos_sanitarios').update({
      nome_lote: updated.nome_lote,
      data_manejo: updated.data_manejo,
      responsavel_tecnico: updated.responsavel_tecnico,
      tipo_manejo: updated.tipo_manejo,
      observacoes: updated.observacoes ?? null,
      status: updated.status,
      medicamentos: updated.medicamentos,
      animais_ids: updated.animais_ids,
      criar_lembrete: updated.criar_lembrete ?? false,
      data_lembrete: updated.data_lembrete || null,
      status_sincronizacao: false,
    }).eq('id', id);
    if (error) throw error;

    let previousMovimentacoes: Awaited<ReturnType<typeof removerMovimentacoesPorOrigem>> = [];
    let automaticReplaced = false;
    try {
      await syncRelations(updated);
      if (previous.status === 'concluido') {
        previousMovimentacoes = await removerMovimentacoesPorOrigem(id);
        automaticReplaced = true;
      }
      if (updated.status === 'concluido') await generateMovimentacoes(updated);
    } catch (updateError) {
      if (automaticReplaced) {
        await removerMovimentacoesPorOrigem(id);
        await restoreAutomaticMovimentacoes(previousMovimentacoes);
      }
      await supabase.from('manejos_sanitarios').update({
        nome_lote: previous.nome_lote,
        data_manejo: previous.data_manejo,
        responsavel_tecnico: previous.responsavel_tecnico,
        tipo_manejo: previous.tipo_manejo,
        observacoes: previous.observacoes ?? null,
        status: previous.status,
        medicamentos: previous.medicamentos,
        animais_ids: previous.animais_ids,
        criar_lembrete: previous.criar_lembrete ?? false,
        data_lembrete: previous.data_lembrete || null,
        status_sincronizacao: previous.status_sincronizacao,
      }).eq('id', id);
      await syncRelations(previous);
      throw updateError;
    }
    const result = await sanitarioService.getById(id);
    if (!result) throw new Error('Manejo não encontrado');
    return result;
  },

  delete: async (id: string): Promise<boolean> => {
    if (!isBrowserOnline()) throw new Error('Ação indisponível offline.');
    const manejo = await sanitarioService.getById(id);
    if (!manejo) return true;
    const movimentacoes = manejo.status === 'concluido' ? await removerMovimentacoesPorOrigem(id) : [];
    const { error } = await supabase.from('manejos_sanitarios').delete().eq('id', id);
    if (error) {
      if (movimentacoes.length > 0) await restoreAutomaticMovimentacoes(movimentacoes);
      throw error;
    }
    return true;
  },
};