const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

// 1. Add import for ThinkingSkillsForm
if (!code.includes("ThinkingSkillsForm")) {
    code = code.replace(
        `import ChildDevStandardForm from "./ChildDevStandardForm";`,
        `import ChildDevStandardForm from "./ChildDevStandardForm";\nimport ThinkingSkillsForm from "./ThinkingSkillsForm";`
    );
}

// 2. Add state for ThinkingSkillsForm
if (!code.includes("isThinkingSkillsModalOpen")) {
    code = code.replace(
        `const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);`,
        `const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);\n    const [isThinkingSkillsModalOpen, setIsThinkingSkillsModalOpen] = useState(false);\n    const [activeThinkingSkillsStudent, setActiveThinkingSkillsStudent] = useState<any>(null);`
    );
}

// 3. Add isThinkingSkillsSubject detection
if (!code.includes("const isThinkingSkillsSubject")) {
    code = code.replace(
        `const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";`,
        `const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";\n        const isThinkingSkillsSubject = (subNameNormalized.includes("năng lực tư duy") || subCode.includes("nltd")) && gradeVal === "1";`
    );
}

// 4. Update table headers to account for isThinkingSkillsSubject
code = code.replace(
    `{isChildDevSubject && (`,
    `{(isChildDevSubject || isThinkingSkillsSubject) && (`
);

code = code.replace(
    `{isPsychSubject || isChildDevSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}`,
    `{isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết điểm" : "Chi tiết điểm & Nhận xét")}`
);

// 5. Update table rows
// Let's find the isChildDevSubject render block and add isThinkingSkillsSubject

const renderCode = `        <td className="px-4 py-4 bg-transparent">
            {isChildDevSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">`;

const newRenderCode = `        <td className="px-4 py-4 bg-transparent">
            {isThinkingSkillsSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveThinkingSkillsStudent(st); setIsThinkingSkillsModalOpen(true); }}
                    className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    Mở Form Đánh giá
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">Đã đánh giá</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Logic: {st.scoreVals[0] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-indigo-500">L.Tưởng: {st.scoreVals[1] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">P.Biện: {st.scoreVals[2] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-amber-500">GQ.VĐ: {st.scoreVals[3] || "-"}</span>
                          </div>
                          <div className="text-[11px] font-bold text-sky-600 mt-0.5">HT Thử thách: {st.scoreVals[4] || "0"}%</div>
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>
            ) : isChildDevSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">`;

code = code.replace(renderCode, newRenderCode);

// 6. Disable save button logic
code = code.replace(
    `disabled={isLocked || isPsychSubject || isChildDevSubject}`,
    `disabled={isLocked || isPsychSubject || isChildDevSubject || isThinkingSkillsSubject}`
);
code = code.replace(
    `shadow-sm \${isLocked || isPsychSubject || isChildDevSubject ? "bg-slate-200 text-slate-400`,
    `shadow-sm \${isLocked || isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "bg-slate-200 text-slate-400`
);

// 7. Add modal at the end
const modalCode = `{isChildDevModalOpen && activeChildDevStudent && (
                <ChildDevStandardForm
                    student={activeChildDevStudent}
                    onClose={() => {
                        setIsChildDevModalOpen(false);
                        setActiveChildDevStudent(null);
                    }}
                    onSave={handleChildDevSave}
                />
            )}`;

const newModalCode = `{isChildDevModalOpen && activeChildDevStudent && (
                <ChildDevStandardForm
                    student={activeChildDevStudent}
                    onClose={() => {
                        setIsChildDevModalOpen(false);
                        setActiveChildDevStudent(null);
                    }}
                    onSave={handleChildDevSave}
                />
            )}
            {isThinkingSkillsModalOpen && activeThinkingSkillsStudent && (
                <ThinkingSkillsForm
                    student={activeThinkingSkillsStudent}
                    onClose={() => {
                        setIsThinkingSkillsModalOpen(false);
                        setActiveThinkingSkillsStudent(null);
                    }}
                    onSave={handleChildDevSave}
                />
            )}`;

code = code.replace(modalCode, newModalCode);

// Note: handleChildDevSave takes (student, scores, comments) and saves exactly what ThinkingSkillsForm provides, so we can reuse it!
// ChildDevStandardForm: onSave(student, finalScores, finalComments)
// ThinkingSkillsForm: onSave(student, finalScores, [])
// This perfectly maps to the API!

fs.writeFileSync(file, code);
console.log("Patched client.tsx successfully");
