"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useEffect, useMemo } from "react"
import { 
  FileText, Plus, Trash2, Save, Send, Calendar, MessageSquare, 
  CheckCircle2, Clock, AlertTriangle, MinusCircle, User, BarChart3, 
  Users, TrendingUp, ClipboardList, Table2, Bell, Download, Copy, History, Edit3, Eye, Search, Filter, X
} from "lucide-react"
import { 
  getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, 
  addManagerItemNote, getConsolidatedReports, getDashboardStats, sendWeeklyReportEmailReminders,
  getUserReportHistory, deleteWeeklyReport
} from "./actions"
import * as XLSX from "xlsx"

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
    weeks.push({ 
      weekNum, 
      start: start.toLocaleDateString("vi-VN"), 
      end: end.toLocaleDateString("vi-VN"),
      label: "Tuần " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")" 
    })
    weekNum++; current.setDate(current.getDate() + 7)
  }
  return weeks
}

const PROGRESS = [
  { value: "NOT_STARTED", label: "Chưa bắt đầu", color: "bg-slate-100 text-slate-600 border-slate-300", barColor: "#94a3b8" },
  { value: "DOING", label: "Đang thực hiện", color: "bg-blue-100 text-blue-700 border-blue-200", barColor: "#3b82f6" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 border-emerald-200", barColor: "#10b981" },
  { value: "NOT_COMPLETED", label: "Chưa hoàn thành", color: "bg-amber-100 text-amber-700 border-amber-200", barColor: "#f59e0b" },
]

interface ReportItem { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution: string; managerNote?: string }

export function WeeklyReportClient({ currentRole, currentUserId, currentUserName, years, staffUsers, roles }: any) {
  const now = new Date()
  const [activeTab, setActiveTab] = useState<"personal"|"consolidated"|"dashboard"|"history">("dashboard")
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
  const [reminding, setReminding] = useState(false)
  const [viewUserId, setViewUserId] = useState(currentUserId)
  const [mgmtComment, setMgmtComment] = useState("")
  const [editingItemNote, setEditingItemNote] = useState<string|null>(null)
  const [itemNoteText, setItemNoteText] = useState("")
  const [toastMsg, setToastMsg] = useState<{msg: string, type: string} | null>(null)

  // History State
  const [historyReports, setHistoryReports] = useState<any[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [viewingHistoryReport, setViewingHistoryReport] = useState<any|null>(null)

  // Consolidated State
  const [selectedRoleCode, setSelectedRoleCode] = useState("ALL")
  const [consolidatedData, setConsolidatedData] = useState<any[]>([])
  
  // Dashboard State
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
  useEffect(() => { if (activeTab === "history") loadHistory() }, [viewUserId, activeTab])

  const loadReport = async () => {
    setLoading(true)
    const uid = isAdmin ? viewUserId : currentUserId
    const res = await getWeeklyReport(uid, selectedWeek, month, year)
    if (res.success && res.report) {
      setItems(res.report.items.map((i: any) => ({ 
        id: i.id, 
        mainTask: i.mainTask, 
        workContent: i.workContent, 
        progress: i.progress, 
        proposedSolution: i.proposedSolution || "", 
        managerNote: i.managerNote || "" 
      })))
      setReportId(res.report.id)
      setReportStatus(res.report.status)
      setManagerComment(res.report.managerComment || "")
    } else { 
      setItems([
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" },
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" },
        { mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" }
      ])
      setReportId("")
      setReportStatus("")
      setManagerComment("") 
    }
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

  const loadHistory = async () => {
    setLoading(true)
    const uid = isAdmin ? viewUserId : currentUserId
    const res = await getUserReportHistory(uid)
    if (res.success) setHistoryReports(res.reports)
    setLoading(false)
  }

  // Edit / Re-open Past Report
  const handleEditPastReport = (report: any) => {
    setMonth(report.month)
    setYear(report.year)
    setSelectedWeek(report.weekNumber)
    setActiveTab("personal")
    setToastMsg({ 
      msg: `✏️ Đã mở báo cáo Tuần ${report.weekNumber} (Tháng ${report.month}/${report.year}) để hiệu chỉnh!`, 
      type: "success" 
    })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const handleDeleteReport = async (rptId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa báo cáo này không?")) return
    const res = await deleteWeeklyReport(rptId)
    if (res.success) {
      setToastMsg({ msg: "🗑️ Đã xóa báo cáo thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      loadHistory()
    } else alert("Lỗi: " + res.error)
  }

  // Row Manipulation helpers
  const addRows = (count: number = 1) => {
    const newRows: ReportItem[] = Array.from({ length: count }, () => ({
      mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: ""
    }))
    setItems(prev => [...prev, ...newRows])
  }

  const duplicateRow = (idx: number) => {
    const target = items[idx]
    if (!target) return
    const copy = { ...target, id: undefined }
    const next = [...items]
    next.splice(idx + 1, 0, copy)
    setItems(next)
  }

  const removeRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const clearEmptyRows = () => {
    const filtered = items.filter(i => i.mainTask.trim() || i.workContent.trim())
    setItems(filtered.length > 0 ? filtered : [{ mainTask: "", workContent: "", progress: "NOT_STARTED", proposedSolution: "" }])
  }

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleSave = async () => {
    const activeItems = items.filter(i => i.mainTask.trim() || i.workContent.trim())
    if (activeItems.length === 0) return alert("Vui lòng nhập ít nhất 1 công việc!")
    
    setSaving(true)
    const res = await saveWeeklyReport({ 
      weekNumber: selectedWeek, 
      month, 
      year, 
      academicYearId, 
      targetUserId: isAdmin ? viewUserId : undefined,
      items: activeItems.map(i => ({ 
        mainTask: i.mainTask, 
        workContent: i.workContent, 
        progress: i.progress, 
        proposedSolution: i.proposedSolution 
      })) 
    })
    setSaving(false)
    if (res.success) { 
      setToastMsg({ msg: "✅ Báo cáo tuần đã được lưu thành công!", type: "success" })
      setTimeout(() => setToastMsg(null), 3000)
      loadReport() 
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSendReminder = async () => {
    setReminding(true)
    const res = await sendWeeklyReportEmailReminders(selectedWeek, month, year)
    setReminding(false)
    if (res.success) {
      setToastMsg({ 
        msg: `🔔 Đã gửi email nhắc nộp báo cáo cho ${res.remindedCount} nhân viên chưa nộp!`, 
        type: "success" 
      })
      setTimeout(() => setToastMsg(null), 4000)
    } else {
      alert("Lỗi: " + res.error)
    }
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

  // Export to Excel
  const exportToExcel = () => {
    if (consolidatedData.length === 0) return alert("Không có dữ liệu để xuất Excel!")
    const rows: any[] = []
    let stt = 1
    consolidatedData.forEach((report: any) => {
      report.items.forEach((item: any) => {
        rows.push({
          "STT": stt++,
          "Mã Email": report.user?.email || "",
          "Họ và Tên": report.user?.fullName || "",
          "Chức danh / Tổ": getRoleName(report.user?.role),
          "Task Chính": item.mainTask,
          "Nội Dung Công Việc": item.workContent,
          "Tiến Độ": PROGRESS.find(p => p.value === item.progress)?.label || item.progress,
          "Đề Xuất Giải Pháp": item.proposedSolution || "",
          "Nhận Xét Của QL": item.managerNote || ""
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `BaoCaoTuan_${selectedWeek}_${month}_${year}`)
    XLSX.writeFile(wb, `BaoCaoTuan_Tuan${selectedWeek}_Thang${month}_${year}.xlsx`)
  }

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historyReports
    const q = historySearch.toLowerCase()
    return historyReports.filter(r => 
      `tuần ${r.weekNumber}`.includes(q) ||
      `tháng ${r.month}`.includes(q) ||
      `${r.year}`.includes(q) ||
      r.items.some((i: any) => i.mainTask?.toLowerCase().includes(q) || i.workContent?.toLowerCase().includes(q))
    )
  }, [historyReports, historySearch])

  const maxWeeks = Math.max(...Object.values(chartData as Record<string, any>).map((u: any) => Math.max(...Object.keys(u.weeks || {}).map(Number), 0)), 0)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-top-4 duration-300 ${
          toastMsg.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-white" />
          <div className="flex-1">
            <p className="font-bold text-sm">Thông báo</p>
            <p className="text-xs opacity-95">{toastMsg.msg}</p>
          </div>
        </div>
      )}

      {/* Detail View Modal for History */}
      {viewingHistoryReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#36E08F]" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    Báo cáo Tuần {viewingHistoryReport.weekNumber} - Tháng {viewingHistoryReport.month}/{viewingHistoryReport.year}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người thực hiện: {viewingHistoryReport.user?.fullName || currentUserName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewingHistoryReport(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 font-extrabold uppercase">
                      <th className="p-3 text-center w-10">STT</th>
                      <th className="p-3 min-w-[140px]">Task chính</th>
                      <th className="p-3 min-w-[240px]">Nội dung công việc</th>
                      <th className="p-3 w-28">Tiến độ</th>
                      <th className="p-3 min-w-[180px]">Đề xuất giải pháp</th>
                      <th className="p-3 min-w-[180px]">Nhận xét QL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {viewingHistoryReport.items.map((item: any, idx: number) => {
                      const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-indigo-900">{item.mainTask}</td>
                          <td className="p-3 text-slate-700 leading-relaxed break-words">{item.workContent}</td>
                          <td className="p-3">
                            <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${prog.color}`}>
                              {prog.label}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 italic break-words">{item.proposedSolution || "-"}</td>
                          <td className="p-3 text-slate-700 break-words">{item.managerNote || "-"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {viewingHistoryReport.managerComment && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                  <p className="text-xs font-bold text-teal-800 mb-1">💬 Nhận xét chỉ đạo của Ban Quản Lý:</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{viewingHistoryReport.managerComment}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  const rpt = viewingHistoryReport
                  setViewingHistoryReport(null)
                  handleEditPastReport(rpt)
                }}
                className="bg-[#36E08F] hover:bg-[#007A72] text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-4 h-4" /> Hiệu chỉnh báo cáo này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Báo cáo Tuần Giáo viên & Nhân viên
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Lập báo cáo tuần, xem lại lịch sử, hiệu chỉnh linh hoạt, duyệt & tổng hợp toàn hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">


          {activeTab === "consolidated" && isAdmin && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm font-bold text-xs"
            >
              <Download className="w-4 h-4" /> Xuất Excel Tổng hợp
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 gap-1.5 flex-wrap">
        {[
          ...(isAdmin ? [{ key: "dashboard", label: "Dashboard Thống kê", icon: BarChart3 }] : []),
          ...(isAdmin ? [{ key: "consolidated", label: "Tổng hợp Toàn Hệ Thống", icon: Table2 }] : []),
          { key: "personal", label: "Lập & Hiệu chỉnh Báo cáo", icon: Edit3 },
          { key: "history", label: "📜 Lịch sử Báo cáo đã nộp", icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.key
                ? "bg-[#36E08F] text-white shadow-md"
                : "text-slate-500 hover:text-teal-700 hover:bg-teal-50/50"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar (For Personal, Consolidated, Dashboard) */}
      {activeTab !== "history" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tháng</label>
              <select
                value={month}
                onChange={e => setMonth(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-slate-50/50"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Năm</label>
              <select
                value={year}
                onChange={e => setYear(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-slate-50/50"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Năm học</label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-slate-50/50"
              >
                {(years || []).filter((y: any) => !y.isOff).map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tuần báo cáo</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(+e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-slate-50/50"
              >
                {weeks.map(w => (
                  <option key={w.weekNum} value={w.weekNum}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(activeTab === "personal" || activeTab === "history") && isAdmin && (
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#36E08F]" /> Chọn nhân viên để Lập / Xem / Hiệu chỉnh báo cáo
              </label>
              <select
                value={viewUserId}
                onChange={e => setViewUserId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-white text-indigo-900"
              >
                {Object.entries(groupedStaff).map(([roleName, users]) => (
                  <optgroup key={roleName} label={roleName}>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email}) - {roleName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {activeTab === "consolidated" && isAdmin && (
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#36E08F]" /> Lọc theo Tổ / Nhóm quyền
              </label>
              <select
                value={selectedRoleCode}
                onChange={e => setSelectedRoleCode(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-slate-50/50"
              >
                <option value="ALL">-- Tất cả bộ phận --</option>
                {(roles || []).map((r: any) => (
                  <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-[#36E08F] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* ============ HISTORY TAB ============ */}
          {activeTab === "history" && (
            <div className="space-y-5">
              {isAdmin && (
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#36E08F]" /> Xem Lịch sử Báo cáo của Nhân viên
                  </label>
                  <select
                    value={viewUserId}
                    onChange={e => setViewUserId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-white text-indigo-900"
                  >
                    {Object.entries(groupedStaff).map(([roleName, users]) => (
                      <optgroup key={roleName} label={roleName}>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.email}) - {roleName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <History className="w-5 h-5 text-[#36E08F]" /> Lịch sử Báo cáo Tuần đã gửi
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAdmin ? `Đang xem lịch sử của: ${staffUsers.find((u: any) => u.id === viewUserId)?.fullName || currentUserName}` : `Tổng cộng ${historyReports.length} báo cáo tuần đã lưu`}
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Tìm kiếm công việc, tuần..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#36E08F]"
                    />
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="font-bold">Không tìm thấy báo cáo tuần nào trong lịch sử</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHistory.map((rpt: any) => {
                      const completedCount = rpt.items.filter((i: any) => i.progress === "COMPLETED").length
                      const doingCount = rpt.items.filter((i: any) => i.progress === "DOING").length
                      const notCompCount = rpt.items.filter((i: any) => i.progress !== "COMPLETED" && i.progress !== "DOING").length

                      return (
                        <div 
                          key={rpt.id} 
                          className="bg-slate-50/70 border border-slate-200 rounded-3xl p-5 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="bg-amber-100 text-amber-900 border border-amber-200 font-extrabold px-3 py-1 rounded-full text-xs">
                                Tuần {rpt.weekNumber} (T{rpt.month}/{rpt.year})
                              </span>
                              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                rpt.status === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                {rpt.status === "REVIEWED" ? "✅ Đã duyệt" : "📝 Đã nộp"}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 font-medium">
                              Cập nhật lúc: {new Date(rpt.updatedAt || rpt.createdAt).toLocaleDateString("vi-VN")} {new Date(rpt.updatedAt || rpt.createdAt).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}
                            </div>

                            {/* Summary Progress Pills */}
                            <div className="flex items-center gap-2 text-[11px] flex-wrap font-bold pt-1">
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100">
                                ✓ {completedCount} hoàn thành
                              </span>
                              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                                ⏳ {doingCount} đang làm
                              </span>
                              {notCompCount > 0 && (
                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100">
                                  ! {notCompCount} chưa xong
                                </span>
                              )}
                            </div>

                            {/* First 2 items preview */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                              <div className="font-bold text-slate-700 border-b pb-1">Các công việc chính:</div>
                              {rpt.items.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="text-slate-600 truncate font-medium">
                                  • <span className="font-bold text-indigo-900">{item.mainTask}:</span> {item.workContent}
                                </div>
                              ))}
                              {rpt.items.length > 2 && (
                                <div className="text-[11px] text-slate-400 italic">
                                  + và {rpt.items.length - 2} công việc khác...
                                </div>
                              )}
                            </div>

                            {rpt.managerComment && (
                              <div className="bg-teal-50 border border-teal-100 p-2.5 rounded-2xl text-xs text-teal-900">
                                <span className="font-bold">Nhận xét QL:</span> {rpt.managerComment}
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                            <button
                              onClick={() => setViewingHistoryReport(rpt)}
                              className="text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-100 flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#36E08F]" /> Xem
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEditPastReport(rpt)}
                                className="bg-[#36E08F] hover:bg-[#007A72] text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Hiệu chỉnh
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteReport(rpt.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                  title="Xóa báo cáo này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ DASHBOARD TAB ============ */}
          {activeTab === "dashboard" && isAdmin && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Tổng đầu việc", value: stats.totalTasks, color: "from-slate-600 to-slate-800", icon: ClipboardList },
                  { label: "Hoàn thành", value: stats.completed, color: "from-emerald-600 to-emerald-800", icon: CheckCircle2 },
                  { label: "Đang thực hiện", value: stats.inProgress, color: "from-blue-600 to-blue-800", icon: Clock },
                  { label: "Chưa thực hiện", value: stats.pending, color: "from-amber-600 to-amber-800", icon: MinusCircle },
                  { label: "Trễ hạn", value: stats.overdue, color: "from-red-600 to-red-800", icon: AlertTriangle },
                ].map((s, i) => (
                  <div key={i} className={"bg-gradient-to-br " + s.color + " text-white rounded-3xl p-5 shadow-md space-y-1"}>
                    <div className="flex items-center justify-between"><s.icon className="w-5 h-5 opacity-80" /></div>
                    <div className="text-3xl font-black">{s.value}</div>
                    <div className="text-xs font-bold opacity-90">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart Bars */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#36E08F]" />
                  <h3 className="text-base font-extrabold text-slate-800">
                    Tiến độ thực hiện công việc từng tuần - Tháng {month}/{year}
                  </h3>
                </div>

                <div className="pt-2">
                  {Object.keys(chartData).length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="font-bold">Chưa có dữ liệu báo cáo tuần</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-4 justify-center text-xs font-bold">
                        {PROGRESS.map(p => (
                          <div key={p.value} className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-md" style={{ background: p.barColor }} />
                            <span className="text-slate-600">{p.label}</span>
                          </div>
                        ))}
                      </div>

                      {Object.entries(chartData).map(([uid, userData]: any) => (
                        <div key={uid} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div className="font-extrabold text-xs text-indigo-900 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-[#36E08F]" />
                            {userData.name}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {Array.from({ length: Math.max(maxWeeks, weeks.length) }, (_, i) => i + 1).map(wk => {
                              const wData = userData.weeks?.[wk]
                              const total = wData?.total || 0
                              return (
                                <div key={wk} className="text-center bg-white p-2.5 rounded-xl border border-slate-100">
                                  <div className="text-[10px] text-slate-400 font-extrabold mb-1">Tuần {wk}</div>
                                  {total > 0 ? (
                                    <div className="flex h-20 items-end justify-center gap-1 py-1">
                                      {[
                                        { count: wData.completed, color: "#10b981" },
                                        { count: wData.doing, color: "#3b82f6" },
                                        { count: wData.notCompleted, color: "#f59e0b" },
                                      ].map((bar, bi) => (
                                        <div 
                                          key={bi} 
                                          className="w-3.5 rounded-t-md transition-all" 
                                          style={{ height: Math.max((bar.count / total) * 64, bar.count > 0 ? 6 : 0) + "px", background: bar.color, opacity: bar.count > 0 ? 1 : 0.15 }}
                                          title={bar.count + " mục"} 
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-20 flex items-end justify-center pb-2">
                                      <span className="text-[10px] text-slate-300 font-bold">Chưa nộp</span>
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-500 font-bold">{total} công việc</div>
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
            </div>
          )}

          {/* ============ CONSOLIDATED TAB ============ */}
          {activeTab === "consolidated" && isAdmin && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-[#36E08F]" /> Tổng hợp báo cáo Tuần {selectedWeek} - Tháng {month}/{year}
                </h3>
                <span className="text-xs bg-teal-50 text-[#36E08F] font-extrabold px-3 py-1 rounded-full border border-teal-100">
                  {consolidatedData.length} báo cáo đã nộp
                </span>
              </div>

              <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse table-fixed min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                      <th className="p-3 text-center w-[5%] whitespace-nowrap">STT</th>
                      <th className="p-3 whitespace-nowrap w-[11%]">Mã NV</th>
                      <th className="p-3 whitespace-nowrap w-[14%]">Họ và Tên</th>
                      <th className="p-3 whitespace-normal break-words w-[18%]">Task chính</th>
                      <th className="p-3 whitespace-normal break-words w-[28%]">Nội dung công việc</th>
                      <th className="p-3 whitespace-nowrap w-[10%]">Tiến độ</th>
                      <th className="p-3 whitespace-normal break-words w-[12%]">Đề xuất giải pháp</th>
                      <th className="p-3 whitespace-normal break-words w-[12%]">Nhận xét QL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {consolidatedData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Table2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="font-bold">Chưa có nhân viên nào nộp báo cáo cho tuần này</p>
                        </td>
                      </tr>
                    )}
                    {(() => {
                      let stt = 0
                      return consolidatedData.flatMap((report: any) =>
                        report.items.map((item: any, idx: number) => {
                          stt++
                          const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                          const isFirst = idx === 0
                          return (
                            <tr key={item.id || stt} className={`hover:bg-slate-50 transition-colors ${isFirst && stt > 1 ? "border-t-2 border-slate-200" : ""}`}>
                              <td className="p-3 text-center text-slate-400 font-bold whitespace-nowrap">{stt}</td>
                              <td className="p-3 whitespace-nowrap">
                                {isFirst && <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">{report.user?.email}</span>}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {isFirst && <span className="font-bold text-slate-800">{report.user?.fullName}</span>}
                              </td>
                              <td className="p-3 font-bold text-indigo-900 whitespace-normal break-words align-top">{item.mainTask}</td>
                              <td className="p-3 whitespace-normal break-words leading-relaxed text-slate-700 align-top">{item.workContent}</td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${prog.color}`}>
                                  {prog.label}
                                </span>
                              </td>
                              <td className="p-3 whitespace-normal break-words text-slate-500 italic min-w-[160px]">{item.proposedSolution || "-"}</td>
                              <td className="p-3 whitespace-normal break-words min-w-[160px]">
                                {item.managerNote ? (
                                  <span className="text-xs text-indigo-700 bg-teal-50 border border-teal-100 p-2 rounded-xl block font-medium">{item.managerNote}</span>
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

          {/* ============ PERSONAL / EDIT TAB ============ */}
          {activeTab === "personal" && (
            <div className="space-y-5">
              {/* Week Banner & Status Header */}
              {weeks.find(w => w.weekNum === selectedWeek) && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-5 shadow-lg border border-amber-400 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base">
                        {weeks.find(w => w.weekNum === selectedWeek)?.label}
                      </h3>
                      <p className="text-xs text-amber-100 mt-0.5">
                        {isAdmin ? `Đang xem/chỉnh sửa báo cáo cho: ${staffUsers.find((u: any) => u.id === viewUserId)?.fullName || currentUserName}` : `Người thực hiện: ${currentUserName}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {reportStatus ? (
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full shadow-sm ${
                        reportStatus === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-white text-amber-900"
                      }`}>
                        {reportStatus === "REVIEWED" ? "✅ Đã duyệt" : "📝 Đã nộp"}
                      </span>
                    ) : (
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Chưa nộp
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Row Expansion Toolbar */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Thêm dòng nhanh:</span>
                  <button
                    onClick={() => addRows(1)}
                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> +1 Dòng
                  </button>
                  <button
                    onClick={() => addRows(3)}
                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> +3 Dòng
                  </button>
                  <button
                    onClick={() => addRows(5)}
                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> +5 Dòng
                  </button>
                  <button
                    onClick={clearEmptyRows}
                    className="text-xs text-slate-500 hover:text-slate-700 font-bold px-3 py-1.5 rounded-xl border hover:bg-slate-50"
                  >
                    Xóa các dòng trống
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Tổng cộng {items.length} dòng</span>
                </div>
              </div>

              {/* Weekly Report Form Table */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-xs border-collapse table-fixed min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                        <th className="p-3 text-center w-[5%] whitespace-nowrap">STT</th>
                        <th className="p-3 whitespace-normal break-words w-[18%]">Task chính *</th>
                        <th className="p-3 whitespace-normal break-words w-[32%]">Nội dung công việc *</th>
                        <th className="p-3 whitespace-nowrap w-[12%]">Tiến độ *</th>
                        <th className="p-3 whitespace-normal break-words w-[13%]">Đề xuất giải pháp</th>
                        <th className="p-3 whitespace-normal break-words w-[14%]">Nhận xét QL</th>
                        <th className="p-3 text-center whitespace-nowrap w-[6%]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="font-bold">Báo cáo chưa có dòng công việc nào</p>
                            <button onClick={() => addRows(3)} className="mt-2 text-[#36E08F] font-bold text-xs hover:underline">
                              + Bấm vào đây để thêm 3 dòng ngay
                            </button>
                          </td>
                        </tr>
                      )}
                      {items.map((item, i) => {
                        const prog = PROGRESS.find(p => p.value === item.progress) || PROGRESS[0]
                        return (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-bold whitespace-nowrap">{i + 1}</td>

                            {/* Task chính */}
                            <td className="p-3 whitespace-normal break-words align-top">
                              <textarea
                                value={item.mainTask}
                                onChange={e => updateItem(i, "mainTask", e.target.value)}
                                rows={2}
                                placeholder="Tên Task chính..."
                                className="w-full border border-slate-200 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#36E08F] bg-white text-indigo-900 resize-none leading-snug"
                              />
                            </td>

                            {/* Nội dung công việc (Multiline) */}
                            <td className="p-3 whitespace-normal break-words align-top">
                              <textarea
                                value={item.workContent}
                                onChange={e => updateItem(i, "workContent", e.target.value)}
                                rows={2}
                                placeholder="Chi tiết công việc đã thực hiện..."
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#36E08F] resize-none leading-relaxed bg-white"
                              />
                            </td>

                            {/* Tiến độ */}
                            <td className="p-3 whitespace-nowrap">
                              <select
                                value={item.progress}
                                onChange={e => updateItem(i, "progress", e.target.value)}
                                className={`w-full border rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer ${prog.color}`}
                              >
                                {PROGRESS.map(p => (
                                  <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* Đề xuất giải pháp (Multiline) */}
                            <td className="p-3 whitespace-normal min-w-[160px]">
                              <textarea
                                value={item.proposedSolution}
                                onChange={e => updateItem(i, "proposedSolution", e.target.value)}
                                rows={2}
                                placeholder="Nhập đề xuất, kiến nghị..."
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#36E08F] resize-none leading-relaxed bg-white"
                              />
                            </td>

                            {/* Nhận xét Quản lý */}
                            <td className="p-3 whitespace-normal min-w-[160px]">
                              {isAdmin ? (
                                editingItemNote === (item.id || String(i)) ? (
                                  <div className="flex flex-col gap-1.5">
                                    <textarea
                                      value={itemNoteText}
                                      onChange={e => setItemNoteText(e.target.value)}
                                      rows={2}
                                      placeholder="Viết nhận xét của QL..."
                                      className="w-full border border-slate-200 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-[#36E08F] bg-white resize-none"
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <button onClick={() => setEditingItemNote(null)} className="text-[11px] text-slate-500 px-2 py-1 rounded-lg border">Hủy</button>
                                      <button onClick={() => item.id && handleItemNote(item.id)} className="text-[11px] bg-[#36E08F] text-white px-2 py-1 rounded-lg font-bold">Lưu</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => { setEditingItemNote(item.id || String(i)); setItemNoteText(item.managerNote || "") }}
                                    className="cursor-pointer group"
                                  >
                                    {item.managerNote ? (
                                      <span className="text-xs text-indigo-800 bg-teal-50 border border-teal-100 p-2 rounded-xl block font-medium">{item.managerNote}</span>
                                    ) : (
                                      <span className="text-xs text-slate-400 group-hover:text-[#36E08F] italic font-bold">+ Nhấn để ghi nhận xét...</span>
                                    )}
                                  </div>
                                )
                              ) : (
                                item.managerNote ? (
                                  <span className="text-xs text-indigo-800 bg-teal-50 border border-teal-100 p-2 rounded-xl block font-medium">{item.managerNote}</span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Chưa có</span>
                                )
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => duplicateRow(i)}
                                  title="Nhân bản dòng"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeRow(i)}
                                  title="Xóa dòng này"
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Form Action Controls */}
                <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addRows(1)}
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-amber-600" /> Thêm 1 dòng
                    </button>
                    <button
                      onClick={() => addRows(3)}
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-amber-600" /> Thêm 3 dòng
                    </button>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-amber-600 to-amber-700 text-white font-extrabold px-8 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:opacity-95 disabled:opacity-50 transition-all"
                  >
                    <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : isAdmin ? "Lưu Báo Cáo Cho Nhân Viên" : "Lưu / Hiệu Chỉnh Báo Cáo"}
                  </button>
                </div>
              </div>

              {/* Overall Manager Comment Section */}
              {managerComment && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-3xl p-5 space-y-1">
                  <div className="flex items-center gap-2 text-[#36E08F]">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-extrabold">Nhận xét tổng thể của Ban Quản Lý</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-7">{managerComment}</p>
                </div>
              )}

              {isAdmin && reportId && (
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#36E08F]" /> Thêm nhận xét tổng thể cho Báo cáo này
                  </h3>
                  <textarea
                    value={mgmtComment}
                    onChange={e => setMgmtComment(e.target.value)}
                    rows={3}
                    placeholder="Nhập nhận xét chỉ đạo chung..."
                    className="w-full border border-slate-200 rounded-2xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#36E08F] resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleManagerComment(reportId)}
                      className="flex items-center gap-2 bg-[#36E08F] text-white px-5 py-2 rounded-xl hover:bg-[#007A72] text-xs font-bold shadow-sm"
                    >
                      <Send className="w-4 h-4" /> Gửi nhận xét
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
