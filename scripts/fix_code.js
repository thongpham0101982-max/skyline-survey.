const fs = require("fs");
const path = "src/app/admin/surveys/[id]/questions/client.tsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("id: ew_,")) {
    lines[i] = lines[i].replace("id: ew_,", "      id: `new_${Date.now()}`,");
  }
  if (lines[i].includes("code: Q-,")) {
    lines[i] = lines[i].replace("code: Q-,", "      code: `Q-${Date.now()}`,");
  }
  // Fix template literals lost $
  lines[i] = lines[i].replace(/Tùy ch?n\s+{optIndex\s*\+\s*1}/g, "Tùy ch?n ${optIndex + 1}");
  lines[i] = lines[i].replace(/Tiêu chí\s+{q\.options\.rows\.length\s*\+\s*1}/g, "Tiêu chí ${q.options.rows.length + 1}");
  lines[i] = lines[i].replace(/C?t\s+{q\.options\.columns\.length\s*\+\s*1}/g, "C?t ${q.options.columns.length + 1}");
  lines[i] = lines[i].replace(/Câu h?i\s+{idx\s*\+\s*1}\s*\/\s*{questions\.length}/g, "Câu h?i ${idx + 1}/${questions.length}");
  lines[i] = lines[i].replace(/Tùy ch?n\s+{\s*i\s*\+\s*1\s*}/g, "Tùy ch?n ${i + 1}");
}

fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("Fixed file");
