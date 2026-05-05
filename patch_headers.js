const fs = require("fs");
const file_path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

const old_content = `        <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">\r
            {isPsychSubject || isChildDevSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}\r
        </th>\r
        {isPsychSubject && (\r
            <>\r
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>\r
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>\r
            </>\r
        )}`;

const new_content = `        <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">\r
            {isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}\r
        </th>\r
        {(isChildDevSubject || isThinkingSkillsSubject) && (\r
            <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>\r
        )}\r
        {isPsychSubject && (\r
            <>\r
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>\r
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>\r
            </>\r
        )}`;

if (content.includes(old_content)) {
    content = content.replace(old_content, new_content);
    fs.writeFileSync(file_path, content, "utf-8");
    console.log("Patched headers successfully");
} else {
    console.log("Failed to find old content");
}
