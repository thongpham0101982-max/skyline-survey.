const fs = require("fs");
let content = fs.readFileSync("src/app/api/input-assessment-students/route.ts", "utf8");

content = content.replace(/kqHocTap: data.kqHocTap \|\| null,/g, 'kqHocTap: data.kqHocTap || null,\n           hoSoCtQuocTe: data.hoSoCtQuocTe || null,');

content = content.replace(/kqHocTap: d.kqHocTap \|\| null,/g, 'kqHocTap: d.kqHocTap || null,\n              hoSoCtQuocTe: d.hoSoCtQuocTe || null,');

fs.writeFileSync("src/app/api/input-assessment-students/route.ts", content, "utf8");
console.log("Patched API");
