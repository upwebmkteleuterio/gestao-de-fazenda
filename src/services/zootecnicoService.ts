import { supabase } from '@/integrations/supabase/client';
import { Animal } from '@/types/database';
import { animaisService } from './animaisService';
import { pesagensService } from './pesagensService';
import { ZootecnicoGmdPasto } from '@/pages/Indicadores/utils/zootecnicoReportUtils';

export type ZootecnicoSummary = {
  total_animais: number;
  descartes_count: number;
  bezerros_count: number;
  vacas_count: number;
  matrizes_count: number;
  touros_count: number;
  gmd_medio: number | null;
  dg_total: number;
  dg_cheias: number;
  custo_medio: number | null;
};

const numberOrNull = (value: number | string | null | undefined) => value === null || value === undefined ? null : Number(value);

export const zootecnicoService = {
  getSummary: async (): Promise<ZootecnicoSummary> => {
    const { data, error } = await supabase.rpc('get_zootecnico_report_summary');
    if (error) throw error;
    const row = ((data ?? [])[0] ?? {}) as Record<string, number | string | null>;
    return {
      total_animais: Number(row.total_animais ?? 0),
      descartes_count: Number(row.descartes_count ?? 0),
      bezerros_count: Number(row.bezerros_count ?? 0),
      vacas_count: Number(row.vacas_count ?? 0),
      matrizes_count: Number(row.matrizes_count ?? 0),
      touros_count: Number(row.touros_count ?? 0),
      gmd_medio: numberOrNull(row.gmd_medio),
      dg_total: Number(row.dg_total ?? 0),
      dg_cheias: Number(row.dg_cheias ?? 0),
      custo_medio: numberOrNull(row.custo_medio),
    };
  },
  getGmdPorPasto: async (limit = 100): Promise<ZootecnicoGmdPasto[]> => {
    const { data, error } = await supabase.rpc('get_zootecnico_gmd_por_pasto', { p_limit: limit });
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      pasto_id: String(row.pasto_id),
      pasto_nome: String(row.pasto_nome),
      gmd_medio: numberOrNull(row.gmd_medio as number | string | null),
      pesagens_count: Number(row.pesagens_count ?? 0),
    }));
  },
  getAllData: async (): Promise<{ animais: Animal[]; pesagens: Awaited<ReturnType<typeof pesagensService.getAll>>['data'] }> => {
    const batchSize = 500;
    const getBatches = async <T extends { data: T['data']; total: number }>(getPage: (page: number) => Promise<T>) => {
      const first = await getPage(1);
      const all = [first.data];
      for (let page = 2; (page - 1) * batchSize < first.total; page += 1) {
        all.push((await getPage(page)).data);
      }
      return all.flat();
    };
    const [animais, pesagens] = await Promise.all([
      getBatches((page) => animaisService.getAll({ page, limit: batchSize, includeHistorico: false })),
      getBatches((page) => pesagensService.getAll({ page, limit: batchSize })),
    ]);
    return { animais, pesagens };
  },
};