import { Animal, Pesagem, TipoAnimal } from '@/types/database';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
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