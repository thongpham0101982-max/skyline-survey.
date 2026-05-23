import sys

file_path = "src/app/teacher/input-assessments/client.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_content = """        <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">
            {isPsychSubject || isChildDevSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}
        </th>
        {isPsychSubject && (
            <>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}"""

new_content = """        <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-center">
            {isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}
        </th>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>
        )}
        {isPsychSubject && (
            <>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}"""

if old_content in content:
    content = content.replace(old_content, new_content)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched headers successfully")
else:
    print("Failed to find old content")
