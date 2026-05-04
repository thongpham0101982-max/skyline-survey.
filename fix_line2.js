const fs = require("fs");
const path = "src/app/teacher/input-assessments/ChildDevStandardForm.tsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes("onClick=:") || lines[i].includes("handleSave}")) {
    lines[i] = '                        onClick={handleSave}';
  }
}
fs.writeFileSync(path, lines.join("\n"));
console.log("Fixed by forcing the line");
