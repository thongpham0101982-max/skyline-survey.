const fs = require("fs");
const file = "src/app/teacher/input-assessments/ThinkingSkillsForm.tsx";
let code = fs.readFileSync(file, "utf8");

// Change labels to remove numbers and use exact text requested
code = code.replace(
    `{idx + 1}. {item.label}`,
    `- {item.label}`
);

code = code.replace(
    `5. Em hoàn thành các thử thách của giáo viên đặt ra (%)`,
    `Mức độ hoàn thành các thử thách của giáo viên đặt ra (%)`
);

fs.writeFileSync(file, code);
console.log("Patched text labels");
