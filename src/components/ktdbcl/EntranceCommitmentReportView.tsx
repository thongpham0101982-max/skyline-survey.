"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  Download,
  GraduationCap,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"

type CommitmentPeriodCode = "KSĐN" | "GK1" | "CK1" | "GK2" | "CK2"

interface CommitmentScoreCell {
  period: CommitmentPeriodCode
  score: number | null
  benchmark: number | null
  arrow: "↑" | "↓" | null
  comparison: "ABOVE" | "BELOW" | "EQUAL" | "NO_BENCHMARK" | "NO_SCORE"
  display: string
  ariaLabel: string
  sourceNote?: string | null
}

interface EntranceCommitmentReportRow {
  rowKey: string
  stt: number
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  level: "TIEU_HOC" | "THCS" | "THPT"
  campusId: string
  campusName: string
  campusCode: string
  committedSubject: string
  committedSubjectCode: string
  scores: Record<CommitmentPeriodCode, CommitmentScoreCell>
}

interface EntranceCommitmentClassGroup {
  classId: string
  className: string
  classCode: string
  grade: string
  level: "TIEU_HOC" | "THCS" | "THPT"
  campusId: string
  campusName: string
  campusCode: string
  studentCount: number
  rowCount: number
  rows: EntranceCommitmentReportRow[]
}

interface EntranceCommitmentReconciliationNote {
  type: string
  studentCode?: string
  studentName?: string
  subject?: string
  period?: string
  detail: string
}

interface EntranceCommitmentReportData {
  filters: {
    academicYearId: string
    academicYearName: string
    campusId: string
    campusName: string
    classId: string
    className: string
    committedSubject: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      grade: string
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      commitmentRowCount: number
    }>
    subjects: Array<{
      code: string
      name: string
      rowCount: number
    }>
  }
  summary: {
    totalClasses: number
    totalDistinctStudents: number
    totalCommitmentRows: number
    periodScoredCounts: Record<CommitmentPeriodCode, number>
  }
  classGroups: EntranceCommitmentClassGroup[]
  reconciliationNotes: EntranceCommitmentReconciliationNote[]
  missingBenchmarkSubjects: string[]
}

const PERIOD_COLUMNS: Array<{ code: CommitmentPeriodCode; label: string }> = [
  { code: "KSĐN", label: "KSĐN" },
  { code: "GK1", label: "Giữa kỳ 1" },
  { code: "CK1", label: "Cuối kỳ 1" },
  { code: "GK2", label: "Giữa kỳ 2" },
  { code: "CK2", label: "Cuối kỳ 2" },
]

export interface EntranceCommitmentReportViewProps {
  initialAcademicYearId?: string
  embedded?: boolean
}

export default function EntranceCommitmentReportView({
  initialAcademicYearId = "",
  embedded = false,
}: EntranceCommitmentReportViewProps) {
  const [academicYearId, setAcademicYearId] = useState<string>(initialAcademicYearId)
  const [campusId, setCampusId] = useState<string>("ALL")
  const [classId, setClassId] = useState<string>("ALL")
  const [committedSubject, setCommittedSubject] = useState<string>("ALL")

  const [reportData, setReportData] = useState<EntranceCommitmentReportData | null>(null)
  const [accessScope, setAccessScope] = useState<{
    roleLabel: string
    hasFullAccess: boolean
    isCampusRestricted?: boolean
    canExportExcel: boolean
  } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(
    async (params: {
      yearId: string
      campId: string
      clsId: string
      subject: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams()
        if (params.yearId) qs.set("academicYearId", params.yearId)
        if (params.campId) qs.set("campusId", params.campId)
        if (params.clsId) qs.set("classId", params.clsId)
        if (params.subject) qs.set("committedSubject", params.subject)

        const res = await fetch(
          `/api/admin/ktdbcl/entrance-commitment-report?${qs.toString()}`,
          { cache: "no-store" }
        )
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(
            json.error || "Không thể tải dữ liệu báo cáo học sinh cam kết đầu vào"
          )
        }

        const data: EntranceCommitmentReportData = json.data
        setReportData(data)
        if (json.accessScope) {
          setAccessScope(json.accessScope)
        }

        // Đồng bộ lại các lựa chọn bộ lọc đã được máy chủ chuẩn hóa (khi đổi bộ lọc cấp trên)
        setAcademicYearId(data.filters.academicYearId)
        setCampusId(data.filters.campusId)
        setClassId(data.filters.classId)
        setCommittedSubject(data.filters.committedSubject)
      } catch (err: any) {
        setError(err?.message || "Lỗi kết nối máy chủ khi tải báo cáo")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchReport({
      yearId: initialAcademicYearId,
      campId: "ALL",
      clsId: "ALL",
      subject: "ALL",
    })
  }, [fetchReport, initialAcademicYearId])

  const handleYearChange = (newYearId: string) => {
    setAcademicYearId(newYearId)
    setCampusId("ALL")
    setClassId("ALL")
    setCommittedSubject("ALL")
    fetchReport({
      yearId: newYearId,
      campId: "ALL",
      clsId: "ALL",
      subject: "ALL",
    })
  }

  const handleCampusChange = (newCampusId: string) => {
    setCampusId(newCampusId)
    setClassId("ALL")
    setCommittedSubject("ALL")
    fetchReport({
      yearId: academicYearId,
      campId: newCampusId,
      clsId: "ALL",
      subject: "ALL",
    })
  }

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId)
    setCommittedSubject("ALL")
    fetchReport({
      yearId: academicYearId,
      campId: campusId,
      clsId: newClassId,
      subject: "ALL",
    })
  }

  const handleSubjectChange = (newSubject: string) => {
    setCommittedSubject(newSubject)
    fetchReport({
      yearId: academicYearId,
      campId: campusId,
      clsId: classId,
      subject: newSubject,
    })
  }

  const handleExportExcel = async () => {
    if (!reportData) return
    setExporting(true)
    try {
      const qs = new URLSearchParams()
      if (academicYearId) qs.set("academicYearId", academicYearId)
      if (campusId) qs.set("campusId", campusId)
      if (classId) qs.set("classId", classId)
      if (committedSubject) qs.set("committedSubject", committedSubject)
      qs.set("format", "xlsx")

      const res = await fetch(
        `/api/admin/ktdbcl/entrance-commitment-report?${qs.toString()}`
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Không thể xuất tệp Excel")
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      const safeYear = (reportData.filters.academicYearName || "NamHoc").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      )
      link.download = `Bao_cao_HS_Cam_ket_dau_vao_${safeYear}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      alert(err?.message || "Lỗi khi xuất báo cáo Excel")
    } finally {
      setExporting(false)
    }
  }

  const campuses = reportData?.availableFilters.campuses || []
  const classes = reportData?.availableFilters.classes || []
  const subjects = reportData?.availableFilters.subjects || []
  const academicYears = reportData?.availableFilters.academicYears || []
  const isSingleCampusLocked = Boolean(
    accessScope &&
      (accessScope.isCampusRestricted ?? !accessScope.hasFullAccess) &&
      campuses.length === 1
  )

  const getScoreCellColorClass = (cell: CommitmentScoreCell) => {
    if (cell.comparison === "NO_SCORE") {
      return "text-slate-400 font-normal"
    }
    if (cell.comparison === "ABOVE") {
      return "text-[#059669] font-semibold"
    }
    if (cell.comparison === "BELOW") {
      return "text-[#E11D48] font-semibold"
    }
    return "text-slate-800 font-semibold"
  }

  return (
    <div className="space-y-4">
      {/* Masthead tiêu đề màn hình */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-[#003B3A]">
                Học sinh cam kết đầu vào
              </h2>
              {accessScope?.roleLabel && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {accessScope.roleLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Theo dõi kết quả khảo sát đầu năm (KSĐN) và bốn kỳ kiểm tra định kỳ của học sinh theo từng môn đã cam kết đầu vào.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                fetchReport({
                  yearId: academicYearId,
                  campId: campusId,
                  clsId: classId,
                  subject: committedSubject,
                })
              }
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>

            {(!accessScope || accessScope.canExportExcel) && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={loading || exporting || !reportData || reportData.classGroups.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Xuất Excel
              </button>
            )}
          </div>
        </div>

        {/* Bộ lọc theo đúng thứ tự: Năm học -> Cơ sở -> Lớp -> Môn cam kết đầu vào */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-[#F1F5F9]">
          {/* 1. Năm học */}
          <div>
            <label
              htmlFor="filter-commitment-year"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
            >
              <Calendar className="w-3.5 h-3.5 text-[#008B85]" />
              Năm học
            </label>
            <select
              id="filter-commitment-year"
              value={academicYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={loading && academicYears.length === 0}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/25 focus:border-[#008B85] tabular-nums"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Hiện hành)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cơ sở */}
          <div>
            <label
              htmlFor="filter-commitment-campus"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
            >
              <Building2 className="w-3.5 h-3.5 text-[#008B85]" />
              Cơ sở
            </label>
            <select
              id="filter-commitment-campus"
              value={campusId}
              onChange={(e) => handleCampusChange(e.target.value)}
              disabled={loading || Boolean(isSingleCampusLocked)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/25 focus:border-[#008B85] disabled:bg-slate-50"
            >
              {!isSingleCampusLocked && (
                <option value="ALL">Tất cả cơ sở ({campuses.length})</option>
              )}
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName} ({c.campusCode})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lớp */}
          <div>
            <label
              htmlFor="filter-commitment-class"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
            >
              <Users className="w-3.5 h-3.5 text-[#008B85]" />
              Lớp
            </label>
            <select
              id="filter-commitment-class"
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={loading || classes.length === 0}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/25 focus:border-[#008B85] tabular-nums disabled:bg-slate-50"
            >
              <option value="ALL">
                {classes.length > 0
                  ? `Tất cả lớp (${classes.length} lớp)`
                  : "Không có lớp phù hợp"}
              </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.displayLabel} — {cls.commitmentRowCount} lượt cam kết
                </option>
              ))}
            </select>
          </div>

          {/* 4. Môn cam kết đầu vào */}
          <div>
            <label
              htmlFor="filter-commitment-subject"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#008B85]" />
              Môn cam kết đầu vào
            </label>
            <select
              id="filter-commitment-subject"
              value={committedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={loading || subjects.length === 0}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/25 focus:border-[#008B85] tabular-nums disabled:bg-slate-50"
            >
              <option value="ALL">
                {subjects.length > 0
                  ? `Tất cả môn (${subjects.length} môn)`
                  : "Không có môn cam kết"}
              </option>
              {subjects.map((sub) => (
                <option key={sub.code} value={sub.name}>
                  {sub.name} ({sub.rowCount})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dải thông tin tổng hợp & Chú thích mũi tên chuẩn SKL */}
      {reportData && !error && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-700 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#008B85]" />
              Số lớp có HS cam kết:{" "}
              <strong className="text-[#003B3A] font-semibold">
                {reportData.summary.totalClasses}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Số học sinh cam kết:{" "}
              <strong className="text-[#003B3A] font-semibold">
                {reportData.summary.totalDistinctStudents}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Tổng lượt môn cam kết:{" "}
              <strong className="text-[#003B3A] font-semibold">
                {reportData.summary.totalCommitmentRows}
              </strong>
            </span>
          </div>

          {/* Chú thích chuẩn SKL bắt buộc trên màn hình */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-slate-700"
            aria-label="Chú thích ký hiệu đối chiếu chuẩn Sky-Line"
          >
            <Info className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
            <span>
              <strong className="text-[#059669]">↑</strong> Cao hơn chuẩn SKL{" "}
              <span className="text-slate-400 mx-1">·</span>{" "}
              <strong className="text-[#E11D48]">↓</strong> Thấp hơn chuẩn SKL
            </span>
          </div>
        </div>
      )}

      {/* Trạng thái đang tải */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-xs">
          <Loader2 className="w-7 h-7 text-[#008B85] animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            Đang tải dữ liệu học sinh cam kết đầu vào...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Đang đối chiếu hồ sơ cam kết, phân lớp và điểm khảo sát các kỳ theo chuẩn SKL.
          </p>
        </div>
      )}

      {/* Trạng thái lỗi */}
      {!loading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-[#E11D48] mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-800">
            Không thể tải dữ liệu báo cáo
          </h3>
          <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() =>
              fetchReport({
                yearId: academicYearId,
                campId: campusId,
                clsId: classId,
                subject: committedSubject,
              })
            }
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái không có học sinh phù hợp */}
      {!loading && !error && reportData && reportData.classGroups.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-xs">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-slate-800">
            Không có học sinh cam kết đầu vào phù hợp
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Chưa ghi nhận học sinh có cam kết đầu vào thuộc phạm vi Năm học, Cơ sở, Lớp và Môn đang chọn.
          </p>
        </div>
      )}

      {/* Danh sách bảng kết quả chia theo từng lớp */}
      {!loading &&
        !error &&
        reportData &&
        reportData.classGroups.map((group) => (
          <div
            key={group.classId}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
          >
            {/* Tiêu đề nhóm lớp: ghi rõ Tên cơ sở và Tên lớp */}
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-xs font-semibold">
                  {group.campusName}
                  {group.campusCode && group.campusName !== group.campusCode
                    ? ` (${group.campusCode})`
                    : ""}
                </span>
                <h3 className="text-sm font-bold text-[#003B3A] tabular-nums">
                  Lớp {group.className}
                </h3>
                {group.grade && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    • Khối {String(group.grade).replace(/^khối\s*/i, "")}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 tabular-nums">
                <strong className="font-semibold text-[#003B3A]">
                  {group.studentCount}
                </strong>{" "}
                học sinh{" "}
                <span className="text-slate-300 mx-1">•</span>
                <strong className="font-semibold text-[#003B3A]">
                  {group.rowCount}
                </strong>{" "}
                dòng môn cam kết
              </div>
            </div>

            {/* Bảng kết quả chuẩn Sky-Line Academic Ledger */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                    <th
                      scope="col"
                      className="py-3 px-3 text-center text-white w-14 sticky left-0 z-20 bg-[#003B3A]"
                    >
                      STT
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-white min-w-[210px] sticky left-14 z-20 bg-[#003B3A] border-r border-[#005250]"
                    >
                      Họ tên HS
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-teal-100 min-w-[160px]"
                    >
                      Môn cam kết đầu vào
                    </th>
                    {PERIOD_COLUMNS.map((col) => (
                      <th
                        key={col.code}
                        scope="col"
                        className="py-3 px-3 text-right text-[#5EEAD4] min-w-[110px]"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {group.rows.map((row) => (
                    <tr
                      key={row.rowKey}
                      className="transition-colors align-middle hover:bg-[#F8FAFC]"
                    >
                      <td className="py-3 px-3 text-center font-medium text-slate-600 align-middle sticky left-0 z-10 bg-inherit">
                        {row.stt}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 align-middle sticky left-14 z-10 bg-inherit border-r border-[#F1F5F9]">
                        {row.studentName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium align-middle">
                        {row.committedSubject}
                      </td>
                      {PERIOD_COLUMNS.map((col) => {
                        const cell = row.scores[col.code]
                        return (
                          <td
                            key={col.code}
                            aria-label={`${col.label}: ${cell.ariaLabel}`}
                            title={cell.ariaLabel}
                            className={`py-3 px-3 text-right align-middle whitespace-nowrap ${getScoreCellColorClass(
                              cell
                            )}`}
                          >
                            {cell.display}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  )
}
