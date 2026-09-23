import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Download, Eye, FileText, Filter, HeartHandshake, Layers, Printer, RotateCcw, Search, Sparkles, Baby } from 'lucide-react';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Table } from '@/components/Table';
import { Pagination } from '@/components/Pagination';
import { ErrorState } from '@/components/ErrorState';
import { useReproducao } from '@/hooks/useReproducao';
import { useAnimais } from '@/hooks/useAnimais';
import { EventoReproducao } from '@/types/database';
import { ModalImpressaoInseminacoes } from './ModalImpressaoInseminacoes';
import { InseminacaoRelatorioItem, exportarInseminacoesXLSX, formatarDataBR } from '../utils/inseminacaoReportUtils';

const PAGE_SIZE = 25;
const addDays = (date: string, days: number) => {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
};
const toItem = (evento: EventoReproducao, animal?: InseminacaoRelatorioItem['animal']): InseminacaoRelatorioItem => {
  const previsaoDg = evento.data_dg || (evento.data_principal ? addDays(evento.data_principal, 35) : '');
  const previsaoParto = evento.previsao_parto || (evento.data_principal ? addDays(evento.data_principal, 285) : '');
  return {
    id: evento.id,
    brinco_matriz: evento.brinco_matriz,
    animal,
    tipo_protocolo: evento.tipo_protocolo,
    data_inseminacao: evento.data_principal,
    touro: evento.dados_protocolo?.touro || '-',
    tipo_semen: evento.dados_protocolo?.tipo_semen || 'Convencional',
    condicao_corporal: evento.dados_protocolo?.condicao_corporal || '-',
    previsao_dg: previsaoDg,
    resultado_dg: evento.resultado_dg,
    data_dg: evento.data_dg,
    previsao_parto: previsaoParto,
    observacoes: evento.dados_protocolo?.observacoes || '',
  };
};

function buildItems(eventos: EventoReproducao[], animaisMap?: Map<string, InseminacaoRelatorioItem['animal']>) {
  return eventos.map((evento) => toItem(evento, animaisMap?.get(evento.animal_id) || animaisMap?.get(evento.brinco_matriz)));
}

export const RelatorioInseminacoes: React.FC = () => {
  const [modoData, setModoData] = useState<'especifica' | 'periodo' | 'todas'>('todas');
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [touro, setTouro] = useState('all');
  const [protocolo, setProtocolo] = useState('all');
  const [resultadoDg, setResultadoDg] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<InseminacaoRelatorioItem[]>([]);
  const [modalAction, setModalAction] = useState<'print' | 'pdf' | 'view'>('view');
  const [loadingComplete, setLoadingComplete] = useState(false);

  const filters = useMemo(() => ({
    dataEspecifica: modoData === 'especifica' ? dataEspecifica || undefined : undefined,
    dataInicio: modoData === 'periodo' ? dataInicio || undefined : undefined,
    dataFim: modoData === 'periodo' ? dataFim || undefined : undefined,
    touro, protocolo, resultadoDg, search,
    page, limit: PAGE_SIZE,
  }), [modoData, dataEspecifica, dataInicio, dataFim, touro, protocolo, resultadoDg, search, page]);
  const { eventos, totalEventos, summary, isLoading, isError, refetch, fetchAllEventos } = useReproducao(filters, { includeSummary: true });
  const { animais, fetchAllAnimais } = useAnimais({ page: 1, limit: 100, includeHistorico: false });
  const animaisMap = useMemo(() => new Map(animais.flatMap((animal) => [[animal.id, animal], [animal.brinco, animal]])), [animais]);
  const itensPagina = useMemo(() => buildItems(eventos, animaisMap), [eventos, animaisMap]);
  const descricaoFiltro = modoData === 'especifica' ? `Data: ${formatarDataBR(dataEspecifica)}` : modoData === 'periodo' ? `Período: ${dataInicio || dataFim ? `${formatarDataBR(dataInicio)} até ${formatarDataBR(dataFim)}` : 'todas as datas'}` : 'Todas as datas de inseminação';
  const taxaConcepcao = summary && summary.prenhas_count + summary.vazias_count > 0 ? Math.round(summary.prenhas_count / (summary.prenhas_count + summary.vazias_count) * 100) : null;

  const resetFilters = () => {
    setModoData('todas'); setDataEspecifica(''); setDataInicio(''); setDataFim('');
    setTouro('all'); setProtocolo('all'); setResultadoDg('all'); setSearch(''); setPage(1);
  };
  const openComplete = async (action: 'print' | 'pdf' | 'view') => {
    setLoadingComplete(true);
    try {
      const [eventosCompletos, animaisCompletos] = await Promise.all([fetchAllEventos(), fetchAllAnimais()]);
      const mapaCompleto = new Map<string, InseminacaoRelatorioItem['animal']>();
      animaisCompletos.forEach((animal) => { mapaCompleto.set(animal.id, animal); mapaCompleto.set(animal.brinco, animal); });
      setModalItems(buildItems(eventosCompletos, mapaCompleto));
      setModalAction(action);
      setModalOpen(true);
    } finally {
      setLoadingComplete(false);
    }
  };
  const exportComplete = async () => {
    setLoadingComplete(true);
    try {
      const [eventosCompletos, animaisCompletos] = await Promise.all([fetchAllEventos(), fetchAllAnimais()]);
      const mapaCompleto = new Map<string, InseminacaoRelatorioItem['animal']>();
      animaisCompletos.forEach((animal) => { mapaCompleto.set(animal.id, animal); mapaCompleto.set(animal.brinco, animal); });
      exportarInseminacoesXLSX(buildItems(eventosCompletos, mapaCompleto), descricaoFiltro);
    } finally {
      setLoadingComplete(false);
    }
  };

  if (isLoading) return <div className="space-y-6 animate-pulse"><div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded" /><div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" /></div>;
  if (isError) return <ErrorState title="Erro ao carregar relatório reprodutivo" message="Não foi possível sincronizar os eventos de reprodução." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><HeartHandshake className="w-6 h-6 text-emerald-600" />Relatório de Inseminações por Data & Cabeças</h2><p className="text-sm text-gray-500 mt-1">Filtros, contagens e exportações sincronizados diretamente com o banco de dados.</p></div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="flex items-center gap-2 text-sm font-bold"><Filter className="w-4 h-4 text-emerald-600" />Filtros de reprodução</div><div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl text-xs font-semibold">{(['especifica', 'periodo', 'todas'] as const).map((modo) => <button key={modo} type="button" onClick={() => { setModoData(modo); setPage(1); }} className={`px-3 py-1.5 rounded-lg ${modoData === modo ? 'bg-white dark:bg-gray-800 text-emerald-700 shadow-sm' : 'text-gray-600'}`}>{modo === 'especifica' ? 'Data Específica' : modo === 'periodo' ? 'Intervalo de Datas' : 'Todas as Inseminações'}</button>)}</div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modoData === 'especifica' && <label className="text-xs font-semibold">Data da Inseminação<input type="date" value={dataEspecifica} onChange={(e) => { setDataEspecifica(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900" /></label>}
          {modoData === 'periodo' && <><label className="text-xs font-semibold">Data Inicial<input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900" /></label><label className="text-xs font-semibold">Data Final<input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900" /></label></>}
          <label className="text-xs font-semibold">Touro / Sêmen<select value={touro} onChange={(e) => { setTouro(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900"><option value="all">Todos os Touros</option>{(summary?.touros ?? []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-xs font-semibold">Tipo de Protocolo<select value={protocolo} onChange={(e) => { setProtocolo(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900"><option value="all">Todos os Protocolos</option><option value="iatf">IATF</option><option value="monta_natural">Monta Natural</option><option value="tetf">TETF</option></select></label>
          <label className="text-xs font-semibold">Status DG<select value={resultadoDg} onChange={(e) => { setResultadoDg(e.target.value); setPage(1); }} className="mt-1 w-full px-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900"><option value="all">Todos os Resultados</option><option value="cheia">Confirmadas Prenhas</option><option value="vazia">Vazias</option><option value="pendente">Aguardando Diagnóstico</option></select></label>
          <label className="text-xs font-semibold lg:col-span-2">Buscar por Brinco ou Touro<div className="relative mt-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Ex.: BR-0012" className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900" /></div></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700"><span className="text-xs text-gray-500">Filtrando por: <strong>{descricaoFiltro}</strong></span><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>Redefinir</Button><Button variant="secondary" size="sm" icon={Printer} disabled={!totalEventos || loadingComplete} onClick={() => openComplete('print')}>Imprimir</Button><Button variant="secondary" size="sm" icon={FileText} disabled={!totalEventos || loadingComplete} onClick={() => openComplete('pdf')}>Baixar PDF</Button><Button variant="secondary" size="sm" icon={Download} disabled={!totalEventos || loadingComplete} onClick={exportComplete}>{loadingComplete ? 'Preparando...' : 'Exportar Excel'}</Button><Button variant="secondary" size="sm" icon={Eye} disabled={!totalEventos || loadingComplete} onClick={() => openComplete('view')}>Visualizar Relatório</Button></div></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Inseminadas" value={`${summary?.total_count ?? 0} cabeças`} icon={Layers} subtitle={descricaoFiltro} trendValue={`${summary?.iatf_count ?? 0} via IATF`} />
        <StatCard title="Touros Empregados" value={`${summary?.touros_count ?? 0}`} icon={Sparkles} subtitle={(summary?.touros ?? []).slice(0, 2).join(', ') || 'Nenhum'} />
        <StatCard title="Prenhez Confirmada" value={taxaConcepcao === null ? '-' : `${taxaConcepcao}%`} icon={CheckCircle2} subtitle={`${summary?.prenhas_count ?? 0} confirmadas cheias no DG`} />
        <StatCard title="Aguardando Toque (DG)" value={`${summary?.aguardando_count ?? 0}`} icon={Clock} subtitle="Resultado DG pendente" />
      </div>
      <Card title={`Matrizes Inseminadas (${summary?.total_count ?? 0} cabeças)`} subtitle="Tabela paginada; a consulta mantém os filtros no Supabase." action={<span className="text-xs text-gray-500">Página {page}</span>}>
        <div className="overflow-x-auto -mx-6 -my-4"><Table columns={[{ header: 'Brinco Matriz', render: (r: InseminacaoRelatorioItem) => <div><b className="font-mono">{r.brinco_matriz}</b><span className="block text-xs text-gray-500">{r.animal?.raca || '-'} • {r.animal?.categoria || '-'}</span></div> }, { header: 'Data Manejo', render: (r: InseminacaoRelatorioItem) => <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-600" />{formatarDataBR(r.data_inseminacao)}</span> }, { header: 'Protocolo', render: (r: InseminacaoRelatorioItem) => <Badge variant="info">{r.tipo_protocolo.toUpperCase()}</Badge> }, { header: 'Touro / Sêmen', render: (r: InseminacaoRelatorioItem) => <div><b>{r.touro}</b><span className="block text-xs text-gray-500">{r.tipo_semen}</span></div> }, { header: 'Status DG', render: (r: InseminacaoRelatorioItem) => <Badge variant={r.resultado_dg === 'cheia' ? 'success' : r.resultado_dg === 'vazia' ? 'danger' : 'warning'}>{r.resultado_dg === 'cheia' ? 'Prenha' : r.resultado_dg === 'vazia' ? 'Vazia' : 'Aguardando'}</Badge> }, { header: 'Previsão Parto', render: (r: InseminacaoRelatorioItem) => <span className="flex items-center gap-1 text-xs"><Baby className="w-3.5 h-3.5 text-gray-400" />{formatarDataBR(r.previsao_parto)}</span> }]} data={itensPagina} emptyMessage={<div className="py-10 text-center"><HeartHandshake className="w-10 h-10 text-gray-400 mx-auto" /><p className="mt-2 font-semibold">Nenhum registro para os critérios selecionados.</p></div>} /></div>
        <Pagination currentPage={page} totalPages={Math.ceil((totalEventos || 0) / PAGE_SIZE)} onPageChange={setPage} totalItems={totalEventos} itemsPerPage={PAGE_SIZE} />
      </Card>
      <ModalImpressaoInseminacoes isOpen={modalOpen} onClose={() => setModalOpen(false)} itens={modalItems} filtroTexto={descricaoFiltro} autoPrint={modalAction === 'print'} autoDownloadPdf={modalAction === 'pdf'} />
    </div>
  );
};
