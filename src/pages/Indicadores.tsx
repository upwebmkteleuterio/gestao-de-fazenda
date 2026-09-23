import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  TrendingUp,
  HeartHandshake,
  DollarSign,
  Users,
  ShieldAlert,
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  FileText,
  Layers,
} from 'lucide-react';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Tabs } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useAnimais } from '../hooks/useAnimais';
import { usePesagens } from '../hooks/usePesagens';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { RelatorioInseminacoes } from './Indicadores/components/RelatorioInseminacoes';
import { ModalImpressaoZootecnicos } from './Indicadores/components/ModalImpressaoZootecnicos';
import { exportarZootecnicosCSV } from './Indicadores/utils/zootecnicoReportUtils';

export const IndicadoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'inseminacoes';

  const [modalZootecnicoOpen, setModalZootecnicoOpen] = useState(false);
  const [autoPrintZootecnico, setAutoPrintZootecnico] = useState(false);
  const [autoDownloadPdfZootecnico, setAutoDownloadPdfZootecnico] = useState(false);

  const { animais, isLoading, isError, refetch } = useAnimais();
  const { pesagens } = usePesagens();
  const { resumo } = useFinanceiro();

  const total = animais.length;
  const descartes = animais.filter(a => a.status === 'descarte').length;
  const taxaDescarte = total > 0 ? ((descartes / total) * 100).toFixed(1) : '0';

  const bezerros = animais.filter(a => a.tipo_animal === 'bezerro' || a.tipo_animal === 'bezerra').length;
  const vacas = animais.filter(a => a.tipo_animal === 'vaca' || a.tipo_animal === 'novilha').length;
  const matrizes = animais.filter(a => a.tipo_animal === 'matriz').length;
  const touros = animais.filter(a => a.tipo_animal === 'touro' || a.tipo_animal === 'garrote').length;

  const percBezerros = total > 0 ? Math.round((bezerros / total) * 100) : 0;
  const percVacas = total > 0 ? Math.round((vacas / total) * 100) : 0;
  const percMatrizes = total > 0 ? Math.round((matrizes / total) * 100) : 0;
  const percTouros = total > 0 ? Math.round((touros / total) * 100) : 0;

  const [gmdViewTab, setGmdViewTab] = React.useState<'lotes' | 'individuais'>('lotes');
  const pesagensComGmd = pesagens.filter(p => p.gmd_calculado !== undefined && p.peso_anterior !== undefined);

  const zootecnicoKpis = {
    taxaDescarte,
    descartesCount: descartes,
    gmdMedio: '0.84 kg/dia',
    taxaPrenhez: '74.2%',
    custoMedio: 'R$ 82,50',
    bezerros,
    vacas,
    matrizes,
    touros,
    totalAnimais: total,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="Erro ao compilar indicadores"
          message="Não foi possível sincronizar os dados zootécnicos ou a conexão expirou. Tente novamente."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Geral de Relatórios */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Relatórios & Indicadores Agropecuários
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Métricas de desempenho zootécnico, relatórios de inseminações por data e cabeças de gado.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'inseminacoes' })}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'inseminacoes'
                ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Inseminações por Data
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'zootecnicos' })}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'zootecnicos'
                ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Indicadores Zootécnicos & KPIs
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {currentTab === 'inseminacoes' ? (
        <RelatorioInseminacoes />
      ) : total === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={BarChart3}
            title="Sem dados suficientes para indicadores zootécnicos"
            description="Cadastre animais no rebanho e registre pesagens para gerar as métricas e gráficos de desempenho."
            actionLabel="Cadastrar Animal"
            onAction={() => navigate('/animais')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barra de Ações do Relatório Zootécnico (Alinhada ao padrão da aba de Inseminações) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Relatório Zootécnico & Desempenho
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                    {total} {total === 1 ? 'animal' : 'animais'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Métricas de GMD, metas de ganho de peso, distribuição etária e taxa de descarte.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                id="btn-imprimir-zootecnico"
                variant="primary"
                size="sm"
                icon={Printer}
                onClick={() => {
                  setAutoPrintZootecnico(true);
                  setAutoDownloadPdfZootecnico(false);
                  setModalZootecnicoOpen(true);
                }}
                disabled={total === 0}
                title="Imprimir relatório consolidado zootécnico"
                className="rounded-xl px-3.5 py-1.5 font-medium"
              >
                Imprimir
              </Button>
              <Button
                id="btn-baixar-pdf-zootecnico"
                variant="secondary"
                size="sm"
                icon={FileText}
                onClick={() => {
                  setAutoPrintZootecnico(false);
                  setAutoDownloadPdfZootecnico(true);
                  setModalZootecnicoOpen(true);
                }}
                disabled={total === 0}
                title="Baixar diretamente o arquivo PDF no seu computador"
                className="rounded-xl px-3.5 py-1.5 font-medium"
              >
                Baixar PDF
              </Button>
              <Button
                id="btn-exportar-excel-zootecnico"
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => exportarZootecnicosCSV(animais, pesagens, zootecnicoKpis)}
                disabled={total === 0}
                title="Exportar indicadores e pesagens para planilha Excel"
                className="rounded-xl px-3.5 py-1.5 font-medium"
              >
                Exportar Excel
              </Button>
              <Button
                id="btn-visualizar-relatorio-zootecnico"
                variant="secondary"
                size="sm"
                icon={Eye}
                onClick={() => {
                  setAutoPrintZootecnico(false);
                  setAutoDownloadPdfZootecnico(false);
                  setModalZootecnicoOpen(true);
                }}
                disabled={total === 0}
                title="Visualizar folha timbrada oficial do relatório"
                className="rounded-xl px-3.5 py-1.5 font-medium"
              >
                Visualizar Relatório
              </Button>
            </div>
          </div>

          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Taxa de Descarte do Rebanho"
              value={`${taxaDescarte}%`}
              icon={ShieldAlert}
              trend={Number(taxaDescarte) <= 10 ? 'up' : 'down'}
              trendValue="Meta: < 10%"
              subtitle={`${descartes} animais em descarte`}
            />
            <StatCard
              title="GMD Médio Geral"
              value="0.84 kg/dia"
              icon={Activity}
              trend="up"
              trendValue="+0.08 kg/d"
              subtitle="Recria e Engorda"
            />
            <StatCard
              title="Taxa de Prenhez IATF"
              value="74.2%"
              icon={HeartHandshake}
              trend="up"
              trendValue="Excelente"
              subtitle="Última estação de monta"
            />
            <StatCard
              title="Custo Médio por Cabeça/Mês"
              value="R$ 82,50"
              icon={DollarSign}
              trend="down"
              trendValue="-R$ 4,10"
              subtitle="Mão de obra + Insumos"
            />
          </div>

          {/* Analytics Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card 
              title="GMD por Categoria e Pasto (Duas Pesagens)"
              subtitle="Comparativo entre 1ª e 2ª pesagem, datas e ganho diário"
              action={
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setGmdViewTab('lotes')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      gmdViewTab === 'lotes'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Por Lote / Pasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setGmdViewTab('individuais')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      gmdViewTab === 'individuais'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Por Animal ({pesagensComGmd.length})
                  </button>
                </div>
              }
            >
              <div className="space-y-4 py-2">
                {gmdViewTab === 'lotes' ? (
                  [
                    { 
                      pasto: 'Pasto Bezerros Desmama (Pasto 01)', 
                      data1: '18/05/2026', peso1: 160, 
                      data2: '18/07/2026', peso2: 216, 
                      ganho: 56, dias: 61, gmd: 0.92, meta: 0.85 
                    },
                    { 
                      pasto: 'Pasto Matrizes IATF (Manguinho)', 
                      data1: '18/05/2026', peso1: 440, 
                      data2: '18/07/2026', peso2: 480, 
                      ganho: 40, dias: 61, gmd: 0.65, meta: 0.60 
                    },
                    { 
                      pasto: 'Lote Recria Garrotes (Pasto 03)', 
                      data1: '15/05/2026', peso1: 280, 
                      data2: '15/07/2026', peso2: 334, 
                      ganho: 54, dias: 61, gmd: 0.88, meta: 0.80 
                    },
                    { 
                      pasto: 'Pasto Reprodutores PO (Pasto 04)', 
                      data1: '10/05/2026', peso1: 680, 
                      data2: '10/07/2026', peso2: 738, 
                      ganho: 58, dias: 61, gmd: 0.95, meta: 0.90 
                    },
                  ].map((p) => (
                    <div key={p.pasto} className="p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.pasto}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400 font-medium">Meta: {p.meta} kg/d</span>
                          <Badge variant={p.gmd >= p.meta ? 'success' : 'warning'} className="font-bold">
                            +{p.gmd} kg/dia
                          </Badge>
                        </div>
                      </div>

                      {/* Comparativo das Duas Pesagens e Datas */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60">
                        <div>
                          <span className="text-gray-400 block font-medium">1ª Pesagem ({p.data1})</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">{p.peso1} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-medium">2ª Pesagem ({p.data2})</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.peso2} kg</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                        <span>Evolução: <strong className="text-emerald-600 dark:text-emerald-400">+{p.ganho} kg</strong> em {p.dias} dias</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{Math.round((p.gmd / p.meta) * 100)}% da meta atingida</span>
                      </div>

                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (p.gmd / 1.2) * 100)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  pesagensComGmd.length > 0 ? (
                    pesagensComGmd.map((p) => (
                      <div key={p.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                              Animal: {p.brinco_animal}
                            </span>
                            <span className="text-xs text-gray-400 capitalize block">{p.tipo_animal || 'Bovino'}</span>
                          </div>
                          <Badge variant={p.gmd_calculado! > 0.8 ? 'success' : 'warning'} className="font-bold">
                            +{p.gmd_calculado} kg/dia
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60">
                          <div>
                            <span className="text-gray-400 block font-medium">1ª Pesagem ({p.data_pesagem_anterior})</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{p.peso_anterior} kg</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-medium">2ª Pesagem ({p.data_pesagem})</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.peso_kg} kg</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Ganho: <strong className="text-emerald-600 dark:text-emerald-400">+{p.ganho_peso_kg ?? (p.peso_kg - (p.peso_anterior || 0)).toFixed(1)} kg</strong> em {p.dias_intervalo} dias
                          </span>
                          <span className="text-xs font-mono text-gray-400">
                            ({p.peso_kg} - {p.peso_anterior}) ÷ {p.dias_intervalo}d
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Nenhum animal com duas pesagens consecutivas cadastrado ainda.
                    </div>
                  )
                )}
              </div>
            </Card>

            <Card title="Distribuição de Idade e Ciclo de Vida">
              <div className="space-y-4 py-2">
                {[
                  { label: 'Bezerros (0 a 12 meses)', count: bezerros, perc: percBezerros },
                  { label: 'Vacas / Fêmeas em Produção', count: vacas, perc: percVacas },
                  { label: 'Matrizes / Doadoras', count: matrizes, perc: percMatrizes },
                  { label: 'Reprodutores / Touros PO', count: touros, perc: percTouros },
                ].map((cat) => (
                  <div key={cat.label}>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>{cat.label}</span>
                      <span className="font-bold">{cat.count} animais ({cat.perc}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${cat.perc}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de Impressão e Download PDF do Relatório Zootécnico */}
      <ModalImpressaoZootecnicos
        isOpen={modalZootecnicoOpen}
        onClose={() => {
          setModalZootecnicoOpen(false);
          setAutoPrintZootecnico(false);
          setAutoDownloadPdfZootecnico(false);
        }}
        animais={animais}
        pesagens={pesagens}
        kpis={zootecnicoKpis}
        pesagensComGmd={pesagensComGmd}
        autoPrint={autoPrintZootecnico}
        autoDownloadPdf={autoDownloadPdfZootecnico}
      />
    </div>
  );
};
