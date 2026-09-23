const fs = require('fs');
const slideStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/slide_lines.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/ManejoReprodutivo/components/modal_lines.txt', 'utf8');

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { EventoReproducao } from '../../../types/database';

export const ReprodutivoModals = ({
  modalOpen, setModalOpen, eventoToDelete, handleDelete
}: any) => (
  <>
    ${modalStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/ManejoReprodutivo/components/ReprodutivoModals.tsx', modalComponent);

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Tabs } from '../../../components/Tabs';
import { Select } from '../../../components/Select';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Edit, HeartHandshake, Baby, Plus, Calendar, Filter, Check, X, Trash2, Clock, ChevronRight, Sparkles, Layers, Activity, CheckCircle2, AlertTriangle, HelpCircle, FileText } from 'lucide-react';
import { EventoReproducao, DGToqueResultado, Animal } from '../../../types/database';

export const ReprodutivoSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedEvento,
  formData, setFormData, isSaving, handleSave, activeTab, setActiveTab,
  selectedCowIds, toggleCowSelection, toggleAllCows, matrizes, touros,
  isFormValid, calcularPrevisaoParto, setModalOpen, setEventoToDelete
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/ManejoReprodutivo/components/ReprodutivoSlidePanel.tsx', slideComponent);
