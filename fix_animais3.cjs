const fs = require('fs');

let slideContent = fs.readFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', 'utf8');
slideContent = slideContent.replace(
  "import { RegistroToqueAno } from '../../../mocks/reproducao';",
  ""
);
slideContent = slideContent.replace(
  "import { Animal, TipoAnimal, CategoriaAnimal, StatusAnimal, SexoAnimal } from '../../../types/database';",
  "import { Animal, TipoAnimal, CategoriaAnimal, StatusAnimal, SexoAnimal, RegistroToqueAno } from '../../../types/database';"
);

// handleAddToque and handleRemoveToque are defined inside AnimaisSlidePanel.tsx!
// But they were passed as props. I should remove them from props.
slideContent = slideContent.replace(
  "novoToqueObs, setNovoToqueObs, handleAddToque, handleRemoveToque, isSaving, calcularIdadeFormatada, showToast",
  "novoToqueObs, setNovoToqueObs, isSaving, calcularIdadeFormatada, showToast"
);

fs.writeFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', slideContent);

// Fix Animais.tsx to not pass handleAddToque and handleRemoveToque
let mainContent = fs.readFileSync('src/pages/Animais.tsx', 'utf8');
mainContent = mainContent.replace(/handleAddToque=\{\(\) => \{\}\}\n/g, '');
mainContent = mainContent.replace(/handleRemoveToque=\{\(\) => \{\}\}\n/g, '');

fs.writeFileSync('src/pages/Animais.tsx', mainContent);

