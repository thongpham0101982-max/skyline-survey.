const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

// 1. Update component signature
content = content.replace(
  "export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: initialSubjects, eduSystems, grades, configs: initialConfigs }: any) {",
  "export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: initialSubjects, eduSystems, grades, configs: initialConfigs, teachers = [], departments = [] }: any) {"
);

// 2. Add deploy state
content = content.replace(
  "const [assignTeacherId, setAssignTeacherId] = useState(\"\");",
  "const [assignTeacherId, setAssignTeacherId] = useState(\"\");\n  const [assignDepartmentId, setAssignDepartmentId] = useState(\"\");"
);

// 3. Find the "TAB: PHAN CONG GV" block and replace the assignment form up to the assignments table
const regex = /(<h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3"><UserCheck className="w-5 h-5 text-indigo-500"\/>Phân công Giáo viên Phụ trách Khảo sát<\/h3>)([\s\S]*?)(<\!-- Table -->)/;
const match = content.match(regex);
if (!match) {
  console.log("Could not find assignment section!");
  process.exit(1);
}

const replacement = `<h3 className="font-bold text-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <UserCheck className="w-5 h-5 text-indigo-600"/>
                </div>
                <div>
                  <span className="block text-lg">Phân công Giáo viên Khảo sát</span>
                  <span className="text-sm font-normal text-slate-500">Giao nhiệm vụ phụ trách môn thi cho giáo viên từ Tổ chuyên môn</span>
                </div>
              </div>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column - Teacher Selection (5/12) */}
              <div className="lg:col-span-5 space-y-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">1</div>
                   <h4 className="font-semibold text-slate-700">Chọn Kỳ & Giáo viên</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">Kỳ Khảo sát <span className="text-red-500">*</span></label>
                    <select className="w-full border-slate-300 rounded-lg px-3 py-2 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={assignPeriodId} onChange={e=>{setAssignPeriodId(e.target.value);setAssignBatchId("")}}>
                      <option value="">-- Chọn Kỳ --</option>
                      {periods.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  {assignPeriodId && periods.find(p=>p.id===assignPeriodId)?.batches?.length > 0 && (
                    <div className="col-span-2 relative transform transition-all duration-300 opacity-100 translate-y-0">
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">Đợt KS</label>
                      <select className="w-full border-slate-300 rounded-lg px-3 py-2 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={assignBatchId} onChange={e=>setAssignBatchId(e.target.value)}>
                        <option value="">Tất cả các đợt</option>
                        {periods.find(p=>p.id===assignPeriodId)?.batches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 my-4"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">Tổ chuyên môn</label>
                    <select className="w-full border-slate-300 rounded-lg px-3 py-2 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={assignDepartmentId} onChange={e => {setAssignDepartmentId(e.target.value); setAssignTeacherId("")}}>
                      <option value="">Tất cả Giáo viên</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">Giáo viên Phụ trách <span className="text-red-500">*</span></label>
                    <select className="w-full border-slate-300 rounded-lg px-3 py-2 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" value={assignTeacherId} onChange={e=>setAssignTeacherId(e.target.value)}>
                      <option value="">-- Chọn Giáo viên --</option>
                      {teachers.filter((t: any) => !assignDepartmentId || t.departmentId === assignDepartmentId).map((t:any)=><option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column - Subject, Grade, Edu Selection (7/12) */}
              <div className="lg:col-span-7 space-y-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                   <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold">2</div>
                   <h4 className="font-semibold text-slate-700">Phạm vi Phân công</h4>
                </div>

                {/* Subj */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Môn Khảo sát <span className="text-red-500">*</span></span>
                    <button onClick={()=>setAssignSelSubjects(assignSelSubjects.length===subjectsList.length?[]:subjectsList.map((s:any)=>s.id))} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors">
                      {assignSelSubjects.length===subjectsList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm max-h-40 overflow-y-auto min-h-[40px]">
                    {subjectsList.map((s:any)=><button key={s.id} onClick={()=>setAssignSelSubjects(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} className={"px-3 py-1.5 rounded-lg border font-medium transition-colors " + (assignSelSubjects.includes(s.id)?'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200':'bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50')}>{s.name}</button>)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Grade */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Khối <span className="text-red-500">*</span></span>
                      <button onClick={()=>setAssignSelGrades(assignSelGrades.length===grades.length?[]:[...grades])} className="text-xs text-teal-600 hover:text-teal-800 font-medium bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded transition-colors">Chọn tất cả</button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {grades.map((g:string)=><button key={g} onClick={()=>setAssignSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g])} className={"px-3 py-1.5 rounded-lg border font-medium transition-colors " + (assignSelGrades.includes(g)?'bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-200':'bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/50')}>K{g}</button>)}
                    </div>
                  </div>

                  {/* Edu */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Hệ học <span className="text-red-500">*</span></span>
                      <button onClick={()=>setAssignSelEdus(assignSelEdus.length===eduSystems.length?[]:eduSystems.map((e:any)=>e.code))} className="text-xs text-amber-600 hover:text-amber-800 font-medium bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded transition-colors">Chọn tất cả</button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {eduSystems.map((es:any)=><button key={es.code} onClick={()=>setAssignSelEdus(p=>p.includes(es.code)?p.filter(x=>x!==es.code):[...p,es.code])} className={"px-3 py-1.5 rounded-lg border font-medium transition-colors " + (assignSelEdus.includes(es.code)?'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200':'bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/50')}>{es.code}</button>)}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button onClick={handleAssignSubmit} disabled={!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0} className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"><Check className="w-5 h-5"/> {(!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0) ? "Vui lòng chọn đủ thông tin" : "Xác nhận & Lưu Phân công"}</button>
                </div>
              </div>
            </div>
            
            {/* Table */}
`;

content = content.replace(match[0], replacement);

// The editGroup also needs to be updated to try to find the departmentId if available
const editGroupMatch = content.match(/const editGroup = \(\) => \{\s+setAssignTeacherId\(g\.userId\);/);
if (editGroupMatch) {
  content = content.replace(
    /const editGroup = \(\) => \{\s+setAssignTeacherId\(g\.userId\);/,
    "const editGroup = () => {\n                             const teacher = teachers.find(t => t.userId === g.userId);\n                             if (teacher?.departmentId) setAssignDepartmentId(teacher.departmentId);\n                             setAssignTeacherId(g.userId);"
  );
} else {
  // Try another replacement pattern
  content = content.replace(
    "setAssignTeacherId(g.userId);",
    "const teacher = teachers.find(t => t.userId === g.userId);\n                             if (teacher?.departmentId) setAssignDepartmentId(teacher.departmentId);\n                             setAssignTeacherId(g.userId);"
  );
}

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Successfully patched client.tsx");
