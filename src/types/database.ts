// Interfaces TypeScript para o Esquema do Banco de Dados (Supabase / PostgreSQL)

export type TipoAnimal = 'vaca' | 'touro' | 'bezerra' | 'bezerro' | 'novilha' | 'garrote' | 'matriz';
export type SexoAnimal = 'M' | 'F';
export type StatusAnimal = 'ativo' | 'descarte' | 'morto' | 'vendido';
export type CategoriaAnimal = 'PA' | 'PC' | 'PO' | 'CO';
export type DGToqueResultado = 'cheia' | 'vazia' | 'pendente';
export type TipoCobertura = 'Inseminação' | 'Monta Natural' | 'Monta' | 'Inseminacao' | 'IATF';
export type AnimalSyncStatus = 'synced' | 'pending' | 'processing' | 'error';

export interface RegistroToqueAno {
  id: string;
  data: string;
  ano: number;
  brinco: string;
  resultado: 'cheia' | 'vazia';
  observacoes?: string;
}

export interface Animal {
  id: string;
  brinco: string;
  tipo_animal: TipoAnimal;
  sexo: SexoAnimal;
  raca?: string;
  cor?: string;
  data_nascimento: string; // ISO date format YYYY-MM-DD
  mae_id?: string;
  pai_id?: string;
  cdc?: string; // Cadastro de Cobertura ABCZ
  cdn?: string; // Cadastro de Nascimento ABCZ
  status: StatusAnimal;
  motivo_descarte?: string;
  data_descarte?: string;
  qtd_descartes_brinco?: number; // Contador acumulado de descartes para o mesmo brinco
  categoria: CategoriaAnimal;
  pasto_id?: string;
  pasto_nome?: string;
  status_reprodutivo?: string; // e.g. 'Coberta', 'Parida', 'Solteira', 'Gestante'
  touro_cobertura?: string;
  tipo_cobertura?: TipoCobertura;
  filhos_ids?: string[]; // IDs de bezerros vinculados à matriz
  historico_toque?: RegistroToqueAno[]; // Registro de Toque Ano a Ano
  observacoes?: string;
  peso_atual?: number;
  data_pesagem_atual?: string;
  status_sincronizacao: boolean;
  createdAt: string;
  syncStatus?: AnimalSyncStatus;
  syncError?: string;
  localDeleted?: boolean;
  /** Sinaliza conflito legado de identidade sem misturar os históricos. */
  brinco_duplicado?: boolean;
}

export interface Pesagem {
  /** Identidade duplicada legada; o histórico permanece separado por animal_id. */
  brinco_duplicado?: boolean;
  id: string;
  animal_id: string;
  brinco_animal: string;
  tipo_animal?: TipoAnimal;
  peso_kg: number;
  data_pesagem: string; // YYYY-MM-DD
  // Dados da 1ª pesagem (pesagem anterior) para comparação direta
  peso_anterior?: number;
  data_pesagem_anterior?: string;
  ganho_peso_kg?: number;
  gmd_calculado?: number; // (Peso Atual - Peso Anterior) / Dias Corridos
  dias_intervalo?: number;
  observacoes?: string;
  status_sincronizacao: boolean;
  createdAt: string;
}

export type PastagemSyncStatus = 'synced' | 'pending' | 'processing' | 'error';

export interface Pastagem {
  id: string;
  nome_pasto: string;
  tipo_capim: string;
  area_ha: number;
  lotacao_maxima: number;
  data_entrada: string;
  data_saida_prevista?: string;
  // Campos manuais ou agregados de quantidade de gado
  qtd_manual?: number;
  usar_qtd_manual?: boolean;
  vacas_count_manual?: number;
  bezerros_count_manual?: number;
  matrizes_count_manual?: number;
  touros_count_manual?: number;
  // Campos agregados em tempo real
  qtd_animais?: number;
  vacas_count?: number;
  bezerros_count?: number;
  matrizes_count?: number;
  touros_count?: number;
  createdAt: string;
  syncStatus?: PastagemSyncStatus;
  syncError?: string;
  localDeleted?: boolean;
}

export interface ServicoPastagem {
  id: string;
  pasto_id: string;
  nome_pasto?: string;
  tipo_servico: 'Roçagem' | 'Adubação' | 'Reforma' | 'Pulverização' | 'Manejo Sanitário' | 'Outro';
  data: string;
  responsavel?: string;
  observacoes?: string;
  createdAt: string;
}

export interface EventoReproducao {
  id: string;
  animal_id: string;
  brinco_matriz: string;
  tipo_protocolo: 'iatf' | 'monta_natural' | 'tetf' | 'dg';
  data_principal: string;
  dados_protocolo: {
    d0?: string;
    d8?: string;
    d10?: string;
    touro?: string;
    tipo_semen?: string;
    condicao_corporal?: string;
    data_ultrassom?: string;
    reimplantou?: boolean;
    vacas_selecionadas?: string[]; // IDs ou Brincos para lote de Monta Natural
    doadora?: string;
    tipo_embriao?: string;
    receptora?: string;
    dias_gestacao_previsao?: number;
    observacoes?: string;
  };
  resultado_dg?: DGToqueResultado;
  data_dg?: string;
  previsao_parto?: string;
  status_sincronizacao: boolean;
  createdAt: string;
}

export interface MedicamentoAplicado {
  insumo_id: string;
  nome_produto: string;
  dose: string;
  quantidade_total: number;
}

export interface ManejoSanitario {
  id: string;
  nome_lote: string;
  data_manejo: string;
  responsavel_tecnico: string;
  tipo_manejo: 'Vacinação' | 'Vermifugação' | 'Tratamento' | 'Exames' | 'Outro' | (string & {});
  observacoes?: string;
  status: 'andamento' | 'concluido';
  medicamentos: MedicamentoAplicado[];
  animais_ids: string[];
  criar_lembrete?: boolean;
  data_lembrete?: string;
  status_sincronizacao: boolean;
  createdAt: string;
}

export interface Insumo {
  id: string;
  nome_produto: string;
  unidade_medida: 'Frasco' | 'Dose' | 'Kg' | 'Saco' | 'Litro' | 'Unidade';
  categoria: 'medicamento' | 'suplemento' | 'racao' | 'defensivo' | 'outros';
  estoque_minimo: number;
  estoque_atual: number;
  custo_unitario: number;
  createdAt: string;
}

export interface MovimentacaoInsumo {
  id: string;
  insumo_id: string;
  nome_insumo: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data_movimento: string;
  origem_manejo_id?: string;
  observacao?: string;
  createdAt: string;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: 'receita' | 'despesa';
  categoria: 'venda_gado' | 'venda_leite' | 'compra_insumo' | 'manutencao' | 'veterinario' | 'salarios' | 'outros';
  descricao: string;
  valor: number;
  data: string;
  status: 'pago' | 'pendente';
  animal_id?: string;
  pasto_id?: string;
  createdAt: string;
}

export interface Lote {
  id: string;
  nome: string;
  data_criacao: string;
  animais_ids: string[];
  pasto_id?: string;
  pasto_nome?: string;
}

export interface IndicadoresGerais {
  totalAnimais: number;
  totalAtivos: number;
  totalDescarte: number;
  vacasCount: number;
  bezerrosCount: number;
  matrizesCount: number;
  tourosCount: number;
  gmdMedioGeral: number;
  taxaPrenhez: number;
  taxaNatalidade: number;
  estoqueCriticoCount: number;
  faturamentoMes: number;
  despesasMes: number;
  saldoMes: number;
}
