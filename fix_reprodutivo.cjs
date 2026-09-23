const fs = require('fs');
let content = fs.readFileSync('src/pages/ManejoReprodutivo.tsx', 'utf8');

const modalStr = `
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Excluir Registro"
        actions={
          <>
            <Button variant="danger" onClick={handleDeleteConfirm}>
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
    </div>
  );
};
`;

const modalIndex = content.lastIndexOf('<Modal');
content = content.substring(0, modalIndex + 6) + modalStr;
fs.writeFileSync('src/pages/ManejoReprodutivo.tsx', content);
