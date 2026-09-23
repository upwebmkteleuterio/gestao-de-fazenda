const fs = require('fs');
let content = fs.readFileSync('src/pages/Animais.tsx', 'utf8');

const oldSearch = `<div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por ID/Brinco..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>`;

const newSearch = `<Input
                noMargin
                id="search"
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID/Brinco..."
              />`;

content = content.replace(oldSearch, newSearch);
fs.writeFileSync('src/pages/Animais.tsx', content);
