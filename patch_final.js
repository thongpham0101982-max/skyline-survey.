const fs = require('fs');
const fp = 'src/app/admin/input-assessments/client.tsx';
const raw = fs.readFileSync(fp, 'utf8');
const arr = raw.split('\n');
const si = arr.findIndex(l => l.includes('OTHER TABS PLACEHOLDERS'));
console.log('Found at 0-based index:', si, '(line', si+1, ')');

// Build the replacement lines (using \r line endings to match existing file)
const R = '\r';
const newLines = [
  '      {/* ===== TAB: SUBJECTS (MON KHAO SAT) ===== */' + R,
  '      {tab === "subjects" && (' + R,
  '        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">' + R,
  '          <div className="flex items-center justify-between">' + R,
  '            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-4 h-4"/> Danh sach Mon Khao sat</h2>' + R,
  '            <button' + R,
  '              onClick={() => { setEditingSubjectId(null); setSubjectForm({ code:"", name:"", subjectType:"", scoreColumns:1, commentColumns:1, status:"ACTIVE" }); setIsSubjectOpen(true) }}' + R,
  '              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"' + R,
  '            >' + R,
  '              <Plus className="w-4 h-4"/> Them Mon moi' + R,
  '            </button>' + R,
  '          </div>' + R,
  '' + R,
  '          {subjectsList.length === 0 ? (' + R,
  '            <Empty icon={BookOpen} text="Chua co Mon khao sat nao" sub="Bam them de bat dau"/>' + R,
  '          ) : (' + R,
  '            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">' + R,
  '              <div className="overflow-x-auto">' + R,
  '                <table className="w-full text-left whitespace-nowrap">' + R,
  '                  <thead className="bg-slate-50 border-b border-slate-100">' + R,
  '                    <tr>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ma mon</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ten Mon</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Loai</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cot Diem</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cot NX</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trang thai</th>' + R,
  '                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tac</th>' + R,
  '                    </tr>' + R,
  '                  </thead>' + R,
  '                  <tbody className="divide-y divide-slate-50">' + R,
  '                    {subjectsList.map((sub) => {' + R,
  '                      let parsedCols = { scores: [], comments: [], showScoreInReport: [], showCommentInReport: [] };' + R,
  '                      try { if (sub.columnNames) parsedCols = JSON.parse(sub.columnNames); } catch {}' + R,
  '                      return (' + R,
  '                        <tr key={sub.id} className="group hover:bg-slate-50/70 transition-colors">' + R,
  '                          <td className="p-5"><span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{sub.code}</span></td>' + R,
  '                          <td className="p-5"><span className="text-sm font-black text-slate-700">{sub.name}</span></td>' + R,
  '                          <td className="p-5 text-center">' + R,
  '                            {sub.subjectType ? (<span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-[10px] font-black uppercase tracking-wider">{sub.subjectType === "VIET_NAM" ? "GV VN" : "GV NN"}</span>) : (<span className="text-slate-300 text-xs">-</span>)}' + R,
  '                          </td>' + R,
  '                          <td className="p-5 text-center"><span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-black text-xs inline-flex items-center justify-center">{sub.scoreColumns ?? 0}</span></td>' + R,
  '                          <td className="p-5 text-center"><span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs inline-flex items-center justify-center">{sub.commentColumns ?? 0}</span></td>' + R,
  '                          <td className="p-5 text-center"><Badge s={sub.status || "ACTIVE"}/></td>' + R,
  '                          <td className="p-5 text-right">' + R,
  '                            <div className="flex items-center justify-end gap-1">' + R,
  '                              <button title="Cau hinh ten cot" onClick={() => { setColumnConfigForm({ subjectId: sub.id, name: sub.name, scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, scoreNames: parsedCols.scores || [], commentNames: parsedCols.comments || [], showScoreInReport: parsedCols.showScoreInReport || [], showCommentInReport: parsedCols.showCommentInReport || [] }); setIsColumnConfigOpen(true); }} className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><PenLine className="w-4 h-4"/></button>' + R,
  '                              <button onClick={() => { setEditingSubjectId(sub.id); setSubjectForm({ code: sub.code, name: sub.name, subjectType: sub.subjectType || "", scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, status: sub.status || "ACTIVE" }); setIsSubjectOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-4 h-4"/></button>' + R,
  '                              <button onClick={() => setConfirm({ msg: `Xoa mon ${sub.name}?`, fn: () => deleteSubject(sub.id) })} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>' + R,
  '                            </div>' + R,
  '                          </td>' + R,
  '                        </tr>' + R,
  '                      );' + R,
  '                    })}' + R,
  '                  </tbody>' + R,
  '                </table>' + R,
  '              </div>' + R,
  '            </div>' + R,
  '          )}' + R,
  '        </div>' + R,
  '      )}' + R,
  '' + R,
  '      {/* ===== OTHER TABS PLACEHOLDERS ===== */' + R,
  '      {["mapping", "reports"].includes(tab) && (' + R,
  '        <Empty icon={GraduationCap} text="Dang xay dung" sub="Phan nay se som duoc hoan thien"/>' + R,
  '      )}' + R,
];

// Remove old 4 lines (si to si+3) and insert new ones
arr.splice(si, 4, ...newLines);
fs.writeFileSync(fp, arr.join('\n'), 'utf8');
console.log('Done! Total lines now:', arr.length);
