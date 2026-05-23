const fs = require('fs');

const clientContent = `"use client"
import { useState, useEffect } from "react"
import { FileText, Plus, Trash2, Save, Send, Calendar, ChevronDown, MessageSquare, CheckCircle2, Clock, AlertTriangle, MinusCircle, User } from "lucide-react"
import { getWeeksOfMonth, getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, addManagerItemNote } from "./actions"

const PROGRESS = [
  { value: "NOT_STARTED", label: "Chua bat dau", color: "bg-slate-100 text-slate-600", icon: MinusCircle },
  { value: "DOING", label: "Dang thuc hien", color: "bg-blue-100 text-blue-700", icon: Clock },
  { value: "COMPLETED", label: "Hoan thanh", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  { value: "NOT_COMPLETED", label: "Chua hoan thanh", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
]

interface ReportItem {
  id?: string; mainTask: string; workContent: string; progress: string; proposedSolution: string; managerNote?: string
}

export function WeeklyReportClient({ currentRole, currentUserId, currentUserName, years, staffUsers }: any) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [academicYearId, setAcademicYearId] = useState(years?.[0]?.id || "")
  const [weeks, setWeeks] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [items, setItems] = useState<ReportItem[]>([])
  const [reportId, setReportId] = useState("")
  const [reportStatus, setReportStatus] = useState("")
  const [managerComment, setManagerComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Admin: view other users' reports
  const [viewUserId, setViewUserId] = useState(currentUserId)
  const [allReports, setAllReports] = useState<any[]>([])
  const [mgmtComment, setMgmtComment] = useState("")
  const [editingItemNote, setEditingItemNote] = useState<string | null>(null)
  const [itemNoteText, setItemNoteText] = useState("")

  const isAdmin = currentRole === "ADMIN"

  useEffect(() => {
    const w = getWeeksOfMonth(month, year)
    setWeeks(w)
    if (w.length > 0 && selectedWeek > w.length) setSelectedWeek(1)
  }, [month, year])

  useEffect(() => {
    loadReport()
  }, [selectedWeek, month, year, viewUserId])

  const loadReport = async () => {
    setLoading(true)
    if (isAdmin) {
      const res = await getAllWeeklyReports(selectedWeek, month, year)
      if (res.success) setAllReports(res.reports)
    }
    const uid = isAdmin ? viewUserId : currentUserId
    const res = await getWeeklyReport(uid, selectedWeek, month, year)
    if (res.success && res.report) {
      setItems(res.report.items.map((i: any) => ({
        id: i.id, mainTask: i.mainTask, workContent: i.workContent, progress: i.progress,
        proposedSolution: i.proposedSolution || "", managerNote: i.managerNote || ""
      })))
      setReportId(res.report.id)
      setReportStatus(res.report.status)
      setManagerComment(res.report.managerComment || "")
    } else {
      setItems([])
      setReportId("")
      setReportStatus("")
      setManagerComment("")
    }
    setLoading(false)
  }

  const addRow = () => {
    setItems([...items, { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" }])
  }

  const removeRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleSave = async () => {
    if (items.length === 0) return alert("Vui long them it nhat 1 noi dung cong viec!")
    if (items.some(i => !i.mainTask.trim() || !i.workContent.trim())) return alert("Vui long dien day du Task chinh va Noi dung!")
    setSaving(true)
    const res = await saveWeeklyReport({
      weekNumber: selectedWeek, month, year, academicYearId,
      items: items.map(i => ({ mainTask: i.mainTask, workContent: i.workContent, progress: i.progress, proposedSolution: i.proposedSolution }))
    })
    if (res.success) {
      alert("Da luu bao cao tuan " + selectedWeek + " thanh cong!")
      loadReport()
    } else {
      alert("Loi: " + res.error)
    }
    setSaving(false)
  }

  const handleManagerComment = async (rptId: string) => {
    if (!mgmtComment.trim()) return alert("Vui long nhap nhan xet!")
    const res = await addManagerComment(rptId, mgmtComment.trim())
    if (res.success) { alert("Da luu nhan xet!"); loadReport(); setMgmtComment("") }
    else alert("Loi: " + res.error)
  }

  const handleItemNote = async (itemId: string) => {
    const res = await addManagerItemNote(itemId, itemNoteText.trim())
    if (res.success) { loadReport(); setEditingItemNote(null); setItemNoteText("") }
    else alert("Loi: " + res.error)
  }

  const selectedWeekInfo = weeks.find(w => w.weekNum === selectedWeek)

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-slate-800">
          <FileText className="w-6 h-6 text-amber-600" />
          Bao cao Tuan
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Thang</label>
            <select value={month} onChange={e => setMonth(+e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-amber-50/50">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Thang {m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Nam</label>
            <select value={year} onChange={e => setYear(+e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-amber-50/50">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Nam hoc</label>
            <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-amber-50/50">
              {(years||[]).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tuan</label>
            <select value={selectedWeek} onChange={e => setSelectedWeek(+e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-amber-50/50">
              {weeks.map(w => <option key={w.weekNum} value={w.weekNum}>{w.label}</option>)}
            </select>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1"><User className="w-3 h-3" /> Xem bao cao cua</label>
            <select value={viewUserId} onChange={e => setViewUserId(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {(staffUsers||[]).map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Week Info Banner */}
      {selectedWeekInfo && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-semibold">{selectedWeekInfo.label}</span>
          {reportStatus && (
            <span className={"ml-auto text-xs font-bold px-2 py-0.5 rounded-full " + 
              (reportStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : 
               reportStatus === "SUBMITTED" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
              {reportStatus === "REVIEWED" ? "Da duyet" : reportStatus === "SUBMITTED" ? "Da nop" : "Nhap"}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Report Table */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 border-b border-amber-100">
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase w-10">STT</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[140px]">Task chinh</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[200px]">Noi dung cong viec</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[140px]">Tien do</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[160px]">De xuat giai phap</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[160px]">Nhan xet cua Quan ly</th>
                    {!isAdmin && <th className="px-3 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      {isAdmin ? "Nhan vien chua nop bao cao tuan nay" : "Chua co noi dung. Nhan '+ Them dong' de bat dau!"}
                    </td></tr>
                  )}
                  {items.map((item, i) => {
                    const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-center text-slate-400 font-bold">{i + 1}</td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <span className="text-sm font-medium text-slate-800">{item.mainTask}</span>
                          ) : (
                            <input value={item.mainTask} onChange={e => updateItem(i, "mainTask", e.target.value)}
                              className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300" placeholder="Nhap task..." />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <span className="text-sm text-slate-700">{item.workContent}</span>
                          ) : (
                            <textarea value={item.workContent} onChange={e => updateItem(i, "workContent", e.target.value)}
                              rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none" placeholder="Mo ta chi tiet..." />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <span className={"text-xs px-2 py-1 rounded-full font-semibold " + prog.color}>{prog.label}</span>
                          ) : (
                            <select value={item.progress} onChange={e => updateItem(i, "progress", e.target.value)}
                              className={"w-full border rounded-lg p-2 text-xs font-semibold outline-none cursor-pointer " + prog.color}>
                              {PROGRESS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <span className="text-sm text-slate-600 italic">{item.proposedSolution || "-"}</span>
                          ) : (
                            <textarea value={item.proposedSolution} onChange={e => updateItem(i, "proposedSolution", e.target.value)}
                              rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none" placeholder="De xuat..." />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {isAdmin ? (
                            <div>
                              {editingItemNote === (item.id || String(i)) ? (
                                <div className="flex flex-col gap-1">
                                  <textarea value={itemNoteText} onChange={e => setItemNoteText(e.target.value)}
                                    rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                                  <div className="flex gap-1">
                                    <button onClick={() => item.id && handleItemNote(item.id)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg">Luu</button>
                                    <button onClick={() => setEditingItemNote(null)} className="text-xs bg-slate-100 px-2 py-1 rounded-lg">Huy</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="cursor-pointer group" onClick={() => { setEditingItemNote(item.id || String(i)); setItemNoteText(item.managerNote || "") }}>
                                  {item.managerNote ? (
                                    <span className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span>
                                  ) : (
                                    <span className="text-xs text-slate-400 group-hover:text-indigo-600 italic">Click de nhan xet...</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {item.managerNote ? (
                                <span className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chua co nhan xet</span>
                              )}
                            </div>
                          )}
                        </td>
                        {!isAdmin && (
                          <td className="px-2 py-3">
                            <button onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          {!isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={addRow}
                className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-amber-300 text-amber-700 px-5 py-2.5 rounded-xl hover:bg-amber-50 hover:border-amber-400 font-semibold text-sm transition-all">
                <Plus className="w-4 h-4" /> Them dong
              </button>
              <button onClick={handleSave} disabled={saving || items.length === 0}
                className="flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:bg-amber-700 font-semibold text-sm transition-all disabled:opacity-50 shadow-sm shadow-amber-200">
                <Save className="w-4 h-4" /> {saving ? "Dang luu..." : "Luu bao cao"}
              </button>
            </div>
          )}

          {/* Manager Overall Comment */}
          {managerComment && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-800">Nhan xet tong the cua Quan ly</span>
              </div>
              <p className="text-sm text-indigo-700 whitespace-pre-wrap">{managerComment}</p>
            </div>
          )}

          {isAdmin && reportId && (
            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" /> Nhan xet tong the
              </h3>
              <textarea value={mgmtComment} onChange={e => setMgmtComment(e.target.value)}
                rows={3} placeholder="Nhap nhan xet tong the cho bao cao tuan nay..."
                className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              <button onClick={() => handleManagerComment(reportId)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 text-sm font-semibold transition-colors">
                <Send className="w-4 h-4" /> Gui nhan xet
              </button>
            </div>
          )}

          {/* Admin: All Reports Overview */}
          {isAdmin && allReports.length > 0 && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b px-4 py-3">
                <h3 className="text-sm font-bold text-slate-700">Tong hop bao cao Tuan {selectedWeek} - Thang {month}/{year}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {allReports.map((r: any) => (
                  <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setViewUserId(r.user.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.user.fullName}</p>
                          <p className="text-xs text-slate-400">{r.items.length} muc • {r.user.role}</p>
                        </div>
                      </div>
                      <span className={"text-xs font-bold px-2 py-0.5 rounded-full " +
                        (r.status === "REVIEWED" ? "bg-emerald-100 text-emerald-700" :
                         r.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
                        {r.status === "REVIEWED" ? "Da duyet" : r.status === "SUBMITTED" ? "Da nop" : "Nhap"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
`;

fs.writeFileSync('src/app/admin/weekly-reports/client.tsx', clientContent);
console.log('OK: weekly-reports/client.tsx created');
