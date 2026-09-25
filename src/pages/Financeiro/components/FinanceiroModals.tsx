import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';

type FinanceiroModalsProps = {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDelete: () => void | Promise<void>;
  isDeleting: boolean;
};

export const FinanceiroModals: React.FC<FinanceiroModalsProps> = ({ modalOpen, setModalOpen, handleDelete, isDeleting }) => {
  const close = () => {
    if (!isDeleting) setModalOpen(false);
  };

  return (
    <Modal
      isOpen={modalOpen}
      onClose={close}
      title="Excluir Lançamento"
      actions={
        <>
          <Button variant="danger" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          </Button>
          <Button variant="secondary" onClick={close} disabled={isDeleting}>Cancelar</Button>
        </>
      }
    >
      <p>Tem certeza de que deseja remover este lançamento do fluxo de caixa?</p>
    </Modal>
  );
};
