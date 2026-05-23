const fs = require('fs');
const content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
const searchString = '{ href: "#", label: "Khảo thí", icon: null, isHeader: true },';
const replaceString = searchString + '\n      { href: "/admin/input-assessments", label: "Quản lý KSNL Đầu vào", icon: ClipboardList, module: "ANY" },';
if(content.includes(searchString) && !content.includes('/admin/input-assessments')) {
    fs.writeFileSync('src/components/Sidebar.tsx', content.replace(searchString, replaceString), 'utf8');
    console.log('Sidebar updated');
} else {
    console.log('Already updated or pattern not found');
}
