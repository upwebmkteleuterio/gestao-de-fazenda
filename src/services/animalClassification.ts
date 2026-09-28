import { Animal, TipoAnimal } from '@/types/database';

const MONTHS_IN_YEAR = 12;
const FEMALE_REPRODUCTIVE_STATUSES = new Set([
  'parida',
  'gestante',
  'coberta',
  'cheia',
  'reprodutora',
  'matriz',
]);

type AnimalContext = ReadonlyArray<Partial<Pick<Animal, 'id' | 'mae_id'>>>;

const normalizeStatus = (value?: string) => (value || '')
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export const calculateAnimalAgeMonths = (birthDate?: string): number => {
  if (!birthDate) return 0;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return 0;

  const today = new Date();
  let months = (today.getFullYear() - year) * MONTHS_IN_YEAR + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;
  return Math.max(0, months);
};

export const classifyAnimalType = (
  animal: Partial<Animal>,
  context: AnimalContext | boolean = Boolean(animal.filhos_ids?.length),
): TipoAnimal => {
  const hasOffspring = Array.isArray(context)
    ? Boolean(animal.id && context.some((candidate) => candidate.mae_id === animal.id))
    : context;
  const ageMonths = calculateAnimalAgeMonths(animal.data_nascimento);
  const reproductiveStatus = normalizeStatus(animal.status_reprodutivo);
  const hasReproductiveSignal = hasOffspring
    || Boolean(animal.filhos_ids?.length)
    || FEMALE_REPRODUCTIVE_STATUSES.has(reproductiveStatus)
    || Boolean(animal.touro_cobertura?.trim());

  if (animal.sexo === 'F') {
    if (ageMonths <= 12) return 'bezerra';
    if (ageMonths <= 24) return 'novilha';
    return hasReproductiveSignal ? 'matriz' : 'vaca';
  }

  if (ageMonths <= 12) return 'bezerro';
  if (ageMonths <= 24) return 'garrote';
  if (ageMonths <= 36 && !hasReproductiveSignal) return 'novilho';
  return 'touro';
};

export const classifyAnimals = (animals: readonly Animal[]): Animal[] => (
  animals.map((animal) => ({
    ...animal,
    tipo_animal: classifyAnimalType(animal, animals),
  }))
);

export const animalTypeLabels: Record<TipoAnimal, string> = {
  vaca: 'Vaca',
  touro: 'Touro',
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  novilha: 'Novilha',
  garrote: 'Garrote',
  novilho: 'Novilho',
  matriz: 'Matriz',
};
