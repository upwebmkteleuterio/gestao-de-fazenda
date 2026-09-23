import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Sprout, Eye, FileText, Activity, ShieldAlert, HeartHandshake, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Animal, Pesagem } from '@/types/database';
import { ZootecnicoKpis, exportarZootecnicosCSV } from '../utils/zootecnicoReportUtils';
import { exportarElementoParaPDF } from '@/utils/pdfExport';

interface ModalImpressaoZootecnicosProps {
  isOpen: boolean;
  onClose: () => void;
  animais: Animal[];
  pesagens: Pesagem[];
  kpis: ZootecnicoKpis;
  pesagensComGmd: Pesagem[];
  autoPrint?: boolean;
  autoDownloadPdf?: boolean;
}

export const ModalImpressaoZootecnicos: React.FC<ModalImpressaoZootecnicosProps> = ({
  isOpen,
  onClose,
  animais,
  pesagens,
  kpis,
  pesagensComGmd,
  autoPrint = false,
  autoDownloadPdf = false,
}) => {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handlePrint = () => {
    document.body.classList.add('printing-relatorio');
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleBaixarPdf = async () => {
    setGerandoPdf(true);
    const dataIso = new Date().toISOString().split('T')[0];
    await exportarElementoParaPDF(
      'relatorio-zootecnico-conteudo',
      `relatorio-zootecnico-farmnexus-${dataIso}.pdf`
    );
    setGerandoPdf(false);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-relatorio');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-relatorio');
    };
  }, []);

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  useEffect(() => {
    if (isOpen && autoDownloadPdf) {
      const timer = setTimeout(() => {
        handleBaixarPdf();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoDownloadPdf]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportarZootecnicosCSV(animais, pesagens, kpis);
  };

  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lotesExemplo = [
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
  ];

  return createPortal(
    <div
      id="relatorio-zootecnicos-modal"
      className="fixed inset-0 z-[120] overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-transparent"
    >
      <div
        id="relatorio-zootecnicos-card"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 print:border-none print:shadow-none print:max-h-none print:w-full"
      >
        {/* Barra de Ações do Modal (Oculta na impressão) */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Relatório Zootécnico & Desempenho
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  {kpis.totalAnimais} animais ativos
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Documento consolidado de métricas zootécnicas, GMD e balanço de categorias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="btn-baixar-pdf-modal-zootecnico"
              variant="secondary"
              icon={gerandoPdf ? Loader2 : FileText}
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              title="Baixar arquivo PDF diretamente no computador"
            >
              {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
            <Button
              id="btn-exportar-csv-modal-zootecnico"
              variant="secondary"
              icon={Download}
              onClick={handleExportCSV}
              title="Baixar em formato Excel (CSV)"
            >
              Excel (CSV)
            </Button>
            <Button
              id="btn-imprimir-modal-zootecnico"
              variant="primary"
              icon={Printer}
              onClick={handlePrint}
              title="Imprimir relatório para curral"
            >
              Imprimir Relatório
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folha do Relatório (Conteúdo Impresso e Exportado para PDF) */}
        <div
          id="relatorio-zootecnico-conteudo"
          className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-900 print:p-0 print:overflow-visible text-left"
        >
          {/* Cabeçalho Oficial */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white shrink-0">
                  <Sprout className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
                    FarmNexus Agropecuária
                  </h1>
                  <p className="text-xs text-gray-600 font-medium">
                    Gestão Zootécnica, Melhoramento Genético e Desempenho Ponderal
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p className="font-semibold text-gray-900">RELATÓRIO ZOOTÉCNICO & KPIS</p>
                <p>Emissão: {dataHojeFormatada}</p>
                <p className="text-emerald-700 font-bold">Via Oficial Consolidada</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Escopo de Análise: </span>
                <strong className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  Rebanho Ativo Geral ({kpis.totalAnimais} cabeças)
                </strong>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Avaliação Ponderal: </span>
                <strong className="text-gray-900">Ganho Médio Diário (GMD) e Metas de Produtividade</strong>
              </div>
            </div>
          </div>

          {/* Resumo de Indicadores Chave (Cards de KPI) */}
          <div className="grid grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-gray-50 border border-gray-300 text-center">
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Taxa de Descarte
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-0.5 block">
                {kpis.taxaDescarte}%
              </span>
              <span className="text-[11px] text-gray-500">{kpis.descartesCount} animais indicados</span>
            </div>
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                GMD Médio Geral
              </span>
              <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">
                {kpis.gmdMedio}
              </span>
              <span className="text-[11px] text-gray-500">Recria e Engorda</span>
            </div>
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Taxa de Prenhez IATF
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-0.5 block">
                {kpis.taxaPrenhez}
              </span>
              <span className="text-[11px] text-gray-500">Estação de monta atual</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Custo Médio / Cabeça
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-0.5 block">
                {kpis.custoMedio}
              </span>
              <span className="text-[11px] text-gray-500">Mês vigente</span>
            </div>
          </div>

          {/* Composição do Rebanho por Categoria */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
              Estrutura e Composição do Rebanho
            </h2>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2 px-3">Categoria / Estrato Zootécnico</th>
                    <th className="py-2 px-3 text-right">Quantidade (Cab.)</th>
                    <th className="py-2 px-3 text-right">Participação (%)</th>
                    <th className="py-2 px-3">Observações de Manejo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-900">Bezerros(as) (0 a 12 meses)</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{kpis.bezerros}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {kpis.totalAnimais > 0 ? Math.round((kpis.bezerros / kpis.totalAnimais) * 100) : 0}%
                    </td>
                    <td className="py-2 px-3 text-gray-500">Fase de cria / aleitamento e desmama</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-900">Vacas / Novilhas em Produção</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{kpis.vacas}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {kpis.totalAnimais > 0 ? Math.round((kpis.vacas / kpis.totalAnimais) * 100) : 0}%
                    </td>
                    <td className="py-2 px-3 text-gray-500">Fêmeas em idade fértil e novilhas de reposição</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-900">Matrizes / Doadoras Confirmadas</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{kpis.matrizes}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {kpis.totalAnimais > 0 ? Math.round((kpis.matrizes / kpis.totalAnimais) * 100) : 0}%
                    </td>
                    <td className="py-2 px-3 text-gray-500">Plantel reprodutivo de seleção e IATF</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-gray-900">Reprodutores / Touros PO</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{kpis.touros}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {kpis.totalAnimais > 0 ? Math.round((kpis.touros / kpis.totalAnimais) * 100) : 0}%
                    </td>
                    <td className="py-2 px-3 text-gray-500">Machos de cobertura a campo e repasse</td>
                  </tr>
                  <tr className="bg-gray-50 font-bold border-t border-gray-300">
                    <td className="py-2 px-3 text-gray-900 uppercase">Total Geral do Rebanho</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-800 text-sm">{kpis.totalAnimais}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-800 text-sm">100%</td>
                    <td className="py-2 px-3 text-gray-600">Base cadastrada no sistema FarmNexus</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Desempenho Ponderal por Lote / Pasto */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
              Desempenho de Ganho Médio Diário (GMD) por Lote / Pasto
            </h2>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2 px-3">Lote / Pasto</th>
                    <th className="py-2 px-3 text-center">1ª Pesagem</th>
                    <th className="py-2 px-3 text-center">2ª Pesagem</th>
                    <th className="py-2 px-3 text-center">Intervalo</th>
                    <th className="py-2 px-3 text-center">Ganho (kg)</th>
                    <th className="py-2 px-3 text-center">GMD Real</th>
                    <th className="py-2 px-3 text-center">Meta GMD</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lotesExemplo.map((lote) => (
                    <tr key={lote.pasto}>
                      <td className="py-2 px-3 font-semibold text-gray-900">{lote.pasto}</td>
                      <td className="py-2 px-3 text-center text-gray-600 font-mono">
                        {lote.peso1} kg <span className="text-[10px] text-gray-400">({lote.data1})</span>
                      </td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-mono font-bold">
                        {lote.peso2} kg <span className="text-[10px] text-gray-400">({lote.data2})</span>
                      </td>
                      <td className="py-2 px-3 text-center text-gray-600 font-mono">{lote.dias} dias</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">+{lote.ganho} kg</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900 font-mono">+{lote.gmd} kg/d</td>
                      <td className="py-2 px-3 text-center text-gray-500 font-mono">{lote.meta} kg/d</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          lote.gmd >= lote.meta ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {lote.gmd >= lote.meta ? 'Atingida' : 'Abaixo da meta'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Relação de Pesagens Individuais Recentes */}
          {pesagensComGmd.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                Amostragem de Pesagens Individuais Cadastradas ({pesagensComGmd.length})
              </h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                      <th className="py-2 px-3">Brinco</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3 text-center">1ª Pesagem</th>
                      <th className="py-2 px-3 text-center">2ª Pesagem</th>
                      <th className="py-2 px-3 text-center">Intervalo</th>
                      <th className="py-2 px-3 text-center">Ganho</th>
                      <th className="py-2 px-3 text-center">GMD Calculado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pesagensComGmd.slice(0, 8).map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-bold text-gray-900">{p.brinco_animal}</td>
                        <td className="py-2 px-3 capitalize text-gray-600">{p.tipo_animal || 'Bovino'}</td>
                        <td className="py-2 px-3 text-center text-gray-600 font-mono">
                          {p.peso_anterior} kg <span className="text-[10px] text-gray-400">({p.data_pesagem_anterior})</span>
                        </td>
                        <td className="py-2 px-3 text-center text-emerald-700 font-mono font-bold">
                          {p.peso_kg} kg <span className="text-[10px] text-gray-400">({p.data_pesagem})</span>
                        </td>
                        <td className="py-2 px-3 text-center text-gray-600 font-mono">{p.dias_intervalo} dias</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700 font-mono">
                          +{p.ganho_peso_kg ?? (p.peso_kg - (p.peso_anterior || 0)).toFixed(1)} kg
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-gray-900">
                          +{p.gmd_calculado} kg/dia
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rodapé Oficial de Assinatura */}
          <div className="mt-8 pt-8 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div>
                <div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-900">
                  Responsável Técnico / Médico Veterinário / Zootecnista
                </div>
                <span className="text-[11px] text-gray-500">CRMV / CRMZ: ___________________________</span>
              </div>
              <div>
                <div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-900">
                  Gerência de Produção Agropecuária
                </div>
                <span className="text-[11px] text-gray-500">FarmNexus - Fazenda Modelo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
