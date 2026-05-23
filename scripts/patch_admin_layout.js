const fs = require('fs');
const layoutPath = 'src/app/admin/layout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

// Add NotificationBell import
if (!layout.includes('NotificationBell')) {
  layout = layout.replace(
    'import { Sidebar } from "@/components/Sidebar"',
    'import { Sidebar } from "@/components/Sidebar"\nimport { NotificationBell } from "@/components/NotificationBell"'
  );
  
  // Add NotificationBell component after main tag opening
  layout = layout.replace(
    '<main className="flex-1 p-8">',
    '<main className="flex-1 p-8 relative">\n        <NotificationBell />'
  );
  
  fs.writeFileSync(layoutPath, layout);
  console.log('SUCCESS: admin layout updated with NotificationBell');
} else {
  console.log('NotificationBell already present');
}
