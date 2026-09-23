const fs = require('fs');
const slideStr = fs.readFileSync('src/pages/Insumos/components/slide_lines.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/Insumos/components/modal_lines.txt', 'utf8').replace('    </div>', '').trim();

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Insumo } from '../../../types/database';

export const InsumosModals = ({
  modalOpen, setModalOpen, itemToDelete, handleDelete
}: any) => (
  <>
    ${modalStr}
  </>
);
`;
fs.writeFileSync('src/pages/Insumos/components/InsumosModals.tsx', modalComponent);

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { PackageSearch, Edit, Check, X, ShieldAlert, BadgePlus, Syringe, Wheat, Scale, Search, History, HelpCircle } from 'lucide-react';
import { Insumo } from '../../../types/database';

export const InsumosSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedInsumo,
  formData, setFormData, isSaving, handleSave, handleAddMovimentacao,
  novaMovimentacao, setNovaMovimentacao, handleSaveMovimentacao, isSavingMovimentacao
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/Insumos/components/InsumosSlidePanel.tsx', slideComponent);
