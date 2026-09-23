const fs = require('fs');
const path = 'src/components/Select.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("export interface SelectOption {  label: string;  value: string | number;}", "export interface SelectOption {  label: string;  value: string | number; disabled?: boolean; }");
content = content.replace("<option key={i} value={opt.value}>", "<option key={i} value={opt.value} disabled={opt.disabled}>");

fs.writeFileSync(path, content);
