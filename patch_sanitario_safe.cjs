const fs = require('fs');
const lines = fs.readFileSync('src/pages/ManejoSanitario.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 507);

const imports = `
import { SanitarioSlidePanel } from './ManejoSanitario/components/SanitarioSlidePanel';
import { SanitarioModals } from './ManejoSanitario/components/SanitarioModals';
`;

let content = topLines.join('\n');
content = content.replace("import { ManejoSanitario }", imports + "import { ManejoSanitario }");

content += `
      <SanitarioSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedManejo={selectedManejo}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        handleSave={handleSave}
        setGroupModalOpen={setGroupModalOpen}
        setItemToDelete={setItemToDelete}
        setModalOpen={setModalOpen}
        currentMedInsumoId={currentMedInsumoId}
        setCurrentMedInsumoId={setCurrentMedInsumoId}
        currentMedDose={currentMedDose}
        setCurrentMedDose={setCurrentMedDose}
        currentMedQtd={currentMedQtd}
        setCurrentMedQtd={setCurrentMedQtd}
        insumosMedicamentos={insumosMedicamentos}
      />
      <SanitarioModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        itemToDelete={itemToDelete}
        handleDelete={handleDelete}
        groupModalOpen={groupModalOpen}
        setGroupModalOpen={setGroupModalOpen}
        formData={formData}
      />
    </div>
  );
};
`;

fs.writeFileSync('src/pages/ManejoSanitario.tsx', content);
