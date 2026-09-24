import { supabase } from '@/integrations/supabase/client';
import { animaisService } from '@/services/animaisService';
import { Lote } from '@/types/database';

export type { Lote };

export interface CreateLoteDTO {
  nome: string;
  animais_ids: string[];
  pasto_id?: string;
  pasto_nome?: string;
}

type LoteDbRow = {
  id: string;
  nome: string;
  data_criacao: string;
  animais_ids: string[] | null;
  pasto_id: string | null;
  pasto_nome: string | null;
};

type LoteMembershipRow = { lote_id: string; animal_id: string };

const toLote = (row: LoteDbRow, animaisIds: string[]): Lote => ({
  id: row.id,
  nome: row.nome,
  data_criacao: row.data_criacao,
  animais_ids: animaisIds,
  pasto_id: row.pasto_id ?? undefined,
  pasto_nome: row.pasto_nome ?? undefined,
});

const getMemberships = async (loteIds?: string[]) => {
  if (loteIds && loteIds.length === 0) return [];

  let query = supabase.from('lote_animais').select('lote_id, animal_id');
  if (loteIds) query = query.in('lote_id', loteIds);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as LoteMembershipRow[];
};

const withMemberships = (rows: LoteDbRow[], memberships: LoteMembershipRow[]) => {
  const membershipsByLote = new Map<string, string[]>();
  for (const membership of memberships) {
    const current = membershipsByLote.get(membership.lote_id) ?? [];
    current.push(membership.animal_id);
    membershipsByLote.set(membership.lote_id, current);
  }

  return rows.map((row) => {
    const normalizedIds = membershipsByLote.get(row.id);
    return toLote(row, normalizedIds ?? row.animais_ids ?? []);
  });
};

const syncAnimalPasture = async (animalIds: string[], pastoId?: string, pastoNome?: string) => {
  await Promise.all(animalIds.map((animalId) => animaisService.updateRemote(animalId, {
    pasto_id: pastoId,
    pasto_nome: pastoNome,
  })));
};

const replaceMemberships = async (loteId: string, animalIds: string[]) => {
  const { error: deleteError } = await supabase.from('lote_animais').delete().eq('lote_id', loteId);
  if (deleteError) throw deleteError;

  if (animalIds.length === 0) return;

  const { error: insertError } = await supabase.from('lote_animais').insert(
    animalIds.map((animalId) => ({ lote_id: loteId, animal_id: animalId })),
  );
  if (insertError) throw insertError;
};

const getLoteRow = async (id: string) => {
  const { data, error } = await supabase.from('lotes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? data as unknown as LoteDbRow : null;
};

export const lotesService = {
  getAll: async (filters?: { search?: string; page?: number; limit?: number }): Promise<{ data: Lote[]; total: number }> => {
    let query = supabase
      .from('lotes')
      .select('*', { count: 'exact' })
      .order('data_criacao', { ascending: false });

    if (filters?.search) query = query.ilike('nome', `%${filters.search}%`);
    if (filters?.page !== undefined && filters.limit !== undefined) {
      const start = (filters.page - 1) * filters.limit;
      query = query.range(start, start + filters.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as LoteDbRow[];
    const memberships = await getMemberships(rows.map((row) => row.id));
    return {
      data: withMemberships(rows, memberships),
      total: count ?? 0,
    };
  },

  getById: async (id: string): Promise<Lote | null> => {
    const row = await getLoteRow(id);
    if (!row) return null;
    const memberships = await getMemberships([id]);
    return withMemberships([row], memberships)[0] ?? null;
  },

  create: async (dataOrNome: string | CreateLoteDTO, legacyAnimaisIds?: string[]): Promise<Lote> => {
    const isObject = typeof dataOrNome === 'object';
    const nome = isObject ? dataOrNome.nome : dataOrNome;
    const animaisIds = isObject ? dataOrNome.animais_ids : legacyAnimaisIds ?? [];
    const pastoId = isObject ? dataOrNome.pasto_id : undefined;
    const pastoNome = isObject ? dataOrNome.pasto_nome : undefined;
    const id = `lote-${crypto.randomUUID()}`;

    const { data, error } = await supabase.from('lotes').insert({
      id,
      nome,
      data_criacao: new Date().toISOString(),
      animais_ids: animaisIds,
      pasto_id: pastoId ?? null,
      pasto_nome: pastoNome ?? null,
    }).select('*').single();
    if (error) throw error;

    try {
      await replaceMemberships(id, animaisIds);
      if (pastoId && animaisIds.length > 0) await syncAnimalPasture(animaisIds, pastoId, pastoNome);
    } catch (syncError) {
      await supabase.from('lotes').delete().eq('id', id);
      throw syncError;
    }

    const row = data as unknown as LoteDbRow;
    return toLote(row, animaisIds);
  },

  update: async (id: string, updates: Partial<Lote>): Promise<Lote> => {
    const current = await lotesService.getById(id);
    if (!current) throw new Error('Lote não encontrado');

    const nextAnimaisIds = updates.animais_ids ?? current.animais_ids;
    const nextPastoId = 'pasto_id' in updates ? updates.pasto_id : current.pasto_id;
    const nextPastoNome = 'pasto_nome' in updates ? updates.pasto_nome : current.pasto_nome;
    const patch: Record<string, unknown> = {};

    if (updates.nome !== undefined) patch.nome = updates.nome;
    if (updates.data_criacao !== undefined) patch.data_criacao = updates.data_criacao;
    if (updates.animais_ids !== undefined) patch.animais_ids = updates.animais_ids;
    if ('pasto_id' in updates) patch.pasto_id = updates.pasto_id ?? null;
    if ('pasto_nome' in updates) patch.pasto_nome = updates.pasto_nome ?? null;

    const { data, error } = await supabase.from('lotes').update(patch).eq('id', id).select('*').single();
    if (error) throw error;

    try {
      if (updates.animais_ids !== undefined) await replaceMemberships(id, nextAnimaisIds);
      if ('pasto_id' in updates || 'pasto_nome' in updates) {
        await syncAnimalPasture(nextAnimaisIds, nextPastoId, nextPastoNome);
      }
    } catch (syncError) {
      throw syncError;
    }

    return toLote(data as unknown as LoteDbRow, nextAnimaisIds);
  },

  moverPasto: async (loteId: string, pastoId: string, pastoNome: string): Promise<Lote> => {
    return lotesService.update(loteId, { pasto_id: pastoId, pasto_nome: pastoNome });
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('lotes').delete().eq('id', id);
    if (error) throw error;
  },
};
