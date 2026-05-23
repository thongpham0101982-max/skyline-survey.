const fs = require('fs');

// 1. Fix client.tsx
const clientPath = 'src/app/admin/input-assessments/client.tsx';
let clientCode = fs.readFileSync(clientPath, 'utf8');
const search1 = 'if (j.emailError) { notify(Phân công thành công NHƯNG gửi mail thất bại: , "err") } else { notify("Đã hoàn tất phân công và gửi email") }';
const replace1 = 'notify("Đã hoàn tất phân công");';
clientCode = clientCode.replace(search1, replace1);
fs.writeFileSync(clientPath, clientCode, 'utf8');

// 2. Fix route.ts
const routePath = 'src/app/api/input-assessment-assignments/route.ts';
let routeCode = fs.readFileSync(routePath, 'utf8');
const importSearch = 'import { sendMail } from "@/lib/mailer";\r\n';
routeCode = routeCode.replace(importSearch, '');
const importSearch2 = 'import { sendMail } from "@/lib/mailer";\n';
routeCode = routeCode.replace(importSearch2, '');

const emailStartIndex = routeCode.indexOf('       // Send email notification to the teacher');
const emailEndIndex = routeCode.indexOf('       return NextResponse.json({ success: true, count: successCount });', emailStartIndex);

if (emailStartIndex !== -1 && emailEndIndex !== -1) {
    routeCode = routeCode.substring(0, emailStartIndex) + routeCode.substring(emailEndIndex);
}

fs.writeFileSync(routePath, routeCode, 'utf8');
