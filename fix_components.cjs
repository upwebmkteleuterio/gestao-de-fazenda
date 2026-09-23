const fs = require('fs');

const inputPath = 'src/components/Input.tsx';
let inputContent = fs.readFileSync(inputPath, 'utf8');
inputContent = inputContent.replace(/w-full flex flex-col justify-between h-full/g, 'w-full flex flex-col');
inputContent = inputContent.replace(/relative w-full mt-auto/g, 'relative w-full');
fs.writeFileSync(inputPath, inputContent);

const selectPath = 'src/components/Select.tsx';
let selectContent = fs.readFileSync(selectPath, 'utf8');
selectContent = selectContent.replace(/w-full flex flex-col justify-between h-full/g, 'w-full flex flex-col');
selectContent = selectContent.replace(/w-full mt-auto/g, 'w-full');
fs.writeFileSync(selectPath, selectContent);

