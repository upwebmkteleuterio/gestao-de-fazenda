const fs = require('fs');

let content = fs.readFileSync('src/pages/Pesagens/index.tsx', 'utf8');

// Add imports
const importsToAdd = `
import { PesagemSlidePanel } from './components/PesagemSlidePanel';
import { PesagemModals } from './components/PesagemModals';
`;
content = content.replace("import { useToast } from '../components/ToastContainer';", "import { useToast } from '../components/ToastContainer';" + importsToAdd);

// Replace SlidePanel and Modals with the new components
// Find the start of SlidePanel
const slidePanelRegex = /<SlidePanel[\s\S]*?<\/SlidePanel>/;
const modalRegex = /{?\/\* Modal De exclusão \*\/}?[\s\S]*<\/Modal>/; // matches all modals till the last one

const replacement = `
      <PesagemSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedPesagem={selectedPesagem}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        handleSave={handleSave}
        activeTabPanel={activeTabPanel}
        setActiveTabPanel={setActiveTabPanel}
        grupoRows={grupoRows}
        setGrupoRows={setGrupoRows}
        animais={animais}
      />
      <PesagemModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        pesagemToDelete={pesagemToDelete}
        handleDeleteConfirm={handleDeleteConfirm}
        loteModalOpen={loteModalOpen}
        setLoteModalOpen={setLoteModalOpen}
        loteName={loteName}
        setLoteName={setLoteName}
        selectedPesagemIds={selectedPesagemIds}
        confirmarCriacaoLote={confirmarCriacaoLote}
      />
`;

// It's safer to use split or index to replace
const startIndex = content.indexOf('<SlidePanel');
const endIndex = content.lastIndexOf('</Modal>') + 8;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/pages/Pesagens/index.tsx', content);
  console.log('Success');
} else {
  console.log('Failed to find tags');
}
