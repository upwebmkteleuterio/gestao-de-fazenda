import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Pastagem } from '../../../types/database';

export const PastagensModals = ({
  modalOpen, setModalOpen, pastoToDelete, handleDeletePasto
}: any) => (
  <>
    {/* MODAL EXCLUSÃO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Excluir Piquete / Pasto"
        actions={
          <>
            <Button variant="danger" onClick={handleDeletePasto}>
              Sim, Excluir
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza que deseja excluir a área <strong>{pastoToDelete?.nome_pasto}</strong>? Os animais alocados serão desvinculados do pasto.
        </p>
      </Modal>
  </>
);
