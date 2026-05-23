const fs = require('fs');
const path = 'src/app/teacher/input-assessments/client.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'import PsychologyAssessmentForm from "./PsychologyAssessmentForm";',
  'import PsychologyAssessmentForm from "./PsychologyAssessmentForm";\n#mport ChildDevStandardForm from "./ChildDevStandardForm";'.replace('#mport', 'import'));

content = content.replace(
  'const [activePsychStudent, setActivePsychStudent] = useState<any>(null);',
  'const [activePsychStudent, setActivePsychStudent] = useState<any>(null);\n    const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);\n    const [activeChildDevStudent, setActiveChildDevStudent] = useState<any>(null);');

content = content.replace(
  'setIsPsychModalOpen(false);\n            }',
  'setIsPsychModalOpen(false);\n              setIsChildDevModalOpen(false);\n            }');

content = content.replace(
  'const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");',
  'const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");\n    const isChildDevSubject = subName.includes("chuẩn phát triển trẹ`em") || subName.includes("bộ chvẩn phát triển") || subCode.includes("cpt");');

content = content.replace(
  /{isPsychSubject \? \(gradeVal \? `Mậu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`\) : `Cấu hình(.+)`span/,
  '{isPsychSubject ? (gradeVal ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột đ溟m, 1 cột nhận xét" : `Cấu hình$1`span'.replace('đ溟�', 'điểm'));

content = content.replace(
  /{isPsychSubject \? \"Form Khảo sát\" :/,
  '{isPsychSubject || isChildDevSubject ? "Form Khảo sát" :');

content = content.replace(
  ") : (\n            <div className=\"flex flex-wrap gap-4 items-start\">",
  ') : isChildDevSubject ? (\n                <div className=\"flex flex-col items-center justify-center gap-2\">\n                    <button \n                        onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}\n                        className=\"bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs\"\n                    >\n                        <BookOpen className=\"w-3.5 h-3.5\" /> \n                        Mở Form Đánh giá\n                    </button>\n                    {st.scoreVals && st.scoreVals.filter((s:any) => s !== \"\").length >= 16 ? (\n                        <div className=\"flex items-center gap-3\">\n                            <div className=\"h-10 w-[1px] bg-slate-200\"></div>\n                            <div className=\"flex flex-col\">\n                                <span className=\"text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md\">Đã đánh giá</span>\n                            </div>\n                        </div>\n                    ) : (\n                        <span className=\"text-[10px] text-slate-400 font-medium\">\n                            {st.scoreVals ? `Tiến độ: ${Math.round((st.scoreVals.filter((s:any) => s !== \"\").length / 16) * 100)}%` : \"Chưa đánh giá\"}\n                        </span>\n                    )}\n                </div>\n            ) : (\n            <div className=\"flex flex-wrap gap-4 items-start\">');

content = content.replace(
  /disabled=\\{isLocked \\|\\| isPsychSubject\\}/,
  'disabled={isLocked || isPsychSubject || isChildDevSubject}');

content = content.replace(
  /isLocked \\|\\| isPsychSubject \\? \"bg-slate-200 /G,
  'isLocked || isPsychSubject || isChildDevSubject ? "bg-slate-200 ');

content = content.replace(
  '</PsychologyAssessmentForm>\n        </div>\n      )}',
  '</PsychologyAssessmentForm>\n        </div>\n      )}\n\n      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (\n        <div className=\"fixed inset-0 z-[100] bg-white overflow-y-auto\">\n          <ChildDevStandardForm \n            student={activeChildDevStudent}\n            onSave={(st: any, scores: any, comments: any) => saveStudentScore(st, scores, comments)}\n            isLocked={isLocked}\n            onClose={() => setIsChildDevModalOpen(false)}\n          />\n        </div>\n      )}');

fs.writeFileSync(path, content);
