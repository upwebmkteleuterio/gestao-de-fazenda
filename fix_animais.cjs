const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove Lotes Tab from Tabs definition
content = content.replace("{ id: 'lotes', label: 'Lotes / Retiros', badge: lotes.length > 0 ? lotes.length : undefined },", "");

// Remove lotes tab content block
const lotesBlockStart = ") : mainTab === 'lotes' ? (";
if (content.includes(lotesBlockStart)) {
  const lines = content.split('\n');
  let newLines = [];
  let skip = false;
  let nesting = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(") : mainTab === 'lotes' ? (")) {
      skip = true;
      continue;
    }
    if (skip) {
      if (lines[i].includes("</Card>")) {
        skip = false;
        newLines.push("        ) : null}");
        newLines.push("      </Card>");
      }
      continue;
    }
    
    newLines.push(lines[i]);
  }
  
  fs.writeFileSync(path, newLines.join('\n'));
}

