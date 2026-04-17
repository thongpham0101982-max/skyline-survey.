const fs = require('fs');

const content = `"use client"
import { useState, useEffect } from "react"
import { FileText, Plus, Trash2, Save, Send, Calendar, MessageSquare, CheckCircle2, Clock, AlertTriangle, MinusCircle, User, BarChart3, Users, TrendingUp, ClipboardList, Table2 } from "lucide-react"
import { getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, addManagerItemNote, getConsolidatedReports, getDashboardStats } from "./actions"

function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const lastDay = new Date(year, month, 0)
  let current = new Date(year, month - 1, 1)
  while (current.getDay() !== 1 && current <= lastDay) current.setDate(current.getDate() + 1)
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current); friday.setDate(friday.getDate() + 4)
    const end = friday > lastDay ? new Date(lastDay) : friday
    weeks.push({ weekNum, start: start.toLocaleDateString("vi-VN"), end: end.toLocaleDateString("vi-VN"),
      label: "Tuan " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")" })
    weekNum++; current.setDate(current.getDate() + 7)
  }
  return weeks
}

const PROGRESS = [
  { value: "NOT_STARTED", label: "Chua bat dau", color: "bg-slate-100 text-slate-600", barColor: "#94a3b8" },
  { value: "DOING", label: "Dang thuc hien", color: "bg-blue-100 text-blue-700", barColor: "#3b82f6" },
  { value: "COMPLETED", label: "Hoan thanh", color: "bg-emerald-100 text-emerald-700", barColor: "#10b981" },
  { value: "NOT_COMPLETED", label: "Chua hoan thanh", color: "bg-amber-100 text-amber-700", barColor: "#f59e0b" },
]

interface ReportItem { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution: string; managerNote?: string }

export function WeeklyReportClient({ currentRole, currentUserId, currentUserName, years, staffUsers, roles }: any) {
  const now = new Date()
  const [activeTab, setActiveTab] = useState<"personal"|"consolidated"|"dashboard">("dashboard")
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
  const [viewUserId, setViewUserId] = useState(currentUserId)
  const [mgmtComment, setMgmtComment] = useState("")
  const [editingItemNote, setEditingItemNote] = useState<string|null>(null)
  const [itemNoteText, setItemNoteText] = useState("")
  // Consolidated
  const [selectedRoleCode, setSelectedRoleCode] = useState("ALL")
  const [consolidatedData, setConsolidatedData] = useState<any[]>([])
  // Dashboard
  const [stats, setStats] = useState<any>({ totalTasks: 0, completed: 0, overdue: 0, inProgress: 0, pending: 0 })
  const [chartData, setChartData] = useState<any>({})

  const isAdmin = currentRole === "ADMIN"

  useEffect(() => { setWeeks(getWeeksOfMonth(month, year)) }, [month, year])
  useEffect(() => { if (activeTab === "personal") loadReport() }, [selectedWeek, month, year, viewUserId, activeTab])
  useEffect(() => { if (activeTab === "consolidated") loadConsolidated() }, [selectedRoleCode, selectedWeek, month, year, activeTab])
  useEffect(() => { if (activeTab === "dashboard") loadDashboard() }, [month, year, activeTab])

  const loadReport = async () => {
    setLoading(true)
    const uid = isAdmin ? viewUserId : currentUserId
    const res = await getWeeklyReport(uid, selectedWeek, month, year)
    if (res.success && res.report) {
      setItems(res.report.items.map((i: any) => ({ id: i.id, mainTask: i.mainTask, workContent: i.workContent, progress: i.progress, proposedSolution: i.proposedSolution || "", managerNote: i.managerNote || "" })))
      setReportId(res.report.id); setReportStatus(res.report.status); setManagerComment(res.report.managerComment || "")
    } else { setItems([]); setReportId(""); setReportStatus(""); setManagerComment("") }
    setLoading(false)
  }

  const loadConsolidated = async () => {
    setLoading(true)
    const res = await getConsolidatedReports(selectedRoleCode, selectedWeek, month, year)
    if (res.success) setConsolidatedData(res.reports)
    setLoading(false)
  }

  const loadDashboard = async () => {
    setLoading(true)
    const res = await getDashboardStats(month, year)
    if (res.success) { setStats(res.stats); setChartData(res.chartData) }
    setLoading(false)
  }

  const addRow = () => setItems([...items, { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" }])
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: string, value: string) => setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const handleSave = async () => {
    if (items.length === 0) return alert("Vui long them it nhat 1 dong!")
    if (items.some(i => !i.mainTask.trim() || !i.workContent.trim())) return alert("Vui long dien day du!")
    setSaving(true)
    const res = await saveWeeklyReport({ weekNumber: selectedWeek, month, year, academicYearId, items: items.map(i => ({ mainTask: i.mainTask, workContent: i.workContent, progress: i.progress, proposedSolution: i.proposedSolution })) })
    if (res.success) { alert("Luu thanh cong!"); loadReport() } else alert("Loi: " + res.error)
    setSaving(false)
  }

  const handleManagerComment = async (rptId: string) => {
    if (!mgmtComment.trim()) return
    const res = await addManagerComment(rptId, mgmtComment.trim())
    if (res.success) { loadReport(); setMgmtComment("") } else alert("Loi: " + res.error)
  }

  const handleItemNote = async (itemId: string) => {
    const res = await addManagerItemNote(itemId, itemNoteText.trim())
    if (res.success) { loadReport(); setEditingItemNote(null) } else alert("Loi: " + res.error)
  }

  const maxWeeks = Math.max(...Object.values(chartData as Record<string, any>).map((u: any) => Math.max(...Object.keys(u.weeks || {}).map(Number), 0)), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-slate-800">
          <FileText className="w-6 h-6 text-amber-600" /> Bao cao Tuan
        </h1>
      </div>

      {/* Tab Navigation */}
      {isAdmin && (
        <div className="flex bg-white rounded-2xl shadow-sm border p-1 gap-1">
          {[
            { key: "dashboard", label: "Dashboard", icon: BarChart3 },
            { key: "consolidated", label: "Tong hop", icon: Table2 },
            { key: "personal", label: "Ca nhan", icon: User },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={"flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all " +
                (activeTab === tab.key ? "bg-amber-600 text-white shadow-sm" : "text-slate-500 hover:text-amber-700 hover:bg-amber-50")}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Thang</label>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Thang {m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Nam</label>
            <select value={year} onChange={e => setYear(+e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Nam hoc</label>
            <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {(years||[]).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tuan</label>
            <select value={selectedWeek} onChange={e => setSelectedWeek(+e.target.value)} className="w-full border rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {weeks.map(w => <option key={w.weekNum} value={w.weekNum}>{w.label}</option>)}
            </select>
          </div>
        </div>
        {activeTab === "personal" && isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-1.5"><User className="w-3 h-3 inline" /> Xem bao cao cua</label>
            <select value={viewUserId} onChange={e => setViewUserId(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              {(staffUsers||[]).map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
        )}
        {activeTab === "consolidated" && isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-1.5"><Users className="w-3 h-3 inline" /> Nhom quyen</label>
            <select value={selectedRoleCode} onChange={e => setSelectedRoleCode(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/50">
              <option value="ALL">-- Tat ca nhom --</option>
              {(roles||[]).map((r: any) => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* ============ DASHBOARD TAB ============ */}
          {activeTab === "dashboard" && isAdmin && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Tong dau viec", value: stats.totalTasks, color: "from-slate-500 to-slate-700", icon: ClipboardList },
                  { label: "Hoan thanh", value: stats.completed, color: "from-emerald-500 to-emerald-700", icon: CheckCircle2 },
                  { label: "Dang thuc hien", value: stats.inProgress, color: "from-blue-500 to-blue-700", icon: Clock },
                  { label: "Chua thuc hien", value: stats.pending, color: "from-amber-500 to-amber-700", icon: MinusCircle },
                  { label: "Tre han", value: stats.overdue, color: "from-red-500 to-red-700", icon: AlertTriangle },
                ].map((s, i) => (
                  <div key={i} className={"bg-gradient-to-br " + s.color + " text-white rounded-2xl p-4 shadow-lg"}>
                    <div className="flex items-center justify-between mb-2"><s.icon className="w-5 h-5 opacity-70" /></div>
                    <div className="text-3xl font-black">{s.value}</div>
                    <div className="text-xs opacity-80 mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart: Employee progress by week */}
              <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-bold text-amber-800">Tien do cong viec theo tuan - Thang {month}/{year}</h3>
                </div>
                <div className="p-5">
                  {Object.keys(chartData).length === 0 ? (
                    <div className="text-center py-12 text-slate-400"><BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Chua co du lieu bao cao</p></div>
                  ) : (
                    <div className="space-y-5">
                      {/* Legend */}
                      <div className="flex flex-wrap gap-4 justify-center text-xs">
                        {PROGRESS.map(p => (
                          <div key={p.value} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm" style={{ background: p.barColor }} />
                            <span className="text-slate-600 font-medium">{p.label}</span>
                          </div>
                        ))}
                      </div>
                      {/* Chart bars */}
                      {Object.entries(chartData).map(([uid, userData]: any) => (
                        <div key={uid} className="border rounded-xl p-4 hover:bg-slate-50 transition-colors">
                          <div className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center"><User className="w-3.5 h-3.5 text-amber-700" /></div>
                            {userData.name}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            {Array.from({ length: Math.max(maxWeeks, weeks.length) }, (_, i) => i + 1).map(wk => {
                              const wData = userData.weeks?.[wk]
                              const total = wData?.total || 0
                              return (
                                <div key={wk} className="text-center">
                                  <div className="text-[10px] text-slate-400 font-bold mb-1">T{wk}</div>
                                  {total > 0 ? (
                                    <div className="flex h-24 items-end justify-center gap-0.5">
                                      {[
                                        { count: wData.completed, color: "#10b981" },
                                        { count: wData.doing, color: "#3b82f6" },
                                        { count: wData.notCompleted, color: "#f59e0b" },
                                      ].map((bar, bi) => (
                                        <div key={bi} className="w-4 rounded-t-sm transition-all" style={{ height: Math.max((bar.count / total) * 80, bar.count > 0 ? 8 : 0) + "px", background: bar.color, opacity: bar.count > 0 ? 1 : 0.1 }}
                                          title={bar.count + " muc"} />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-24 flex items-end justify-center"><div className="w-10 h-1 bg-slate-100 rounded" /></div>
                                  )}
                                  <div className="text-[10px] text-slate-500 mt-1">{total} muc</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ CONSOLIDATED TAB ============ */}
          {activeTab === "consolidated" && isAdmin && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Table2 className="w-4 h-4" /> Tong hop bao cao Tuan {selectedWeek} - Thang {month}/{year}</h3>
                <span className="text-xs text-amber-600">{consolidatedData.length} bao cao</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase w-10">STT</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[100px]">Ma NV</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px]">Ho va Ten</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[130px]">Task chinh</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[180px]">Noi dung cong viec</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[120px]">Tien do</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px]">De xuat giai phap</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px]">Nhan xet cua QL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidatedData.length === 0 && (
                      <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        <Table2 className="w-10 h-10 mx-auto mb-2 opacity-30" />Chua co bao cao nao cho tuan nay
                      </td></tr>
                    )}
                    {(() => {
                      let stt = 0
                      return consolidatedData.flatMap((report: any) =>
                        report.items.map((item: any, idx: number) => {
                          stt++
                          const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                          const isFirst = idx === 0
                          return (
                            <tr key={item.id || stt} className={"hover:bg-slate-50 transition-colors " + (isFirst && stt > 1 ? "border-t-2 border-amber-200" : "")}>
                              <td className="px-3 py-3 text-center text-slate-400 font-bold">{stt}</td>
                              <td className="px-3 py-3">
                                {isFirst && <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{report.user.employeeCode || report.user.email}</span>}
                              </td>
                              <td className="px-3 py-3">
                                {isFirst && <span className="font-semibold text-slate-800">{report.user.fullName}</span>}
                              </td>
                              <td className="px-3 py-3 font-medium text-slate-700">{item.mainTask}</td>
                              <td className="px-3 py-3 text-slate-600">{item.workContent}</td>
                              <td className="px-3 py-3"><span className={"text-xs px-2 py-1 rounded-full font-semibold " + prog.color}>{prog.label}</span></td>
                              <td className="px-3 py-3 text-slate-500 italic">{item.proposedSolution || "-"}</td>
                              <td className="px-3 py-3">
                                {item.managerNote ? (
                                  <span className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ PERSONAL TAB ============ */}
          {(activeTab === "personal" || !isAdmin) && (
            <>
              {/* Week Banner */}
              {weeks.find(w => w.weekNum === selectedWeek) && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-semibold">{weeks.find(w => w.weekNum === selectedWeek)?.label}</span>
                  {reportStatus && (
                    <span className={"ml-auto text-xs font-bold px-2 py-0.5 rounded-full " + (reportStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : reportStatus === "SUBMITTED" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
                      {reportStatus === "REVIEWED" ? "Da duyet" : reportStatus === "SUBMITTED" ? "Da nop" : "Nhap"}
                    </span>
                  )}
                </div>
              )}
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
                        <th className="px-3 py-3 text-left text-xs font-bold text-amber-800 uppercase min-w-[160px]">Nhan xet QL</th>
                        {!isAdmin && <th className="px-3 py-3 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          {isAdmin ? "Nhan vien chua nop bao cao" : "Nhan '+ Them dong' de bat dau!"}
                        </td></tr>
                      )}
                      {items.map((item, i) => {
                        const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-3 text-center text-slate-400 font-bold">{i+1}</td>
                            <td className="px-3 py-3">{isAdmin ? <span className="font-medium text-slate-800">{item.mainTask}</span> : <input value={item.mainTask} onChange={e => updateItem(i,"mainTask",e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200" placeholder="Nhap task..." />}</td>
                            <td className="px-3 py-3">{isAdmin ? <span className="text-slate-700">{item.workContent}</span> : <textarea value={item.workContent} onChange={e => updateItem(i,"workContent",e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none" placeholder="Mo ta..." />}</td>
                            <td className="px-3 py-3">{isAdmin ? <span className={"text-xs px-2 py-1 rounded-full font-semibold " + prog.color}>{prog.label}</span> : <select value={item.progress} onChange={e => updateItem(i,"progress",e.target.value)} className={"w-full border rounded-lg p-2 text-xs font-semibold outline-none cursor-pointer " + prog.color}>{PROGRESS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>}</td>
                            <td className="px-3 py-3">{isAdmin ? <span className="text-slate-600 italic">{item.proposedSolution || "-"}</span> : <textarea value={item.proposedSolution} onChange={e => updateItem(i,"proposedSolution",e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none" placeholder="De xuat..." />}</td>
                            <td className="px-3 py-3">
                              {isAdmin ? (
                                editingItemNote === (item.id || String(i)) ? (
                                  <div className="flex flex-col gap-1">
                                    <textarea value={itemNoteText} onChange={e => setItemNoteText(e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                                    <div className="flex gap-1"><button onClick={() => item.id && handleItemNote(item.id)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg">Luu</button><button onClick={() => setEditingItemNote(null)} className="text-xs bg-slate-100 px-2 py-1 rounded-lg">Huy</button></div>
                                  </div>
                                ) : (
                                  <div className="cursor-pointer group" onClick={() => { setEditingItemNote(item.id || String(i)); setItemNoteText(item.managerNote || "") }}>
                                    {item.managerNote ? <span className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span> : <span className="text-xs text-slate-400 group-hover:text-indigo-600 italic">Click de nhan xet...</span>}
                                  </div>
                                )
                              ) : (
                                item.managerNote ? <span className="text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span> : <span className="text-xs text-slate-400 italic">Chua co</span>
                              )}
                            </td>
                            {!isAdmin && <td className="px-2 py-3"><button onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {!isAdmin && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={addRow} className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-amber-300 text-amber-700 px-5 py-2.5 rounded-xl hover:bg-amber-50 font-semibold text-sm"><Plus className="w-4 h-4" /> Them dong</button>
                  <button onClick={handleSave} disabled={saving || items.length === 0} className="flex items-center justify-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-xl hover:bg-amber-700 font-semibold text-sm disabled:opacity-50 shadow-sm shadow-amber-200"><Save className="w-4 h-4" /> {saving ? "Dang luu..." : "Luu bao cao"}</button>
                </div>
              )}
              {managerComment && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-indigo-600" /><span className="text-sm font-bold text-indigo-800">Nhan xet tong the</span></div>
                  <p className="text-sm text-indigo-700 whitespace-pre-wrap">{managerComment}</p>
                </div>
              )}
              {isAdmin && reportId && (
                <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-600" /> Nhan xet tong the</h3>
                  <textarea value={mgmtComment} onChange={e => setMgmtComment(e.target.value)} rows={3} placeholder="Nhap nhan xet..." className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                  <button onClick={() => handleManagerComment(reportId)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 text-sm font-semibold"><Send className="w-4 h-4" /> Gui nhan xet</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
`;

fs.writeFileSync('src/app/admin/weekly-reports/client.tsx', content);
console.log('OK: Enhanced client.tsx with Dashboard + Consolidated + Personal tabs');
