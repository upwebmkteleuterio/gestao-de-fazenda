const fs = require('fs');
const path = 'src/pages/Pastagens.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { Pagination }')) {
  content = content.replace("import { Table, Column } from '../components/Table';", "import { Table, Column } from '../components/Table';\nimport { Pagination } from '../components/Pagination';");
}

const paginationElement = `      </Card>

      <Pagination
        currentPage={page}
        totalPages={Math.ceil((total || 0) / 10) || 1}
        onPageChange={(p) => setPage(p)}
        totalItems={total}
        itemsPerPage={10}
      />`;

// we need to place this after </Card> where the table is.
// let's just find the closing </Card> of the table and replace it with `</Card>\n\n<Pagination ... />`
// Note: There's a Card for the header (Indicadores) maybe? Let's check how many Cards are there.
content = content.replace(/<\/Card>\s*<PastagensSlidePanel/g, paginationElement + "\n\n      <PastagensSlidePanel");
fs.writeFileSync(path, content);
