import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Sprout, Eye, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { InseminacaoRelatorioItem, formatarDataBR, exportarInseminacoesXLSX } from '../utils/inseminacaoReportUtils';
import { exportarElementoParaPDF } from '@/utils/pdfExport';

interface ModalImpressaoInseminacoesProps {
  isOpen: boolean;
  onClose: () => void;
  itens: InseminacaoRelatorioItem[];
  filtroTexto: string;
  dataEmissao?: string;
  autoPrint?: boolean;
  autoDownloadPdf?: boolean;
}

export const ModalImpressaoInseminacoes: React.FC<ModalImpressaoInseminacoesProps> = ({
  isOpen,
  onClose,
  itens,
  filtroTexto,
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
    const success = await exportarElementoParaPDF(
      'relatorio-inseminacoes-conteudo',
      `relatorio-inseminacoes-farmnexus-${dataIso}.pdf`
    );
    if (!success) window.alert('Não foi possível gerar o PDF deste relatório. Reduza o volume de dados e tente novamente.');
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

  const handleExportExcel = () => {
    exportarInseminacoesXLSX(itens, filtroTexto);
  };

  // Estatísticas do relatório
  const totalCabecas = itens.length;
  const tourosDistintos = Array.from(new Set(itens.map(i => i.touro).filter(Boolean)));
  const confirmadasPrenhas = itens.filter(i => i.resultado_dg === 'cheia').length;
  const aguardandoDg = itens.filter(i => !i.resultado_dg).length;
  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return createPortal(
    <div
      id="relatorio-inseminacoes-modal"
      className="fixed inset-0 z-[120] overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-transparent"
    >
      {/* Botões de controle de topo (ocultos na impressão) */}
      <div
        id="relatorio-inseminacoes-card"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 print:border-none print:shadow-none print:max-h-none print:w-full"
      >
        {/* Barra de Ações do Modal (Não sai na impressão) */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Visualização do Relatório
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  {totalCabecas} matrizes
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consulte todos os dados zootécnicos formatados em layout oficial da fazenda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="btn-baixar-pdf-modal-inseminacoes"
              variant="secondary"
              icon={gerandoPdf ? Loader2 : FileText}
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              title="Baixar arquivo PDF diretamente no computador"
            >
              {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleExportExcel}
              title="Baixar planilha Excel"
            >
              Exportar Excel
            </Button>
            <Button
              variant="primary"
              icon={Printer}
              onClick={handlePrint}
            >
              Imprimir Relatório
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folha do Relatório (Conteúdo Impresso) */}
        <div
          id="relatorio-inseminacoes-conteudo"
          className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-900 print:p-0 print:overflow-visible text-left"
        >
          {/* Cabeçalho Oficial da Fazenda */}
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
                    Sistema de Gestão de Rebanho e Melhoramento Genético
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p className="font-semibold text-gray-900">RELATÓRIO REPRODUTIVO</p>
                <p>Emissão: {dataHojeFormatada}</p>
                <p className="text-emerald-700 font-bold">Via de Campo / Curral</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Filtro / Período Selecionado: </span>
                <strong className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {filtroTexto}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Procedimento: </span>
                <strong className="text-gray-900">Inseminação Artificial (IATF) e Coberturas</strong>
              </div>
            </div>
          </div>

          {/* Resumo Estatístico em Destaque ("Quantas foram") */}
          <div className="grid grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-gray-50 border border-gray-300 text-center">
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total de Matrizes Inseminadas
              </span>
              <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">
                {totalCabecas} <span className="text-sm font-normal text-gray-600">cabeças</span>
              </span>
            </div>
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Reprodutores / Sêmens
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-0.5 block">
                {tourosDistintos.length} <span className="text-sm font-normal text-gray-600">touros</span>
              </span>
            </div>
            <div className="border-r border-gray-200 last:border-none">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Confirmadas Prenhas (DG)
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-0.5 block">
                {confirmadasPrenhas} <span className="text-sm font-normal text-gray-600">cabeças</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Aguardando Toque / DG
              </span>
              <span className="text-2xl font-extrabold text-amber-700 mt-0.5 block">
                {aguardandoDg} <span className="text-sm font-normal text-gray-600">cabeças</span>
              </span>
            </div>
          </div>

          {/* Tabela Detalhada das Cabeças Inseminadas ("Quais foram") */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Lista Nominal das Matrizes Inseminadas ({itens.length})
              </h2>
              <span className="text-[11px] text-gray-500">Ordem cronológica</span>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Brinco Matriz</th>
                    <th className="py-2 px-3">Cat. / Raça</th>
                    <th className="py-2 px-3">Data Insem.</th>
                    <th className="py-2 px-3">Protocolo</th>
                    <th className="py-2 px-3">Touro / Sêmen</th>
                    <th className="py-2 px-3">Tipo Sêmen</th>
                    <th className="py-2 px-3">ECC</th>
                    <th className="py-2 px-3">Previsão DG</th>
                    <th className="py-2 px-3">Status DG</th>
                    <th className="py-2 px-3">Prev. Parto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-normal text-gray-800">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-500">
                        Nenhuma matriz encontrada para os critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                        <td className="py-2 px-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-gray-950 font-mono">
                          {item.brinco_matriz}
                        </td>
                        <td className="py-2 px-3">
                          {item.animal?.categoria || '-'} - {item.animal?.raca || '-'}
                        </td>
                        <td className="py-2 px-3 font-medium">
                          {formatarDataBR(item.data_inseminacao)}
                        </td>
                        <td className="py-2 px-3 uppercase text-[11px] font-semibold">
                          {item.tipo_protocolo === 'iatf' ? 'IATF' : item.tipo_protocolo === 'monta_natural' ? 'Monta' : item.tipo_protocolo === 'dg' ? 'Diagnóstico (DG)' : 'TETF'}
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {item.touro || '-'}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-gray-600">
                          {item.tipo_semen || '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.condicao_corporal || '-'}
                        </td>
                        <td className="py-2 px-3 font-medium text-emerald-800">
                          {formatarDataBR(item.previsao_dg)}
                        </td>
                        <td className="py-2 px-3">
                          {item.resultado_dg === 'cheia' ? (
                            <span className="font-bold text-emerald-800">Prenha</span>
                          ) : item.resultado_dg === 'vazia' ? (
                            <span className="font-bold text-red-700">Vazia</span>
                          ) : (
                            <span className="text-amber-800 font-medium">Aguardando</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-700">
                          {formatarDataBR(item.previsao_parto)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção de Observações e Assinaturas para Curral */}
          <div className="mt-12 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs text-center">
            <div>
              <div className="border-b border-gray-800 w-3/4 mx-auto mb-2" />
              <p className="font-bold text-gray-900 uppercase">Médico Veterinário / Resp. Técnico</p>
              <p className="text-gray-500 text-[11px]">CRMV / Assinatura</p>
            </div>
            <div>
              <div className="border-b border-gray-800 w-3/4 mx-auto mb-2" />
              <p className="font-bold text-gray-900 uppercase">Inseminador / Operador de Manejo</p>
              <p className="text-gray-500 text-[11px]">Nome legível e Assinatura</p>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between print:hidden">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total listado: <strong>{itens.length}</strong> cabeças de gado
          </span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="primary" icon={Printer} onClick={handlePrint}>
              Imprimir Relatório
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
