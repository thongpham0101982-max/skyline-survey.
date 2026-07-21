"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useEffect, useMemo } from "react"
import { FileText, Plus, Trash2, Save, Send, Calendar, MessageSquare, CheckCircle2, Clock, AlertTriangle, MinusCircle, User, BarChart3, Users, TrendingUp, ClipboardList, Table2 } from "lucide-react"
import { getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, addManagerItemNote, getConsolidatedReports, getDashboardStats } from "./actions"

function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const lastDay = new Date(year, month, 0)
  const current = new Date(year, month - 1, 1)
  while (current.getDay() !== 1 && current <= lastDay) current.setDate(current.getDate() + 1)
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current); friday.setDate(friday.getDate() + 4)
    const end = friday > lastDay ? new Date(lastDay) : friday
    weeks.push({ weekNum, start: start.toLocaleDateString("vi-VN"), end: end.toLocaleDateString("vi-VN"),
      label: "Tuần " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")" })
    weekNum++; current.setDate(current.getDate() + 7)
  }
  return weeks
}

const PROGRESS = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", color: "bg-slate-100 text-slate-600", barColor: "#94a3b8" },
  { value: "DOING", label: "Đang thực hiện", color: "bg-blue-100 text-blue-700", barColor: "#3b82f6" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700", barColor: "#10b981" },
  { value: "NOT_COMPLETED", label: "Chưa hoàn thành", color: "bg-amber-100 text-amber-700", barColor: "#f59e0b" },
]

interface ReportItem { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution: string; managerNote?: string }

export function WeeklyReportClient({ currentRole, currentUserId, currentUserName, years, staffUsers, roles }: any) {
  const now = new Date()
  const [activeTab, setActiveTab] = useState<"personal"|"consolidated"|"dashboard">("dashboard")
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [academicYearId, setAcademicYearId] = useState(() => getDefaultAcademicYearClient(years)?.id || "")
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

  const getRoleName = (code: string) => {
    return roles?.find((r: any) => r.code === code)?.name || code;
  }

  const groupedStaff = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (staffUsers || []).forEach((u: any) => {
      const rName = getRoleName(u.role);
      if (!groups[rName]) groups[rName] = [];
      groups[rName].push(u);
    });
    return groups;
  }, [staffUsers, roles]);

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
    if (items.length === 0) return alert("Vui lòng thêm ít nhất 1 dòng!")
    if (items.some(i => !i.mainTask.trim() || !i.workContent.trim())) return alert("Vui lòng điền đầy đủ!")
    setSaving(true)
    const res = await saveWeeklyReport({ weekNumber: selectedWeek, month, year, academicYearId, items: items.map(i => ({ mainTask: i.mainTask, workContent: i.workContent, progress: i.progress, proposedSolution: i.proposedSolution })) })
    if (res.success) { alert("Lưu thành công!"); loadReport() } else alert("Lỗi: " + res.error)
    setSaving(false)
  }

  const handleManagerComment = async (rptId: string) => {
    if (!mgmtComment.trim()) return
    const res = await addManagerComment(rptId, mgmtComment.trim())
    if (res.success) { loadReport(); setMgmtComment("") } else alert("Lỗi: " + res.error)
  }

  const handleItemNote = async (itemId: string) => {
    const res = await addManagerItemNote(itemId, itemNoteText.trim())
    if (res.success) { loadReport(); setEditingItemNote(null) } else alert("Lỗi: " + res.error)
  }

  const maxWeeks = Math.max(...Object.values(chartData as Record<string, any>).map((u: any) => Math.max(...Object.keys(u.weeks || {}).map(Number), 0)), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-slate-800">
          <FileText className="w-6 h-6 text-amber-600" /> Báo cáo Tuần
        </h1>
      </div>

      {/* Tab Navigation */}
      {isAdmin && (
        <div className="flex bg-white rounded-2xl shadow-sm border p-1 gap-1">
          {[
            { key: "dashboard", label: "Dashboard", icon: BarChart3 },
            { key: "consolidated", label: "Tổng hợp", icon: Table2 },
            { key: "personal", label: "Cá nhân", icon: User },
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
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tháng</label>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="w-full p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Năm</label>
            <select value={year} onChange={e => setYear(+e.target.value)} className="w-full p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Năm học</label>
            <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="w-full p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              {(years||[]).filter((y: any) => !y.isOff).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tuần</label>
            <select value={selectedWeek} onChange={e => setSelectedWeek(+e.target.value)} className="w-full p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              {weeks.map(w => <option key={w.weekNum} value={w.weekNum}>{w.label}</option>)}
            </select>
          </div>
        </div>
        {activeTab === "personal" && isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-1.5"><User className="w-3 h-3 inline" /> Xem báo cáo của</label>
            <select value={viewUserId} onChange={e => setViewUserId(e.target.value)} className="w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              {Object.entries(groupedStaff).map(([roleName, users]) => (
                <optgroup key={roleName} label={roleName}>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
        {activeTab === "consolidated" && isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-500 mb-1.5"><Users className="w-3 h-3 inline" /> Nhóm quyền</label>
            <select value={selectedRoleCode} onChange={e => setSelectedRoleCode(e.target.value)} className="w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 text-xs font-semibold">
              <option value="ALL">-- Tất cả nhóm --</option>
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
                  { label: "Tổng đầu việc", value: stats.totalTasks, color: "from-slate-500 to-slate-700", icon: ClipboardList },
                  { label: "Hoàn thành", value: stats.completed, color: "from-emerald-500 to-emerald-700", icon: CheckCircle2 },
                  { label: "Đang thực hiện", value: stats.inProgress, color: "from-blue-500 to-blue-700", icon: Clock },
                  { label: "Chưa thực hiện", value: stats.pending, color: "from-amber-500 to-amber-700", icon: MinusCircle },
                  { label: "Trễ hạn", value: stats.overdue, color: "from-red-500 to-red-700", icon: AlertTriangle },
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
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-bold text-amber-800">Tiến độ công việc theo tuần - Thang {month}/{year}</h3>
                </div>
                <div className="p-5">
                  {Object.keys(chartData).length === 0 ? (
                    <div className="text-center py-12 text-slate-400"><BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Chưa có dữ liệu báo cáo</p></div>
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
                        <div key={uid} className="p-4 hover:bg-slate-50 transition-colors text-xs font-semibold">
                          <div className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
                            <div className="w-7 h-7 flex items-center justify-center text-xs font-semibold"><User className="w-3.5 h-3.5 text-amber-700" /></div>
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
                                          title={bar.count + " mục"} />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-24 flex items-end justify-center"><div className="w-10 h-1 bg-slate-100 rounded" /></div>
                                  )}
                                  <div className="text-[10px] text-slate-500 mt-1">{total} mục</div>
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
              <div className="flex items-center justify-between text-xs font-semibold">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Table2 className="w-4 h-4" /> Tổng hợp bao cao Tuan {selectedWeek} - Thang {month}/{year}</h3>
                <span className="text-xs text-amber-600">{consolidatedData.length} báo cáo</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold">
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase w-10 border border-slate-200">STT</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[100px] border border-slate-200">Mã NV</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px] border border-slate-200">Họ và Tên</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[130px] border border-slate-200">Task chính</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[180px] border border-slate-200">Nội dung công việc</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[120px] border border-slate-200">Tiến độ</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px] border border-slate-200">Đề xuất giải pháp</th>
                      <th className="p-2 p-2 text-left text-xs font-bold text-slate-600 uppercase min-w-[140px] border border-slate-200">Nhận xét của QL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidatedData.length === 0 && (
                      <tr><td colSpan={8} className="p-2 p-2 text-center text-slate-400 border border-slate-200">
                        <Table2 className="w-10 h-10 mx-auto mb-2 opacity-30" />Chưa có báo cáo nào cho tuần này
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
                              <td className="p-2 p-2 text-center text-slate-400 font-bold border border-slate-200">{stt}</td>
                              <td className="p-2 p-2 border border-slate-200">
                                {isFirst && <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{report.user.email}</span>}
                              </td>
                              <td className="p-2 p-2 border border-slate-200">
                                {isFirst && <span className="font-semibold text-slate-800">{report.user.fullName}</span>}
                              </td>
                              <td className="p-2 p-2 font-medium text-slate-700 border border-slate-200">{item.mainTask}</td>
                              <td className="p-2 p-2 text-slate-600 border border-slate-200">{item.workContent}</td>
                              <td className="p-2 p-2 border border-slate-200"><span className={"text-xs px-2 py-1 rounded-full font-semibold " + prog.color}>{prog.label}</span></td>
                              <td className="p-2 p-2 text-slate-500 italic border border-slate-200">{item.proposedSolution || "-"}</td>
                              <td className="p-2 p-2 border border-slate-200">
                                {item.managerNote ? (
                                  <span className="text-sm text-indigo-700 bg-[#00A99D]/10 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span>
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
                      {reportStatus === "REVIEWED" ? "Đã duyệt" : reportStatus === "SUBMITTED" ? "Đã nộp" : "Nháp"}
                    </span>
                  )}
                </div>
              )}
              {/* Report Table */}
              <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold">
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase w-10 border border-slate-200">STT</th>
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase min-w-[140px] border border-slate-200">Task chính</th>
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase min-w-[200px] border border-slate-200">Nội dung công việc</th>
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase min-w-[140px] border border-slate-200">Tiến độ</th>
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase min-w-[160px] border border-slate-200">Đề xuất giải pháp</th>
                        <th className="p-2 p-2 text-left text-xs font-bold text-amber-800 uppercase min-w-[160px] border border-slate-200">Nhận xét QL</th>
                        {!isAdmin && <th className="p-2 p-2 w-10 border border-slate-200"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 && (
                        <tr><td colSpan={7} className="p-2 p-2 text-center text-slate-400 border border-slate-200">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          {isAdmin ? "Nhân viên chưa nộp báo cáo" : "Nhấn '+ Thêm dòng' để bắt đầu!"}
                        </td></tr>
                      )}
                      {items.map((item, i) => {
                        const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors text-xs font-semibold">
                            <td className="p-2 p-2 text-center text-slate-400 font-bold border border-slate-200">{i+1}</td>
                            <td className="p-2 p-2 border border-slate-200">{isAdmin ? <span className="font-medium text-slate-800">{item.mainTask}</span> : <input value={item.mainTask} onChange={e => updateItem(i,"mainTask",e.target.value)} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200" placeholder="Nhập task..." />}</td>
                            <td className="p-2 p-2 border border-slate-200">{isAdmin ? <span className="text-slate-700">{item.workContent}</span> : <textarea value={item.workContent} onChange={e => updateItem(i,"workContent",e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none" placeholder="Mô tả..." />}</td>
                            <td className="p-2 p-2 border border-slate-200">{isAdmin ? <span className={"text-xs px-2 py-1 rounded-full font-semibold " + prog.color}>{prog.label}</span> : <select value={item.progress} onChange={e => updateItem(i,"progress",e.target.value)} className={"w-full border rounded-lg p-2 text-xs font-semibold outline-none cursor-pointer " + prog.color}>{PROGRESS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>}</td>
                            <td className="p-2 p-2 border border-slate-200">{isAdmin ? <span className="text-slate-600 italic">{item.proposedSolution || "-"}</span> : <textarea value={item.proposedSolution} onChange={e => updateItem(i,"proposedSolution",e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none" placeholder="Đề xuất..." />}</td>
                            <td className="p-2 p-2 border border-slate-200">
                              {isAdmin ? (
                                editingItemNote === (item.id || String(i)) ? (
                                  <div className="flex flex-col gap-1">
                                    <textarea value={itemNoteText} onChange={e => setItemNoteText(e.target.value)} rows={2} className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                                    <div className="flex gap-1"><button onClick={() => item.id && handleItemNote(item.id)} className="text-xs bg-[#00A99D] text-white px-2 py-1 rounded-lg">Lưu</button><button onClick={() => setEditingItemNote(null)} className="text-xs bg-slate-100 px-2 py-1 rounded-lg">Hủy</button></div>
                                  </div>
                                ) : (
                                  <div className="cursor-pointer group" onClick={() => { setEditingItemNote(item.id || String(i)); setItemNoteText(item.managerNote || "") }}>
                                    {item.managerNote ? <span className="text-sm text-indigo-700 bg-[#00A99D]/10 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span> : <span className="text-xs text-slate-400 group-hover:text-[#00A99D] italic">Nhấn để nhận xét...</span>}
                                  </div>
                                )
                              ) : (
                                item.managerNote ? <span className="text-sm text-indigo-700 bg-[#00A99D]/10 px-2 py-1 rounded-lg inline-block">{item.managerNote}</span> : <span className="text-xs text-slate-400 italic">Chưa có</span>
                              )}
                            </td>
                            {!isAdmin && <td className="p-2 p-2 border border-slate-200"><button onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"><Trash2 className="w-4 h-4" /></button></td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {!isAdmin && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={addRow} className="flex items-center justify-center gap-2 text-amber-700 hover:bg-amber-50 font-semibold text-sm text-xs font-semibold"><Plus className="w-4 h-4" /> Thêm dòng</button>
                  <button onClick={handleSave} disabled={saving || items.length === 0} className="flex items-center justify-center gap-2 text-white hover:bg-amber-700 font-semibold text-sm disabled:opacity-50 shadow-sm shadow-amber-200 text-xs font-semibold"><Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu báo cáo"}</button>
                </div>
              )}
              {managerComment && (
                <div className="bg-[#00A99D]/10 border border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-[#00A99D]" /><span className="text-sm font-bold text-indigo-800">Nhận xét tổng thể</span></div>
                  <p className="text-sm text-indigo-700 whitespace-pre-wrap">{managerComment}</p>
                </div>
              )}
              {isAdmin && reportId && (
                <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#00A99D]" /> Nhận xét tổng thể</h3>
                  <textarea value={mgmtComment} onChange={e => setMgmtComment(e.target.value)} rows={3} placeholder="Nhập nhận xét..." className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                  <button onClick={() => handleManagerComment(reportId)} className="flex items-center gap-2 bg-[#00A99D] text-white px-5 py-2 rounded-xl hover:bg-[#009085] text-sm font-semibold"><Send className="w-4 h-4" /> Gửi nhận xét</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
