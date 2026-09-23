import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Download, Eye, FileText, Loader2, Printer, Sprout, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { Animal, Pesagem } from '@/types/database';
import { exportarElementoParaPDF } from '@/utils/pdfExport';
import { exportarZootecnicosXLSX, ZootecnicoGmdPasto, ZootecnicoKpis, formatarNumero } from '../utils/zootecnicoReportUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  animais: Animal[];
  pesagens: Pesagem[];
  kpis: ZootecnicoKpis;
  pastos: ZootecnicoGmdPasto[];
  autoPrint?: boolean;
  autoDownloadPdf?: boolean;
}

export const ModalImpressaoZootecnicos: React.FC<Props> = ({ isOpen, onClose, animais, pesagens, kpis, pastos, autoPrint = false, autoDownloadPdf = false }) => {
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const handlePrint = () => { document.body.classList.add('printing-relatorio'); window.focus(); setTimeout(() => window.print(), 100); };
  const handlePdf = async () => {
    setGerandoPdf(true);
    const success = await exportarElementoParaPDF('relatorio-zootecnico-conteudo', `relatorio-zootecnico-farmnexus-${new Date().toISOString().split('T')[0]}.pdf`);
    if (!success) window.alert('Não foi possível gerar o PDF deste relatório. Reduza o volume de dados e tente novamente.');
    setGerandoPdf(false);
  };
  useEffect(() => { const afterPrint = () => document.body.classList.remove('printing-relatorio'); window.addEventListener('afterprint', afterPrint); return () => { window.removeEventListener('afterprint', afterPrint); document.body.classList.remove('printing-relatorio'); }; }, []);
  useEffect(() => { if (isOpen && autoPrint) { const timer = setTimeout(handlePrint, 300); return () => clearTimeout(timer); } return undefined; }, [isOpen, autoPrint]);
  useEffect(() => { if (isOpen && autoDownloadPdf) { const timer = setTimeout(handlePdf, 350); return () => clearTimeout(timer); } return undefined; }, [isOpen, autoDownloadPdf]);
  if (!isOpen) return null;

  return createPortal(<div className="fixed inset-0 z-[120] overflow-y-auto bg-gray-900/60 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-transparent"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:w-full">
    <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3 print:hidden"><div className="flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" /><div><b>Relatório Zootécnico & Desempenho</b><span className="ml-2 text-xs text-gray-500">{animais.length} animais</span></div></div><div className="flex items-center gap-2"><Button variant="secondary" icon={gerandoPdf ? Loader2 : FileText} disabled={gerandoPdf} onClick={handlePdf}>{gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}</Button><Button variant="secondary" icon={Download} onClick={() => exportarZootecnicosXLSX(animais, pesagens, kpis, pastos)}>Exportar Excel</Button><Button variant="primary" icon={Printer} onClick={handlePrint}>Imprimir</Button><button type="button" onClick={onClose} className="p-2 text-gray-400"><X className="w-5 h-5" /></button></div></div>
    <div id="relatorio-zootecnico-conteudo" className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-900 print:overflow-visible print:p-0"><div className="border-b-2 border-gray-800 pb-4 mb-6 flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white"><Sprout className="w-7 h-7" /></div><div><h1 className="text-2xl font-black uppercase">FarmNexus Agropecuária</h1><p className="text-xs text-gray-600">Gestão Zootécnica, Melhoramento Genético e Desempenho Ponderal</p></div></div><div className="text-right text-xs text-gray-600"><b>RELATÓRIO ZOOTÉCNICO & KPIS</b><p>Emissão: {new Date().toLocaleDateString('pt-BR')}</p></div></div>
      <div className="grid grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-gray-50 border text-center"><div><span className="text-[11px] block text-gray-500">Taxa de Descarte</span><b className="text-xl">{kpis.taxaDescarte}%</b><small className="block text-gray-500">{kpis.descartesCount} animais</small></div><div><span className="text-[11px] block text-gray-500">GMD Médio Geral</span><b className="text-xl text-emerald-700">{kpis.gmdMedio}</b></div><div><span className="text-[11px] block text-gray-500">Taxa de Prenhez</span><b className="text-xl text-emerald-700">{kpis.taxaPrenhez}</b></div><div><span className="text-[11px] block text-gray-500">Custo Médio / Cabeça</span><b className="text-xl">{kpis.custoMedio}</b></div></div>
      <h2 className="text-sm font-bold uppercase mb-2">Estrutura e Composição do Rebanho</h2><table className="w-full text-xs border mb-6"><thead><tr className="bg-gray-100"><th className="p-2 text-left">Categoria</th><th className="p-2 text-right">Quantidade</th></tr></thead><tbody>{[['Bezerros(as)', kpis.bezerros], ['Vacas / Novilhas', kpis.vacas], ['Matrizes / Doadoras', kpis.matrizes], ['Touros / Reprodutores', kpis.touros]].map(([label, count]) => <tr key={String(label)} className="border-t"><td className="p-2">{label}</td><td className="p-2 text-right font-mono">{count}</td></tr>)}<tr className="border-t font-bold"><td className="p-2">Total Geral</td><td className="p-2 text-right">{kpis.totalAnimais}</td></tr></tbody></table>
      <h2 className="text-sm font-bold uppercase mb-2">GMD por Pasto</h2><table className="w-full text-xs border mb-6"><thead><tr className="bg-gray-100"><th className="p-2 text-left">Pasto</th><th className="p-2 text-right">GMD Médio</th><th className="p-2 text-right">Pesagens</th></tr></thead><tbody>{pastos.length ? pastos.map((pasto) => <tr key={pasto.pasto_id} className="border-t"><td className="p-2">{pasto.pasto_nome}</td><td className="p-2 text-right">{pasto.gmd_medio === null ? '-' : `${formatarNumero(pasto.gmd_medio)} kg/dia`}</td><td className="p-2 text-right">{pasto.pesagens_count}</td></tr>) : <tr><td colSpan={3} className="p-4 text-center">Nenhum registro de GMD por pasto.</td></tr>}</tbody></table>
      <h2 className="text-sm font-bold uppercase mb-2 flex items-center gap-2"><Activity className="w-4 h-4" />Pesagens Individuais ({pesagens.length})</h2><table className="w-full text-xs border"><thead><tr className="bg-gray-100"><th className="p-2 text-left">Brinco</th><th className="p-2">Data</th><th className="p-2 text-right">Peso</th><th className="p-2 text-right">GMD</th></tr></thead><tbody>{pesagens.map((p) => <tr key={p.id} className="border-t"><td className="p-2 font-mono">{p.brinco_animal}</td><td className="p-2 text-center">{p.data_pesagem}</td><td className="p-2 text-right">{p.peso_kg} kg</td><td className="p-2 text-right">{p.gmd_calculado === undefined ? '-' : `${p.gmd_calculado} kg/dia`}</td></tr>)}</tbody></table>
    </div>
  </div></div>, document.body);
};
