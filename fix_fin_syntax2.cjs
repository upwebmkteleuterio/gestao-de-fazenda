const fs = require('fs');
const path = 'src/pages/Financeiro.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("          </>\n        )\n      </Card>", "          </>\n        )}\n      </Card>");

fs.writeFileSync(path, content);
