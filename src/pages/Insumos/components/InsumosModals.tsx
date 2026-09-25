import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Insumo } from '../../../types/database';

type InsumosModalsProps = {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  itemToDelete: Insumo | null;
  handleDelete: () => Promise<void>;
  isMutating: boolean;
};

export const InsumosModals: React.FC<InsumosModalsProps> = ({
  modalOpen, setModalOpen, itemToDelete, handleDelete, isMutating,
}) => (
  <Modal
    isOpen={modalOpen}
    onClose={() => { if (!isMutating) setModalOpen(false); }}
    title="Excluir Insumo do Estoque"
    actions={(
      <>
        <Button variant="danger" onClick={handleDelete} loading={isMutating} disabled={isMutating}>
          {isMutating ? 'Excluindo...' : 'Sim, Excluir'}
        </Button>
        <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isMutating}>
          Cancelar
        </Button>
      </>
    )}
  >
    <p className="text-sm text-gray-700 dark:text-gray-300">
      Tem certeza de que deseja remover o insumo <strong>{itemToDelete?.nome_produto}</strong> do almoxarifado?
    </p>
  </Modal>
);
