const fs = require("fs");
let content = fs.readFileSync("src/app/api/input-assessment-students/route.ts", "utf8");

content = content.replace(/className: data\.className \|\| null,/g, "className: data.className || null,\n           grade: data.grade || null,");

fs.writeFileSync("src/app/api/input-assessment-students/route.ts", content, "utf8");
console.log("Patched route");
