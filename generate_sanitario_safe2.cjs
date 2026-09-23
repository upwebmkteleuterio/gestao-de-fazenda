const fs = require('fs');
const slideStr = fs.readFileSync('src/pages/ManejoSanitario/components/slide_lines.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/ManejoSanitario/components/modal_lines.txt', 'utf8');

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Select';
import { ManejoSanitario } from '../../../types/database';

export const SanitarioModals = ({
  modalOpen, setModalOpen, itemToDelete, handleDelete,
  groupModalOpen, setGroupModalOpen, formData
}: any) => (
  <>
    ${modalStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/ManejoSanitario/components/SanitarioModals.tsx', modalComponent);

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Tabs } from '../../../components/Tabs';
import { 
  HeartHandshake, Edit, Trash2, Calendar, FileText, Activity, Layers, ArrowRight, Save, Plus, ChevronRight,
  ShieldAlert, Syringe, Pill, TestTube, Search, Check, X, Clock, HelpCircle, AlertTriangle
} from 'lucide-react';
import { ManejoSanitario } from '../../../types/database';

export const SanitarioSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedManejo,
  formData, setFormData, isSaving, handleSave, setGroupModalOpen,
  setItemToDelete, setModalOpen,
  currentMedInsumoId, setCurrentMedInsumoId,
  currentMedDose, setCurrentMedDose,
  currentMedQtd, setCurrentMedQtd, insumosMedicamentos
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/ManejoSanitario/components/SanitarioSlidePanel.tsx', slideComponent);
