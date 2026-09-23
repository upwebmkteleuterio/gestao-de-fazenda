const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemModals.tsx';
let content = fs.readFileSync(path, 'utf8');

const prefixToRemove = "import React from 'react';import { Modal } from '../../../components/Modal';import { Button } from '../../../components/Button';import { Select }import { Input } from '../../../components/Select';import { Pesagem } from '../../../types/database';";

const prefixToReplaceWith = "import React from 'react';import { Modal } from '../../../components/Modal';import { Button } from '../../../components/Button';import { Select } from '../../../components/Select';import { Input } from '../../../components/Input';import { Pesagem } from '../../../types/database';";

if (content.startsWith(prefixToRemove)) {
  content = content.replace(prefixToRemove, prefixToReplaceWith);
} else {
  // Let's just find the start of 'interface PesagemModalsProps'
  const index = content.indexOf('interface PesagemModalsProps');
  if (index !== -1) {
    content = prefixToReplaceWith + content.substring(index);
  }
}

fs.writeFileSync(path, content);
