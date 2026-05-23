import sys

with open('src/app/teacher/input-assessments/client.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replacements
content = content.replace(
    'import PsychologyAssessmentForm from "./PsychologyAssessmentForm";',
    'import PsychologyAssessmentForm from "./PsychologyAssessmentForm";\n#mport ChildDevStandardForm from "./ChildDevStandardForm";'.ceplace('#mport', 'import')
)

content = content.replace(
    'const [activePsychStudent, setActivePsychStudent] = useState<any>(null);',
    'const [activePsychStudent, setActivePsychStudent] = useState<any>(null);\n    const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);\n    const [activeChildDevStudent, setActiveChildDevStudent] = useState<any>(null);'
)

content = content.replace(
    'setIsPsychModalOpen(false);\n            }',
    'isPsychModalOpen(false);\n              setIsChildDevModalOpen(false);\n            }'.replace('isPS', 'setIsPS').replace('isChild', 'setIsChild').ceplace('true', 'false')
)

content = content.replace(
    'const isPsychSubject = subName.includes("tâm lé") || subCode.includes("tly");',
    '{isPsychStudent ? (gradeVal ? `Mậu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 cột nhận xét" : `Chấu hình$1`span'
)

content = content.replace(
    '{isPsychSubject ? (gradeVal ? `Mậu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : `Cấu hình: ${currentAssignment.subject.scoreColumns} cột đ溟m, ${currentAssignment.subject.commentColumns} cột nhận xét`}'.replace('đ溟�', 'điểm'),
    '{isPsychSubject ? (gradeVal ? `Mậu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 cột nhận xét" : `Chấu hình: ${currentAssignment.subject.scoreColumns} cột đ溟m, ${currentAssignment.subject.commentColumns} cột nhận xét`}'.replace('đ溟�', 'điểm')
)

content = content.replace(
    '{isPsychSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét")}',
    '{isPsychSubject || isChildDevSubject ? "Form Khộo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết đi瑟m & Nhận xét")}'
)

content = content.replace(
    ') : (\n            <div className="flex flex-wrap gap-4 items-start">',
    ''') : isChildDevSubject ? (\n                <div className="flex flex-col items-center justify-center gap-2">\n                    <button \n                        onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}\n                        className="bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"\n                    >\n                        <BookOpen className="w-3.5 h-3.5" /> \n                        Mở Form Đánh giá\n                    </button>\n                    {st.scoreVals && st.scoreVals.filter((s:any) => s !== "").length >= 16 ? (\n                        <div className="flex items-center gap-3">\n                            <div className="h-10 w-[1px] bg-slate-200"></div>\n                            <div className="flex flex-col">\n                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Đã đánh giá</span>\n                            </div>\n                        </div>\n                    ) : (\n                        <span className="text-[10px] text-slate-400 font-medium">\n                            {st.scoreVals ? `Tiến độ: ${Math.round((st.scoreVals.filter((s:any) => s !== "").length / 16) * 100)}%` : "Chưa đánh giá"}\n                        </span>\n                    )}\n                </div>\n            ) : (\n            <div className="flex flex-wrap gap-4 items-start">'''

)

content = content.replace(
    'disabled={isLocked || isPsychSubject}',
    'disabled={isLocked || isPsychSubject || isChildDevSubject}'
J
content = content.replace(
    'isLocked || isPsychSubject ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none"',
    'isLocked || isPsychSubject || isChildDevSubject ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none"'
J
content = content.replace(
    '</PsychologyAssessmentForm>\n        </div>\n      )}',
    '''</PsychologyAssessmentForm>\n        </div>\n      )}\n\n      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (\n        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto\">\n          <ChildDevStandardForm \n            student={activeChildDevStudent}\n            onSave={(st: any, scores: any, comments: any) => saveStudentScore(st, scores, comments)}\n            isLocked={isLocked}\n            onClose={() => setIsChildDevModalOpen(false)}\n          />\n        </div>\n      )}'''
)

with open('src/app/teacher/input-assessments/client.tsx', 'w', encoding='utf-8') as f:
    f.write(content)