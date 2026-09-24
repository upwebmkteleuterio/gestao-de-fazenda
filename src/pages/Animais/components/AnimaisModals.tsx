import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Animal } from '../../../types/database';

export const AnimaisModals = ({
  modalOpen, setModalOpen, animalToDelete, handleDelete, isDeleting
}: any) => (
  <>
    <Modal
        isOpen={modalOpen}
        onClose={() => { if (!isDeleting) setModalOpen(false); }}
        title="Confirmar Exclusão de Animal"
        actions={
          <>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
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
  </>
);
