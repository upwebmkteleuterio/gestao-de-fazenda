import React, { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Select } from '../../../components/Select';
import { Users } from 'lucide-react';
import { Animal, Lote, ManejoSanitario } from '../../../types/database';

type SanitarioFormData = {
  animais_ids: string[];
};

type SanitarioModalsProps = {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemToDelete: ManejoSanitario | null;
  handleDelete: () => Promise<void>;
  groupModalOpen: boolean;
  setGroupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  formData: SanitarioFormData;
  isOffline: boolean;
  isMutating: boolean;
  handleSelectAllAnimais: () => void;
  toggleAnimalInGroup: (animalId: string) => void;
  animais: Animal[];
  lotes: Lote[];
  onAddLoteAnimais: (loteId: string) => void;
};

export const SanitarioModals: React.FC<SanitarioModalsProps> = ({
  modalOpen, setModalOpen, itemToDelete, handleDelete,
  groupModalOpen, setGroupModalOpen, formData, isOffline, isMutating,
  handleSelectAllAnimais, toggleAnimalInGroup, animais, lotes, onAddLoteAnimais,
}) => {
  const [loteSelecionadoId, setLoteSelecionadoId] = useState('');

  return (
  <>
    {/* MODAL GRUPO DE MANEJO (SESSÃO 3) */}
      <Modal
        isOpen={groupModalOpen}
        onClose={() => { if (!isMutating) setGroupModalOpen(false); }}
        title="Vincular Grupo de Animais"
        actions={
          <Button variant="primary" onClick={() => setGroupModalOpen(false)} disabled={isOffline || isMutating}>
            Confirmar Grupo ({formData.animais_ids.length} animais)
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <label htmlFor="select-lote-grupo-manejo" className="block text-xs font-bold text-emerald-800 dark:text-emerald-200">
              Adicionar animais por lote
            </label>
            <Select
              id="select-lote-grupo-manejo"
              noMargin
              disabled={isOffline || lotes.length === 0}
              value={loteSelecionadoId}
              onChange={(event) => setLoteSelecionadoId(event.target.value)}
              options={[
                { label: 'Selecione um lote...', value: '' },
                ...lotes.map((lote) => ({
                  label: `${lote.nome} (${lote.animais_ids.length} animais)`,
                  value: lote.id,
                })),
              ]}
            />
            <Button
              variant="secondary"
              icon={Users}
              className="text-xs font-bold"
              disabled={isOffline || !loteSelecionadoId}
              onClick={() => {
                if (loteSelecionadoId) {
                  onAddLoteAnimais(loteSelecionadoId);
                  setLoteSelecionadoId('');
                }
              }}
            >
              Adicionar do Lote
            </Button>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Os animais do lote são somados à seleção atual. Desmarque individualmente se necessário.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Selecione os animais para este manejo:
            </span>
            <Button variant="ghost" onClick={handleSelectAllAnimais} disabled={isOffline} className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2.5 py-1 rounded-md transition-colors border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              {formData.animais_ids.length === animais.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-2 space-y-1">
            {animais.map((cow) => {
              const isSelected = formData.animais_ids.includes(cow.id);
              return (
                <div
                  key={cow.id}
                  onClick={isOffline ? undefined : () => toggleAnimalInGroup(cow.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-gray-50/50 dark:bg-gray-800/40 border border-transparent text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={isOffline}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold">Brinco #{cow.brinco}</span>
                    <span className="text-gray-400">&bull; {cow.tipo_animal} &bull; {cow.raca || 'Nelore'}</span>
                  </div>
                  <Badge variant="neutral">{cow.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* MODAL EXCLUSÃO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { if (!isMutating) setModalOpen(false); }}
        title="Excluir Manejo Sanitário"
        actions={
          <>
            <Button variant="danger" onClick={handleDelete} loading={isMutating} disabled={isOffline || isMutating}>
              {isMutating ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza de que deseja excluir o manejo <strong>{itemToDelete?.nome_lote}</strong>?
        </p>
      </Modal>
  </>
  );
};
