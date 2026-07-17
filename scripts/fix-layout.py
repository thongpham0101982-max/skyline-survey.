import os

def replace_between(filepath, start_str, end_str, new_content):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    start_idx = content.find(start_str)
    if start_idx == -1: return False
    
    end_idx = content.find(end_str, start_idx)
    if end_idx == -1: return False
    
    new_text = content[:start_idx] + new_content + content[end_idx + len(end_str):]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_text)
    return True

# K12
k12_file = "src/app/admin/phan-cong-khao-sat/k12-client.tsx"
k12_start = '<table className="w-full text-left whitespace-nowrap border-collapse">'
k12_end = '</table>'
k12_new = """<table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học</th>
                      <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAssignments.map((a, idx) => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-black text-slate-700">{a.user?.fullName}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{a.batch?.name || "Tất cả đợt"}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.subjects.map((sub: string) => (
                              <span key={sub} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-black text-indigo-600">{sub}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.grades.map((g: string) => (
                              <span key={g} className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{g}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {a.educationSystems.map((sys: string) => (
                              <span key={sys} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">{sys}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => sendTeacherNotification(a)} disabled={asNotifyingId === a.id || !canUpdate}
                              className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30" title="Gửi email thông báo">
                              {asNotifyingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => openEditAssignment(a)} disabled={!canUpdate}
                              className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })} disabled={!canDelete}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>"""
replace_between(k12_file, k12_start, k12_end, k12_new)

# Mam Non
mamnon_file = "src/app/admin/phan-cong-khao-sat/mam-non-client.tsx"
mamnon_start = '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">'
mamnon_end = '        )}\n      </div>'
mamnon_new = """<div className="overflow-x-auto animate-in fade-in duration-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối / Nhóm</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đợt</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ủy quyền GV</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày giao</th>
                  <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assign: any, idx: number) => {
                  const t = teachers.find(teach => teach.user?.id === assign.userId)
                  const tName = t?.teacherName || assign.user?.fullName || "Chưa rõ danh tính"
                  const tCode = t?.teacherCode || "GV000"
                  const tEmail = t?.email || assign.user?.email || "—"
                  const isNotifying = aNotifyingId === assign.id
                  const initials = getInitials(tName)

                  return (
                    <tr key={assign.id} className="border-b border-slate-100 hover:bg-teal-50/20 transition-colors group">
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow-sm" style={{ background: TEAL }}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-black text-slate-700">{tName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{tCode} • {tEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-teal-50 text-[#00A99D] border border-teal-100/50">{assign.grade}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {assign.batch ? (
                          <span className="text-[10px] font-black uppercase text-fuchsia-600 bg-fuchsia-50/50 border border-fuchsia-200 px-2.5 py-1 rounded-full max-w-[160px] truncate inline-block" title={assign.batch.name}>
                            {assign.batch.name?.split(" | ")[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Tất cả đợt</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={assign.delegatedUserId || ""} onChange={(e) => updateDelegation(assign.id, e.target.value)} disabled={!canUpdate} className="block w-full min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 outline-none hover:border-[#00A99D]/50 focus:border-[#00A99D] focus:ring-1 focus:ring-teal-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed appearance-none">
                          <option value="">-- Chọn Giáo vụ CS --</option>
                          {giaoVuCSUsers.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {assign.createdAt ? new Date(assign.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => sendTeacherNotification(assign.id, tName)} disabled={isNotifying || !canUpdate} title="Gửi email thông báo phân công" className="p-1.5 text-slate-300 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-all disabled:opacity-30">
                            {isNotifying ? <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-500" /> : <Mail className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setConfirm({ msg: `Bạn có chắc chắn muốn hủy phân công khảo sát của giáo viên ${tName}?`, fn: () => deleteAssignment(assign.id, tName) })} disabled={!canDelete} title="Hủy phân công" className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>"""
if replace_between(mamnon_file, mamnon_start, mamnon_end, mamnon_new):
    with open(mamnon_file, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4', 'bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden')
    with open(mamnon_file, "w", encoding="utf-8") as f:
        f.write(content)

# Input Assessments
input_file = "src/app/admin/input-assessments/client.tsx"
input_start = '<table className="w-full text-left whitespace-nowrap border-collapse">'
input_end = '</table>'
input_new = """<table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAssignments.map((a, idx) => (
                          <tr key={a.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <p className="font-black text-slate-700">{a.user?.fullName}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{a.batch?.name || "Tất cả đợt"}</p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.subjects.map((sub: string) => (
                                  <span key={sub} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-black text-indigo-600">{sub}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.grades.map((g: string) => (
                                  <span key={g} className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{g}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.educationSystems.map((sys: string) => (
                                  <span key={sys} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">{sys}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => sendTeacherNotification(a)}
                                  disabled={asNotifyingId === a.id || cannotUpdate}
                                  className={"p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
                                  title="Gửi email thông báo phân công"
                                >
                                  {asNotifyingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}
                                </button>
                                <button
                                  onClick={() => openEditAssignment(a)}
                                  disabled={cannotUpdate}
                                  className={"p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
                                >
                                  <Edit2 className="w-3.5 h-3.5"/>
                                </button>
                                <button
                                  onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })}
                                  disabled={cannotDelete}
                                  className={"p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 " + (cannotDelete ? "pointer-events-none opacity-40" : "")}
                                >
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>"""
replace_between(input_file, input_start, input_end, input_new)
print("Updated all files successfully.")