const fs = require('fs');
const lines = fs.readFileSync('src/pages/ManejoReprodutivo.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 699); // Up to the SlidePanel

const imports = `
import { ReprodutivoSlidePanel } from './ManejoReprodutivo/components/ReprodutivoSlidePanel';
import { ReprodutivoModals } from './ManejoReprodutivo/components/ReprodutivoModals';
`;

let content = topLines.join('\n');
content = content.replace("import { EventoReproducao", imports + "import { EventoReproducao");

content += `
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
        calcularPrevisaoParto={calcularPrevisaoParto}
        setModalOpen={setModalOpen}
        setEventoToDelete={setEventoToDelete}
      />
      <ReprodutivoModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        eventoToDelete={eventoToDelete}
        handleDelete={handleDelete}
      />
    </div>
  );
};
`;

fs.writeFileSync('src/pages/ManejoReprodutivo.tsx', content);
