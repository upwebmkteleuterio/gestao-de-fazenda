import React from 'react';
import { Users } from 'lucide-react';
import { Table, Column } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Animal } from '@/types/database';
import { calcularIdadeFormatada } from '../utils/animalUtils';

interface AnimaisTableProps {
  animais: Animal[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNovoAnimal?: () => void;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (animal: Animal) => void;
  onAction: (action: 'edit' | 'delete' | 'view', animal: Animal) => void;
}

export const AnimaisTable: React.FC<AnimaisTableProps> = ({
  animais,
  isLoading,
  isError,
  onRetry,
  onNovoAnimal,
  total,
  page,
  limit,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  onAction,
}) => {
  const columns: Column<Animal>[] = [
    {
      header: 'ID / Brinco',
      accessor: 'brinco',
      render: (row) => (
        <div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 transition-colors inline-flex items-center gap-1.5">
            {row.brinco}
            {row.brinco_duplicado && (
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300" title="Há outro animal ativo com este brinco">
                Brinco duplicado
              </span>
            )}
            <SyncStatusIndicator status={row.syncStatus} error={row.syncError} />
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">{row.tipo_animal}</p>
            {row.tipo_cobertura && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-medium">
                {row.tipo_cobertura === 'Inseminacao' ? 'Inseminação' : row.tipo_cobertura === 'Monta' ? 'Monta Natural' : row.tipo_cobertura}
              </span>
            )}
            {(row.cdc || row.cdn) && (
              <span
                className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-medium cursor-help"
                title={`ABCZ - CDC: ${row.cdc || 'N/I'} | CDN: ${row.cdn || 'N/I'}`}
              >
                ABCZ {row.cdn ? `· CDN: ${row.cdn}` : row.cdc ? `· CDC: ${row.cdc}` : ''}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Sexo / Raça',
      render: (row) => (
        <span>
          {row.sexo === 'F' ? 'Fêmea' : 'Macho'} &middot; {row.raca || 'Nelore'}
        </span>
      ),
    },
    {
      header: 'Data Nasc. / Idade',
      render: (row) => (
        <div>
          <p className="font-medium">{calcularIdadeFormatada(row.data_nascimento)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{row.data_nascimento}</p>
        </div>
      ),
    },
    {
      header: 'Categoria',
      render: (row) => <Badge variant="neutral">{row.categoria}</Badge>,
    },
    {
      header: 'Peso Atual',
      render: (row) => (
        <span className="font-semibold">{row.peso_atual ? `${row.peso_atual} kg` : 'N/I'}</span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'ativo' ? 'success' : row.status === 'descarte' ? 'danger' : 'neutral'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Erro ao carregar rebanho"
          message="Não foi possível obter a lista de animais do servidor ou a requisição expirou. Tente novamente."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (animais.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="Nenhum animal encontrado"
          description="Nenhum animal cadastrado ou nenhum registro corresponde aos filtros selecionados."
          actionLabel="Cadastrar Animal"
          onAction={onNovoAnimal}
        />
      </div>
    );
  }

  const totalPages = Math.ceil((total || 0) / limit) || 1;

  return (
    <>
      <Table
        columns={columns}
        data={animais}
        onRowClick={onRowClick}
        onAction={onAction}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
      />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={total}
        itemsPerPage={limit}
      />
    </>
  );
};
