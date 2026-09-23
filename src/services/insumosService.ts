import { supabase } from '@/integrations/supabase/client';
import { Insumo, MovimentacaoInsumo } from '@/types/database';

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

const getMovimentacoesRows = async (origemManejoId?: string): Promise<MovimentacaoDbRow[]> => {
  let query = supabase.from('movimentacoes_insumos').select('*').order('created_at', { ascending: false });
  if (origemManejoId) query = query.eq('origem_manejo_id', origemManejoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoDbRow[];
};

const restoreStock = async (movimentacoes: MovimentacaoDbRow[]): Promise<void> => {
  for (const movimentacao of movimentacoes) {
    const insumo = await getInsumoRow(movimentacao.insumo_id);
    if (!insumo) continue;

    const currentStock = toNumber(insumo.estoque_atual);
    const quantity = toNumber(movimentacao.quantidade);
    const nextStock = movimentacao.tipo === 'saida'
      ? currentStock + quantity
      : Math.max(0, currentStock - quantity);
    const { error } = await supabase
      .from('insumos')
      .update({ estoque_atual: nextStock })
      .eq('id', movimentacao.insumo_id);
    if (error) throw error;
  }
};

export const removerMovimentacoesPorOrigem = async (origemManejoId: string): Promise<MovimentacaoDbRow[]> => {
  const movimentacoes = await getMovimentacoesRows(origemManejoId);
  if (movimentacoes.length === 0) return [];

  await restoreStock(movimentacoes);
  const { error } = await supabase
    .from('movimentacoes_insumos')
    .delete()
    .eq('origem_manejo_id', origemManejoId);
  if (error) {
    await restoreStock(movimentacoes.map((movimentacao) => ({
      ...movimentacao,
      tipo: movimentacao.tipo === 'saida' ? 'entrada' : 'saida',
    })));
    throw error;
  }
  return movimentacoes;
};

export const insumosService = {
  getAll: async (categoria?: string, filters?: { search?: string; estoqueBaixo?: boolean; page?: number; limit?: number }): Promise<{ data: Insumo[]; total: number }> => {
    const rows = await getInsumosRows();
    let list = rows.map(toInsumo);

    if (categoria && categoria !== 'all') list = list.filter((item) => item.categoria === categoria);
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      list = list.filter((item) => item.nome_produto.toLowerCase().includes(search));
    }
    if (filters?.estoqueBaixo) list = list.filter((item) => item.estoque_atual <= item.estoque_minimo);

    list.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
    const total = list.length;
    if (filters?.page && filters.limit) {
      const start = (filters.page - 1) * filters.limit;
      list = list.slice(start, start + filters.limit);
    }
    return { data: list, total };
  },

  getById: async (id: string): Promise<Insumo | null> => {
    const row = await getInsumoRow(id);
    return row ? toInsumo(row) : null;
  },

  create: async (item: Omit<Insumo, 'id' | 'createdAt'>): Promise<Insumo> => {
    const id = `ins-${crypto.randomUUID()}`;
    const { data, error } = await supabase.from('insumos').insert({
      id,
      nome_produto: item.nome_produto,
      unidade_medida: item.unidade_medida,
      categoria: item.categoria,
      estoque_minimo: item.estoque_minimo,
      estoque_atual: item.estoque_atual,
      custo_unitario: item.custo_unitario,
    }).select('*').single();
    if (error) throw error;
    return toInsumo(data as unknown as InsumoDbRow);
  },

  update: async (id: string, updates: Partial<Insumo>): Promise<Insumo> => {
    const patch: Record<string, unknown> = {};
    if (updates.nome_produto !== undefined) patch.nome_produto = updates.nome_produto;
    if (updates.unidade_medida !== undefined) patch.unidade_medida = updates.unidade_medida;
    if (updates.categoria !== undefined) patch.categoria = updates.categoria;
    if (updates.estoque_minimo !== undefined) patch.estoque_minimo = updates.estoque_minimo;
    if (updates.estoque_atual !== undefined) patch.estoque_atual = updates.estoque_atual;
    if (updates.custo_unitario !== undefined) patch.custo_unitario = updates.custo_unitario;

    const { data, error } = await supabase.from('insumos').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Insumo não encontrado');
    return toInsumo(data as unknown as InsumoDbRow);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('insumos').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  registrarMovimentacao: async (mov: Omit<MovimentacaoInsumo, 'id' | 'createdAt'>): Promise<MovimentacaoInsumo> => {
    if (mov.quantidade <= 0) throw new Error('A quantidade deve ser maior que zero');

    const rows = await getInsumosRows();
    const insumo = rows.find((row) => row.id === mov.insumo_id)
      ?? rows.find((row) => row.nome_produto.trim().toLowerCase() === mov.nome_insumo.trim().toLowerCase());
    if (!insumo) throw new Error('Insumo não encontrado');

    const currentStock = toNumber(insumo.estoque_atual);
    if (mov.tipo === 'saida' && mov.quantidade > currentStock) {
      throw new Error('Estoque insuficiente para registrar a saída');
    }
    const nextStock = mov.tipo === 'entrada'
      ? currentStock + mov.quantidade
      : currentStock - mov.quantidade;

    const { error: stockError } = await supabase
      .from('insumos')
      .update({ estoque_atual: nextStock })
      .eq('id', insumo.id);
    if (stockError) throw stockError;

    const createdId = `mov-${crypto.randomUUID()}`;
    const { data, error } = await supabase.from('movimentacoes_insumos').insert({
      id: createdId,
      insumo_id: insumo.id,
      nome_insumo: mov.nome_insumo || insumo.nome_produto,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      data_movimento: mov.data_movimento,
      origem_manejo_id: mov.origem_manejo_id ?? null,
      observacao: mov.observacao ?? null,
    }).select('*').single();

    if (error) {
      await supabase.from('insumos').update({ estoque_atual: currentStock }).eq('id', insumo.id);
      throw error;
    }
    return toMovimentacao(data as unknown as MovimentacaoDbRow);
  },

  getMovimentacoes: async (insumoId?: string): Promise<MovimentacaoInsumo[]> => {
    let query = supabase.from('movimentacoes_insumos').select('*').order('created_at', { ascending: false });
    if (insumoId) query = query.eq('insumo_id', insumoId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as unknown as MovimentacaoDbRow[]).map(toMovimentacao);
  },
};
