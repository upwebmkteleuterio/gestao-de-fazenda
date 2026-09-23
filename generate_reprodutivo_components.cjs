const fs = require('fs');

const slideStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/slide_str.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/modal_str.txt', 'utf8');

// Modals component
const modalsComponent = `
import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { EventoReproducao } from '../../../types/database';

export const ReprodutivoModals = ({
  modalOpen,
  setModalOpen,
  eventoToDelete,
  handleDeleteConfirm
}: any) => {
  return (
    <>
      ${modalStr.trim()}
    </>
  );
};
`;
fs.writeFileSync('src/pages/ManejoReprodutivo/components/ReprodutivoModals.tsx', modalsComponent);

// Slide component
const slideComponent = `
import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Tabs } from '../../../components/Tabs';
import { Select } from '../../../components/Select';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Edit, HeartHandshake, Baby } from 'lucide-react';

export const ReprodutivoSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedEvento,
  formData, setFormData, isSaving, handleSave, activeTab, setActiveTab,
  selectedCowIds, toggleCowSelection, toggleAllCows, matrizes, touros,
  isFormValid
}: any) => {
  return (
    <>
      ${slideStr.trim()}
    </>
  );
};
`;
fs.writeFileSync('src/pages/ManejoReprodutivo/components/ReprodutivoSlidePanel.tsx', slideComponent);
