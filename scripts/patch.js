const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `import PsychologyAssessmentForm from "./PsychologyAssessmentForm";`,
  `import PsychologyAssessmentForm from "./PsychologyAssessmentForm";\nimport ChildDevStandardForm from "./ChildDevStandardForm";`
);

content = content.replace(
  `const [activePsychStudent, setActivePsychStudent] = useState<any>(null);`,
  `const [activePsychStudent, setActivePsychStudent] = useState<any>(null);\n    const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);\n    const [activeChildDevStudent, setActiveChildDevStudent] = useState<any>(null);`
);

content = content.replace(
  `setIsPsychModalOpen(false);\n            }`,
  `setIsPsychModalOpen(false);\n              setIsChildDevModalOpen(false);\n            }`
);

content = content.replace(
  `const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");`,
  `const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");\n    const isChildDevSubject = subName.includes("chuẩn phát triển trẻ em") || subName.includes("bộ chuẩn phát triển") || subCode.includes("cpt");`
);

content = content.replace(
  '{isPsychSubject ? (gradeVal ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : `Cấu hình: ${currentAssignment.subject.scoreColumns} cột điểm, ${currentAssignment.subject.commentColumns} cột nhận xét`}',
  '{isPsychSubject ? (gradeVal ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 cột nhận xét" : `Cấu hình: ${currentAssignment.subject.scoreColumns} cột điểm, ${currentAssignment.subject.commentColumns} cột nhận xét`}'
);

content = content.replace(
  '{isPsychSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét")}',
  '{isPsychSubject || isChildDevSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét")}'
);

content = content.replace(
  `) : (\n            <div className="flex flex-wrap gap-4 items-start">`,
  `) : isChildDevSubject ? (\n                <div className="flex flex-col items-center justify-center gap-2">\n                    <button \n                        onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}\n                        className="bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"\n                    >\n                        <BookOpen className="w-3.5 h-3.5" /> \n                        Mở Form Đánh giá\n                    </button>\n                    {st.scoreVals && st.scoreVals.filter((s) => s !== "").length >= 16 ? (\n                        <div className="flex items-center gap-3">\n                            <div className="h-10 w-[1px] bg-slate-200"></div>\n                            <div className="flex flex-col">\n                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Đã đánh giá</span>\n                            </div>\n                        </div>\n                    ) : (\n                        <span className="text-[10px] text-slate-400 font-medium">\n                            {st.scoreVals ? \`Tiến độ: \${Math.round((st.scoreVals.filter((s) => s !== "").length / 16) * 100)}%\` : "Chưa đánh giá"}\n                        </span>\n                    )}\n                </div>\n            ) : (\n            <div className="flex flex-wrap gap-4 items-start">`
);

content = content.replace(
  `disabled={isLocked || isPsychSubject}`,
  `disabled={isLocked || isPsychSubject || isChildDevSubject}`
);

content = content.replace(
  `isLocked || isPsychSubject ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none"`,
  `isLocked || isPsychSubject || isChildDevSubject ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none"`
);

content = content.replace(
  `</PsychologyAssessmentForm>\n        </div>\n      )}`,
  `</PsychologyAssessmentForm>\n        </div>\n      )}\n\n      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (\n        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">\n          <ChildDevStandardForm \n            student={activeChildDevStudent}\n            onSave={(st, scores, comments) => saveStudentScore(st, scores, comments)}\n            isLocked={isLocked}\n            onClose={() => setIsChildDevModalOpen(false)}\n          />\n        </div>\n      )}`
);

fs.writeFileSync(path, content);
