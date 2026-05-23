const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");
content = content.split("assignment.systemCode").join("assignment.educationSystem");
fs.writeFileSync(path, content, "utf8");
