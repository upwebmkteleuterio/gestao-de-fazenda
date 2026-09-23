import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, BarChart3, CheckCircle2, DollarSign, Download, Eye, FileText, HeartHandshake, Layers, Printer, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { useZootecnico } from '@/hooks/useZootecnico';
import { ModalImpressaoZootecnicos } from './Indicadores/components/ModalImpressaoZootecnicos';
import { exportarZootecnicosXLSX, ZootecnicoKpis, formatarNumero } from './Indicadores/utils/zootecnicoReportUtils';
import { RelatorioInseminacoes } from './Indicadores/components/RelatorioInseminacoes';
import { Animal, Pesagem } from '@/types/database';

const PESAGENS_PAGE_SIZE = 20;

export const IndicadoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'inseminacoes';
  const [pesagemPage, setPesagemPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'print' | 'pdf' | 'view'>('view');
  const [completeData, setCompleteData] = useState<{ animais: Animal[]; pesagens: Pesagem[] } | null>(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const { summary, pastos, pesagens, totalPesagens, fetchAllData, isLoading, isError, refetch } = useZootecnico(pesagemPage, PESAGENS_PAGE_SIZE, currentTab === 'zootecnicos');

  const kpis: ZootecnicoKpis = {
    taxaDescarte: summary && summary.total_animais > 0 ? formatarNumero((summary.descartes_count / summary.total_animais) * 100, 1) : '0,0',
    descartesCount: summary?.descartes_count ?? 0,
    gmdMedio: summary?.gmd_medio === null || summary?.gmd_medio === undefined ? '-' : `${formatarNumero(summary.gmd_medio)} kg/dia`,
    taxaPrenhez: summary && summary.dg_total > 0 ? `${formatarNumero((summary.dg_cheias / summary.dg_total) * 100, 1)}%` : '-',
    custoMedio: summary?.custo_medio === null || summary?.custo_medio === undefined ? '-' : `R$ ${formatarNumero(summary.custo_medio)}`,
    bezerros: summary?.bezerros_count ?? 0,
    vacas: summary?.vacas_count ?? 0,
    matrizes: summary?.matrizes_count ?? 0,
    touros: summary?.touros_count ?? 0,
    totalAnimais: summary?.total_animais ?? 0,
  };

  const openComplete = async (action: 'print' | 'pdf' | 'view') => {
    setLoadingComplete(true);
    try {
      setCompleteData(await fetchAllData());
      setModalAction(action);
      setModalOpen(true);
    } finally {
      setLoadingComplete(false);
    }
  };
  const exportComplete = async () => {
    setLoadingComplete(true);
    try {
      const data = await fetchAllData();
      exportarZootecnicosXLSX(data.animais, data.pesagens, kpis, pastos);
    } finally {
      setLoadingComplete(false);
    }
  };

  if (currentTab === 'inseminacoes') {
    return <div className="space-y-6 animate-fade-in pb-12"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios & Indicadores Agropecuários</h1><p className="text-sm text-gray-500 mt-1">Métricas de desempenho zootécnico e relatórios reprodutivos.</p></div><TabButtons currentTab={currentTab} setSearchParams={setSearchParams} /></div><RelatorioInseminacoes /></div>;
  }

  if (isLoading) return <div className="space-y-6 animate-pulse"><div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded" /><div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" /></div>;
  if (isError) return <ErrorState title="Erro ao compilar indicadores" message="Não foi possível sincronizar os dados zootécnicos." onRetry={refetch} />;
  if (!summary || summary.total_animais === 0) return <EmptyState icon={BarChart3} title="Sem dados suficientes para indicadores zootécnicos" description="Cadastre animais e registre pesagens para gerar os indicadores." actionLabel="Cadastrar Animal" onAction={() => navigate('/animais')} />;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios & Indicadores Agropecuários</h1><p className="text-sm text-gray-500 mt-1">Métricas de desempenho zootécnico baseadas nos indicadores do servidor.</p></div><TabButtons currentTab={currentTab} setSearchParams={setSearchParams} /></div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Layers className="w-5 h-5 text-emerald-600" /><div><b>Relatório Zootécnico & Desempenho</b><span className="ml-2 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{summary.total_animais} animais</span></div></div><div className="flex flex-wrap gap-2"><Button variant="primary" size="sm" icon={Printer} disabled={loadingComplete} onClick={() => openComplete('print')}>Imprimir</Button><Button variant="secondary" size="sm" icon={FileText} disabled={loadingComplete} onClick={() => openComplete('pdf')}>Baixar PDF</Button><Button variant="secondary" size="sm" icon={Download} disabled={loadingComplete} onClick={exportComplete}>{loadingComplete ? 'Preparando...' : 'Exportar Excel'}</Button><Button variant="secondary" size="sm" icon={Eye} disabled={loadingComplete} onClick={() => openComplete('view')}>Visualizar Relatório</Button></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><StatCard title="Taxa de Descarte do Rebanho" value={`${kpis.taxaDescarte}%`} icon={ShieldAlert} subtitle={`${kpis.descartesCount} animais em descarte`} /><StatCard title="GMD Médio Geral" value={kpis.gmdMedio} icon={Activity} subtitle="Média calculada no servidor" /><StatCard title="Taxa de Prenhez IATF" value={kpis.taxaPrenhez} icon={HeartHandshake} subtitle={`${summary.dg_cheias} de ${summary.dg_total} DG concluídos`} /><StatCard title="Custo Médio por Cabeça/Mês" value={kpis.custoMedio} icon={DollarSign} subtitle="Despesas pagas no mês vigente" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card title="GMD por Pasto" subtitle="Médias retornadas pelo resumo zootécnico do servidor"><div className="space-y-3">{pastos.length ? pastos.map((pasto) => <div key={pasto.pasto_id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 flex items-center justify-between"><div><b className="text-sm">{pasto.pasto_nome}</b><span className="block text-xs text-gray-500">{pasto.pesagens_count} pesagens</span></div><Badge variant={pasto.gmd_medio !== null && pasto.gmd_medio >= 0.8 ? 'success' : 'warning'}>{pasto.gmd_medio === null ? '-' : `${formatarNumero(pasto.gmd_medio)} kg/dia`}</Badge></div>) : <p className="py-8 text-center text-sm text-gray-500">Nenhum GMD por pasto registrado.</p>}</div></Card><Card title="Composição do Rebanho"><div className="space-y-3">{[['Bezerros(as)', kpis.bezerros], ['Vacas / Novilhas', kpis.vacas], ['Matrizes / Doadoras', kpis.matrizes], ['Touros / Reprodutores', kpis.touros]].map(([label, count]) => <div key={String(label)} className="flex items-center justify-between text-sm"><span>{label}</span><b>{count} ({summary.total_animais ? Math.round(Number(count) / summary.total_animais * 100) : 0}%)</b></div>)}</div></Card></div>
      <Card title={`Pesagens com comparação (${totalPesagens})`} subtitle="Lista paginada para evitar renderização de grandes volumes"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-gray-200 dark:border-gray-700"><th className="py-2">Brinco</th><th>Data</th><th>Peso</th><th>GMD</th><th>Intervalo</th></tr></thead><tbody>{pesagens.map((p) => <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 font-mono">{p.brinco_animal}</td><td>{p.data_pesagem}</td><td>{p.peso_kg} kg</td><td>{p.gmd_calculado === undefined ? '-' : `${p.gmd_calculado} kg/dia`}</td><td>{p.dias_intervalo === undefined ? '-' : `${p.dias_intervalo} dias`}</td></tr>)}</tbody></table></div><Pagination currentPage={pesagemPage} totalPages={Math.ceil(totalPesagens / PESAGENS_PAGE_SIZE)} onPageChange={setPesagemPage} totalItems={totalPesagens} itemsPerPage={PESAGENS_PAGE_SIZE} /></Card>
      {completeData && <ModalImpressaoZootecnicos isOpen={modalOpen} onClose={() => setModalOpen(false)} animais={completeData.animais} pesagens={completeData.pesagens} kpis={kpis} pastos={pastos} autoPrint={modalAction === 'print'} autoDownloadPdf={modalAction === 'pdf'} />}
    </div>
  );
};

const TabButtons: React.FC<{ currentTab: string; setSearchParams: (params: { tab: string }) => void }> = ({ currentTab, setSearchParams }) => <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold"><button type="button" onClick={() => setSearchParams({ tab: 'inseminacoes' })} className={`px-4 py-2 rounded-lg ${currentTab === 'inseminacoes' ? 'bg-white dark:bg-gray-700 text-emerald-700 shadow-sm' : 'text-gray-600'}`}>Inseminações por Data</button><button type="button" onClick={() => setSearchParams({ tab: 'zootecnicos' })} className={`px-4 py-2 rounded-lg ${currentTab === 'zootecnicos' ? 'bg-white dark:bg-gray-700 text-emerald-700 shadow-sm' : 'text-gray-600'}`}>Indicadores Zootécnicos</button></div>;
