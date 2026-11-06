"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import * as XLSX from "xlsx"
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Download,
  History,
  Target,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Compass,
  Award,
  ArrowRight,
  X,
  Building2,
  Layers,
  Users
} from "lucide-react"

interface UnifiedStudentProgressMatrixProps {
  role: "ADMIN" | "TEACHER"
  academicYearId?: string
  schoolYear?: string
  semester?: string
  defaultCampusId?: string
  defaultClassId?: string
  campusesList?: Array<{ id: string; campusName: string; campusCode?: string }>
  classesList?: Array<{ id: string; className: string; gradeLevel?: string; campusId?: string }>
  onNavigateToStudentTab?: (studentId: string, tabKey: string) => void
  onNavigateStudentAction?: (studentId: string, studentCode: string, targetTab: string) => void
}

const PROGRESS_OUTCOME_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  INSUFFICIENT_DATA: {
    label: "Chưa đủ dữ liệu đánh giá",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200"
  },
  NO_PROGRESS: {
    label: "Chưa ghi nhận tiến bộ",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200"
  },
  MAKING_PROGRESS: {
    label: "Có tiến bộ",
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200"
  },
  ACHIEVED: {
    label: "Đạt mục tiêu",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
}

const TLHN_WORKFLOW_LABELS: Record<string, string> = {
  DA_KHAO_SAT: "Đã khảo sát",
  CHO_PHAN_CONG: "Chờ phân công",
  CHO_TIEP_NHAN: "Chờ tiếp nhận",
  DANG_TU_VAN: "Đang tư vấn",
  DA_TU_VAN: "Đã tư vấn",
  NOT_APPLICABLE: "Không áp dụng"
}

export default function UnifiedStudentProgressMatrix({
  role,
  academicYearId,
  schoolYear,
  semester,
  defaultCampusId = "ALL",
  defaultClassId = "ALL",
  campusesList = [],
  classesList = [],
  onNavigateToStudentTab,
  onNavigateStudentAction
}: UnifiedStudentProgressMatrixProps) {
  const effectiveYear = academicYearId || schoolYear || "2025-2026"
  const [term, setTerm] = useState<"HK1" | "HK2">((semester === "HK2" ? "HK2" : "HK1"))
  const [campusId, setCampusId] = useState<string>(defaultCampusId || "ALL")
  const [gradeFilter, setGradeFilter] = useState<string>("ALL")
  const [classId, setClassId] = useState<string>(defaultClassId || "ALL")
  const [digestData, setDigestData] = useState<any>(null)
  const [dispatchingDigest, setDispatchingDigest] = useState<boolean>(false)
  const [digestToast, setDigestToast] = useState<string>("")
  const [showDigestDrawer, setShowDigestDrawer] = useState<boolean>(false)

  const [studentSearch, setStudentSearch] = useState<string>("")
  const [gvcnSearch, setGvcnSearch] = useState<string>("")
  const [companionSearch, setCompanionSearch] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("ALL")
  const [quickFilter, setQuickFilter] = useState<
    | "ALL"
    | "NO_GOAL"
    | "NO_CONSULT"
    | "WAITING_STUDENT_FEEDBACK"
    | "WAITING_COMPANION_EVAL"
    | "WAITING_ADVISOR_EVAL"
    | "NEEDS_SUPPORT"
    | "OVERDUE"
  >("ALL")

  const [loading, setLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<any[]>([])
  const [hierarchySummary, setHierarchySummary] = useState<any>({
    campuses: [],
    grades: [],
    classes: []
  })
  const [reportSummary, setReportSummary] = useState<any>({})
  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({})

  // Source data drawer / modal state
  const [sourceModalData, setSourceModalData] = useState<{
    title: string
    studentName: string
    studentCode: string
    className: string
    type: "GOALS" | "CONSULTS" | "FEEDBACK" | "GVBM" | "TLHN" | "ADVISOR" | "TIMELINE"
    row: any
  } | null>(null)

  useEffect(() => {
    if (defaultClassId && defaultClassId !== "ALL") {
      setClassId(defaultClassId)
    }
  }, [defaultClassId])

  const loadMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (effectiveYear) {
        params.set("academicYearId", effectiveYear)
        params.set("schoolYear", effectiveYear)
      }
      params.set("term", term)
      if (campusId && campusId !== "ALL") params.set("campusId", campusId)
      if (gradeFilter && gradeFilter !== "ALL") params.set("gradeLevel", gradeFilter)
      if (classId && classId !== "ALL") params.set("classId", classId)

      const [res, digestRes] = await Promise.all([
        fetch(`/api/advisory/progress-matrix?${params.toString()}`, {
          cache: "no-store"
        }),
        fetch(`/api/advisory/digest-reminders?${params.toString()}`, {
          cache: "no-store"
        }).catch(() => null)
      ])
      if (res.ok) {
        const data = await res.json()
        setRows(Array.isArray(data.rows) ? data.rows : [])
        setHierarchySummary(data.hierarchySummary || { campuses: [], grades: [], classes: [] })
        setReportSummary(data.reportSummary || {})
      }
      if (digestRes && digestRes.ok) {
        const dData = await digestRes.json()
        setDigestData(dData)
      }
    } catch (e) {
      console.error("Load progress matrix error:", e)
    } finally {
      setLoading(false)
    }
  }, [effectiveYear, term, campusId, gradeFilter, classId])

  useEffect(() => {
    loadMatrix()
  }, [loadMatrix])

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase().trim()
        if (
          !r.studentName?.toLowerCase().includes(q) &&
          !r.studentCode?.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (gvcnSearch.trim()) {
        const q = gvcnSearch.toLowerCase().trim()
        if (!r.homeroomTeacherName?.toLowerCase().includes(q)) return false
      }
      if (companionSearch.trim()) {
        const q = companionSearch.toLowerCase().trim()
        const gvbmNames = (r.gvbmEvaluationSummary?.items || [])
          .map((i: any) => i.assignedToTeacherName || "")
          .join(" ")
          .toLowerCase()
        const tlhnName = (r.tlhnEvaluationSummary?.teacherName || "").toLowerCase()
        if (!gvbmNames.includes(q) && !tlhnName.includes(q)) return false
      }
      if (categoryFilter !== "ALL") {
        if (!r.goalsSummary?.categories?.includes(categoryFilter)) return false
      }
      if (outcomeFilter !== "ALL") {
        if (r.progressOutcome !== outcomeFilter) return false
      }

      if (quickFilter === "NO_GOAL" && r.goalsSummary?.total > 0) return false
      if (quickFilter === "NO_CONSULT" && r.consultationSummary?.completedCount > 0) return false
      if (
        quickFilter === "WAITING_STUDENT_FEEDBACK" &&
        !r.studentFeedbackSummary?.waitingStudentFeedback
      ) {
        return false
      }
      if (quickFilter === "WAITING_COMPANION_EVAL") {
        const gvbmPending =
          r.gvbmEvaluationSummary?.applicable &&
          r.gvbmEvaluationSummary?.pendingTeachers?.length > 0
        const tlhnPending =
          r.tlhnEvaluationSummary?.applicable &&
          r.tlhnEvaluationSummary?.workflowStatus !== "DA_TU_VAN"
        if (!gvbmPending && !tlhnPending) return false
      }
      if (quickFilter === "WAITING_ADVISOR_EVAL" && r.advisorEvaluationSummary?.evaluated) {
        return false
      }
      if (quickFilter === "NEEDS_SUPPORT" && !r.needsSupport) return false
      if (quickFilter === "OVERDUE" && !r.isOverdue) return false

      return true
    })
  }, [
    rows,
    studentSearch,
    gvcnSearch,
    companionSearch,
    categoryFilter,
    outcomeFilter,
    quickFilter
  ])

  const quickCounts = useMemo(() => {
    return {
      ALL: rows.length,
      NO_GOAL: rows.filter(r => r.goalsSummary?.total === 0).length,
      NO_CONSULT: rows.filter(r => r.consultationSummary?.completedCount === 0).length,
      WAITING_STUDENT_FEEDBACK: rows.filter(r => r.studentFeedbackSummary?.waitingStudentFeedback)
        .length,
      WAITING_COMPANION_EVAL: rows.filter(
        r =>
          (r.gvbmEvaluationSummary?.applicable &&
            r.gvbmEvaluationSummary?.pendingTeachers?.length > 0) ||
          (r.tlhnEvaluationSummary?.applicable &&
            r.tlhnEvaluationSummary?.workflowStatus !== "DA_TU_VAN")
      ).length,
      WAITING_ADVISOR_EVAL: rows.filter(r => !r.advisorEvaluationSummary?.evaluated).length,
      NEEDS_SUPPORT: rows.filter(r => r.needsSupport).length,
      OVERDUE: rows.filter(r => r.isOverdue).length
    }
  }, [rows])

  function toggleExpandStudent(stId: string) {
    setExpandedStudentIds(prev => ({ ...prev, [stId]: !prev[stId] }))
  }

  async function handleDispatchDigest() {
    if (!digestData?.digestItems?.length || dispatchingDigest) return
    setDispatchingDigest(true)
    setDigestToast("")
    try {
      const res = await fetch("/api/advisory/digest-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: digestData.digestItems })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        setDigestToast(json.message || `Đã phát thông báo nhắc việc (${json.sentCount || 0} mục).`)
      } else {
        setDigestToast(json.error || "Không thể phát thông báo nhắc việc.")
      }
    } catch {
      setDigestToast("Lỗi kết nối khi phát bản tin nhắc việc.")
    } finally {
      setDispatchingDigest(false)
    }
  }

  function handleExportExcel() {
    const exportData = filteredRows.map((r, idx) => ({
      STT: idx + 1,
      "Mã học sinh": r.studentCode,
      "Họ và tên học sinh": r.studentName,
      "Lớp": r.className,
      "Cơ sở": r.campusName,
      "GVCN / CVHT": r.homeroomTeacherName,
      "Kỳ cố vấn": r.term,
      "Mục tiêu": `${r.goalsSummary.confirmed}/${r.goalsSummary.total} mục tiêu đã duyệt`,
      "Tư vấn 1:1": `${r.consultationSummary.completedCount} buổi hoàn thành`,
      "Tự đánh giá & Phản hồi HS":
        r.studentFeedbackSummary.pendingProcessCount > 0
          ? `${r.studentFeedbackSummary.pendingProcessCount} chờ xử lý`
          : `${r.studentFeedbackSummary.totalCount} phản hồi`,
      "GVBM đánh giá": r.gvbmEvaluationSummary.applicable
        ? `${r.gvbmEvaluationSummary.submittedCount}/${r.gvbmEvaluationSummary.totalCount} đã gửi`
        : "Không áp dụng",
      "GV TLHN đánh giá": r.tlhnEvaluationSummary.applicable
        ? `${TLHN_WORKFLOW_LABELS[r.tlhnEvaluationSummary.workflowStatus] || r.tlhnEvaluationSummary.workflowStatus} (${r.tlhnEvaluationSummary.teacherName || "Chưa gán"})`
        : "Không áp dụng",
      "GVCN/CVHT đánh giá": r.advisorEvaluationSummary.evaluated
        ? `Đã đánh giá (${r.advisorEvaluationSummary.rubricScore || "Đạt"})`
        : "Chờ đánh giá",
      "Kết quả tiến bộ": PROGRESS_OUTCOME_META[r.progressOutcome]?.label || r.progressOutcome,
      "Bước tiếp theo": r.nextStep?.label || ""
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "TheoDoiTienDoCoVan")
    XLSX.writeFile(wb, `Theo_Doi_Tien_Do_Co_Van_${term}.xlsx`)
  }

  return (
    <div className="space-y-4">
      {/* SECTION XI: ADMIN / MANAGER HIERARCHICAL SUMMARY & 7 REPORT METRICS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm sm:text-base font-bold text-[#003B3A]">
              Theo dõi tiến độ & tiến bộ học sinh ({term})
            </h3>
            <p className="text-xs text-slate-500">
              Một nguồn dữ liệu thống nhất hệ thống → cơ sở → khối → lớp → học sinh. Bấm vào từng ô trạng thái để xem dữ liệu nguồn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {(["HK1", "HK2"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    term === t
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Học kỳ {t === "HK1" ? "1" : "2"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadMatrix}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#008B85] ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDigestPanel(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer tabular-nums"
            >
              <Clock className="w-3.5 h-3.5 text-[#008B85]" />
              <span>
                Bản tin nhắc việc ({digestData?.digestSummary?.totalActionItems ?? 0}) & Xu hướng tiến bộ
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span>Xuất báo cáo Excel</span>
            </button>
          </div>
        </div>

        {/* 7 Báo cáo trọng tâm (Section XI) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 tabular-nums">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">1. Thiết lập mục tiêu</span>
            <span className="text-base font-bold text-[#003B3A]">
              {reportSummary.goalSetupCount || 0}/{reportSummary.totalStudents || 0} HS
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">2. Tư vấn 1:1</span>
            <span className="text-base font-bold text-[#00736E]">
              {reportSummary.consulted1on1Count || 0}/{reportSummary.totalStudents || 0} HS
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">3. Phản hồi & xử lý</span>
            <span className="text-base font-bold text-slate-800">
              {reportSummary.feedbackTotalCount || 0}
              <span className="text-xs font-medium text-amber-700 ml-1">
                ({reportSummary.feedbackPendingCount || 0} chờ)
              </span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">4. GVBM đồng hành</span>
            <span className="text-base font-bold text-slate-800">
              {reportSummary.gvbmCompletedStudents || 0}/{reportSummary.gvbmAssignedStudents || 0} HS
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">5. Luồng Holland • TLHN</span>
            <span className="text-base font-bold text-[#00736E]">
              {reportSummary.tlhnCompletedStudents || 0}/{reportSummary.hollandCompletedCount || 0} HS
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">6. Đánh giá GVCN</span>
            <span className="text-base font-bold text-emerald-700">
              {reportSummary.advisorEvaluatedCount || 0}/{reportSummary.totalStudents || 0} HS
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-800 block">7. Có tiến bộ / Đạt</span>
            <span className="text-base font-bold text-emerald-700">
              {(reportSummary.outcomeCounts?.MAKING_PROGRESS || 0) +
                (reportSummary.outcomeCounts?.ACHIEVED || 0)}{" "}
              HS
            </span>
          </div>
        </div>

        {/* Hierarchical rollup strip for Admin (Hệ thống -> Cơ sở -> Khối -> Lớp) */}
        {role === "ADMIN" && hierarchySummary.campuses?.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00736E]" />
                  <span>Tổng hợp theo cơ sở</span>
                </span>
                <span className="text-[11px] text-slate-500">Bấm chọn cơ sở để lọc</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 tabular-nums">
                {hierarchySummary.campuses.map((c: any) => (
                  <div
                    key={c.campusName}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">{c.campusName}</span>
                      <span className="text-[11px] text-slate-500">
                        Mục tiêu: {c.withGoals}/{c.totalStudents} • Tư vấn: {c.consulted}/{c.totalStudents}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                      Tiến bộ: {c.withProgress}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00736E]" />
                  <span>Tổng hợp theo khối lớp</span>
                </span>
                <span className="text-[11px] text-slate-500">Tiến độ & kết quả phát triển</span>
              </div>
              <div className="flex flex-wrap gap-2 tabular-nums">
                {hierarchySummary.grades.map((g: any) => (
                  <button
                    key={g.gradeLevel}
                    type="button"
                    onClick={() =>
                      setGradeFilter(prev => (prev === g.gradeLevel ? "ALL" : g.gradeLevel))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs text-left transition-all cursor-pointer ${
                      gradeFilter === g.gradeLevel
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold block">Khối {g.gradeLevel} ({g.totalStudents} HS)</span>
                    <span className="text-[10px] opacity-80">
                      MT: {g.withGoals} • TV: {g.consulted} • Đạt: {g.achieved}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BẢN TIN NHẮC VIỆC ĐẦU NGÀY & BIỂU ĐỒ XU HƯỚNG TIẾN BỘ ĐA MỐC (GIỮA KỲ 1 → CUỐI KỲ 2) */}
        {digestData && (
          <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#008B85]" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#003B3A]">
                    Xu hướng tiến bộ qua 4 mốc học kỳ & Bản tin nhắc việc tự động
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi sự dịch chuyển kết quả phát triển (Đạt mục tiêu / Có tiến bộ / Chưa ghi nhận tiến bộ / Chưa đủ dữ liệu) và phát thông báo nhắc việc thông minh (chống lặp 12h).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDigestPanel(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer tabular-nums"
                >
                  {showDigestPanel
                    ? "Thu gọn danh sách nhắc việc"
                    : `Xem chi tiết nhắc việc (${digestData.digestSummary?.totalActionItems || 0})`}
                </button>
                <button
                  type="button"
                  onClick={handleDispatchDigest}
                  disabled={dispatchingDigest || !digestData.digestItems?.length}
                  className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs tabular-nums"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>
                    {dispatchingDigest
                      ? "Đang gửi nhắc việc..."
                      : `Phát bản tin nhắc việc đầu ngày (${digestData.digestSummary?.totalActionItems || 0})`}
                  </span>
                </button>
              </div>
            </div>

            {digestToast && (
              <div className="px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-[#00736E]">
                {digestToast}
              </div>
            )}

            {/* 5 chỉ số Bản tin nhắc việc đầu ngày */}
            {digestData.digestSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 tabular-nums">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/90">
                  <div className="text-[11px] text-slate-500 font-medium">Holland chờ phân công TLHN</div>
                  <div className="text-sm font-bold text-[#003B3A] mt-0.5">
                    {digestData.digestSummary.hollandWaitingAssign} hồ sơ
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/90">
                  <div className="text-[11px] text-slate-500 font-medium">GVBM/TLHN chờ tiếp nhận</div>
                  <div className="text-sm font-bold text-[#00736E] mt-0.5">
                    {digestData.digestSummary.companionWaitingAccept} nhiệm vụ
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/90">
                  <div className="text-[11px] text-slate-500 font-medium">Nhiệm vụ đồng hành quá hạn</div>
                  <div className="text-sm font-bold text-rose-600 mt-0.5">
                    {digestData.digestSummary.companionOverdue} quá hạn
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/90">
                  <div className="text-[11px] text-slate-500 font-medium">Kết quả hỗ trợ chờ xác nhận</div>
                  <div className="text-sm font-bold text-amber-700 mt-0.5">
                    {digestData.digestSummary.companionWaitingVerify} chờ duyệt
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/90">
                  <div className="text-[11px] text-slate-500 font-medium">Phản hồi HS cần quan tâm</div>
                  <div className="text-sm font-bold text-rose-700 mt-0.5">
                    {digestData.digestSummary.feedbackNeedsAttention} phản hồi
                  </div>
                </div>
              </div>
            )}

            {/* Biểu đồ xu hướng tiến bộ qua 4 mốc kiểm tra & 4 nhóm mục tiêu */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 tabular-nums">
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003B3A]">
                    Xu hướng tiến bộ qua 4 mốc học kỳ (Giữa kỳ 1 → Cuối kỳ 2)
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-xs bg-emerald-600 inline-block" /> Đạt
                    </span>
                    <span className="flex items-center gap-1 text-[#00736E]">
                      <span className="w-2 h-2 rounded-xs bg-[#00A19A] inline-block" /> Tiến bộ
                    </span>
                    <span className="flex items-center gap-1 text-amber-700">
                      <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" /> Chưa tiến bộ
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {(digestData.checkpointTrends || []).map((cp: any) => {
                    const total = Math.max(cp.totalGoals || 0, 1)
                    const achievedPct = Math.round(((cp.achievedCount || 0) / total) * 100)
                    const progressPct = Math.round(((cp.makingProgressCount || 0) / total) * 100)
                    const noProgressPct = Math.round(((cp.noProgressCount || 0) / total) * 100)
                    return (
                      <div key={cp.checkpoint} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {cp.label}{" "}
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({cp.totalStudents} HS • {cp.totalGoals} mục tiêu)
                            </span>
                          </span>
                          <span className="text-[11px] font-bold text-[#00736E]">
                            Tích cực: {cp.positiveRate}% (Đạt: {cp.achievedCount} • Tiến bộ: {cp.makingProgressCount})
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/70">
                          {achievedPct > 0 && (
                            <div
                              style={{ width: `${achievedPct}%` }}
                              className="h-full bg-emerald-600"
                              title={`Đạt mục tiêu: ${cp.achievedCount}`}
                            />
                          )}
                          {progressPct > 0 && (
                            <div
                              style={{ width: `${progressPct}%` }}
                              className="h-full bg-[#00A19A]"
                              title={`Có tiến bộ: ${cp.makingProgressCount}`}
                            />
                          )}
                          {noProgressPct > 0 && (
                            <div
                              style={{ width: `${noProgressPct}%` }}
                              className="h-full bg-amber-500"
                              title={`Chưa ghi nhận tiến bộ: ${cp.noProgressCount}`}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003B3A]">
                    Phân bổ kết quả tiến bộ theo 4 nhóm mục tiêu chuẩn hóa
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Mức ban đầu → Hiện tại → Cần đạt</span>
                </div>
                <div className="space-y-2">
                  {(digestData.categoryTrends || []).map((cat: any) => {
                    const total = Math.max(cat.total || 0, 1)
                    const achievedPct = Math.round(((cat.achieved || 0) / total) * 100)
                    const progressPct = Math.round(((cat.makingProgress || 0) / total) * 100)
                    const noProgressPct = Math.round(((cat.noProgress || 0) / total) * 100)
                    const positivePct =
                      cat.total > 0
                        ? Math.round((((cat.achieved || 0) + (cat.makingProgress || 0)) / cat.total) * 100)
                        : 0
                    return (
                      <div key={cat.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {cat.label}{" "}
                            <span className="text-[11px] text-slate-400 font-normal">({cat.total} mục tiêu)</span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700">
                            {positivePct}% tiến bộ/đạt ({cat.achieved} đạt • {cat.makingProgress} tiến bộ)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/70">
                          {achievedPct > 0 && (
                            <div style={{ width: `${achievedPct}%` }} className="h-full bg-emerald-600" />
                          )}
                          {progressPct > 0 && (
                            <div style={{ width: `${progressPct}%` }} className="h-full bg-[#00A19A]" />
                          )}
                          {noProgressPct > 0 && (
                            <div style={{ width: `${noProgressPct}%` }} className="h-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Danh sách chi tiết Bản tin nhắc việc đầu ngày (khi bấm mở rộng) */}
            {showDigestPanel && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003B3A]">
                    Danh sách hạng mục ưu tiên trong Bản tin nhắc việc đầu ngày ({digestData.digestItems?.length || 0} mục)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tự động lọc các đầu việc quá hạn, chờ phân công TLHN, chờ GVBM tiếp nhận và phản hồi HS cần quan tâm
                  </span>
                </div>
                {!digestData.digestItems?.length ? (
                  <div className="text-xs text-slate-500 py-2">
                    Hiện không có hạng mục tồn đọng hoặc quá hạn cần nhắc việc.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {digestData.digestItems.slice(0, 25).map((item: any) => (
                      <div key={item.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                item.priority === "HIGH"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {item.priority === "HIGH" ? "Khẩn cấp" : "Cần chú ý"}
                            </span>
                            <span className="font-bold text-slate-800">{item.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.description} • Phụ trách:{" "}
                            <span className="font-semibold text-slate-700">{item.recipientName}</span>
                          </div>
                        </div>
                        {(onNavigateToStudentTab || onNavigateStudentAction) && item.studentId && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToStudentTab?.(item.studentId, item.targetTab || "companion_support")
                              onNavigateStudentAction?.(item.studentId, item.studentCode || "", item.targetTab || "companion_support")
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00736E] border border-teal-200 text-[11px] font-semibold cursor-pointer"
                          >
                            Mở xử lý →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bộ lọc chi tiết (Section VIII) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {role === "ADMIN" && campusesList.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cơ sở</label>
              <select
                value={campusId}
                onChange={e => setCampusId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
              >
                <option value="ALL">Tất cả cơ sở</option>
                {campusesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lớp học</label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">Tất cả lớp phụ trách</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm mục tiêu</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">Tất cả nhóm mục tiêu</option>
              <option value="HOC_TAP">1. Mục tiêu học tập</option>
              <option value="THOI_QUEN">2. Mục tiêu thói quen / Sức khỏe</option>
              <option value="KY_NANG_CAM_XUC">3. Kỹ năng & Cảm xúc</option>
              <option value="DINH_HUONG">4. Định hướng phát triển</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết quả tiến bộ</label>
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">Tất cả kết quả tiến bộ</option>
              <option value="INSUFFICIENT_DATA">Chưa đủ dữ liệu đánh giá</option>
              <option value="NO_PROGRESS">Chưa ghi nhận tiến bộ</option>
              <option value="MAKING_PROGRESS">Có tiến bộ</option>
              <option value="ACHIEVED">Đạt mục tiêu</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tìm học sinh</label>
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Tên hoặc mã HS..."
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lọc theo GVCN</label>
            <input
              type="text"
              value={gvcnSearch}
              onChange={e => setGvcnSearch(e.target.value)}
              placeholder="Tên GVCN..."
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lọc GV đồng hành</label>
            <input
              type="text"
              value={companionSearch}
              onChange={e => setCompanionSearch(e.target.value)}
              placeholder="Tên GVBM / TLHN..."
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            />
          </div>
        </div>

        {/* Bộ lọc nhanh (Section VIII Quick Filters) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 tabular-nums">
          {[
            { key: "ALL", label: "Tất cả học sinh", count: quickCounts.ALL },
            { key: "NO_GOAL", label: "Chưa có mục tiêu", count: quickCounts.NO_GOAL },
            { key: "NO_CONSULT", label: "Chưa tư vấn", count: quickCounts.NO_CONSULT },
            {
              key: "WAITING_STUDENT_FEEDBACK",
              label: "Chờ HS phản hồi",
              count: quickCounts.WAITING_STUDENT_FEEDBACK
            },
            {
              key: "WAITING_COMPANION_EVAL",
              label: "Chờ GV đánh giá",
              count: quickCounts.WAITING_COMPANION_EVAL
            },
            {
              key: "WAITING_ADVISOR_EVAL",
              label: "Chờ GVCN đánh giá",
              count: quickCounts.WAITING_ADVISOR_EVAL
            },
            { key: "NEEDS_SUPPORT", label: "Cần hỗ trợ thêm", count: quickCounts.NEEDS_SUPPORT },
            { key: "OVERDUE", label: "Quá hạn", count: quickCounts.OVERDUE }
          ].map(qf => {
            const active = quickFilter === qf.key
            return (
              <button
                key={qf.key}
                type="button"
                onClick={() => setQuickFilter(qf.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  active
                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{qf.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {qf.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* SECTION VIII: 9-COLUMN EXPANDABLE STUDENT PROGRESS MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 border-r border-slate-200/80 min-w-[210px]">
                  1. Học sinh, lớp, GVCN/CVHT
                </th>
                <th className="p-3 border-r border-slate-200/80 min-w-[130px]">2. Mục tiêu</th>
                <th className="p-3 border-r border-slate-200/80 min-w-[130px]">3. Tư vấn 1:1</th>
                <th className="p-3 border-r border-slate-200/80 min-w-[155px]">
                  4. Tự đánh giá và phản hồi HS
                </th>
                <th className="p-3 border-r border-slate-200/80 min-w-[155px]">5. GVBM đánh giá</th>
                <th className="p-3 border-r border-slate-200/80 min-w-[165px]">
                  6. GV TLHN đánh giá
                </th>
                <th className="p-3 border-r border-slate-200/80 min-w-[140px]">
                  7. GVCN/CVHT đánh giá
                </th>
                <th className="p-3 border-r border-slate-200/80 min-w-[150px]">
                  8. Kết quả tiến bộ
                </th>
                <th className="p-3 min-w-[195px]">9. Bước tiếp theo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 font-medium">
                    Đang tải dữ liệu theo dõi tiến độ học sinh...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 font-medium">
                    Không có học sinh nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map(r => {
                  const isExpanded = Boolean(expandedStudentIds[r.studentId])
                  const outcomeMeta =
                    PROGRESS_OUTCOME_META[r.progressOutcome] ||
                    PROGRESS_OUTCOME_META.INSUFFICIENT_DATA

                  return (
                    <React.Fragment key={r.studentId}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        {/* Col 1: Học sinh, lớp, GVCN/CVHT */}
                        <td className="p-3 border-r border-slate-200/80 align-top">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpandStudent(r.studentId)}
                              className="mt-0.5 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                              title="Mở rộng theo từng mục tiêu"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900">{r.studentName}</div>
                              <div className="text-[11px] text-slate-500">
                                Mã HS: <span className="font-semibold">{r.studentCode}</span> • Lớp{" "}
                                <span className="font-semibold text-[#003B3A]">{r.className}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                GVCN: <span className="font-medium text-slate-700">{r.homeroomTeacherName}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Mục tiêu */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Mục tiêu & Kế hoạch",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "GOALS",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          {r.goalsSummary.total === 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                              Chưa có mục tiêu
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                  r.goalsSummary.confirmed === r.goalsSummary.total
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {r.goalsSummary.confirmed}/{r.goalsSummary.total} mục tiêu đã xác nhận
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Bấm để mở {r.goalsSummary.total} mục tiêu
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Col 3: Tư vấn 1:1 */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Lịch sử Tư vấn 1:1",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "CONSULTS",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          {r.consultationSummary.completedCount === 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                                Chưa tư vấn 1:1
                              </span>
                              {r.consultationSummary.scheduledCount > 0 && (
                                <div className="text-[11px] text-[#00736E] font-medium">
                                  Đã lên lịch {r.consultationSummary.scheduledCount} buổi
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                                {r.consultationSummary.completedCount} buổi đã tư vấn
                              </span>
                              {r.consultationSummary.latestDate && (
                                <div className="text-[11px] text-slate-500">
                                  Gần nhất:{" "}
                                  {new Date(r.consultationSummary.latestDate).toLocaleDateString("vi-VN")}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Col 4: Tự đánh giá và phản hồi HS */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Tự đánh giá & Phản hồi học sinh",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "FEEDBACK",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          <div className="space-y-1">
                            {r.studentFeedbackSummary.needsAttention ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                Cần quan tâm ({r.studentFeedbackSummary.pendingProcessCount})
                              </span>
                            ) : r.studentFeedbackSummary.pendingProcessCount > 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                                {r.studentFeedbackSummary.pendingProcessCount} phản hồi chờ xử lý
                              </span>
                            ) : r.studentFeedbackSummary.waitingStudentFeedback ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[11px]">
                                Chờ HS phản hồi
                              </span>
                            ) : r.studentFeedbackSummary.totalCount > 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                                Đã xử lý ({r.studentFeedbackSummary.totalCount})
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[11px]">
                                Chưa gửi phản hồi
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Col 5: GVBM đánh giá */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Phối hợp & Đánh giá của GVBM",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "GVBM",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          {!r.gvbmEvaluationSummary.applicable ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[11px]">
                              Không áp dụng
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                    r.gvbmEvaluationSummary.submittedCount ===
                                    r.gvbmEvaluationSummary.totalCount
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  Đã gửi {r.gvbmEvaluationSummary.submittedCount}/
                                  {r.gvbmEvaluationSummary.totalCount}
                                </span>
                                {r.gvbmEvaluationSummary.hasOverdue && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                    Quá hạn
                                  </span>
                                )}
                              </div>
                              {r.gvbmEvaluationSummary.pendingTeachers.length > 0 && (
                                <div className="text-[11px] text-amber-800">
                                  Còn chờ: {r.gvbmEvaluationSummary.pendingTeachers.join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Col 6: GV TLHN đánh giá khi có phân công */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Định hướng Holland & GV Tổ TLHN",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "TLHN",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          {!r.tlhnEvaluationSummary.applicable && !r.tlhnEvaluationSummary.hasHollandSurvey ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[11px]">
                              Không áp dụng
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                  r.tlhnEvaluationSummary.workflowStatus === "DA_TU_VAN"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-teal-50 text-[#00736E] border-teal-200"
                                }`}
                              >
                                {TLHN_WORKFLOW_LABELS[r.tlhnEvaluationSummary.workflowStatus] ||
                                  "Chờ phân công"}
                              </span>
                              {r.tlhnEvaluationSummary.hollandCode && (
                                <div className="text-[11px] text-slate-600">
                                  Holland: <strong>{r.tlhnEvaluationSummary.hollandCode}</strong>
                                </div>
                              )}
                              {r.tlhnEvaluationSummary.teacherName && (
                                <div className="text-[11px] text-slate-500">
                                  GV: {r.tlhnEvaluationSummary.teacherName}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Col 7: GVCN/CVHT đánh giá */}
                        <td
                          onClick={() =>
                            setSourceModalData({
                              title: "Dữ liệu nguồn: Đánh giá của GVCN/CVHT",
                              studentName: r.studentName,
                              studentCode: r.studentCode,
                              className: r.className,
                              type: "ADVISOR",
                              row: r
                            })
                          }
                          className="p-3 border-r border-slate-200/80 align-top cursor-pointer hover:bg-teal-50/40"
                        >
                          {r.advisorEvaluationSummary.evaluated ? (
                            <div className="space-y-1">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                                Đã đánh giá{" "}
                                {r.advisorEvaluationSummary.rubricScore
                                  ? `(${r.advisorEvaluationSummary.rubricScore}/5.0)`
                                  : ""}
                              </span>
                              {r.advisorEvaluationSummary.overallComment && (
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  “{r.advisorEvaluationSummary.overallComment}”
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                              Chờ GVCN đánh giá
                            </span>
                          )}
                        </td>

                        {/* Col 8: Kết quả tiến bộ */}
                        <td className="p-3 border-r border-slate-200/80 align-top">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-md border font-bold text-[11px] ${outcomeMeta.badgeClass}`}
                          >
                            {outcomeMeta.label}
                          </span>
                        </td>

                        {/* Col 9: Bước tiếp theo & Xem hành trình cố vấn */}
                        <td className="p-3 align-top space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-[#003B3A] text-xs">
                              {r.nextStep?.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(onNavigateToStudentTab || onNavigateStudentAction) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const target = r.nextStep?.targetTab || "goals_plan"
                                  onNavigateToStudentTab?.(r.studentId, target)
                                  onNavigateStudentAction?.(r.studentId, r.studentCode, target)
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <span>Thực hiện</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setSourceModalData({
                                  title: "Hành trình cố vấn theo thời gian",
                                  studentName: r.studentName,
                                  studentCode: r.studentCode,
                                  className: r.className,
                                  type: "TIMELINE",
                                  row: r
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-slate-200"
                            >
                              <History className="w-3 h-3 text-[#00736E]" />
                              <span>Xem hành trình cố vấn</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ROW BY INDIVIDUAL GOAL (Section VIII & Section IX) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-4">
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#003B3A]">
                                  Chi tiết từng mục tiêu của học sinh {r.studentName} (Mức ban đầu → Kết quả hiện tại → Mức cần đạt)
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Tổng số: {r.goalsSummary.items.length} mục tiêu
                                </span>
                              </div>

                              {r.goalsSummary.items.length === 0 ? (
                                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
                                  Học sinh chưa thiết lập mục tiêu trong kỳ này.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {r.goalsSummary.items.map((g: any, gIdx: number) => {
                                    const gOut =
                                      PROGRESS_OUTCOME_META[g.progressOutcome] ||
                                      PROGRESS_OUTCOME_META.INSUFFICIENT_DATA
                                    return (
                                      <div
                                        key={g.id || gIdx}
                                        className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-bold">
                                            {g.categoryKey === "DINH_HUONG"
                                              ? "Định hướng phát triển"
                                              : g.category}
                                          </span>
                                          <span
                                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${gOut.badgeClass}`}
                                          >
                                            {gOut.label}
                                          </span>
                                        </div>

                                        <p className="text-xs font-bold text-slate-900">
                                          {g.targetText}
                                        </p>

                                        {/* Mức ban đầu -> Kết quả hiện tại -> Mức cần đạt */}
                                        <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]">
                                          <div>
                                            <span className="text-slate-400 block">Mức ban đầu</span>
                                            <span className="font-semibold text-slate-700">
                                              {g.baselineValue || "Đầu kỳ"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 block">Kết quả hiện tại</span>
                                            <span className="font-semibold text-[#00736E]">
                                              {g.currentResultText || "Đang theo dõi"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 block">Mức cần đạt</span>
                                            <span className="font-semibold text-emerald-700">
                                              {g.targetValue || g.targetText}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                          <span>
                                            Minh chứng: <strong>{g.evidenceText || "Đang bổ sung"}</strong>
                                          </span>
                                          <span>
                                            Cập nhật:{" "}
                                            {g.progressUpdatedAt
                                              ? new Date(g.progressUpdatedAt).toLocaleDateString("vi-VN")
                                              : "—"}
                                          </span>
                                        </div>

                                        {g.teacherComment && (
                                          <div className="text-[11px] text-slate-700 bg-teal-50/50 p-2 rounded-lg border border-teal-100">
                                            <strong>Nhận định CVHT:</strong> “{g.teacherComment}”
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SOURCE DATA & TIMELINE INSPECTOR MODAL (Section VIII & Section XI) */}
      {sourceModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-sm font-bold text-[#003B3A]">{sourceModalData.title}</h4>
                <p className="text-xs text-slate-500">
                  Học sinh: <strong>{sourceModalData.studentName}</strong> ({sourceModalData.studentCode}) • Lớp{" "}
                  {sourceModalData.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSourceModalData(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              {sourceModalData.type === "GOALS" && (
                <div className="space-y-2.5">
                  {sourceModalData.row.goalsSummary.items.length === 0 ? (
                    <p className="text-slate-500">Chưa có mục tiêu nào được ghi nhận.</p>
                  ) : (
                    sourceModalData.row.goalsSummary.items.map((g: any, i: number) => (
                      <div key={g.id || i} className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#003B3A]">{g.category}</span>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {g.signedByTeacher ? "Đã xác nhận" : "Chờ CVHT xác nhận"}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900">{g.targetText}</p>
                        <p className="text-slate-600">
                          Mức ban đầu: <strong>{g.baselineValue}</strong> → Hiện tại:{" "}
                          <strong>{g.currentResultText || "Đang thực hiện"}</strong> → Cần đạt:{" "}
                          <strong>{g.targetValue}</strong>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {sourceModalData.type === "CONSULTS" && (
                <div className="space-y-2.5">
                  {sourceModalData.row.consultationSummary.items.length === 0 ? (
                    <p className="text-slate-500">Chưa có biên bản tư vấn 1:1 nào.</p>
                  ) : (
                    sourceModalData.row.consultationSummary.items.map((c: any) => (
                      <div key={c.id} className="p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>
                            Ngày: {c.meetingDate ? new Date(c.meetingDate).toLocaleDateString("vi-VN") : "—"}
                          </span>
                          <span className="text-[#00736E]">{c.evaluatorName}</span>
                        </div>
                        <p className="text-slate-800">
                          <strong>Nội dung:</strong> {c.content}
                        </p>
                        {c.difficulties && (
                          <p className="text-slate-600">
                            <strong>Băn khoăn / Khó khăn:</strong> {c.difficulties}
                          </p>
                        )}
                        {c.nextActions && (
                          <p className="text-emerald-800">
                            <strong>Giải pháp & hành động:</strong> {c.nextActions}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {sourceModalData.type === "FEEDBACK" && (
                <div className="space-y-2.5">
                  {sourceModalData.row.studentFeedbackSummary.items.length === 0 ? (
                    <p className="text-slate-500">Học sinh chưa gửi phản hồi hoặc tự đánh giá nào.</p>
                  ) : (
                    sourceModalData.row.studentFeedbackSummary.items.map((f: any) => (
                      <div key={f.id} className="p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#003B3A]">
                            {f.feedbackType === "POST_CONSULTATION"
                              ? "A. Phản hồi sau tư vấn"
                              : "B. Tự đánh giá thực hiện mục tiêu"}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {f.advisorProcessStatus === "PROCESSED" ? "Đã xử lý" : "Chờ GVCN xử lý"}
                          </span>
                        </div>
                        <p className="text-slate-800">
                          {f.postConsultFeeling || f.actionsTakenText || "—"}
                        </p>
                        {(f.difficultiesText || f.supportRequestText || f.supportNeededText) && (
                          <p className="text-rose-700">
                            <strong>Đề nghị hỗ trợ / Khó khăn:</strong>{" "}
                            {f.supportRequestText || f.supportNeededText || f.difficultiesText}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {sourceModalData.type === "GVBM" && (
                <div className="space-y-2.5">
                  {sourceModalData.row.gvbmEvaluationSummary.items.length === 0 ? (
                    <p className="text-slate-500">Không có phân công GVBM hỗ trợ cho học sinh này.</p>
                  ) : (
                    sourceModalData.row.gvbmEvaluationSummary.items.map((t: any) => (
                      <div key={t.id} className="p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#003B3A]">
                            Môn {t.subjectName} — GV: {t.assignedToTeacherName}
                          </span>
                          <span className="font-semibold text-slate-600">{t.status}</span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Mục tiêu hỗ trợ:</strong> {t.supportGoal}
                        </p>
                        {t.gvbmProfessionalAssessment && (
                          <p className="text-emerald-800">
                            <strong>Nhận định GVBM:</strong> {t.gvbmProfessionalAssessment}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {sourceModalData.type === "TLHN" && (
                <div className="space-y-2.5">
                  {!sourceModalData.row.tlhnEvaluationSummary.record ? (
                    <p className="text-slate-500">
                      Học sinh chưa có hồ sơ phân công Tổ Tâm lý – Hướng nghiệp (TLHN).
                    </p>
                  ) : (
                    <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#003B3A]">
                          Mã Holland: {sourceModalData.row.tlhnEvaluationSummary.hollandCode || "—"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-[#00736E] font-bold">
                          {
                            TLHN_WORKFLOW_LABELS[
                              sourceModalData.row.tlhnEvaluationSummary.workflowStatus
                            ]
                          }
                        </span>
                      </div>
                      <p>
                        <strong>GV TLHN phụ trách:</strong>{" "}
                        {sourceModalData.row.tlhnEvaluationSummary.teacherName || "Chưa phân công"}
                      </p>
                      {sourceModalData.row.tlhnEvaluationSummary.record.tlhnDiscussionNotes && (
                        <p>
                          <strong>Nội dung tư vấn:</strong>{" "}
                          {sourceModalData.row.tlhnEvaluationSummary.record.tlhnDiscussionNotes}
                        </p>
                      )}
                      {sourceModalData.row.tlhnEvaluationSummary.record.agreedGoalText && (
                        <p className="text-emerald-800">
                          <strong>Mục tiêu định hướng thống nhất:</strong>{" "}
                          {sourceModalData.row.tlhnEvaluationSummary.record.agreedGoalText}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {sourceModalData.type === "ADVISOR" && (
                <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <p>
                    <strong>Trạng thái đánh giá GVCN:</strong>{" "}
                    {sourceModalData.row.advisorEvaluationSummary.evaluated
                      ? "Đã hoàn thành đánh giá"
                      : "Chưa đánh giá"}
                  </p>
                  {sourceModalData.row.advisorEvaluationSummary.rubricScore && (
                    <p>
                      <strong>Điểm trung bình Rubric (1–5):</strong>{" "}
                      {sourceModalData.row.advisorEvaluationSummary.rubricScore} / 5.0
                    </p>
                  )}
                  <p>
                    <strong>Nhận định tổng hợp:</strong>{" "}
                    {sourceModalData.row.advisorEvaluationSummary.overallComment || "Chưa có nhận xét"}
                  </p>
                </div>
              )}

              {sourceModalData.type === "TIMELINE" && (
                <div className="space-y-2.5">
                  {sourceModalData.row.timelineHistory.length === 0 ? (
                    <p className="text-slate-500">Chưa có lịch sử hành trình cố vấn được ghi nhận.</p>
                  ) : (
                    sourceModalData.row.timelineHistory.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {log.actorRole}
                            </span>
                            <span className="font-bold text-slate-900">
                              {log.actorName || log.actorId}
                            </span>
                          </div>
                          <p className="text-slate-700">{log.summary || log.action}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString("vi-VN")
                            : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              {onNavigateToStudentTab && (
                <button
                  type="button"
                  onClick={() => {
                    const stId = sourceModalData.row.studentId
                    const tTab = sourceModalData.row.nextStep?.targetTab || "goals_plan"
                    setSourceModalData(null)
                    onNavigateToStudentTab(stId, tTab)
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
                >
                  Mở không gian xử lý của học sinh
                </button>
              )}
              <button
                type="button"
                onClick={() => setSourceModalData(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
