// @ts-nocheck
"use client"

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import * as XLSX from "xlsx"
import { toast } from "react-hot-toast"
import {
  ShieldCheck,
  ChevronRight,
  Home,
} from "lucide-react"

import {
  THKQ_REPORT_GROUPS,
  ThkqReportGroupId,
  ThkqReportId,
  findThkqReportById,
} from "@/lib/ktdbcl/thkqReportCatalog"
import { ThkqPeriodicTestReportView } from "@/components/ktdbcl/thkq/ThkqPeriodicTestReportView"
import { ThkqFormulaLegend } from "@/components/ktdbcl/ThkqFormulaLegend"
import ThkqBasicStatsView from "@/components/ktdbcl/thkq/ThkqBasicStatsView"
import { ThkqFilterToolbar } from "@/components/ktdbcl/thkq/ThkqFilterToolbar"
import { ThkqKpiCards } from "@/components/ktdbcl/thkq/ThkqKpiCards"
import { ThkqHeatmapMatrix } from "@/components/ktdbcl/thkq/ThkqHeatmapMatrix"
import { ThkqComparativeCharts } from "@/components/ktdbcl/thkq/ThkqComparativeCharts"
import { ThkqClassStatsTable } from "@/components/ktdbcl/thkq/ThkqClassStatsTable"
import { ThkqTargetStudentsTable } from "@/components/ktdbcl/thkq/ThkqTargetStudentsTable"
import { ThkqDrilldownModal } from "@/components/ktdbcl/thkq/ThkqDrilldownModal"
import { GradeAnalyticsTab } from "@/app/admin/ktdbcl/diem-nhan-xet/analytics-tab"
import { GradeProgressTab } from "@/app/admin/ktdbcl/diem-nhan-xet/progress-tab"
import { isGradeMatching } from "@/app/admin/ktdbcl/diem-nhan-xet/grade-utils"

interface Props {
  academicYears: any[]
  activeYearId: string
  campuses: any[]
  subjects: any[]
  gradeConfigs?: any[]
  classes: any[]
  isSubjectScoped?: boolean
  accessScope?: any
}

export function PhanTichThkqClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Đang tải hệ thống Phân tích Tổng hợp Kết quả (THKQ)...
        </div>
      }
    >
      <PhanTichThkqClientInner {...props} />
    </Suspense>
  )
}

const GROUP_DEFAULT_REPORT: Record<ThkqReportGroupId, ThkqReportId> = {
  COMPONENT_SCORES: "periodic-test-results",
  AVERAGE_SCORES: "average-by-scope",
  SCORE_DISTRIBUTION: "score-range-distribution",
  COMPREHENSIVE_SUMMARY: "basic-statistics",
}

function PhanTichThkqClientInner({
  academicYears = [],
  activeYearId = "",
  campuses = [],
  subjects = [],
  gradeConfigs = [],
  classes = [],
  isSubjectScoped = false,
  accessScope = null,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawReportParam = searchParams?.get("report") || "periodic-test-results"
  const resolvedInitialReport = findThkqReportById(rawReportParam).id

  const [activeReportId, setActiveReportId] = useState<ThkqReportId>(resolvedInitialReport)

  useEffect(() => {
    if (rawReportParam === "entry-progress-monitor") {
      router.replace("/admin/ktdbcl/giam-sat-tien-do?tab=entry-status")
      return
    }
    const resolved = findThkqReportById(rawReportParam).id
    if (resolved !== activeReportId) {
      setActiveReportId(resolved)
    }
  }, [rawReportParam, activeReportId, router])

  const activeReportMeta = useMemo(
    () => findThkqReportById(activeReportId),
    [activeReportId]
  )

  const activeGroup = useMemo(
    () =>
      THKQ_REPORT_GROUPS.find((g) => g.id === activeReportMeta.groupId) ||
      THKQ_REPORT_GROUPS[0],
    [activeReportMeta.groupId]
  )

  const activeGroupReports = useMemo(
    () => activeGroup.reports.filter((r) => r.isImplemented && r.isReadyForMenu),
    [activeGroup]
  )

  const handleSelectReport = (repId: ThkqReportId) => {
    setActiveReportId(repId)
    router.replace(`/admin/ktdbcl/phan-tich-thkq?report=${repId}`, { scroll: false })
  }

  const handleSelectGroup = (groupId: ThkqReportGroupId) => {
    const defaultRep = GROUP_DEFAULT_REPORT[groupId] || "periodic-test-results"
    handleSelectReport(defaultRep)
  }

  const handleNavigateToGradebook = (params: any) => {
    const query = new URLSearchParams()
    query.set("tab", "grades")
    if (params.campusId) query.set("campusId", params.campusId)
    if (params.grade) query.set("grade", params.grade)
    if (params.classId) query.set("classId", params.classId)
    if (params.subjectId) query.set("subjectId", params.subjectId)
    if (params.period) query.set("period", params.period)
    if (params.configType) query.set("configType", params.configType)
    router.push(`/admin/ktdbcl/diem-nhan-xet?${query.toString()}`)
  }

  // States dùng cho Nhóm 2 (Điểm trung bình) và Nhóm 3 (Khoảng điểm)
  const [selectedYearId, setSelectedYearId] = useState(
    activeYearId || (academicYears[0]?.id ?? "")
  )
  const [selectedPeriod, setSelectedPeriod] = useState("GK1")
  const [selectedLevel, setSelectedLevel] = useState("TIEU_HOC")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    isSubjectScoped && subjects.length === 1 ? subjects[0].id : "ALL"
  )
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedScoreRange, setSelectedScoreRange] = useState("ALL")
  const [selectedTargetType, setSelectedTargetType] = useState("ALL")
  const [searchKeyword, setSearchKeyword] = useState("")

  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    kpi: any
    benchmarks: any
    heatmap: any
    classStats: any[]
    charts: any
    targetStudents: any[]
    totalTargetStudentsCount: number
    countsByTargetGroup: any
    periodSubjects?: any[]
    subjects?: any[]
  }>({
    kpi: null,
    benchmarks: null,
    heatmap: { columns: [], rows: [] },
    classStats: [],
    charts: null,
    targetStudents: [],
    totalTargetStudentsCount: 0,
    countsByTargetGroup: {
      belowSkyline: 0,
      belowMoet: 0,
      commitment: 0,
      psychological: 0,
      perfect10: 0,
    },
    periodSubjects: [],
  })

  const [drilldownCell, setDrilldownCell] = useState<any>(null)
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false)

  const usesMultiSubjectAnalyticsApi =
    activeReportId === "average-by-scope" ||
    activeReportId === "score-range-distribution"

  const fetchMultiSubjectAnalytics = useCallback(async () => {
    if (!selectedYearId || !usesMultiSubjectAnalyticsApi) return
    setLoadingAnalytics(true)
    try {
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        level: selectedLevel,
        grade: selectedGrade,
        subjectId: selectedSubjectId,
        campusId: selectedCampusId,
        scoreRange: selectedScoreRange,
        targetType: selectedTargetType,
        searchKeyword,
      })

      const res = await fetch(`/api/admin/ktdbcl/thkq-analytics?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải dữ liệu phân tích")
      }

      setAnalyticsData(json.data)
    } catch (err: any) {
      console.error("Lỗi tải phân tích THKQ:", err)
      toast.error(err.message || "Lỗi tải số liệu phân tích THKQ")
    } finally {
      setLoadingAnalytics(false)
    }
  }, [
    selectedYearId,
    selectedPeriod,
    selectedLevel,
    selectedGrade,
    selectedSubjectId,
    selectedCampusId,
    selectedScoreRange,
    selectedTargetType,
    searchKeyword,
    usesMultiSubjectAnalyticsApi,
  ])

  useEffect(() => {
    if (usesMultiSubjectAnalyticsApi) {
      fetchMultiSubjectAnalytics()
    }
  }, [fetchMultiSubjectAnalytics, usesMultiSubjectAnalyticsApi])

  const availableSubjectsForPeriod = useMemo(() => {
    const subMap = new Map<string, { id: string; subjectName: string; subjectCode: string }>()
    const apiSubjects = analyticsData.periodSubjects || analyticsData.subjects || []
    if (apiSubjects.length > 0) {
      apiSubjects.forEach((s: any) => {
        subMap.set(s.id, {
          id: s.id,
          subjectName: s.subjectName || s.name,
          subjectCode: s.subjectCode || s.code || "",
        })
      })
    }
    if (gradeConfigs && gradeConfigs.length > 0) {
      gradeConfigs.forEach((cfg: any) => {
        const periodMatch =
          selectedPeriod === "ALL" ||
          cfg.evaluationPeriod === selectedPeriod ||
          cfg.evaluationPeriod === "ALL"
        const gradeMatch =
          selectedGrade === "ALL" || isGradeMatching(cfg.grade, selectedGrade)
        if (periodMatch && gradeMatch && cfg.subject) {
          subMap.set(cfg.subject.id, {
            id: cfg.subject.id,
            subjectName: cfg.subject.subjectName,
            subjectCode: cfg.subject.subjectCode,
          })
        }
      })
    }
    if (subMap.size === 0 && subjects && subjects.length > 0) {
      subjects.forEach((s: any) => {
        subMap.set(s.id, {
          id: s.id,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode,
        })
      })
    }
    return Array.from(subMap.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    )
  }, [
    analyticsData.periodSubjects,
    analyticsData.subjects,
    gradeConfigs,
    selectedPeriod,
    selectedGrade,
    subjects,
  ])

  const handleCellClick = (cell: any) => {
    setDrilldownCell(cell)
    setDrilldownModalOpen(true)
  }

  const handleKpiFilter = (filterType: string) => {
    if (filterType === "ALL") {
      setSelectedScoreRange("ALL")
      setSelectedTargetType("ALL")
    } else if (filterType === "BELOW_MOET") {
      setSelectedScoreRange("UNDER_5")
      setSelectedTargetType("BELOW_MOET")
    } else if (filterType === "BELOW_SKYLINE") {
      setSelectedScoreRange("UNDER_BENCHMARK")
      setSelectedTargetType("BELOW_SKYLINE")
    } else if (filterType === "8_TO_10") {
      setSelectedScoreRange("8_TO_10")
      setSelectedTargetType("8_TO_10")
    } else if (filterType === "PERFECT_10") {
      setSelectedScoreRange("PERFECT_10")
      setSelectedTargetType("PERFECT_10")
    }
  }

  const handleSelectTargetType = (type: string) => {
    setSelectedTargetType(type)
    if (
      type !== "ALL" ||
      selectedScoreRange === "8_TO_10" ||
      selectedScoreRange === "PERFECT_10"
    ) {
      setSelectedScoreRange("ALL")
    }
  }

  const handleExportMultiSubjectExcel = () => {
    if (!analyticsData || !analyticsData.classStats) {
      toast.error("Không có dữ liệu để xuất file")
      return
    }

    try {
      const wb = XLSX.utils.book_new()
      const classRows = analyticsData.classStats.map((c, idx) => ({
        STT: idx + 1,
        Lớp: c.className,
        Khối: c.gradeLabel,
        "Cơ sở": c.campusName,
        "Môn học": c.subjectName,
        GVCN: c.homeroomTeacher || "",
        "Sĩ số": c.studentCount,
        "ĐTB Lớp": c.avgScore,
        "ĐTB Khối": c.gradeAvgScore,
        "ĐTB Cơ sở": c.campusAvgScore,
        "ĐTB Hệ thống": c.systemAvgScore,
        "Độ lệch chuẩn (σ)": c.stdDev,
        "Mức độ phân hóa": c.dispersionLabel || "",
        "Lệch với Cơ sở (Δ)": c.deltaCampus,
        "Lệch với Khối (Δ)": c.deltaGrade,
        "Số HS dưới 5": c.below5Count,
        "Tỷ lệ dưới 5 (%)": c.below5Rate,
        "Số HS dưới chuẩn SL": c.belowSkylineCount,
        "Tỷ lệ dưới chuẩn SL (%)": c.belowSkylineRate,
        "Số HS Điểm 10": c.perfect10Count,
        "Đánh giá Sư phạm": c.pedagogicalNote || "",
      }))
      const wsClass = XLSX.utils.json_to_sheet(classRows)
      XLSX.utils.book_append_sheet(wb, wsClass, "ThongKe_Lop_DoLechChuan")

      const campusNameStr =
        selectedCampusId !== "ALL"
          ? campuses.find((c) => c.id === selectedCampusId)?.campusName || "CoSo"
          : "ToanHeThong"
      XLSX.writeFile(wb, `BaoCao_PhanTich_THKQ_${campusNameStr}_${selectedPeriod}.xlsx`)
      toast.success("Xuất báo cáo Excel thành công!")
    } catch (err: any) {
      toast.error("Không thể xuất file Excel: " + err.message)
    }
  }

  const selectedCampusObj = campuses.find((c) => c.id === selectedCampusId)
  const selectedCampusName = selectedCampusObj
    ? selectedCampusObj.campusName
    : "Toàn hệ thống"

  return (
    <div className="space-y-4 pb-12">
      {/* =====================================================================
          THANH TIÊU ĐỀ & ĐIỀU HƯỚNG 5 NHÓM BÁO CÁO (GỌN GÀNG, KHÔNG TRÙNG LẶP)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 font-medium">
              <a
                href="/admin"
                className="hover:text-slate-800 transition flex items-center gap-1"
              >
                <Home className="h-3.5 w-3.5" /> Quản trị
              </a>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-slate-600">Sổ điểm - Nhận xét</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#00736E] font-semibold">
                Phân tích Tổng hợp Kết quả (THKQ)
              </span>
            </nav>

            <div className="border-l-4 border-[#003B3A] pl-3 flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                {activeReportMeta.title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00A19A]" />
                {accessScope?.roleDisplayLabel || "Sổ điểm & Khảo thí Sky-Line"}
              </span>
            </div>
          </div>

          {/* Segmented Control 5 Nhóm Báo cáo trên 1 hàng */}
          <div className="inline-flex flex-wrap items-center rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0] gap-1">
            {THKQ_REPORT_GROUPS.map((group) => {
              const isGroupActive = activeGroup.id === group.id
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleSelectGroup(group.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    isGroupActive
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  {group.order}. {group.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nếu nhóm đang chọn có nhiều hơn 1 báo cáo (Nhóm 1: Điểm thành phần), hiển thị thanh chọn gọn nhẹ */}
        {activeGroupReports.length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium">
                Báo cáo thuộc nhóm {activeGroup.name}:
              </span>
              {activeGroupReports.map((rep) => {
                const isRepActive = activeReportId === rep.id
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => handleSelectReport(rep.id)}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      isRepActive
                        ? "bg-[#F0FDFA] text-[#00736E] border border-[#008B85]"
                        : "bg-white text-slate-600 border border-[#E2E8F0] hover:border-slate-300"
                    }`}
                  >
                    {rep.title}
                  </button>
                )
              })}
            </div>
            <span className="text-slate-500 hidden xl:inline">
              {activeReportMeta.description}
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          NỘI DUNG ĐỘC LẬP CỦA TỪNG BÁO CÁO (0% TRÙNG LẶP GIỮA CÁC NHÓM)
         ===================================================================== */}

      <ThkqFormulaLegend variant="THKQ" />

      {/* NHÓM 1A: THỐNG KÊ KẾT QUẢ KIỂM TRA ĐỊNH KỲ (MẪU ĐỐI SOÁT VNEDU) */}
      {activeReportId === "periodic-test-results" && (
        <ThkqPeriodicTestReportView
          key="periodic-test-results"
          academicYears={academicYears}
          activeYearId={activeYearId}
          initialCampuses={campuses}
          initialSubjects={subjects}
          initialClasses={classes}
          defaultFocusSection="TABLE"
        />
      )}

      {/* NHÓM 1B: CHẤT LƯỢNG KIỂM TRA THEO GIÁO VIÊN & ĐỐI SÁNH CAM KẾT KSĐV */}
      {activeReportId === "teacher-test-quality" && (
        <GradeAnalyticsTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          savedConfigs={gradeConfigs}
          onNavigateToGradebook={handleNavigateToGradebook}
        />
      )}

      {/* NHÓM 2: ĐIỂM TRUNG BÌNH THEO MÔN, LỚP, KHỐI, CƠ SỞ */}
      {activeReportId === "average-by-scope" && (
        <div className="space-y-4">
          <ThkqFilterToolbar
            academicYears={academicYears}
            selectedYearId={selectedYearId}
            setSelectedYearId={setSelectedYearId}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            selectedCampusId={selectedCampusId}
            setSelectedCampusId={setSelectedCampusId}
            selectedScoreRange={selectedScoreRange}
            setSelectedScoreRange={setSelectedScoreRange}
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            campuses={campuses}
            subjects={subjects}
            availableSubjects={availableSubjectsForPeriod}
            loading={loadingAnalytics}
            onRefresh={fetchMultiSubjectAnalytics}
            onExportExcel={handleExportMultiSubjectExcel}
            hideScoreRangeFilter
          />
          {analyticsData.charts && (
            <ThkqComparativeCharts
              charts={analyticsData.charts}
              selectedCampusName={selectedCampusName}
              selectedLevel={selectedLevel}
            />
          )}
          <ThkqClassStatsTable classStats={analyticsData.classStats} />
        </div>
      )}

      {/* NHÓM 3: PHÂN PHỐI ĐIỂM THEO NGƯỠNG CẤU HÌNH & PHỔ ĐIỂM THEO MÔN */}
      {activeReportId === "score-range-distribution" && (
        <div className="space-y-6">
          <ThkqBasicStatsView
            key="score-range-distribution-pho-diem"
            academicYears={academicYears}
            defaultAcademicYearId={activeYearId || (academicYears[0]?.id ?? "")}
            defaultActiveTab="CHART"
          />
          <ThkqFilterToolbar
            academicYears={academicYears}
            selectedYearId={selectedYearId}
            setSelectedYearId={setSelectedYearId}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            selectedCampusId={selectedCampusId}
            setSelectedCampusId={setSelectedCampusId}
            selectedScoreRange={selectedScoreRange}
            setSelectedScoreRange={setSelectedScoreRange}
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            campuses={campuses}
            subjects={subjects}
            availableSubjects={availableSubjectsForPeriod}
            loading={loadingAnalytics}
            onRefresh={fetchMultiSubjectAnalytics}
            onExportExcel={handleExportMultiSubjectExcel}
          />
          <ThkqKpiCards
            kpi={analyticsData.kpi}
            onSelectKpiFilter={handleKpiFilter}
            activeFilter={selectedTargetType}
          />
          <ThkqHeatmapMatrix
            heatmap={analyticsData.heatmap}
            onCellClick={handleCellClick}
          />
          <ThkqTargetStudentsTable
            students={analyticsData.targetStudents}
            totalCount={analyticsData.totalTargetStudentsCount}
            countsByGroup={analyticsData.countsByTargetGroup}
            selectedTargetType={selectedTargetType}
            setSelectedTargetType={handleSelectTargetType}
          />
          <ThkqDrilldownModal
            isOpen={drilldownModalOpen}
            onClose={() => setDrilldownModalOpen(false)}
            cellData={drilldownCell}
          />
        </div>
      )}

      {/* NHÓM 4: THỐNG KÊ CƠ BẢN (ĐỐI CHIẾU CƠ SỞ VÀ HỆ THỐNG THEO KHỐI) */}
      {(activeReportId === "basic-statistics" || activeReportId === "system-level-summary") && (
        <ThkqBasicStatsView
          key="basic-statistics"
          academicYears={academicYears}
          defaultAcademicYearId={activeYearId || (academicYears[0]?.id ?? "")}
        />
      )}
    </div>
  )
}
