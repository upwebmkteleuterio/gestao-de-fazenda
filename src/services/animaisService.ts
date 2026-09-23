import { supabase } from '@/integrations/supabase/client';
import { Animal, RegistroToqueAno } from '@/types/database';

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
type LegacyArrayRow = { id: string; animais_ids: string[] | null };

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
  qtd_descartes_brinco: row.qtd_descartes_brinco ?? undefined,
  categoria: row.categoria,
  pasto_id: row.pasto_id ?? undefined,
  pasto_nome: row.pasto_nome ?? undefined,
  status_reprodutivo: row.status_reprodutivo ?? undefined,
  touro_cobertura: row.touro_cobertura ?? undefined,
  tipo_cobertura: row.tipo_cobertura ?? undefined,
  filhos_ids: row.filhos_ids ?? undefined,
  historico_toque: row.historico_toque ?? undefined,
  observacoes: row.observacoes ?? undefined,
  peso_atual: row.peso_atual ?? undefined,
  data_pesagem_atual: row.data_pesagem_atual ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const sanitizeSearch = (value: string) => value.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();

const buildAnimalInsert = (
  animal: Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>,
  id: string,
  qtdDescartes: number,
): AnimalDbWrite => ({
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
  const { count, error } = await supabase
    .from('animais')
    .select('id', { count: 'exact', head: true })
    .eq('brinco', brinco)
    .eq('status', 'descarte');

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

    const { error: updateError } = await supabase
      .from(table)
      .update({ animais_ids: ids.filter((currentId) => currentId !== animalId) })
      .eq('id', row.id);

    if (updateError) throw updateError;
  }
};

type LegacyChildrenRow = { id: string; filhos_ids: string[] | null };

const syncLegacyChildren = async (animalId: string) => {
  const { data, error } = await supabase.from('animais').select('id, filhos_ids');
  if (error) throw error;

  const rows = (data ?? []) as unknown as LegacyChildrenRow[];
  for (const row of rows) {
    const ids = row.filhos_ids ?? [];
    if (row.id === animalId || !ids.includes(animalId)) continue;

    const { error: updateError } = await supabase
      .from('animais')
      .update({ filhos_ids: ids.filter((currentId) => currentId !== animalId), status_sincronizacao: false })
      .eq('id', row.id);

    if (updateError) throw updateError;
  }
};

export const animaisService = {
  getAll: async (filters?: {
    search?: string;
    sexo?: string;
    status?: string;
    categoria?: string;
    tipo?: string;
    pasto_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Animal[]; total: number }> => {
    let query = supabase
      .from('animais')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const search = filters?.search ? sanitizeSearch(filters.search) : '';
    if (search) {
      query = query.or(`brinco.ilike.*${search}*,raca.ilike.*${search}*,cdc.ilike.*${search}*,cdn.ilike.*${search}*`);
    }
    if (filters?.sexo && filters.sexo !== 'all') query = query.eq('sexo', filters.sexo);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.categoria && filters.categoria !== 'all') query = query.eq('categoria', filters.categoria);
    if (filters?.tipo && filters.tipo !== 'all') query = query.eq('tipo_animal', filters.tipo);
    if (filters?.pasto_id && filters.pasto_id !== 'all') query = query.eq('pasto_id', filters.pasto_id);

    if (filters?.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      query = query.range(start, start + filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: ((data ?? []) as unknown as AnimalDbRow[]).map(toAnimal),
      total: count ?? 0,
    };
  },

  getById: async (id: string): Promise<Animal | null> => {
    const { data, error } = await supabase.from('animais').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toAnimal(data as unknown as AnimalDbRow) : null;
  },

  create: async (newAnimal: Omit<Animal, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<Animal> => {
    const discardCount = newAnimal.status === 'descarte' ? await getDiscardCount(newAnimal.brinco) + 1 : newAnimal.qtd_descartes_brinco || 0;
    const id = `ani-${crypto.randomUUID()}`;
    const payload = buildAnimalInsert(newAnimal, id, discardCount);
    const { data, error } = await supabase.from('animais').insert(payload).select('*').single();
    if (error) throw error;
    return toAnimal(data as unknown as AnimalDbRow);
  },

  update: async (id: string, updates: Partial<Animal>): Promise<Animal> => {
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
    return toAnimal(data as unknown as AnimalDbRow);
  },

  delete: async (id: string): Promise<boolean> => {
    await syncLegacyArray('lotes', id, id);
    await syncLegacyArray('manejos_sanitarios', id, id);
    await syncLegacyChildren(id);

    const { error } = await supabase.from('animais').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  updatePesoAtual: async (animalId: string, peso: number, dataPesagem: string): Promise<void> => {
    const { error } = await supabase
      .from('animais')
      .update({ peso_atual: peso, data_pesagem_atual: dataPesagem, status_sincronizacao: false })
      .eq('id', animalId);

    if (error) throw error;
  },
};
