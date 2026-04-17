const fs = require('fs');
let c = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

c = c.replace(/title = "Teacher Portal"/, 'title = "Cổng Giáo viên"');
c = c.replace(
  /\{ href: "\/teacher\/classes", label: "My Classes", icon: Layers \}/,
  '{ href: "/teacher/classes", label: "Lớp học", icon: Layers },\n      { href: "/teacher/input-assessments", label: "Nhập điểm Khảo sát", icon: ClipboardList }'
);

fs.writeFileSync('src/components/Sidebar.tsx', c, 'utf8');
console.log('Sidebar updated');
