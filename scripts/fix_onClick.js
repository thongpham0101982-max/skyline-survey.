const fs = require("fs");
const path = "src/app/teacher/input-assessments/ChildDevStandardForm.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace("onClick=: handleSave}", "onClick={handleSave}");

fs.writeFileSync(path, content);
