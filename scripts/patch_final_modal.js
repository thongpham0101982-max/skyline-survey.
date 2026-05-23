const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

let tdIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<td className="px-4 py-4 bg-transparent">')) {
    if (lines[i+1].includes('{isPsychSubject ? (')) {
      tdIdx = i;
      break;
    }
  }
}

if (tdIdx !== -1) {
  lines.splice(tdIdx + 1, 1, 
    '            {isChildDevSubject ? (',
    '              <div className="flex flex-col items-center justify-center gap-2">',
    '                  <button ',
    '                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}',
    '                    className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"',
    '                  >',
    '                    <BookOpen className="w-3.5 h-3.5" /> ',
    '                    Mở Form Đánh giá',
    '                  </button>',
    '                  {st.scoreVals?.length >= 1 ? (',
    '                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Đã lưu điểm</span>',
    '                  ) : (',
    '                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>',
    '                  )}',
    '              </div>',
    '            ) : isPsychSubject ? ('
  );
  console.log("Replaced TD content");
} else {
  console.log("Failed to replace TD content");
}

let psychFormIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('<PsychologyAssessmentForm')) {
    psychFormIdx = i;
    break;
  }
}

if (psychFormIdx !== -1) {
  let endDivIdx = -1;
  for (let i = psychFormIdx; i < lines.length; i++) {
    if (lines[i].trim() === '</div>') {
      if (lines[i+1].trim() === ')}') {
        endDivIdx = i + 1;
        break;
      }
    }
  }
  
  if (endDivIdx !== -1) {
    lines.splice(endDivIdx + 1, 0,
      '',
      '      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (',
      '        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">',
      '          <ChildDevStandardForm ',
      '            student={activeChildDevStudent}',
      '            onSave={(st, scores, comments) => {',
      '              saveStudentScore(st, scores, comments);',
      '              setIsChildDevModalOpen(false);',
      '            }}',
      '            isLocked={isLocked}',
      '            onClose={() => setIsChildDevModalOpen(false)}',
      '          />',
      '        </div>',
      '      )}'
    );
    console.log("Replaced Modal content");
  } else {
    console.log("Failed to find end div");
  }
} else {
  console.log("Failed to find psych form");
}

fs.writeFileSync(path, lines.join('\n'));
