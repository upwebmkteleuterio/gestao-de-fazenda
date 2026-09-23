const fs = require('fs');
const path = 'src/pages/Animais/components/AnimaisSlidePanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Refactor to explicit return
content = content.replace(
  "}: any) => (",
  "}: any) => {\n  const [idadeMode, setIdadeMode] = React.useState<'data' | 'meses'>('data');\n  return ("
);

// Close the return
const lastClosingIdx = content.lastIndexOf(");");
if (lastClosingIdx !== -1) {
    content = content.substring(0, lastClosingIdx) + ");\n};" + content.substring(lastClosingIdx + 2);
}

// Write it
fs.writeFileSync(path, content);
console.log('Refactored SlidePanel to explicit return');
