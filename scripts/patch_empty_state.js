const fs = require('fs');
let content = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Add empty state for periods
content = content.replace('{pLoading ? <Spin/> : (', '{pLoading ? <Spin/> : periods.length === 0 ? <Empty icon={Calendar} text="Chưa có Kỳ khảo sát nào" sub="Bấm Tạo Kỳ mới để bắt đầu" /> : (');

// 2. Add cache: 'no-store' to the fetch calls
content = content.replace('await fetch(`/api/input-assessments?academicYearId=${yearId}`)', 'await fetch(`/api/input-assessments?academicYearId=${yearId}&t=${Date.now()}`)');

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', content, 'utf8');
console.log("PATCH SUCCESSFUL");
