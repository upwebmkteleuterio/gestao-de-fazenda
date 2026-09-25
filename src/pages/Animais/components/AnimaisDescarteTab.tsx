import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { Table, Column } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { Animal } from '@/types/database';

interface AnimaisDescarteTabProps {
  vacasDescartadas: Animal[];
  onRegistrarDescarte: () => void;
  onRowClick: (animal: Animal) => void;
  onAction: (action: 'edit' | 'delete' | 'view', animal: Animal) => void;
}

export const AnimaisDescarteTab: React.FC<AnimaisDescarteTabProps> = ({
  vacasDescartadas,
  onRegistrarDescarte,
  onRowClick,
  onAction,
}) => {
  const columnsDescartadas: Column<Animal>[] = [
    {
      header: 'Número do Brinco',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-900 dark:text-gray-100">#{row.brinco}</span>
          <SyncStatusIndicator status={row.syncStatus} error={row.syncError} />
          <Badge variant="danger">DESCARTE</Badge>
        </div>
      ),
    },
    {
      header: 'Data do Descarte',
      render: (row) => {
        const dataStr = row.data_descarte || row.data_pesagem_atual || row.createdAt?.split('T')[0] || 'N/I';
        const parts = dataStr.split('-');
        const dataFmt = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataStr;
        return <span className="font-semibold text-gray-800 dark:text-gray-200">{dataFmt}</span>;
      },
    },
    {
      header: 'Motivação do Descarte',
      render: (row) => (
        <div className="max-w-md">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">
            {row.motivo_descarte || 'Sem motivo detalhado informado'}
          </p>
          {row.qtd_descartes_brinco && row.qtd_descartes_brinco > 1 && (
            <p className="text-[10px] text-gray-400 font-medium">
              {row.qtd_descartes_brinco} descartes vinculados a este brinco
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Detalhes do Animal',
      render: (row) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="capitalize">{row.tipo_animal}</span> &middot; {row.raca || 'Nelore'} &middot; Cat.{' '}
          {row.categoria}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-50/60 dark:bg-red-950/30 p-3.5 rounded-xl border border-red-100 dark:border-red-900/40">
        <div>
          <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
            Aba de Vacas e Matrizes Descartadas ({vacasDescartadas.length})
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300">
            Registro oficial de animais retirados de circulação reprodutiva com o número do brinco, data e motivação.
          </p>
        </div>
        <Button variant="danger" icon={Plus} onClick={onRegistrarDescarte}>
          Registrar Descarte
        </Button>
      </div>

      {vacasDescartadas.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Nenhuma vaca ou matriz marcada para descarte no momento.
          </p>
        </div>
      ) : (
        <Table
          columns={columnsDescartadas}
          data={vacasDescartadas}
          onRowClick={onRowClick}
          onAction={onAction}
        />
      )}
    </div>
  );
};
