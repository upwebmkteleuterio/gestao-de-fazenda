const fs = require('fs');
const slideStr = fs.readFileSync('src/pages/Insumos/components/slide_lines.txt', 'utf8');

const slideComponent = `import React from 'react';
import { SlidePanel } from '../../../components/SlidePanel';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Button } from '../../../components/Button';
import { PackageSearch, Edit, Check, X, ShieldAlert, BadgePlus, Syringe, Wheat, Scale, Search, History, HelpCircle } from 'lucide-react';
import { Insumo } from '../../../types/database';

export const InsumosSlidePanel = ({
  slideOpen, setSlideOpen, slideMode, setSlideMode, selectedInsumo,
  formCadastro, setFormCadastro, handleSaveCadastro,
  formBaixa, setFormBaixa, handleSaveBaixa
}: any) => (
  <>
    ${slideStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/Insumos/components/InsumosSlidePanel.tsx', slideComponent);
