const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /import\s+\{\s*X\s*,\s*Layers\s*,\s*Plus\s*(,\s*Trash2)?\s*\}\s*from\s+'lucide-react'\s*;/g;
if (!content.includes('import { X, Layers, Plus, Trash2 } from \'lucide-react\';')) {
  content = content.replace(regex, "import { X, Layers, Plus, Trash2 } from 'lucide-react';");
  // maybe it didn't match because the original was a one-liner without spaces:
  // "import { X, Layers, Plus } from 'lucide-react';"
  content = content.replace("import { X, Layers, Plus } from 'lucide-react';", "import { X, Layers, Plus, Trash2 } from 'lucide-react';");
  fs.writeFileSync(path, content);
}
