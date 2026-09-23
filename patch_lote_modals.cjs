const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add createPortal import
if (!content.includes("import { createPortal }")) {
  content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { createPortal } from 'react-dom';");
}

// 2. Locate the two modals
const loteModalStr = `      {/* Modal Criar Lote */}
      {loteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">`;
        
const newLoteModalStr = `      {/* Modal Criar Lote */}
      {loteModalOpen && createPortal(
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">`;

content = content.replace(loteModalStr, newLoteModalStr);

// Close portal
const loteModalCloseStr = `            </div>
          </div>
        </div>
      )}`;
      
const newLoteModalCloseStr = `            </div>
          </div>
        </div>,
        document.body
      )}`;
content = content.replace(loteModalCloseStr, newLoteModalCloseStr);

// 3. Same for View Lote Modal
const viewLoteModalStr = `      {/* Modal Visualizar Lote */}
      {viewLoteModalOpen && selectedLote && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">`;

const newViewLoteModalStr = `      {/* Modal Visualizar Lote */}
      {viewLoteModalOpen && selectedLote && createPortal(
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">`; // Z-[90] so SlidePanel at [9999] goes over it

content = content.replace(viewLoteModalStr, newViewLoteModalStr);

const viewLoteModalCloseStr = `            </div>
          </div>
        </div>
      )}`;

const newViewLoteModalCloseStr = `            </div>
          </div>
        </div>,
        document.body
      )}`;

content = content.replace(viewLoteModalCloseStr, newViewLoteModalCloseStr);

// 4. Remove setViewLoteModalOpen(false) in onRowClick
const oldRowClick = `                onRowClick={(row) => {
                  setViewLoteModalOpen(false);
                  handleOpenView(row);
                }}`;
                
const newRowClick = `                onRowClick={(row) => {
                  // REMOVED setViewLoteModalOpen(false) to keep modal open behind SlidePanel
                  handleOpenView(row);
                }}`;
content = content.replace(oldRowClick, newRowClick);

fs.writeFileSync(path, content);
console.log('Lote Modals patched with createPortal and keep-open logic');
