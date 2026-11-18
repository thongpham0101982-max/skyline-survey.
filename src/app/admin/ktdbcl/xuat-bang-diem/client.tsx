"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  FileSpreadsheet,
  Printer,
  Search,
  BookOpen,
  UserCheck,
  ShieldCheck,
  PenTool,
  Calendar,
  Building2,
  Users,
  Layers,
  CheckCircle2,
  Eye,
  Download,
  Sliders,
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import {
  StudentSurveyReportModal,
  REPORT_PERIOD_OPTIONS,
  REPORT_TEMPLATE_OPTIONS,
  ReportTemplateType,
} from "@/app/teacher/diem-lop-chu-nhiem/components/StudentSurveyReportModal"

interface ClassItem {
  id: string
  className: string
  grade: string
  academicYearId: string
  campusId: string
  campus?: { id: string; campusCode: string; campusName: string } | null
  homeroomTeacherId?: string | null
  homeroomTeacherName?: string
  studentCount?: number
}

interface XuatBangDiemAdminClientProps {
  academicYears: any[]
  activeYearId: string
  campuses: any[]
  classes: ClassItem[]
  isSubjectScoped?: boolean
}

function resolveGradeNumber(gradeStr?: string, className?: string): number {
  const fromGrade = String(gradeStr || "").match(/(\d+)/)
  if (fromGrade) return parseInt(fromGrade[1], 10)
  const fromName = String(className || "").match(/^(\d+)/)
  if (fromName) return parseInt(fromName[1], 10)
  return 0
}

function resolveLevelFromClass(cls: ClassItem): "TIEU_HOC" | "THCS" | "THPT" | "OTHER" {
  const num = resolveGradeNumber(cls.grade, cls.className)
  if (num >= 1 && num <= 5) return "TIEU_HOC"
  if (num >= 6 && num <= 9) return "THCS"
  if (num >= 10 && num <= 12) return "THPT"
  return "OTHER"
}

export function XuatBangDiemAdminClient({
  academicYears,
  activeYearId,
  campuses,
  classes,
  isSubjectScoped = false,
}: XuatBangDiemAdminClientProps) {
  const [selectedYearId, setSelectedYearId] = useState<string>(activeYearId || academicYears[0]?.id || "")
  const [selectedCampusId, setSelectedCampusId] = useState<string>("ALL")
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "TIEU_HOC" | "THCS" | "THPT">("ALL")
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("KSĐN")
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateType>("DETAILED_CONFIG")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showSubjectConfigPanel, setShowSubjectConfigPanel] = useState<boolean>(true)

  const [loading, setLoading] = useState<boolean>(false)
  const [reportData, setReportData] = useState<any>(null)

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [modalStudentId, setModalStudentId] = useState<string>("")

  // Filter classes by year, campus, level, grade
  const classesForYearAndCampus = useMemo(() => {
    return classes.filter((cls) => {
      if (selectedYearId && cls.academicYearId && cls.academicYearId !== selectedYearId) return false
      if (selectedCampusId !== "ALL" && cls.campusId !== selectedCampusId) return false
      if (selectedLevel !== "ALL" && resolveLevelFromClass(cls) !== selectedLevel) return false
      return true
    })
  }, [classes, selectedYearId, selectedCampusId, selectedLevel])

  const availableGrades = useMemo(() => {
    const nums = new Set<number>()
    classesForYearAndCampus.forEach((cls) => {
      const n = resolveGradeNumber(cls.grade, cls.className)
      if (n >= 1 && n <= 12) nums.add(n)
    })
    return Array.from(nums).sort((a, b) => a - b)
  }, [classesForYearAndCampus])

  const filteredClasses = useMemo(() => {
    return classesForYearAndCampus.filter((cls) => {
      if (selectedGrade !== "ALL") {
        const n = resolveGradeNumber(cls.grade, cls.className)
        if (String(n) !== selectedGrade) return false
      }
      return true
    })
  }, [classesForYearAndCampus, selectedGrade])

  // Keep selectedClassId valid when filters change
  useEffect(() => {
    if (filteredClasses.length === 0) {
      setSelectedClassId("")
      return
    }
    const exists = filteredClasses.some((c) => c.id === selectedClassId)
    if (!exists) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses, selectedClassId])

  // Auto-switch template when period changes to HK1/HK2/CN
  const handlePeriodChange = (periodCode: string) => {
    setSelectedPeriod(periodCode)
    if (["HK1", "HK2", "CN"].includes(periodCode)) {
      setSelectedTemplate("CIRCULAR_TERM")
    } else if (selectedTemplate === "CIRCULAR_TERM") {
      setSelectedTemplate("DETAILED_CONFIG")
    }
  }

  // Fetch class report card dataset from /api/teacher/homeroom-grades
  useEffect(() => {
    if (!selectedClassId) {
      setReportData(null)
      return
    }
    let cancelled = false
    const fetchClassGrades = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          evaluationPeriod: selectedPeriod,
          scope: "campus",
        })
        const res = await fetch(`/api/teacher/homeroom-grades?${params.toString()}`)
        const json = await res.json()
        if (!cancelled) {
          if (json.success) {
            setReportData(json.data || json)
          } else {
            toast.error(json.error || "Không thể tải dữ liệu bảng điểm lớp")
            setReportData(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Lỗi kết nối máy chủ khi tải bảng điểm")
          setReportData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchClassGrades()
    return () => {
      cancelled = true
    }
  }, [selectedClassId, selectedYearId, selectedPeriod])

  const currentClassObj = useMemo(
    () => filteredClasses.find((c) => c.id === selectedClassId) || null,
    [filteredClasses, selectedClassId]
  )

  const currentYearObj = useMemo(
    () => academicYears.find((y) => y.id === selectedYearId) || null,
    [academicYears, selectedYearId]
  )

  const periodOption = useMemo(
    () =>
      REPORT_PERIOD_OPTIONS.find((p) => p.code === selectedPeriod) || {
        code: selectedPeriod,
        label: `Kỳ đánh giá ${selectedPeriod}`,
      },
    [selectedPeriod]
  )

  const subjects: any[] = reportData?.subjects || []
  const students: any[] = reportData?.studentMatrix || []
  const homeroomSignatureProfile = reportData?.homeroomSignatureProfile || null
  const homeroomTeacherName =
    reportData?.classInfo?.homeroomTeacherName ||
    reportData?.homeroomTeacher?.teacherName ||
    currentClassObj?.homeroomTeacherName ||
    "Chưa phân công GVCN"

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (st: any) =>
        String(st.studentName || "").toLowerCase().includes(q) ||
        String(st.studentCode || "").toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  const classAverageScore = useMemo(() => {
    const validAvgs = students
      .map((st: any) => st.gpa ?? st.avgScore)
      .filter((v: any) => typeof v === "number" && !isNaN(v) && v > 0)
    if (validAvgs.length === 0) return null
    return Math.round((validAvgs.reduce((a: number, b: number) => a + b, 0) / validAvgs.length) * 10) / 10
  }, [students])

  const handleOpenStudentReport = (studentId?: string) => {
    const targetId = studentId || filteredStudents[0]?.studentId || students[0]?.studentId || ""
    setModalStudentId(targetId)
    setIsModalOpen(true)
  }

  const handleExportClassExcel = () => {
    if (!reportData || students.length === 0) {
      toast.error("Chưa có dữ liệu học sinh để xuất Excel")
      return
    }

    const wb = XLSX.utils.book_new()
    const className = reportData?.classInfo?.className || currentClassObj?.className || "Lop"
    const yearName = currentYearObj?.name || currentYearObj?.yearName || "2025-2026"

    // Sheet 1: Bảng tổng hợp điểm & nhận xét các môn theo Kỳ đánh giá
    const headerRow1 = [
      `BẢNG ĐIỂM MÔN HỌC - ${periodOption.label.toUpperCase()} | LỚP: ${className} | NĂM HỌC: ${yearName}`,
    ]
    const headerRow2 = [
      `GVCN: ${homeroomTeacherName} | Mẫu xuất: ${
        REPORT_TEMPLATE_OPTIONS.find((t) => t.code === selectedTemplate)?.shortLabel || ""
      }`,
    ]
    const tableHeaders: string[] = ["STT", "Mã học sinh", "Họ và tên học sinh", "Ngày sinh"]

    subjects.forEach((sub: any) => {
      const sName = sub.name || sub.subjectName || ""
      const gvbm = sub.teacherName || sub.config?.teacherName || "Chưa phân công"
      tableHeaders.push(`${sName} (${gvbm}) - Điểm/Mức đạt`)
      tableHeaders.push(`${sName} - Điểm thành phần`)
      tableHeaders.push(`${sName} - Nhận xét GVBM`)
    })
    tableHeaders.push("ĐTB các môn", "Nhận xét của GVCN")

    const rows = filteredStudents.map((st: any, idx: number) => {
      const row: any[] = [
        idx + 1,
        st.studentCode || "",
        st.studentName || "",
        st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "",
      ]
      subjects.forEach((sub: any) => {
        const sg = st.subjectGrades?.[sub.id]
        const scoreStr =
          sg?.score !== null && sg?.score !== undefined
            ? String(sg.score)
            : sg?.ratingValue
              ? String(sg.ratingValue)
              : ""
        const compStr =
          Array.isArray(sg?.formattedComponents) && sg.formattedComponents.length > 0
            ? sg.formattedComponents.map((fc: any) => `${fc.label}: ${fc.value}`).join(" | ")
            : ""
        const remarkStr = sg?.remark || ""
        row.push(scoreStr, compStr, remarkStr)
      })
      const stAvg = st.gpa ?? st.avgScore
      row.push(
        stAvg !== null && stAvg !== undefined && stAvg > 0 ? stAvg : "",
        st.teacherRemark || st.exchange?.teacherRemark || st.termSummary?.notes || st.termSummary?.generalRemark || ""
      )
      return row
    })

    const wsSummary = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, [], tableHeaders, ...rows])
    XLSX.utils.book_append_sheet(wb, wsSummary, `BangDiem_${selectedPeriod}`)

    // Sheet 2: Danh mục Môn học & GVBM giảng dạy theo Cấu hình kỳ
    const subjectConfigHeaders = [
      "STT",
      "Mã môn",
      "Tên môn học",
      "Giáo viên bộ môn (GVBM)",
      "Phương thức đánh giá kỳ này",
      "Các cột điểm thành phần",
      "Cột điểm tổng hợp",
      "Cột xếp loại / Mức đạt",
    ]
    const subjectConfigRows = subjects.map((sub: any, i: number) => {
      const cfg = sub.config || {}
      return [
        i + 1,
        sub.code || sub.subjectCode || "",
        sub.name || sub.subjectName || "",
        sub.teacherName || cfg.teacherName || "Chưa phân công",
        cfg.evaluationModeLabel || "Điểm số & Nhận xét",
        Array.isArray(cfg.columnNames) && cfg.columnNames.length > 0
          ? cfg.columnNames.join(", ")
          : "Theo cấu hình mặc định",
        cfg.hasCompositeColumn ? cfg.compositeColumnName || "ĐTB" : "Không dùng",
        cfg.hasRatingColumn ? cfg.ratingColumnName || "Mức đạt" : "Không dùng",
      ]
    })
    const wsSubjects = XLSX.utils.aoa_to_sheet([subjectConfigHeaders, ...subjectConfigRows])
    XLSX.utils.book_append_sheet(wb, wsSubjects, "CauHinhMon_GVBM")

    XLSX.writeFile(wb, `Bang_Diem_Mon_Hoc_${className}_${selectedPeriod}.xlsx`)
    toast.success(`Đã xuất file Excel Bảng điểm lớp ${className} (${periodOption.label})`)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">
      {/* Masthead Header — Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-l-4 border-[#003B3A] pl-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F0FDFA] text-[#003B3A] border border-teal-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#008B85]" />
                Sổ điểm - Nhận xét
              </span>
              {isSubjectScoped && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Phân quyền theo môn học phụ trách
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0F172A] tracking-tight mt-1">
              Xuất bảng điểm môn học & Ký số
            </h1>
            <p className="text-xs md:text-sm text-[#475569] mt-0.5">
              Kết xuất Bảng điểm môn học của Học sinh và cả Lớp gắn với Kỳ đánh giá / Học kỳ, hiển thị đầy đủ Các môn, GVBM giảng dạy, Điểm, Nhận xét theo đặc thù cấu hình môn và Chữ ký số GVCN.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportClassExcel}
              disabled={loading || students.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#003B3A] bg-[#F0FDFA] hover:bg-teal-100/80 border border-teal-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#008B85]" />
              Xuất Excel bảng điểm lớp
            </button>

            <button
              type="button"
              onClick={() => handleOpenStudentReport()}
              disabled={loading || students.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#004E4C] shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-[#5EEAD4]" />
              Xem trước, Ký số & In Bảng điểm (PDF / A4)
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar — Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Năm học */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Năm học</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#008B85]"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name || y.yearName} {y.status === "ACTIVE" ? "(Hiện tại)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cơ sở */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Cơ sở / Hệ thống</label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">Toàn hệ thống (Tất cả)</option>
              {campuses.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* Cấp học */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Cấp học</label>
            <div className="grid grid-cols-4 bg-[#F1F5F9] p-0.5 rounded-lg h-9">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "TIEU_HOC", label: "Tiểu học" },
                { id: "THCS", label: "THCS" },
                { id: "THPT", label: "THPT" },
              ].map((lv) => (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(lv.id as any)
                    setSelectedGrade("ALL")
                  }}
                  className={`text-[11px] font-semibold rounded-md transition-colors ${
                    selectedLevel === lv.id
                      ? "bg-white text-[#003B3A] shadow-2xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Khối lớp */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] tabular-nums focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">Tất cả các khối ({availableGrades.length})</option>
              {availableGrades.map((g) => (
                <option key={g} value={String(g)}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          {/* Lớp học */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Lớp học ({filteredClasses.length})
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-xs font-bold text-[#003B3A] tabular-nums focus:outline-none focus:border-[#008B85]"
            >
              {filteredClasses.length === 0 ? (
                <option value="">Không có lớp phù hợp</option>
              ) : (
                filteredClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} {cls.campus?.campusCode ? `(${cls.campus.campusCode})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Tìm học sinh */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Tìm học sinh</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mã hoặc họ tên học sinh..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#008B85]"
              />
            </div>
          </div>
        </div>

        {/* Kỳ đánh giá / Học kỳ & Mẫu điểm xuất */}
        <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-6">
            <label className="block text-xs font-medium text-[#475569] mb-1.5">
              Chọn Kỳ đánh giá / Học kỳ (gán với Bảng điểm môn học)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_PERIOD_OPTIONS.map((p) => {
                const active = selectedPeriod === p.code
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handlePeriodChange(p.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      active
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F0FDFA] hover:border-teal-300"
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-6">
            <label className="block text-xs font-medium text-[#475569] mb-1.5">
              Chọn Mẫu điểm xuất
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {REPORT_TEMPLATE_OPTIONS.map((tpl) => {
                const active = selectedTemplate === tpl.code
                return (
                  <button
                    key={tpl.code}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.code)}
                    className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                      active
                        ? "bg-[#F0FDFA] border-[#008B85] text-[#003B3A]"
                        : "bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="text-xs font-bold leading-snug">{tpl.shortLabel}</div>
                    <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">{tpl.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Ledger Strip — Class, GVCN, Digital Signature & Subject Config Summary */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
          <div className="p-3.5">
            <div className="text-xs text-[#64748B]">Lớp đang chọn</div>
            <div className="text-base font-bold text-[#003B3A] mt-0.5">
              {reportData?.classInfo?.className || currentClassObj?.className || "—"}
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              {reportData?.classInfo?.campusName || currentClassObj?.campus?.campusName || "Hệ thống Sky-Line"}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-[#64748B]">Giáo viên chủ nhiệm (GVCN)</div>
            <div className="text-sm font-bold text-[#0F172A] mt-0.5 truncate" title={homeroomTeacherName}>
              {homeroomTeacherName}
            </div>
            <div className="text-[11px] text-[#00736E] mt-0.5 font-medium">
              Phụ trách nhận xét & ký số bảng điểm
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-[#64748B]">Chữ ký số GVCN</div>
            <div className="mt-1">
              {homeroomSignatureProfile?.visualAppearanceUrl || homeroomSignatureProfile?.signatureImageUrl ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã cấu hình chữ ký số
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-[#D97706] border border-amber-200">
                  <PenTool className="w-3.5 h-3.5" />
                  Ký trực tiếp khi xuất
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-[#64748B]">Kỳ đánh giá / Học kỳ</div>
            <div className="text-sm font-bold text-[#003B3A] mt-0.5">{periodOption.label}</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              BẢNG ĐIỂM MÔN HỌC - {periodOption.label.toUpperCase()}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-xs text-[#64748B]">Sĩ số học sinh</div>
            <div className="text-base font-bold text-[#0F172A] mt-0.5">
              {filteredStudents.length} <span className="text-xs font-normal text-[#64748B]">/ {students.length} HS</span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              ĐTB lớp:{" "}
              <span className="font-semibold text-[#003B3A]">
                {classAverageScore !== null ? classAverageScore.toFixed(1) : "—"}
              </span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B]">Số môn theo cấu hình kỳ</span>
              <button
                type="button"
                onClick={() => setShowSubjectConfigPanel((v) => !v)}
                className="text-[11px] font-semibold text-[#008B85] hover:underline"
              >
                {showSubjectConfigPanel ? "Thu gọn" : "Xem chi tiết"}
              </button>
            </div>
            <div className="text-base font-bold text-[#003B3A] mt-0.5">
              {subjects.length} <span className="text-xs font-normal text-[#64748B]">môn học</span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Gắn GVBM & cấu hình cột điểm</div>
          </div>
        </div>

        {/* Collapsible Subject & GVBM Configuration Strip */}
        {showSubjectConfigPanel && subjects.length > 0 && (
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[#003B3A] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#008B85]" />
                Cấu hình các môn học & Giáo viên bộ môn (GVBM) giảng dạy thuộc kỳ {periodOption.label}
              </div>
              <span className="text-[11px] text-[#64748B]">
                Hiển thị trên Bảng điểm môn học của từng học sinh
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {subjects.map((sub: any) => {
                const cfg = sub.config || {}
                const gvbm = sub.teacherName || cfg.teacherName || "Chưa phân công"
                const cols =
                  Array.isArray(cfg.columnNames) && cfg.columnNames.length > 0
                    ? cfg.columnNames.join(", ")
                    : cfg.hasCompositeColumn
                      ? cfg.compositeColumnName || "Điểm tổng hợp"
                      : "Nhận xét / Mức đạt"
                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F172A]">{sub.name || sub.subjectName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 shrink-0">
                        {cfg.evaluationMode === "RATING_ONLY"
                          ? "Nhận xét / Mức đạt"
                          : cfg.evaluationMode === "SCORE_AND_RATING"
                            ? "Điểm & Mức đạt"
                            : "Điểm số & NX"}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#475569] flex items-center justify-between gap-2">
                      <span className="truncate" title={`GVBM: ${gvbm}`}>
                        GVBM: <strong className="text-[#0F172A]">{gvbm}</strong>
                      </span>
                      <span className="text-[10px] text-[#64748B] truncate max-w-[130px]" title={cols}>
                        Cột: {cols}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Student Report Card Ledger Table — Sky-Line Academic Ledger Table Standard */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#003B3A]">
              Danh sách học sinh & Bảng điểm môn học - {periodOption.label}
            </h2>
            <p className="text-xs text-[#64748B]">
              Nhấn &ldquo;Xem & Xuất Bảng điểm&rdquo; ở từng học sinh để xem chi tiết mẫu phiếu điểm A4, ký chữ ký số và in/xuất PDF.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569] tabular-nums">
            <span>
              Mẫu đang chọn:{" "}
              <strong className="text-[#003B3A]">
                {REPORT_TEMPLATE_OPTIONS.find((t) => t.code === selectedTemplate)?.shortLabel}
              </strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-3 px-3 text-center text-[11px] font-semibold text-white whitespace-nowrap w-12">
                  STT
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                  Mã học sinh
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">
                  Họ và tên học sinh
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                  Ngày sinh
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                  Số môn có kết quả
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                  ĐTB kỳ đánh giá
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap min-w-[320px]">
                  Các môn học, GVBM giảng dạy & Điểm / Mức đạt ({periodOption.code})
                </th>
                <th className="py-3 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap min-w-[220px]">
                  Nhận xét của GVCN
                </th>
                <th className="py-3 px-3 text-right text-[11px] font-semibold text-white whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#64748B]">
                    Đang tải dữ liệu Bảng điểm môn học của lớp...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#64748B]">
                    Không có học sinh nào trong lớp hoặc điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st: any, idx: number) => {
                  const subjectEntries = subjects.map((sub: any) => {
                    const sg = st.subjectGrades?.[sub.id]
                    const val =
                      sg?.score !== null && sg?.score !== undefined
                        ? sg.score
                        : sg?.ratingValue
                          ? sg.ratingValue
                          : null
                    return {
                      id: sub.id,
                      name: sub.name || sub.subjectName,
                      teacherName: sg?.teacherName || sub.teacherName || "Chưa gán",
                      val,
                      remark: sg?.remark || "",
                    }
                  })
                  const completedCount = subjectEntries.filter((e) => e.val !== null && e.val !== "").length
                  const stAvg = st.gpa ?? st.avgScore
                  const gvcnRemark =
                    st.teacherRemark ||
                    st.exchange?.teacherRemark ||
                    st.termSummary?.notes ||
                    st.termSummary?.generalRemark ||
                    ""

                  return (
                    <tr
                      key={st.studentId}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center font-medium text-[#64748B] align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-[#334155] align-middle whitespace-nowrap">
                        {st.studentCode}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A] align-middle whitespace-nowrap">
                        {st.studentName}
                      </td>
                      <td className="py-3 px-3 text-center text-[#475569] align-middle whitespace-nowrap">
                        {st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            completedCount === subjects.length && subjects.length > 0
                              ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                              : completedCount > 0
                                ? "bg-teal-50 text-[#00736E] border border-teal-200"
                                : "bg-slate-100 text-[#64748B]"
                          }`}
                        >
                          {completedCount}/{subjects.length} môn
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                        {stAvg !== null && stAvg !== undefined && stAvg > 0 ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              stAvg >= 8
                                ? "bg-emerald-50 text-[#059669]"
                                : stAvg >= 6.5
                                  ? "bg-[#F0FDFA] text-[#00736E]"
                                  : stAvg >= 5
                                    ? "bg-amber-50 text-[#D97706]"
                                    : "bg-rose-50 text-[#E11D48]"
                            }`}
                          >
                            {Number(stAvg).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {subjectEntries.slice(0, 6).map((se) => (
                            <span
                              key={se.id}
                              title={`Môn: ${se.name} | GVBM: ${se.teacherName}${se.remark ? ` | NX: ${se.remark}` : ""}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                                se.val !== null && se.val !== ""
                                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]"
                                  : "bg-slate-50 border-slate-200 text-[#94A3B8]"
                              }`}
                            >
                              <span className="font-medium text-[#475569]">{se.name}:</span>
                              <strong className="text-[#003B3A]">{se.val !== null && se.val !== "" ? se.val : "—"}</strong>
                            </span>
                          ))}
                          {subjectEntries.length > 6 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[#F0FDFA] text-[#00736E] font-semibold">
                              +{subjectEntries.length - 6} môn khác
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-[#334155] max-w-xs">
                        {gvcnRemark ? (
                          <p className="line-clamp-2 text-xs leading-relaxed" title={gvcnRemark}>
                            {gvcnRemark}
                          </p>
                        ) : (
                          <span className="text-[#94A3B8] italic">Chưa có nhận xét chung</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenStudentReport(st.studentId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#004E4C] transition-colors shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          Xem & Xuất Bảng điểm
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Student Report Card & Digital Signature Modal */}
      {isModalOpen && reportData && (
        <StudentSurveyReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialStudentId={modalStudentId}
          students={filteredStudents.length > 0 ? filteredStudents : students}
          subjects={subjects}
          currentClass={{
            id: selectedClassId,
            className: reportData?.classInfo?.className || currentClassObj?.className || "",
            grade: reportData?.classInfo?.grade || currentClassObj?.grade || "",
            campusName: reportData?.classInfo?.campusName || currentClassObj?.campus?.campusName || "",
          }}
          teacherName={homeroomTeacherName}
          academicYearName={
            reportData?.classInfo?.academicYearName || currentYearObj?.name || currentYearObj?.yearName || "2025 - 2026"
          }
          selectedPeriod={selectedPeriod}
          periodLabel={periodOption.label}
          onChangePeriod={(newP) => handlePeriodChange(newP)}
          initialTemplate={selectedTemplate}
          homeroomSignatureProfile={homeroomSignatureProfile}
        />
      )}
    </div>
  )
}
