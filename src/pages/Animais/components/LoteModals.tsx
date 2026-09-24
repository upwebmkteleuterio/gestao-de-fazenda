import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers, X, MapPin, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { Table, Column } from '@/components/Table';
import { Animal } from '@/types/database';

interface LoteModalsProps {
  // Criar Lote
  loteModalOpen: boolean;
  onCloseLoteModal: () => void;
  selectedCount: number;
  nomeLote: string;
  onNomeLoteChange: (value: string) => void;
  pastoIdLote?: string;
  onPastoIdLoteChange?: (value: string) => void;
  pastagens?: Array<{ id: string; nome_pasto: string; tipo_capim?: string }>;
  onConfirmarCriacao: () => void;
  isCreatingLote: boolean;

  // Visualizar Lote
  viewLoteModalOpen: boolean;
  onCloseViewLoteModal: () => void;
  selectedLote: any;
  todosAnimais: Animal[];
  onRowClickAnimal: (animal: Animal) => void;
  onMudarPastoLote?: (loteId: string, pastoId: string) => void;
}

export const LoteModals: React.FC<LoteModalsProps> = ({
  loteModalOpen,
  onCloseLoteModal,
  selectedCount,
  nomeLote,
  onNomeLoteChange,
  pastoIdLote = '',
  onPastoIdLoteChange,
  pastagens = [],
  onConfirmarCriacao,
  isCreatingLote,
  viewLoteModalOpen,
  onCloseViewLoteModal,
  selectedLote,
  todosAnimais,
  onRowClickAnimal,
  onMudarPastoLote,
}) => {
  const [showMudarPastoSelect, setShowMudarPastoSelect] = useState(false);
  const [selectedNovoPasto, setSelectedNovoPasto] = useState('');
  const columns: Column<Animal>[] = [
    { header: 'ID / Brinco', render: (r) => <span className="font-bold">{r.brinco}</span> },
    { header: 'Categoria', accessor: 'categoria' },
    { header: 'Tipo', accessor: 'tipo_animal' },
    { header: 'Sexo', accessor: 'sexo' },
    { header: 'Peso Atual', render: (r) => r.peso_atual ? `${r.peso_atual} kg` : '-' },
    {
      header: 'Pasto Animal',
      render: (r) => (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {r.pasto_nome || '-'}
        </span>
      )
    },
  ];

  return (
    <>
      {/* Modal Criar Lote */}
      {loteModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Criar Novo Lote</h2>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseLoteModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {selectedCount > 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Você selecionou <strong className="text-emerald-600 dark:text-emerald-400">{selectedCount}</strong> {selectedCount === 1 ? 'animal' : 'animais'} na tabela para agrupar neste lote.
                  </p>
                ) : (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <p className="font-semibold">Criando lote avulso</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Você pode criar o lote agora informando o nome e vincular os animais posteriormente.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Lote *
                  </label>
                  <input
                    type="text"
                    value={nomeLote}
                    onChange={(e) => onNomeLoteChange(e.target.value)}
                    placeholder="Ex: Lote Vacinação Março"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    autoFocus
                  />
                </div>

                {onPastoIdLoteChange && pastagens.length > 0 && (
                  <Select
                    noMargin
                    label="Pasto / Piquete Inicial (Opcional)"
                    value={pastoIdLote}
                    onChange={(e) => onPastoIdLoteChange(e.target.value)}
                    options={[
                      { value: '', label: 'Nenhum pasto vinculado agora' },
                      ...pastagens.map((p) => ({
                        value: p.id,
                        label: `${p.nome_pasto} (${p.tipo_capim || 'Pasto'})`,
                      })),
                    ]}
                  />
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100 dark:border-gray-800">
                <Button variant="secondary" onClick={onCloseLoteModal}>
                  Cancelar
                </Button>
                <Button
                  onClick={onConfirmarCriacao}
                  loading={isCreatingLote}
                  disabled={!nomeLote.trim()}
                >
                  Salvar Lote
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Visualizar Lote */}
      {viewLoteModalOpen &&
        selectedLote &&
        createPortal(
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedLote.nome}</h2>
                      {selectedLote.pasto_nome && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                          <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {selectedLote.pasto_nome}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Criado em {new Date(selectedLote.data_criacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onMudarPastoLote && pastagens.length > 0 && !showMudarPastoSelect && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={ArrowRightLeft}
                      onClick={() => {
                        setSelectedNovoPasto(selectedLote.pasto_id || pastagens[0]?.id || '');
                        setShowMudarPastoSelect(true);
                      }}
                    >
                      Mudar Pasto do Lote
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowMudarPastoSelect(false);
                      onCloseViewLoteModal();
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Barra rápida de mudança de pasto */}
              {showMudarPastoSelect && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Transferir lote para:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      noMargin
                      value={selectedNovoPasto}
                      onChange={(e) => setSelectedNovoPasto(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      options={pastagens.map((p) => ({
                        value: p.id,
                        label: `${p.nome_pasto} (${p.tipo_capim || 'Pasto'})`,
                      }))}
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (onMudarPastoLote && selectedNovoPasto) {
                          onMudarPastoLote(selectedLote.id, selectedNovoPasto);
                          setShowMudarPastoSelect(false);
                        }
                      }}
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowMudarPastoSelect(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/20">
                <Table
                  columns={columns}
                  data={todosAnimais.filter((a) => selectedLote.animais_ids?.includes(a.id))}
                  emptyMessage="Nenhum animal encontrado neste lote."
                  onRowClick={(row) => onRowClickAnimal(row)}
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                <div className="text-sm text-gray-500">
                  Total:{' '}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedLote.animais_ids?.length || 0}
                  </span>{' '}
                  animais
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowMudarPastoSelect(false);
                    onCloseViewLoteModal();
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
