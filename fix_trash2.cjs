const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { Plus, Edit } from 'lucide-react';", "import { Plus, Edit, Trash2 } from 'lucide-react';");
fs.writeFileSync(path, content);
