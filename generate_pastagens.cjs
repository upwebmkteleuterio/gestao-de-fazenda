const fs = require('fs');
const slideStr = fs.readFileSync('src/pages/Pastagens/components/slide_lines.txt', 'utf8');
const modalStr = fs.readFileSync('src/pages/Pastagens/components/modal_lines.txt', 'utf8').replace('    </div>', '').trim();

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Pastagem } from '../../../types/database';

export const PastagensModals = ({
  modalOpen, setModalOpen, pastoToDelete, handleDeletePasto
}: any) => (
  <>
    ${modalStr}
  </>
);
`;
fs.writeFileSync('src/pages/Pastagens/components/PastagensModals.tsx', modalComponent);

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { 
  Plus, Map, Sprout, Search, AlertTriangle, Calendar, Users, Edit3, Trash2, 
  Clock, CheckCircle2, ShieldAlert, Layers, Wrench, ChevronRight, Filter
} from 'lucide-react';
import { Pastagem, ServicoPastagem } from '../../../types/database';

export const PastagensSlidePanel = ({
  slideOpen, setSlideOpen, isEditing, activeTab, setActiveTab,
  selectedPasto, pastoForm, setPastoForm, servicoForm, setServicoForm,
  handleSavePasto, handleAddServico, setModalOpen, setPastoToDelete
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/Pastagens/components/PastagensSlidePanel.tsx', slideComponent);
