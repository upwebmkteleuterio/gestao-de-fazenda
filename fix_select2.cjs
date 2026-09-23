const fs = require('fs');
const path = 'src/components/Select.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("export interface SelectOption {\n  label: string;\n  value: string | number;\n}", "export interface SelectOption {\n  label: string;\n  value: string | number;\n  disabled?: boolean;\n}");
// the file was compressed onto one line possibly.
content = content.replace("export interface SelectOption {  label: string;  value: string | number;}", "export interface SelectOption {  label: string;  value: string | number; disabled?: boolean; }");

content = content.replace("<option key={i} value={opt.value}>", "<option key={i} value={opt.value} disabled={opt.disabled}>");
fs.writeFileSync(path, content);
