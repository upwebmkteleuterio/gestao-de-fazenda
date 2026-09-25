import React, { Dispatch, SetStateAction } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Pastagem } from '../../../types/database';

interface PastagensModalsProps {
  modalOpen: boolean;
  setModalOpen: Dispatch<SetStateAction<boolean>>;
  pastoToDelete: Pastagem | null;
  handleDeletePasto: () => Promise<void>;
  isDeleting: boolean;
}

export const PastagensModals: React.FC<PastagensModalsProps> = ({
  modalOpen,
  setModalOpen,
  pastoToDelete,
  handleDeletePasto,
  isDeleting,
}) => (
  <Modal
    isOpen={modalOpen}
    onClose={() => { if (!isDeleting) setModalOpen(false); }}
    title="Excluir Piquete / Pasto"
    actions={
      <>
        <Button variant="danger" onClick={handleDeletePasto} loading={isDeleting} disabled={isDeleting}>
          Sim, Excluir
        </Button>
        <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isDeleting}>
          Cancelar
        </Button>
      </>
    }
  >
    <p className="text-sm text-gray-700 dark:text-gray-300">
      Tem certeza que deseja excluir a área <strong>{pastoToDelete?.nome_pasto}</strong>? Os animais alocados serão desvinculados do pasto.
    </p>
  </Modal>
);
