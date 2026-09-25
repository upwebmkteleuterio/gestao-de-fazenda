import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Animal } from '../../../types/database';

interface AnimaisModalsProps {
  modalOpen: boolean;
  setModalOpen: (value: boolean) => void;
  animalToDelete: Animal | null;
  handleDelete: () => void;
  isDeleting: boolean;
}

export const AnimaisModals: React.FC<AnimaisModalsProps> = ({
  modalOpen, setModalOpen, animalToDelete, handleDelete, isDeleting,
}) => (
  <Modal
    isOpen={modalOpen}
    onClose={() => { if (!isDeleting) setModalOpen(false); }}
    title="Confirmar Exclusão de Animal"
    actions={
      <>
        <Button variant="danger" onClick={handleDelete} loading={isDeleting} disabled={isDeleting}>
          Sim, Excluir
        </Button>
        <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isDeleting}>
          Cancelar
        </Button>
      </>
    }
  >
    <p>
      Tem certeza de que deseja remover o animal <strong className="text-emerald-600">{animalToDelete?.brinco}</strong> permanentemente? Esta ação removerá o registro do banco de dados local.
    </p>
  </Modal>
);

export default AnimaisModals;
