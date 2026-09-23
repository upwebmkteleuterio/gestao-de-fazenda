const fs = require('fs');

const ids = [
  'search_produto',
  'filter_categoria',
  'search_matriz',
  'filter_protocolo',
  'filter_data_inicio',
  'filter_data_fim',
  'search_manejo',
  'filter_tipo_manejo',
  'search_pasto',
  'filtro_status_ocupacao'
];

const files = [
  'src/pages/Insumos.tsx',
  'src/pages/ManejoReprodutivo.tsx',
  'src/pages/ManejoSanitario.tsx',
  'src/pages/Pastagens.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  ids.forEach(id => {
    // Regex to match <Input ... id="id" or <Select ... id="id"
    // Since we just want to add noMargin to the opening tag:
    // It's easier to replace `<Input\n              id="id"` with `<Input noMargin\n              id="id"`
    // Or just find `<Input` or `<Select` that precedes `id="id"`.
    
    content = content.replace(new RegExp(`<Input\\s+id="${id}"`), `<Input noMargin id="${id}"`);
    content = content.replace(new RegExp(`<Input\\n\\s*id="${id}"`), `<Input noMargin\n              id="${id}"`);
    
    content = content.replace(new RegExp(`<Select\\s+id="${id}"`), `<Select noMargin id="${id}"`);
    content = content.replace(new RegExp(`<Select\\n\\s*id="${id}"`), `<Select noMargin\n              id="${id}"`);
  });

  fs.writeFileSync(file, content);
});
