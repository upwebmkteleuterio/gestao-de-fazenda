import { supabase } from '@/integrations/supabase/client';
import { Animal, EventoReproducao } from '@/types/database';
import { animaisService } from './animaisService';

type ReproducaoDbRow = {
  id: string;
  animal_id: string;
  brinco_matriz: string;
  tipo_protocolo: EventoReproducao['tipo_protocolo'];
  data_principal: string;
  dados_protocolo: EventoReproducao['dados_protocolo'];
  resultado_dg: EventoReproducao['resultado_dg'] | null;
  data_dg: string | null;
  previsao_parto: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type ReproducaoDbWrite = {
  id?: string;
  animal_id: string;
  brinco_matriz: string;
  tipo_protocolo: EventoReproducao['tipo_protocolo'];
  data_principal: string;
  dados_protocolo: EventoReproducao['dados_protocolo'];
  resultado_dg?: EventoReproducao['resultado_dg'] | null;
  data_dg?: string | null;
  previsao_parto?: string | null;
  status_sincronizacao: boolean;
};

const toEvento = (row: ReproducaoDbRow): EventoReproducao => ({
  id: row.id,
  animal_id: row.animal_id,
  brinco_matriz: row.brinco_matriz,
  tipo_protocolo: row.tipo_protocolo,
  data_principal: row.data_principal,
  dados_protocolo: row.dados_protocolo ?? {},
  resultado_dg: row.resultado_dg ?? undefined,
  data_dg: row.data_dg ?? undefined,
  previsao_parto: row.previsao_parto ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const fetchEventos = async (): Promise<EventoReproducao[]> => {
  const { data, error } = await supabase
    .from('eventos_reproducao')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento);
};

const calcularPrevisaoParto = (dataRef?: string): string => {
  if (!dataRef) return '';
  const date = new Date(dataRef);
  if (isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + 285);
  return date.toISOString().split('T')[0];
};

const statusReprodutivoPorEvento = (evento: Pick<EventoReproducao, 'resultado_dg' | 'tipo_protocolo'>) => {
  if (evento.resultado_dg === 'cheia') return 'Gestante';
  if (evento.resultado_dg === 'vazia') return 'Vazia';
  if (evento.tipo_protocolo === 'iatf') return 'Inseminada (IATF)';
  if (evento.tipo_protocolo === 'monta_natural') return 'Coberta (Monta)';
  if (evento.tipo_protocolo === 'tetf') return 'Receptora (TETF)';
  return 'Diagnóstico';
};

const compareEventosMaisRecentes = (a: EventoReproducao, b: EventoReproducao): number => {
  const dataPrincipalDiff = new Date(b.data_principal).getTime() - new Date(a.data_principal).getTime();
  if (dataPrincipalDiff !== 0) return dataPrincipalDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

const getEventoMaisRecente = (
  eventos: EventoReproducao[],
  animalId: string,
): EventoReproducao | undefined =>
  eventos
    .filter((evento) => evento.animal_id === animalId)
    .sort(compareEventosMaisRecentes)[0];

const syncMatrizStatus = async (animalId: string, evento?: EventoReproducao) => {
  if (!evento) {
    await animaisService.update(animalId, {
      status_reprodutivo: 'Vazia',
      touro_cobertura: undefined,
    });
    return;
  }

  const updates: Partial<Animal> = {
    status_reprodutivo: statusReprodutivoPorEvento(evento),
  };
  if (evento.dados_protocolo?.touro !== undefined) {
    updates.touro_cobertura = evento.dados_protocolo.touro;
  }
  await animaisService.update(animalId, updates);
};

const syncAffectedMatrizes = async (animalIds: string[], eventos: EventoReproducao[]) => {
  for (const animalId of new Set(animalIds)) {
    await syncMatrizStatus(animalId, getEventoMaisRecente(eventos, animalId));
  }
};

const buildEventoPayload = (
  item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>,
  id: string,
  previsaoParto: string,
): ReproducaoDbWrite => ({
  id,
  animal_id: item.animal_id,
  brinco_matriz: item.brinco_matriz,
  tipo_protocolo: item.tipo_protocolo,
  data_principal: item.data_principal,
  dados_protocolo: item.dados_protocolo,
  resultado_dg: item.resultado_dg ?? null,
  data_dg: item.data_dg ?? null,
  previsao_parto: previsaoParto || null,
  status_sincronizacao: false,
});

const buildEventoPatch = (
  updates: Partial<EventoReproducao>,
  previsaoParto: string,
): Partial<ReproducaoDbWrite> => {
  const patch: Partial<ReproducaoDbWrite> = {
    previsao_parto: previsaoParto || null,
    status_sincronizacao: false,
  };

  if (updates.animal_id !== undefined) patch.animal_id = updates.animal_id;
  if (updates.brinco_matriz !== undefined) patch.brinco_matriz = updates.brinco_matriz;
  if (updates.tipo_protocolo !== undefined) patch.tipo_protocolo = updates.tipo_protocolo;
  if (updates.data_principal !== undefined) patch.data_principal = updates.data_principal;
  if (updates.dados_protocolo !== undefined) patch.dados_protocolo = updates.dados_protocolo;
  if ('resultado_dg' in updates) patch.resultado_dg = updates.resultado_dg ?? null;
  if ('data_dg' in updates) patch.data_dg = updates.data_dg ?? null;

  return patch;
};

export const reproducaoService = {
  getAll: async (
    filters?: {
      search?: string;
      protocolo?: string;
      resultadoDg?: string;
      dataInicio?: string;
      dataFim?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: EventoReproducao[]; total: number }> => {
    let query = supabase
      .from('eventos_reproducao')
      .select('*', { count: 'exact' });

    if (filters?.search) {
      const search = filters.search.replace(/[^\p{L}\p{N} _-]/gu, ' ');
      query = query.or(`brinco_matriz.ilike.%${search}%,dados_protocolo->>touro.ilike.%${search}%`);
    }
    if (filters?.protocolo && filters.protocolo !== 'all') query = query.eq('tipo_protocolo', filters.protocolo);
    if (filters?.resultadoDg && filters.resultadoDg !== 'all') query = query.eq('resultado_dg', filters.resultadoDg);
    if (filters?.dataInicio) query = query.gte('data_principal', filters.dataInicio);
    if (filters?.dataFim) query = query.lte('data_principal', filters.dataFim);

    query = query
      .order('data_principal', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (filters?.page !== undefined && filters.limit !== undefined) {
      query = query.range((filters.page - 1) * filters.limit, filters.page * filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return {
      data: ((data ?? []) as unknown as ReproducaoDbRow[]).map(toEvento),
      total: count ?? 0,
    };
  },

  getById: async (id: string): Promise<EventoReproducao | null> => {
    const list = await fetchEventos();
    return list.find((evento) => evento.id === id) ?? null;
  },

  create: async (
    item: Omit<EventoReproducao, 'id' | 'createdAt' | 'status_sincronizacao'>,
  ): Promise<EventoReproducao> => {
    const previsaoParto =
      item.resultado_dg === 'cheia' && !item.previsao_parto
        ? calcularPrevisaoParto(item.data_principal || item.data_dg)
        : item.previsao_parto ?? '';
    const payload = buildEventoPayload(item, `rep-${crypto.randomUUID()}`, previsaoParto);
    const { data, error } = await supabase.from('eventos_reproducao').insert(payload).select('*').single();
    if (error) throw error;

    const created = toEvento(data as unknown as ReproducaoDbRow);
    await syncAffectedMatrizes([created.animal_id], await fetchEventos());
    return created;
  },

  update: async (id: string, updates: Partial<EventoReproducao>): Promise<EventoReproducao> => {
    const list = await fetchEventos();
    const current = list.find((evento) => evento.id === id);
    if (!current) throw new Error('Evento não encontrado');

    const merged = { ...current, ...updates };
    let previsaoParto = updates.previsao_parto || current.previsao_parto;
    if (merged.resultado_dg === 'cheia' && !previsaoParto) {
      previsaoParto = calcularPrevisaoParto(merged.data_principal || merged.data_dg);
    }

    const patch = buildEventoPatch(updates, previsaoParto ?? '');
    const { data, error } = await supabase.from('eventos_reproducao').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    const updated = toEvento(data as unknown as ReproducaoDbRow);
    await syncAffectedMatrizes([current.animal_id, updated.animal_id], await fetchEventos());
    return updated;
  },

  delete: async (id: string): Promise<boolean> => {
    const list = await fetchEventos();
    const eventToDelete = list.find((evento) => evento.id === id);
    const { error } = await supabase.from('eventos_reproducao').delete().eq('id', id);
    if (error) throw error;

    if (eventToDelete) {
      await syncAffectedMatrizes([eventToDelete.animal_id], await fetchEventos());
    }

    return true;
  },
};
