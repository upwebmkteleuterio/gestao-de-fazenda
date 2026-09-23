const fs = require('fs');
const lines = fs.readFileSync('src/pages/Insumos.tsx', 'utf8').split('\n');

const topLines = lines.slice(0, 582);

const imports = `
import { InsumosSlidePanel } from './Insumos/components/InsumosSlidePanel';
import { InsumosModals } from './Insumos/components/InsumosModals';
`;

let content = topLines.join('\n');
content = content.replace("import { Insumo }", imports + "import { Insumo }");

content += `
      <InsumosSlidePanel
        slideOpen={slideOpen}
        setSlideOpen={setSlideOpen}
        slideMode={slideMode}
        setSlideMode={setSlideMode}
        selectedInsumo={selectedInsumo}
        formCadastro={formCadastro}
        setFormCadastro={setFormCadastro}
        handleSaveCadastro={handleSaveCadastro}
        formBaixa={formBaixa}
        setFormBaixa={setFormBaixa}
        handleSaveBaixa={handleSaveBaixa}
      />
      <InsumosModals
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        itemToDelete={itemToDelete}
        handleDelete={handleDelete}
      />
    </div>
  );
};
`;

fs.writeFileSync('src/pages/Insumos.tsx', content);
