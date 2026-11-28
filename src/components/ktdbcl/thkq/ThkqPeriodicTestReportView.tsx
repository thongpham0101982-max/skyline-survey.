"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import * as XLSX from "xlsx"
import { toast } from "react-hot-toast"
import {
  Play,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  Users,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import {
  PeriodicReportRow,
  ScoreBucketDef,
  StudentReconciledItem,
  ThkqGroupByMode,
  ThkqScoreScaleMode,
} from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { buildPeriodicReportWorkbook } from "@/lib/ktdbcl/thkqPeriodicExcelExporter"
import { ThkqPeriodicStudentDetailModal } from "./ThkqPeriodicStudentDetailModal"

interface Props {
  academicYears: any[]
  activeYearId: string
  initialCampuses: any[]
  initialSubjects: any[]
  initialClasses: any[]
  defaultFocusSection?: "TABLE" | "LEVEL_SYSTEM" | "PROGRESS"
}

export function ThkqPeriodicTestReportView({
  academicYears = [],
  activeYearId = "",
  initialCampuses = [],
  initialSubjects = [],
  initialClasses = [],
  defaultFocusSection = "TABLE",
}: Props) {
  // 1. Bộ lọc đang chọn
  const [draftYearId, setDraftYearId] = useState<string>(
    activeYearId || academicYears[0]?.id || ""
  )
  const [draftLevel, setDraftLevel] = useState<string>("TIEU_HOC")
  const [draftPeriod, setDraftPeriod] = useState<string>("GK1")
  const [draftSubjectId, setDraftSubjectId] = useState<string>("")
  const [draftTestColumnKey, setDraftTestColumnKey] = useState<string>("OFFICIAL")
  const [draftCampusId, setDraftCampusId] = useState<string>("ALL")
  const [draftEducationSystem, setDraftEducationSystem] = useState<string>("ALL")
  const [draftGrade, setDraftGrade] = useState<string>("ALL")
  const [draftClassId, setDraftClassId] = useState<string>("ALL")

  // Cấu hình cách nhóm và hiển thị cột
  const [draftGroupBy, setDraftGroupBy] = useState<ThkqGroupByMode>("GRADE_CLASS")
  const [draftScoreScaleMode, setDraftScoreScaleMode] = useState<ThkqScoreScaleMode>("AUTO")
  const [draftIncludeZero, setDraftIncludeZero] = useState<boolean>(false)
  const [showProgressColumns, setShowProgressColumns] = useState<boolean>(false)
  const [includeStudentDetailsOnExport, setIncludeStudentDetailsOnExport] = useState<boolean>(false)

  // 2. Chữ ký bộ lọc đã áp dụng
  const [appliedFilterSignature, setAppliedFilterSignature] = useState<string>("")

  // 3. Dữ liệu báo cáo
  const [loading, setLoading] = useState<boolean>(false)
  const [exporting, setExporting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  // 4. Modal Drill-down danh sách học sinh
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailTitle, setDetailTitle] = useState<string>("")
  const [detailSubtitle, setDetailSubtitle] = useState<string>("")
  const [detailStudents, setDetailStudents] = useState<StudentReconciledItem[]>([])

  const currentDraftSignature = useMemo(
    () =>
      JSON.stringify({
        draftYearId,
        draftLevel,
        draftPeriod,
        draftSubjectId,
        draftTestColumnKey,
        draftCampusId,
        draftEducationSystem,
        draftGrade,
        draftClassId,
        draftGroupBy,
        draftScoreScaleMode,
        draftIncludeZero,
      }),
    [
      draftYearId,
      draftLevel,
      draftPeriod,
      draftSubjectId,
      draftTestColumnKey,
      draftCampusId,
      draftEducationSystem,
      draftGrade,
      draftClassId,
      draftGroupBy,
      draftScoreScaleMode,
      draftIncludeZero,
    ]
  )

  const isFilterDirty = Boolean(
    appliedFilterSignature && currentDraftSignature !== appliedFilterSignature
  )

  const periodOptions = useMemo(() => {
    if (reportData?.filterOptions?.periods?.length > 0) {
      return reportData.filterOptions.periods
    }
    return [
      { code: "GK1", label: "Giữa kỳ 1", isConfigured: true },
      { code: "CK1", label: "Cuối kỳ 1", isConfigured: true },
      { code: "GK2", label: "Giữa kỳ 2", isConfigured: true },
      { code: "CK2", label: "Cuối kỳ 2", isConfigured: true },
      { code: "KSĐN", label: "Khảo sát đầu năm", isConfigured: true },
    ]
  }, [reportData?.filterOptions?.periods])

  const subjectOptions = useMemo(() => {
    if (reportData?.filterOptions?.subjects?.length > 0) {
      return reportData.filterOptions.subjects
    }
    return initialSubjects.map((s: any) => ({
      id: s.id,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      entryCount: 0,
    }))
  }, [reportData?.filterOptions?.subjects, initialSubjects])

  const testOptions = useMemo(() => {
    return (
      reportData?.filterOptions?.tests || [
        {
          key: "OFFICIAL",
          label: `Điểm kiểm tra định kỳ chính thức (${draftPeriod})`,
          isDefault: true,
        },
      ]
    )
  }, [reportData?.filterOptions?.tests, draftPeriod])

  const campusOptions = useMemo(() => {
    if (reportData?.filterOptions?.campuses?.length > 0) {
      return reportData.filterOptions.campuses
    }
    return initialCampuses
  }, [reportData?.filterOptions?.campuses, initialCampuses])

  const gradeOptions = useMemo(() => {
    if (draftLevel === "TIEU_HOC") {
      return [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `Khối ${n}` }))
    }
    if (draftLevel === "THCS") {
      return [6, 7, 8, 9].map((n) => ({ value: String(n), label: `Khối ${n}` }))
    }
    if (draftLevel === "THPT") {
      return [10, 11, 12].map((n) => ({ value: String(n), label: `Khối ${n}` }))
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({
      value: String(n),
      label: `Khối ${n}`,
    }))
  }, [draftLevel])

  const classOptions = useMemo(() => {
    const rawList = reportData?.filterOptions?.classes || []
    return rawList.filter((c: any) => {
      if (draftCampusId !== "ALL" && c.campusId !== draftCampusId) return false
      if (draftGrade !== "ALL" && String(c.gradeNumber) !== String(draftGrade)) return false
      if (draftEducationSystem !== "ALL" && c.educationSystemCode !== draftEducationSystem) {
        return false
      }
      return true
    })
  }, [reportData?.filterOptions?.classes, draftCampusId, draftGrade, draftEducationSystem])

  const runReport = useCallback(
    async (overrideParams?: Partial<Record<string, any>>) => {
      const targetYearId = overrideParams?.academicYearId ?? draftYearId
      const targetLevel = overrideParams?.level ?? draftLevel
      const targetPeriod = overrideParams?.evaluationPeriod ?? draftPeriod
      const targetSubjectId = overrideParams?.subjectId ?? draftSubjectId
      const targetTestKey = overrideParams?.testColumnKey ?? draftTestColumnKey
      const targetCampus = overrideParams?.campusId ?? draftCampusId
      const targetEduSys = overrideParams?.educationSystem ?? draftEducationSystem
      const targetGrade = overrideParams?.grade ?? draftGrade
      const targetClass = overrideParams?.classId ?? draftClassId
      const targetGroupBy = overrideParams?.groupBy ?? draftGroupBy
      const targetScaleMode = overrideParams?.scoreScaleMode ?? draftScoreScaleMode
      const targetIncludeZero = overrideParams?.includeZeroScore ?? draftIncludeZero

      if (!targetYearId || !targetLevel || !targetPeriod) {
        toast.error("Vui lòng chọn đầy đủ Năm học, Cấp học và Kỳ kiểm tra.")
        return
      }

      setLoading(true)
      setErrorMsg(null)
      try {
        const sp = new URLSearchParams({
          academicYearId: targetYearId,
          level: targetLevel,
          evaluationPeriod: targetPeriod,
          subjectId: targetSubjectId,
          testColumnKey: targetTestKey,
          campusId: targetCampus,
          educationSystem: targetEduSys,
          grade: targetGrade,
          classId: targetClass,
          ethnicity: "ALL",
          groupBy: targetGroupBy,
          rateMode: "SSM_ANALYSIS",
          scoreScaleMode: targetScaleMode,
          includeZeroScore: String(targetIncludeZero),
        })

        const res = await fetch(`/api/admin/ktdbcl/thkq-periodic-report?${sp.toString()}`)
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Không thể tải dữ liệu báo cáo")
        }

        const data = json.data
        setReportData(data)

        const resolvedSubId = data.appliedFilters?.subjectId || targetSubjectId
        if (resolvedSubId && resolvedSubId !== draftSubjectId) {
          setDraftSubjectId(resolvedSubId)
        }

        const appliedSig = JSON.stringify({
          draftYearId: targetYearId,
          draftLevel: targetLevel,
          draftPeriod: targetPeriod,
          draftSubjectId: resolvedSubId,
          draftTestColumnKey: targetTestKey,
          draftCampusId: targetCampus,
          draftEducationSystem: targetEduSys,
          draftGrade: targetGrade,
          draftClassId: targetClass,
          draftGroupBy: targetGroupBy,
          draftScoreScaleMode: targetScaleMode,
          draftIncludeZero: targetIncludeZero,
        })
        setAppliedFilterSignature(appliedSig)
      } catch (err: any) {
        console.error("Lỗi tải báo cáo KTĐK:", err)
        setErrorMsg(err.message || "Lỗi kết nối máy chủ khi tải báo cáo")
        toast.error(err.message || "Không thể tải báo cáo")
      } finally {
        setLoading(false)
      }
    },
    [
      draftYearId,
      draftLevel,
      draftPeriod,
      draftSubjectId,
      draftTestColumnKey,
      draftCampusId,
      draftEducationSystem,
      draftGrade,
      draftClassId,
      draftGroupBy,
      draftScoreScaleMode,
      draftIncludeZero,
    ]
  )

  useEffect(() => {
    runReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenDrilldown = async (params: {
    row: PeriodicReportRow
    metricType: string
    bucketId?: string
    metricLabel: string
    countValue: number
  }) => {
    const { row, metricType, bucketId, metricLabel, countValue } = params
    if (!countValue || countValue <= 0) return

    if (!reportData?.permissions?.canViewDetail) {
      toast.error("Tài khoản của bạn không có quyền xem danh sách học sinh chi tiết.")
      return
    }

    if (isFilterDirty) {
      toast.error("Bộ lọc đã thay đổi. Vui lòng nhấn 'Áp dụng' trước khi xem chi tiết.")
      return
    }

    setDetailTitle(`${row.label} — ${metricLabel} (${countValue} học sinh)`)
    setDetailSubtitle(
      `${reportData.header?.subjectName || ""} • ${reportData.header?.periodLabel || ""} • Năm học ${
        reportData.header?.academicYearName || ""
      } • Phiên bản #${reportData.snapshotVersion}`
    )
    setDetailStudents([])
    setDetailModalOpen(true)
    setDetailLoading(true)

    try {
      const af = reportData.appliedFilters
      const sp = new URLSearchParams({
        academicYearId: af.academicYearId,
        level: af.level,
        evaluationPeriod: af.evaluationPeriod,
        subjectId: af.subjectId,
        testColumnKey: af.testColumnKey,
        campusId: af.campusId,
        educationSystem: af.educationSystem,
        grade: af.grade,
        classId: af.classId,
        ethnicity: "ALL",
        groupBy: af.groupBy,
        rateMode: "SSM_ANALYSIS",
        scoreScaleMode: af.requestedScoreScaleMode || af.scoreScaleMode,
        includeZeroScore: String(af.includeZeroScore),
        drilldownRowKey: row.rowKey,
        drilldownMetric: metricType,
        expectedSnapshotVersion: reportData.snapshotVersion,
      })
      if (bucketId) sp.set("drilldownBucketId", bucketId)

      const res = await fetch(`/api/admin/ktdbcl/thkq-periodic-report?${sp.toString()}`)
      const json = await res.json()

      if (res.status === 409 && json.staleSnapshot) {
        toast.error(json.error)
        setDetailModalOpen(false)
        return
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải danh sách học sinh chi tiết")
      }

      setDetailStudents(json.students || [])
    } catch (err: any) {
      toast.error(err.message || "Lỗi tải danh sách học sinh chi tiết")
      setDetailModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error("Chưa có dữ liệu báo cáo để xuất Excel.")
      return
    }

    if (isFilterDirty) {
      toast.error(
        "Bạn vừa thay đổi bộ lọc. Vui lòng nhấn 'Áp dụng' trước khi xuất Excel!"
      )
      return
    }

    if (!reportData.permissions?.canExportSummary) {
      toast.error("Tài khoản của bạn không có quyền xuất file Excel báo cáo này.")
      return
    }

    setExporting(true)
    try {
      const res = await fetch("/api/admin/ktdbcl/thkq-periodic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: { ...reportData.appliedFilters, rateMode: "SSM_ANALYSIS" },
          expectedSnapshotVersion: reportData.snapshotVersion,
          includeProgressColumns:
            showProgressColumns || defaultFocusSection === "PROGRESS",
          includeStudentDetails:
            includeStudentDetailsOnExport && Boolean(reportData.permissions?.canExportDetail),
        }),
      })
      const json = await res.json()

      if (res.status === 409 && json.staleSnapshot) {
        toast.error(json.error)
        return
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể xác thực dữ liệu xuất Excel")
      }

      const wb = buildPeriodicReportWorkbook({
        reportData: json.data,
        includeProgressColumns:
          showProgressColumns || defaultFocusSection === "PROGRESS",
        includeStudentDetails:
          includeStudentDetailsOnExport && Boolean(reportData.permissions?.canExportDetail),
        canExportDetail: Boolean(reportData.permissions?.canExportDetail),
        detailedStudents: json.detailedStudents || [],
      })

      const subCode = (json.data.header?.subjectCode || "MonHoc").replace(/[^a-zA-Z0-9_-]/g, "")
      const periodCode = json.data.appliedFilters?.evaluationPeriod || "KyKT"
      const yearStr = (json.data.header?.academicYearName || "NamHoc").replace(/\s+/g, "")

      XLSX.writeFile(
        wb,
        `TK_KetQua_KiemTraDinhKy_${subCode}_${periodCode}_${yearStr}.xlsx`
      )
      toast.success("Xuất file Excel thành công!")
    } catch (err: any) {
      console.error("Lỗi xuất Excel KTĐK:", err)
      toast.error(err.message || "Không thể xuất file Excel")
    } finally {
      setExporting(false)
    }
  }

  const aboveBuckets: ScoreBucketDef[] = reportData?.aboveBuckets || []
  const belowBuckets: ScoreBucketDef[] = reportData?.belowBuckets || []
  const tableRows: PeriodicReportRow[] = reportData?.tableRows || []
  const canViewDetail = Boolean(reportData?.permissions?.canViewDetail)
  const canExportSummary = Boolean(reportData?.permissions?.canExportSummary ?? true)
  const canExportDetail = Boolean(reportData?.permissions?.canExportDetail)

  const renderClickableCount = (
    row: PeriodicReportRow,
    count: number,
    metricType: string,
    metricLabel: string,
    bucketId?: string,
    extraClass = ""
  ) => {
    const isTotalOrGroup = row.rowType !== "CLASS"
    const baseTextClass = isTotalOrGroup ? "font-bold" : "font-medium"
    if (count > 0 && canViewDetail && !isFilterDirty) {
      return (
        <button
          type="button"
          onClick={() =>
            handleOpenDrilldown({
              row,
              metricType,
              bucketId,
              metricLabel,
              countValue: count,
            })
          }
          className={`inline-flex items-center justify-center px-1 py-0.5 rounded hover:bg-[#CCFBF1]/70 hover:text-[#003B3A] underline decoration-dotted underline-offset-2 transition cursor-pointer tabular-nums ${baseTextClass} ${extraClass}`}
          title={`Nhấn để xem danh sách ${count} học sinh (${metricLabel})`}
        >
          {count}
        </button>
      )
    }
    return <span className={`tabular-nums ${baseTextClass} ${extraClass}`}>{count}</span>
  }

  return (
    <div className="space-y-4">
      {/* =====================================================================
          1. THANH BỘ LỌC HỢP NHẤT & HÀNH ĐỘNG (COMPACT ACADEMIC LEDGER TOOLBAR)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4">
        {/* Hàng 1: Các bộ lọc chính + nút Xem báo cáo / Xuất Excel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Năm học (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Năm học <span className="text-[#E11D48]">*</span>
            </label>
            <select
              value={draftYearId}
              onChange={(e) => {
                setDraftYearId(e.target.value)
                setDraftClassId("ALL")
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              {academicYears.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Mặc định)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cấp học (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cấp học <span className="text-[#E11D48]">*</span>
            </label>
            <select
              value={draftLevel}
              onChange={(e) => {
                const nextLvl = e.target.value
                setDraftLevel(nextLvl)
                setDraftGrade("ALL")
                setDraftClassId("ALL")
                runReport({ level: nextLvl, grade: "ALL", classId: "ALL", subjectId: "" })
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              <option value="TIEU_HOC">Tiểu học (Khối 1–5)</option>
              <option value="THCS">THCS (Khối 6–9)</option>
              <option value="THPT">THPT (Khối 10–12)</option>
            </select>
          </div>

          {/* Kỳ kiểm tra (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kỳ kiểm tra <span className="text-[#E11D48]">*</span>
            </label>
            <select
              value={draftPeriod}
              onChange={(e) => {
                const nextP = e.target.value
                setDraftPeriod(nextP)
                setDraftTestColumnKey("OFFICIAL")
                runReport({ evaluationPeriod: nextP, testColumnKey: "OFFICIAL" })
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              {periodOptions
                .filter((p: any) => p.isConfigured !== false)
                .map((p: any) => (
                  <option key={p.code} value={p.code}>
                    {p.label} {p.hasData ? `(${p.entryCount})` : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* Môn học (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>
                Môn học <span className="text-[#E11D48]">*</span>
              </span>
              <span className="text-[11px] font-medium text-[#00736E] tabular-nums">
                {subjectOptions.length} môn
              </span>
            </label>
            <select
              value={draftSubjectId}
              onChange={(e) => {
                const nextSub = e.target.value
                setDraftSubjectId(nextSub)
                setDraftTestColumnKey("OFFICIAL")
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              {subjectOptions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} {s.entryCount > 0 ? `(${s.entryCount})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cơ sở */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cơ sở đào tạo
            </label>
            <select
              value={draftCampusId}
              onChange={(e) => {
                setDraftCampusId(e.target.value)
                setDraftClassId("ALL")
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">[Tất cả cơ sở]</option>
              {campusOptions.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName === cp.campusCode
                    ? `Cơ sở ${cp.campusName}`
                    : `${cp.campusName} (${cp.campusCode})`}
                </option>
              ))}
            </select>
          </div>

          {/* Cụm nút hành động Xem & Xuất Excel */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => runReport()}
                disabled={loading}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                  isFilterDirty
                    ? "bg-[#D97706] hover:bg-amber-700 text-white"
                    : "bg-[#003B3A] hover:bg-[#004E4C] text-white"
                } disabled:opacity-50`}
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {isFilterDirty ? "Áp dụng" : "Xem"}
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={loading || exporting || !canExportSummary || isFilterDirty || !reportData}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#059669] hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  isFilterDirty
                    ? "Nhấn 'Áp dụng' trước khi xuất Excel"
                    : "Xuất báo cáo ra file Excel (.xlsx)"
                }
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc chi tiết (Đợt/Bài KT, Hệ học, Khối, Lớp) + Tùy chọn hiển thị */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đợt / Bài kiểm tra
            </label>
            <select
              value={draftTestColumnKey}
              onChange={(e) => setDraftTestColumnKey(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              {testOptions.map((t: any) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hệ học (Sky-Line)
            </label>
            <select
              value={draftEducationSystem}
              onChange={(e) => {
                setDraftEducationSystem(e.target.value)
                setDraftClassId("ALL")
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">[Tất cả hệ học]</option>
              <option value="HE_S">Hệ S (CLC &amp; Hội nhập)</option>
              <option value="HE_I">Hệ I (Song ngữ Quốc tế)</option>
              <option value="HE_UK">Hệ UK (Quốc tế Anh)</option>
              <option value="HE_A">Hệ A (Tăng cường)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Khối học
            </label>
            <select
              value={draftGrade}
              onChange={(e) => {
                setDraftGrade(e.target.value)
                setDraftClassId("ALL")
              }}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">[Tất cả khối]</option>
              {gradeOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Lớp học</span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                {classOptions.length} lớp
              </span>
            </label>
            <select
              value={draftClassId}
              onChange={(e) => setDraftClassId(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">[Tất cả lớp]</option>
              {classOptions.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.displayCode}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hàng 3: Tùy chọn cách nhóm & thang điểm cho báo cáo Thống kê kết quả kiểm tra định kỳ */}
        {defaultFocusSection === "TABLE" && (
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Cách nhóm */}
              <div className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                <button
                  type="button"
                  onClick={() => setDraftGroupBy("GRADE_CLASS")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    draftGroupBy === "GRADE_CLASS"
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Nhóm: Khối → Lớp
                </button>
                <button
                  type="button"
                  onClick={() => setDraftGroupBy("CAMPUS_GRADE_CLASS")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    draftGroupBy === "CAMPUS_GRADE_CLASS"
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cơ sở → Khối → Lớp
                </button>
              </div>

              {/* Thang điểm */}
              <select
                value={draftScoreScaleMode}
                onChange={(e) =>
                  setDraftScoreScaleMode(e.target.value as ThkqScoreScaleMode)
                }
                className="font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-slate-800 focus:outline-none focus:border-[#008B85]"
              >
                <option value="AUTO">Thang điểm: Tự động</option>
                <option value="INTEGER">Điểm nguyên (10..1)</option>
                <option value="DECIMAL">Khoảng điểm ([0,1)..[9,10), 10)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draftIncludeZero}
                  onChange={(e) => setDraftIncludeZero(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span>Có cột Điểm 0</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showProgressColumns}
                  onChange={(e) => setShowProgressColumns(e.target.checked)}
                  className="rounded border-slate-300 text-[#003B3A]"
                />
                <span>Cột tiến độ dự KT</span>
              </label>

              {canExportDetail && (
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStudentDetailsOnExport}
                    onChange={(e) => setIncludeStudentDetailsOnExport(e.target.checked)}
                    className="rounded border-slate-300 text-[#003B3A]"
                  />
                  <span>Xuất kèm DS học sinh</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Cảnh báo khi đổi bộ lọc mà chưa nhấn Áp dụng */}
        {isFilterDirty && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
              <span>
                Lựa chọn bộ lọc đã thay đổi. Vui lòng nhấn <strong>&ldquo;Áp dụng&rdquo;</strong> trước khi xuất Excel hoặc xem chi tiết để số liệu khớp màn hình.
              </span>
            </div>
            <button
              type="button"
              onClick={() => runReport()}
              className="px-3 py-1 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold shrink-0 cursor-pointer"
            >
              Áp dụng ngay
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. NỘI DUNG BÁO CÁO
         ===================================================================== */}
      {loading && !reportData ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-12 text-center">
          <RefreshCw className="h-6 w-6 text-[#008B85] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">
            Đang tổng hợp và đối soát dữ liệu...
          </p>
        </div>
      ) : errorMsg ? (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-8 text-center">
          <AlertCircle className="h-7 w-7 text-[#E11D48] mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-900">Không thể tải báo cáo</p>
          <p className="text-xs text-slate-600 mt-1 max-w-lg mx-auto">{errorMsg}</p>
        </div>
      ) : reportData ? (
        <>
          {/* -----------------------------------------------------------------
              CHẾ ĐỘ A: BẢNG THỐNG KÊ KẾT QUẢ KIỂM TRA ĐỊNH KỲ (ĐÃ BỎ NỮ & TỶ LỆ NỮ)
             ----------------------------------------------------------------- */}
          {defaultFocusSection === "TABLE" && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              {/* Dải trạng thái gọn gàng ngay trên bảng */}
              <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]/60">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                  <div className="flex flex-wrap items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-[#008B85] shrink-0" />
                    <span>
                      <strong>Cách tính tỷ lệ:</strong>{" "}
                      <span className="text-[#00736E] font-semibold">
                        TL = Số học sinh tại mức điểm (SL) / Tổng số học sinh có điểm hợp lệ (TSHS KT)
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span>
                      Đủ ĐK:{" "}
                      <strong className="text-slate-900">
                        {reportData.totalRow.eligibleCount}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Đã có điểm:{" "}
                      <strong className="text-[#059669]">
                        {reportData.totalRow.tshsKt}
                      </strong>
                    </span>
                    {reportData.totalRow.absentOrMakeupCount > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          Vắng/Chờ bù:{" "}
                          <strong className="text-[#D97706]">
                            {reportData.totalRow.absentOrMakeupCount}
                          </strong>
                        </span>
                      </>
                    )}
                    {reportData.totalRow.missingScoreCount > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          Chưa có điểm:{" "}
                          <strong className="text-[#E11D48]">
                            {reportData.totalRow.missingScoreCount}
                          </strong>
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Phiên bản #{reportData.snapshotVersion}</span>
                  </div>
                </div>
              </div>

              {/* Bảng thống kê nhiều tầng (STT | Lớp | TSHS | TSHS KT | Các mức điểm SL & TL) */}
              {reportData.classCount === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    Chưa có lớp áp dụng bài kiểm tra định kỳ cho bộ lọc này
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Môn <strong>{reportData.header.subjectName}</strong> tại kỳ{" "}
                    <strong>{reportData.header.periodLabel}</strong> không có lớp áp dụng trong phạm vi lọc hiện tại.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[72vh]">
                  <table className="w-full border-collapse text-xs tabular-nums">
                    <thead className="sticky top-0 z-20 bg-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                      <tr className="border-b border-teal-800/80">
                        <th
                          rowSpan={3}
                          className="sticky left-0 z-30 bg-[#003B3A] py-2.5 px-2 text-center text-white border-r border-teal-800/80 w-12 min-w-[48px] max-w-[48px]"
                        >
                          STT
                        </th>
                        <th
                          rowSpan={3}
                          className="sticky left-[48px] z-30 bg-[#003B3A] py-2.5 px-3 text-left text-white border-r border-teal-800/80 min-w-[132px]"
                        >
                          Lớp
                        </th>
                        <th
                          rowSpan={3}
                          className="py-2.5 px-2.5 text-center text-teal-100 border-r border-teal-800/80"
                          title="Tổng số học sinh trong phạm vi"
                        >
                          TSHS
                        </th>
                        <th
                          rowSpan={3}
                          className="py-2.5 px-2.5 text-center text-[#5EEAD4] border-r border-teal-800/80"
                          title="Tổng số học sinh có kết quả kiểm tra hợp lệ"
                        >
                          TSHS KT
                        </th>

                        {showProgressColumns && (
                          <>
                            <th
                              rowSpan={3}
                              className="py-2.5 px-2 text-center text-teal-100 border-r border-teal-800/80"
                            >
                              Đủ ĐK
                            </th>
                            <th
                              rowSpan={3}
                              className="py-2.5 px-2 text-center text-teal-100 border-r border-teal-800/80"
                            >
                              Vắng/Chờ bù
                            </th>
                            <th
                              rowSpan={3}
                              className="py-2.5 px-2 text-center text-teal-100 border-r border-teal-800/80"
                            >
                              Chưa có điểm
                            </th>
                            <th
                              rowSpan={3}
                              className="py-2.5 px-2 text-center text-teal-100 border-r border-teal-800/80"
                            >
                              Miễn
                            </th>
                          </>
                        )}

                        <th
                          colSpan={(aboveBuckets.length + 1) * 2}
                          className="py-2 px-3 text-center text-[#5EEAD4] border-r border-teal-800/80"
                        >
                          Điểm từ trung bình trở lên (≥ {reportData.appliedFilters.thresholdScore ?? 5})
                        </th>
                        <th
                          colSpan={(belowBuckets.length + 1) * 2}
                          className="py-2 px-3 text-center text-teal-100"
                        >
                          Điểm dưới trung bình (&lt; {reportData.appliedFilters.thresholdScore ?? 5})
                        </th>
                      </tr>

                      <tr className="border-b border-teal-800/80">
                        {aboveBuckets.map((b) => (
                          <th
                            key={b.id}
                            colSpan={2}
                            className="py-1.5 px-2 text-center text-white border-r border-teal-800/80"
                          >
                            {b.label}
                          </th>
                        ))}
                        <th
                          colSpan={2}
                          className="py-1.5 px-2 text-center text-[#5EEAD4] bg-[#002B2A] border-r border-teal-800/80"
                        >
                          Cộng
                        </th>

                        {belowBuckets.map((b) => (
                          <th
                            key={b.id}
                            colSpan={2}
                            className="py-1.5 px-2 text-center text-teal-100 border-r border-teal-800/80"
                          >
                            {b.label}
                          </th>
                        ))}
                        <th
                          colSpan={2}
                          className="py-1.5 px-2 text-center text-[#5EEAD4] bg-[#002B2A]"
                        >
                          Cộng
                        </th>
                      </tr>

                      <tr className="border-b border-[#003B3A]">
                        {[...aboveBuckets, { id: "ABOVE_SUM" }].map((b) => (
                          <React.Fragment key={b.id}>
                            <th className="py-1.5 px-2 text-center text-teal-100 border-r border-teal-800/60 min-w-[40px]">
                              SL
                            </th>
                            <th className="py-1.5 px-2 text-center text-[#5EEAD4] border-r border-teal-800/80 min-w-[60px]">
                              TL
                            </th>
                          </React.Fragment>
                        ))}
                        {[...belowBuckets, { id: "BELOW_SUM" }].map((b) => (
                          <React.Fragment key={b.id}>
                            <th className="py-1.5 px-2 text-center text-teal-100 border-r border-teal-800/60 min-w-[40px]">
                              SL
                            </th>
                            <th className="py-1.5 px-2 text-center text-[#5EEAD4] border-r border-teal-800/80 min-w-[60px]">
                              TL
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E2E8F0] bg-white tabular-nums">
                      {tableRows.map((row) => {
                        const isTotal = row.rowType === "TOTAL"
                        const isCampus = row.rowType === "CAMPUS"
                        const isGrade = row.rowType === "GRADE"
                        const isGroupRow = isTotal || isCampus || isGrade

                        const rowBgClass = isTotal
                          ? "bg-[#F0FDFA] font-bold text-[#003B3A] border-b-2 border-[#008B85]/30"
                          : isCampus
                          ? "bg-slate-100/90 font-bold text-slate-900"
                          : isGrade
                          ? "bg-[#F8FAFC] font-bold text-slate-900"
                          : "bg-white hover:bg-[#F8FAFC] text-slate-800"

                        const stickyBgClass = isTotal
                          ? "bg-[#F0FDFA]"
                          : isCampus
                          ? "bg-slate-100"
                          : isGrade
                          ? "bg-[#F8FAFC]"
                          : "bg-white group-hover:bg-[#F8FAFC]"

                        return (
                          <tr
                            key={row.rowKey}
                            className={`group transition-colors align-middle ${rowBgClass}`}
                          >
                            {isGroupRow ? (
                              <td
                                colSpan={2}
                                className={`sticky left-0 z-10 ${stickyBgClass} py-2.5 px-3 text-left font-bold border-r border-[#E2E8F0] whitespace-nowrap min-w-[180px]`}
                              >
                                {row.label}
                              </td>
                            ) : (
                              <>
                                <td
                                  className={`sticky left-0 z-10 ${stickyBgClass} py-2.5 px-2 text-center text-slate-500 border-r border-[#E2E8F0] w-12 min-w-[48px] max-w-[48px]`}
                                >
                                  {row.stt}
                                </td>
                                <td
                                  className={`sticky left-[48px] z-10 ${stickyBgClass} py-2.5 px-3 text-left font-semibold text-slate-900 border-r border-[#E2E8F0] whitespace-nowrap min-w-[132px]`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span>{row.label}</span>
                                    {row.hasClassNoScoresWarning && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-medium text-[#D97706]">
                                        Chưa có điểm
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </>
                            )}

                            {/* TSHS | TSHS KT */}
                            <td className="py-2.5 px-2.5 text-center border-r border-[#E2E8F0]">
                              {renderClickableCount(row, row.tshs, "TSHS", "Sĩ số (TSHS)")}
                            </td>
                            <td className="py-2.5 px-2.5 text-center border-r border-[#E2E8F0]">
                              {renderClickableCount(row, row.tshsKt, "TSHS_KT", "Số học sinh dự KT có điểm")}
                            </td>

                            {showProgressColumns && (
                              <>
                                <td className="py-2.5 px-2 text-center border-r border-[#E2E8F0]">
                                  {renderClickableCount(
                                    row,
                                    row.eligibleCount,
                                    "ELIGIBLE",
                                    "Đủ điều kiện dự kiểm tra"
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center border-r border-[#E2E8F0]">
                                  {renderClickableCount(
                                    row,
                                    row.absentOrMakeupCount,
                                    "ABSENT_MAKEUP",
                                    "Vắng / Chờ kiểm tra bù",
                                    undefined,
                                    row.absentOrMakeupCount > 0 ? "text-[#D97706]" : ""
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center border-r border-[#E2E8F0]">
                                  {renderClickableCount(
                                    row,
                                    row.missingScoreCount,
                                    "MISSING_SCORE",
                                    "Chưa có điểm",
                                    undefined,
                                    row.missingScoreCount > 0 ? "text-[#E11D48]" : ""
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center border-r border-[#E2E8F0]">
                                  {renderClickableCount(row, row.exemptCount, "EXEMPT", "Được miễn")}
                                </td>
                              </>
                            )}

                            {/* Nhóm Điểm từ trung bình trở lên (SL | TL) */}
                            {aboveBuckets.map((b) => {
                              const cell = row.buckets[b.id] || {
                                sl: 0,
                                tlDisplay: "0.00%",
                              }
                              return (
                                <React.Fragment key={b.id}>
                                  <td className="py-2.5 px-2 text-center border-r border-[#F1F5F9]">
                                    {renderClickableCount(
                                      row,
                                      cell.sl,
                                      "BUCKET_SL",
                                      `${b.label}`,
                                      b.id
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-right border-r border-[#E2E8F0] text-[11px] whitespace-nowrap">
                                    {cell.tlDisplay}
                                  </td>
                                </React.Fragment>
                              )
                            })}

                            {/* Cột Cộng (>= 5): SL | TL */}
                            <td className="py-2.5 px-2 text-center bg-teal-50/40 font-bold border-r border-[#F1F5F9]">
                              {renderClickableCount(
                                row,
                                row.aboveThreshold.sl,
                                "ABOVE_SL",
                                "Cộng điểm từ trung bình trở lên"
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right bg-teal-50/40 font-bold text-[#00736E] border-r border-[#E2E8F0] whitespace-nowrap">
                              {row.aboveThreshold.tlDisplay}
                            </td>

                            {/* Nhóm Điểm dưới trung bình (SL | TL) */}
                            {belowBuckets.map((b) => {
                              const cell = row.buckets[b.id] || {
                                sl: 0,
                                tlDisplay: "0.00%",
                              }
                              return (
                                <React.Fragment key={b.id}>
                                  <td className="py-2.5 px-2 text-center border-r border-[#F1F5F9]">
                                    {renderClickableCount(
                                      row,
                                      cell.sl,
                                      "BUCKET_SL",
                                      `${b.label}`,
                                      b.id,
                                      cell.sl > 0 ? "text-[#E11D48]" : ""
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-right border-r border-[#E2E8F0] text-[11px] whitespace-nowrap">
                                    {cell.tlDisplay}
                                  </td>
                                </React.Fragment>
                              )
                            })}

                            {/* Cột Cộng (< 5): SL | TL */}
                            <td className="py-2.5 px-2 text-center bg-rose-50/30 font-bold border-r border-[#F1F5F9]">
                              {renderClickableCount(
                                row,
                                row.belowThreshold.sl,
                                "BELOW_SL",
                                "Cộng điểm dưới trung bình",
                                undefined,
                                row.belowThreshold.sl > 0 ? "text-[#E11D48]" : ""
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right bg-rose-50/30 font-bold text-[#E11D48] whitespace-nowrap">
                              {row.belowThreshold.tlDisplay}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ghi chú chân bảng */}
              <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-600">
                <div>
                  <strong className="text-slate-900">Ghi chú công thức:</strong>{" "}
                  <span>
                    <strong>TL = Số học sinh tại mức điểm (SL) / Tổng số học sinh có điểm hợp lệ (TSHS KT)</strong>.{" "}
                    {reportData.rosterStatusNote}.
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 shrink-0">
                  Nhấn vào số lượng &gt; 0 để xem danh sách học sinh.
                </div>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------
              CHẾ ĐỘ C: NHÓM 5 — TỔNG HỢP THEO BẬC HỌC, HỆ HỌC, CƠ SỞ & KẾ HOẠCH CẢI TIẾN
             ----------------------------------------------------------------- */}
          {defaultFocusSection === "LEVEL_SYSTEM" && reportData.levelAndSystemAnalysis && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="border-l-4 border-[#003B3A] pl-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tổng hợp kết quả môn {reportData.header.subjectName} theo Bậc học, Hệ học &amp; Kế hoạch cải tiến ({reportData.header.periodLabel})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đối sánh điểm trung bình, độ lệch chuẩn (σ), tỷ lệ đạt chuẩn Bộ GD&amp;ĐT (≥ 5.0) và chuẩn nội bộ Sky-Line giữa các Hệ đào tạo.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-left text-white">Nhóm phân tích</th>
                      <th className="py-3 px-3 text-left text-white">Bậc học / Hệ đào tạo Sky-Line</th>
                      <th className="py-3 px-3 text-center text-teal-100">Số lớp</th>
                      <th className="py-3 px-3 text-center text-teal-100">TSHS</th>
                      <th className="py-3 px-3 text-center text-white">TSHS KT</th>
                      <th className="py-3 px-3 text-center text-[#5EEAD4]">ĐTB</th>
                      <th className="py-3 px-3 text-center text-teal-100">Độ lệch chuẩn (σ)</th>
                      <th className="py-3 px-3 text-center text-[#5EEAD4]">Đạt chuẩn Bộ (≥ 5.0)</th>
                      <th className="py-3 px-3 text-center text-teal-100">Dưới 5.0</th>
                      <th className="py-3 px-3 text-center text-[#5EEAD4]">Đạt chuẩn Sky-Line</th>
                      <th className="py-3 px-3 text-center text-teal-100">Khá – Giỏi (≥ 8.0)</th>
                      <th className="py-3 px-3 text-left text-white">Khuyến nghị &amp; Kế hoạch cải tiến chuyên môn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {(reportData.levelAndSystemAnalysis.byLevel || []).map((item: any) => (
                      <tr
                        key={`lvl_${item.levelCode}`}
                        className="transition-colors align-middle bg-[#F8FAFC]/70 hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 font-semibold text-[#00736E]">Theo Bậc học</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{item.levelName}</td>
                        <td className="py-3 px-3 text-center">{item.classCount}</td>
                        <td className="py-3 px-3 text-center">{item.tshs}</td>
                        <td className="py-3 px-3 text-center font-semibold">{item.tshsKt}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#003B3A]">
                          {item.avgScore !== null ? item.avgScore.toFixed(2) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.stdDev !== null ? item.stdDev.toFixed(2) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#059669]">
                          {item.passMoetCount} ({item.passMoetRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#E11D48]">
                          {item.belowMoetCount} ({item.belowMoetRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                          {item.passSkylineCount} ({item.passSkylineRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-800">
                          {item.goodExcellentCount} ({item.goodExcellentRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          Chuẩn nội bộ áp dụng: ≥ {item.skylineBenchmark.toFixed(1)} điểm.
                        </td>
                      </tr>
                    ))}

                    {(reportData.levelAndSystemAnalysis.bySystem || []).map((item: any) => (
                      <tr
                        key={`sys_${item.systemCode}`}
                        className="transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td className="py-3 px-3 font-medium text-slate-600">Theo Hệ học</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{item.systemName}</td>
                        <td className="py-3 px-3 text-center">{item.classCount}</td>
                        <td className="py-3 px-3 text-center">{item.tshs}</td>
                        <td className="py-3 px-3 text-center font-semibold">{item.tshsKt}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#003B3A]">
                          {item.avgScore !== null ? item.avgScore.toFixed(2) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.stdDev !== null ? item.stdDev.toFixed(2) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#059669]">
                          {item.passMoetCount} ({item.passMoetRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#E11D48]">
                          {item.belowMoetCount} ({item.belowMoetRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#00736E]">
                          {item.passSkylineCount} ({item.passSkylineRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-800">
                          {item.goodExcellentCount} ({item.goodExcellentRateDisplay})
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-md">{item.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Modal Drill-down danh sách học sinh cấu thành chỉ tiêu */}
      <ThkqPeriodicStudentDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        loading={detailLoading}
        title={detailTitle}
        subtitle={detailSubtitle}
        students={detailStudents}
        canExportDetail={canExportDetail}
      />
    </div>
  )
}
