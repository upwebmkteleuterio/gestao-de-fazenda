const fs = require('fs');
const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("{ name: 'Lotes'")) {
  content = content.replace("{ name: 'Animais', icon: Users },", "{ name: 'Animais', icon: Users },\n    { name: 'Lotes', icon: Users },");
  
  // also need to import an icon for Lotes. Maybe replace Users with Layers
  if (!content.includes('Layers')) {
    content = content.replace('Users,', 'Users, Layers,');
  }
  content = content.replace("{ name: 'Lotes', icon: Users },", "{ name: 'Lotes', icon: Layers },");
  
  fs.writeFileSync(path, content);
}
