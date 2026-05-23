const fs = require("fs");
const file_path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(/\{isPsychSubject \|\| isChildDevSubject \? "Form Khảo sát" : \(hideComments \? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét"\)\}/g, `{isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}`);

content = content.replace(/\{\(isChildDevSubject \|\| isThinkingSkillsSubject\) && \(\s*<th className="px-4 py-4 font-bold text-amber-800 bg-amber-50\/50 uppercase tracking-wider text-xs text-left min-w-\[250px\]">Nhận xét chung<\/th>\s*\)\s*\}/g, ""); // Remove if already added incorrectly, just in case

const target = `<th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">
            {isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}
        </th>`;
        
const newTarget = `<th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">
            {isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}
        </th>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>
        )}`;
        
content = content.replace(target, newTarget);
// also handle CRLF version
content = content.replace(target.replace(/\n/g, '\r\n'), newTarget.replace(/\n/g, '\r\n'));

fs.writeFileSync(file_path, content, "utf-8");
console.log("Patched headers regex successfully");
