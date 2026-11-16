"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import {
  UserCheck,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  Search,
  FileSpreadsheet,
  Award,
  ClipboardPaste,
  CheckCircle2,
  UserPlus,
  UserMinus,
} from "lucide-react"
import {
  getStudentsByClassAction,
  registerStudentsAction,
  registerStudentsByCodesAction,
  deregisterStudentsAction,
  getAllRegisteredStudentsAction,
} from "./actions"

const LEVEL_LABELS: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "THCS",
  THPT: "THPT",
  TH_THCS: "Liên cấp TH-THCS",
  THCS_THPT: "Liên cấp THCS-THPT",
  ALL: "Toàn trường",
}

function getLevelLabel(val: string) {
  if (!val) return ""
  if (val.includes(",") || /^\d+$/.test(val)) {
    return val
      .split(",")
      .map((g: string) => `Khối ${g}`)
      .join(", ")
  }
  return LEVEL_LABELS[val] || val
}

interface StudentsClientProps {
  exams: any[]
  campuses: any[]
  classes: any[]
  academicYears: any[]
  initialYearId?: string
}

export function StudentsClient({
  exams,
  campuses,
  classes,
  academicYears,
  initialYearId = "",
}: StudentsClientProps) {
  const [yearId, setYearId] = useState<string>(() => {
    if (initialYearId) return initialYearId
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : academicYears[0]?.id || ""
  })

  useEffect(() => {
    const syncYear = () => {
      try {
        const stored = localStorage.getItem("selectedAcademicYear")
        if (stored && academicYears.some((y: any) => y.id === stored)) {
          setYearId(stored)
        }
      } catch {}
    }
    const params = new URLSearchParams(window.location.search)
    const qExamId = params.get("examId")
    if (qExamId) {
      const targetExam = exams.find((e) => e.id === qExamId)
      if (targetExam?.academicYearId) {
        setYearId(targetExam.academicYearId)
        try {
          localStorage.setItem("selectedAcademicYear", targetExam.academicYearId)
          document.cookie = `selectedAcademicYear=${targetExam.academicYearId}; path=/; max-age=31536000; SameSite=Lax`
          window.dispatchEvent(new Event("academicYearChanged"))
        } catch {}
      }
    } else {
      syncYear()
    }
    window.addEventListener("academicYearChanged", syncYear)
    return () => window.removeEventListener("academicYearChanged", syncYear)
  }, [academicYears, exams])

  const activeYearName = useMemo(
    () => academicYears.find((y: any) => y.id === yearId)?.name || "",
    [academicYears, yearId]
  )

  const filteredExams = useMemo(() => {
    return exams.filter((e) => e.academicYearId === yearId)
  }, [exams, yearId])

  const [selectedExam, setSelectedExam] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const qExamId = params.get("examId")
      if (qExamId && exams.some((e) => e.id === qExamId)) {
        return qExamId
      }
    }
    return ""
  })

  const [selectedCampus, setSelectedCampus] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [showAllRegistered, setShowAllRegistered] = useState(false)

  // Quick paste student codes
  const [showPasteBox, setShowPasteBox] = useState(false)
  const [pasteText, setPasteText] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 25

  // Data states
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 3200)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [
    selectedExam,
    selectedCampus,
    selectedGrade,
    selectedClass,
    searchTerm,
    showAllRegistered,
  ])

  const activeExamObj = useMemo(
    () => exams.find((e) => e.id === selectedExam),
    [exams, selectedExam]
  )

  const allowedGrades = useMemo(() => {
    if (!activeExamObj || !activeExamObj.grade) {
      return Array.from({ length: 12 }, (_, i) => String(i + 1))
    }
    const val = activeExamObj.grade
    if (val.includes(",") || /^\d+$/.test(val)) {
      return val.split(",")
    }
    const levelGradesMap: Record<string, string[]> = {
      TIEU_HOC: ["1", "2", "3", "4", "5"],
      THCS: ["6", "7", "8", "9"],
      THPT: ["10", "11", "12"],
      TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
      ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    }
    return levelGradesMap[val] || Array.from({ length: 12 }, (_, i) => String(i + 1))
  }, [activeExamObj])

  const filteredClasses = useMemo(() => {
    return classes.filter(
      (c) =>
        (!selectedCampus || c.campusId === selectedCampus) &&
        (!selectedGrade || c.grade === selectedGrade) &&
        (!yearId || c.academicYearId === yearId)
    )
  }, [classes, selectedCampus, selectedGrade, yearId])

  // Sync selectedExam with filteredExams
  useEffect(() => {
    if (filteredExams.length > 0) {
      const exists = filteredExams.some((e) => e.id === selectedExam)
      if (!exists) {
        setSelectedExam(filteredExams[0].id)
      }
    } else if (selectedExam !== "") {
      setSelectedExam("")
      setStudents([])
    }
  }, [filteredExams, selectedExam])

  // Ensure default campus & grade when browsing by class
  useEffect(() => {
    if (!showAllRegistered && !selectedCampus && campuses.length > 0) {
      setSelectedCampus(campuses[0].id)
    }
  }, [showAllRegistered, selectedCampus, campuses])

  useEffect(() => {
    if (!showAllRegistered && allowedGrades.length > 0) {
      if (!selectedGrade || !allowedGrades.includes(selectedGrade)) {
        setSelectedGrade(allowedGrades[0])
      }
    }
  }, [showAllRegistered, allowedGrades, selectedGrade])

  useEffect(() => {
    if (!showAllRegistered) {
      if (filteredClasses.length > 0) {
        const exists = filteredClasses.some((c) => c.id === selectedClass)
        if (!exists) {
          setSelectedClass(filteredClasses[0].id)
        }
      } else if (selectedClass !== "") {
        setSelectedClass("")
        setStudents([])
      }
    }
  }, [showAllRegistered, filteredClasses, selectedClass])

  const fetchStudents = async () => {
    if (!selectedExam) {
      setStudents([])
      return
    }
    setLoading(true)
    try {
      if (showAllRegistered) {
        const data = await getAllRegisteredStudentsAction(selectedExam)
        setStudents(data)
      } else {
        if (!selectedClass) {
          setStudents([])
          setLoading(false)
          return
        }
        const data = await getStudentsByClassAction(selectedClass, selectedExam)
        setStudents(data)
      }
      setSelectedIds([])
    } catch (e) {
      console.error("Error loading students:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [selectedClass, selectedExam, showAllRegistered])

  const filteredStudents = useMemo(() => {
    let list = students
    if (showAllRegistered) {
      if (selectedCampus) {
        list = list.filter((s) => s.campusId === selectedCampus)
      }
      if (selectedGrade) {
        list = list.filter((s) => s.grade === selectedGrade)
      }
      if (selectedClass) {
        list = list.filter((s) => s.classId === selectedClass)
      }
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(term) ||
          s.studentCode.toLowerCase().includes(term) ||
          (s.className || "").toLowerCase().includes(term)
      )
    }
    return list
  }, [students, showAllRegistered, selectedCampus, selectedGrade, selectedClass, searchTerm])

  const handleToggleSelectAll = () => {
    const visibleIds = filteredStudents.map((s) => s.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)))
    } else {
      const merged = new Set([...selectedIds, ...visibleIds])
      setSelectedIds(Array.from(merged))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSingleToggle = async (student: any) => {
    if (!selectedExam) return
    setRowBusyId(student.id)
    try {
      if (student.isRegistered) {
        await deregisterStudentsAction(selectedExam, [student.id])
        if (showAllRegistered) {
          setStudents((prev) => prev.filter((s) => s.id !== student.id))
        } else {
          setStudents((prev) =>
            prev.map((s) => (s.id === student.id ? { ...s, isRegistered: false } : s))
          )
        }
        showToast("success", `Đã hủy đăng ký cho ${student.studentName}.`)
      } else {
        await registerStudentsAction(selectedExam, [student.id])
        setStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, isRegistered: true } : s))
        )
        showToast("success", `Đã đăng ký dự thi cho ${student.studentName}.`)
      }
    } catch (e: any) {
      showToast("error", e?.message || "Thao tác không thành công.")
    } finally {
      setRowBusyId(null)
    }
  }

  const handleBatchRegister = async () => {
    if (selectedIds.length === 0 || !selectedExam) return
    setUpdating(true)
    try {
      await registerStudentsAction(selectedExam, selectedIds)
      showToast("success", `Đã đăng ký dự thi cho ${selectedIds.length} học sinh.`)
      await fetchStudents()
    } catch (e: any) {
      showToast("error", e?.message || "Đăng ký thất bại.")
    } finally {
      setUpdating(false)
    }
  }

  const handleBatchDeregister = async () => {
    if (selectedIds.length === 0 || !selectedExam) return
    if (!confirm(`Hủy đăng ký dự thi cho ${selectedIds.length} học sinh đã chọn?`)) return
    setUpdating(true)
    try {
      await deregisterStudentsAction(selectedExam, selectedIds)
      showToast("success", `Đã hủy đăng ký cho ${selectedIds.length} học sinh.`)
      await fetchStudents()
    } catch (e: any) {
      showToast("error", e?.message || "Hủy đăng ký thất bại.")
    } finally {
      setUpdating(false)
    }
  }

  const handlePasteRegister = async () => {
    if (!selectedExam || !pasteText.trim()) return
    const rawCodes = pasteText
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (rawCodes.length === 0) return

    setUpdating(true)
    try {
      const res = await registerStudentsByCodesAction(selectedExam, rawCodes)
      setPasteText("")
      setShowPasteBox(false)
      await fetchStudents()
      if (res.notFound.length > 0) {
        showToast(
          "error",
          `Đã khớp ${res.matched} HS (thêm mới ${res.added}). Không tìm thấy mã: ${res.notFound
            .slice(0, 5)
            .join(", ")}`
        )
      } else {
        showToast("success", `Đã đăng ký thành công ${res.matched} học sinh từ danh sách mã.`)
      }
    } catch (e: any) {
      showToast("error", e?.message || "Không thể đăng ký từ danh sách mã HS.")
    } finally {
      setUpdating(false)
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const header = [
      "Mã HS",
      "Họ Tên",
      "Lớp",
      "Cơ sở",
      "Trạng thái đăng ký",
      "Hình thức (CA_NHAN/DONG_DOI)",
      "Loại giải (GIAI_THUONG/HUY_CHUONG/CHUNG_NHAN/KHAC)",
      "Mức giải (NHAT/NHI/BA/KHUYEN_KHICH/VANG/BAC/DONG)",
      "Tên giải thưởng",
      "Mã GV Bồi dưỡng (Tùy chọn)",
    ]
    const data = [header]

    filteredStudents.forEach((s) => {
      data.push([
        s.studentCode,
        s.studentName,
        s.className || "",
        s.campusName || "",
        s.isRegistered ? "Đã đăng ký" : "Chưa đăng ký",
        s.isRegistered ? "CA_NHAN" : "",
        "",
        "",
        "",
        "",
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Du_Thi")

    const fileName = showAllRegistered
      ? `Danh_Sach_Da_Dang_Ky_${activeExamObj?.code || "Ky_Thi"}.xlsx`
      : `Danh_Sach_Lop_${classes.find((c) => c.id === selectedClass)?.className || "Lop"}.xlsx`

    XLSX.writeFile(wb, fileName)
  }

  const totalCount = students.length
  const registeredCount = students.filter((s) => s.isRegistered).length
  const unregisteredCount = totalCount - registeredCount

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage))
  const pagedStudents = filteredStudents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === "success"
              ? "bg-[#003B3A] text-white border-[#008B85]"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Compact Filter & Exam Context Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-3.5 space-y-3 no-print">
        {/* Top Row: Segmented Mode + Direct Jump to Result Entry */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-0.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  setShowAllRegistered(false)
                  setSelectedIds([])
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !showAllRegistered
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Đăng ký theo lớp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllRegistered(true)
                  setSelectedCampus("")
                  setSelectedGrade("")
                  setSelectedClass("")
                  setSelectedIds([])
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showAllRegistered
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Toàn bộ HS đã đăng ký</span>
              </button>
            </div>

            {activeExamObj?.grade && (
              <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#00736E] text-xs font-medium">
                Đối tượng: {getLevelLabel(activeExamObj.grade)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedExam && (
              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  showPasteBox
                    ? "bg-[#F0FDFA] border-[#00A19A]/40 text-[#003B3A]"
                    : "bg-white border-[#E2E8F0] text-slate-700 hover:bg-[#F8FAFC]"
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-[#008B85]" />
                <span>Dán mã HS đăng ký nhanh</span>
              </button>
            )}

            {selectedExam && (
              <Link
                href={`/admin/ktdbcl/results?examId=${selectedExam}`}
                className="inline-flex items-center gap-1.5 bg-[#003B3A] hover:bg-[#00736E] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-[#5EEAD4]" />
                <span>Chuyển sang Nhập kết quả</span>
              </Link>
            )}
          </div>
        </div>

        {/* Paste Student Codes Drawer */}
        {showPasteBox && selectedExam && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Dán danh sách Mã học sinh (mỗi dòng hoặc cách nhau bởi dấu phẩy, khoảng trắng — copy trực tiếp từ Excel)
              </span>
              <button
                type="button"
                onClick={() => setShowPasteBox(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={2}
                placeholder="Ví dụ: HS00123, HS00124, HS00125..."
                className="flex-1 bg-white border border-[#E2E8F0] focus:border-[#00A19A] rounded-xl px-3 py-2 text-xs font-mono outline-none"
              />
              <button
                type="button"
                onClick={handlePasteRegister}
                disabled={updating || !pasteText.trim()}
                className="px-4 py-2 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 cursor-pointer self-end sm:self-stretch"
              >
                {updating ? "Đang xử lý..." : "Đăng ký ngay"}
              </button>
            </div>
          </div>
        )}

        {/* Filter Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600 tabular-nums">
              Kỳ thi {activeYearName ? `năm học ${activeYearName} (${filteredExams.length})` : ""}
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={filteredExams.length === 0}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] font-medium text-slate-800 disabled:opacity-50 tabular-nums"
            >
              {filteredExams.length === 0 ? (
                <option value="">
                  -- Năm học {activeYearName || "đang chọn"} chưa có kỳ thi --
                </option>
              ) : (
                filteredExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e._count?.students || 0} ĐK)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Cơ sở trường</label>
            <select
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value)
                setSelectedClass("")
              }}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] font-medium text-slate-800"
            >
              <option value="">
                {showAllRegistered ? "Tất cả cơ sở" : "-- Chọn cơ sở --"}
              </option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setSelectedClass("")
              }}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] font-medium text-slate-800 tabular-nums"
            >
              <option value="">
                {showAllRegistered ? "Tất cả khối" : "-- Chọn khối --"}
              </option>
              {allowedGrades.map((g: string) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Lớp học</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!showAllRegistered && filteredClasses.length === 0}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs outline-none bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] font-medium text-slate-800 disabled:opacity-50 tabular-nums"
            >
              <option value="">
                {showAllRegistered ? "Tất cả lớp" : "-- Chọn lớp --"}
              </option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.className} ({c._count?.students || 0} HS)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Sky-Line Academic Ledger Table + Inline Stats & Batch Controls */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Compact Table Toolbar */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
            <span className="font-semibold text-[#003B3A]">
              {showAllRegistered ? "Danh sách học sinh đã đăng ký" : "Danh sách học sinh theo lớp"}
            </span>
            {(selectedClass || showAllRegistered) && (
              <>
                <span className="text-slate-300">|</span>
                {showAllRegistered ? (
                  <>
                    <span className="text-slate-500">
                      Tổng đăng ký:{" "}
                      <strong className="text-[#059669]">{totalCount}</strong>
                    </span>
                    {filteredStudents.length !== totalCount && (
                      <span className="text-slate-500">
                        Đang lọc:{" "}
                        <strong className="text-slate-800">{filteredStudents.length}</strong>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">
                      Sĩ số: <strong className="text-slate-800">{totalCount}</strong>
                    </span>
                    <span className="text-slate-500">
                      Đã đăng ký: <strong className="text-[#059669]">{registeredCount}</strong>
                    </span>
                    <span className="text-slate-500">
                      Chưa đăng ký: <strong className="text-slate-600">{unregisteredCount}</strong>
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch selection actions inline */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F0FDFA] border border-[#CCFBF1] px-2.5 py-1 rounded-xl tabular-nums">
                <span className="text-xs font-semibold text-[#003B3A]">
                  Đã chọn {selectedIds.length} HS:
                </span>
                {!showAllRegistered && (
                  <button
                    type="button"
                    onClick={handleBatchRegister}
                    disabled={updating}
                    className="inline-flex items-center gap-1 bg-[#003B3A] hover:bg-[#00736E] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {updating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 text-[#5EEAD4]" />
                    )}
                    <span>Đăng ký</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBatchDeregister}
                  disabled={updating}
                  className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-[#E11D48] border border-rose-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Hủy đăng ký</span>
                </button>
              </div>
            )}

            {(showAllRegistered || selectedClass) && students.length > 0 && (
              <>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã HS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8.5 pr-7 py-1.5 text-xs border border-[#E2E8F0] rounded-xl outline-none bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A]"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0FDFA] text-[#00736E] border border-[#E2E8F0] rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel mẫu</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table Body */}
        {!showAllRegistered && !selectedClass ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-4 text-center">
            <AlertCircle className="w-9 h-9 mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">
              Chọn cơ sở, khối và lớp học để hiển thị học sinh
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Hoặc chuyển sang chế độ &ldquo;Toàn bộ HS đã đăng ký&rdquo; để xem toàn trường.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#008B85] mb-2" />
            <p className="font-medium text-xs text-slate-500">Đang tải danh sách học sinh...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-4 text-center">
            <AlertCircle className="w-9 h-9 mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Không có học sinh nào phù hợp</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {showAllRegistered
                ? "Kỳ thi này chưa có học sinh đăng ký hoặc không khớp bộ lọc."
                : "Lớp chưa có học sinh hoạt động hoặc không khớp từ khóa tìm kiếm."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 w-10 text-center text-white">
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents.every((s) => selectedIds.includes(s.id))
                        }
                        onChange={handleToggleSelectAll}
                        className="w-3.5 h-3.5 rounded accent-[#00A19A] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 text-white">Mã học sinh</th>
                    <th className="py-3 px-3 text-white">Họ và tên</th>
                    <th className="py-3 px-3 text-teal-100">Lớp &amp; cơ sở</th>
                    <th className="py-3 px-3 text-teal-100">Giới tính</th>
                    <th className="py-3 px-3 text-teal-100">Ngày sinh</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái</th>
                    <th className="py-3 px-3 text-right text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {pagedStudents.map((student) => {
                    const isChecked = selectedIds.includes(student.id)
                    const isRowBusy = rowBusyId === student.id

                    return (
                      <tr
                        key={student.id}
                        onClick={() => handleToggleSelect(student.id)}
                        className={`transition-colors align-middle cursor-pointer ${
                          isChecked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td
                          className="py-3 px-3 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(student.id)}
                            className="w-3.5 h-3.5 rounded accent-[#003B3A] cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-3 align-middle font-mono font-medium text-slate-600 whitespace-nowrap">
                          {student.studentCode}
                        </td>

                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {student.studentName}
                            </span>
                            {student.studentType === "GIAO_LUU" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                Giao lưu
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-middle text-slate-600">
                          <span className="font-medium text-slate-800">
                            {student.className || "—"}
                          </span>
                          {student.campusName && student.campusName !== "—" && (
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              • {student.campusName}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                          {student.gender === "MALE" || student.gender === "Nam"
                            ? "Nam"
                            : student.gender === "FEMALE" || student.gender === "Nữ"
                            ? "Nữ"
                            : student.gender}
                        </td>

                        <td className="py-3 px-3 align-middle text-slate-500 whitespace-nowrap">
                          {student.dateOfBirth
                            ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>

                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          {student.isRegistered ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#059669] border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                              <Check className="w-3 h-3" />
                              <span>Đã đăng ký</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-[#E2E8F0] px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                              <span>Chưa đăng ký</span>
                            </span>
                          )}
                        </td>

                        <td
                          className="py-3 px-3 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => handleSingleToggle(student)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                              student.isRegistered
                                ? "bg-white hover:bg-rose-50 text-slate-600 hover:text-[#E11D48] border-[#E2E8F0] hover:border-rose-200"
                                : "bg-[#F0FDFA] hover:bg-[#003B3A] text-[#003B3A] hover:text-white border-[#CCFBF1] hover:border-[#003B3A]"
                            }`}
                          >
                            {isRowBusy ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : student.isRegistered ? (
                              <>
                                <UserMinus className="w-3 h-3" />
                                <span>Hủy</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3" />
                                <span>Đăng ký</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Footer */}
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs tabular-nums">
              <span className="text-slate-500">
                Hiển thị{" "}
                <strong className="text-slate-800">
                  {(currentPage - 1) * rowsPerPage + 1}–
                  {Math.min(currentPage * rowsPerPage, filteredStudents.length)}
                </strong>{" "}
                / <strong className="text-slate-800">{filteredStudents.length}</strong> học sinh
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <div key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-slate-400">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            currentPage === p
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:bg-white border border-transparent hover:border-[#E2E8F0]"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
