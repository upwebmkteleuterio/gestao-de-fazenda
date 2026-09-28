import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Pesagem } from '../../../types/database';

interface PesagemModalsProps {
  modalOpen: boolean;
  setModalOpen: (val: boolean) => void;
  pesagemToDelete: Pesagem | null;
  handleDeleteConfirm: () => void;
  isDeleting: boolean;
}

export const PesagemModals: React.FC<PesagemModalsProps> = ({
  modalOpen,
  setModalOpen,
  pesagemToDelete,
  handleDeleteConfirm,
  isDeleting,
}) => (
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
);

