const fs = require('fs');
const modalStr = fs.readFileSync('src/pages/ManejoSanitario/components/modal_lines.txt', 'utf8');

const modalComponent = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Select } from '../../../components/Select';
import { ManejoSanitario } from '../../../types/database';

export const SanitarioModals = ({
  modalOpen, setModalOpen, itemToDelete, handleDelete,
  groupModalOpen, setGroupModalOpen, formData, setFormData,
  handleSelectAllAnimais, toggleAnimalInGroup, animais
}: any) => (
  <>
    ${modalStr.trim()}
  </>
);
`;
fs.writeFileSync('src/pages/ManejoSanitario/components/SanitarioModals.tsx', modalComponent);
