import { supabase } from '@/integrations/supabase/client';

export interface DashboardCategorySummary {
  PO: number;
  PA: number;
  PC: number;
  CO: number;
}

export interface DashboardCriticalStockItem {
  id: string;
  nome_produto: string;
  unidade_medida: string;
  estoque_minimo: number;
  estoque_atual: number;
}

export interface DashboardSummary {
  total_animais: number;
  animais_ativos: number;
  vacas_count: number;
  bezerros_count: number;
  touros_count: number;
  categorias: DashboardCategorySummary;
  gmd_medio: number | null;
  pesagens_com_gmd: number;
  dg_total: number;
  dg_cheias: number;
  estoque_critico_total: number;
  estoque_critico: DashboardCriticalStockItem[];
  receitas: number;
  despesas: number;
  pendentes: number;
  saldo: number;
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data, error } = await supabase.rpc('get_dashboard_summary');
    if (error) throw error;
    if (!data) throw new Error('Resumo do dashboard não encontrado');
    return data as unknown as DashboardSummary;
  },
};
