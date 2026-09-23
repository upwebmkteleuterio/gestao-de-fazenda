const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  ") : (\n              <Table\n                columns={columns}",
  ") : (\n              <>\n                <Table\n                  columns={columns}"
);

content = content.replace(
  "                itemsPerPage={limit}\n              />\n            )}",
  "                itemsPerPage={limit}\n              />\n              </>\n            )}"
);

fs.writeFileSync(path, content);
console.log('Fixed Animais.tsx');
