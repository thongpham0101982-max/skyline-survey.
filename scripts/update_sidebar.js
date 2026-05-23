const fs = require('fs');
let sb = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sb = sb.replace(
  'ClipboardList, LayoutDashboard',
  'ClipboardList, ListChecks, LayoutDashboard'
);

sb = sb.replace(
  'icon: ClipboardList, module: "ANY" },',
  'icon: ClipboardList, module: "ANY" },\n      { href: "/admin/input-assessments/students", label: "Danh sách Kh?o sát", icon: ListChecks, module: "ANY" },'
);

fs.writeFileSync('src/components/Sidebar.tsx', sb, 'utf8');
console.log('Sidebar updated!');
