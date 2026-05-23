const fs = require('fs');

// 1. Update roles/client.tsx
let clientC = fs.readFileSync('src/app/admin/roles/client.tsx', 'utf8');

const additionalModules = `  { code: "INPUT_ASSESSMENTS", name: "Quản lý KSNL đầu vào" },
  { code: "STUDENT_ACHIEVEMENTS", name: "Thành tích Học sinh" },
  { code: "TASKS", name: "Điều hành Công việc" },
  { code: "WEEKLY_REPORTS", name: "Báo cáo Tuần" }
];`;

clientC = clientC.replace(/];/, ",\n" + additionalModules);
fs.writeFileSync('src/app/admin/roles/client.tsx', clientC, 'utf8');

// 2. Update Sidebar.tsx
let sidebarC = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sidebarC = sidebarC.replace(/module: "ANY" }, \/\/ for admin\/tasks/, `module: "TASKS" },`);
sidebarC = sidebarC.replace(/{ href: "\/admin\/tasks", label: "Điều hành CV", icon: ClipboardList, module: "ANY" },/, `{ href: "/admin/tasks", label: "Điều hành CV", icon: ClipboardList, module: "TASKS" },`);
sidebarC = sidebarC.replace(/{ href: "\/admin\/weekly-reports", label: "Báo cáo Tuần", icon: FileSpreadsheet, module: "ANY" },/, `{ href: "/admin/weekly-reports", label: "Báo cáo Tuần", icon: FileSpreadsheet, module: "WEEKLY_REPORTS" },`);
sidebarC = sidebarC.replace(/{ href: "\/admin\/input-assessments", label: "Quản lý KSNL Đầu vào", icon: ClipboardList, module: "ANY" },/, `{ href: "/admin/input-assessments", label: "Quản lý KSNL Đầu vào", icon: ClipboardList, module: "INPUT_ASSESSMENTS" },`);
sidebarC = sidebarC.replace(/{ href: "\/admin\/achievements", label: "Thành tích Học sinh", icon: GraduationCap, module: "ANY" },/, `{ href: "/admin/achievements", label: "Thành tích Học sinh", icon: GraduationCap, module: "STUDENT_ACHIEVEMENTS" },`);

fs.writeFileSync('src/components/Sidebar.tsx', sidebarC, 'utf8');

console.log('Roles and Sidebar updated');
