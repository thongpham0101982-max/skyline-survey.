const fs = require('fs');
let c = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

c = c.replace(
  /\{ href: "\/teacher\/classes", label: "Lớp học", icon: Layers \},\s*\{ href: "\/teacher\/input-assessments", label: "Nhập điểm Khảo sát", icon: ClipboardList \}/,
  '{ href: "/teacher/classes", label: "Lớp học", icon: Layers },\n      { href: "#", label: "Khảo sát đầu vào", icon: null, isHeader: true },\n      { href: "/teacher/input-assessments", label: "Nhập điểm KS theo phân công", icon: ClipboardList }'
);

fs.writeFileSync('src/components/Sidebar.tsx', c, 'utf8');
console.log('Sidebar updated properly');
