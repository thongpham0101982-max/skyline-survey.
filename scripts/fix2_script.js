const fs = require('fs');
const clientFile = 'c:/Users/Windows 11/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/input-assessments/client.tsx';
let content = fs.readFileSync(clientFile, 'utf-8');

const s1 = 'const res = await fetch(/api/teacher-assessments?action=getReport&periodId=);';
const s2 = '                        const students = await res.json();';
const s3 = '                        setViewResultsData({ loading: false, students });';

const repl = 'const res = await fetch(/api/teacher-assessments?action=getReport&periodId=);\\n                        const students = await res.json();\\n                        const asgRes = await fetch(/api/input-assessment-assignments?periodId=);\\n                        const assignments = asgRes.ok ? await asgRes.json() : [];\\n                        setViewResultsData({ loading: false, students, assignments });';

content = content.replace(s1 + '\n' + s2 + '\n' + s3, repl);
if(content.includes('asgRes')) console.log('Replaced part 1');

const newBlock = \const assignedTeacherName = (viewResultsData.assignments || []).find((a) => a.subjectId === sc.subjectId && a.grade === s.grade && (a.educationSystem === s.admissionCriteria || a.educationSystem === s.surveySystem))?.user?.fullName;

                                                        return (
                                                            <div key={sc.id} className={\\\order rounded-xl shadow-sm flex-none flex flex-col max-w-[650px] \\\\}>
                                                                <div className="px-3 py-1.5 bg-white/40 text-[11px] font-bold uppercase tracking-wider border-b border-current/10 flex justify-between items-center gap-3">
                                                                    <span>{sc.subject.name}</span>
                                                                    <div className="flex flex-col items-end text-right">
                                                                        {assignedTeacherName && <span className="text-[9px] font-black text-indigo-700 tracking-normal normal-case shrink-0" title={"GV Phụ trách: " + assignedTeacherName}>PC: {assignedTeacherName}</span>}
                                                                        {sc.teacherName && <span className="text-[9px] font-medium opacity-60 tracking-normal normal-case italic shrink-0" title={"Người nhập: " + sc.teacherName}>nhập: {sc.teacherName}</span>}
                                                                    </div>
                                                                </div>\;

content = content.replace(
    /return \\([\\s\\S]*?<div className="px-3 py-1\\.5 bg-white\\/40 text-\\[11px\\] font-bold uppercase tracking-wider border-b border-current\\/10 flex justify-between items-center gap-3">[\\s\\S]*?<\\/div>/,
    newBlock
);
if(content.includes('assignedTeacherName')) console.log('Replaced part 2');

fs.writeFileSync(clientFile, content, 'utf-8');
console.log('Done!');
