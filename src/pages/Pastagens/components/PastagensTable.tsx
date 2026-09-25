import React from 'react';
import { AlertCircle, Map, AlertTriangle, CloudUpload, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/Card';
import { Table, Column } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pastagem } from '@/types/database';
import { checkSaidaVencida, calcularStatusLotacao } from '../utils/pastagemUtils';

interface PastagensTableProps {
  pastagens: Pastagem[];
  total: number;
  page: number;
  limit?: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNovoPasto?: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpenDetails: (pasto: Pastagem) => void;
}

export const PastagensTable: React.FC<PastagensTableProps> = ({
  pastagens,
  total,
  page,
  limit = 10,
  onPageChange,
  isLoading,
  isError,
  onRetry,
  onNovoPasto,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onOpenDetails,
}) => {
  const columns: Column<Pastagem>[] = [
    {
      header: 'Nome do Pasto / Área',
      accessor: 'nome_pasto',
      render: (row) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5">
              {row.nome_pasto}
              {row.syncStatus === 'pending' && (
                <Badge variant="warning" className="px-1.5 py-0" title="Alteração pendente de sincronização">
                  <CloudUpload className="w-3 h-3" />
                </Badge>
              )}
              {row.syncStatus === 'processing' && (
                <Badge variant="info" className="px-1.5 py-0" title="Sincronização em andamento">
                  <RefreshCw className="w-3 h-3" />
                </Badge>
              )}
              {row.syncStatus === 'error' && (
                <Badge variant="danger" className="px-1.5 py-0" title={row.syncError || 'Erro de sincronização'}>
                  <AlertCircle className="w-3 h-3" />
                </Badge>
              )}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {row.tipo_capim} &middot; {row.area_ha} ha
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Lotação (Atual / Máxima)',
      render: (row) => {
        const { qtd, max, percentual, badgeVariant, statusLabel, isExcedido } =
          calcularStatusLotacao(row.qtd_animais, row.lotacao_maxima);

        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {qtd} / {max} cab.
              </span>
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </div>
            <div className="w-36 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isExcedido
                    ? 'bg-red-500'
                    : percentual >= 85
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, percentual)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Data Entrada',
      render: (row) => (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {row.data_entrada || '-'}
        </span>
      ),
    },
    {
      header: 'Data Prevista de Saída',
      render: (row) => {
        const isVencida = checkSaidaVencida(row.data_saida_prevista);
        if (!row.data_saida_prevista) {
          return <span className="text-xs text-gray-400">Não definida</span>;
        }

        return (
          <div>
            {isVencida ? (
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/50 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span>SAÍDA VENCIDA ({row.data_saida_prevista})</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{row.data_saida_prevista}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Ação',
      render: (row) => (
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(row);
          }}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
        >
          <span>Ver Detalhes</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <Card title="Listagem Completa de Pastos e Piquetes">
      {isLoading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6">
          <ErrorState
            title="Erro ao carregar pastagens"
            message="Não foi possível obter a listagem de pastos ou a requisição expirou. Tente novamente."
            onRetry={onRetry}
          />
        </div>
      ) : pastagens.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Map}
            title="Nenhuma pastagem encontrada"
            description="Nenhuma área ou piquete cadastrado ainda, ou nenhum pasto corresponde aos filtros ativos."
            actionLabel="Novo Piquete"
            onAction={onNovoPasto}
          />
        </div>
      ) : (
        <>
          <Table
            data={pastagens}
            columns={columns}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onRowClick={(row) => onOpenDetails(row)}
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
