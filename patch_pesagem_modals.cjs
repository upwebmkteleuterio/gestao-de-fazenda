const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemModals.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file doesn't have an import for Input, so let's add it
if (!content.includes("import { Input }")) {
  content = content.replace("import { Select }", "import { Select }\nimport { Input }");
}

const oldLoteModal = `<Modal
        isOpen={loteModalOpen}
        onClose={() => setLoteModalOpen(false)}
        title="Criar Lote / Movimentar Animais"
        actions={
          <>
            <Button variant="primary" onClick={confirmarCriacaoLote}>
              Confirmar Movimentação
            </Button>
            <Button variant="secondary" onClick={() => setLoteModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Você selecionou <strong>{selectedPesagemIds.length}</strong> animais. Deseja movê-los para qual Pasto ou Lote?
          </p>
          <Select
            label="Destino (Pasto/Lote) *"
            id="lote_destino"
            value={loteName}
            onChange={(e) => setLoteName(e.target.value)}
            options={[
              { label: 'Selecione o destino...', value: '' },
              { label: 'Pasto Maternidade', value: 'Pasto Maternidade' },
              { label: 'Pasto Engorda', value: 'Pasto Engorda' },
              { label: 'Lote Confinamento', value: 'Lote Confinamento' },
              { label: 'Pasto Fundo', value: 'Pasto Fundo' },
            ]}
          />
        </div>
      </Modal>`;

const newLoteModal = `<Modal
        isOpen={loteModalOpen}
        onClose={() => setLoteModalOpen(false)}
        title="Criar Novo Lote"
        actions={
          <>
            <Button variant="primary" onClick={confirmarCriacaoLote}>
              Criar Lote
            </Button>
            <Button variant="secondary" onClick={() => setLoteModalOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Você selecionou <strong>{selectedPesagemIds.length}</strong> animais pesados. Digite um nome para criar um Lote com eles.
          </p>
          <Input
            label="Nome do Lote *"
            id="lote_destino"
            value={loteName}
            onChange={(e) => setLoteName(e.target.value)}
            placeholder="Ex: Lote Engorda Abril/2026"
            autoFocus
          />
        </div>
      </Modal>`;

content = content.replace(oldLoteModal, newLoteModal);
fs.writeFileSync(path, content);
console.log('PesagemModals updated');
