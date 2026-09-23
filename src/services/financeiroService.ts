import { supabase } from '@/integrations/supabase/client';
import { TransacaoFinanceira } from '@/types/database';

type TransacaoFinanceiraDbRow = {
  id: string;
  tipo: TransacaoFinanceira['tipo'];
  categoria: TransacaoFinanceira['categoria'];
  descricao: string;
  valor: number | string;
  data: string;
  status: TransacaoFinanceira['status'];
  animal_id: string | null;
  pasto_id: string | null;
  created_at: string;
};

const toTransacaoFinanceira = (row: TransacaoFinanceiraDbRow): TransacaoFinanceira => ({
  id: row.id,
  tipo: row.tipo,
  categoria: row.categoria,
  descricao: row.descricao,
  valor: Number(row.valor),
  data: row.data,
  status: row.status,
  animal_id: row.animal_id ?? undefined,
  pasto_id: row.pasto_id ?? undefined,
  createdAt: row.created_at,
});

const sanitizeSearch = (value: string) => value.replace(/[^\p{L}\p{N}\s-]/gu, '').trim();

export const financeiroService = {
  getAll: async (filters?: {
    search?: string;
    tipo?: string;
    categoria?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TransacaoFinanceira[]; total: number }> => {
    let query = supabase
      .from('transacoes_financeiras')
      .select('*', { count: 'exact' })
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    const search = filters?.search ? sanitizeSearch(filters.search) : '';
    if (search) {
      query = query.or(`descricao.ilike.*${search}*,categoria.ilike.*${search}*`);
    }
    if (filters?.tipo && filters.tipo !== 'all') query = query.eq('tipo', filters.tipo);
    if (filters?.categoria && filters.categoria !== 'all') query = query.eq('categoria', filters.categoria);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('data', filters.startDate);
    if (filters?.endDate) query = query.lt('data', filters.endDate);

    if (filters?.page !== undefined && filters.limit !== undefined) {
      const start = (filters.page - 1) * filters.limit;
      query = query.range(start, start + filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: ((data ?? []) as unknown as TransacaoFinanceiraDbRow[]).map(toTransacaoFinanceira),
      total: count ?? 0,
    };
  },

  getById: async (id: string): Promise<TransacaoFinanceira | null> => {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toTransacaoFinanceira(data as unknown as TransacaoFinanceiraDbRow) : null;
  },

  create: async (item: Omit<TransacaoFinanceira, 'id' | 'createdAt'>): Promise<TransacaoFinanceira> => {
    const id = `fin-${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .insert({
        id,
        tipo: item.tipo,
        categoria: item.categoria,
        descricao: item.descricao,
        valor: item.valor,
        data: item.data,
        status: item.status,
        animal_id: item.animal_id ?? null,
        pasto_id: item.pasto_id ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toTransacaoFinanceira(data as unknown as TransacaoFinanceiraDbRow);
  },

  update: async (id: string, updates: Partial<TransacaoFinanceira>): Promise<TransacaoFinanceira> => {
    const patch: Record<string, unknown> = {};
    if (updates.tipo !== undefined) patch.tipo = updates.tipo;
    if (updates.categoria !== undefined) patch.categoria = updates.categoria;
    if (updates.descricao !== undefined) patch.descricao = updates.descricao;
    if (updates.valor !== undefined) patch.valor = updates.valor;
    if (updates.data !== undefined) patch.data = updates.data;
    if (updates.status !== undefined) patch.status = updates.status;
    if ('animal_id' in updates) patch.animal_id = updates.animal_id ?? null;
    if ('pasto_id' in updates) patch.pasto_id = updates.pasto_id ?? null;

    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Transação não encontrada');
    return toTransacaoFinanceira(data as unknown as TransacaoFinanceiraDbRow);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('transacoes_financeiras').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  getResumo: async (): Promise<{ receitas: number; despesas: number; saldo: number; pendentes: number }> => {
    const { data, error } = await supabase.rpc('get_financeiro_resumo');
    if (error) throw error;

    const resumo = (data?.[0] ?? {}) as {
      receitas: number | string;
      despesas: number | string;
      saldo: number | string;
      pendentes: number | string;
    };

    return {
      receitas: Number(resumo.receitas),
      despesas: Number(resumo.despesas),
      saldo: Number(resumo.saldo),
      pendentes: Number(resumo.pendentes),
    };
  },
};
