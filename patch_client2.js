const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

// 1. Update component signature
content = content.replace(
  "export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: initialSubjects, eduSystems, grades, configs: initialConfigs }: any) {",
  "export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: initialSubjects, eduSystems, grades, configs: initialConfigs, teachers = [], departments = [] }: any) {"
);

// 2. Add assignDepartmentId state securely if not exist
if (!content.includes("assignDepartmentId")) {
  content = content.replace(
    "const [assignTeacherId, setAssignTeacherId] = useState(\"\");",
    "const [assignTeacherId, setAssignTeacherId] = useState(\"\");\n  const [assignDepartmentId, setAssignDepartmentId] = useState(\"\");"
  );
}

// 3. Find the exact boundaries to replace the grid layout
const blockStart = `<div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3"><UserCheck className="w-5 h-5 text-indigo-500"/>Phân công Giáo viên Phụ trách Khảo sát</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">`;
            
const blockEnd = `              </div>
            </div>
          </div>`;

const startIndex = content.indexOf(blockStart);
let endIndex = -1;
if (startIndex !== -1) {
  // We need to find the blockEnd AFTER the startIndex
  endIndex = content.indexOf(blockEnd, startIndex);
  if (endIndex !== -1) {
    endIndex += blockEnd.length;
  }
}

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find the target block using standard search.");
  process.exit(1);
}

const replacement = `<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl mt-0.5">
                  <UserCheck className="w-6 h-6 text-indigo-600"/>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Phân công Giáo viên Khảo sát</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Giao nhiệm vụ phụ trách môn thi cho giáo viên từ Tổ chuyên môn</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column - Teacher Selection (5/12) */}
              <div className="lg:col-span-5 space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-xl"></div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shadow-sm">1</div>
                   <h4 className="font-bold text-slate-700 text-base tracking-tight">Kỳ Khảo sát & Người phụ trách</h4>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Kỳ Khảo sát <span className="text-red-500">*</span></label>
                    <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm transition-shadow bg-white" value={assignPeriodId} onChange={e=>{setAssignPeriodId(e.target.value);setAssignBatchId("")}}>
                      <option value="">-- Chọn Kỳ --</option>
                      {periods.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  {assignPeriodId && periods.find(p=>p.id===assignPeriodId)?.batches?.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Đợt KS</label>
                      <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm transition-shadow bg-white" value={assignBatchId} onChange={e=>setAssignBatchId(e.target.value)}>
                        <option value="">Tất cả các đợt</option>
                        {periods.find(p=>p.id===assignPeriodId)?.batches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="border-t border-slate-200 my-2"></div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Lọc theo Tổ CM <span className="text-slate-400 font-normal normal-case tracking-normal text-[11px]">(Không bắt buộc)</span></label>
                    <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm transition-shadow bg-white" value={assignDepartmentId} onChange={e => {setAssignDepartmentId(e.target.value); setAssignTeacherId("")}}>
                      <option value="">Tất cả Tổ chuyên môn</option>
                      {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Giáo viên Phụ trách <span className="text-red-500">*</span></label>
                    <select className="w-full border-indigo-200 rounded-xl px-4 py-3 outline-none text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 shadow-sm transition-shadow bg-indigo-50/50" value={assignTeacherId} onChange={e=>setAssignTeacherId(e.target.value)}>
                      <option value="">-- Chọn Giáo viên --</option>
                      {teachers?.filter((t: any) => !assignDepartmentId || t.departmentId === assignDepartmentId).map((t:any)=><option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column - Subject, Grade, Edu Selection (7/12) */}
              <div className="lg:col-span-7 space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-xl"></div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shadow-sm">2</div>
                   <h4 className="font-bold text-slate-700 text-base tracking-tight">Phạm vi Phân công</h4>
                </div>

                <div className="space-y-8 flex-1">
                  {/* Subj */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Môn Khảo sát <span className="text-red-500">*</span></span>
                      <button onClick={()=>setAssignSelSubjects(assignSelSubjects.length===subjectsList.length?[]:subjectsList.map((s:any)=>s.id))} className="text-xs text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        {assignSelSubjects.length===subjectsList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2.5 text-sm max-h-48 overflow-y-auto min-h-[40px] p-1">
                      {subjectsList.map((s:any)=><button key={s.id} onClick={()=>setAssignSelSubjects(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} className={"px-4 py-2 rounded-xl border font-medium transition-all duration-200 " + (assignSelSubjects.includes(s.id)?'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 ring-2 ring-indigo-200 ring-offset-1':'bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 border-slate-300 shadow-sm')}>{s.name}</button>)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    {/* Grade */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Khối <span className="text-red-500">*</span></span>
                        <button onClick={()=>setAssignSelGrades(assignSelGrades.length===grades.length?[]:[...grades])} className="text-xs text-teal-700 hover:text-teal-900 font-bold bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">Chọn tất cả</button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {grades.map((g:string)=><button key={g} onClick={()=>setAssignSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g])} className={"px-4 py-2 rounded-xl border font-bold transition-all duration-200 " + (assignSelGrades.includes(g)?'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-200 ring-2 ring-teal-200 ring-offset-1':'bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 border-slate-300 shadow-sm')}>K{g}</button>)}
                      </div>
                    </div>

                    {/* Edu */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Hệ học <span className="text-red-500">*</span></span>
                        <button onClick={()=>setAssignSelEdus(assignSelEdus.length===eduSystems.length?[]:eduSystems.map((e:any)=>e.code))} className="text-xs text-amber-700 hover:text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm">Chọn tất cả</button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {eduSystems.map((es:any)=><button key={es.code} onClick={()=>setAssignSelEdus(p=>p.includes(es.code)?p.filter(x=>x!==es.code):[...p,es.code])} className={"px-4 py-2 rounded-xl border font-bold transition-all duration-200 " + (assignSelEdus.includes(es.code)?'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200 ring-2 ring-amber-200 ring-offset-1':'bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 border-slate-300 shadow-sm')}>{es.code}</button>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <button onClick={handleAssignSubmit} disabled={!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-extrabold text-base rounded-xl shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"><Check className="w-5 h-5"/> {(!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0) ? "Vui lòng chọn đủ thông tin" : "Xác nhận & Lưu Phân công"}</button>
                </div>
              </div>
            </div>
          </div>`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

// 4. Also modify edit mapping
if (content.includes("setAssignTeacherId(g.userId);")) {
  content = content.replace(
    "setAssignTeacherId(g.userId);",
    "const teacher = teachers.find((t: any) => t.userId === g.userId);\n                             if (teacher?.departmentId) setAssignDepartmentId(teacher.departmentId);\n                             setAssignTeacherId(g.userId);"
  );
}

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Success");
