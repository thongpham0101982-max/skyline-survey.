const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");
content = content.replace(/Khối \{a\.grade \|\| "Tất cả"\} . Hệ \{a\.educationSystem \|\| "Tất cả"\}/g, '{a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"})');
fs.writeFileSync(path, content, "utf8");
