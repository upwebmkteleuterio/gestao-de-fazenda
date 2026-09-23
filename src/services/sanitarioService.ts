import { supabase } from '@/integrations/supabase/client';
import { ManejoSanitario, MedicamentoAplicado } from '@/types/database';
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

const toNumber = (value: number | string): number => Number(value);

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
  const { data, error } = await supabase.from('manejos_sanitarios').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as ManejoDbRow | null;
};

const getManejos = async (rows: ManejoDbRow[]): Promise<ManejoSanitario[]> => {
  const relations = await getRelations(rows.map((row) => row.id));
  return rows.map((row) => toManejo(row, relations));
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

export const sanitarioService = {
  getAll: async (filters?: { search?: string; tipo?: string; status?: string; page?: number; limit?: number }): Promise<{ data: ManejoSanitario[]; total: number }> => {
    let query = supabase
      .from('manejos_sanitarios')
      .select('*', { count: 'exact' });

    if (filters?.search) {
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
      query = query.range((filters.page - 1) * filters.limit, filters.page * filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as ManejoDbRow[];
    return { data: await getManejos(rows), total: count ?? 0 };
  },

  getStats: async (): Promise<{ andamento: number; concluido: number }> => {
    const [andamentoResult, concluidoResult] = await Promise.all([
      supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'andamento'),
      supabase.from('manejos_sanitarios').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
    ]);
    if (andamentoResult.error) throw andamentoResult.error;
    if (concluidoResult.error) throw concluidoResult.error;
    return {
      andamento: andamentoResult.count ?? 0,
      concluido: concluidoResult.count ?? 0,
    };
  },

  getById: async (id: string): Promise<ManejoSanitario | null> => {
    const row = await getManejoRow(id);
    if (!row) return null;
    const manejos = await getManejos([row]);
    return manejos[0] ?? null;
  },

  create: async (item: Omit<ManejoSanitario, 'id' | 'createdAt' | 'status_sincronizacao'>): Promise<ManejoSanitario> => {
    const id = `man-${crypto.randomUUID()}`;
    const manejo: ManejoSanitario = {
      ...item,
      id,
      status_sincronizacao: false,
      createdAt: '',
    };

    const { error } = await supabase.from('manejos_sanitarios').insert({
      id,
      nome_lote: manejo.nome_lote,
      data_manejo: manejo.data_manejo,
      responsavel_tecnico: manejo.responsavel_tecnico,
      tipo_manejo: manejo.tipo_manejo,
      observacoes: manejo.observacoes ?? null,
      status: manejo.status,
      medicamentos: manejo.medicamentos,
      animais_ids: manejo.animais_ids,
      criar_lembrete: manejo.criar_lembrete ?? false,
      data_lembrete: manejo.data_lembrete ?? null,
      status_sincronizacao: false,
    });
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
  },

  update: async (id: string, updates: Partial<ManejoSanitario>): Promise<ManejoSanitario> => {
    const previous = await sanitarioService.getById(id);
    if (!previous) throw new Error('Manejo não encontrado');

    const updated: ManejoSanitario = {
      ...previous,
      ...updates,
      id,
      status_sincronizacao: false,
    };
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
      data_lembrete: updated.data_lembrete ?? null,
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
        data_lembrete: previous.data_lembrete ?? null,
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
    const manejo = await sanitarioService.getById(id);
    if (!manejo) return true;

    const movimentacoes = manejo.status === 'concluido'
      ? await removerMovimentacoesPorOrigem(id)
      : [];
    const { error } = await supabase.from('manejos_sanitarios').delete().eq('id', id);
    if (error) {
      if (movimentacoes.length > 0) await restoreAutomaticMovimentacoes(movimentacoes);
      throw error;
    }
    return true;
  },
};
