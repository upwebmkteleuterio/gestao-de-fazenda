const fs = require('fs');
const path = 'src/pages/Lotes/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add page, limit states and Pagination component
content = content.replace(
  "  const { lotes, deleteLote } = useLotes();",
  "  const [page, setPage] = useState(1);\n  const limit = 10;\n  const { lotes, totalLotes, deleteLote } = useLotes({ page, limit });"
);

content = content.replace(
  "import { useLotes } from '../../hooks/useLotes';",
  "import { useLotes } from '../../hooks/useLotes';\nimport { Pagination } from '../../components/Pagination';"
);

// Insert Pagination below Table
const tableEndStr = "            />\n          )}";
const paginationStr = `            />\n          )}\n          <Pagination\n            currentPage={page}\n            totalPages={Math.ceil((totalLotes || 0) / limit)}\n            onPageChange={setPage}\n            totalItems={totalLotes}\n            itemsPerPage={limit}\n          />`;

content = content.replace(tableEndStr, paginationStr);

fs.writeFileSync(path, content);
