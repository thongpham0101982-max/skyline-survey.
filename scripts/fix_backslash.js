const fs = require("fs");
const file_path = "src/app/teacher/input-assessments/ThinkingSkillsForm.tsx";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(/\\\$\{/g, "${");

fs.writeFileSync(file_path, content, "utf-8");
console.log("Fixed backslash in template literal");
