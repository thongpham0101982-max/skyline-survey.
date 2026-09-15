// @ts-nocheck
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search, RefreshCw, Download, Filter, CheckCircle2, Clock,
  AlertCircle, ChevronRight, User, BookOpen, ExternalLink, X,
  GraduationCap, Building2, BarChart2, Check, ArrowUpDown,
  Lock, Unlock, Bell, Send, Mail, CheckSquare, Square, ShieldAlert,
  Calendar
} from "lucide-react"
import * as XLSX from "xlsx"

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

interface Props {
  academicYears: any[]
  selectedYearId: string
  campuses: any[]
  classes: any[]
  subjects: any[]
  onNavigateToGradebook?: (params: {
    campusId: string
    grade: string
    classId: string
    subjectId: string
    period: string
  }) => void
}

export function GradeProgressTab({
  academicYears,
  selectedYearId,
  campuses = [],
  classes = [],
  subjects = [],
  onNavigateToGradebook
}: Props) {
  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState("KSĐN")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedLockFilter, setSelectedLockFilter] = useState("ALL")
  const [scope, setScope] = useState<"SURVEY" | "ALL_ASSIGNED">("SURVEY")
  const [searchTerm, setSearchTerm] = useState("")

  // Data states
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [isPeriodLocked, setIsPeriodLocked] = useState(false)
  const [periodLockInfo, setPeriodLockInfo] = useState<any>(null)
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    completedCount: 0,
    inProgressCount: 0,
    notStartedCount: 0,
    noStudentsCount: 0,
    overallRate: 0,
    totalGradedStudents: 0,
    totalExpectedStudents: 0,
    lockedCount: 0,
    unlockedCount: 0,
    remindedTotal: 0
  })

  // Selection states for batch actions
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set())

  // Modal detail states
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  // Modal Reminder states
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderTargets, setReminderTargets] = useState<any[]>([])
  const [reminderMessage, setReminderMessage] = useState("")
  const [sendEmailOption, setSendEmailOption] = useState(true)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderResult, setReminderResult] = useState<any>(null)

  // Locking processing state
  const [processingLock, setProcessingLock] = useState(false)

  // Fetch progress data
  const fetchProgress = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        campusId: selectedCampusId,
        grade: selectedGrade,
        status: selectedStatus,
        search: searchTerm,
        scope
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.items || [])
        setIsPeriodLocked(Boolean(data.isPeriodLocked))
        setPeriodLockInfo(data.periodLockInfo || null)
        setSummary(data.summary || {
          totalAssignments: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          noStudentsCount: 0,
          overallRate: 0,
          totalGradedStudents: 0,
          totalExpectedStudents: 0,
          lockedCount: 0,
          unlockedCount: 0,
          remindedTotal: 0
        })
      }
    } catch (err) {
      console.error("Lỗi tải tiến độ nhập điểm:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
    setSelectedRowKeys(new Set())
  }, [selectedYearId, selectedPeriod, selectedCampusId, selectedGrade, selectedStatus, scope])

  // Handle live search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProgress()
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Filter items based on lock filter client-side
  const displayedItems = useMemo(() => {
    if (selectedLockFilter === "LOCKED") {
      return items.filter(it => it.isLocked)
    }
    if (selectedLockFilter === "UNLOCKED") {
      return items.filter(it => !it.isLocked)
    }
    return items
  }, [items, selectedLockFilter])

  // Selection handlers
  const handleToggleSelectRow = (key: string) => {
    const newSet = new Set(selectedRowKeys)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedRowKeys(newSet)
  }

  const handleSelectAll = () => {
    if (selectedRowKeys.size === displayedItems.length && displayedItems.length > 0) {
      setSelectedRowKeys(new Set())
    } else {
      const allKeys = new Set(displayedItems.map(it => `${it.classId}_${it.subjectId}`))
      setSelectedRowKeys(allKeys)
    }
  }

  // Lock / Unlock individual class+subject
  const handleToggleLockItem = async (item: any) => {
    const newLockState = !item.isLocked
    const actionText = newLockState ? "Khóa sổ điểm" : "Mở khóa sổ điểm"
    const confirmMsg = `Bạn có chắc chắn muốn ${actionText} môn "${item.subjectName}" của lớp "${item.className}" (Kỳ ${item.evaluationPeriod})?\n\n${newLockState ? "Sau khi khóa, giáo viên sẽ không thể chỉnh sửa điểm." : "Sau khi mở khóa, giáo viên có thể tiếp tục nhập điểm."}`
    
    if (!confirm(confirmMsg)) return

    try {
      setProcessingLock(true)
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: item.evaluationPeriod || selectedPeriod,
          classId: item.classId,
          subjectId: item.subjectId,
          isLocked: newLockState,
          lockReason: newLockState ? `Khóa thủ công bởi Khảo thí & ĐBCL` : ""
        })
      })

      const data = await res.json()
      if (data.success) {
        await fetchProgress()
      } else {
        alert("Lỗi cập nhật trạng thái khóa sổ: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setProcessingLock(false)
    }
  }

  // Batch Lock / Unlock selected items
  const handleBatchLock = async (lockState: boolean) => {
    if (selectedRowKeys.size === 0) {
      alert("Vui lòng chọn ít nhất một phân công để thao tác!")
      return
    }

    const actionText = lockState ? "Khóa sổ điểm" : "Mở khóa sổ điểm"
    const confirmMsg = `Bạn có chắc chắn muốn ${actionText} cho ${selectedRowKeys.size} phân công đã chọn trong Kỳ ${selectedPeriod}?`
    if (!confirm(confirmMsg)) return

    try {
      setProcessingLock(true)
      const batchItems = Array.from(selectedRowKeys).map(key => {
        const [classId, subjectId] = key.split("_")
        return { classId, subjectId }
      })

      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          isLocked: lockState,
          batchItems,
          lockReason: lockState ? "Khóa hàng loạt bởi Khảo thí & ĐBCL" : ""
        })
      })

      const data = await res.json()
      if (data.success) {
        alert(`Đã ${actionText.toLowerCase()} thành công cho ${batchItems.length} phân công!`)
        setSelectedRowKeys(new Set())
        await fetchProgress()
      } else {
        alert("Lỗi: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setProcessingLock(false)
    }
  }

  // Lock / Unlock entire evaluation period
  const handleTogglePeriodLock = async () => {
    if (selectedPeriod === "ALL") {
      alert("Vui lòng chọn một Kỳ khảo sát cụ thể (ví dụ: KSĐN, GK1, CK1...) để khóa toàn kỳ!")
      return
    }

    const newLockState = !isPeriodLocked
    const actionText = newLockState ? "Khóa sổ TOÀN KỲ" : "Mở khóa TOÀN KỲ"
    const confirmMsg = `⚠️ XÁC NHẬN: Bạn có chắc chắn muốn ${actionText} cho Kỳ "${selectedPeriod}"?\n\n${newLockState ? "Khi khóa toàn kỳ, TẤT CẢ các môn học và lớp trong kỳ này sẽ bị khóa nhập điểm." : "Khi mở khóa toàn kỳ, các lớp chưa bị khóa riêng lẻ sẽ được phép nhập điểm lại."}`
    
    if (!confirm(confirmMsg)) return

    try {
      setProcessingLock(true)
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          classId: "ALL",
          subjectId: "ALL",
          isLocked: newLockState,
          lockReason: newLockState ? `Khóa toàn bộ kỳ ${selectedPeriod} bởi Khảo thí & ĐBCL` : ""
        })
      })

      const data = await res.json()
      if (data.success) {
        alert(`Đã ${actionText.toLowerCase()} thành công cho Kỳ ${selectedPeriod}!`)
        await fetchProgress()
      } else {
        alert("Lỗi: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setProcessingLock(false)
    }
  }

  // Open Reminder Modal for a single item
  const handleOpenSingleReminder = (item: any) => {
    setReminderTargets([item])
    setReminderMessage("")
    setReminderResult(null)
    setReminderModalOpen(true)
  }

  // Open Reminder Modal for batch (either selected rows or all incomplete)
  const handleOpenBatchReminder = (mode: "SELECTED" | "ALL_INCOMPLETE") => {
    let targets: any[] = []
    if (mode === "SELECTED") {
      if (selectedRowKeys.size === 0) {
        alert("Vui lòng tích chọn các lớp cần nhắc nhở!")
        return
      }
      targets = items.filter(it => selectedRowKeys.has(`${it.classId}_${it.subjectId}`))
    } else {
      targets = items.filter(it => it.status !== "COMPLETED" && it.totalStudents > 0)
      if (targets.length === 0) {
        alert("Tất cả các lớp trong bộ lọc hiện tại đã hoàn thành 100%! Không cần gửi nhắc nhở.")
        return
      }
    }

    setReminderTargets(targets)
    setReminderMessage("")
    setReminderResult(null)
    setReminderModalOpen(true)
  }

  // Send Reminder action
  const handleSendReminders = async () => {
    if (reminderTargets.length === 0) return

    try {
      setSendingReminder(true)
      setReminderResult(null)

      const reminderPayload = reminderTargets.map(it => ({
        classId: it.classId,
        className: it.className,
        subjectId: it.subjectId,
        subjectName: it.subjectName,
        teacherId: it.teacherId,
        teacherName: it.teacherName,
        recipientEmail: it.teacherEmail || ""
      }))

      const res = await fetch("/api/admin/ktdbcl/grade-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          reminders: reminderPayload,
          sendEmail: sendEmailOption,
          customMessage: reminderMessage
        })
      })

      const data = await res.json()
      if (data.success) {
        setReminderResult(data)
        await fetchProgress()
      } else {
        alert("Lỗi gửi nhắc nhở: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSendingReminder(false)
    }
  }

  // Open detail modal for a specific class + subject
  const handleOpenDetail = async (item: any) => {
    try {
      setDetailModalOpen(true)
      setLoadingDetail(true)
      setDetailData(null)

      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: item.evaluationPeriod || selectedPeriod,
        detailClassId: item.classId,
        detailSubjectId: item.subjectId
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setDetailData(data)
      } else {
        alert("Lỗi tải chi tiết: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Quick jump to Tab 2 (Sổ điểm)
  const handleJumpToGradebook = (item: any) => {
    if (onNavigateToGradebook) {
      onNavigateToGradebook({
        campusId: item.campusId || "ALL",
        grade: item.grade ? `Khối ${item.grade.replace(/\D/g, "") || item.grade}` : "ALL",
        classId: item.classId,
        subjectId: item.subjectId,
        period: item.evaluationPeriod || selectedPeriod
      })
    }
  }

  // Export Excel report
  const handleExportExcel = () => {
    if (displayedItems.length === 0) {
      alert("Không có dữ liệu để xuất báo cáo!")
      return
    }

    const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"
    const periodName = EVAL_PERIODS.find(p => p.code === selectedPeriod)?.name || selectedPeriod

    const excelRows = displayedItems.map((it, idx) => ({
      "STT": idx + 1,
      "Cơ sở": it.campusName,
      "Khối": it.grade ? `Khối ${it.grade}` : "",
      "Lớp học": it.className,
      "Môn học": `${it.subjectName} (${it.subjectCode})`,
      "Mã GV": it.teacherCode || "",
      "Giáo viên phân công": it.teacherName,
      "Email GV": it.teacherEmail || "",
      "Kỳ khảo sát": it.evaluationPeriod,
      "Sĩ số": it.totalStudents,
      "Đã nhập điểm": it.gradedCount,
      "Tỷ lệ hoàn thành (%)": `${it.completionRate}%`,
      "Tình trạng": it.status === "COMPLETED" ? "Đã hoàn thành" : it.status === "IN_PROGRESS" ? "Đang nhập" : it.status === "NO_STUDENTS" ? "Chưa có HS" : "Chưa nhập",
      "Khóa sổ": it.isLocked ? "ĐÃ KHÓA" : "ĐANG MỞ",
      "Khóa bởi": it.lockedBy || "",
      "Thời điểm khóa": it.lockedAt ? new Date(it.lockedAt).toLocaleString("vi-VN") : "",
      "Số lần nhắc nhở": it.reminderCount || 0,
      "Nhắc gần nhất": it.lastRemindedAt ? new Date(it.lastRemindedAt).toLocaleString("vi-VN") : "",
      "Điểm TB tạm tính": it.avgScore !== null ? it.avgScore : "",
      "Cập nhật lần cuối": it.lastUpdated ? new Date(it.lastUpdated).toLocaleString("vi-VN") : "Chưa có"
    }))

    const ws = XLSX.utils.json_to_sheet(excelRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Tien_Do_Nhap_Diem")
    XLSX.writeFile(wb, `Bao_Cao_Tien_Do_Nhap_Diem_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. THANH TIÊU ĐỀ & NÚT HÀNH ĐỘNG HỆ THỐNG */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#005B58] border border-teal-200 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Đảm bảo chất lượng & Khảo thí
            </span>
            <span className="text-xs font-semibold text-slate-500">[{currentYearName}]</span>
            {isPeriodLocked && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1 animate-pulse">
                <Lock className="w-3.5 h-3.5" />
                ĐÃ KHÓA SỔ TOÀN KỲ {selectedPeriod}
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
            Thống kê Tiến độ, Nhắc nhở & Khóa Sổ Điểm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tỷ lệ chấm điểm của giáo viên, gửi email nhắc nhở tự động và thực hiện khóa sổ điểm theo kỳ hoặc từng môn học.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Nút Khóa / Mở khóa Toàn kỳ */}
          {selectedPeriod !== "ALL" && (
            <button
              onClick={handleTogglePeriodLock}
              disabled={processingLock || loading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm hover:shadow ${
                isPeriodLocked
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
              title={isPeriodLocked ? "Mở khóa để cho phép giáo viên nhập điểm" : "Khóa toàn bộ sổ điểm của kỳ này"}
            >
              {isPeriodLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isPeriodLocked ? `Mở khóa Toàn kỳ (${selectedPeriod})` : `Khóa sổ Toàn kỳ (${selectedPeriod})`}</span>
            </button>
          )}

          {/* Nút Nhắc nhở hàng loạt các lớp chưa xong */}
          <button
            onClick={() => handleOpenBatchReminder("ALL_INCOMPLETE")}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
            title="Gửi email nhắc nhở tới tất cả giáo viên chưa hoàn thành chấm điểm"
          >
            <Bell className="w-3.5 h-3.5" />
            Nhắc nhở chưa xong ({summary.notStartedCount + summary.inProgressCount})
          </button>

          <button
            onClick={fetchProgress}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#005B58]" : ""}`} />
            Làm mới
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* 2. KHỐI KPI CARDS TỔNG HỢP */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        {/* Card 1: Tổng phân công */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng phân công</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005B58] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{summary.totalAssignments}</span>
            <span className="text-[11px] font-semibold text-slate-500">lớp-môn</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tổng HS: <strong className="text-slate-700">{summary.totalExpectedStudents.toLocaleString()}</strong>
          </div>
        </div>

        {/* Card 2: Hoàn thành 100% */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Hoàn thành 100%</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{summary.completedCount}</span>
            <span className="text-[11px] font-bold text-emerald-600">
              ({summary.totalAssignments > 0 ? Math.round((summary.completedCount / summary.totalAssignments) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1 font-medium">
            Đã nhập đủ toàn bộ HS
          </div>
        </div>

        {/* Card 3: Đang nhập */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Đang nhập (1-99%)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{summary.inProgressCount}</span>
            <span className="text-[11px] font-bold text-amber-600">lớp-môn</span>
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1 font-medium">
            Đang chấm dở dang
          </div>
        </div>

        {/* Card 4: Chưa nhập */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Chưa bắt đầu</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{summary.notStartedCount}</span>
            <span className="text-[11px] font-bold text-rose-600">lớp-môn</span>
          </div>
          <div className="text-[11px] text-rose-700/80 mt-1 font-medium">
            Chưa có con điểm nào
          </div>
        </div>

        {/* Card 5: Tình trạng Khóa sổ */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm relative overflow-hidden group bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">Tình trạng Khóa sổ</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{summary.lockedCount || 0}</span>
            <span className="text-[11px] font-bold text-purple-600">đã khóa</span>
          </div>
          <div className="text-[11px] text-purple-700/80 mt-1 font-medium">
            {summary.unlockedCount || 0} mục đang mở
          </div>
        </div>

        {/* Card 6: Tiến độ toàn trường */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Tiến độ toàn trường</span>
            <span className="text-sm font-black text-[#005B58]">{summary.overallRate}%</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-[#005B58] h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.overallRate}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex justify-between">
            <span>Đã có điểm:</span>
            <strong className="text-slate-800">{summary.totalGradedStudents.toLocaleString()} HS</strong>
          </div>
        </div>
      </div>

      {/* 3. THANH BỘ LỌC ĐA TIÊU CHÍ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-[#005B58]" />
            <span>Bộ lọc Thống kê</span>
          </div>

          {/* Scope Toggle: Môn theo kỳ vs Tất cả môn */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
            <button
              onClick={() => setScope("SURVEY")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                scope === "SURVEY"
                  ? "bg-white text-[#005B58] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⭐ Chỉ môn theo Kỳ khảo sát
            </button>
            <button
              onClick={() => setScope("ALL_ASSIGNED")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                scope === "ALL_ASSIGNED"
                  ? "bg-white text-[#005B58] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả phân công giảng dạy
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* 1. Kỳ khảo sát */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Học kỳ / Kỳ khảo sát:
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              {EVAL_PERIODS.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
              <option value="ALL">Tất cả kỳ</option>
            </select>
          </div>

          {/* 2. Cơ sở */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cơ sở:
            </label>
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {campuses.map(cp => (
                <option key={cp.id} value={cp.id}>{cp.campusName || cp.campusCode}</option>
              ))}
            </select>
          </div>

          {/* 3. Khối */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Khối:
            </label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả Khối</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 4. Tình trạng tiến độ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tiến độ nhập:
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả tiến độ</option>
              <option value="COMPLETED">🟢 Đã hoàn thành (100%)</option>
              <option value="IN_PROGRESS">🟡 Đang nhập (1-99%)</option>
              <option value="NOT_STARTED">🔴 Chưa nhập (0%)</option>
            </select>
          </div>

          {/* 5. Tình trạng Khóa sổ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Khóa sổ:
            </label>
            <select
              value={selectedLockFilter}
              onChange={e => setSelectedLockFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
            >
              <option value="ALL">Tất cả</option>
              <option value="LOCKED">🔒 Đã khóa</option>
              <option value="UNLOCKED">🔓 Đang mở</option>
            </select>
          </div>

          {/* 6. Tìm kiếm nhanh */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tìm nhanh:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên GV, lớp, môn..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#005B58] outline-none bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. THANH TÁC VỤ HÀNG LOẠT KHI CHỌN DÒNG */}
      {selectedRowKeys.size > 0 && (
        <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#005B58] text-white flex items-center justify-center text-xs font-extrabold">
              {selectedRowKeys.size}
            </span>
            <span className="text-xs font-bold text-teal-900">
              Đã chọn {selectedRowKeys.size} phân công
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBatchLock(true)}
              disabled={processingLock}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              Khóa các mục đã chọn
            </button>
            <button
              onClick={() => handleBatchLock(false)}
              disabled={processingLock}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              Mở khóa các mục đã chọn
            </button>
            <button
              onClick={() => handleOpenBatchReminder("SELECTED")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
              Gửi nhắc nhở các mục đã chọn
            </button>
            <button
              onClick={() => setSelectedRowKeys(new Set())}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* 5. BẢNG DANH SÁCH CHI TIẾT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-800">
              Danh sách Phân công & Tình trạng Khóa sổ
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
              {displayedItems.length} phân công
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 text-center w-8">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center text-slate-500 hover:text-slate-800"
                    title="Chọn tất cả"
                  >
                    {displayedItems.length > 0 && selectedRowKeys.size === displayedItems.length ? (
                      <CheckSquare className="w-4 h-4 text-[#005B58]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-center w-8">STT</th>
                <th className="py-3 px-3">Cơ sở & Khối</th>
                <th className="py-3 px-3">Lớp học</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Giáo viên phân công</th>
                <th className="py-3 px-3 text-center">Kỳ khảo sát</th>
                <th className="py-3 px-3 min-w-[150px]">Tiến độ nhập</th>
                <th className="py-3 px-3 text-center">Tình trạng</th>
                <th className="py-3 px-3 text-center">Khóa sổ</th>
                <th className="py-3 px-3 text-center">Nhắc nhở</th>
                <th className="py-3 px-3 text-center">Điểm TB</th>
                <th className="py-3 px-3 text-center min-w-[170px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                      <span className="font-medium">Đang tổng hợp tiến độ từ cơ sở dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy phân công nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item, idx) => {
                  const rowKey = `${item.classId}_${item.subjectId}`
                  const isSelected = selectedRowKeys.has(rowKey)

                  return (
                    <tr
                      key={`${item.classId}_${item.subjectId}_${item.evaluationPeriod}_${idx}`}
                      className={`transition-colors ${
                        isSelected ? "bg-teal-50/50" : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleSelectRow(rowKey)}
                          className="flex items-center justify-center text-slate-500 hover:text-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#005B58]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* STT */}
                      <td className="py-3 px-2 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Cơ sở & Khối */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.campusName}</span>
                          <span className="text-[11px] text-slate-500 font-medium">Khối {item.grade}</span>
                        </div>
                      </td>

                      {/* Lớp học */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                            {item.className}
                          </span>
                          <span className="text-[11px] text-slate-400">({item.totalStudents} HS)</span>
                        </div>
                      </td>

                      {/* Môn học */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{item.subjectName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.subjectCode}</span>
                        </div>
                      </td>

                      {/* Giáo viên phân công */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              {item.teacherName}
                            </div>
                            {item.teacherEmail && (
                              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={item.teacherEmail}>
                                {item.teacherEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kỳ khảo sát */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {item.evaluationPeriod}
                        </span>
                      </td>

                      {/* Tiến độ nhập */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-700">{item.gradedCount} / {item.totalStudents} HS</span>
                            <span className={item.completionRate === 100 ? "text-emerald-700 font-extrabold" : "text-slate-700"}>
                              {item.completionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.completionRate === 100
                                  ? "bg-emerald-500"
                                  : item.completionRate > 0
                                  ? "bg-amber-500"
                                  : "bg-slate-200"
                              }`}
                              style={{ width: `${item.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tình trạng */}
                      <td className="py-3 px-3 text-center">
                        {item.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Hoàn thành
                          </span>
                        ) : item.status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Đang nhập
                          </span>
                        ) : item.status === "NO_STUDENTS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                            Chưa có HS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertCircle className="w-3 h-3 text-rose-700" />
                            Chưa nhập
                          </span>
                        )}
                      </td>

                      {/* Khóa sổ (Badge) */}
                      <td className="py-3 px-3 text-center">
                        {item.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300" title={`Khóa bởi ${item.lockedBy || 'Hệ thống'}`}>
                            <Lock className="w-3 h-3 text-purple-700" />
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            Đang mở
                          </span>
                        )}
                      </td>

                      {/* Nhắc nhở */}
                      <td className="py-3 px-3 text-center">
                        {item.reminderCount > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                              <Bell className="w-2.5 h-2.5 text-indigo-600" />
                              {item.reminderCount} lần
                            </span>
                            {item.lastRemindedAt && (
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                {new Date(item.lastRemindedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Điểm TB */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {item.avgScore !== null ? (
                          <span className="text-teal-800 font-extrabold">{item.avgScore}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Nút Khóa / Mở khóa từng môn */}
                          <button
                            onClick={() => handleToggleLockItem(item)}
                            disabled={processingLock}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.isLocked
                                ? "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                            title={item.isLocked ? "Mở khóa sổ điểm môn này" : "Khóa sổ điểm môn này"}
                          >
                            {item.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Nút Nhắc nhở giáo viên */}
                          <button
                            onClick={() => handleOpenSingleReminder(item)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                            title="Gửi email nhắc nhở giáo viên"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Xem chi tiết */}
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors"
                            title="Xem chi tiết danh sách học sinh"
                          >
                            Chi tiết
                          </button>

                          {/* Nút Vào sổ */}
                          <button
                            onClick={() => handleJumpToGradebook(item)}
                            className="flex items-center gap-1 px-2 py-1 bg-[#005B58] hover:bg-[#004845] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            title="Chuyển sang màn hình Nhập sổ điểm"
                          >
                            <span>Vào sổ</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL NHẮC NHỞ NHẬP ĐIỂM (SINGLE & BATCH) */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    Gửi Thông Báo Nhắc Nhở Nhập Điểm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kỳ đánh giá: <strong className="text-indigo-600">{selectedPeriod}</strong> ({currentYearName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReminderModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Danh sách người nhận */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Danh sách giáo viên nhận thông báo ({reminderTargets.length} phân công):
                </label>
                <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {reminderTargets.map((t, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-800">{t.teacherName}</strong>
                        <span className="text-slate-500 ml-1.5">({t.className} - {t.subjectName})</span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {t.teacherEmail || <span className="text-amber-600">Chưa có email (sẽ lưu nhắc nhở hệ thống)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tùy chọn gửi email */}
              <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-indigo-950">Gửi Email tự động qua Office 365</div>
                    <div className="text-[11px] text-indigo-700">Hệ thống sẽ gửi email trực tiếp tới hòm thư của Thầy/Cô.</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendEmailOption}
                  onChange={e => setSendEmailOption(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>

              {/* Soạn nội dung bổ sung */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nội dung nhắc nhở / Lời dặn bổ sung (tùy chọn):
                </label>
                <textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={e => setReminderMessage(e.target.value)}
                  placeholder="Ví dụ: Kính đề nghị Thầy/Cô hoàn thành chấm điểm trước 17h00 ngày 20/09/2026 để Ban Khảo thí tổng hợp báo cáo BGH..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nếu để trống, hệ thống sẽ sử dụng mẫu thư chuẩn mực của Ban Khảo thí & ĐBCL Sky-Line.
                </p>
              </div>

              {/* Kết quả gửi */}
              {reminderResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã gửi nhắc nhở thành công cho {reminderResult.count} phân công!
                  </div>
                  {reminderResult.emailSuccessCount > 0 && (
                    <div>Đã gửi thành công {reminderResult.emailSuccessCount} email thông báo.</div>
                  )}
                  {reminderResult.emailFailCount > 0 && (
                    <div className="text-amber-700">Có {reminderResult.emailFailCount} email không gửi được (do thiếu địa chỉ email hợp lệ).</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReminderModalOpen(false)}
                disabled={sendingReminder}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {reminderResult ? "Đóng" : "Hủy bỏ"}
              </button>
              {!reminderResult && (
                <button
                  onClick={handleSendReminders}
                  disabled={sendingReminder || reminderTargets.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
                >
                  {sendingReminder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi nhắc nhở ngay ({reminderTargets.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XEM CHI TIẾT DANH SÁCH HỌC SINH CỦA LỚP */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-teal-100 text-[#005B58] rounded">
                    CHI TIẾT NHẬP ĐIỂM
                  </span>
                  {detailData?.isLocked && (
                    <span className="px-2 py-0.5 text-xs font-extrabold bg-purple-100 text-purple-800 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      ĐÃ KHÓA SỔ
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-base text-slate-800 mt-1">
                  {detailData?.subjectInfo?.subjectName} - Lớp {detailData?.classInfo?.className} ({detailData?.classInfo?.campusName})
                </h3>
                <p className="text-xs text-slate-500">
                  GV phân công: <strong className="text-slate-700">{detailData?.assignedTeacher || "Chưa phân công"}</strong> | Kỳ khảo sát: <strong className="text-teal-700">{detailData?.evaluationPeriod}</strong>
                </p>
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Danh sách học sinh */}
            <div className="overflow-y-auto flex-1 pr-1">
              {loadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                  <span>Đang tải danh sách học sinh...</span>
                </div>
              ) : !detailData || !detailData.students || detailData.students.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Lớp này chưa có học sinh nào trong cơ sở dữ liệu.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-600">
                    <span>
                      Đã có điểm: <strong className="text-emerald-700">{detailData.gradedStudents}</strong> / {detailData.totalStudents} HS
                    </span>
                    <span className="text-slate-500">
                      Tỷ lệ: {Math.round((detailData.gradedStudents / detailData.totalStudents) * 100)}%
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3">Mã HS</th>
                        <th className="py-2.5 px-3">Họ và tên học sinh</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        <th className="py-2.5 px-3 text-center">Điểm tổng kết</th>
                        <th className="py-2.5 px-3">Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailData.students.map((st: any, sIdx: number) => (
                        <tr key={st.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 text-center text-slate-400">{sIdx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{st.studentCode}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{st.studentName}</td>
                          <td className="py-2.5 px-3 text-center">
                            {st.hasGrade ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 text-emerald-700" />
                                Đã có điểm
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Chưa nhập
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {st.compositeScore !== null ? (
                              <span className="text-teal-800 font-extrabold">{st.compositeScore}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 italic">
                            {st.remark || <span className="text-slate-300">Chưa có</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 italic">
                Để chỉnh sửa trực tiếp, vui lòng bấm &quot;Mở màn hình Nhập sổ điểm&quot;
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Đóng
                </button>
                {detailData && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleJumpToGradebook({
                        campusId: detailData.classInfo?.campusId,
                        grade: detailData.classInfo?.grade,
                        classId: detailData.classInfo?.id,
                        subjectId: detailData.subjectInfo?.id,
                        evaluationPeriod: detailData.evaluationPeriod
                      })
                    }}
                    className="flex items-center gap-1 px-4 py-2 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span>Mở màn hình Nhập sổ điểm</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
