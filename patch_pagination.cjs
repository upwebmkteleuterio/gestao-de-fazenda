const fs = require('fs');
const path = 'src/components/Pagination.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the early return and fix Math for 0 items
const oldLogic = `  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * (itemsPerPage || 10) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || 0);`;

const newLogic = `  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * (itemsPerPage || 10) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || 0);`;

content = content.replace(oldLogic, newLogic);
content = content.replace(/totalPages/g, 'safeTotalPages');
// Re-replace the prop definition because we renamed it globally by mistake above
content = content.replace(/safeTotalPages: number;/g, 'totalPages: number;');
content = content.replace(/safeTotalPages,/g, 'totalPages,');

fs.writeFileSync(path, content);
console.log('Pagination patched');
