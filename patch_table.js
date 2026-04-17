const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

const tStart = `<div className="overflow-x-auto">`;
const tEnd = `</table>\n                </div>`;

const searchStart = content.indexOf(tStart);
const searchEnd = content.indexOf(tEnd, searchStart) + tEnd.length;

if (searchStart === -1 || searchEnd === -1) {
  console.log("Cannot find table");
  process.exit(1);
}

const replacement = `<div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectedStudentIds.length===filteredStudents.length && filteredStudents.length>0} onChange={toggleAllStudents} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"/></th>
                        <th className="px-4 py-3 text-left w-10 text-xs uppercase tracking-wider text-slate-500 font-bold">STT</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">Học sinh</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">Cấu hình Khảo sát</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">Thành tích</th>
                        <th className="px-4 py-3 text-center w-24 text-xs uppercase tracking-wider text-slate-500 font-bold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>{filteredStudents.map((s,i)=>(
                      <tr key={s.id} className={"border-b last:border-b-0 hover:bg-slate-50/80 transition-colors " + (selectedStudentIds.includes(s.id)?'bg-indigo-50/60':'')}>
                        <td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={()=>toggleStudentSelect(s.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 mt-1"/></td>
                        <td className="px-4 py-4 text-slate-500 font-medium align-top pt-5">{i+1}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-base">{s.fullName}</span>
                              {s.grade && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">Khối {s.grade}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{s.studentCode}</span>
                              <span className="text-slate-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5"/> {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : 'Trống'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {s.admissionCriteria && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 font-medium border border-violet-100" title="Diện KS"><span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>{s.admissionCriteria}</span>}
                            {s.surveyFormType && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-cyan-50 text-cyan-700 font-medium border border-cyan-100" title="Hình thức"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>{s.surveyFormType}</span>}
                            {s.targetType && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100" title="Loại TS"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>{s.targetType}</span>}
                            {s.hocKy && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100" title="Học kỳ"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{s.hocKy}</span>}
                            {(!s.admissionCriteria && !s.surveyFormType && !s.targetType && !s.hocKy) && <span className="text-xs text-slate-400 italic">Chưa thiết lập</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            {s.kqgdTieuHoc && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">Tiểu học:</span><span className="font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-rose-100">{s.kqgdTieuHoc}</span></div>}
                            {s.kqHocTap && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">Học tập:</span><span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-blue-100">{s.kqHocTap}</span></div>}
                            {s.kqRenLuyen && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">Rèn luyện:</span><span className="font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-teal-100">{s.kqRenLuyen}</span></div>}
                            {(!s.kqgdTieuHoc && !s.kqHocTap && !s.kqRenLuyen) && <span className="text-xs text-slate-400 italic">Trống</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <div className="flex gap-2 justify-center pt-2">
                            <button onClick={()=>{setEditingStudentId(s.id);setStudentForm({studentCode:s.studentCode,fullName:s.fullName,dateOfBirth:s.dateOfBirth?new Date(s.dateOfBirth).toISOString().slice(0,10):"",admissionCriteria:s.admissionCriteria||"",surveyFormType:s.surveyFormType||"",targetType:s.targetType||"",hocKy:s.hocKy||"",kqgdTieuHoc:s.kqgdTieuHoc||"",kqHocTap:s.kqHocTap||"",kqRenLuyen:s.kqRenLuyen||"",grade:s.grade||"",periodId:s.periodId,batchId:s.batchId||""});setIsStudentOpen(true)}} className="p-2 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 bg-white transition-all shadow-sm"><Pencil className="w-4 h-4"/></button>
                            <button onClick={()=>deleteStudent(s.id)} className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 bg-white transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>`;

content = content.substring(0, searchStart) + replacement + content.substring(searchEnd);

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Success");
