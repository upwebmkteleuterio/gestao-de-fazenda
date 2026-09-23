import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';

export const FinanceiroModals = ({ modalOpen, setModalOpen, handleDelete }: any) => (
  <Modal
    isOpen={modalOpen}
    onClose={() => setModalOpen(false)}
    title="Excluir Lançamento"
    actions={
      <>
        <Button variant="danger" onClick={handleDelete}>Sim, Excluir</Button>
        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
      </>
    }
  >
    <p>Tem certeza de que deseja remover este lançamento do fluxo de caixa?</p>
  </Modal>
);
