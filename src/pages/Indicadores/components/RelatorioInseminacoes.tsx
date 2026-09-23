import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Printer,
  Download,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Baby,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { useReproducao } from '@/hooks/useReproducao';
import { useAnimais } from '@/hooks/useAnimais';
import {
  InseminacaoRelatorioItem,
  formatarDataBR,
  exportarInseminacoesCSV,
} from '../utils/inseminacaoReportUtils';
import { ModalImpressaoInseminacoes } from './ModalImpressaoInseminacoes';

export const RelatorioInseminacoes: React.FC = () => {
  const { eventos, isLoading: isLoadingEventos } = useReproducao();
  const { animais, isLoading: isLoadingAnimais } = useAnimais();

  // Estados dos Filtros
  const [modoData, setModoData] = useState<'especifica' | 'periodo' | 'todas'>('especifica');
  const [dataEspecifica, setDataEspecifica] = useState<string>('2026-07-15');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [touroSelecionado, setTouroSelecionado] = useState<string>('all');
  const [protocoloSelecionado, setProtocoloSelecionado] = useState<string>('all');
  const [resultadoDgSelecionado, setResultadoDgSelecionado] = useState<string>('all');
  const [searchBrinco, setSearchBrinco] = useState<string>('');

  // Modal de Impressão
  const [modalImpressaoOpen, setModalImpressaoOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [autoDownloadPdf, setAutoDownloadPdf] = useState(false);

  // Mapeamento de animais por ID ou Brinco para enriquecer a tabela
  const animaisMap = useMemo(() => {
    const map = new Map<string, typeof animais[0]>();
    animais.forEach((a) => {
      map.set(a.id, a);
      map.set(a.brinco, a);
    });
    return map;
  }, [animais]);

  // Lista de datas disponíveis que possuem registros para atalhos rápidos
  const datasComRegistros = useMemo(() => {
    const dates = Array.from(
      new Set(
        eventos
          .map((e) => e.data_principal)
          .filter(Boolean)
      )
    ).sort((a, b) => b.localeCompare(a));
    return dates;
  }, [eventos]);

  // Lista de touros distintos disponíveis nos eventos
  const listaTouros = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((e) => {
      const t = e.dados_protocolo?.touro;
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [eventos]);

  // Itens formatados e enriquecidos com os dados dos animais
  const itensFormatados: InseminacaoRelatorioItem[] = useMemo(() => {
    return eventos.map((ev) => {
      const animal = animaisMap.get(ev.animal_id) || animaisMap.get(ev.brinco_matriz);

      // Calcular previsão de DG (+35 a 40 dias)
      let prevDg = ev.data_dg || '';
      if (!prevDg && ev.data_principal) {
        const d = new Date(ev.data_principal);
        d.setDate(d.getDate() + 35);
        prevDg = d.toISOString().split('T')[0];
      }

      // Previsão de parto (+285 dias)
      let prevParto = ev.previsao_parto || '';
      if (!prevParto && ev.data_principal) {
        const d = new Date(ev.data_principal);
        d.setDate(d.getDate() + 285);
        prevParto = d.toISOString().split('T')[0];
      }

      return {
        id: ev.id,
        brinco_matriz: ev.brinco_matriz,
        animal,
        tipo_protocolo: ev.tipo_protocolo,
        data_inseminacao: ev.data_principal,
        touro: ev.dados_protocolo?.touro || '-',
        tipo_semen: ev.dados_protocolo?.tipo_semen || 'Convencional',
        condicao_corporal: ev.dados_protocolo?.condicao_corporal || '-',
        previsao_dg: prevDg,
        resultado_dg: ev.resultado_dg,
        data_dg: ev.data_dg,
        previsao_parto: prevParto,
        observacoes: ev.dados_protocolo?.observacoes || '',
      };
    });
  }, [eventos, animaisMap]);

  // Aplicação dos filtros em tempo real
  const itensFiltrados = useMemo(() => {
    return itensFormatados.filter((item) => {
      // Filtro de Data
      if (modoData === 'especifica') {
        if (dataEspecifica && item.data_inseminacao !== dataEspecifica) {
          return false;
        }
      } else if (modoData === 'periodo') {
        if (dataInicio && item.data_inseminacao < dataInicio) return false;
        if (dataFim && item.data_inseminacao > dataFim) return false;
      }

      // Filtro por Touro
      if (touroSelecionado !== 'all' && item.touro !== touroSelecionado) {
        return false;
      }

      // Filtro por Protocolo
      if (protocoloSelecionado !== 'all' && item.tipo_protocolo !== protocoloSelecionado) {
        return false;
      }

      // Filtro por Resultado DG
      if (resultadoDgSelecionado !== 'all') {
        if (resultadoDgSelecionado === 'pendente' && item.resultado_dg) return false;
        if (resultadoDgSelecionado !== 'pendente' && item.resultado_dg !== resultadoDgSelecionado) {
          return false;
        }
      }

      // Busca por Brinco
      if (searchBrinco) {
        const q = searchBrinco.toLowerCase();
        const matchBrinco = item.brinco_matriz.toLowerCase().includes(q);
        const matchTouro = item.touro.toLowerCase().includes(q);
        if (!matchBrinco && !matchTouro) return false;
      }

      return true;
    });
  }, [
    itensFormatados,
    modoData,
    dataEspecifica,
    dataInicio,
    dataFim,
    touroSelecionado,
    protocoloSelecionado,
    resultadoDgSelecionado,
    searchBrinco,
  ]);

  // Texto legível descrevendo o filtro de data ativo
  const descricaoFiltroAtivo = useMemo(() => {
    if (modoData === 'especifica') {
      return dataEspecifica ? `Data: ${formatarDataBR(dataEspecifica)}` : 'Todas as datas';
    }
    if (modoData === 'periodo') {
      if (dataInicio && dataFim) {
        return `Período de ${formatarDataBR(dataInicio)} até ${formatarDataBR(dataFim)}`;
      }
      if (dataInicio) return `A partir de ${formatarDataBR(dataInicio)}`;
      if (dataFim) return `Até ${formatarDataBR(dataFim)}`;
      return 'Período completo';
    }
    return 'Todas as datas de inseminação';
  }, [modoData, dataEspecifica, dataInicio, dataFim]);

  // Contadores para os Cards de Resumo ("Quantas foram")
  const totalCabecas = itensFiltrados.length;
  const tourosUtilizados = Array.from(new Set(itensFiltrados.map((i) => i.touro).filter((t) => t !== '-')));
  const prenhasConfirmadas = itensFiltrados.filter((i) => i.resultado_dg === 'cheia').length;
  const vaziasIdentificadas = itensFiltrados.filter((i) => i.resultado_dg === 'vazia').length;
  const aguardandoDg = itensFiltrados.filter((i) => !i.resultado_dg).length;
  const iatfCount = itensFiltrados.filter((i) => i.tipo_protocolo === 'iatf').length;

  const taxaConcepcao =
    prenhasConfirmadas + vaziasIdentificadas > 0
      ? Math.round((prenhasConfirmadas / (prenhasConfirmadas + vaziasIdentificadas)) * 100)
      : null;

  const handleLimparFiltros = () => {
    setModoData('especifica');
    setDataEspecifica('2026-07-15');
    setDataInicio('');
    setDataFim('');
    setTouroSelecionado('all');
    setProtocoloSelecionado('all');
    setResultadoDgSelecionado('all');
    setSearchBrinco('');
  };

  const hasFiltrosAtivos =
    modoData !== 'especifica' ||
    dataEspecifica !== '2026-07-15' ||
    touroSelecionado !== 'all' ||
    protocoloSelecionado !== 'all' ||
    resultadoDgSelecionado !== 'all' ||
    searchBrinco !== '';

  const handleExportCSV = () => {
    exportarInseminacoesCSV(itensFiltrados, descricaoFiltroAtivo);
  };

  if (isLoadingEventos || isLoadingAnimais) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Relatório de Inseminações por Data & Cabeças
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Visualize exatamente quantas e quais matrizes foram inseminadas em cada data com impressão para o curral.
        </p>
      </div>

      {/* Painel de Filtros e Seleção de Data */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Filtro de Data & Critérios de Inseminação
            </span>
          </div>

          {/* Abas de Modo de Seleção de Data */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModoData('especifica')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoData === 'especifica'
                  ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Data Específica
            </button>
            <button
              type="button"
              onClick={() => setModoData('periodo')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoData === 'periodo'
                  ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Intervalo de Datas
            </button>
            <button
              type="button"
              onClick={() => setModoData('todas')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoData === 'todas'
                  ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Todas as Inseminações
            </button>
          </div>
        </div>

        {/* Inputs de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Campo de Data Específica */}
          {modoData === 'especifica' && (
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Data da Inseminação
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dataEspecifica}
                  onChange={(e) => setDataEspecifica(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Atalhos Rápidos para Datas com Registros */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 font-medium">Dias com manejo:</span>
                {datasComRegistros.slice(0, 4).map((data) => (
                  <button
                    key={data}
                    type="button"
                    onClick={() => setDataEspecifica(data)}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer ${
                      dataEspecifica === data
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                    }`}
                  >
                    {formatarDataBR(data)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campo de Intervalo de Datas */}
          {modoData === 'periodo' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          )}

          {/* Seletor de Touro */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Touro / Sêmen
            </label>
            <select
              value={touroSelecionado}
              onChange={(e) => setTouroSelecionado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos os Touros</option>
              {listaTouros.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Protocolo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Protocolo
            </label>
            <select
              value={protocoloSelecionado}
              onChange={(e) => setProtocoloSelecionado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos os Protocolos</option>
              <option value="iatf">IATF (Inseminação em Tempo Fixo)</option>
              <option value="monta_natural">Monta Natural Controlada</option>
              <option value="tetf">TETF (Transferência de Embrião)</option>
            </select>
          </div>

          {/* Seletor de Diagnóstico de Gestação (DG) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Status DG / Prenhez
            </label>
            <select
              value={resultadoDgSelecionado}
              onChange={(e) => setResultadoDgSelecionado(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos os Resultados</option>
              <option value="cheia">Confirmadas Prenhas (Cheia)</option>
              <option value="vazia">Vazias</option>
              <option value="pendente">Aguardando Diagnóstico (Toque)</option>
            </select>
          </div>

          {/* Busca por Brinco */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Buscar por Brinco
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ex: BR-0012..."
                value={searchBrinco}
                onChange={(e) => setSearchBrinco(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Barra de Status do Filtro e Botões de Ação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>
              Filtrando por: <strong className="text-gray-900 dark:text-gray-200">{descricaoFiltroAtivo}</strong>
            </span>
            {hasFiltrosAtivos && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer ml-1"
                title="Redefinir filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Redefinir Filtros
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              id="btn-imprimir-relatorio-filtro"
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={() => {
                setAutoPrint(true);
                setAutoDownloadPdf(false);
                setModalImpressaoOpen(true);
              }}
              disabled={itensFiltrados.length === 0}
              title="Imprimir relatório"
              className="rounded-xl px-3.5 py-1.5 font-medium"
            >
              Imprimir
            </Button>
            <Button
              id="btn-baixar-pdf-filtro"
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => {
                setAutoPrint(false);
                setAutoDownloadPdf(true);
                setModalImpressaoOpen(true);
              }}
              disabled={itensFiltrados.length === 0}
              title="Baixar arquivo PDF diretamente no seu computador"
              className="rounded-xl px-3.5 py-1.5 font-medium"
            >
              Baixar PDF
            </Button>
            <Button
              id="btn-exportar-excel-filtro"
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCSV}
              disabled={itensFiltrados.length === 0}
              title="Exportar dados para Excel"
              className="rounded-xl px-3.5 py-1.5 font-medium"
            >
              Exportar Excel
            </Button>
            <Button
              id="btn-visualizar-relatorio-filtro"
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => {
                setAutoPrint(false);
                setAutoDownloadPdf(false);
                setModalImpressaoOpen(true);
              }}
              disabled={itensFiltrados.length === 0}
              title="Abrir visualização completa do relatório na tela"
              className="rounded-xl px-3.5 py-1.5 font-medium"
            >
              Visualizar Relatório ({totalCabecas})
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Quantitativas ("Quantas Foram") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Inseminadas"
          value={`${totalCabecas} ${totalCabecas === 1 ? 'cabeça' : 'cabeças'}`}
          icon={Layers}
          subtitle={descricaoFiltroAtivo}
          trend={totalCabecas > 0 ? 'up' : undefined}
          trendValue={totalCabecas > 0 ? `${iatfCount} via IATF` : 'Sem registros'}
        />

        <StatCard
          title="Touros Empregados"
          value={`${tourosUtilizados.length} ${tourosUtilizados.length === 1 ? 'reprodutor' : 'reprodutores'}`}
          icon={Sparkles}
          subtitle={tourosUtilizados.length > 0 ? tourosUtilizados.slice(0, 2).join(', ') : 'Nenhum'}
        />

        <StatCard
          title="Prenhez Confirmada"
          value={taxaConcepcao !== null ? `${taxaConcepcao}%` : `${prenhasConfirmadas} prenhas`}
          icon={CheckCircle2}
          trend={taxaConcepcao && taxaConcepcao >= 60 ? 'up' : undefined}
          trendValue={taxaConcepcao ? 'Concepção' : undefined}
          subtitle={`${prenhasConfirmadas} confirmadas cheias no DG`}
        />

        <StatCard
          title="Aguardando Toque (DG)"
          value={`${aguardandoDg} ${aguardandoDg === 1 ? 'matriz' : 'matrizes'}`}
          icon={Clock}
          subtitle="Previsão entre 30 e 45 dias pós-inseminação"
        />
      </div>

      {/* Tabela Interativa de Matrizes ("Quais Foram") */}
      <Card
        title={`Matrizes Inseminadas (${totalCabecas} cabeças)`}
        subtitle={`Relação nominal das fêmeas inseminadas para ${descricaoFiltroAtivo.toLowerCase()}`}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => setModalImpressaoOpen(true)}
              disabled={itensFiltrados.length === 0}
              title="Visualizar documento completo formatado na tela"
            >
              Visualizar Relatório
            </Button>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">
              Mostrando {totalCabecas} de {itensFormatados.length} no banco
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6 -my-4">
          <Table
            columns={[
              {
                header: 'Brinco Matriz',
                render: (r: InseminacaoRelatorioItem) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
                      {r.brinco_matriz}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {r.animal?.raca || 'Nelore'} • {r.animal?.categoria || 'PO'}
                    </span>
                  </div>
                ),
              },
              {
                header: 'Data Manejo',
                render: (r: InseminacaoRelatorioItem) => (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {formatarDataBR(r.data_inseminacao)}
                  </div>
                ),
              },
              {
                header: 'Protocolo',
                render: (r: InseminacaoRelatorioItem) => {
                  const isIatf = r.tipo_protocolo === 'iatf';
                  return (
                    <Badge variant={isIatf ? 'success' : 'info'} className="uppercase font-semibold">
                      {isIatf ? 'IATF' : r.tipo_protocolo === 'monta_natural' ? 'Monta' : 'TETF'}
                    </Badge>
                  );
                },
              },
              {
                header: 'Touro / Sêmen',
                render: (r: InseminacaoRelatorioItem) => (
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                      {r.touro}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {r.tipo_semen}
                    </span>
                  </div>
                ),
              },
              {
                header: 'ECC',
                render: (r: InseminacaoRelatorioItem) => (
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {r.condicao_corporal}
                  </span>
                ),
              },
              {
                header: 'Previsão DG',
                render: (r: InseminacaoRelatorioItem) => (
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatarDataBR(r.previsao_dg)}
                    </span>
                    <span className="text-[10px] text-gray-400">Toque 35d</span>
                  </div>
                ),
              },
              {
                header: 'Status DG',
                render: (r: InseminacaoRelatorioItem) => {
                  if (r.resultado_dg === 'cheia') {
                    return (
                      <Badge variant="success" className="font-bold">
                        Prenha
                      </Badge>
                    );
                  }
                  if (r.resultado_dg === 'vazia') {
                    return (
                      <Badge variant="danger" className="font-bold">
                        Vazia
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant="warning" className="font-medium">
                      Aguardando
                    </Badge>
                  );
                },
              },
              {
                header: 'Previsão Parto',
                render: (r: InseminacaoRelatorioItem) => (
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Baby className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatarDataBR(r.previsao_parto)}</span>
                  </div>
                ),
              },
            ]}
            data={itensFiltrados}
            emptyMessage={
              <div className="py-10 text-center space-y-3">
                <HeartHandshake className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  Nenhuma matriz inseminada encontrada para a data ou critérios selecionados.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Tente selecionar outra data (ex: 15/07/2026) ou mude para o modo "Todas as Inseminações".
                </p>
                {datasComRegistros.length > 0 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setModoData('especifica');
                        setDataEspecifica(datasComRegistros[0]);
                      }}
                    >
                      Ver Inseminações de {formatarDataBR(datasComRegistros[0])}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setModoData('todas')}
                    >
                      Ver Todas
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        </div>
      </Card>

      {/* Modal de Impressão A4 Profissional */}
      <ModalImpressaoInseminacoes
        isOpen={modalImpressaoOpen}
        onClose={() => {
          setModalImpressaoOpen(false);
          setAutoPrint(false);
          setAutoDownloadPdf(false);
        }}
        itens={itensFiltrados}
        filtroTexto={descricaoFiltroAtivo}
        autoPrint={autoPrint}
        autoDownloadPdf={autoDownloadPdf}
      />
    </div>
  );
};
