const fs = require('fs');

// fix Lotes type issue
const lotesPath = 'src/pages/Lotes/index.tsx';
let lotesContent = fs.readFileSync(lotesPath, 'utf8');
lotesContent = lotesContent.replace(/render: \(r\) =>/g, 'render: (r: any) =>');
lotesContent = lotesContent.replace('data={lotes as any}', 'data={lotes}');
fs.writeFileSync(lotesPath, lotesContent);

// fix Trash2 missing
const pesagemPanelPath = 'src/pages/Pesagens/components/PesagemSlidePanel.tsx';
let pesagemContent = fs.readFileSync(pesagemPanelPath, 'utf8');
if (!pesagemContent.includes('import { Trash2 }')) {
  pesagemContent = pesagemContent.replace("import { X, Layers, Plus } from 'lucide-react';", "import { X, Layers, Plus, Trash2 } from 'lucide-react';");
  // Also sometimes the icon import has everything mixed in one line, so let's handle that:
  if (!pesagemContent.includes("Trash2")) {
    pesagemContent = pesagemContent.replace("X, Layers, Plus", "X, Layers, Plus, Trash2");
  }
}
fs.writeFileSync(pesagemPanelPath, pesagemContent);

