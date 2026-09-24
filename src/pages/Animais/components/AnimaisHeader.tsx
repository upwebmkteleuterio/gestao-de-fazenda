import React from 'react';
import { Plus, Download, Layers } from 'lucide-react';
import { Button } from '@/components/Button';

interface AnimaisHeaderProps {
  selectedCount: number;
  onCriarLote: () => void;
  onExportar: () => void;
  onCadastrar: () => void;
  isOffline?: boolean;
}

export const AnimaisHeader: React.FC<AnimaisHeaderProps> = ({
  selectedCount,
  onCriarLote,
  onExportar,
  onCadastrar,
  isOffline = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gestão do Rebanho</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cadastre, filtre e acompanhe a evolução do rebanho da fazenda.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        <Button
          id="btn-criar-lote-header"
          variant={selectedCount > 0 ? 'primary' : 'secondary'}
          icon={Layers}
          onClick={onCriarLote}
          disabled={isOffline}
          title={
            isOffline
              ? 'Ações de Lote ficam disponíveis quando a conexão voltar'
              : selectedCount > 0
                ? `Criar lote com os ${selectedCount} animais selecionados`
                : 'Criar um novo lote (selecione animais na tabela para agrupá-los automaticamente)'
          }
          className={selectedCount > 0 ? 'ring-2 ring-emerald-500/40 shadow-sm' : ''}
        >
          {selectedCount > 0 ? `Criar Lote (${selectedCount})` : 'Criar Lote'}
        </Button>
        <Button variant="secondary" icon={Download} onClick={onExportar} id="btn-exportar-relatorio">
          Gerar Relatório
        </Button>
        <Button variant="primary" icon={Plus} onClick={onCadastrar} id="btn-cadastrar-animal">
          Cadastrar Animal
        </Button>
      </div>
    </div>
  );
};
