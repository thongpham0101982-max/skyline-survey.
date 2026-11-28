"use client"

import React, { useMemo, useState } from "react"
import {
  Compass,
  Plus,
  Search,
  FileSpreadsheet,
  Edit3,
  Clock,
  CheckCircle2,
  X,
  Calendar,
  BookOpen,
  ClipboardList,
  Sparkles,
  Eye,
  Send,
  AlertCircle,
  User
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "../academic-calendar"

export const isCareerIntensiveTarget = (t: any): boolean => {
  if (!t) return false
  if (t.supportType === "CAREER_INTENSIVE") return true
  if (t.sourceType === "CAREER_INTENSIVE" || t.sourceType === "HUONG_NGHIEP") return true
  const isAdmission =
    t.sourceType === "ADMISSION" ||
    Boolean(t.notes && String(t.notes).includes("Cam kết Khảo sát đầu vào"))
  if (isAdmission) return false
  const r = (t.reason || "").trim().toLowerCase()
  return r.includes("hướng nghiệp") || r.includes("huong nghiep")
}

const CAREER_CASE_GROUPS = [
  "Chọn ngành & trường Đại học",
  "Phân luồng sau THCS / THPT",
  "Lộ trình Du học / Liên kết quốc tế",
  "Băn khoăn đa ngành / Chưa rõ định hướng",
  "Định hướng theo năng lực & sở thích đặc thù",
  "Tư vấn kết hợp gia đình & nguyện vọng"
]

const CAREER_TOOLS = [
  "Holland (RIASEC)",
  "MBTI",
  "DISC",
  "Bảng so sánh ngành / trường",
  "Phỏng vấn tham vấn 1-1",
  "Trao đổi cùng PHHS"
]

const CAREER_TRACKING_LEVELS = [
  { value: "Đạt mục tiêu", label: "Đã chốt định hướng / Đạt mục tiêu" },
  { value: "Có tiến bộ", label: "Có tiến bộ rõ nét" },
  { value: "Duy trì", label: "Duy trì theo dõi" },
  { value: "Cần hỗ trợ ưu tiên", label: "Cần hỗ trợ ưu tiên / Can thiệp sâu" }
]

const parseCareerComment = (raw: string) => {
  const text = (raw || "").trim()
  if (!text) return { discussion: "", homework: "", tools: [] as string[] }

  let discussion = text
  let homework = ""
  let tools: string[] = []

  const toolsMatch = discussion.match(/(?:^|\n)Công cụ tham khảo:\s*([^\n]+)/i)
  if (toolsMatch) {
    tools = toolsMatch[1]
      .split(/[,;•]/)
      .map((s) => s.trim())
      .filter(Boolean)
    discussion = discussion.replace(toolsMatch[0], "").trim()
  }

  const hwMatch = discussion.match(/(?:^|\n)Nhiệm vụ sau buổi tư vấn:\s*([\s\S]*)$/i)
  if (hwMatch) {
    homework = hwMatch[1].trim()
    discussion = discussion.replace(hwMatch[0], "").trim()
  }

  return { discussion, homework, tools }
}

const getLevelBadgeClasses = (level: string) => {
  const l = (level || "").toLowerCase()
  if (l.includes("đạt") || l.includes("ổn định") || l.includes("chốt") || l.includes("hoàn thành")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
  if (l.includes("tiến bộ") || l.includes("cải thiện")) {
    return "bg-teal-50 text-[#00736E] border-teal-200"
  }
  if (l.includes("ưu tiên") || l.includes("chưa tiến") || l.includes("chuyên sâu") || l.includes("can thiệp")) {
    return "bg-rose-50 text-rose-700 border-rose-200"
  }
  return "bg-amber-50 text-amber-800 border-amber-200"
}

interface CareerIntensiveTrackingTabProps {
  targets: any[]
  assignedClasses: any[]
  academicYearId: string
  academicYearName: string
  teacher: any
  onRefresh: () => void
  onOpenStudentProfile: (studentId: string) => void
}

export function CareerIntensiveTrackingTab({
  targets,
  assignedClasses,
  academicYearId,
  academicYearName,
  teacher,
  onRefresh,
  onOpenStudentProfile
}: CareerIntensiveTrackingTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [classFilter, setClassFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "TERMINATED">("ALL")
  const [monthFilter, setMonthFilter] = useState("ALL")

  // Add new career case modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addClassId, setAddClassId] = useState("")
  const [addClassStudents, setAddClassStudents] = useState<any[]>([])
  const [loadingAddStudents, setLoadingAddStudents] = useState(false)
  const [addStudentSearch, setAddStudentSearch] = useState("")
  const [selectedAddStudentId, setSelectedAddStudentId] = useState("")
  const [selectedCaseGroup, setSelectedCaseGroup] = useState(CAREER_CASE_GROUPS[0])
  const [addNotes, setAddNotes] = useState("")
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Session log modal (create/edit consultation session)
  const [logTarget, setLogTarget] = useState<any | null>(null)
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null)
  const [periodType, setPeriodType] = useState<"WEEK" | "MONTH">("WEEK")
  const [selectedMonth, setSelectedMonth] = useState<string>("Tháng 10")
  const [selectedWeek, setSelectedWeek] = useState<string>("Tuần 1")
  const [trackingLevel, setTrackingLevel] = useState<string>("Duy trì")
  const [updatedStatus, setUpdatedStatus] = useState<string>("Tiếp tục theo dõi")
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [discussionText, setDiscussionText] = useState<string>("")
  const [homeworkText, setHomeworkText] = useState<string>("")
  const [savingLog, setSavingLog] = useState(false)

  // Timeline detail drawer/modal
  const [timelineTarget, setTimelineTarget] = useState<any | null>(null)

  const careerTargets = useMemo(() => {
    return (targets || []).filter(isCareerIntensiveTarget)
  }, [targets])

  const availableClasses = useMemo(() => {
    const map = new Map<string, string>()
    careerTargets.forEach((t: any) => {
      const cid = t.student?.classId || t.student?.class?.id
      const cname = t.student?.class?.className || t.student?.className
      if (cid && cname) map.set(cid, cname)
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [careerTargets])

  const filteredTargets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return careerTargets.filter((t: any) => {
      const isTerminated = t.terminationStatus === "TERMINATED"
      if (statusFilter === "ACTIVE" && isTerminated) return false
      if (statusFilter === "TERMINATED" && !isTerminated) return false

      if (classFilter !== "ALL") {
        const cid = t.student?.classId || t.student?.class?.id
        const cname = t.student?.class?.className || t.student?.className
        if (cid !== classFilter && cname !== classFilter) return false
      }

      if (monthFilter !== "ALL") {
        const hasMonth = (t.evaluations || []).some(
          (e: any) => e.periodName === monthFilter || (e.periodName && e.periodName.includes(monthFilter))
        )
        if (!hasMonth) return false
      }

      if (q) {
        const name = (t.student?.studentName || "").toLowerCase()
        const code = (t.student?.studentCode || "").toLowerCase()
        const cls = (t.student?.class?.className || "").toLowerCase()
        const notes = (t.notes || "").toLowerCase()
        const latestComment = (t.evaluations?.[0]?.comment || "").toLowerCase()
        if (!name.includes(q) && !code.includes(q) && !cls.includes(q) && !notes.includes(q) && !latestComment.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [careerTargets, searchQuery, classFilter, statusFilter, monthFilter])

  const stats = useMemo(() => {
    const total = careerTargets.length
    const terminated = careerTargets.filter((t: any) => t.terminationStatus === "TERMINATED").length
    const active = total - terminated
    const totalSessions = careerTargets.reduce((sum: number, t: any) => sum + (t.evaluations?.length || 0), 0)
    return { total, active, terminated, totalSessions }
  }, [careerTargets])

  const handleLoadStudentsForAdd = async (cid: string) => {
    setAddClassId(cid)
    setSelectedAddStudentId("")
    setAddClassStudents([])
    if (!cid) return
    setLoadingAddStudents(true)
    try {
      const res = await fetch(`/api/teacher-student-records?action=getClassStudents&classId=${cid}&_=${Date.now()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setAddClassStudents(data)
      }
    } catch {
      toast.error("Không thể tải danh sách học sinh của lớp")
    } finally {
      setLoadingAddStudents(false)
    }
  }

  const handleCreateCareerCase = async () => {
    if (!selectedAddStudentId) {
      toast.error("Vui lòng chọn học sinh cần theo dõi hướng nghiệp chuyên sâu")
      return
    }
    const alreadyExists = careerTargets.some((t: any) => t.studentId === selectedAddStudentId)
    if (alreadyExists) {
      toast.error("Học sinh này đã có trong Sổ theo dõi Hướng nghiệp chuyên sâu")
      return
    }

    setSubmittingAdd(true)
    try {
      const composedNotes = addNotes.trim()
        ? `[${selectedCaseGroup}] ${addNotes.trim()}`
        : `[${selectedCaseGroup}]`

      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTarget",
          academicYearId,
          studentId: selectedAddStudentId,
          supportType: "CAREER_INTENSIVE",
          sourceType: "HUONG_NGHIEP",
          reason: "Hướng nghiệp",
          notes: composedNotes,
          status: "Tiếp tục theo dõi"
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || "Không thể thêm ca Hướng nghiệp chuyên sâu")
        return
      }
      toast.success("Đã thêm học sinh vào Sổ theo dõi Hướng nghiệp chuyên sâu")
      setIsAddModalOpen(false)
      setAddClassId("")
      setSelectedAddStudentId("")
      setAddNotes("")
      onRefresh()
    } catch {
      toast.error("Lỗi kết nối khi lưu ca hướng nghiệp")
    } finally {
      setSubmittingAdd(false)
    }
  }

  const openSessionModal = (target: any, existingEval?: any) => {
    setLogTarget(target)
    if (existingEval) {
      setEditingEvalId(existingEval.id)
      const isWeek = existingEval.periodType === "WEEK" || (existingEval.periodName || "").includes("Tuần")
      setPeriodType(isWeek ? "WEEK" : "MONTH")
      const matchedMonth = ACADEMIC_MONTHS.find((m) => (existingEval.periodName || "").includes(m)) || "Tháng 10"
      setSelectedMonth(matchedMonth)
      const weekMatch = (existingEval.periodName || "").match(/Tuần\s*\d+/i)
      setSelectedWeek(weekMatch ? weekMatch[0] : "Tuần 1")
      setTrackingLevel(existingEval.trackingLevel || "Duy trì")
      setUpdatedStatus(existingEval.updatedStatus || target.status || "Tiếp tục theo dõi")
      const parsed = parseCareerComment(existingEval.comment || "")
      setDiscussionText(parsed.discussion)
      setHomeworkText(parsed.homework)
      setSelectedTools(parsed.tools)
    } else {
      setEditingEvalId(null)
      const nowMonth = `Tháng ${new Date().getMonth() + 1}`
      setPeriodType("WEEK")
      setSelectedMonth(ACADEMIC_MONTHS.includes(nowMonth) ? nowMonth : "Tháng 11")
      setSelectedWeek("Tuần 1")
      setTrackingLevel("Duy trì")
      setUpdatedStatus("Tiếp tục theo dõi")
      setDiscussionText("")
      setHomeworkText("")
      setSelectedTools([])
    }
  }

  const handleSaveSession = async () => {
    if (!logTarget) return
    if (!discussionText.trim()) {
      toast.error("Vui lòng nhập nội dung trao đổi & phân tích định hướng")
      return
    }

    const parts: string[] = [discussionText.trim()]
    if (selectedTools.length > 0) {
      parts.push(`Công cụ tham khảo: ${selectedTools.join(", ")}`)
    }
    if (homeworkText.trim()) {
      parts.push(`Nhiệm vụ sau buổi tư vấn:\n\n${homeworkText.trim()}`)
    }
    const finalComment = parts.join("\n\n")
    const periodName = periodType === "WEEK" ? `${selectedWeek} - ${selectedMonth}` : selectedMonth

    setSavingLog(true)
    try {
      const res = await fetch("/api/ktdbcl/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveEvaluation",
          id: editingEvalId || undefined,
          targetId: logTarget.id,
          academicYearId,
          periodType,
          periodName,
          trackingLevel,
          comment: finalComment,
          updatedStatus
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || "Lưu nhật ký tư vấn thất bại")
        return
      }
      toast.success(editingEvalId ? "Đã cập nhật buổi tư vấn hướng nghiệp" : "Đã ghi nhận buổi tư vấn hướng nghiệp mới")
      setLogTarget(null)
      setEditingEvalId(null)
      onRefresh()
    } catch {
      toast.error("Lỗi kết nối khi lưu nhật ký tư vấn")
    } finally {
      setSavingLog(false)
    }
  }

  const handleExportExcel = () => {
    if (filteredTargets.length === 0) {
      toast.error("Không có dữ liệu ca Hướng nghiệp chuyên sâu để xuất")
      return
    }

    const wb = XLSX.utils.book_new()
    const summaryRows = filteredTargets.map((t: any, idx: number) => {
      const evals = [...(t.evaluations || [])].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latest = evals[0]
      const parsed = parseCareerComment(latest?.comment || "")
      return {
        "TT": idx + 1,
        "Mã HS": t.student?.studentCode || "",
        "Họ và tên": t.student?.studentName || "",
        "Lớp": t.student?.class?.className || "",
        "Ngày tiếp nhận": t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "",
        "Nhóm ca / Ghi chú đầu vào": t.notes || "Hướng nghiệp chuyên sâu",
        "Số buổi tư vấn": evals.length,
        "Kỳ tư vấn gần nhất": latest?.periodName || "Chưa có",
        "Mức độ hiện tại": t.terminationStatus === "TERMINATED" ? (t.outcome || "Đã kết thúc") : (latest?.trackingLevel || "Đang theo dõi"),
        "Nội dung trao đổi gần nhất": parsed.discussion || "—",
        "Nhiệm vụ sau buổi tư vấn": parsed.homework || "—"
      }
    })

    const detailRows: any[] = []
    let rowIdx = 1
    filteredTargets.forEach((t: any) => {
      const evals = [...(t.evaluations || [])].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      evals.forEach((ev: any) => {
        const parsed = parseCareerComment(ev.comment || "")
        detailRows.push({
          "TT": rowIdx++,
          "Mã HS": t.student?.studentCode || "",
          "Họ và tên": t.student?.studentName || "",
          "Lớp": t.student?.class?.className || "",
          "Kỳ tư vấn": ev.periodName || "",
          "Ngày ghi nhận": ev.createdAt ? new Date(ev.createdAt).toLocaleDateString("vi-VN") : "",
          "Mức độ": ev.trackingLevel || "",
          "Công cụ tham khảo": parsed.tools.join(", "),
          "Nội dung trao đổi & phân tích": parsed.discussion,
          "Nhiệm vụ sau buổi tư vấn": parsed.homework,
          "Trạng thái cập nhật": ev.updatedStatus || ""
        })
      })
    })

    const ws1 = XLSX.utils.json_to_sheet(summaryRows)
    ws1["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
      { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 48 }, { wch: 42 }
    ]
    XLSX.utils.book_append_sheet(wb, ws1, "Danh_sach_Huong_nghiep")

    const ws2 = XLSX.utils.json_to_sheet(detailRows.length > 0 ? detailRows : [{ "Thông báo": "Chưa có nhật ký buổi tư vấn" }])
    ws2["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 18 },
      { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 52 }, { wch: 45 }, { wch: 20 }
    ]
    XLSX.utils.book_append_sheet(wb, ws2, "Nhat_ky_tu_van_chi_tiet")

    const tName = (teacher?.teacherName || "GV_TamLy").replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_").slice(0, 28)
    const fileName = `So_Huong_Nghiep_Chuyen_Sau_${tName}_${academicYearName.replace(/\s+/g, "_")}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success(`Đã xuất sổ Hướng nghiệp chuyên sâu: ${fileName}`)
  }

  const weeksForSelectedMonth = MONTH_WEEKS_CONFIG[selectedMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]

  const filteredAddStudents = useMemo(() => {
    const q = addStudentSearch.trim().toLowerCase()
    if (!q) return addClassStudents
    return addClassStudents.filter(
      (s: any) =>
        (s.studentName || "").toLowerCase().includes(q) ||
        (s.studentCode || "").toLowerCase().includes(q)
    )
  }, [addClassStudents, addStudentSearch])

  return (
    <div className="space-y-4">
      {/* Masthead & Unified Ledger Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#003B3A] text-white shrink-0">
              <Compass className="h-5 w-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#003B3A]">
                Sổ theo dõi Hướng nghiệp chuyên sâu
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Phân hệ chuyên biệt dành riêng cho Giáo viên Tâm lý / Tổ TLHN — theo dõi tiến trình tham vấn 1-1 và nhiệm vụ sau buổi tư vấn cho các trường hợp hướng nghiệp đặc thù.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#003B3A] hover:bg-[#002a29] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#5EEAD4]" />
              <span>Thêm ca hướng nghiệp đặc thù</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-white hover:bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#008B85]" />
              <span>Xuất sổ Excel</span>
            </button>
          </div>
        </div>

        {/* Unified Ledger Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] pt-4 tabular-nums">
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-slate-500">Tổng ca đặc thù</div>
            <div className="text-2xl font-bold text-[#003B3A] mt-0.5">{stats.total}</div>
          </div>
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-slate-500">Đang tham vấn & theo dõi</div>
            <div className="text-2xl font-bold text-[#008B85] mt-0.5">{stats.active}</div>
          </div>
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-slate-500">Đã chốt định hướng</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.terminated}</div>
          </div>
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-slate-500">Tổng buổi tư vấn đã ghi</div>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{stats.totalSessions}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, mã HS, lớp hoặc nội dung tư vấn..."
              className="w-full pl-8 pr-7 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008B85]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả lớp ({availableClasses.length})</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả các tháng</option>
            {ACADEMIC_MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Segmented Status Control */}
        <div className="inline-flex items-center bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "ACTIVE", label: "Đang theo dõi" },
            { key: "TERMINATED", label: "Đã kết thúc" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === item.key
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E2E8F0]">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-left text-teal-100 w-10">TT</th>
                <th className="py-3 px-3 text-left text-white">Học sinh</th>
                <th className="py-3 px-3 text-left text-teal-100">Lớp</th>
                <th className="py-3 px-3 text-left text-teal-100">Tiến trình buổi</th>
                <th className="py-3 px-3 text-left text-teal-100 min-w-[320px]">Tóm tắt tư vấn & Nhiệm vụ gần nhất</th>
                <th className="py-3 px-3 text-left text-[#5EEAD4]">Mức độ hiện tại</th>
                <th className="py-3 px-3 text-center text-white">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Compass className="h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">
                        Chưa có trường hợp hướng nghiệp đặc thù nào khớp bộ lọc
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Nhấn &ldquo;Thêm ca hướng nghiệp đặc thù&rdquo; để bắt đầu lập sổ theo dõi tư vấn 1-1.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTargets.map((t: any, idx: number) => {
                  const evals = [...(t.evaluations || [])].sort(
                    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )
                  const latest = evals[0]
                  const parsed = parseCareerComment(latest?.comment || "")
                  const isTerminated = t.terminationStatus === "TERMINATED"
                  const levelText = isTerminated ? (t.outcome || "Đã kết thúc") : (latest?.trackingLevel || "Đang theo dõi")
                  const startDateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "—"

                  return (
                    <tr key={t.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 text-slate-500 font-medium align-middle">{idx + 1}</td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile(t.studentId)}
                          className="font-bold text-[#003B3A] hover:underline text-left cursor-pointer block"
                        >
                          {t.student?.studentName || "—"}
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {t.student?.studentCode || "—"} • Tiếp nhận {startDateStr}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap align-middle">
                        {t.student?.class?.className || "—"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-middle">
                        <div className="font-bold text-[#003B3A]">{evals.length} buổi</div>
                        <div className="text-[11px] text-slate-500">
                          {latest ? latest.periodName : "Chưa ghi buổi nào"}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle max-w-md">
                        {t.notes && (
                          <div className="text-[11px] font-semibold text-[#00736E] mb-1 truncate" title={t.notes}>
                            {t.notes}
                          </div>
                        )}
                        {latest ? (
                          <div className="space-y-1">
                            <p className="text-slate-700 line-clamp-2 leading-relaxed">
                              {parsed.discussion || latest.comment}
                            </p>
                            {parsed.homework && (
                              <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-lg px-2 py-1 line-clamp-1">
                                <span className="font-semibold">Nhiệm vụ:</span> {parsed.homework}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có biên bản buổi tư vấn</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getLevelBadgeClasses(levelText)}`}>
                          {levelText}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center align-middle">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSessionModal(t)}
                            className="bg-[#003B3A] hover:bg-[#002a29] text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#5EEAD4]" />
                            <span>Ghi buổi tư vấn</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimelineTarget(t)}
                            className="bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] font-semibold py-1.5 px-2.5 rounded-lg text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Xem lịch sử tất cả buổi tư vấn"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#008B85]" />
                            <span>Tiến trình</span>
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

      {/* Modal 1: Thêm ca Hướng nghiệp chuyên sâu */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#003B3A] px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-[#5EEAD4]" />
                <div>
                  <h3 className="text-sm font-bold">Thêm ca Hướng nghiệp chuyên sâu</h3>
                  <p className="text-[11px] text-teal-100">Chỉ dành cho Giáo viên Tâm lý / Tổ TLHN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn lớp học sinh
                </label>
                <select
                  value={addClassId}
                  onChange={(e) => handleLoadStudentsForAdd(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                >
                  <option value="">-- Chọn lớp --</option>
                  {assignedClasses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              {addClassId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chọn học sinh cần theo dõi
                  </label>
                  <input
                    type="text"
                    value={addStudentSearch}
                    onChange={(e) => setAddStudentSearch(e.target.value)}
                    placeholder="Lọc nhanh theo tên hoặc mã HS..."
                    className="w-full mb-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#008B85]"
                  />
                  <div className="border border-[#E2E8F0] rounded-xl max-h-44 overflow-y-auto divide-y divide-[#F1F5F9] bg-[#F8FAFC]">
                    {loadingAddStudents ? (
                      <div className="p-4 text-center text-xs text-slate-400">Đang tải danh sách học sinh...</div>
                    ) : filteredAddStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy học sinh</div>
                    ) : (
                      filteredAddStudents.map((s: any) => {
                        const exists = careerTargets.some((t: any) => t.studentId === s.id)
                        const selected = selectedAddStudentId === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={exists}
                            onClick={() => setSelectedAddStudentId(s.id)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                              exists
                                ? "opacity-50 cursor-not-allowed bg-slate-100"
                                : selected
                                ? "bg-[#F0FDFA] text-[#003B3A] font-bold"
                                : "hover:bg-white text-slate-700 cursor-pointer"
                            }`}
                          >
                            <span>
                              {s.studentName}{" "}
                              <span className="text-[11px] text-slate-500 tabular-nums">({s.studentCode})</span>
                            </span>
                            {exists && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Đã theo dõi
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhóm trường hợp hướng nghiệp đặc thù
                </label>
                <select
                  value={selectedCaseGroup}
                  onChange={(e) => setSelectedCaseGroup(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                >
                  {CAREER_CASE_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bối cảnh / Mục tiêu ban đầu (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Ví dụ: HS đang phân vân giữa nhóm ngành Kinh doanh và Ngôn ngữ, cần đối chiếu phương án trường ĐH & kế hoạch tiếng Anh..."
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#008B85]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingAdd || !selectedAddStudentId}
                onClick={handleCreateCareerCase}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#002a29] text-white disabled:opacity-50 cursor-pointer"
              >
                {submittingAdd ? "Đang lưu..." : "Lưu vào sổ hướng nghiệp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Ghi / Sửa nhật ký buổi tư vấn hướng nghiệp */}
      {logTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full overflow-hidden">
            <div className="bg-[#003B3A] px-5 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-bold">
                  {editingEvalId ? "Cập nhật biên bản tư vấn hướng nghiệp" : "Ghi nhận buổi tư vấn hướng nghiệp"}
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5 tabular-nums">
                  {logTarget.student?.studentName} ({logTarget.student?.studentCode}) • Lớp {logTarget.student?.class?.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogTarget(null)
                  setEditingEvalId(null)
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Kỳ tư vấn & Mức độ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại kỳ</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as "WEEK" | "MONTH")}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                  >
                    <option value="WEEK">Theo tuần</option>
                    <option value="MONTH">Tổng kết tháng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tháng</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                  >
                    {ACADEMIC_MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {periodType === "WEEK" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tuần</label>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                    >
                      {weeksForSelectedMonth.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái ca</label>
                    <select
                      value={updatedStatus}
                      onChange={(e) => setUpdatedStatus(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                    >
                      <option value="Tiếp tục theo dõi">Tiếp tục theo dõi</option>
                      <option value="Xây dựng kế hoạch hỗ trợ chuyên sâu">Hỗ trợ chuyên sâu</option>
                      <option value="Đã chốt định hướng">Đã chốt định hướng</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mức độ tiến triển định hướng
                  </label>
                  <select
                    value={trackingLevel}
                    onChange={(e) => setTrackingLevel(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                  >
                    {CAREER_TRACKING_LEVELS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {periodType === "WEEK" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái ca</label>
                    <select
                      value={updatedStatus}
                      onChange={(e) => setUpdatedStatus(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008B85]"
                    >
                      <option value="Tiếp tục theo dõi">Tiếp tục theo dõi</option>
                      <option value="Xây dựng kế hoạch hỗ trợ chuyên sâu">Hỗ trợ chuyên sâu</option>
                      <option value="Đã chốt định hướng">Đã chốt định hướng</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Công cụ tham khảo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Công cụ / phương pháp tham khảo sử dụng (tùy chọn)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CAREER_TOOLS.map((tool) => {
                    const active = selectedTools.includes(tool)
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() =>
                          setSelectedTools((prev) =>
                            prev.includes(tool) ? prev.filter((x) => x !== tool) : [...prev, tool]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          active
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {tool}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Nội dung trao đổi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung trao đổi & phân tích định hướng <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={5}
                  value={discussionText}
                  onChange={(e) => setDiscussionText(e.target.value)}
                  placeholder="Ghi nhận nhu cầu, băn khoăn của học sinh, phân tích nhóm ngành/trường, đối chiếu phương án ưu tiên - thay thế - dự phòng..."
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs text-slate-800 leading-relaxed outline-none focus:border-[#008B85]"
                />
              </div>

              {/* Nhiệm vụ sau buổi tư vấn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhiệm vụ sau buổi tư vấn (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={homeworkText}
                  onChange={(e) => setHomeworkText(e.target.value)}
                  placeholder="Ví dụ: Học sinh lập bảng so sánh 3 ngành mục tiêu, xác minh thông tin tuyển sinh, chuẩn bị câu hỏi cho buổi tư vấn kế tiếp..."
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-xs text-slate-800 leading-relaxed outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLogTarget(null)
                  setEditingEvalId(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingLog || !discussionText.trim()}
                onClick={handleSaveSession}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#002a29] text-white disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-[#5EEAD4]" />
                <span>{savingLog ? "Đang lưu..." : editingEvalId ? "Cập nhật buổi tư vấn" : "Lưu buổi tư vấn"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Xem tiến trình đầy đủ các buổi tư vấn */}
      {timelineTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#003B3A] px-5 py-4 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="text-sm font-bold">
                  Tiến trình tư vấn Hướng nghiệp chuyên sâu — {timelineTarget.student?.studentName}
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5 tabular-nums">
                  Mã HS: {timelineTarget.student?.studentCode} • Lớp {timelineTarget.student?.class?.className} • {(timelineTarget.evaluations || []).length} buổi tư vấn
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = timelineTarget
                    setTimelineTarget(null)
                    openSessionModal(t)
                  }}
                  className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#5EEAD4]" />
                  <span>Thêm buổi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineTarget(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 bg-[#F8FAFC] flex-1">
              {timelineTarget.notes && (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 text-xs">
                  <div className="font-semibold text-[#003B3A] mb-1">Thông tin tiếp nhận ban đầu</div>
                  <p className="text-slate-700 whitespace-pre-line">{timelineTarget.notes}</p>
                </div>
              )}

              {(!timelineTarget.evaluations || timelineTarget.evaluations.length === 0) ? (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-xs text-slate-500">
                  Chưa có buổi tư vấn nào được ghi nhận cho học sinh này.
                </div>
              ) : (
                [...timelineTarget.evaluations]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((ev: any, idx: number, arr: any[]) => {
                    const parsed = parseCareerComment(ev.comment || "")
                    const sessionNumber = arr.length - idx
                    return (
                      <div key={ev.id} className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[11px] font-bold tabular-nums">
                              Buổi {sessionNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{ev.periodName}</span>
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              • {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString("vi-VN") : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getLevelBadgeClasses(ev.trackingLevel)}`}>
                              {ev.trackingLevel}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const t = timelineTarget
                                setTimelineTarget(null)
                                openSessionModal(t, ev)
                              }}
                              className="text-xs font-semibold text-[#00736E] hover:underline cursor-pointer"
                            >
                              Chỉnh sửa
                            </button>
                          </div>
                        </div>

                        {parsed.tools.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Công cụ:</span>
                            {parsed.tools.map((tool) => (
                              <span key={tool} className="px-2 py-0.5 rounded-md bg-teal-50 text-[#00736E] border border-teal-200 text-[11px] font-medium">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {parsed.discussion || ev.comment}
                        </div>

                        {parsed.homework && (
                          <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs">
                            <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5 text-amber-700" />
                              <span>Nhiệm vụ sau buổi tư vấn</span>
                            </div>
                            <p className="text-amber-950/90 whitespace-pre-line leading-relaxed">{parsed.homework}</p>
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
