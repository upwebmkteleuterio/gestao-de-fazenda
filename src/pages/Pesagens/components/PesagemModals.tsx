import React from 'react';import { Modal } from '../../../components/Modal';import { Button } from '../../../components/Button';import { Select } from '../../../components/Select';import { Input } from '../../../components/Input';import { Pesagem } from '../../../types/database';interface PesagemModalsProps {
  modalOpen: boolean;
  setModalOpen: (val: boolean) => void;
  pesagemToDelete: Pesagem | null;
  handleDeleteConfirm: () => void;
  isDeleting: boolean;
  loteModalOpen: boolean;
  setLoteModalOpen: (val: boolean) => void;
  loteName: string;
  setLoteName: (val: string) => void;
  selectedPesagemIds: string[];
  confirmarCriacaoLote: () => void;
}

export const PesagemModals: React.FC<PesagemModalsProps> = ({
  modalOpen, setModalOpen, pesagemToDelete, handleDeleteConfirm, isDeleting,
  loteModalOpen, setLoteModalOpen, loteName, setLoteName,
  selectedPesagemIds, confirmarCriacaoLote
}) => {
  return (
    <>
      <Modal
        isOpen={modalOpen}
        onClose={() => { if (!isDeleting) setModalOpen(false); }}
        title="Excluir Pesagem"
        actions={
          <>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={isDeleting} disabled={isDeleting}>
              Sim, Excluir
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
          </>
        }
      >
        <p>Tem certeza de que deseja excluir a pesagem do animal {pesagemToDelete?.brinco_animal}?</p>
      </Modal>

      <Modal
        isOpen={loteModalOpen}
        onClose={() => setLoteModalOpen(false)}
        title="Criar Novo Lote"
        actions={
          <>
            <Button variant="primary" onClick={confirmarCriacaoLote}>
              Criar Lote
            </Button>
            <Button variant="secondary" onClick={() => setLoteModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedPesagemIds.length > 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Você selecionou <strong className="text-emerald-600 dark:text-emerald-400">{selectedPesagemIds.length}</strong> animais pesados na lista. Digite um nome para criar o lote com eles.
            </p>
          ) : (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-semibold">Criando lote avulso</p>
              <p className="text-gray-600 dark:text-gray-400">
                Você pode criar o lote agora informando o nome e vincular pesagens ou animais posteriormente.
              </p>
            </div>
          )}
          <Input
            label="Nome do Lote *"
            id="lote_destino"
            value={loteName}
            onChange={(e) => setLoteName(e.target.value)}
            placeholder="Ex: Lote Engorda Abril/2026"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};
