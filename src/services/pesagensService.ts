import { supabase } from '@/integrations/supabase/client';
import { Pesagem } from '@/types/database';
import { animaisService } from './animaisService';

type PesagemDbRow = {
  id: string;
  animal_id: string;
  brinco_animal: string;
  tipo_animal: Pesagem['tipo_animal'] | null;
  peso_kg: number;
  data_pesagem: string;
  peso_anterior: number | null;
  data_pesagem_anterior: string | null;
  ganho_peso_kg: number | null;
  gmd_calculado: number | null;
  dias_intervalo: number | null;
  observacoes: string | null;
  status_sincronizacao: boolean;
  created_at: string;
};

type PesagemDbWrite = {
  id?: string;
  animal_id: string;
  brinco_animal: string;
  tipo_animal?: Pesagem['tipo_animal'] | null;
  peso_kg: number;
  data_pesagem: string;
  peso_anterior?: number | null;
  data_pesagem_anterior?: string | null;
  ganho_peso_kg?: number | null;
  gmd_calculado?: number | null;
  dias_intervalo?: number | null;
  observacoes?: string | null;
  status_sincronizacao: boolean;
};

const toPesagem = (row: PesagemDbRow): Pesagem => ({
  id: row.id,
  animal_id: row.animal_id,
  brinco_animal: row.brinco_animal,
  tipo_animal: row.tipo_animal ?? undefined,
  peso_kg: Number(row.peso_kg),
  data_pesagem: row.data_pesagem,
  peso_anterior: row.peso_anterior === null ? undefined : Number(row.peso_anterior),
  data_pesagem_anterior: row.data_pesagem_anterior ?? undefined,
  ganho_peso_kg: row.ganho_peso_kg === null ? undefined : Number(row.ganho_peso_kg),
  gmd_calculado: row.gmd_calculado === null ? undefined : Number(row.gmd_calculado),
  dias_intervalo: row.dias_intervalo === null ? undefined : Number(row.dias_intervalo),
  observacoes: row.observacoes ?? undefined,
  status_sincronizacao: row.status_sincronizacao,
  createdAt: row.created_at,
});

const fetchPesagens = async (): Promise<Pesagem[]> => {
  const { data, error } = await supabase.from('pesagens').select('*');
  if (error) throw error;
  return ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
};

const syncAnimalPesoAtual = async (animalIds: string[], pesagens: Pesagem[]): Promise<void> => {
  const uniqueAnimalIds = [...new Set(animalIds)];

  await Promise.all(uniqueAnimalIds.map(async (animalId) => {
    const latest = pesagens
      .filter((pesagem) => pesagem.animal_id === animalId)
      .sort((a, b) => {
        const dateDiff = new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime();
        return dateDiff !== 0 ? dateDiff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })[0];

    await animaisService.updatePesoAtual(
      animalId,
      latest?.peso_kg ?? null,
      latest?.data_pesagem ?? null,
    );
  }));
};

const calcularGMD = (animalId: string, novoPeso: number, dataNova: string, pesagensExistentes: Pesagem[]) => {
  const pesagensAnteriores = pesagensExistentes
    .filter((p) => p.animal_id === animalId && p.data_pesagem < dataNova)
    .sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime());

  if (pesagensAnteriores.length === 0) {
    return {
      gmd: undefined,
      diasIntervalo: undefined,
      pesoAnterior: undefined,
      dataAnterior: undefined,
      ganhoPeso: undefined,
    };
  }

  const ultimaPesagem = pesagensAnteriores[0];
  const d1 = new Date(ultimaPesagem.data_pesagem);
  const d2 = new Date(dataNova);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diasCorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diasCorridos <= 0) {
    return {
      gmd: undefined,
      diasIntervalo: undefined,
      pesoAnterior: ultimaPesagem.peso_kg,
      dataAnterior: ultimaPesagem.data_pesagem,
      ganhoPeso: 0,
    };
  }

  const ganho = novoPeso - ultimaPesagem.peso_kg;
  return {
    gmd: Number((ganho / diasCorridos).toFixed(2)),
    diasIntervalo: diasCorridos,
    pesoAnterior: ultimaPesagem.peso_kg,
    dataAnterior: ultimaPesagem.data_pesagem,
    ganhoPeso: Number(ganho.toFixed(2)),
  };
};

const enrichPesagensComComparativo = (list: Pesagem[]): Pesagem[] =>
  list.map((item) => {
    const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, list.filter((p) => p.id !== item.id));
    return {
      ...item,
      peso_anterior: item.peso_anterior ?? calc.pesoAnterior,
      data_pesagem_anterior: item.data_pesagem_anterior ?? calc.dataAnterior,
      ganho_peso_kg: item.ganho_peso_kg ?? calc.ganhoPeso,
      gmd_calculado: item.gmd_calculado ?? calc.gmd,
      dias_intervalo: item.dias_intervalo ?? calc.diasIntervalo,
    };
  });

const buildPesagemPayload = (
  item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>,
  id: string,
  calc: ReturnType<typeof calcularGMD>,
): PesagemDbWrite => ({
  id,
  animal_id: item.animal_id,
  brinco_animal: item.brinco_animal,
  tipo_animal: item.tipo_animal ?? null,
  peso_kg: item.peso_kg,
  data_pesagem: item.data_pesagem,
  peso_anterior: calc.pesoAnterior ?? null,
  data_pesagem_anterior: calc.dataAnterior ?? null,
  ganho_peso_kg: calc.ganhoPeso ?? null,
  gmd_calculado: calc.gmd ?? null,
  dias_intervalo: calc.diasIntervalo ?? null,
  observacoes: item.observacoes ?? null,
  status_sincronizacao: false,
});

const buildPesagemPatch = (
  updates: Partial<Pesagem>,
  calc: ReturnType<typeof calcularGMD>,
): Partial<PesagemDbWrite> => {
  const patch: Partial<PesagemDbWrite> = {
    peso_anterior: calc.pesoAnterior ?? null,
    data_pesagem_anterior: calc.dataAnterior ?? null,
    ganho_peso_kg: calc.ganhoPeso ?? null,
    gmd_calculado: calc.gmd ?? null,
    dias_intervalo: calc.diasIntervalo ?? null,
    status_sincronizacao: false,
  };

  if (updates.animal_id !== undefined) patch.animal_id = updates.animal_id;
  if (updates.brinco_animal !== undefined) patch.brinco_animal = updates.brinco_animal;
  if (updates.tipo_animal !== undefined) patch.tipo_animal = updates.tipo_animal;
  if (updates.peso_kg !== undefined) patch.peso_kg = updates.peso_kg;
  if (updates.data_pesagem !== undefined) patch.data_pesagem = updates.data_pesagem;
  if ('observacoes' in updates) patch.observacoes = updates.observacoes ?? null;

  return patch;
};

export const pesagensService = {
  getAll: async (filters?: {
    search?: string;
    tipoAnimal?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Pesagem[]; total: number }> => {
    let query = supabase
      .from('pesagens')
      .select('*', { count: 'exact' });

    if (filters?.search) query = query.ilike('brinco_animal', `%${filters.search}%`);
    if (filters?.tipoAnimal && filters.tipoAnimal !== 'all') query = query.eq('tipo_animal', filters.tipoAnimal);
    if (filters?.startDate) query = query.gte('data_pesagem', filters.startDate);
    if (filters?.endDate) query = query.lte('data_pesagem', filters.endDate);

    query = query
      .order('data_pesagem', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (filters?.page !== undefined && filters.limit !== undefined) {
      query = query.range((filters.page - 1) * filters.limit, filters.page * filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return {
      data: ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem),
      total: count ?? 0,
    };
  },

  getRecent: async (): Promise<Pesagem[]> => {
    const { data, error } = await supabase
      .from('pesagens')
      .select('id, animal_id, brinco_animal, tipo_animal, peso_kg, data_pesagem, peso_anterior, data_pesagem_anterior, ganho_peso_kg, gmd_calculado, dias_intervalo, observacoes, status_sincronizacao, created_at')
      .order('data_pesagem', { ascending: false })
      .order('created_at', { ascending: false })
      .range(0, 4);
    if (error) throw error;
    return ((data ?? []) as unknown as PesagemDbRow[]).map(toPesagem);
  },

  getById: async (id: string): Promise<Pesagem | null> => {
    const list = enrichPesagensComComparativo(await fetchPesagens());
    return list.find((p) => p.id === id) ?? null;
  },

  create: async (
    item: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>,
  ): Promise<Pesagem> => {
    const existing = await fetchPesagens();
    const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, existing);
    const payload = buildPesagemPayload(item, `pes-${crypto.randomUUID()}`, calc);
    const { data, error } = await supabase.from('pesagens').insert(payload).select('*').single();
    if (error) throw error;

    await animaisService.updatePesoAtual(item.animal_id, item.peso_kg, item.data_pesagem);
    return toPesagem(data as unknown as PesagemDbRow);
  },

  createGroup: async (
    pesagens: Omit<Pesagem, 'id' | 'createdAt' | 'status_sincronizacao'>[],
  ): Promise<Pesagem[]> => {
    const existing = await fetchPesagens();
    const createdList: Pesagem[] = [];

    for (const item of pesagens) {
      const calc = calcularGMD(item.animal_id, item.peso_kg, item.data_pesagem, [...existing, ...createdList]);
      const payload = buildPesagemPayload(item, `pes-${crypto.randomUUID()}`, calc);
      const { data, error } = await supabase.from('pesagens').insert(payload).select('*').single();
      if (error) throw error;

      const created = toPesagem(data as unknown as PesagemDbRow);
      createdList.push(created);
      await animaisService.updatePesoAtual(item.animal_id, item.peso_kg, item.data_pesagem);
    }

    return createdList;
  },

  update: async (id: string, updates: Partial<Pesagem>): Promise<Pesagem> => {
    const allPesagens = await fetchPesagens();
    const current = allPesagens.find((p) => p.id === id);
    if (!current) throw new Error('Pesagem não encontrada');

    const animalId = updates.animal_id ?? current.animal_id;
    const novoPeso = updates.peso_kg ?? current.peso_kg;
    const novaData = updates.data_pesagem ?? current.data_pesagem;
    const calc = calcularGMD(animalId, novoPeso, novaData, allPesagens.filter((p) => p.id !== id));
    const patch = buildPesagemPatch(updates, calc);

    const { data, error } = await supabase.from('pesagens').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    const pesagensRestantes = await fetchPesagens();
    await syncAnimalPesoAtual([current.animal_id, animalId], pesagensRestantes);
    return toPesagem(data as unknown as PesagemDbRow);
  },

  delete: async (id: string): Promise<boolean> => {
    const pesagens = await fetchPesagens();
    const current = pesagens.find((pesagem) => pesagem.id === id);
    const { error } = await supabase.from('pesagens').delete().eq('id', id);
    if (error) throw error;

    if (current) {
      const pesagensRestantes = pesagens.filter((pesagem) => pesagem.id !== id);
      await syncAnimalPesoAtual([current.animal_id], pesagensRestantes);
    }
    return true;
  },
};
