const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

const tableBlock = `              <Table
                columns={columns}
                data={animais}
                onRowClick={(row) => handleOpenView(row)}
                onAction={handleActionClick}
                selectedIds={selectedAnimalIds}
                onToggleSelect={toggleSelectAnimal}
                onSelectAll={() => {
                  if (selectedAnimalIds.length === animais.length) clearSelectedAnimals();
                  else selectAllAnimals(animais.map(a => a.id));
                }}
              />
            )}`;

const tableWithPagination = `              <Table
                columns={columns}
                data={animais}
                onRowClick={(row) => handleOpenView(row)}
                onAction={handleActionClick}
                selectedIds={selectedAnimalIds}
                onToggleSelect={toggleSelectAnimal}
                onSelectAll={() => {
                  if (selectedAnimalIds.length === animais.length) clearSelectedAnimals();
                  else selectAllAnimals(animais.map(a => a.id));
                }}
              />
              <Pagination
                currentPage={page}
                totalPages={Math.ceil((total || 0) / limit) || 1}
                onPageChange={(p) => setPage(p)}
                totalItems={total}
                itemsPerPage={limit}
              />
            )}`;

content = content.replace(tableBlock, tableWithPagination);
fs.writeFileSync(path, content);
console.log('Pagination applied to Animais.tsx');
