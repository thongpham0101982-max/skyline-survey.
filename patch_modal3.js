const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  '{isPsychSubject ? (',
  `{isChildDevSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}
                    className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    Mở Form Đánh giá
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Đã lưu điểm</span>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>
            ) : isPsychSubject ? (`
);

content = content.replace(
  `        </div>
      )}
        </div>
    );`,
  `        </div>
      )}

      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <ChildDevStandardForm 
            student={activeChildDevStudent}
            onSave={(st, scores, comments) => {
              saveStudentScore(st, scores, comments);
              setIsChildDevModalOpen(false);
            }}
            isLocked={isLocked}
            onClose={() => setIsChildDevModalOpen(false)}
          />
        </div>
      )}
        </div>
    );`
);

fs.writeFileSync(path, content);
