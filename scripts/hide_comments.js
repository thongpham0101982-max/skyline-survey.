const fs = require('fs');

const clientPath = 'src/app/teacher/input-assessments/client.tsx';
let code = fs.readFileSync(clientPath, 'utf8');

// 1. Add hideComments logic
const search1 = 'const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");';
const replace1 = search1 + '\n    const hideComments = ["toán", "tiếng việt", "ngữ văn"].some(s => subName.includes(s));';
code = code.replace(search1, replace1);

// 2. Change TH text
const search2 = '{isPsychSubject ? "Form Khảo sát" : "Chi tiết Điểm & Nhận xét"}';
const replace2 = '{isPsychSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét")}';
code = code.replace(search2, replace2);

// 3. Hide comments in loop
const search3 = '{Array.from({length: (currentAssignment.subject.commentColumns ?? 1)}).map((_, colIdx) => {';
const replace3 = '{!hideComments && Array.from({length: (currentAssignment.subject.commentColumns ?? 1)}).map((_, colIdx) => {';
code = code.replace(search3, replace3);

fs.writeFileSync(clientPath, code, 'utf8');
