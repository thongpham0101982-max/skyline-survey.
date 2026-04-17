import re

client_file = 'c:/Users/Windows 11/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/input-assessments/client.tsx'

with open(client_file, 'r', encoding='utf-8') as f:
    content = f.read()

s1 = 'const res = await fetch(/api/teacher-assessments?action=getReport&periodId=);'
s2 = '                        const students = await res.json();'
s3 = '                        setViewResultsData({ loading: false, students });'

repl_str = '''const res = await fetch(/api/teacher-assessments?action=getReport&periodId=);
                        const students = await res.json();
                        const asgRes = await fetch(/api/input-assessment-assignments?periodId=);
                        const assignments = asgRes.ok ? await asgRes.json() : [];
                        setViewResultsData({ loading: false, students, assignments });'''

content = content.replace(s1 + '\n' + s2 + '\n' + s3, repl_str)

new_block = '''const assignedTeacherName = (viewResultsData.assignments || []).find((a) => a.subjectId === sc.subjectId && a.grade === s.grade && (a.educationSystem === s.admissionCriteria || a.educationSystem === s.surveySystem))?.user?.fullName;

                                                        return (
                                                            <div key={sc.id} className={order rounded-xl shadow-sm flex-none flex flex-col max-w-[650px] }>
                                                                <div className="px-3 py-1.5 bg-white/40 text-[11px] font-bold uppercase tracking-wider border-b border-current/10 flex justify-between items-center gap-3">
                                                                    <span>{sc.subject.name}</span>
                                                                    <div className="flex flex-col items-end text-right">
                                                                        {assignedTeacherName && <span className="text-[9px] font-black text-indigo-700 tracking-normal normal-case shrink-0" title={"GV Phụ trách: " + assignedTeacherName}>PC: {assignedTeacherName}</span>}
                                                                        {sc.teacherName && <span className="text-[9px] font-medium opacity-60 tracking-normal normal-case italic shrink-0" title={"Người nhập: " + sc.teacherName}>nhập: {sc.teacherName}</span>}
                                                                    </div>
                                                                </div>'''

# The target regex:
target_regex = re.compile(r'return \(\s*<div key=\{sc\.id\} className=\{\order rounded-xl shadow-sm flex-none flex flex-col max-w-\[650px\] \$\{color\}\\}>\s*<div className="px-3 py-1\.5 bg-white/40 text-\[11px\] font-bold uppercase tracking-wider border-b border-current/10 flex justify-between items-center gap-3">\s*<span>\{sc\.subject\.name\}</span>\s*\{sc\.teacherName && <span.*?</span>\}\s*</div>')

content = target_regex.sub(new_block, content)

with open(client_file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done in Python!")
