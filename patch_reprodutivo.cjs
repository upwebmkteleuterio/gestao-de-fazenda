const fs = require('fs');

let content = fs.readFileSync('src/pages/ManejoReprodutivo.tsx', 'utf8');

const importsToAdd = `
import { ReprodutivoSlidePanel } from './ManejoReprodutivo/components/ReprodutivoSlidePanel';
import { ReprodutivoModals } from './ManejoReprodutivo/components/ReprodutivoModals';
`;
content = content.replace("import { EventoReproducao", importsToAdd + "\nimport { EventoReproducao");

const slideStart = content.indexOf('{/* TELA 4.1');
const modalStart = content.indexOf('{/* Modal De exclusão */}');
const endIndex = content.lastIndexOf('</div>');

const replacement = `
      <ReprodutivoSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedEvento={selectedEvento}
        formData={formData}
        setFormData={setFormData}
        isSaving={false}
        handleSave={handleSave}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCowIds={selectedCowIds}
        toggleCowSelection={(id) => {
          setSelectedCowIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
          );
        }}
        toggleAllCows={() => {
          if (selectedCowIds.length === matrizes.length) {
            setSelectedCowIds([]);
          } else {
            setSelectedCowIds(matrizes.map(m => m.id));
          }
        }}
        matrizes={matrizes}
        touros={touros}
        isFormValid={isFormValid}
      />
      <ReprodutivoModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        eventoToDelete={eventoToDelete}
        handleDeleteConfirm={handleDeleteConfirm}
      />
`;

content = content.substring(0, slideStart) + replacement + content.substring(endIndex);
fs.writeFileSync('src/pages/ManejoReprodutivo.tsx', content);
