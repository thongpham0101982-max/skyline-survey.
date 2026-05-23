const fs = require("fs");
const file_path = "src/app/teacher/input-assessments/client.tsx";
let lines = fs.readFileSync(file_path, "utf-8").split("\n");

// Look for the header around line 438
for (let i = 430; i < 445; i++) {
    if (lines[i] && lines[i].includes("isChildDevSubject ? \"Form")) {
        lines[i] = lines[i].replace("isPsychSubject || isChildDevSubject", "isPsychSubject || isChildDevSubject || isThinkingSkillsSubject");
    }
}

// Check where to insert Nhận xét chung header
for (let i = 435; i < 445; i++) {
    if (lines[i] && lines[i].includes("</th>") && lines[i-1] && lines[i-1].includes("Form Khảo sát")) {
        // Insert right after this </th>
        lines.splice(i + 1, 0, `        {(isChildDevSubject || isThinkingSkillsSubject) && (\r`, `            <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>\r`, `        )}\r`);
        break;
    }
}

fs.writeFileSync(file_path, lines.join("\n"));
console.log("Patched by lines successfully");
