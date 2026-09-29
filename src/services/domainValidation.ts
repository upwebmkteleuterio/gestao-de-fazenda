import { Animal, EventoReproducao, Insumo, Lote, ManejoSanitario, MovimentacaoInsumo, Pastagem, Pesagem, ServicoPastagem, TipoAnimal, TransacaoFinanceira } from '@/types/database';
import { calculateAnimalAgeMonths, classifyAnimalType } from './animalClassification';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPRODUCAO_TEXT_LENGTH = 200;
export const MAX_FINANCEIRO_DESCRIPTION_LENGTH = 200;
export const MAX_FINANCEIRO_VALUE = 1_000_000_000_000;
export const MAX_REPORT_SEARCH_LENGTH = 200;
const MAX_REPRODUCAO_OBSERVACOES_LENGTH = 2000;
export const MAX_DOMAIN_TEXT_LENGTH = 200;
export const MAX_DOMAIN_OBSERVACOES_LENGTH = 2000;
export const MAX_DOMAIN_QUANTITY = 1_000_000_000;
export const MAX_ANIMAL_TEXT_LENGTH = 200;
export const MAX_ANIMAL_OBSERVACOES_LENGTH = 2000;
export const MAX_PESAGEM_OBSERVACOES_LENGTH = 2000;
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
  if (animal.brinco.trim().length > MAX_ANIMAL_TEXT_LENGTH) throw new DomainValidationError(`O ID/Brinco deve ter no máximo ${MAX_ANIMAL_TEXT_LENGTH} caracteres.`);
  if (!animal.tipo_animal) throw new DomainValidationError('Selecione o tipo de animal.');
  if (!animal.sexo) throw new DomainValidationError('Selecione o sexo do animal.');
  if (!animal.status) throw new DomainValidationError('Selecione o status do animal.');
  if (!animal.categoria) throw new DomainValidationError('Selecione a categoria do animal.');
  if (!isValidDate(animal.data_nascimento)) throw new DomainValidationError('Informe uma data de nascimento válida.');
  if (isFutureDate(animal.data_nascimento)) throw new DomainValidationError('A data de nascimento não pode ser futura.');
  const ageMonths = calculateAnimalAgeMonths(animal.data_nascimento);
  if (!Number.isFinite(ageMonths) || ageMonths < 0 || ageMonths > MAX_ANIMAL_AGE_MONTHS) throw new DomainValidationError('Informe uma idade entre 0 e 600 meses.');
  if (animal.data_descarte !== undefined && animal.data_descarte !== '') {
    if (!isValidDate(animal.data_descarte)) throw new DomainValidationError('Informe uma data de descarte válida.');
    if (isFutureDate(animal.data_descarte)) throw new DomainValidationError('A data de descarte não pode ser futura.');
    if (animal.data_descarte < animal.data_nascimento) throw new DomainValidationError('A data de descarte não pode ser anterior ao nascimento.');
  }
  if (animal.status === 'descarte' && !animal.motivo_descarte?.trim()) throw new DomainValidationError('Informe o motivo do descarte.');
  if (typeof animal.motivo_descarte === 'string' && animal.motivo_descarte.trim().length > MAX_ANIMAL_TEXT_LENGTH) throw new DomainValidationError(`O motivo do descarte deve ter no máximo ${MAX_ANIMAL_TEXT_LENGTH} caracteres.`);
  for (const [value, label] of [[animal.raca, 'A raça'], [animal.cor, 'A cor'], [animal.cdc, 'O CDC'], [animal.cdn, 'O CDN'], [animal.touro_cobertura, 'O touro de cobertura']] as const) {
    if (value !== undefined && value !== null && value.trim().length > MAX_ANIMAL_TEXT_LENGTH) throw new DomainValidationError(`${label} deve ter no máximo ${MAX_ANIMAL_TEXT_LENGTH} caracteres.`);
  }
  if (typeof animal.observacoes === 'string' && animal.observacoes.trim().length > MAX_ANIMAL_OBSERVACOES_LENGTH) throw new DomainValidationError(`As observações devem ter no máximo ${MAX_ANIMAL_OBSERVACOES_LENGTH} caracteres.`);
  if (animal.peso_atual !== undefined && animal.peso_atual !== null && (!Number.isFinite(animal.peso_atual) || animal.peso_atual < 0 || animal.peso_atual > MAX_ANIMAL_WEIGHT_KG)) {
    throw new DomainValidationError(`O peso atual deve estar entre 0 e ${MAX_ANIMAL_WEIGHT_KG} kg.`);
  }
  if (animal.data_pesagem_atual !== undefined && animal.data_pesagem_atual !== null && animal.data_pesagem_atual !== '') {
    if (!isValidDate(animal.data_pesagem_atual) || isFutureDate(animal.data_pesagem_atual)) throw new DomainValidationError('A data da pesagem atual deve ser válida e não futura.');
  }
  if (animal.historico_toque !== undefined) {
    if (!Array.isArray(animal.historico_toque)) throw new DomainValidationError('O histórico de toques é inválido.');
    const dates = new Set<string>();
    animal.historico_toque.forEach((toque) => {
      if (!toque || typeof toque.id !== 'string' || !isValidDate(toque.data) || isFutureDate(toque.data)) throw new DomainValidationError('Cada toque deve ter uma data válida e não futura.');
      if (dates.has(toque.data)) throw new DomainValidationError('Não é possível registrar dois toques para o mesmo animal na mesma data.');
      dates.add(toque.data);
      if (!['cheia', 'vazia'].includes(toque.resultado)) throw new DomainValidationError('Informe um resultado válido para cada toque.');
      if (typeof toque.observacoes === 'string' && toque.observacoes.trim().length > MAX_ANIMAL_OBSERVACOES_LENGTH) throw new DomainValidationError(`As observações do toque devem ter no máximo ${MAX_ANIMAL_OBSERVACOES_LENGTH} caracteres.`);
    });
  }
};

export const validatePesagemFields = (item: Partial<Pesagem>): void => {
  if (typeof item.animal_id !== 'string' || item.animal_id.trim() === '') throw new DomainValidationError('Selecione um animal válido.');
  if (typeof item.brinco_animal !== 'string' || item.brinco_animal.trim() === '') throw new DomainValidationError('O brinco do animal não foi identificado.');
  if (item.brinco_animal.trim().length > MAX_ANIMAL_TEXT_LENGTH) throw new DomainValidationError(`O brinco do animal deve ter no máximo ${MAX_ANIMAL_TEXT_LENGTH} caracteres.`);
  if (!isValidDate(item.data_pesagem)) throw new DomainValidationError('Informe uma data de pesagem válida.');
  if (isFutureDate(item.data_pesagem)) throw new DomainValidationError('A data de pesagem não pode ser futura.');
  if (typeof item.peso_kg !== 'number' || !Number.isFinite(item.peso_kg) || item.peso_kg <= 0 || item.peso_kg > MAX_PESAGEM_WEIGHT_KG) {
    throw new DomainValidationError(`Informe um peso positivo entre 0 e ${MAX_PESAGEM_WEIGHT_KG} kg.`);
  }
  if (typeof item.observacoes === 'string' && item.observacoes.trim().length > MAX_PESAGEM_OBSERVACOES_LENGTH) throw new DomainValidationError(`As observações devem ter no máximo ${MAX_PESAGEM_OBSERVACOES_LENGTH} caracteres.`);
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

const FINANCEIRO_TIPOS: readonly TransacaoFinanceira['tipo'][] = ['receita', 'despesa'];
const FINANCEIRO_CATEGORIAS: readonly TransacaoFinanceira['categoria'][] = [
  'venda_gado', 'venda_leite', 'compra_insumo', 'manutencao', 'veterinario', 'salarios', 'outros',
];
const FINANCEIRO_STATUS: readonly TransacaoFinanceira['status'][] = ['pago', 'pendente'];

const normalizeFinanceiroId = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new DomainValidationError(`${label} inválido.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_DOMAIN_TEXT_LENGTH || /[\\u0000-\\u001F\\u007F]/.test(normalized)) {
    throw new DomainValidationError(`${label} inválido.`);
  }
  return normalized;
};

export const validateFinanceiroFields = (item: Partial<TransacaoFinanceira>): void => {
  if (typeof item.descricao !== 'string' || !item.descricao.trim()) throw new DomainValidationError('Informe a descrição.');
  if (item.descricao.trim().length > MAX_FINANCEIRO_DESCRIPTION_LENGTH) throw new DomainValidationError(`A descrição deve ter no máximo ${MAX_FINANCEIRO_DESCRIPTION_LENGTH} caracteres.`);
  if (!FINANCEIRO_TIPOS.includes(item.tipo as TransacaoFinanceira['tipo'])) throw new DomainValidationError('Selecione um tipo financeiro válido.');
  if (!FINANCEIRO_CATEGORIAS.includes(item.categoria as TransacaoFinanceira['categoria'])) throw new DomainValidationError('Selecione uma categoria financeira válida.');
  if (!FINANCEIRO_STATUS.includes(item.status as TransacaoFinanceira['status'])) throw new DomainValidationError('Selecione um status financeiro válido.');
  if (typeof item.valor !== 'number' || !Number.isFinite(item.valor) || item.valor < 0 || item.valor > MAX_FINANCEIRO_VALUE) throw new DomainValidationError(`O valor deve ser um número entre 0 e ${MAX_FINANCEIRO_VALUE.toLocaleString('pt-BR')}.`);
  if (!isValidDate(item.data)) throw new DomainValidationError('Informe uma data financeira válida.');
  normalizeFinanceiroId(item.animal_id, 'O ID do animal');
  normalizeFinanceiroId(item.pasto_id, 'O ID do pasto');
};

export const sanitizeReportSearch = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new DomainValidationError('A busca do relatório é inválida.');
  const normalized = value.trim();
  if (normalized.length > MAX_REPORT_SEARCH_LENGTH) throw new DomainValidationError(`A busca deve ter no máximo ${MAX_REPORT_SEARCH_LENGTH} caracteres.`);
  return normalized.replace(/[^\\p{L}\\p{N} _-]/gu, ' ').replace(/\\s+/g, ' ').trim();
};

export const validateReportFilters = (filters: {
  dataEspecifica?: string;
  dataInicio?: string;
  dataFim?: string;
  touro?: string;
  protocolo?: string;
  resultadoDg?: string;
  search?: string;
  page?: number;
  limit?: number;
}): void => {
  if (filters.dataEspecifica !== undefined && filters.dataEspecifica !== '' && !isValidDate(filters.dataEspecifica)) throw new DomainValidationError('Informe uma data específica válida.');
  const hasDataInicio = Boolean(filters.dataInicio);
  const hasDataFim = Boolean(filters.dataFim);
  if (hasDataInicio || hasDataFim) {
    if (!hasDataInicio || !hasDataFim) throw new DomainValidationError('Informe a data inicial e a data final do intervalo.');
    validateDateRange(filters.dataInicio as string, filters.dataFim as string);
  }
  if (filters.touro !== undefined && filters.touro !== '' && filters.touro !== 'all' && !sanitizeReportSearch(filters.touro)) throw new DomainValidationError('Selecione um touro válido.');
  if (filters.protocolo !== undefined && !['all', 'iatf', 'monta_natural', 'tetf', 'dg'].includes(filters.protocolo)) throw new DomainValidationError('Selecione um protocolo válido.');
  if (filters.resultadoDg !== undefined && !['all', 'cheia', 'vazia', 'pendente'].includes(filters.resultadoDg)) throw new DomainValidationError('Selecione um resultado de DG válido.');
  sanitizeReportSearch(filters.search);
  if (filters.page !== undefined && (!Number.isInteger(filters.page) || filters.page < 1)) throw new DomainValidationError('A página do relatório é inválida.');
  if (filters.limit !== undefined && (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 500)) throw new DomainValidationError('O limite do relatório deve estar entre 1 e 500.');
};

export const parentTypes: Record<'mae' | 'pai', TipoAnimal[]> = {
  mae: ['vaca', 'matriz', 'novilha'],
  pai: ['touro', 'novilho', 'garrote', 'bezerro'],
};

export const isPlausibleAnimalWeight = (peso: number): boolean => peso < 20 || peso > 1500;
export const isPlausiblePesagem = (peso: number): boolean => peso < 20 || peso > 1500;

export const isValidAnimalReference = (reference: string, animals: Animal[], kind: 'mae' | 'pai', currentId?: string): boolean => {
  const animal = animals.find((candidate) => candidate.id === reference || candidate.brinco === reference);
  const derivedType = animal ? classifyAnimalType(animal, animals) : undefined;
  return Boolean(animal && animal.id !== currentId && derivedType && parentTypes[kind].includes(derivedType) && animal.status !== 'morto' && animal.status !== 'vendido');
};

export const isValidParentRecord = (reference: string, animals: Animal[], kind: 'mae' | 'pai', currentId?: string): Animal | undefined => {
  const animal = animals.find((candidate) => candidate.id === reference || candidate.brinco === reference);
  if (!animal || animal.id === currentId || !parentTypes[kind].includes(classifyAnimalType(animal, animals)) || ['morto', 'vendido'].includes(animal.status)) return undefined;
  return { ...animal, tipo_animal: classifyAnimalType(animal, animals) };
};

const validateOptionalDomainText = (value: unknown, label: string, maxLength = MAX_DOMAIN_TEXT_LENGTH): void => {
  if (value !== undefined && value !== null && typeof value !== 'string') throw new DomainValidationError(`${label} deve ser um texto.`);
  if (typeof value === 'string' && value.trim().length > maxLength) throw new DomainValidationError(`${label} deve ter no máximo ${maxLength} caracteres.`);
};

export const validatePastagemFields = (item: Partial<Pastagem>): void => {
  const nome = requireTrimmedText(item.nome_pasto, 'o nome da pastagem');
  if (nome.length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome da pastagem deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  const tipo = requireTrimmedText(item.tipo_capim, 'o tipo de capim');
  if (tipo.length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O tipo de capim deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (typeof item.area_ha !== 'number' || !Number.isFinite(item.area_ha) || item.area_ha <= 0 || item.area_ha > MAX_DOMAIN_QUANTITY) throw new DomainValidationError(`A área deve ser um número positivo menor que ${MAX_DOMAIN_QUANTITY} ha.`);
  if (typeof item.lotacao_maxima !== 'number' || !Number.isInteger(item.lotacao_maxima) || item.lotacao_maxima <= 0 || item.lotacao_maxima > MAX_DOMAIN_QUANTITY) throw new DomainValidationError(`A lotação máxima deve ser um inteiro positivo menor que ${MAX_DOMAIN_QUANTITY}.`);
  if (!isValidDate(item.data_entrada)) throw new DomainValidationError('Informe uma data de entrada válida.');
  if (item.data_saida_prevista !== undefined && item.data_saida_prevista !== '') {
    if (!isValidDate(item.data_saida_prevista)) throw new DomainValidationError('Informe uma data de saída prevista válida.');
    if (item.data_saida_prevista < item.data_entrada) throw new DomainValidationError('A saída prevista não pode ser anterior à entrada.');
  }
  if (item.usar_qtd_manual !== undefined && typeof item.usar_qtd_manual !== 'boolean') throw new DomainValidationError('A opção de quantidade manual é inválida.');
  const quantityFields: Array<[number | undefined, string]> = [
    [item.qtd_manual, 'A quantidade manual'],
    [item.vacas_count_manual, 'A quantidade de vacas/novilhas'],
    [item.bezerros_count_manual, 'A quantidade de bezerros/as'],
    [item.matrizes_count_manual, 'A quantidade de matrizes'],
    [item.touros_count_manual, 'A quantidade de touros/garrotes'],
  ];
  quantityFields.forEach(([value, label]) => {
    if (value !== undefined && (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > MAX_DOMAIN_QUANTITY)) {
      throw new DomainValidationError(`${label} deve ser um inteiro entre 0 e ${MAX_DOMAIN_QUANTITY}.`);
    }
  });
  if (item.usar_qtd_manual) {
    if (item.qtd_manual === undefined) throw new DomainValidationError('Informe a quantidade total de gado no modo manual.');
    if (item.qtd_manual > item.lotacao_maxima) throw new DomainValidationError('A quantidade manual não pode superar a lotação máxima do pasto.');
    const breakdown = [item.vacas_count_manual, item.bezerros_count_manual, item.matrizes_count_manual, item.touros_count_manual]
      .filter((value): value is number => value !== undefined);
    if (breakdown.reduce((total, value) => total + value, 0) > item.qtd_manual) throw new DomainValidationError('A soma das categorias não pode superar a quantidade total de gado.');
  }
};

export const validateServicoPastagemFields = (item: Partial<ServicoPastagem>, pastoEntrada?: string): void => {
  if (typeof item.pasto_id !== 'string' || !item.pasto_id.trim()) throw new DomainValidationError('Selecione uma pastagem válida para o serviço.');
  if (!['Roçagem', 'Adubação', 'Reforma', 'Pulverização', 'Manejo Sanitário', 'Outro'].includes(item.tipo_servico ?? '')) throw new DomainValidationError('Selecione um tipo de serviço válido.');
  if (!isValidDate(item.data)) throw new DomainValidationError('Informe uma data de serviço válida.');
  if (pastoEntrada && isValidDate(pastoEntrada) && item.data < pastoEntrada) throw new DomainValidationError('A data do serviço não pode ser anterior à entrada no pasto.');
  validateOptionalDomainText(item.nome_pasto, 'O nome da pastagem');
  validateOptionalDomainText(item.responsavel, 'O responsável');
  validateOptionalDomainText(item.observacoes, 'As observações', MAX_DOMAIN_OBSERVACOES_LENGTH);
};

export const validateLoteFields = (item: Partial<Lote>, existingAnimalIds?: readonly string[]): void => {
  const nome = requireTrimmedText(item.nome, 'o nome do lote');
  if (nome.length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome do lote deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (!Array.isArray(item.animais_ids)) throw new DomainValidationError('A lista de animais do lote é inválida.');
  const ids = item.animais_ids;
  if (ids.some((id) => typeof id !== 'string' || !id.trim())) throw new DomainValidationError('Informe apenas IDs de animais válidos.');
  if (new Set(ids).size !== ids.length) throw new DomainValidationError('Não é possível repetir animais no mesmo lote.');
  if (existingAnimalIds && ids.some((id) => !existingAnimalIds.includes(id))) throw new DomainValidationError('Um ou mais animais selecionados não foram encontrados.');
  if (item.pasto_id !== undefined && item.pasto_id !== null && (typeof item.pasto_id !== 'string' || !item.pasto_id.trim())) throw new DomainValidationError('O pasto informado para o lote é inválido.');
  validateOptionalDomainText(item.pasto_nome, 'O nome do pasto');
  if (item.data_criacao !== undefined && !isValidDate(item.data_criacao) && Number.isNaN(new Date(item.data_criacao).getTime())) throw new DomainValidationError('A data de criação do lote é inválida.');
};

export const validateSanitarioFields = (
  item: Partial<ManejoSanitario>,
  animalIds?: readonly string[],
  insumoIds?: readonly string[],
): void => {
  if (typeof item.nome_lote !== 'string' || !item.nome_lote.trim()) throw new DomainValidationError('Informe o nome do manejo ou lote.');
  if (item.nome_lote.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome do manejo ou lote deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (typeof item.responsavel_tecnico !== 'string') throw new DomainValidationError('O responsável técnico deve ser um texto.');
  validateOptionalDomainText(item.responsavel_tecnico, 'O responsável técnico');
  if (typeof item.tipo_manejo !== 'string' || !item.tipo_manejo.trim()) throw new DomainValidationError('Selecione ou informe um tipo de manejo válido.');
  if (item.tipo_manejo.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O tipo de manejo deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (!isValidDate(item.data_manejo)) throw new DomainValidationError('Informe uma data de manejo válida.');
  if (isFutureDate(item.data_manejo)) throw new DomainValidationError('A data do manejo não pode ser futura.');
  if (!['andamento', 'concluido'].includes(item.status ?? '')) throw new DomainValidationError('Selecione um status de manejo válido.');
  if (item.criar_lembrete !== undefined && typeof item.criar_lembrete !== 'boolean') throw new DomainValidationError('A opção de lembrete é inválida.');
  validateOptionalDomainText(item.observacoes, 'As observações', MAX_DOMAIN_OBSERVACOES_LENGTH);

  if (!Array.isArray(item.animais_ids)) throw new DomainValidationError('O grupo de animais é inválido.');
  const uniqueAnimals = new Set(item.animais_ids);
  if (uniqueAnimals.size !== item.animais_ids.length || item.animais_ids.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new DomainValidationError('Não é possível repetir ou informar animais inválidos no grupo.');
  }
  if (animalIds && item.animais_ids.some((id) => !animalIds.includes(id))) throw new DomainValidationError('Um ou mais animais selecionados não foram encontrados.');

  if (!Array.isArray(item.medicamentos)) throw new DomainValidationError('A lista de medicamentos é inválida.');
  const uniqueMedicamentos = new Set<string>();
  item.medicamentos.forEach((medicamento) => {
    if (!medicamento || typeof medicamento.insumo_id !== 'string' || !medicamento.insumo_id.trim()) throw new DomainValidationError('Selecione um insumo válido para cada medicamento.');
    if (uniqueMedicamentos.has(medicamento.insumo_id)) throw new DomainValidationError('Não é possível adicionar o mesmo medicamento duas vezes no manejo.');
    uniqueMedicamentos.add(medicamento.insumo_id);
    if (insumoIds && !insumoIds.includes(medicamento.insumo_id)) throw new DomainValidationError('Um ou mais medicamentos selecionados não foram encontrados.');
    if (typeof medicamento.nome_produto !== 'string' || !medicamento.nome_produto.trim()) throw new DomainValidationError('Informe o nome de cada medicamento.');
    if (medicamento.nome_produto.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome do medicamento deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
    if (typeof medicamento.dose !== 'string' || !medicamento.dose.trim()) throw new DomainValidationError('Informe a dose de cada medicamento.');
    if (medicamento.dose.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`A dose deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
    if (!Number.isFinite(medicamento.quantidade_total) || medicamento.quantidade_total <= 0 || medicamento.quantidade_total > MAX_DOMAIN_QUANTITY) throw new DomainValidationError(`A quantidade de cada medicamento deve ser positiva e menor que ${MAX_DOMAIN_QUANTITY}.`);
  });

  if (item.criar_lembrete) {
    if (!isValidDate(item.data_lembrete) || item.data_lembrete <= item.data_manejo) throw new DomainValidationError('A data do lembrete deve ser válida e posterior à data do manejo.');
  } else if (item.data_lembrete !== undefined && item.data_lembrete !== '') {
    if (!isValidDate(item.data_lembrete)) throw new DomainValidationError('Informe uma data de lembrete válida.');
  }
};

const insumoCategorias: Insumo['categoria'][] = ['medicamento', 'suplemento', 'racao', 'defensivo', 'outros'];
const insumoUnidades: Insumo['unidade_medida'][] = ['Frasco', 'Dose', 'Kg', 'Saco', 'Litro', 'Unidade'];

export const validateInsumoFields = (item: Partial<Insumo>): void => {
  if (typeof item.nome_produto !== 'string' || !item.nome_produto.trim()) throw new DomainValidationError('Informe o nome do produto.');
  if (item.nome_produto.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome do produto deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (!insumoCategorias.includes(item.categoria as Insumo['categoria'])) throw new DomainValidationError('Selecione uma categoria de insumo válida.');
  if (!insumoUnidades.includes(item.unidade_medida as Insumo['unidade_medida'])) throw new DomainValidationError('Selecione uma unidade de medida válida.');
  for (const [value, label] of [[item.estoque_atual, 'A quantidade inicial'], [item.estoque_minimo, 'O estoque mínimo'], [item.custo_unitario, 'O custo unitário']] as const) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_DOMAIN_QUANTITY) throw new DomainValidationError(`${label} deve ser um número finito entre 0 e ${MAX_DOMAIN_QUANTITY}.`);
  }
};

export const validateMovimentacaoFields = (item: Partial<MovimentacaoInsumo>): void => {
  if (typeof item.insumo_id !== 'string' || !item.insumo_id.trim()) throw new DomainValidationError('Selecione um insumo válido.');
  if (typeof item.nome_insumo !== 'string' || !item.nome_insumo.trim()) throw new DomainValidationError('O nome do insumo é obrigatório.');
  if (item.nome_insumo.trim().length > MAX_DOMAIN_TEXT_LENGTH) throw new DomainValidationError(`O nome do insumo deve ter no máximo ${MAX_DOMAIN_TEXT_LENGTH} caracteres.`);
  if (item.tipo !== 'entrada' && item.tipo !== 'saida') throw new DomainValidationError('Selecione um tipo de movimentação válido.');
  if (typeof item.quantidade !== 'number' || !Number.isFinite(item.quantidade) || item.quantidade <= 0 || item.quantidade > MAX_DOMAIN_QUANTITY) throw new DomainValidationError(`A quantidade deve ser positiva e menor que ${MAX_DOMAIN_QUANTITY}.`);
  if (!isValidDate(item.data_movimento)) throw new DomainValidationError('Informe uma data de movimentação válida.');
  if (isFutureDate(item.data_movimento)) throw new DomainValidationError('A data da movimentação não pode ser futura.');
  validateOptionalDomainText(item.observacao, 'A observação', MAX_DOMAIN_OBSERVACOES_LENGTH);
};
