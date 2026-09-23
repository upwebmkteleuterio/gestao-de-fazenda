import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { EventoReproducao } from '../../../types/database';

export const ReprodutivoModals = ({
  modalOpen, setModalOpen, eventoToDelete, handleDelete
}: any) => (
  <>
    {/* MODAL EXCLUSÃO */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Excluir Registro"
        actions={
          <>
            <Button variant="danger" onClick={handleDelete}>
              Sim, Excluir
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza de que deseja excluir o registro reprodutivo da matriz <strong>#{eventoToDelete?.brinco_matriz}</strong>?
        </p>
      </Modal>
  </>
);
