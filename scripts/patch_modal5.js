const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `                                        <td className="px-4 py-4 bg-transparent">\n            {isPsychSubject ? (\n              <div className="flex flex-col items-center justify-center gap-2">\n                  <button `,
  `                                        <td className="px-4 py-4 bg-transparent">\n            {isChildDevSubject ? (\n              <div className="flex flex-col items-center justify-center gap-2">\n                  <button \n                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}\n                    className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"\n                  >\n                    <BookOpen className="w-3.5 h-3.5" /> \n                    Mở Form Đánh giá\n                  </button>\n                  {st.scoreVals?.length >= 1 ? (\n                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Đã lưu điểm</span>\n                  ) : (\n                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>\n                  )}\n              </div>\n            ) : isPsychSubject ? (\n              <div className="flex flex-col items-center justify-center gap-2">\n                  <button `
);

content = content.replace(
  `          <PsychologyAssessmentForm \n            student={activePsychStudent}\n            onSave={(st: any, scores: any, comments: any) => saveStudentScore(st, scores, comments)}\n            isLocked={isLocked}\n          />\n        </div>\n      )}`,
  `          <PsychologyAssessmentForm \n            student={activePsychStudent}\n            onSave={(st: any, scores: any, comments: any) => saveStudentScore(st, scores, comments)}\n            isLocked={isLocked}\n          />\n        </div>\n      )}\n\n      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (\n        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">\n          <ChildDevStandardForm \n            student={activeChildDevStudent}\n            onSave={(st: any, scores: any, comments: any) => {\n              saveStudentScore(st, scores, comments);\n              setIsChildDevModalOpen(false);\n            }}\n            isLocked={isLocked}\n            onClose={() => setIsChildDevModalOpen(false)}\n          />\n        </div>\n      )}`
);

fs.writeFileSync(path, content);
console.log("Replaced successfully");
