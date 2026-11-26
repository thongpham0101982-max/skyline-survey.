"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  Brain,
  FileDown,
  Home,
  LayoutGrid,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"
import toast from "react-hot-toast"
import {
  AcademicCommitmentReportPayload,
  ExchangeStudentReportPayload,
  HomeschoolingReportPayload,
  OverviewReportPayload,
  PsychologyCommitmentReportPayload,
  StudentStatisticsTab,
} from "@/lib/student-statistics/types"
import { AcademicCommitmentTab } from "./AcademicCommitmentTab"
import { ExchangeStudentTab } from "./ExchangeStudentTab"
import { HomeschoolingTab } from "./HomeschoolingTab"
import { OverviewTab } from "./OverviewTab"
import { PsychologyCommitmentTab } from "./PsychologyCommitmentTab"

interface ScopeMeta {
  roleDisplayLabel: string
  isCampusRestricted: boolean
  canViewAcademicTab: boolean
  canViewPsychologyTab: boolean
  canViewDetail: boolean
  canViewPsychologyComments: boolean
  canExportPdf: boolean
  isSummaryOnly: boolean
}

export function StudentStatisticsClient() {
  const [activeTab, setActiveTab] = useState<StudentStatisticsTab>("overview")

  // Shared filters
  const [academicYearId, setAcademicYearId] = useState("")
  const [campusId, setCampusId] = useState("ALL")
  const [classId, setClassId] = useState("ALL")

  // Tab 1 specific filters
  const [level, setLevel] = useState("ALL")
  const [grade, setGrade] = useState("ALL")
  const [committedSubject, setCommittedSubject] = useState("ALL")

  // Tab 2 specific filters
  const [month, setMonth] = useState("")
  const [teacherId, setTeacherId] = useState("ALL")

  // Tab 3 (Homeschooling) & Tab 4 (Exchange) specific filters
  const [hsSubject, setHsSubject] = useState("ALL")
  const [hsCommitmentFilter, setHsCommitmentFilter] = useState<"ALL" | "COMMITTED" | "NON_COMMITTED">("ALL")
  const [exchangeSubject, setExchangeSubject] = useState("ALL")

  // State
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [scope, setScope] = useState<ScopeMeta | null>(null)
  const [academicData, setAcademicData] = useState<AcademicCommitmentReportPayload | null>(null)
  const [psychData, setPsychData] = useState<PsychologyCommitmentReportPayload | null>(null)
  const [hsData, setHsData] = useState<HomeschoolingReportPayload | null>(null)
  const [exchangeData, setExchangeData] = useState<ExchangeStudentReportPayload | null>(null)
  const [overviewData, setOverviewData] = useState<OverviewReportPayload | null>(null)

  const initializedRef = useRef(false)

  const buildQueryString = useCallback(
    (tab: StudentStatisticsTab) => {
      const sp = new URLSearchParams()
      sp.set("tab", tab)
      if (academicYearId) sp.set("academicYearId", academicYearId)
      if (campusId && campusId !== "ALL") sp.set("campusId", campusId)
      if (classId && classId !== "ALL") sp.set("classId", classId)

      if (tab === "overview") {
        // Overview uses academicYearId & campusId
      } else if (tab === "academic") {
        if (level && level !== "ALL") sp.set("level", level)
        if (grade && grade !== "ALL") sp.set("grade", grade)
        if (committedSubject && committedSubject !== "ALL") {
          sp.set("committedSubject", committedSubject)
        }
      } else if (tab === "homeschooling") {
        if (level && level !== "ALL") sp.set("level", level)
        if (grade && grade !== "ALL") sp.set("grade", grade)
        if (hsSubject && hsSubject !== "ALL") sp.set("subject", hsSubject)
        if (hsCommitmentFilter !== "ALL") sp.set("commitmentFilter", hsCommitmentFilter)
      } else if (tab === "exchange") {
        if (level && level !== "ALL") sp.set("level", level)
        if (grade && grade !== "ALL") sp.set("grade", grade)
        if (exchangeSubject && exchangeSubject !== "ALL") sp.set("subject", exchangeSubject)
      } else {
        if (month) sp.set("month", month)
        if (teacherId && teacherId !== "ALL") sp.set("teacherId", teacherId)
      }
      return sp.toString()
    },
    [
      academicYearId,
      campusId,
      classId,
      level,
      grade,
      committedSubject,
      hsSubject,
      hsCommitmentFilter,
      exchangeSubject,
      month,
      teacherId,
    ]
  )

  const fetchData = useCallback(
    async (tab: StudentStatisticsTab) => {
      setLoading(true)
      setError(null)
      try {
        const qs = buildQueryString(tab)
        const res = await fetch(`/api/admin/student-statistics?${qs}`, {
          cache: "no-store",
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Không thể tải dữ liệu Báo cáo thống kê học sinh")
        }

        if (json.scope) setScope(json.scope)

        if (tab === "overview") {
          const payload = json.data as OverviewReportPayload
          setOverviewData(payload)
          if (!initializedRef.current) {
            initializedRef.current = true
            if (payload.filters.academicYearId) setAcademicYearId(payload.filters.academicYearId)
            if (payload.filters.campusId) setCampusId(payload.filters.campusId)
          }
        } else if (tab === "academic") {
          const payload = json.data as AcademicCommitmentReportPayload
          setAcademicData(payload)
          if (!initializedRef.current) {
            initializedRef.current = true
            if (payload.filters.academicYearId) setAcademicYearId(payload.filters.academicYearId)
            if (payload.filters.campusId) setCampusId(payload.filters.campusId)
          }
        } else if (tab === "homeschooling") {
          const payload = json.data as HomeschoolingReportPayload
          setHsData(payload)
          if (!initializedRef.current) {
            initializedRef.current = true
            if (payload.filters.academicYearId) setAcademicYearId(payload.filters.academicYearId)
            if (payload.filters.campusId) setCampusId(payload.filters.campusId)
          }
        } else if (tab === "exchange") {
          const payload = json.data as ExchangeStudentReportPayload
          setExchangeData(payload)
          if (!initializedRef.current) {
            initializedRef.current = true
            if (payload.filters.academicYearId) setAcademicYearId(payload.filters.academicYearId)
            if (payload.filters.campusId) setCampusId(payload.filters.campusId)
          }
        } else {
          const payload = json.data as PsychologyCommitmentReportPayload
          setPsychData(payload)
          if (!month && payload.filters.month) {
            setMonth(payload.filters.month)
          }
          if (!initializedRef.current) {
            initializedRef.current = true
            if (payload.filters.academicYearId) setAcademicYearId(payload.filters.academicYearId)
            if (payload.filters.campusId) setCampusId(payload.filters.campusId)
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải báo cáo")
      } finally {
        setLoading(false)
      }
    },
    [buildQueryString, month]
  )

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const handleExportPdf = async () => {
    setExportingPdf(true)
    setPdfError(null)
    try {
      const qs = buildQueryString(activeTab)
      const res = await fetch(`/api/admin/student-statistics/export-pdf?${qs}`, {
        method: "GET",
        cache: "no-store",
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Không thể xuất file PDF. Vui lòng thử lại.")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") || ""
      const fileMatch = disposition.match(/filename="?([^"]+)"?/i)
      const fileName = fileMatch?.[1] || `Bao_cao_thong_ke_hoc_sinh_${activeTab}.pdf`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Xuất báo cáo PDF thành công")
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Lỗi khi xuất PDF. Bộ lọc hiện tại vẫn được giữ nguyên."
      setPdfError(message)
      toast.error(message)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleCampusChange = (nextCampusId: string) => {
    setCampusId(nextCampusId)
    setClassId("ALL")
    setTeacherId("ALL")
  }

  const handleSelectClass = (nextCampusId: string, nextClassId: string) => {
    setCampusId(nextCampusId)
    setClassId(nextClassId)
  }

  const handleJumpToTab = (tab: StudentStatisticsTab, nextCampusId?: string, nextClassId?: string) => {
    if (nextCampusId) setCampusId(nextCampusId)
    if (nextClassId) setClassId(nextClassId)
    setActiveTab(tab)
    setPdfError(null)
  }

  const handleYearChange = (nextYearId: string) => {
    setAcademicYearId(nextYearId)
    setClassId("ALL")
    setGrade("ALL")
    setCommittedSubject("ALL")
    setTeacherId("ALL")
  }

  const availableYears =
    activeTab === "overview"
      ? overviewData?.availableFilters.academicYears || []
      : activeTab === "academic"
        ? academicData?.availableFilters.academicYears || []
        : activeTab === "homeschooling"
          ? hsData?.availableFilters.academicYears || []
          : activeTab === "exchange"
            ? exchangeData?.availableFilters.academicYears || []
            : psychData?.availableFilters.academicYears || []

  const availableCampuses =
    activeTab === "overview"
      ? overviewData?.availableFilters.campuses || []
      : activeTab === "academic"
        ? academicData?.availableFilters.campuses || []
        : activeTab === "homeschooling"
          ? hsData?.availableFilters.campuses || []
          : activeTab === "exchange"
            ? exchangeData?.availableFilters.campuses || []
            : psychData?.availableFilters.campuses || []

  const isSingleCampusLocked = Boolean(scope?.isCampusRestricted && availableCampuses.length <= 1)

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">
      {/* 1. Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 border-l-4 border-l-[#003B3A]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#00736E]">
              Phân tích tổng hợp · Hệ thống Giáo dục Sky-Line
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#003B3A] mt-0.5">
              Báo cáo thống kê học sinh
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi tiến độ học sinh cam kết đầu vào theo môn học và tiến độ đánh giá tâm lý cam kết đầu vào.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {scope && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-teal-200 text-xs font-medium text-[#003B3A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00A19A]" />
                <span>{scope.roleDisplayLabel}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fetchData(activeTab)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || loading || scope?.canExportPdf === false}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002b2a] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {exportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{exportingPdf ? "Đang xuất PDF..." : "Xuất PDF"}</span>
            </button>
          </div>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview")
              setPdfError(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A] border border-[#E2E8F0]"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("academic")
              setPdfError(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "academic"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A] border border-[#E2E8F0]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Học sinh cam kết đầu vào theo môn học</span>
          </button>

          {scope?.canViewPsychologyTab !== false && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("psychology")
                setPdfError(null)
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "psychology"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A] border border-[#E2E8F0]"
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Tâm lý cam kết đầu vào</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab("homeschooling")
              setPdfError(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "homeschooling"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A] border border-[#E2E8F0]"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Học sinh Homeschooling</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("exchange")
              setPdfError(null)
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "exchange"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A] border border-[#E2E8F0]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Học sinh học giao lưu</span>
          </button>
        </div>
      </div>

      {/* PDF Error banner (keeps filters intact) */}
      {pdfError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{pdfError}</span>
          </div>
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 shrink-0"
          >
            Thử xuất lại
          </button>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Năm học */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Năm học</label>
            <select
              value={academicYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {availableYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Hiện hành)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tháng (Tab 2) */}
          {activeTab === "psychology" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tháng / Chế độ xem
              </label>
              <select
                value={month || psychData?.filters.month || ""}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
              >
                <option value="ALL_YEAR">Tổng hợp cả năm học</option>
                {(psychData?.availableFilters.months || []).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cơ sở */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Cơ sở / Phạm vi
            </label>
            <select
              value={campusId}
              disabled={isSingleCampusLocked}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A] disabled:bg-slate-50 disabled:text-slate-500"
            >
              {!scope?.isCampusRestricted && <option value="ALL">Toàn hệ thống</option>}
              {availableCampuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName} ({c.campusCode})
                </option>
              ))}
            </select>
          </div>

          {/* Tab 1 filters: Bậc học, Khối, Lớp, Môn cam kết */}
          {activeTab === "academic" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bậc học</label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value)
                    setGrade("ALL")
                    setClassId("ALL")
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả bậc học</option>
                  {(academicData?.availableFilters.levels || []).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Khối</label>
                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value)
                    setClassId("ALL")
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả khối</option>
                  {(academicData?.availableFilters.grades || []).map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.label} ({g.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lớp</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {(academicData?.availableFilters.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayLabel} ({cls.rowCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Môn cam kết
                </label>
                <select
                  value={committedSubject}
                  onChange={(e) => setCommittedSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả môn cam kết</option>
                  {(academicData?.availableFilters.subjects || []).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.rowCount})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Tab 3 filters: Bậc học, Khối, Lớp, Cam kết, Môn */}
          {activeTab === "homeschooling" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bậc học</label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value)
                    setGrade("ALL")
                    setClassId("ALL")
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả bậc học</option>
                  {(hsData?.availableFilters.levels || []).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lớp</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {(hsData?.availableFilters.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayLabel} ({cls.rowCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cam kết</label>
                <select
                  value={hsCommitmentFilter}
                  onChange={(e) =>
                    setHsCommitmentFilter(
                      e.target.value as "ALL" | "COMMITTED" | "NON_COMMITTED"
                    )
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="COMMITTED">Có cam kết</option>
                  <option value="NON_COMMITTED">Không cam kết</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Môn theo dõi</label>
                <select
                  value={hsSubject}
                  onChange={(e) => setHsSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả môn</option>
                  {(hsData?.availableFilters.subjects || []).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.rowCount})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Tab 4 filters: Bậc học, Khối, Lớp, Môn */}
          {activeTab === "exchange" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bậc học</label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value)
                    setGrade("ALL")
                    setClassId("ALL")
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả bậc học</option>
                  {(exchangeData?.availableFilters.levels || []).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Khối</label>
                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value)
                    setClassId("ALL")
                  }}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả khối</option>
                  {(exchangeData?.availableFilters.grades || []).map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.label} ({g.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lớp</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {(exchangeData?.availableFilters.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayLabel} ({cls.rowCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Môn theo dõi</label>
                <select
                  value={exchangeSubject}
                  onChange={(e) => setExchangeSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả môn</option>
                  {(exchangeData?.availableFilters.subjects || []).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.rowCount})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Tab 2 filters: Lớp, GV / Chuyên viên */}
          {activeTab === "psychology" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lớp</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {(psychData?.availableFilters.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.displayLabel} ({cls.studentCount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  GV / Chuyên viên phụ trách
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                >
                  <option value="ALL">Tất cả GV / Chuyên viên</option>
                  {(psychData?.availableFilters.teachers || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.studentCount})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Content Area: Loading / Error / Tab Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-[#00A19A]" />
          <div className="text-xs font-medium">Đang tải và đối soát dữ liệu báo cáo...</div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 flex flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-rose-600" />
          <div className="text-sm font-semibold text-rose-800">Không thể tải dữ liệu báo cáo</div>
          <div className="text-xs text-slate-600 max-w-md">{error}</div>
          <button
            type="button"
            onClick={() => fetchData(activeTab)}
            className="mt-1 px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#002b2a]"
          >
            Tải lại dữ liệu
          </button>
        </div>
      ) : activeTab === "overview" && overviewData ? (
        <OverviewTab data={overviewData} onJumpToTab={handleJumpToTab} />
      ) : activeTab === "academic" && academicData ? (
        <AcademicCommitmentTab
          data={academicData}
          onSelectCampus={handleCampusChange}
          onSelectClass={handleSelectClass}
        />
      ) : activeTab === "homeschooling" && hsData ? (
        <HomeschoolingTab
          data={hsData}
          onSelectCampus={handleCampusChange}
          onSelectClass={handleSelectClass}
        />
      ) : activeTab === "exchange" && exchangeData ? (
        <ExchangeStudentTab
          data={exchangeData}
          onSelectCampus={handleCampusChange}
          onSelectClass={handleSelectClass}
        />
      ) : activeTab === "psychology" && psychData ? (
        <PsychologyCommitmentTab
          data={psychData}
          onSelectCampus={handleCampusChange}
          onSelectClass={handleSelectClass}
          onSelectMonth={(mVal) => setMonth(mVal)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
          Chưa có dữ liệu phù hợp.
        </div>
      )}
    </div>
  )
}
