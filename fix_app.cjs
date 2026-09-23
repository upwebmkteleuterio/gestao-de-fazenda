const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { Lotes }')) {
  content = content.replace("import { AnimaisPage } from './pages/Animais';", "import { AnimaisPage } from './pages/Animais';\nimport { Lotes as LotesPage } from './pages/Lotes';");
  
  const caseToAdd = `      case 'Lotes':
        return <LotesPage />;`;
        
  content = content.replace("case 'Animais':", caseToAdd + "\n      case 'Animais':");
  fs.writeFileSync(path, content);
}
