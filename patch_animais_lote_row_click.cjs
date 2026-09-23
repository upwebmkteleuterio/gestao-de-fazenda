const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `            <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/20">
              <Table
                columns={[
                  { header: 'ID / Brinco', render: (r) => <span className="font-bold">{r.brinco}</span> },
                  { header: 'Categoria', accessor: 'categoria' },
                  { header: 'Tipo', accessor: 'tipo_animal' },
                  { header: 'Sexo', accessor: 'sexo' }
                ]}
                data={todosAnimais.filter((a) => selectedLote.animais_ids.includes(a.id))}
                emptyMessage="Nenhum animal encontrado."
              />
            </div>`;

const newStr = `            <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/20">
              <Table
                columns={[
                  { header: 'ID / Brinco', render: (r) => <span className="font-bold">{r.brinco}</span> },
                  { header: 'Categoria', accessor: 'categoria' },
                  { header: 'Tipo', accessor: 'tipo_animal' },
                  { header: 'Sexo', accessor: 'sexo' }
                ]}
                data={todosAnimais.filter((a) => selectedLote.animais_ids.includes(a.id))}
                emptyMessage="Nenhum animal encontrado."
                onRowClick={(row) => {
                  setViewLoteModalOpen(false);
                  handleOpenView(row);
                }}
              />
            </div>`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(path, content);
console.log('Patched onRowClick in Animais Lotes Modal');
