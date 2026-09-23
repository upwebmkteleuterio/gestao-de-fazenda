const fs = require('fs');
let slideStr = fs.readFileSync('src/pages/Animais/components/slide_lines.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/Animais/components/modal_lines.txt', 'utf8').replace('    </div>', '').trim();

// Fix grid alignment in slide panel
slideStr = slideStr.replace('<div className="grid grid-cols-2 gap-4">', '<div className="grid grid-cols-2 gap-4 items-start">');

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Animal } from '../../../types/database';

export const AnimaisModals = ({
  modalOpen, setModalOpen, animalToDelete, handleDelete
}: any) => (
  <>
    ${modalStr}
  </>
);
`;
fs.writeFileSync('src/pages/Animais/components/AnimaisModals.tsx', modalComponent);

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Trash2, Syringe, Wheat, Activity, Calendar } from 'lucide-react';
import { Animal, HistoricoToque } from '../../../types/database';

export const AnimaisSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, selectedAnimal, formData, setFormData, 
  handleSave, matrizTab, setMatrizTab, novoToqueData, setNovoToqueData, 
  novoToqueResultado, setNovoToqueResultado, novoToqueObs, setNovoToqueObs, 
  handleAddToque, handleRemoveToque, isSaving, calcularIdadeFormatada
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/Animais/components/AnimaisSlidePanel.tsx', slideComponent);
