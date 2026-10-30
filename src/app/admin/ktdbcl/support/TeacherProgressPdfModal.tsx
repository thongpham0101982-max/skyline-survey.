"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  X, Printer, Download, FileSpreadsheet,
  CheckCircle2, Clock, Brain, GraduationCap,
  Sparkles, Loader2, HeartHandshake, ShieldCheck,
  Building2, Calendar, Layers, AlertCircle, Filter
} from "lucide-react"
import toast from "react-hot-toast"
import {
  exportTeacherProgressReportExcel,
  findWeekEvaluation,
  findMonthEvaluations,
  parseEvaluationCommentSafe
} from "@/lib/support/exportTrackingBookExcel"
import { ACADEMIC_MONTHS, MONTH_WEEKS_CONFIG } from "@/app/teacher/ho-tro-hoc-tap/academic-calendar"

interface TeacherProgressPdfModalProps {
  isOpen: boolean
  onClose: () => void
  targets: any[]
  teacherStats?: any[]
  campuses?: any[]
  selectedCampusId?: string
  selectedTeacherId?: string
  currentTeacher?: any
  academicYearName?: string
  supportType?: "PSYCHOLOGICAL" | "ACADEMIC" | "ALL"
  initialMonth?: string
  initialPeriodMode?: "FULL" | "WEEKLY" | "MONTHLY"
}

export function TeacherProgressPdfModal({
  isOpen,
  onClose,
  targets = [],
  teacherStats = [],
  campuses = [],
  selectedCampusId = "ALL",
  selectedTeacherId = "ALL",
  currentTeacher: propCurrentTeacher = null,
  academicYearName = "2026-2027",
  supportType = "PSYCHOLOGICAL",
  initialMonth,
  initialPeriodMode = "FULL"
}: TeacherProgressPdfModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")
  const [activeCampusId, setActiveCampusId] = useState<string>(selectedCampusId || "ALL")
  const [activeTeacherId, setActiveTeacherId] = useState<string>(
    propCurrentTeacher?.id || propCurrentTeacher?.teacherId || selectedTeacherId || "ALL"
  )
  const [periodMode, setPeriodMode] = useState<"FULL" | "WEEKLY" | "MONTHLY">(initialPeriodMode)

  // Tự động nhận diện tháng gần nhất có dữ liệu đánh giá hoặc tháng hiện tại
  const detectedDefaultMonth = useMemo(() => {
    if (initialMonth && ACADEMIC_MONTHS.includes(initialMonth)) return initialMonth
    // Kiểm tra tháng có dữ liệu đánh giá nhiều nhất/gần nhất trong targets
    for (let i = ACADEMIC_MONTHS.length - 1; i >= 0; i--) {
      const m = ACADEMIC_MONTHS[i]
      const hasAny = targets.some(t => findMonthEvaluations(t.evaluations || [], m).length > 0)
      if (hasAny) return m
    }
    const curMonthNum = new Date().getMonth() + 1
    const curMonthLabel = `Tháng ${curMonthNum}`
    if (ACADEMIC_MONTHS.includes(curMonthLabel)) return curMonthLabel
    return "Tháng 10"
  }, [targets, initialMonth])

  const [activeMonth, setActiveMonth] = useState<string>(detectedDefaultMonth)

  // Đồng bộ state khi mở modal với props mới
  useEffect(() => {
    if (isOpen) {
      setActiveCampusId(selectedCampusId || "ALL")
      if (propCurrentTeacher?.id || propCurrentTeacher?.teacherId) {
        setActiveTeacherId(propCurrentTeacher.id || propCurrentTeacher.teacherId)
      } else {
        setActiveTeacherId(selectedTeacherId || "ALL")
      }
      setActiveMonth(detectedDefaultMonth)
    }
  }, [isOpen, selectedCampusId, selectedTeacherId, propCurrentTeacher, detectedDefaultMonth])

  // Helper lấy thông tin Cơ sở của target
  const getTargetCampusInfo = (t: any): { id: string; name: string } => {
    const cId =
      t.student?.class?.campusId ||
      t.student?.campusId ||
      t.campusId ||
      t.student?.class?.campus?.id ||
      ""
    const cName =
      t.student?.class?.campus?.campusName ||
      t.student?.campus?.campusName ||
      t.campusName ||
      (cId && campuses.find((c: any) => c.id === cId)?.campusName) ||
      "Sky-Line"
    return {
      id: cId || cName,
      name: cName
    }
  }

  // Helper lấy danh sách GV phụ trách của target
  const getTargetTeachers = (t: any): { id: string; name: string }[] => {
    if (t.assignments && Array.isArray(t.assignments) && t.assignments.length > 0) {
      const list = t.assignments
        .filter((a: any) => a.teacher)
        .map((a: any) => ({
          id: a.teacher.id || a.teacher.teacherName,
          name: a.teacher.teacherName || a.teacherName || "Chưa rõ"
        }))
      if (list.length > 0) return list
    }
    if (t.createdBy?.teacherName) {
      return [{ id: t.createdBy.id || t.createdBy.teacherName, name: t.createdBy.teacherName }]
    }
    if (t.counselorName) {
      return [{ id: t.counselorName, name: t.counselorName }]
    }
    if (propCurrentTeacher?.teacherName) {
      return [{ id: propCurrentTeacher.id || propCurrentTeacher.teacherName, name: propCurrentTeacher.teacherName }]
    }
    return [{ id: "UNASSIGNED", name: "Chưa phân công GV" }]
  }

  const getTargetTeacherNames = (t: any): string => {
    return getTargetTeachers(t).map(x => x.name).join(", ")
  }

  const isCommitmentTarget = (t: any): boolean => {
    if (!t) return false
    if (t.hasPsychCommitment) return true
    if (t.sourceType === "ADMISSION" || t.sourceType === "ASSESSMENT") return true
    const note = (t.notes || "").toLowerCase()
    const reason = (t.reason || "").toLowerCase()
    return note.includes("cam kết") || reason.includes("cam kết")
  }

  // Danh sách Cơ sở khả dụng trong bộ lọc
  const availableCampuses = useMemo(() => {
    const map = new Map<string, { id: string; campusName: string; count: number }>()
    campuses.forEach((c: any) => {
      if (c?.id) {
        map.set(c.id, { id: c.id, campusName: c.campusName, count: 0 })
      }
    })
    targets.forEach(t => {
      const cInfo = getTargetCampusInfo(t)
      // Tìm theo id hoặc tên cơ sở
      let existingKey = cInfo.id
      for (const [k, val] of map.entries()) {
        if (k === cInfo.id || val.campusName === cInfo.name) {
          existingKey = k
          break
        }
      }
      if (!map.has(existingKey)) {
        map.set(existingKey, { id: existingKey, campusName: cInfo.name, count: 0 })
      }
      const item = map.get(existingKey)!
      item.count++
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [campuses, targets])

  // Lọc targets theo Cơ sở đang chọn
  const campusFilteredTargets = useMemo(() => {
    if (!isOpen) return []
    if (activeCampusId === "ALL") return targets
    const selectedCampusObj = availableCampuses.find(c => c.id === activeCampusId)
    return targets.filter(t => {
      const cInfo = getTargetCampusInfo(t)
      return (
        cInfo.id === activeCampusId ||
        cInfo.name === activeCampusId ||
        (selectedCampusObj && cInfo.name === selectedCampusObj.campusName)
      )
    })
  }, [isOpen, targets, activeCampusId, availableCampuses])

  // Danh sách Giáo viên khả dụng (theo Cơ sở đang chọn)
  const availableTeachers = useMemo(() => {
    const map = new Map<string, { teacherId: string; teacherName: string; count: number }>()
    campusFilteredTargets.forEach(t => {
      const tchs = getTargetTeachers(t)
      tchs.forEach(tch => {
        if (!map.has(tch.id)) {
          map.set(tch.id, { teacherId: tch.id, teacherName: tch.name, count: 0 })
        }
        map.get(tch.id)!.count++
      })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [campusFilteredTargets])

  // Danh sách học sinh hiển thị cuối cùng (lọc theo cả Cơ sở và Giáo viên)
  const displayTargets = useMemo(() => {
    if (!isOpen) return []
    if (activeTeacherId === "ALL") return campusFilteredTargets
    const selectedTchObj = availableTeachers.find(t => t.teacherId === activeTeacherId)
    return campusFilteredTargets.filter(t => {
      const tchs = getTargetTeachers(t)
      return tchs.some(
        tch =>
          tch.id === activeTeacherId ||
          tch.name === activeTeacherId ||
          (selectedTchObj && tch.name === selectedTchObj.teacherName)
      )
    })
  }, [isOpen, campusFilteredTargets, activeTeacherId, availableTeachers])

  // Các tuần trong tháng đang chọn
  const weeksList = useMemo(() => {
    return MONTH_WEEKS_CONFIG[activeMonth] || ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]
  }, [activeMonth])

  // =========================================================================
  // TÍNH TOÁN BẢNG I: THỐNG KÊ THEO CƠ SỞ & TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ
  // =========================================================================
  const campusProgressStats = useMemo(() => {
    if (!isOpen) return []
    const map: Record<string, {
      campusId: string
      campusName: string
      count: number
      active: number
      terminated: number
      commitment: number
      teachers: Set<string>
      weekEvaluatedCounts: number[]
      monthEvaluatedCount: number
      totalEvals: number
    }> = {}

    // Nếu xem toàn hệ thống, khởi tạo tất cả cơ sở có dữ liệu
    const sourceTargets = activeTeacherId === "ALL" ? campusFilteredTargets : displayTargets

    sourceTargets.forEach(t => {
      const cInfo = getTargetCampusInfo(t)
      const key = cInfo.name
      if (!map[key]) {
        map[key] = {
          campusId: cInfo.id,
          campusName: cInfo.name,
          count: 0,
          active: 0,
          terminated: 0,
          commitment: 0,
          teachers: new Set(),
          weekEvaluatedCounts: weeksList.map(() => 0),
          monthEvaluatedCount: 0,
          totalEvals: 0
        }
      }
      const grp = map[key]
      grp.count++
      const isTerm = t.terminationStatus === "TERMINATED"
      if (isTerm) grp.terminated++
      else grp.active++
      if (isCommitmentTarget(t)) grp.commitment++

      getTargetTeachers(t).forEach(tch => {
        if (tch.id !== "UNASSIGNED") grp.teachers.add(tch.name)
      })

      const evals = t.evaluations || []
      grp.totalEvals += evals.length

      weeksList.forEach((w, wIdx) => {
        if (findWeekEvaluation(evals, w, activeMonth)) {
          grp.weekEvaluatedCounts[wIdx]++
        }
      })

      if (findMonthEvaluations(evals, activeMonth).length > 0) {
        grp.monthEvaluatedCount++
      }
    })

    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [isOpen, campusFilteredTargets, displayTargets, activeTeacherId, weeksList, activeMonth])

  // =========================================================================
  // TÍNH TOÁN BẢNG II: TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ CỦA GV THEO TUẦN & THÁNG
  // =========================================================================
  const teacherPeriodicStats = useMemo(() => {
    if (!isOpen) return []
    const map: Record<string, {
      teacherId: string
      teacherName: string
      campusSet: Set<string>
      count: number
      active: number
      terminated: number
      commitment: number
      weekEvaluatedCounts: number[]
      monthEvaluatedCount: number
      totalEvalsYear: number
      monthsWithEvalSet: Set<string>
    }> = {}

    displayTargets.forEach(t => {
      const tchs = getTargetTeachers(t)
      const cInfo = getTargetCampusInfo(t)
      const isTerm = t.terminationStatus === "TERMINATED"
      const isComm = isCommitmentTarget(t)
      const evals = t.evaluations || []

      tchs.forEach(tch => {
        if (!map[tch.id]) {
          map[tch.id] = {
            teacherId: tch.id,
            teacherName: tch.name,
            campusSet: new Set(),
            count: 0,
            active: 0,
            terminated: 0,
            commitment: 0,
            weekEvaluatedCounts: weeksList.map(() => 0),
            monthEvaluatedCount: 0,
            totalEvalsYear: 0,
            monthsWithEvalSet: new Set()
          }
        }
        const grp = map[tch.id]
        grp.count++
        if (cInfo.name) grp.campusSet.add(cInfo.name)
        if (isTerm) grp.terminated++
        else grp.active++
        if (isComm) grp.commitment++
        grp.totalEvalsYear += evals.length

        weeksList.forEach((w, wIdx) => {
          if (findWeekEvaluation(evals, w, activeMonth)) {
            grp.weekEvaluatedCounts[wIdx]++
          }
        })

        if (findMonthEvaluations(evals, activeMonth).length > 0) {
          grp.monthEvaluatedCount++
        }

        ACADEMIC_MONTHS.forEach(m => {
          if (findMonthEvaluations(evals, m).length > 0) {
            grp.monthsWithEvalSet.add(m.replace("Tháng ", "Th"))
          }
        })
      })
    })

    return Object.values(map)
      .map(item => ({
        ...item,
        campusList: Array.from(item.campusSet).join(", ") || "Sky-Line",
        monthsEvaluatedList: Array.from(item.monthsWithEvalSet).join(", ")
      }))
      .sort((a, b) => b.count - a.count)
  }, [isOpen, displayTargets, weeksList, activeMonth])

  if (!isOpen) return null

  const isAllCampus = activeCampusId === "ALL"
  const isAllTeacher = activeTeacherId === "ALL"
  const selectedCampusObj = !isAllCampus ? availableCampuses.find(c => c.id === activeCampusId || c.campusName === activeCampusId) : null
  const campusNameDisplay = selectedCampusObj ? selectedCampusObj.campusName : "Toàn hệ thống Sky-Line"

  const selectedTeacherObj = !isAllTeacher ? availableTeachers.find(t => t.teacherId === activeTeacherId) : null
  const teacherNameDisplay = selectedTeacherObj
    ? selectedTeacherObj.teacherName
    : propCurrentTeacher?.teacherName || "Tất cả Giáo viên / Chuyên viên"

  // Thống kê KPI tổng hợp
  const totalStudents = displayTargets.length
  const totalActive = displayTargets.filter(t => t.terminationStatus !== "TERMINATED").length
  const totalTerminated = displayTargets.filter(t => t.terminationStatus === "TERMINATED").length
  const termRate = totalStudents > 0 ? Math.round((totalTerminated / totalStudents) * 100) : 0
  const totalCommitment = displayTargets.filter(isCommitmentTarget).length
  const commitmentRate = totalStudents > 0 ? Math.round((totalCommitment / totalStudents) * 100) : 0
  const totalEvaluations = displayTargets.reduce((acc, t) => acc + (t.evaluations?.length || 0), 0)

  // Số HS được đánh giá định kỳ theo Tuần & Tháng trong activeMonth
  const weeklyEvaluatedStudents = displayTargets.filter(t =>
    weeksList.some(w => Boolean(findWeekEvaluation(t.evaluations || [], w, activeMonth)))
  ).length
  const totalWeeklyEvalLogs = displayTargets.reduce((sum, t) => {
    return sum + weeksList.filter(w => Boolean(findWeekEvaluation(t.evaluations || [], w, activeMonth))).length
  }, 0)

  const monthlyEvaluatedStudents = displayTargets.filter(
    t => findMonthEvaluations(t.evaluations || [], activeMonth).length > 0
  ).length
  const denominatorForEval = totalActive > 0 ? totalActive : (totalStudents || 1)
  const monthlyEvalRate = Math.min(100, Math.round((monthlyEvaluatedStudents / denominatorForEval) * 100))

  const teachersWithEvalInMonth = teacherPeriodicStats.filter(
    tch => tch.monthEvaluatedCount > 0 || tch.totalEvalsYear > 0
  ).length

  // Xử lý tải PDF
  const handleDownloadPdf = async () => {
    const element = document.getElementById("teacher-progress-report-pdf")
    if (!element) {
      window.print()
      return
    }

    setIsDownloading(true)
    const toastId = toast.loading("Đang khởi tạo Sổ PDF theo dõi đánh giá chuẩn A4...")

    try {
      const html2pdf = (await import("html2pdf.js")).default
      const safeCampus = isAllCampus ? "Toan_He_Thong" : campusNameDisplay.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_").slice(0, 20)
      const safeTeacher = isAllTeacher ? "Tat_Ca_GV" : teacherNameDisplay.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_").slice(0, 25)
      const safeMonth = activeMonth.replace(/\s+/g, "_")
      const safeYear = academicYearName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const filename = `So_PDF_Danh_Gia_${supportType === "PSYCHOLOGICAL" ? "Tam_Ly" : "Hoc_Tap"}_${safeCampus}_${safeTeacher}_${safeMonth}_${safeYear}.pdf`

      const opt: any = {
        margin: [6, 6, 6, 6],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success(`Đã xuất Sổ PDF: ${filename}`, { id: toastId, duration: 4000 })
    } catch (err) {
      console.error("html2pdf error, fallback to window.print:", err)
      toast.dismiss(toastId)
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  // Xử lý xuất Excel đồng bộ theo bộ lọc đang chọn
  const handleExportExcel = () => {
    try {
      const fileName = exportTeacherProgressReportExcel(displayTargets, {
        teacherId: activeTeacherId,
        teacherName: selectedTeacherObj?.teacherName,
        campusId: activeCampusId,
        campusName: selectedCampusObj?.campusName,
        academicYearName,
        selectedMonth: activeMonth,
        supportType
      })
      toast.success(`Đã xuất Sổ Excel: ${fileName}`)
    } catch (e: any) {
      toast.error(e?.message || "Lỗi xuất file Excel")
    }
  }

  // Helper rút gọn hiển thị mức độ đánh giá
  const formatShortLevel = (levelStr: string | undefined | null) => {
    if (!levelStr) return "—"
    const l = levelStr.trim()
    const lower = l.toLowerCase()
    if (lower.includes("đạt mục tiêu") || lower.includes("đã ổn định")) return "Ổn định / Đạt"
    if (lower.includes("có tiến bộ") || lower.includes("tiến bộ")) return "Có tiến bộ"
    if (lower.includes("duy trì")) return "Duy trì TD"
    if (lower.includes("chưa tiến bộ") || lower.includes("can thiệp") || lower.includes("chuyên sâu")) return "Cần can thiệp"
    return l.length > 18 ? l.slice(0, 16) + "…" : l
  }

  const getLevelColorClass = (levelStr: string | undefined | null) => {
    if (!levelStr || levelStr === "—" || levelStr === "Chưa ĐG") return "text-slate-400"
    const lower = levelStr.toLowerCase()
    if (lower.includes("ổn định") || lower.includes("đạt") || lower.includes("tốt")) return "text-emerald-700 font-bold"
    if (lower.includes("tiến bộ") || lower.includes("khá")) return "text-teal-700 font-bold"
    if (lower.includes("chưa") || lower.includes("can thiệp") || lower.includes("chuyên sâu")) return "text-rose-700 font-bold"
    return "text-amber-800 font-semibold"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #teacher-progress-report-pdf, #teacher-progress-report-pdf * {
            visibility: visible;
          }
          #teacher-progress-report-pdf {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 6mm;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          @page {
            size: A4 ${orientation};
            margin: 6mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-[1280px] w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">

        {/* =====================================================================
            MODAL CONTROL HEADER & FILTER BAR (NO-PRINT)
            ===================================================================== */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-[#003B3A] to-[#135E5B] text-white shrink-0 no-print space-y-3">
          {/* Top Row: Title & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15">
                <Brain className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black flex items-center gap-2 flex-wrap">
                  <span>Sổ PDF Theo Dõi Đánh Giá Tâm Lý Theo Cơ Sở &amp; Định Kỳ Tuần - Tháng</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[11px] font-extrabold">
                    {campusNameDisplay}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30 text-[11px] font-extrabold">
                    {teacherNameDisplay}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tổng hợp theo Cơ sở, tình trạng Giáo viên đánh giá định kỳ theo từng Tuần ({activeMonth}) và lộ trình 10 Tháng năm học
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bộ chọn khổ giấy */}
              <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15 text-[11px] font-bold text-slate-200">
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    orientation === "landscape" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                  }`}
                  title="Khổ giấy ngang A4 (Khuyên dùng cho bảng Tuần & 10 Tháng)"
                >
                  Khổ Ngang (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    orientation === "portrait" ? "bg-white text-slate-900 shadow-xs font-black" : "hover:text-white"
                  }`}
                  title="Khổ giấy dọc A4"
                >
                  Khổ Dọc (A4)
                </button>
              </div>

              {/* Nút Tải file PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="Tải trực tiếp tệp Sổ PDF về máy tính"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Đang tạo PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Tải Sổ PDF</span>
                  </>
                )}
              </button>

              {/* Nút In ấn / Print to PDF */}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                title="Mở hộp thoại In hoặc Lưu PDF chuẩn của trình duyệt"
              >
                <Printer className="w-4 h-4 text-teal-200" />
                <span>In / Lưu PDF</span>
              </button>

              {/* Nút Xuất Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Xuất Sổ Theo Dõi ra file Excel (.xlsx) gồm đầy đủ các Sheet Cơ sở, GV, Tuần, 10 Tháng"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Xuất Excel</span>
              </button>

              {/* Nút Đóng */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Interactive Filters for Campus, Teacher, Month & Period Mode */}
          <div className="pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-200 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Bộ lọc Sổ PDF:
              </span>

              {/* 1. Chọn Cơ sở */}
              <div className="flex items-center bg-white/10 rounded-xl px-2.5 py-1 border border-white/15 gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="text-[11px] text-slate-300 font-semibold">Cơ sở:</span>
                <select
                  value={activeCampusId}
                  onChange={e => {
                    setActiveCampusId(e.target.value)
                    setActiveTeacherId("ALL")
                  }}
                  className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="text-slate-900 font-bold">
                    Tất cả Cơ sở ({targets.length} HS)
                  </option>
                  {availableCampuses.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-900 font-semibold">
                      {c.campusName} ({c.count} HS)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Chọn Giáo viên / Chuyên viên */}
              <div className="flex items-center bg-white/10 rounded-xl px-2.5 py-1 border border-white/15 gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span className="text-[11px] text-slate-300 font-semibold">GV / Chuyên viên:</span>
                <select
                  value={activeTeacherId}
                  onChange={e => setActiveTeacherId(e.target.value)}
                  className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer max-w-[210px]"
                >
                  <option value="ALL" className="text-slate-900 font-bold">
                    Tất cả GV ({campusFilteredTargets.length} HS)
                  </option>
                  {availableTeachers.map(t => (
                    <option key={t.teacherId} value={t.teacherId} className="text-slate-900 font-semibold">
                      {t.teacherName} ({t.count} ca)
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Chọn Tháng đối chiếu định kỳ Tuần & Tháng */}
              <div className="flex items-center bg-white/10 rounded-xl px-2.5 py-1 border border-white/15 gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="text-[11px] text-slate-300 font-semibold">Kỳ đánh giá:</span>
                <select
                  value={activeMonth}
                  onChange={e => setActiveMonth(e.target.value)}
                  className="bg-transparent text-amber-200 font-black text-xs focus:outline-none cursor-pointer"
                >
                  {ACADEMIC_MONTHS.map(m => (
                    <option key={m} value={m} className="text-slate-900 font-semibold">
                      {m} ({MONTH_WEEKS_CONFIG[m]?.length || 4} tuần)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Chế độ hiển thị Sổ Định Kỳ Tuần / Tháng */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPeriodMode("FULL")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  periodMode === "FULL"
                    ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Trọn bộ (Tuần &amp; 10 Tháng)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode("WEEKLY")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  periodMode === "WEEKLY"
                    ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Định kỳ theo Tuần ({activeMonth})
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode("MONTHLY")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  periodMode === "MONTHLY"
                    ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Định kỳ 10 Tháng
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            MODAL BODY: A4 DOCUMENT PREVIEW
            ===================================================================== */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100/80 flex justify-center">

          {/* A4 PRINT CONTAINER */}
          <div
            id="teacher-progress-report-pdf"
            className="bg-white text-slate-900 p-6 sm:p-9 shadow-lg rounded-2xl border border-slate-200 w-full max-w-[1160px]"
            style={{ minHeight: "210mm", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            {/* 1. DOCUMENT HEADER */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3.5 mb-5 gap-4">
              <div className="space-y-0.5">
                <div className="text-[12px] font-black tracking-widest text-[#135E5B] uppercase">
                  HỆ THỐNG GIÁO DỤC SKY-LINE
                </div>
                <div className="text-[11px] font-extrabold text-slate-800 uppercase">
                  BAN KHẢO THÍ &amp; ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">
                  {isAllCampus
                    ? "TỔ TÂM LÝ HỌC ĐƯỜNG & HỖ TRỢ HỌC SINH TOÀN HỆ THỐNG"
                    : `ĐƠN VỊ CƠ SỞ: ${campusNameDisplay.toUpperCase()}`}
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[10px] font-bold text-slate-700 italic">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
              </div>
            </div>

            {/* 2. DOCUMENT TITLE */}
            <div className="text-center my-4">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                {supportType === "PSYCHOLOGICAL"
                  ? "SỔ THEO DÕI ĐÁNH GIÁ TÂM LÝ HỌC ĐƯỜNG THEO CƠ SỞ & ĐỊNH KỲ TUẦN - THÁNG"
                  : "SỔ THEO DÕI ĐÁNH GIÁ BỒI DƯỠNG HỌC TẬP THEO CƠ SỞ & ĐỊNH KỲ TUẦN - THÁNG"}
              </h1>
              <div className="text-xs sm:text-sm font-black text-[#135E5B] uppercase mt-1 tracking-wide">
                CƠ SỞ: {campusNameDisplay} &nbsp;|&nbsp; {isAllTeacher ? "PHẠM VI: TẤT CẢ GIÁO VIÊN / CHUYÊN VIÊN PHỤ TRÁCH" : `GIÁO VIÊN / CHUYÊN VIÊN: ${teacherNameDisplay}`}
              </div>
              <p className="text-[11px] text-slate-600 font-semibold mt-1">
                Năm học: <span className="font-extrabold text-slate-900">{academicYearName}</span>
                {" "}&bull;{" "}
                Kỳ đánh giá định kỳ: <span className="font-extrabold text-[#92400E]">{activeMonth} ({weeksList.join(", ")}) &amp; Lộ trình 10 Tháng</span>
                {" "}&bull;{" "}
                Tổng số hồ sơ: <span className="font-extrabold text-slate-900">{totalStudents} học sinh</span>
              </p>
            </div>

            {/* 3. TỔNG QUAN CHỈ SỐ KPI (6 CARDS) */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-center p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Tổng số HS theo dõi</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{totalStudents}</div>
                <div className="text-[9px] text-slate-500 font-semibold">
                  {totalActive} đang TD • {totalTerminated} xong
                </div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <div className="text-[10px] text-amber-800 font-extrabold uppercase">Diện Cam kết (CKĐV)</div>
                <div className="text-lg font-black text-amber-700 mt-0.5">{totalCommitment}</div>
                <div className="text-[9px] text-amber-700 font-semibold">{commitmentRate}% tổng số ca</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-indigo-200/80 shadow-2xs">
                <div className="text-[10px] text-indigo-900 font-extrabold uppercase">ĐG Định kỳ Tuần ({activeMonth})</div>
                <div className="text-lg font-black text-indigo-700 mt-0.5">
                  {weeklyEvaluatedStudents}<span className="text-xs font-bold text-slate-400">/{totalActive || totalStudents}</span>
                </div>
                <div className="text-[9px] text-indigo-600 font-semibold">{totalWeeklyEvalLogs} lượt ĐG tuần</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-teal-200/80 shadow-2xs">
                <div className="text-[10px] text-[#135E5B] font-extrabold uppercase">ĐG Định kỳ {activeMonth}</div>
                <div className="text-lg font-black text-[#135E5B] mt-0.5">
                  {monthlyEvaluatedStudents}<span className="text-xs font-bold text-slate-400">/{totalActive || totalStudents}</span>
                </div>
                <div className="text-[9px] text-teal-700 font-bold">{monthlyEvalRate}% HS đang TD</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-purple-200/80 shadow-2xs">
                <div className="text-[10px] text-purple-900 font-extrabold uppercase">GV Đánh giá Định kỳ</div>
                <div className="text-lg font-black text-purple-700 mt-0.5">
                  {teachersWithEvalInMonth}<span className="text-xs font-bold text-slate-400">/{teacherPeriodicStats.length} GV</span>
                </div>
                <div className="text-[9px] text-purple-600 font-semibold">{totalEvaluations} lượt ĐG năm</div>
              </div>

              <div className="text-center p-2 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
                <div className="text-[10px] text-emerald-800 font-extrabold uppercase">Đã chấm dứt TD</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">{totalTerminated}</div>
                <div className="text-[9px] text-emerald-700 font-bold">{termRate}% hoàn thành</div>
              </div>
            </div>

            {/* =====================================================================
                4. PHẦN I: THỐNG KÊ THEO CƠ SỞ & TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ TUẦN - THÁNG
                ===================================================================== */}
            <div className="mb-5 page-break-inside-avoid">
              <h2 className="text-[11px] font-black uppercase text-slate-900 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#135E5B]" />
                  I. Thống kê Theo dõi Đánh giá Tâm lý theo Cơ sở &amp; Tiến độ Đánh giá Định kỳ ({activeMonth})
                </span>
                <span className="text-[9px] font-semibold text-slate-500 normal-case">
                  Đối chiếu số học sinh đã được GV đánh giá theo từng Tuần và Tháng tại mỗi Cơ sở
                </span>
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center w-7">STT</th>
                    <th className="border border-slate-300 px-2 py-1.5">Cơ sở đào tạo</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Tổng HS</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Cam kết</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Đang TD</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Đã xong</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Số GV</th>
                    {weeksList.map((w, idx) => (
                      <th key={idx} className="border border-slate-300 px-1.5 py-1.5 text-center bg-indigo-50/60 text-indigo-950">
                        ĐG {w}
                      </th>
                    ))}
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center bg-teal-50/70 text-[#135E5B]">
                      Đã ĐG {activeMonth}
                    </th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center bg-rose-50/60 text-rose-900">
                      Chưa ĐG
                    </th>
                    <th className="border border-slate-300 px-2 py-1.5">Tình trạng Đánh giá Định kỳ tại Cơ sở</th>
                  </tr>
                </thead>
                <tbody>
                  {campusProgressStats.map((c, idx) => {
                    const pendingCount = Math.max(0, c.active - c.monthEvaluatedCount)
                    const evalRate = c.active > 0 ? Math.min(100, Math.round((c.monthEvaluatedCount / c.active) * 100)) : 100
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-extrabold text-slate-900">{c.campusName}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-black">{c.count}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-amber-700">{c.commitment}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-[#92400E]">{c.active}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-[#135E5B]">{c.terminated}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-semibold text-slate-700">{c.teachers.size}</td>
                        {c.weekEvaluatedCounts.map((wCnt, wIdx) => (
                          <td key={wIdx} className="border border-slate-300 px-1.5 py-1 text-center font-semibold">
                            <span className={wCnt > 0 ? "text-indigo-700 font-extrabold" : "text-slate-400"}>
                              {wCnt}/{c.active}
                            </span>
                          </td>
                        ))}
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-black text-[#135E5B] bg-teal-50/30">
                          {c.monthEvaluatedCount}/{c.active} ({evalRate}%)
                        </td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold">
                          {pendingCount > 0 ? (
                            <span className="text-rose-600 font-extrabold">{pendingCount} HS</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">0</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          {c.active === 0 ? (
                            <span className="text-[#135E5B] font-bold">Đã hoàn thành toàn bộ ca theo dõi</span>
                          ) : pendingCount === 0 ? (
                            <span className="text-emerald-700 font-extrabold">✓ Đã hoàn thành 100% ĐG định kỳ</span>
                          ) : c.monthEvaluatedCount > 0 ? (
                            <span className="text-amber-800 font-bold">
                              Đang ĐG định kỳ (còn {pendingCount} HS chưa cập nhật)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold">
                              Chưa cập nhật ĐG {activeMonth} ({c.active} HS đang chờ)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* =====================================================================
                5. PHẦN II: TÌNH TRẠNG ĐÁNH GIÁ ĐỊNH KỲ CỦA GIÁO VIÊN THEO TUẦN & THÁNG
                ===================================================================== */}
            <div className="mb-5 page-break-inside-avoid">
              <h2 className="text-[11px] font-black uppercase text-slate-900 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#135E5B]" />
                  II. Tình trạng Đánh giá Định kỳ của Giáo viên / Chuyên viên theo Tuần &amp; Tháng (Kỳ: {activeMonth})
                </span>
                <span className="text-[9px] font-semibold text-slate-500 normal-case">
                  Đánh giá trách nhiệm ghi nhận sổ định kỳ hàng tuần và hàng tháng của từng GV phụ trách
                </span>
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center w-7">STT</th>
                    <th className="border border-slate-300 px-2 py-1.5">Giáo viên / Chuyên viên</th>
                    <th className="border border-slate-300 px-2 py-1.5">Cơ sở</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Tổng ca</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Đang TD</th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">Đã xong</th>
                    {weeksList.map((w, idx) => (
                      <th key={idx} className="border border-slate-300 px-1.5 py-1.5 text-center bg-indigo-50/60 text-indigo-950">
                        {w}
                      </th>
                    ))}
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center bg-teal-50/70 text-[#135E5B]">
                      ĐG {activeMonth}
                    </th>
                    <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                      Các tháng đã ĐG
                    </th>
                    <th className="border border-slate-300 px-2 py-1.5">Tình trạng Đánh giá Định kỳ của GV</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherPeriodicStats.map((tch, idx) => {
                    const pendingCount = Math.max(0, tch.active - tch.monthEvaluatedCount)
                    const evalRate = tch.active > 0 ? Math.min(100, Math.round((tch.monthEvaluatedCount / tch.active) * 100)) : 100
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="border border-slate-300 px-2 py-1 font-extrabold text-slate-900">{tch.teacherName}</td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700 font-semibold">{tch.campusList}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-black">{tch.count}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-[#92400E]">{tch.active}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-[#135E5B]">{tch.terminated}</td>
                        {tch.weekEvaluatedCounts.map((wCnt, wIdx) => (
                          <td key={wIdx} className="border border-slate-300 px-1.5 py-1 text-center">
                            <span className={wCnt > 0 ? "font-extrabold text-indigo-700" : "text-slate-400"}>
                              {wCnt}/{tch.active}
                            </span>
                          </td>
                        ))}
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-black text-[#135E5B] bg-teal-50/30">
                          {tch.monthEvaluatedCount}/{tch.active} ({evalRate}%)
                        </td>
                        <td className="border border-slate-300 px-1.5 py-1 text-center text-slate-600 font-semibold">
                          {tch.monthsEvaluatedList || "Chưa ĐG"} ({tch.totalEvalsYear} lượt)
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          {tch.active === 0 && tch.terminated > 0 ? (
                            <span className="text-[#135E5B] font-extrabold">🏁 Đã hoàn thành 100% ca phụ trách</span>
                          ) : pendingCount === 0 && tch.active > 0 ? (
                            <span className="text-emerald-700 font-extrabold">✅ Đã ĐG đủ định kỳ ({tch.monthEvaluatedCount}/{tch.active} HS)</span>
                          ) : tch.monthEvaluatedCount > 0 ? (
                            <span className="text-amber-800 font-bold">
                              🟡 Đang ĐG định kỳ ({tch.monthEvaluatedCount}/{tch.active} HS • thiếu {pendingCount} HS)
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold">
                              🔴 Chưa cập nhật ĐG {activeMonth} (cần ĐG {tch.active} HS)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* =====================================================================
                6. PHẦN III: SỔ THEO DÕI CHI TIẾT ĐÁNH GIÁ HỌC SINH ĐỊNH KỲ THEO TUẦN
                ===================================================================== */}
            {(periodMode === "FULL" || periodMode === "WEEKLY") && (
              <div className="mb-6">
                <h2 className="text-[11px] font-black uppercase text-slate-900 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                    III. Sổ Theo dõi Chi tiết Kết quả Đánh giá Học sinh Định kỳ theo Tuần ({activeMonth})
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 normal-case">
                    Hiển thị kết quả đánh giá từng Tuần ({weeksList.join(", ")}), Tổng kết {activeMonth} và nhận xét chuyên môn của GV
                  </span>
                </h2>
                <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center w-7">STT</th>
                      <th className="border border-slate-300 px-2 py-1.5">Học sinh &amp; Mã HS</th>
                      <th className="border border-slate-300 px-1.5 py-1.5">Lớp / Cơ sở</th>
                      <th className="border border-slate-300 px-2 py-1.5">GV / Chuyên viên</th>
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center">Diện</th>
                      {weeksList.map((w, idx) => (
                        <th key={idx} className="border border-slate-300 px-1.5 py-1.5 text-center bg-indigo-50/70 text-indigo-950">
                          {w}
                        </th>
                      ))}
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center bg-amber-50/80 text-amber-950">
                        Tổng kết {activeMonth}
                      </th>
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                        Tình trạng GV ĐG
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5">Nhận xét &amp; Đánh giá gần nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTargets.map((t, idx) => {
                      const sName = t.student?.studentName || t.studentName || "Không rõ"
                      const sCode = t.student?.studentCode || t.studentCode || "—"
                      const className = (t.student?.class?.className || t.className || "—").split(/[_-]/)[0]
                      const cInfo = getTargetCampusInfo(t)
                      const teacherDisplay = getTargetTeacherNames(t)
                      const isTerm = t.terminationStatus === "TERMINATED"
                      const isCommitment = isCommitmentTarget(t)
                      const evals = t.evaluations || []

                      const weekEvals = weeksList.map(w => findWeekEvaluation(evals, w, activeMonth))
                      const monthEvals = findMonthEvaluations(evals, activeMonth)
                      const monthlySummaryEval =
                        monthEvals.find((e: any) => e.periodType === "MONTH" || !e.periodName?.includes("Tuần")) ||
                        monthEvals[monthEvals.length - 1]

                      const evaluatedWeeksCount = weekEvals.filter(Boolean).length
                      const hasMonthEval = Boolean(monthlySummaryEval)

                      const sortedEvals = [...evals].sort(
                        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      const latestEval = monthlySummaryEval || sortedEvals[0]
                      const parsedComment = latestEval ? parseEvaluationCommentSafe(latestEval.comment || "") : null
                      const commentText = parsedComment?.mainComment || latestEval?.comment || t.reason || t.notes || "—"

                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1">
                            <div className="font-bold text-slate-900">{sName}</div>
                            <div className="text-[8.5px] text-slate-500 font-mono">{sCode}</div>
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1">
                            <div className="font-bold text-slate-800">Lớp {className}</div>
                            <div className="text-[8.5px] text-[#135E5B] font-bold">{cInfo.name}</div>
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">
                            {teacherDisplay}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center">
                            {isCommitment ? (
                              <span className="font-extrabold text-amber-700 text-[8.5px]">⭐️ CKĐV</span>
                            ) : (
                              <span className="text-slate-500 text-[8.5px]">Thường kỳ</span>
                            )}
                          </td>

                          {/* Các cột Tuần 1..4/5 */}
                          {weekEvals.map((wEv, wIdx) => {
                            const lvl = wEv ? formatShortLevel(wEv.trackingLevel) : "Chưa ĐG"
                            return (
                              <td
                                key={wIdx}
                                className={`border border-slate-300 px-1 py-1 text-center text-[9px] ${getLevelColorClass(
                                  wEv ? wEv.trackingLevel : "Chưa ĐG"
                                )}`}
                              >
                                {lvl}
                              </td>
                            )
                          })}

                          {/* Cột Tổng kết Tháng */}
                          <td
                            className={`border border-slate-300 px-1.5 py-1 text-center bg-amber-50/20 text-[9px] ${getLevelColorClass(
                              monthlySummaryEval ? monthlySummaryEval.trackingLevel : "Chưa ĐG"
                            )}`}
                          >
                            {monthlySummaryEval ? formatShortLevel(monthlySummaryEval.trackingLevel) : "Chưa ĐG"}
                          </td>

                          {/* Cột Tình trạng ĐG của GV */}
                          <td className="border border-slate-300 px-1.5 py-1 text-center">
                            {isTerm && !hasMonthEval ? (
                              <span className="font-black text-[#135E5B] text-[8.5px] uppercase">Đã chấm dứt</span>
                            ) : evaluatedWeeksCount > 0 && hasMonthEval ? (
                              <span className="font-extrabold text-emerald-700 text-[8.5px]">
                                ✓ Đã ĐG ({evaluatedWeeksCount}T &amp; Tháng)
                              </span>
                            ) : evaluatedWeeksCount > 0 ? (
                              <span className="font-bold text-indigo-700 text-[8.5px]">
                                Đã ĐG {evaluatedWeeksCount}/{weeksList.length} tuần
                              </span>
                            ) : hasMonthEval ? (
                              <span className="font-bold text-teal-700 text-[8.5px]">✓ Đã ĐG Tháng</span>
                            ) : (
                              <span className="font-bold text-rose-600 text-[8.5px]">Chưa ĐG kỳ này</span>
                            )}
                          </td>

                          {/* Nhận xét gần nhất */}
                          <td className="border border-slate-300 px-2 py-1 text-slate-700 max-w-[240px]">
                            <div className="line-clamp-2 leading-snug text-[9px]">
                              {commentText}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* =====================================================================
                7. PHẦN IV: MA TRẬN THEO DÕI ĐÁNH GIÁ ĐỊNH KỲ 10 THÁNG NĂM HỌC
                ===================================================================== */}
            {(periodMode === "FULL" || periodMode === "MONTHLY") && (
              <div className="mb-6">
                <h2 className="text-[11px] font-black uppercase text-slate-900 tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#135E5B]" />
                    {periodMode === "FULL" ? "IV." : "III."} Sổ Theo dõi Tiến trình Đánh giá Định kỳ 10 Tháng Năm học (Tháng 8 &rarr; Tháng 5)
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 normal-case">
                    Tổng hợp xuyên suốt kết quả đánh giá định kỳ hàng tháng của GV từ đầu năm học đến nay
                  </span>
                </h2>
                <table className="w-full text-left border-collapse border border-slate-300 text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase">
                      <th className="border border-slate-300 px-1 py-1.5 text-center w-6">STT</th>
                      <th className="border border-slate-300 px-1.5 py-1.5">Học sinh</th>
                      <th className="border border-slate-300 px-1.5 py-1.5">Lớp / Cơ sở</th>
                      <th className="border border-slate-300 px-1.5 py-1.5">GV phụ trách</th>
                      {ACADEMIC_MONTHS.map((m, idx) => (
                        <th
                          key={idx}
                          className={`border border-slate-300 px-1 py-1.5 text-center ${
                            m === activeMonth ? "bg-amber-100/80 text-amber-950" : ""
                          }`}
                        >
                          {m.replace("Tháng ", "Th ")}
                        </th>
                      ))}
                      <th className="border border-slate-300 px-1 py-1.5 text-center">Số tháng ĐG</th>
                      <th className="border border-slate-300 px-1.5 py-1.5 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTargets.map((t, idx) => {
                      const sName = t.student?.studentName || t.studentName || "Không rõ"
                      const sCode = t.student?.studentCode || t.studentCode || "—"
                      const className = (t.student?.class?.className || t.className || "—").split(/[_-]/)[0]
                      const cInfo = getTargetCampusInfo(t)
                      const teacherDisplay = getTargetTeacherNames(t)
                      const isTerm = t.terminationStatus === "TERMINATED"
                      const evals = t.evaluations || []

                      let evaluatedMonthsCount = 0
                      const monthCells = ACADEMIC_MONTHS.map(m => {
                        const mEvals = findMonthEvaluations(evals, m)
                        if (mEvals.length > 0) {
                          evaluatedMonthsCount++
                          const latestInMonth = mEvals[mEvals.length - 1]
                          return latestInMonth.trackingLevel || "Đã ĐG"
                        }
                        return null
                      })

                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="border border-slate-300 px-1.5 py-1">
                            <span className="font-bold text-slate-900">{sName}</span>
                            <span className="text-[8px] text-slate-400 block font-mono">{sCode}</span>
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1">
                            <span className="font-bold text-slate-800">{className}</span>
                            <span className="text-[8px] text-[#135E5B] font-bold block">{cInfo.name}</span>
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 font-semibold text-slate-800">
                            {teacherDisplay}
                          </td>
                          {monthCells.map((cellVal, mIdx) => {
                            const isCurrentM = ACADEMIC_MONTHS[mIdx] === activeMonth
                            return (
                              <td
                                key={mIdx}
                                className={`border border-slate-300 px-1 py-1 text-center ${
                                  isCurrentM ? "bg-amber-50/40" : ""
                                } ${getLevelColorClass(cellVal || "—")}`}
                              >
                                {cellVal ? formatShortLevel(cellVal) : "—"}
                              </td>
                            )
                          })}
                          <td className="border border-slate-300 px-1 py-1 text-center font-black text-indigo-800">
                            {evaluatedMonthsCount}/10
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center">
                            {isTerm ? (
                              <span className="font-black text-[#135E5B] text-[8.5px] uppercase">Đã chấm dứt</span>
                            ) : (
                              <span className="font-bold text-[#92400E] text-[8.5px] uppercase">Đang TD</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 8. PHẦN KÝ TÊN VÀ PHÊ DUYỆT (SIGNATURES) */}
            <div className="grid grid-cols-4 gap-4 text-center mt-8 pt-5 border-t border-slate-300 text-xs page-break-inside-avoid">
              <div className="space-y-14">
                <div>
                  <div className="font-bold uppercase text-slate-800 text-[11px]">Người Lập Sổ / Chuyên Viên</div>
                  <div className="text-[9.5px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="font-extrabold text-slate-900 text-[11px]">
                  {!isAllTeacher ? teacherNameDisplay : "Chuyên viên Tâm lý / GVPT"}
                </div>
              </div>

              <div className="space-y-14">
                <div>
                  <div className="font-bold uppercase text-slate-800 text-[11px]">Tổ Trưởng Chuyên Môn</div>
                  <div className="text-[9.5px] text-slate-400 italic">(Ký, xác nhận định kỳ)</div>
                </div>
                <div className="font-extrabold text-slate-900 text-[11px]">
                  {supportType === "PSYCHOLOGICAL" ? "Tổ Tâm lý Học đường" : "Tổ Chuyên môn"}
                </div>
              </div>

              <div className="space-y-14">
                <div>
                  <div className="font-bold uppercase text-slate-800 text-[11px]">Ban Khảo Thí &amp; ĐBCL</div>
                  <div className="text-[9.5px] text-slate-400 italic">(Kiểm tra, rà soát tiến độ)</div>
                </div>
                <div className="font-extrabold text-slate-900 text-[11px]">
                  Ban Khảo thí &amp; ĐBCL
                </div>
              </div>

              <div className="space-y-14">
                <div>
                  <div className="font-bold uppercase text-slate-800 text-[11px]">Ban Giám Hiệu / Giám Đốc Cơ Sở</div>
                  <div className="text-[9.5px] text-slate-400 italic">(Ký tên, đóng dấu)</div>
                </div>
                <div className="font-extrabold text-[#135E5B] uppercase text-[11px]">
                  {isAllCampus ? "Hệ Thống Giáo Dục Sky-Line" : campusNameDisplay}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
