const fs = require('fs');
const path = 'src/pages/ManejoSanitario.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/formData={formData}/, "formData={formData}\n        setFormData={setFormData}");

fs.writeFileSync(path, content);
