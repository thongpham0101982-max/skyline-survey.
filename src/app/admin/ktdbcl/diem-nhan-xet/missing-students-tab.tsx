// @ts-nocheck
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  AlertCircle,
  User,
  BookOpen,
  ExternalLink,
  X,
  Lock,
  Bell,
  Send,
  Mail,
  CheckCircle2,
  Users,
  Layers,
  GraduationCap,
} from "lucide-react"
import * as XLSX from "xlsx"

const EVAL_PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" },
]

const GRADES = [
  "Khối 1",
  "Khối 2",
  "Khối 3",
  "Khối 4",
  "Khối 5",
  "Khối 6",
  "Khối 7",
  "Khối 8",
  "Khối 9",
  "Khối 10",
  "Khối 11",
  "Khối 12",
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
    configType?: "VNEDU" | "INTERNAL"
  }) => void
  onSwitchToEntryStatus?: () => void
}

export function MissingStudentsGradesTab({
  academicYears,
  selectedYearId,
  campuses = [],
  classes = [],
  subjects = [],
  onNavigateToGradebook,
  onSwitchToEntryStatus,
}: Props) {
  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState("KSĐN")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [scope, setScope] = useState<"SURVEY" | "ALL_ASSIGNED">("SURVEY")
  const [configTypeFilter, setConfigTypeFilter] = useState<"ALL" | "VNEDU" | "INTERNAL">("ALL")
  const [viewMode, setViewMode] = useState<"BY_STUDENT_SUBJECT" | "BY_STUDENT_GROUPED">("BY_STUDENT_SUBJECT")
  const [searchTerm, setSearchTerm] = useState("")

  // Data states
  const [loading, setLoading] = useState(false)
  const [missingRecords, setMissingRecords] = useState<any[]>([])
  const [missingByStudents, setMissingByStudents] = useState<any[]>([])
  const [availableConfiguredSubjects, setAvailableConfiguredSubjects] = useState<any[]>([])
  const [missingSummary, setMissingSummary] = useState({
    uniqueMissingStudentsCount: 0,
    totalMissingSubjectEntries: 0,
    affectedClassesCount: 0,
    affectedSubjectsCount: 0,
    affectedTeachersCount: 0,
    incompleteAssignmentsCount: 0,
    totalAssignments: 0,
  })

  // Modal Reminder states
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderTargets, setReminderTargets] = useState<any[]>([])
  const [reminderMessage, setReminderMessage] = useState("")
  const [sendEmailOption, setSendEmailOption] = useState(true)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderResult, setReminderResult] = useState<any>(null)

  const fetchMissingStudents = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        mode: "MISSING_STUDENTS",
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        campusId: selectedCampusId,
        grade: selectedGrade,
        subjectId: selectedSubjectId,
        status: selectedStatus,
        search: searchTerm,
        scope,
        configType: configTypeFilter,
      })

      const res = await fetch(`/api/admin/ktdbcl/grade-progress?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setMissingRecords(data.missingRecords || [])
        setMissingByStudents(data.missingByStudents || [])
        setAvailableConfiguredSubjects(data.availableConfiguredSubjects || [])
        setMissingSummary(
          data.missingSummary || {
            uniqueMissingStudentsCount: 0,
            totalMissingSubjectEntries: 0,
            affectedClassesCount: 0,
            affectedSubjectsCount: 0,
            affectedTeachersCount: 0,
            incompleteAssignmentsCount: 0,
            totalAssignments: 0,
          }
        )
      }
    } catch (err) {
      console.error("Lỗi tải thống kê học sinh thiếu điểm:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMissingStudents()
  }, [
    selectedYearId,
    selectedPeriod,
    selectedCampusId,
    selectedGrade,
    selectedSubjectId,
    selectedStatus,
    scope,
    configTypeFilter,
  ])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchMissingStudents()
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Filter classes for dropdown
  const filteredClassOptions = useMemo(() => {
    return classes.filter((c) => {
      if (selectedCampusId !== "ALL" && c.campusId !== selectedCampusId) return false
      if (selectedGrade !== "ALL") {
        const gNum = selectedGrade.replace(/\D/g, "")
        const cGradeNum = String(c.grade || c.className || "").replace(/\D/g, "")
        if (gNum && cGradeNum && gNum !== cGradeNum) return false
      }
      return true
    })
  }, [classes, selectedCampusId, selectedGrade])

  const displayedRecords = useMemo(() => {
    if (selectedClassId === "ALL") return missingRecords
    return missingRecords.filter((r) => r.classId === selectedClassId)
  }, [missingRecords, selectedClassId])

  const displayedStudentGroups = useMemo(() => {
    if (selectedClassId === "ALL") return missingByStudents
    return missingByStudents.filter((g) => g.classId === selectedClassId)
  }, [missingByStudents, selectedClassId])

  const handleJumpToGradebook = (item: any) => {
    if (onNavigateToGradebook) {
      onNavigateToGradebook({
        campusId: item.campusId || "ALL",
        grade: item.grade ? `Khối ${String(item.grade).replace(/\D/g, "") || item.grade}` : "ALL",
        classId: item.classId,
        subjectId: item.subjectId,
        period: item.evaluationPeriod || selectedPeriod,
        configType: item.configType || (configTypeFilter !== "ALL" ? configTypeFilter : undefined),
      })
    }
  }

  const handleOpenReminderForRecord = (record: any) => {
    setReminderTargets([
      {
        classId: record.classId,
        className: record.className,
        subjectId: record.subjectId,
        subjectName: record.subjectName,
        teacherId: record.teacherId,
        teacherName: record.teacherName,
        teacherEmail: record.teacherEmail,
      },
    ])
    setReminderMessage("")
    setReminderResult(null)
    setReminderModalOpen(true)
  }

  const handleOpenBatchReminderAllMissing = () => {
    // Gom các cặp (classId, subjectId) duy nhất từ displayedRecords
    const map = new Map<string, any>()
    displayedRecords.forEach((r) => {
      const key = `${r.classId}_${r.subjectId}`
      if (!map.has(key)) {
        map.set(key, {
          classId: r.classId,
          className: r.className,
          subjectId: r.subjectId,
          subjectName: r.subjectName,
          teacherId: r.teacherId,
          teacherName: r.teacherName,
          teacherEmail: r.teacherEmail,
        })
      }
    })
    const targets = Array.from(map.values())
    if (targets.length === 0) {
      alert("Không có lớp/môn nào thiếu điểm trong danh sách lọc hiện tại!")
      return
    }
    setReminderTargets(targets)
    setReminderMessage("")
    setReminderResult(null)
    setReminderModalOpen(true)
  }

  const handleSendReminders = async () => {
    if (reminderTargets.length === 0) return
    try {
      setSendingReminder(true)
      setReminderResult(null)

      const reminderPayload = reminderTargets.map((it) => ({
        classId: it.classId,
        className: it.className,
        subjectId: it.subjectId,
        subjectName: it.subjectName,
        teacherId: it.teacherId,
        teacherName: it.teacherName,
        recipientEmail: it.teacherEmail || "",
      }))

      const res = await fetch("/api/admin/ktdbcl/grade-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          reminders: reminderPayload,
          sendEmail: sendEmailOption,
          customMessage: reminderMessage,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setReminderResult(data)
      } else {
        alert("Lỗi gửi nhắc nhở: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSendingReminder(false)
    }
  }

  const handleExportExcel = () => {
    if (viewMode === "BY_STUDENT_SUBJECT") {
      if (displayedRecords.length === 0) {
        alert("Không có dữ liệu học sinh thiếu điểm để xuất Excel!")
        return
      }
      const rows = displayedRecords.map((r, idx) => ({
        STT: idx + 1,
        "Mã học sinh": r.studentCode,
        "Mã định danh Bộ GD&ĐT": r.vnEduCode || "",
        "Họ và tên học sinh": r.studentName,
        "Cơ sở": r.campusName,
        Khối: r.grade ? `Khối ${r.grade}` : "",
        Lớp: r.className,
        "Môn thiếu điểm": `${r.subjectName} (${r.subjectCode})`,
        "Nhóm cấu hình":
          r.configType === "VNEDU"
            ? "1. Sổ điểm theo vnEdu (Môn Bộ GD&ĐT)"
            : "2. Đánh giá nội bộ Sky-Line (Môn Song ngữ & Quốc tế)",
        "Kỳ khảo sát": r.evaluationPeriod,
        "Giáo viên phụ trách": r.teacherName,
        "Email GV": r.teacherEmail || "",
        "Tiến độ lớp-môn": `${r.classGradedCount}/${r.classTotalStudents} HS (${r.classCompletionRate}%)`,
        "Trạng thái lớp-môn":
          r.classStatus === "IN_PROGRESS" ? "Đang nhập dở dang" : "Chưa bắt đầu nhập",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "HS_Thieu_Diem_Chi_Tiet")
      XLSX.writeFile(
        wb,
        `Thong_Ke_Hoc_Sinh_Thieu_Diem_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    } else {
      if (displayedStudentGroups.length === 0) {
        alert("Không có dữ liệu học sinh thiếu điểm để xuất Excel!")
        return
      }
      const rows = displayedStudentGroups.map((g, idx) => ({
        STT: idx + 1,
        "Mã học sinh": g.studentCode,
        "Mã định danh Bộ GD&ĐT": g.vnEduCode || "",
        "Họ và tên học sinh": g.studentName,
        "Cơ sở": g.campusName,
        Khối: g.grade ? `Khối ${g.grade}` : "",
        Lớp: g.className,
        "Số môn thiếu điểm": g.missingSubjects.length,
        "Danh sách môn thiếu điểm": g.missingSubjects
          .map((ms: any) => `${ms.subjectName} (${ms.teacherName})`)
          .join("; "),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "HS_Thieu_Diem_Theo_HS")
      XLSX.writeFile(
        wb,
        `Thong_Ke_HS_Thieu_Diem_Theo_Hoc_Sinh_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    }
  }

  const currentYearName =
    academicYears.find((y) => y.id === selectedYearId)?.name || "2026-2027"

  return (
    <div className="space-y-5 pb-12 tabular-nums">
      {/* 1. THANH TIÊU ĐỀ NGHIỆP VỤ & NÚT HÀNH ĐỘNG */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#00A19A]" />
              Rà soát dữ liệu thiếu điểm theo học sinh
            </span>
            <span className="text-xs font-semibold text-slate-500">[{currentYearName}]</span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-1">
            Thống kê học sinh thiếu điểm theo kỳ đánh giá
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tra cứu danh sách học sinh chưa được nhập điểm ở từng môn học đã cấu hình, hỗ trợ lọc theo lớp, môn, giáo viên và gửi nhắc nhở hoàn thiện sổ điểm.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenBatchReminderAllMissing}
            disabled={loading || displayedRecords.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Nhắc nhở GV có HS thiếu điểm</span>
          </button>

          <button
            type="button"
            onClick={fetchMissingStudents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00736E]" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. DẢI CHỈ SỐ SỔ CÁI HỌC THUẬT (UNIFIED LEDGER STRIP) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Học sinh thiếu điểm</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E11D48] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#E11D48]">
              {missingSummary.uniqueMissingStudentsCount.toLocaleString("vi-VN")}
            </span>
            <span className="text-xs font-medium text-slate-500">học sinh</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Số học sinh chưa đủ điểm các môn
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Tổng lượt môn thiếu</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#D97706]">
              {missingSummary.totalMissingSubjectEntries.toLocaleString("vi-VN")}
            </span>
            <span className="text-xs font-medium text-slate-500">lượt HS-môn</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tổng số ô điểm học sinh cần bổ sung
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Lớp còn thiếu điểm</span>
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {missingSummary.affectedClassesCount}
            </span>
            <span className="text-xs font-medium text-slate-500">lớp học</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Trên tổng số {missingSummary.incompleteAssignmentsCount} phân công chưa xong
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Môn học còn thiếu</span>
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {missingSummary.affectedSubjectsCount}
            </span>
            <span className="text-xs font-medium text-slate-500">môn học</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Môn đã cấu hình có học sinh chưa nhập
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Giáo viên liên quan</span>
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#003B3A]">
              {missingSummary.affectedTeachersCount}
            </span>
            <span className="text-xs font-medium text-slate-500">giáo viên</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Cần hoàn tất nhập điểm học sinh
          </p>
        </div>
      </div>

      {/* 3. BỘ LỌC ĐA TIÊU CHÍ & CHẾ ĐỘ XEM */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#F1F5F9] pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#003B3A]">
            <Filter className="w-4 h-4 text-[#008B85]" />
            <span>Bộ lọc rà soát học sinh thiếu điểm</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chế độ hiển thị: Theo từng lượt HS-Môn vs Gom theo Học sinh */}
            <div className="inline-flex items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("BY_STUDENT_SUBJECT")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "BY_STUDENT_SUBJECT"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo từng môn thiếu ({displayedRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("BY_STUDENT_GROUPED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "BY_STUDENT_GROUPED"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Gom theo học sinh ({displayedStudentGroups.length} HS)
              </button>
            </div>

            {/* Scope & ConfigType Toggle */}
            <div className="inline-flex flex-wrap items-center bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setScope("SURVEY")
                  setConfigTypeFilter("ALL")
                  setSelectedSubjectId("ALL")
                }}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === "SURVEY" && configTypeFilter === "ALL"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả môn cấu hình
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("SURVEY")
                  setConfigTypeFilter("VNEDU")
                  setSelectedSubjectId("ALL")
                }}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === "SURVEY" && configTypeFilter === "VNEDU"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Sổ điểm vnEdu
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("SURVEY")
                  setConfigTypeFilter("INTERNAL")
                  setSelectedSubjectId("ALL")
                }}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === "SURVEY" && configTypeFilter === "INTERNAL"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. ĐG nội bộ Sky-Line
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          {/* 1. Kỳ khảo sát */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Kỳ khảo sát
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              {EVAL_PERIODS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cơ sở */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => {
                setSelectedCampusId(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {campuses.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName || cp.campusCode}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Khối */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Khối
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              <option value="ALL">Tất cả Khối</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Lớp học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              <option value="ALL">Tất cả Lớp ({filteredClassOptions.length})</option>
              {filteredClassOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Môn học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Môn đã cấu hình ({availableConfiguredSubjects.length})
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              <option value="ALL">Tất cả môn ({availableConfiguredSubjects.length})</option>
              {availableConfiguredSubjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.subjectCode})
                </option>
              ))}
            </select>
          </div>

          {/* 6. Trạng thái lớp-môn */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Tình trạng lớp-môn
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
            >
              <option value="ALL">Tất cả lớp chưa đủ điểm</option>
              <option value="IN_PROGRESS">Đang nhập dở dang (1-99%)</option>
              <option value="NOT_STARTED">Chưa nhập cả lớp (0%)</option>
            </select>
          </div>

          {/* 7. Tìm kiếm */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Tìm học sinh / GV
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Tên HS, mã HS, lớp, GV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. BẢNG DỮ LIỆU CHUẨN SKY-LINE ACADEMIC LEDGER */}
      {viewMode === "BY_STUDENT_SUBJECT" ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                Danh sách chi tiết học sinh thiếu điểm theo môn học
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                {displayedRecords.length.toLocaleString("vi-VN")} lượt thiếu điểm
              </span>
            </div>
            {onSwitchToEntryStatus && (
              <button
                type="button"
                onClick={onSwitchToEntryStatus}
                className="text-xs font-semibold text-[#00736E] hover:underline cursor-pointer"
              >
                Xem tiến độ tổng hợp theo lớp & giáo viên →
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-12 text-white">STT</th>
                  <th className="py-3 px-3 text-white">Mã học sinh</th>
                  <th className="py-3 px-3 text-white">Họ và tên học sinh</th>
                  <th className="py-3 px-3 text-teal-100">Lớp & Cơ sở</th>
                  <th className="py-3 px-3 text-teal-100">Môn học thiếu điểm</th>
                  <th className="py-3 px-3 text-teal-100">Giáo viên phụ trách</th>
                  <th className="py-3 px-3 text-center text-teal-100">Kỳ đánh giá</th>
                  <th className="py-3 px-3 text-center text-teal-100">Tiến độ lớp-môn</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái</th>
                  <th className="py-3 px-3 text-center text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#005B58]" />
                        <span className="font-medium">
                          Đang rà soát danh sách học sinh thiếu điểm...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                      Không có học sinh nào thiếu điểm trong phạm vi bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.slice(0, 500).map((record, idx) => (
                    <tr
                      key={record.recordKey || `${record.studentId}_${record.subjectId}_${idx}`}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-mono font-semibold text-slate-800">
                          {record.studentCode}
                        </div>
                        {record.vnEduCode && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Bộ: {record.vnEduCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-bold text-slate-900">{record.studentName}</div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#003B3A] bg-[#F0FDFA] px-2 py-0.5 rounded-lg border border-[#CCFBF1]">
                            {record.className}
                          </span>
                          <span className="text-[11px] text-slate-500">Khối {record.grade}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{record.campusName}</div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-semibold text-slate-900">{record.subjectName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            {record.subjectCode}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              record.configType === "VNEDU"
                                ? "bg-slate-100 text-[#003B3A]"
                                : "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]"
                            }`}
                          >
                            {record.configType === "VNEDU" ? "1. Sổ điểm vnEdu" : "2. ĐG nội bộ"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-semibold text-slate-800">{record.teacherName}</div>
                        {record.teacherEmail && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
                            {record.teacherEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {record.evaluationPeriod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <div className="text-[11px] font-semibold text-slate-700">
                          Đã nhập {record.classGradedCount}/{record.classTotalStudents} HS
                        </div>
                        <div className="text-[10px] text-[#E11D48] font-medium">
                          Còn thiếu {record.classMissingCount} HS ({100 - record.classCompletionRate}%)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        {record.classStatus === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                            Thiếu sót lẻ ({record.classCompletionRate}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
                            Chưa nhập lớp (0%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReminderForRecord(record)}
                            className="p-1.5 bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#00736E] border border-[#CCFBF1] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Gửi nhắc nhở giáo viên bộ môn"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleJumpToGradebook(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            title="Mở sổ điểm lớp này để nhập bổ sung"
                          >
                            <span>Vào sổ</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {displayedRecords.length > 500 && (
            <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-slate-500 flex items-center justify-between">
              <span>
                Đang hiển thị 500 / {displayedRecords.length.toLocaleString("vi-VN")} lượt học sinh thiếu điểm. Vui lòng lọc theo Cơ sở, Khối, Lớp hoặc xuất Excel để xem toàn bộ.
              </span>
              <button
                type="button"
                onClick={handleExportExcel}
                className="font-semibold text-[#00736E] hover:underline cursor-pointer"
              >
                Tải toàn bộ danh sách Excel →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">
                Danh sách tổng hợp theo từng học sinh thiếu điểm
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                {displayedStudentGroups.length.toLocaleString("vi-VN")} học sinh
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 text-center w-12 text-white">STT</th>
                  <th className="py-3 px-3 text-white">Mã học sinh</th>
                  <th className="py-3 px-3 text-white">Họ và tên học sinh</th>
                  <th className="py-3 px-3 text-teal-100">Lớp & Cơ sở</th>
                  <th className="py-3 px-3 text-center text-[#5EEAD4]">Số môn thiếu</th>
                  <th className="py-3 px-3 text-teal-100">Chi tiết các môn chưa có điểm & Giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#005B58] mx-auto mb-2" />
                      <span>Đang tổng hợp theo học sinh...</span>
                    </td>
                  </tr>
                ) : displayedStudentGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                      Không có học sinh nào thiếu điểm trong phạm vi bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedStudentGroups.slice(0, 300).map((student, idx) => (
                    <tr
                      key={student.studentId}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 align-middle font-mono font-semibold text-slate-800">
                        {student.studentCode}
                      </td>
                      <td className="py-3 px-3 align-middle font-bold text-slate-900">
                        {student.studentName}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <span className="font-bold text-[#003B3A] bg-[#F0FDFA] px-2 py-0.5 rounded-lg border border-[#CCFBF1]">
                          {student.className}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          ({student.campusName})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-[#E11D48] border border-rose-200">
                          {student.missingSubjects.length} môn
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {student.missingSubjects.map((ms: any) => (
                            <button
                              key={`${student.studentId}_${ms.subjectId}`}
                              type="button"
                              onClick={() =>
                                handleJumpToGradebook({
                                  campusId: student.campusId,
                                  grade: student.grade,
                                  classId: student.classId,
                                  subjectId: ms.subjectId,
                                  evaluationPeriod: ms.evaluationPeriod,
                                  configType: ms.configType,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F0FDFA] border border-[#E2E8F0] hover:border-[#008B85] text-xs transition-colors cursor-pointer"
                              title="Nhấp để mở sổ điểm môn này"
                            >
                              <span className="font-semibold text-slate-800">{ms.subjectName}</span>
                              <span className="text-[10px] text-slate-500">({ms.teacherName})</span>
                              <ExternalLink className="w-3 h-3 text-[#00736E]" />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL GỬI NHẮC NHỞ NHẬP ĐIỂM */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Gửi thông báo nhắc nhở giáo viên bổ sung điểm thiếu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kỳ đánh giá: <strong className="text-[#00736E]">{selectedPeriod}</strong> ({currentYearName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Danh sách phân công nhận nhắc nhở ({reminderTargets.length} lớp-môn):
                </label>
                <div className="border border-[#E2E8F0] rounded-xl max-h-36 overflow-y-auto divide-y divide-[#F1F5F9] bg-[#F8FAFC]">
                  {reminderTargets.map((t, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-800">{t.teacherName}</strong>
                        <span className="text-slate-500 ml-1.5">
                          ({t.className} - {t.subjectName})
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {t.teacherEmail || (
                          <span className="text-[#D97706]">Lưu nhắc nhở hệ thống</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F0FDFA] border border-[#CCFBF1] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#00736E]" />
                  <div>
                    <div className="text-xs font-bold text-[#003B3A]">
                      Gửi Email tự động qua Office 365
                    </div>
                    <div className="text-[11px] text-[#00736E]">
                      Gửi thông báo trực tiếp tới hộp thư của giáo viên phụ trách.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendEmailOption}
                  onChange={(e) => setSendEmailOption(e.target.checked)}
                  className="w-4 h-4 text-[#003B3A] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nội dung nhắc nhở bổ sung (tùy chọn):
                </label>
                <textarea
                  rows={3}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Ví dụ: Đề nghị Thầy/Cô kiểm tra và nhập bổ sung đầy đủ điểm cho các học sinh còn thiếu trước khi khóa sổ..."
                  className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs text-slate-800 focus:border-[#008B85] outline-none"
                />
              </div>

              {reminderResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    Đã gửi nhắc nhở thành công cho {reminderResult.count} phân công!
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {reminderResult ? "Đóng" : "Hủy bỏ"}
              </button>
              {!reminderResult && (
                <button
                  type="button"
                  onClick={handleSendReminders}
                  disabled={sendingReminder || reminderTargets.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl text-xs font-bold transition-all"
                >
                  {sendingReminder ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi nhắc nhở ({reminderTargets.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
