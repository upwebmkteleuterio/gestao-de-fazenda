import { supabase } from '@/integrations/supabase/client';
import { animaisService } from '@/services/animaisService';
import { Pastagem, ServicoPastagem } from '@/types/database';

type PastagemDbRow = {
  id: string;
  nome_pasto: string;
  tipo_capim: string;
  area_ha: number;
  lotacao_maxima: number;
  data_entrada: string;
  data_saida_prevista: string | null;
  qtd_manual: number | null;
  usar_qtd_manual: boolean;
  vacas_count_manual: number | null;
  bezerros_count_manual: number | null;
  matrizes_count_manual: number | null;
  touros_count_manual: number | null;
  qtd_animais: number | null;
  vacas_count: number | null;
  bezerros_count: number | null;
  matrizes_count: number | null;
  touros_count: number | null;
  created_at: string;
};

type PastagemDbWrite = Omit<PastagemDbRow, 'created_at'> & { created_at?: string };

const toNumberOrUndefined = (value: number | string | null | undefined): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

type ServicoDbRow = {
  id: string;
  pasto_id: string;
  nome_pasto: string | null;
  tipo_servico: ServicoPastagem['tipo_servico'];
  data: string;
  responsavel: string | null;
  observacoes: string | null;
  created_at: string;
};

const toPastagem = (row: PastagemDbRow): Pastagem => ({
  id: row.id,
  nome_pasto: row.nome_pasto,
  tipo_capim: row.tipo_capim,
  area_ha: Number(row.area_ha),
  lotacao_maxima: Number(row.lotacao_maxima),
  data_entrada: row.data_entrada,
  data_saida_prevista: row.data_saida_prevista ?? undefined,
  qtd_manual: toNumberOrUndefined(row.qtd_manual),
  usar_qtd_manual: row.usar_qtd_manual,
  vacas_count_manual: toNumberOrUndefined(row.vacas_count_manual),
  bezerros_count_manual: toNumberOrUndefined(row.bezerros_count_manual),
  matrizes_count_manual: toNumberOrUndefined(row.matrizes_count_manual),
  touros_count_manual: toNumberOrUndefined(row.touros_count_manual),
  qtd_animais: toNumberOrUndefined(row.qtd_animais),
  vacas_count: toNumberOrUndefined(row.vacas_count),
  bezerros_count: toNumberOrUndefined(row.bezerros_count),
  matrizes_count: toNumberOrUndefined(row.matrizes_count),
  touros_count: toNumberOrUndefined(row.touros_count),
  createdAt: row.created_at,
});

const toServico = (row: ServicoDbRow): ServicoPastagem => ({
  id: row.id,
  pasto_id: row.pasto_id,
  nome_pasto: row.nome_pasto ?? undefined,
  tipo_servico: row.tipo_servico,
  data: row.data,
  responsavel: row.responsavel ?? undefined,
  observacoes: row.observacoes ?? undefined,
  createdAt: row.created_at,
});

const buildPastagemInsert = (item: Omit<Pastagem, 'id' | 'createdAt'>, id: string): PastagemDbWrite => ({
  id,
  nome_pasto: item.nome_pasto,
  tipo_capim: item.tipo_capim,
  area_ha: item.area_ha,
  lotacao_maxima: item.lotacao_maxima,
  data_entrada: item.data_entrada,
  data_saida_prevista: item.data_saida_prevista ?? null,
  qtd_manual: item.qtd_manual ?? null,
  usar_qtd_manual: item.usar_qtd_manual ?? false,
  vacas_count_manual: item.vacas_count_manual ?? null,
  bezerros_count_manual: item.bezerros_count_manual ?? null,
  matrizes_count_manual: item.matrizes_count_manual ?? null,
  touros_count_manual: item.touros_count_manual ?? null,
  qtd_animais: 0,
  vacas_count: 0,
  bezerros_count: 0,
  matrizes_count: 0,
  touros_count: 0,
});

const buildPastagemPatch = (updates: Partial<Pastagem>): Partial<PastagemDbWrite> => {
  const patch: Partial<PastagemDbWrite> = {};
  if (updates.nome_pasto !== undefined) patch.nome_pasto = updates.nome_pasto;
  if (updates.tipo_capim !== undefined) patch.tipo_capim = updates.tipo_capim;
  if (updates.area_ha !== undefined) patch.area_ha = updates.area_ha;
  if (updates.lotacao_maxima !== undefined) patch.lotacao_maxima = updates.lotacao_maxima;
  if (updates.data_entrada !== undefined) patch.data_entrada = updates.data_entrada;
  if ('data_saida_prevista' in updates) patch.data_saida_prevista = updates.data_saida_prevista ?? null;
  if ('qtd_manual' in updates) patch.qtd_manual = updates.qtd_manual ?? null;
  if (updates.usar_qtd_manual !== undefined) patch.usar_qtd_manual = updates.usar_qtd_manual;
  if ('vacas_count_manual' in updates) patch.vacas_count_manual = updates.vacas_count_manual ?? null;
  if ('bezerros_count_manual' in updates) patch.bezerros_count_manual = updates.bezerros_count_manual ?? null;
  if ('matrizes_count_manual' in updates) patch.matrizes_count_manual = updates.matrizes_count_manual ?? null;
  if ('touros_count_manual' in updates) patch.touros_count_manual = updates.touros_count_manual ?? null;
  return patch;
};

const deriveCounts = async (pastos: Pastagem[]) => {
  const { data: animais } = await animaisService.getAll();

  return pastos.map((pasto) => {
    const animaisNoPasto = animais.filter((animal) => animal.pasto_id === pasto.id && animal.status === 'ativo');
    const autoQtd = animaisNoPasto.length;
    const qtdFinal = pasto.usar_qtd_manual && typeof pasto.qtd_manual === 'number'
      ? pasto.qtd_manual
      : typeof pasto.qtd_manual === 'number' && pasto.qtd_manual > 0 && autoQtd === 0
        ? pasto.qtd_manual
        : autoQtd;

    return {
      ...pasto,
      qtd_animais: qtdFinal,
      vacas_count: pasto.vacas_count_manual ?? animaisNoPasto.filter((animal) => ['vaca', 'novilha'].includes(animal.tipo_animal)).length,
      bezerros_count: pasto.bezerros_count_manual ?? animaisNoPasto.filter((animal) => ['bezerro', 'bezerra'].includes(animal.tipo_animal)).length,
      matrizes_count: pasto.matrizes_count_manual ?? animaisNoPasto.filter((animal) => animal.tipo_animal === 'matriz').length,
      touros_count: pasto.touros_count_manual ?? animaisNoPasto.filter((animal) => ['touro', 'garrote'].includes(animal.tipo_animal)).length,
    };
  });
};

export const pastagensService = {
  getAll: async (filters?: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Pastagem[]; total: number }> => {
    const { data, error } = await supabase.from('pastagens').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    let list = await deriveCounts(((data ?? []) as unknown as PastagemDbRow[]).map(toPastagem));

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      list = list.filter((pasto) => pasto.nome_pasto.toLowerCase().includes(search) || pasto.tipo_capim.toLowerCase().includes(search));
    }

    if (filters?.status && filters.status !== 'todos') {
      list = list.filter((pasto) => {
        if (filters.status === 'vazio') return pasto.qtd_animais === 0;
        if (filters.status === 'excedido') return pasto.qtd_animais > pasto.lotacao_maxima;
        if (filters.status === 'normal') return pasto.qtd_animais > 0 && pasto.qtd_animais <= pasto.lotacao_maxima;
        return true;
      });
    }

    const total = list.length;
    if (filters?.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      list = list.slice(start, start + filters.limit);
    }

    return { data: list, total };
  },

  getById: async (id: string): Promise<Pastagem | null> => {
    const result = await pastagensService.getAll();
    return result.data.find((pasto) => pasto.id === id) ?? null;
  },

  create: async (item: Omit<Pastagem, 'id' | 'createdAt'>): Promise<Pastagem> => {
    const id = `pas-${crypto.randomUUID()}`;
    const { data, error } = await supabase.from('pastagens').insert(buildPastagemInsert(item, id)).select('*').single();
    if (error) throw error;
    return toPastagem(data as unknown as PastagemDbRow);
  },

  update: async (id: string, updates: Partial<Pastagem>): Promise<Pastagem> => {
    const patch = buildPastagemPatch(updates);
    const { data, error } = await supabase.from('pastagens').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    const updated = await pastagensService.getById(id);
    return updated ?? toPastagem(data as unknown as PastagemDbRow);
  },

  delete: async (id: string): Promise<boolean> => {
    const animalsResult = await animaisService.getAll({ pasto_id: id });
    await Promise.all(animalsResult.data.map((animal) => animaisService.update(animal.id, { pasto_id: undefined, pasto_nome: undefined })));

    const { error } = await supabase.from('pastagens').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  getServicos: async (pastoId?: string): Promise<ServicoPastagem[]> => {
    let query = supabase.from('servicos_pastagem').select('*').order('data', { ascending: false });
    if (pastoId) query = query.eq('pasto_id', pastoId);

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as unknown as ServicoDbRow[]).map(toServico);
  },

  addServico: async (item: Omit<ServicoPastagem, 'id' | 'createdAt'>): Promise<ServicoPastagem> => {
    const id = `ser-${crypto.randomUUID()}`;
    const payload = {
      id,
      pasto_id: item.pasto_id,
      nome_pasto: item.nome_pasto ?? null,
      tipo_servico: item.tipo_servico,
      data: item.data,
      responsavel: item.responsavel ?? null,
      observacoes: item.observacoes ?? null,
    };
    const { data, error } = await supabase.from('servicos_pastagem').insert(payload).select('*').single();
    if (error) throw error;
    return toServico(data as unknown as ServicoDbRow);
  },
};
