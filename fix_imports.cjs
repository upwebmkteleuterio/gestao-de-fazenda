const fs = require('fs');
const path = 'src/pages/Pesagens/components/PesagemModals.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { Select }import { Input } from '../../../components/Select';", "import { Select } from '../../../components/Select';\nimport { Input } from '../../../components/Input';");

fs.writeFileSync(path, content);
