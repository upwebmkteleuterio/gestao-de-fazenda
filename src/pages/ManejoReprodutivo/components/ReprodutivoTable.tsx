import React from 'react';
import {
  Calendar,
  CheckCircle2,
  X,
  Clock,
  Baby,
  HeartHandshake,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Table, Column } from '@/components/Table';
import { Badge } from '@/components/Badge';
import type { ReproducaoDiagnostic } from '@/hooks/useReproducao';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { EventoReproducao } from '@/types/database';
import { calcularPrevisaoParto, formatarDataBR } from '../utils/reproducaoUtils';

interface ReprodutivoTableProps {
  eventos: EventoReproducao[];
  total: number;
  page: number;
  limit?: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  isOffline?: boolean;
  isError?: boolean;
  error?: unknown;
  diagnostic?: ReproducaoDiagnostic;
  filterValidationMessage?: string;
  onRetry?: () => void;
  onNovoEvento?: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (row: EventoReproducao) => void;
  onEdit: (row: EventoReproducao) => void;
  onDelete: (row: EventoReproducao) => void;
}

export const ReprodutivoTable: React.FC<ReprodutivoTableProps> = ({
  eventos,
  total,
  page,
  limit = 10,
  onPageChange,
  isLoading,
  isOffline = false,
  isError,
  error,
  diagnostic,
  filterValidationMessage,
  onRetry,
  onNovoEvento,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  onEdit,
  onDelete,
}) => {
  const columns: Column<EventoReproducao>[] = [
    {
      header: 'Data do Evento',
      accessor: 'data_principal',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatarDataBR(row.data_principal)}
          </span>
        </div>
      ),
    },
    {
      header: 'Brinco (Vaca / Matriz)',
      accessor: 'brinco_matriz',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
            #{row.brinco_matriz}
          </span>
        </div>
      ),
    },
    {
      header: 'Tipo de Protocolo',
      render: (row) => {
        let label = 'IATF';
        let variant: 'info' | 'success' | 'warning' | 'neutral' = 'info';

        if (row.tipo_protocolo === 'monta_natural') {
          label = 'Monta Natural';
          variant = 'warning';
        } else if (row.tipo_protocolo === 'tetf') {
          label = 'TETF (Embrião)';
          variant = 'success';
        } else if (row.tipo_protocolo === 'dg') {
          label = 'Diagnóstico DG';
          variant = 'neutral';
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      header: 'Touro Usado',
      render: (row) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {row.dados_protocolo?.touro || row.dados_protocolo?.doadora || '-'}
        </span>
      ),
    },
    {
      header: 'Condição Corporal (ECC)',
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
          {row.dados_protocolo?.condicao_corporal
            ? `ECC ${row.dados_protocolo.condicao_corporal}`
            : '-'}
        </span>
      ),
    },
    {
      header: 'Diagnóstico (DG)',
      render: (row) => {
        const res = row.resultado_dg || 'pendente';
        if (res === 'cheia') {
          return (
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>PRENHA (CHEIA)</span>
            </div>
          );
        }
        if (res === 'vazia') {
          return (
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/80 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
              <X className="w-3.5 h-3.5 text-red-500" />
              <span>VAZIA</span>
            </div>
          );
        }
        return (
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>PENDENTE DG</span>
          </div>
        );
      },
    },
    {
      header: 'Previsão de Parto',
      render: (row) => {
        if (row.resultado_dg === 'vazia') {
          return <span className="text-gray-400 text-xs">-</span>;
        }

        const dataInseminacao =
          row.dados_protocolo?.d10 || row.dados_protocolo?.d0 || row.data_principal;
        const dias = row.dados_protocolo?.dias_gestacao_previsao || 300;
        const dataParto =
          row.previsao_parto ||
          (dataInseminacao ? calcularPrevisaoParto(dataInseminacao, dias) : '');

        if (!dataParto) return <span className="text-gray-400 text-xs">-</span>;

        return (
          <div className="flex flex-col text-xs">
            <div className="flex items-center space-x-1 font-bold text-emerald-700 dark:text-emerald-300">
              <Baby className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formatarDataBR(dataParto)}</span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              +{dias} dias da inseminação
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Card title="Registros e Histórico de Eventos Reprodutivos">
      {filterValidationMessage ? (
        <div className="p-6">
          <ErrorState
            title="Período personalizado inválido"
            message={filterValidationMessage}
          />
        </div>
      ) : isLoading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6">
          <ErrorState
            title={isOffline ? 'Cache offline indisponível para este período' : 'Erro ao carregar eventos reprodutivos'}
            message={error instanceof Error && error.name === 'ReproducaoOfflineCoverageError'
              ? error.message
              : isOffline
                ? 'Conecte-se para sincronizar o histórico reprodutivo e consultar este período.'
                : 'Não foi possível sincronizar os registros de IATF, monta ou diagnóstico. Tente novamente.'}
            onRetry={onRetry}
          />
          {import.meta.env.DEV && diagnostic && (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-left text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300" aria-label="Diagnóstico de consultas em desenvolvimento">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Diagnóstico (desenvolvimento)</p>
              <p className="mt-1">Lista: status {diagnostic.list.status}, fetch {diagnostic.list.fetchStatus}, itens {diagnostic.list.itemCount}, total {diagnostic.list.total}, origem {diagnostic.list.source ?? 'nenhuma'}.</p>
              <p>Resumo: solicitado {diagnostic.summary.requested ? 'sim' : 'não'}, status {diagnostic.summary.status}, fetch {diagnostic.summary.fetchStatus}.</p>
              {diagnostic.list.error && <p>Erro da lista: {diagnostic.list.error.name}: {diagnostic.list.error.message}</p>}
              {diagnostic.summary.error && <p>Erro do resumo: {diagnostic.summary.error.name}: {diagnostic.summary.error.message}</p>}
            </div>
          )}
        </div>
      ) : eventos.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={HeartHandshake}
            title="Nenhum evento reprodutivo registrado"
            description="Cadastre inseminações (IATF), transferências de embrião (TETF), lotes de monta natural ou diagnósticos de gestação (DG)."
            actionLabel="Novo Evento"
            onAction={onNovoEvento}
          />
        </div>
      ) : (
        <>
          <Table
            data={eventos}
            columns={columns}
            selectedIds={isOffline ? [] : selectedIds}
            onToggleSelect={isOffline ? undefined : onToggleSelect}
            onSelectAll={isOffline ? undefined : onSelectAll}
            onRowClick={(row) => onRowClick(row)}
            onAction={isOffline ? undefined : (action, row) => {
              if (action === 'edit') onEdit(row);
              else if (action === 'view') onRowClick(row);
              else if (action === 'delete') onDelete(row);
            }}
          />
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((total || 0) / limit) || 1}
            onPageChange={onPageChange}
            totalItems={total}
            itemsPerPage={limit}
          />
        </>
      )}
    </Card>
  );
};
