import { Animal, EventoReproducao, Pesagem, TipoAnimal } from '@/types/database';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPRODUCAO_TEXT_LENGTH = 200;
const MAX_REPRODUCAO_OBSERVACOES_LENGTH = 2000;
export const MAX_ANIMAL_AGE_MONTHS = 600;
export const MAX_ANIMAL_WEIGHT_KG = 5000;
export const MAX_PESAGEM_WEIGHT_KG = 5000;

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

export const isValidDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

export const isFutureDate = (value: string): boolean => value > new Date().toISOString().slice(0, 10);

export const validateAnimalFields = (animal: Partial<Animal>): void => {
  if (typeof animal.brinco !== 'string' || animal.brinco.trim() === '') throw new DomainValidationError('Informe o ID/Brinco do animal.');
  if (!animal.tipo_animal) throw new DomainValidationError('Selecione o tipo de animal.');
  if (!animal.sexo) throw new DomainValidationError('Selecione o sexo do animal.');
  if (!animal.status) throw new DomainValidationError('Selecione o status do animal.');
  if (!animal.categoria) throw new DomainValidationError('Selecione a categoria do animal.');
  if (!isValidDate(animal.data_nascimento)) throw new DomainValidationError('Informe uma data de nascimento válida.');
  if (isFutureDate(animal.data_nascimento)) throw new DomainValidationError('A data de nascimento não pode ser futura.');
  const ageMonths = (Date.now() - new Date(`${animal.data_nascimento}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > MAX_ANIMAL_AGE_MONTHS) throw new DomainValidationError('Informe uma idade entre 0 e 600 meses.');
  if (animal.data_descarte !== undefined && animal.data_descarte !== '') {
    if (!isValidDate(animal.data_descarte)) throw new DomainValidationError('Informe uma data de descarte válida.');
    if (isFutureDate(animal.data_descarte)) throw new DomainValidationError('A data de descarte não pode ser futura.');
  }
  if (animal.status === 'descarte' && !animal.motivo_descarte?.trim()) throw new DomainValidationError('Informe o motivo do descarte.');
  if (animal.peso_atual !== undefined && animal.peso_atual !== null && (!Number.isFinite(animal.peso_atual) || animal.peso_atual < 0 || animal.peso_atual > MAX_ANIMAL_WEIGHT_KG)) {
    throw new DomainValidationError(`O peso atual deve estar entre 0 e ${MAX_ANIMAL_WEIGHT_KG} kg.`);
  }
};

export const validatePesagemFields = (item: Partial<Pesagem>): void => {
  if (typeof item.animal_id !== 'string' || item.animal_id.trim() === '') throw new DomainValidationError('Selecione um animal válido.');
  if (typeof item.brinco_animal !== 'string' || item.brinco_animal.trim() === '') throw new DomainValidationError('O brinco do animal não foi identificado.');
  if (!isValidDate(item.data_pesagem)) throw new DomainValidationError('Informe uma data de pesagem válida.');
  if (isFutureDate(item.data_pesagem)) throw new DomainValidationError('A data de pesagem não pode ser futura.');
  if (typeof item.peso_kg !== 'number' || !Number.isFinite(item.peso_kg) || item.peso_kg <= 0 || item.peso_kg > MAX_PESAGEM_WEIGHT_KG) {
    throw new DomainValidationError(`Informe um peso positivo entre 0 e ${MAX_PESAGEM_WEIGHT_KG} kg.`);
  }
};

const requireTrimmedText = (value: unknown, label: string, maxLength = MAX_REPRODUCAO_TEXT_LENGTH): string => {
  if (typeof value !== 'string' || !value.trim()) throw new DomainValidationError(`Informe ${label}.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new DomainValidationError(`${label} deve ter no máximo ${maxLength} caracteres.`);
  return normalized;
};

const validateReproducaoDate = (value: unknown, label: string, optional = false): string => {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (!isValidDate(value)) throw new DomainValidationError(`Informe uma data válida para ${label}.`);
  if (isFutureDate(value)) throw new DomainValidationError(`A data de ${label} não pode ser futura.`);
  return value;
};

const validateReproducaoDates = (item: Partial<EventoReproducao>): void => {
  validateReproducaoDate(item.data_principal, 'o evento');
  if (item.data_dg) validateReproducaoDate(item.data_dg, 'o diagnóstico');

  if (item.tipo_protocolo !== 'iatf') return;
  const dados = item.dados_protocolo ?? {};
  const d0 = validateReproducaoDate(dados.d0, 'D0');
  const d8 = validateReproducaoDate(dados.d8, 'D8', true);
  const d10 = validateReproducaoDate(dados.d10, 'D10', true);
  if (d8 && d8 < d0) throw new DomainValidationError('A data D8 deve ser igual ou posterior ao D0.');
  if (d10 && d10 < (d8 || d0)) throw new DomainValidationError('A data D10 deve ser igual ou posterior à etapa anterior.');
  if (dados.data_ultrassom) validateReproducaoDate(dados.data_ultrassom, 'o ultrassom/DG', true);
  if (item.previsao_parto && !isValidDate(item.previsao_parto)) throw new DomainValidationError('Informe uma data válida para a previsão de parto.');
};

export const validateReproducaoFields = (item: Partial<EventoReproducao>): void => {
  if (!item.tipo_protocolo || !['iatf', 'monta_natural', 'tetf', 'dg'].includes(item.tipo_protocolo)) {
    throw new DomainValidationError('Selecione um protocolo reprodutivo válido.');
  }
  const brinco = typeof item.brinco_matriz === 'string' ? item.brinco_matriz.trim() : '';
  if (!brinco) throw new DomainValidationError('Informe ou selecione o brinco de um animal cadastrado.');
  if (brinco.length > MAX_REPRODUCAO_TEXT_LENGTH) throw new DomainValidationError('O brinco da matriz deve ter no máximo 200 caracteres.');
  validateReproducaoDates(item);

  const dados = item.dados_protocolo ?? {};
  if (dados.observacoes !== undefined && typeof dados.observacoes !== 'string') throw new DomainValidationError('As observações devem ser texto.');
  const observacoes = dados.observacoes?.trim() ?? '';
  if (observacoes.length > MAX_REPRODUCAO_OBSERVACOES_LENGTH) throw new DomainValidationError('As observações devem ter no máximo 2.000 caracteres.');

  if (item.tipo_protocolo === 'iatf') {
    requireTrimmedText(dados.d0, 'a data D0');
    requireTrimmedText(dados.touro, 'o touro/sêmen');
    const tipoSemen = requireTrimmedText(dados.tipo_semen, 'o tipo de sêmen');
    if (tipoSemen.length > MAX_REPRODUCAO_TEXT_LENGTH) throw new DomainValidationError('O tipo de sêmen deve ter no máximo 200 caracteres.');
    const ecc = requireTrimmedText(dados.condicao_corporal, 'a condição corporal (ECC)');
    const eccMatch = ecc.replace(',', '.').match(/^(\d+(?:\.\d+)?)(?:\s*\([^)]*\))?$/);
    const eccNumber = eccMatch ? Number(eccMatch[1]) : Number.NaN;
    if (!Number.isFinite(eccNumber) || eccNumber < 1 || eccNumber > 5) throw new DomainValidationError('A ECC deve ser numérica e ficar entre 1 e 5. Descrições devem ser registradas nas observações.');
    const dias = dados.dias_gestacao_previsao;
    if (!Number.isInteger(dias) || dias < 200 || dias > 400) throw new DomainValidationError('Os dias de previsão devem ser um inteiro entre 200 e 400.');
    if (item.previsao_parto) {
      const base = dados.d10 || dados.d0 || item.data_principal;
      const expected = new Date(`${base}T00:00:00`);
      expected.setDate(expected.getDate() + dias);
      if (expected.toISOString().slice(0, 10) !== item.previsao_parto) throw new DomainValidationError('A previsão de parto deve ser calculada a partir da data-base e dos dias informados.');
    }
  }

  if (item.tipo_protocolo === 'monta_natural') requireTrimmedText(dados.touro, 'o touro da Monta Natural');
  if (item.tipo_protocolo === 'tetf') {
    requireTrimmedText(dados.doadora, 'a doadora');
    requireTrimmedText(dados.touro, 'o touro');
    requireTrimmedText(dados.tipo_embriao, 'o tipo de embrião');
    requireTrimmedText(dados.receptora, 'a receptora');
  }
  if (item.tipo_protocolo === 'dg') {
    if (!['cheia', 'vazia'].includes(item.resultado_dg ?? '')) throw new DomainValidationError('Escolha explicitamente o resultado do DG: prenha ou vazia.');
    validateReproducaoDate(item.data_dg || item.data_principal, 'o diagnóstico');
  }
};

export const validateDateRange = (start?: string, end?: string): void => {
  if (start && !isValidDate(start)) throw new DomainValidationError('Informe uma data inicial válida para o período.');
  if (end && !isValidDate(end)) throw new DomainValidationError('Informe uma data final válida para o período.');
  if (start && end && start > end) throw new DomainValidationError('O período informado é inválido: a data inicial deve ser anterior ou igual à data final.');
};

export const parentTypes: Record<'mae' | 'pai', TipoAnimal[]> = {
  mae: ['vaca', 'matriz', 'novilha', 'bezerra'],
  pai: ['touro', 'garrote', 'bezerro'],
};

export const isPlausibleAnimalWeight = (peso: number): boolean => peso < 20 || peso > 1500;
export const isPlausiblePesagem = (peso: number): boolean => peso < 20 || peso > 1500;

export const isValidAnimalReference = (reference: string, animals: Animal[], kind: 'mae' | 'pai', currentId?: string): boolean => {
  const animal = animals.find((candidate) => candidate.id === reference || candidate.brinco === reference);
  return Boolean(animal && animal.id !== currentId && parentTypes[kind].includes(animal.tipo_animal) && animal.status !== 'morto' && animal.status !== 'vendido');
};

export const isValidParentRecord = (reference: string, animals: Animal[], kind: 'mae' | 'pai', currentId?: string): Animal | undefined => {
  const animal = animals.find((candidate) => candidate.id === reference || candidate.brinco === reference);
  if (!animal || animal.id === currentId || !parentTypes[kind].includes(animal.tipo_animal) || ['morto', 'vendido'].includes(animal.status)) return undefined;
  return animal;
};
