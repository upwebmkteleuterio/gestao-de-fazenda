const fs = require('fs');
let content = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// Replace imports
content = content.replace("import { SlidePanel } from '../components/SlidePanel';", "import { FinanceiroSlidePanel } from './Financeiro/components/FinanceiroSlidePanel';");
content = content.replace("import { Modal } from '../components/Modal';", "import { FinanceiroModals } from './Financeiro/components/FinanceiroModals';");

// Find SlidePanel bounds and replace
const slidePanelStartRegex = /\{\/\* SLIDE PANEL \*\/\}/;
const slidePanelEndRegex = /\{\/\* Modal De exclusão \*\/\}/;
const slidePanelStartMatch = content.match(slidePanelStartRegex);
const slidePanelEndMatch = content.match(slidePanelEndRegex);

if (slidePanelStartMatch && slidePanelEndMatch) {
  const replacement = `{/* SLIDE PANEL */}
      <FinanceiroSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        selectedTransacao={selectedTransacao}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        isSaving={isSaving}
      />

      {/* Modal De exclusão */}
      <FinanceiroModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        handleDelete={handleDelete}
      />
    </div>
  );
};`;
  
  const endOfDivIndex = content.lastIndexOf("</div>");
  const endOfComponentIndex = content.lastIndexOf("};");

  // A safer way: just slice out everything from {/* SLIDE PANEL */} down to the bottom
  const startIndex = slidePanelStartMatch.index;
  const newContent = content.slice(0, startIndex) + replacement;
  fs.writeFileSync('src/pages/Financeiro.tsx', newContent);
  console.log('Success');
} else {
  console.error('Could not find matches');
}
