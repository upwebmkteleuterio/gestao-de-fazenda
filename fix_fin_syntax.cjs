const fs = require('fs');
const path = 'src/pages/Financeiro.tsx';
let content = fs.readFileSync(path, 'utf8');

const tableStr = `        ) : (
          <Table
            columns={columns}
            data={transacoes}
            selectedIds={selectedFinIds}
            onToggleSelect={handleToggleSelectFin}
            onSelectAll={handleSelectAllFins}
          />
          <Pagination`;

const replacement = `        ) : (
          <>
          <Table
            columns={columns}
            data={transacoes}
            selectedIds={selectedFinIds}
            onToggleSelect={handleToggleSelectFin}
            onSelectAll={handleSelectAllFins}
            onAction={(action, row) => {
              if (action === 'edit' || action === 'view') {
                setSelectedTransacao(row);
                setFormData({ ...row });
                setSlideOpen(true);
              } else if (action === 'delete') {
                setItemToDelete(row);
                setModalOpen(true);
              }
            }}
          />
          <Pagination`;

content = content.replace(tableStr, replacement);
content = content.replace("          </Pagination>\n        )}", "          />\n          </>\n        )");
content = content.replace("          />\n        )}", "          />\n          </>\n        )");

fs.writeFileSync(path, content);
