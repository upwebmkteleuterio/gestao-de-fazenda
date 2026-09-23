const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemModals.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /import React from 'react';import \{ Modal \} from '\.\.\/\.\.\/\.\.\/components\/Modal';import \{ Button \} from '\.\.\/\.\.\/\.\.\/components\/Button';import \{ Select \}import \{ Input \} from '\.\.\/\.\.\/\.\.\/components\/Select';import \{ Pesagem \} from '\.\.\/\.\.\/\.\.\/types\/database';/;

const newHead = `import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Select } from '../../../components/Select';
import { Input } from '../../../components/Input';
import { Pesagem } from '../../../types/database';`;

content = content.replace(regex, newHead);

// Fallback if the regex fails
if (content.includes("import { Select }import { Input }")) {
  content = content.replace(/import \{ Select \}import \{ Input \} from '\.\.\/\.\.\/\.\.\/components\/Select';/, "import { Select } from '../../../components/Select';\\nimport { Input } from '../../../components/Input';");
}

fs.writeFileSync(path, content);
