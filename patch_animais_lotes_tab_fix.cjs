const fs = require('fs');
const path = 'src/pages/Animais.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `        ) : (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-50/60 dark:bg-red-950/30`;

const newStr = `        ) : mainTab === 'descartadas' ? (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-50/60 dark:bg-red-950/30`;

content = content.replace(oldStr, newStr);

const endOfDescartadas = `              />
            )}
          </div>
        )}
      </Card>`;

const newEndOfDescartadas = `              />
            )}
          </div>
        ) : mainTab === 'lotes' ? (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Gestão de Lotes / Retiros ({lotes.length})
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Grupos de animais organizados para manejos coletivos (ex: vacinação, pesagem, transferência de pasto).
                </p>
              </div>
            </div>
            {lotes.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Nenhum lote criado ainda. Selecione animais na aba "Rebanho Geral" para criar um.
                </p>
              </div>
            ) : (
              <Table
                columns={[
                  { header: 'Nome do Lote', render: (r) => <span className="font-bold">{r.nome}</span> },
                  { header: 'Data de Criação', render: (r) => new Date(r.data_criacao).toLocaleDateString('pt-BR') },
                  { header: 'Animais', render: (r) => <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">{r.animais_ids.length} cabeças</span> }
                ]}
                data={lotes as any}
                onRowClick={(row) => handleOpenLoteView(row)}
                onAction={(action, row) => {
                  if (action === 'delete') {
                    // we could add a handle delete lote here
                  }
                }}
              />
            )}
          </div>
        ) : null}
      </Card>`;

content = content.replace(endOfDescartadas, newEndOfDescartadas);

fs.writeFileSync(path, content);
console.log('Fixed Lotes tab rendering');
