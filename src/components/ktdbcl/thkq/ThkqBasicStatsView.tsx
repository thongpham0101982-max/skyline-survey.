"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Download,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  Table2,
} from "lucide-react"
import type {
  BasicColumnStats,
  BasicStatsGradePair,
  BasicStatsIndicatorRow,
  ScoreDistribution8Summary,
} from "@/lib/ktdbcl/thkqBasicStatsEngine"

interface ThkqBasicStatsViewProps {
  academicYears: Array<{ id: string; name: string; status: string }>
  defaultAcademicYearId: string
  defaultActiveTab?: "CHART" | "TABLE"
}

interface FilterOptionsState {
  periods: Array<{
    code: string
    label: string
    hasData: boolean
    hasConfig: boolean
    entryCount: number
  }>
  levels: Array<{
    code: string
    label: string
    classCount: number
  }>
  subjects: Array<{
    id: string
    subjectCode: string
    subjectName: string
    entryCount: number
  }>
  grades: Array<{
    code: string
    gradeNumber: number
    label: string
  }>
  campuses: Array<{
    id: string
    campusCode: string
    campusName: string
    classCountInLevel: number
  }>
}

interface ScoreDistributionState {
  isAllSystemSelected: boolean
  selectedGrade: string
  selectedGradeLabel: string
  campusLabel: string
  systemLabel: string
  campusDistribution: ScoreDistribution8Summary
  systemDistribution: ScoreDistribution8Summary
  campusBasicStats?: BasicColumnStats
  systemBasicStats?: BasicColumnStats
}

export default function ThkqBasicStatsView({
  academicYears,
  defaultAcademicYearId,
  defaultActiveTab = "CHART",
}: ThkqBasicStatsViewProps) {
  const [academicYearId, setAcademicYearId] = useState<string>(defaultAcademicYearId)
  const [evaluationPeriod, setEvaluationPeriod] = useState<string>("GK1")
  const [level, setLevel] = useState<string>("TIEU_HOC")
  const [subjectId, setSubjectId] = useState<string>("")
  const [grade, setGrade] = useState<string>("ALL")
  const [campusId, setCampusId] = useState<string>("")

  // Hai tab dùng chung bộ lọc Kỳ khảo sát · Bậc học · Môn · Khối · Cơ sở và giữ nguyên bộ lọc khi chuyển tab
  const [activeTab, setActiveTab] = useState<"CHART" | "TABLE">(defaultActiveTab)
  // Trục dọc biểu đồ: "COUNT" (Số học sinh) hoặc "RATE" (Tỷ lệ %)
  const [yAxisMode, setYAxisMode] = useState<"RATE" | "COUNT">("RATE")
  // Chế độ hiển thị cột trên biểu đồ khi chọn 1 cơ sở: "COMPARE" (Đối chiếu 2 cột Cơ sở & Hệ thống) hoặc "SINGLE_SYSTEM" / "SINGLE_CAMPUS"
  const [compareMode, setCompareMode] = useState<"COMPARE" | "SINGLE_CAMPUS" | "SINGLE_SYSTEM">(
    "COMPARE"
  )
  // Tooltip khi rê chuột hoặc chạm vào cột
  const [activeBarTooltip, setActiveBarTooltip] = useState<{
    bucketId: string
    scope: "CAMPUS" | "SYSTEM"
    scopeLabel: string
    text: string
  } | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [meta, setMeta] = useState<{
    academicYearId: string
    academicYearName: string
    evaluationPeriod: string
    evaluationPeriodLabel: string
    level: string
    levelLabel: string
    subjectId: string
    subjectCode: string
    subjectName: string
    grade: string
    gradeLabel: string
    campusId: string
    campusCode: string
    campusName: string
    comparisonCampusCode?: string
    comparisonCampusName?: string
    isAllSystemSelected?: boolean
    generatedAt: string
  } | null>(null)

  const [accessScope, setAccessScope] = useState<{
    scopeTier: string
    scopeLabel: string
    canExportExcel: boolean
    isCampusRestricted: boolean
    allowedCampusIds: string[]
  } | null>(null)

  const [filterOptions, setFilterOptions] = useState<FilterOptionsState>({
    periods: [],
    levels: [],
    subjects: [],
    grades: [],
    campuses: [],
  })

  const [gradePairs, setGradePairs] = useState<BasicStatsGradePair[]>([])
  const [levelTotalPair, setLevelTotalPair] = useState<BasicStatsGradePair | null>(null)
  const [indicatorRows, setIndicatorRows] = useState<BasicStatsIndicatorRow[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionState | null>(null)

  const displayPairs = useMemo(
    () => (levelTotalPair ? [...gradePairs, levelTotalPair] : gradePairs),
    [gradePairs, levelTotalPair]
  )

  useEffect(() => {
    if (defaultAcademicYearId && !academicYearId) {
      setAcademicYearId(defaultAcademicYearId)
    }
  }, [defaultAcademicYearId, academicYearId])

  // Khi chọn một cơ sở cụ thể, mặc định dùng Tỷ lệ (%) để đối chiếu hai cột cạnh nhau
  useEffect(() => {
    if (campusId && campusId !== "ALL") {
      setYAxisMode("RATE")
      setCompareMode("COMPARE")
    } else if (campusId === "ALL") {
      setYAxisMode("COUNT")
    }
  }, [campusId])

  const fetchBasicStats = useCallback(
    async (params: {
      academicYearId: string
      evaluationPeriod: string
      level: string
      subjectId: string
      grade: string
      campusId: string
    }) => {
      if (!params.academicYearId) return
      setLoading(true)
      setError(null)
      try {
        const sp = new URLSearchParams({
          academicYearId: params.academicYearId,
          evaluationPeriod: params.evaluationPeriod,
          level: params.level,
        })
        if (params.subjectId) sp.set("subjectId", params.subjectId)
        if (params.grade) sp.set("grade", params.grade)
        if (params.campusId) sp.set("campusId", params.campusId)

        const res = await fetch(`/api/admin/ktdbcl/thkq-basic-stats?${sp.toString()}`, {
          cache: "no-store",
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Không thể tải báo cáo Thống kê cơ bản & Phổ điểm.")
        }

        setMeta(data.meta)
        setAccessScope(data.accessScope || null)
        setFilterOptions(
          data.filterOptions || {
            periods: [],
            levels: [],
            subjects: [],
            grades: [],
            campuses: [],
          }
        )
        setGradePairs(data.gradePairs || [])
        setLevelTotalPair(data.levelTotalPair || null)
        setIndicatorRows(data.indicatorRows || [])
        setScoreDistribution(data.scoreDistribution || null)
        setActiveBarTooltip(null)

        if (data.appliedFilters) {
          if (data.appliedFilters.evaluationPeriod !== params.evaluationPeriod) {
            setEvaluationPeriod(data.appliedFilters.evaluationPeriod)
          }
          if (data.appliedFilters.level !== params.level) {
            setLevel(data.appliedFilters.level)
          }
          if (data.appliedFilters.subjectId !== params.subjectId) {
            setSubjectId(data.appliedFilters.subjectId)
          }
          if (data.appliedFilters.grade && data.appliedFilters.grade !== params.grade) {
            setGrade(data.appliedFilters.grade)
          }
          if (data.appliedFilters.campusId !== params.campusId) {
            setCampusId(data.appliedFilters.campusId)
          }
        }
      } catch (err: any) {
        setError(err.message || "Lỗi kết nối máy chủ.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!academicYearId) return
    fetchBasicStats({
      academicYearId,
      evaluationPeriod,
      level,
      subjectId,
      grade,
      campusId,
    })
  }, [academicYearId, evaluationPeriod, level, subjectId, grade, campusId, fetchBasicStats])

  const handleExportExcel = async () => {
    if (!academicYearId || loading) return
    setExporting(true)
    try {
      const sp = new URLSearchParams({
        academicYearId,
        evaluationPeriod,
        level,
        subjectId,
        grade,
        campusId,
        format: "xlsx",
      })
      const res = await fetch(`/api/admin/ktdbcl/thkq-basic-stats?${sp.toString()}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Không thể xuất file Excel.")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Thong_ke_co_ban_Pho_diem_${evaluationPeriod}_${meta?.campusCode || "ALL"}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || "Lỗi khi xuất Excel.")
    } finally {
      setExporting(false)
    }
  }

  const isAllSystemSelected = Boolean(scoreDistribution?.isAllSystemSelected)
  const sysDist = scoreDistribution?.systemDistribution
  const cpDist = scoreDistribution?.campusDistribution
  const sysBasic = scoreDistribution?.systemBasicStats
  const cpBasic = scoreDistribution?.campusBasicStats

  const hasAnyValidScoreForChart = isAllSystemSelected
    ? (sysDist?.totalValidCount || 0) > 0
    : (cpDist?.totalValidCount || 0) > 0 || (sysDist?.totalValidCount || 0) > 0

  // Xác định chế độ vẽ 1 dãy cột hay 2 dãy cột đối chiếu trên SVG
  const showDualBars = !isAllSystemSelected && compareMode === "COMPARE"
  const singleDist =
    isAllSystemSelected || compareMode === "SINGLE_SYSTEM" ? sysDist : cpDist

  // Đỉnh trục Y và các mốc chia cho biểu đồ SVG 8 khoảng điểm:
  // Điểm 0, 0 < điểm < 2, 2 ≤ điểm < 4, 4 ≤ điểm < 5, 5 ≤ điểm < 7, 7 ≤ điểm < 8, 8 ≤ điểm < 10, Điểm 10
  const svgMaxY = useMemo(() => {
    if (!scoreDistribution) return 100
    const sysBuckets = scoreDistribution.systemDistribution.buckets
    const cpBuckets = scoreDistribution.campusDistribution.buckets

    if (yAxisMode === "RATE") {
      let maxRate = 0
      sysBuckets.forEach((b, idx) => {
        if ((showDualBars || isAllSystemSelected || compareMode === "SINGLE_SYSTEM") && b.rate > maxRate) {
          maxRate = b.rate
        }
        if ((showDualBars || (!isAllSystemSelected && compareMode === "SINGLE_CAMPUS")) && cpBuckets[idx] && cpBuckets[idx].rate > maxRate) {
          maxRate = cpBuckets[idx].rate
        }
      })
      if (maxRate <= 0) return 100
      return Math.min(100, Math.ceil((maxRate + 12) / 10) * 10)
    } else {
      let maxCnt = 0
      sysBuckets.forEach((b, idx) => {
        if ((showDualBars || isAllSystemSelected || compareMode === "SINGLE_SYSTEM") && b.count > maxCnt) {
          maxCnt = b.count
        }
        if ((showDualBars || (!isAllSystemSelected && compareMode === "SINGLE_CAMPUS")) && cpBuckets[idx] && cpBuckets[idx].count > maxCnt) {
          maxCnt = cpBuckets[idx].count
        }
      })
      if (maxCnt <= 0) return 10
      if (maxCnt <= 5) return 6
      if (maxCnt <= 10) return 12
      if (maxCnt <= 30) return Math.ceil((maxCnt + 4) / 5) * 5
      if (maxCnt <= 100) return Math.ceil((maxCnt * 1.15) / 10) * 10
      if (maxCnt <= 500) return Math.ceil((maxCnt * 1.15) / 50) * 50
      return Math.ceil((maxCnt * 1.15) / 100) * 100
    }
  }, [scoreDistribution, yAxisMode, showDualBars, isAllSystemSelected, compareMode])

  const svgYTicks = useMemo(() => {
    const numSteps = 5
    const step = svgMaxY / numSteps
    return Array.from({ length: numSteps + 1 }, (_, i) => {
      const val = svgMaxY - i * step
      return yAxisMode === "RATE" ? Math.round(val * 10) / 10 : Math.round(val)
    })
  }, [svgMaxY, yAxisMode])

  // Bảng mã màu biểu đồ chuẩn theo từng cơ sở & Toàn hệ thống:
  // - Hệ thống: Màu xanh (#00A19A)
  // - CS1: Màu xanh thiên thanh (#0EA5E9)
  // - CS2: Màu xanh ngọc đậm (#0F766E)
  // - CS3: Màu tím than (#312E81)
  // - CS4: Màu vàng đất (#D49A3D)
  // - CS5: Màu xanh dương (#1D4ED8)
  const systemChartColor = useMemo(
    () => ({
      code: "SYSTEM",
      fill: "#00A19A",
      textFill: "#00736E",
      colorName: "Màu xanh",
    }),
    []
  )

  const campusChartColor = useMemo(() => {
    const raw = `${meta?.campusCode || ""} ${scoreDistribution?.campusLabel || ""}`.toUpperCase()
    if (raw.includes("CS1") || raw.includes("CƠ SỞ 1") || raw.includes("CENTRAL")) {
      return {
        code: "CS1",
        fill: "#0EA5E9",
        textFill: "#0284C7",
        colorName: "Màu xanh thiên thanh",
      }
    }
    if (raw.includes("CS3") || raw.includes("CƠ SỞ 3") || raw.includes("HILL")) {
      return {
        code: "CS3",
        fill: "#312E81",
        textFill: "#312E81",
        colorName: "Màu tím than",
      }
    }
    if (raw.includes("CS4") || raw.includes("CƠ SỞ 4") || raw.includes("BEACH") || raw.includes("INTERNATIONAL")) {
      return {
        code: "CS4",
        fill: "#D49A3D",
        textFill: "#B45309",
        colorName: "Màu vàng đất",
      }
    }
    if (raw.includes("CS5") || raw.includes("CƠ SỞ 5") || raw.includes("GLOBAL")) {
      return {
        code: "CS5",
        fill: "#1D4ED8",
        textFill: "#1E40AF",
        colorName: "Màu xanh dương",
      }
    }
    if (raw.includes("CS2") || raw.includes("CƠ SỞ 2") || raw.includes("RIVERSIDE")) {
      return {
        code: "CS2",
        fill: "#0F766E",
        textFill: "#0F766E",
        colorName: "Màu xanh ngọc",
      }
    }
    return {
      code: meta?.campusCode || "CAMPUS",
      fill: "#0EA5E9",
      textFill: "#0284C7",
      colorName: "Màu xanh thiên thanh",
    }
  }, [meta?.campusCode, scoreDistribution?.campusLabel])

  // Danh sách các dòng cho bảng "c. Một số chỉ số thống kê cơ bản" theo đúng ảnh mẫu cung cấp
  const moetSummaryRows = useMemo(() => {
    if (!sysBasic) return []

    const getRateStr = (count: number, total: number) => {
      if (!total || total <= 0) return "0,00 %"
      const pct = Math.round(((count / total) * 100 + Number.EPSILON) * 100) / 100
      return `${pct.toFixed(2).replace(".", ",")} %`
    }

    return [
      {
        key: "TOTAL_STUDENTS",
        label: "Tổng số học sinh có điểm",
        cpVal: cpBasic ? cpBasic.validCount.toLocaleString("vi-VN") : "0",
        cpPct: "",
        sysVal: sysBasic.validCount.toLocaleString("vi-VN"),
        sysPct: "",
      },
      {
        key: "MEAN",
        label: "Điểm trung bình",
        cpVal: cpBasic?.meanDisplay || "—",
        cpPct: "",
        sysVal: sysBasic.meanDisplay,
        sysPct: "",
      },
      {
        key: "MEDIAN",
        label: "Trung vị",
        cpVal: cpBasic?.medianDisplay || "—",
        cpPct: "",
        sysVal: sysBasic.medianDisplay,
        sysPct: "",
      },
      {
        key: "STD_DEV",
        label: "Độ lệch chuẩn",
        cpVal: cpBasic?.stdDevDisplay || "—",
        cpPct: "",
        sysVal: sysBasic.stdDevDisplay,
        sysPct: "",
      },
      {
        key: "MAD",
        label: "Độ lệch tuyệt đối trung vị (MAD)",
        cpVal: cpBasic?.madDisplay || "—",
        cpPct: "",
        sysVal: sysBasic.madDisplay,
        sysPct: "",
      },
      {
        key: "BELOW_5",
        label: "Số học sinh đạt điểm dưới trung bình (< 5)",
        cpVal:
          cpBasic && cpBasic.validCount > 0
            ? cpBasic.below5Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpBasic && cpBasic.validCount > 0
            ? getRateStr(cpBasic.below5Count, cpBasic.validCount)
            : "—",
        sysVal:
          sysBasic.validCount > 0
            ? sysBasic.below5Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysBasic.validCount > 0
            ? getRateStr(sysBasic.below5Count, sysBasic.validCount)
            : "—",
      },
      {
        key: "ABOVE_5",
        label: "Số học sinh đạt điểm từ 5 trở lên (≥ 5 • 4 nhóm cuối)",
        cpVal:
          cpDist && cpDist.totalValidCount > 0
            ? cpDist.aboveOrEqual5Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpDist && cpDist.totalValidCount > 0
            ? getRateStr(cpDist.aboveOrEqual5Count, cpDist.totalValidCount)
            : "—",
        sysVal:
          sysDist && sysDist.totalValidCount > 0
            ? sysDist.aboveOrEqual5Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysDist && sysDist.totalValidCount > 0
            ? getRateStr(sysDist.aboveOrEqual5Count, sysDist.totalValidCount)
            : "—",
      },
      {
        key: "ABOVE_7",
        label: "Số học sinh đạt điểm lớn hơn hoặc bằng 7 (≥ 7)",
        cpVal:
          cpBasic && cpBasic.validCount > 0
            ? cpBasic.aboveOrEqual7Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpBasic && cpBasic.validCount > 0
            ? getRateStr(cpBasic.aboveOrEqual7Count, cpBasic.validCount)
            : "—",
        sysVal:
          sysBasic.validCount > 0
            ? sysBasic.aboveOrEqual7Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysBasic.validCount > 0
            ? getRateStr(sysBasic.aboveOrEqual7Count, sysBasic.validCount)
            : "—",
      },
      {
        key: "PEAK_MILESTONE",
        label: "Mốc điểm có nhiều học sinh đạt được nhất",
        cpVal: cpBasic?.modeDisplay || "—",
        cpPct: "",
        sysVal: sysBasic.modeDisplay,
        sysPct: "",
      },
      {
        key: "COUNT_10",
        label: "Số lượng học sinh đạt điểm 10",
        cpVal:
          cpBasic && cpBasic.validCount > 0
            ? cpBasic.score10Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpBasic && cpBasic.validCount > 0
            ? getRateStr(cpBasic.score10Count, cpBasic.validCount)
            : "—",
        sysVal:
          sysBasic.validCount > 0
            ? sysBasic.score10Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysBasic.validCount > 0
            ? getRateStr(sysBasic.score10Count, sysBasic.validCount)
            : "—",
      },
      {
        key: "COUNT_0",
        label: "Số lượng học sinh đạt điểm 0",
        cpVal:
          cpBasic && cpBasic.validCount > 0
            ? cpBasic.score0Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpBasic && cpBasic.validCount > 0
            ? getRateStr(cpBasic.score0Count, cpBasic.validCount)
            : "—",
        sysVal:
          sysBasic.validCount > 0
            ? sysBasic.score0Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysBasic.validCount > 0
            ? getRateStr(sysBasic.score0Count, sysBasic.validCount)
            : "—",
      },
      {
        key: "COUNT_LTE_1",
        label: "Số học sinh đạt điểm ≤ 1",
        cpVal:
          cpBasic && cpBasic.validCount > 0
            ? cpBasic.scoreLte1Count.toLocaleString("vi-VN")
            : "0",
        cpPct:
          cpBasic && cpBasic.validCount > 0
            ? getRateStr(cpBasic.scoreLte1Count, cpBasic.validCount)
            : "—",
        sysVal:
          sysBasic.validCount > 0
            ? sysBasic.scoreLte1Count.toLocaleString("vi-VN")
            : "0",
        sysPct:
          sysBasic.validCount > 0
            ? getRateStr(sysBasic.scoreLte1Count, sysBasic.validCount)
            : "—",
      },
    ]
  }, [sysBasic, cpBasic, sysDist, cpDist])

  // Tọa độ vẽ Biểu đồ SVG 8 khoảng điểm đúng chuẩn mẫu ảnh cung cấp
  const svgPlot = {
    viewWidth: 1000,
    viewHeight: 460,
    left: 88,
    top: 48,
    width: 876,
    height: 326,
    bottom: 374,
  }

  // Hàm vẽ khối Bảng tần số (b) và Một số chỉ số thống kê cơ bản (c) với 8 khoảng điểm
  const renderFrequencyAndSummaryTables = (testIdPrefix: string) => {
    if (!scoreDistribution || !sysDist) return null
    return (
      <div className="space-y-6">
        {/* b. Bảng tần số (8 khoảng điểm: Điểm 0, 0 < điểm < 2, 2 ≤ điểm < 4, 4 ≤ điểm < 5, 5 ≤ điểm < 7, 7 ≤ điểm < 8, 8 ≤ điểm < 10, Điểm 10) */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
            <span>b. Bảng tần số (8 khoảng điểm chuẩn)</span>
            <span className="text-xs font-normal text-slate-500">
              • Môn {meta?.subjectName || "—"} ({scoreDistribution.selectedGradeLabel})
            </span>
          </h4>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-xs tabular-nums"
                data-testid={`${testIdPrefix}-frequency-8-table`}
              >
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3.5 text-left text-white border-r border-[#0F766E]/60 min-w-[170px]">
                      Khoảng điểm
                    </th>
                    {sysDist.buckets.map((b) => (
                      <th
                        key={b.id}
                        className={`py-3 px-3 text-right border-r border-[#0F766E]/40 min-w-[100px] ${
                          b.isAboveOrEqual5 ? "text-[#5EEAD4]" : "text-teal-100"
                        }`}
                      >
                        {b.label}
                      </th>
                    ))}
                    <th className="py-3 px-3.5 text-right text-white bg-[#002827] min-w-[100px]">
                      Tổng cộng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {!isAllSystemSelected && cpDist && (
                    <>
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800 border-r border-[#E2E8F0] whitespace-nowrap">
                          Số lượng ({scoreDistribution.campusLabel})
                        </td>
                        {cpDist.buckets.map((b) => (
                          <td
                            key={`cp-cnt-${b.id}`}
                            className="py-2.5 px-3 text-right font-semibold text-slate-800 border-r border-[#F1F5F9]"
                            title={b.tooltipText}
                          >
                            {b.count.toLocaleString("vi-VN")}
                          </td>
                        ))}
                        <td className="py-2.5 px-3.5 text-right font-bold text-[#008B85] bg-[#F8FAFC]">
                          {cpDist.totalValidCountDisplay}
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC] transition-colors bg-[#F8FAFC]/50">
                        <td className="py-2.5 px-3.5 font-medium text-slate-600 border-r border-[#E2E8F0] whitespace-nowrap">
                          Tỷ lệ % ({scoreDistribution.campusLabel})
                        </td>
                        {cpDist.buckets.map((b) => (
                          <td
                            key={`cp-rate-${b.id}`}
                            className="py-2.5 px-3 text-right text-slate-600 border-r border-[#F1F5F9]"
                            title={b.tooltipText}
                          >
                            {cpDist.totalValidCount > 0 ? b.rateFixed2Display : "—"}
                          </td>
                        ))}
                        <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 bg-[#F8FAFC]">
                          {cpDist.totalValidCount > 0 ? "100,00%" : "—"}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-[#003B3A] border-r border-[#E2E8F0] whitespace-nowrap">
                      {isAllSystemSelected ? "Số lượng" : "Số lượng (Toàn hệ thống)"}
                    </td>
                    {sysDist.buckets.map((b) => (
                      <td
                        key={`sys-cnt-${b.id}`}
                        className="py-2.5 px-3 text-right font-bold text-[#003B3A] border-r border-[#F1F5F9]"
                        title={b.tooltipText}
                      >
                        {b.count.toLocaleString("vi-VN")}
                      </td>
                    ))}
                    <td className="py-2.5 px-3.5 text-right font-bold text-[#003B3A] bg-[#F0FDFA]">
                      {sysDist.totalValidCountDisplay}
                    </td>
                  </tr>

                  <tr className="hover:bg-[#F8FAFC] transition-colors bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-700 border-r border-[#E2E8F0] whitespace-nowrap">
                      {isAllSystemSelected ? "Tỷ lệ (%)" : "Tỷ lệ % (Toàn hệ thống)"}
                    </td>
                    {sysDist.buckets.map((b) => (
                      <td
                        key={`sys-rate-${b.id}`}
                        className="py-2.5 px-3 text-right font-semibold text-[#008B85] border-r border-[#E2E8F0]"
                        title={b.tooltipText}
                      >
                        {sysDist.totalValidCount > 0 ? b.rateFixed2Display : "—"}
                      </td>
                    ))}
                    <td className="py-2.5 px-3.5 text-right font-bold text-[#003B3A] bg-[#F0FDFA]">
                      {sysDist.totalValidCount > 0 ? "100,00%" : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* c. Một số chỉ số thống kê cơ bản (Theo mẫu ảnh cung cấp) */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
            <span>c. Một số chỉ số thống kê cơ bản</span>
            <span className="text-xs font-normal text-slate-500">
              • Môn {meta?.subjectName || "—"} ({scoreDistribution.selectedGradeLabel})
            </span>
          </h4>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-xs tabular-nums"
                data-testid={`${testIdPrefix}-summary-table`}
              >
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold">
                    <th className="py-3 px-4 text-left text-white border-r border-[#0F766E]/60">
                      Chỉ số thống kê
                    </th>
                    {!isAllSystemSelected && (
                      <>
                        <th className="py-3 px-4 text-right text-teal-100 border-r border-[#0F766E]/40">
                          Cơ sở {scoreDistribution.campusLabel}
                        </th>
                        <th className="py-3 px-3.5 text-right text-teal-100 border-r border-[#0F766E]/60">
                          Tỷ lệ % ({scoreDistribution.campusLabel})
                        </th>
                      </>
                    )}
                    <th className="py-3 px-4 text-right text-[#5EEAD4] bg-[#002E2D] border-r border-[#0F766E]/40">
                      Toàn hệ thống
                    </th>
                    <th className="py-3 px-3.5 text-right text-[#5EEAD4] bg-[#002E2D]">
                      Tỷ lệ % (Hệ thống)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {moetSummaryRows.map((r) => (
                    <tr key={r.key} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-[#E2E8F0]">
                        {r.label}
                      </td>
                      {!isAllSystemSelected && (
                        <>
                          <td className="py-2.5 px-4 text-right font-semibold text-slate-800 border-r border-[#F1F5F9] whitespace-nowrap">
                            {r.cpVal}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-slate-600 border-r border-[#E2E8F0] whitespace-nowrap">
                            {r.cpPct}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-right font-bold text-[#003B3A] bg-[#F8FAFC] border-r border-[#F1F5F9] whitespace-nowrap">
                        {r.sysVal}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-[#008B85] bg-[#F8FAFC] whitespace-nowrap">
                        {r.sysPct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Thanh bộ lọc dùng chung: Kỳ khảo sát · Bậc học · Môn · Khối · Cơ sở */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
          {/* Năm học */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#008B85]" />
              Năm học
            </label>
            <select
              aria-label="Năm học"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Mặc định)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 1. Kỳ khảo sát */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-[#008B85]" />
              Kỳ khảo sát <span className="text-rose-600">*</span>
            </label>
            <select
              aria-label="Kỳ khảo sát"
              value={evaluationPeriod}
              onChange={(e) => setEvaluationPeriod(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {filterOptions.periods.length > 0 ? (
                filterOptions.periods.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} {p.entryCount > 0 ? `(${p.entryCount})` : ""}
                  </option>
                ))
              ) : (
                <>
                  <option value="GK1">Giữa kỳ 1 (GK1)</option>
                  <option value="CK1">Cuối kỳ 1 (CK1)</option>
                  <option value="GK2">Giữa kỳ 2 (GK2)</option>
                  <option value="CK2">Cuối kỳ 2 (CK2)</option>
                </>
              )}
            </select>
          </div>

          {/* 2. Bậc học */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#008B85]" />
              Bậc học <span className="text-rose-600">*</span>
            </label>
            <select
              aria-label="Bậc học"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setSubjectId("")
                setGrade("ALL")
              }}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {filterOptions.levels.length > 0 ? (
                filterOptions.levels.map((lvl) => (
                  <option key={lvl.code} value={lvl.code}>
                    {lvl.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="TIEU_HOC">Tiểu học</option>
                  <option value="THCS">Trung học cơ sở (THCS)</option>
                  <option value="THPT">Trung học phổ thông (THPT)</option>
                </>
              )}
            </select>
          </div>

          {/* 3. Môn */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#008B85]" />
              Môn <span className="text-rose-600">*</span>
            </label>
            <select
              aria-label="Môn"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {filterOptions.subjects.length === 0 ? (
                <option value="">Chưa có môn học phù hợp</option>
              ) : (
                filterOptions.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subjectName} {sub.entryCount > 0 ? `(${sub.entryCount})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 4. Khối */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-[#008B85]" />
              Khối
            </label>
            <select
              aria-label="Khối"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              <option value="ALL">Tất cả khối</option>
              {(filterOptions.grades || []).map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Cơ sở */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#008B85]" />
              Cơ sở <span className="text-rose-600">*</span>
            </label>
            <select
              aria-label="Cơ sở"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {!accessScope?.isCampusRestricted && (
                <option value="ALL">Toàn hệ thống Sky-Line</option>
              )}
              {filterOptions.campuses.map((cp) => {
                const sameLabel =
                  String(cp.campusCode || "").trim().toUpperCase() ===
                  String(cp.campusName || "").trim().toUpperCase()
                return (
                  <option key={cp.id} value={cp.id}>
                    {sameLabel ? `Cơ sở ${cp.campusCode}` : `${cp.campusCode} — ${cp.campusName}`}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Nút thao tác */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                fetchBasicStats({
                  academicYearId,
                  evaluationPeriod,
                  level,
                  subjectId,
                  grade,
                  campusId,
                })
              }
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              title="Làm mới số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>

            {accessScope?.canExportExcel !== false && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={loading || exporting || indicatorRows.length === 0}
                className="flex-1 h-9 px-3 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
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

        {/* Thanh chuyển đổi 2 Tab: Biểu đồ phổ điểm | Bảng số liệu */}
        <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <button
              type="button"
              data-testid="tab-btn-chart"
              onClick={() => setActiveTab("CHART")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "CHART"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Biểu đồ phổ điểm
            </button>
            <button
              type="button"
              data-testid="tab-btn-table"
              onClick={() => setActiveTab("TABLE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "TABLE"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Bảng số liệu
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>
              Môn: <strong className="text-[#003B3A]">{meta?.subjectName || "—"}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>{meta?.evaluationPeriodLabel || evaluationPeriod}</span>
            <span className="text-slate-300">•</span>
            <span>{meta?.levelLabel || level}</span>
            <span className="text-slate-300">•</span>
            <span>
              Khối: <strong className="text-slate-800">{meta?.gradeLabel || "Tất cả khối"}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Phạm vi:{" "}
              <strong className="text-[#008B85]">
                {meta?.isAllSystemSelected
                  ? "Toàn hệ thống Sky-Line"
                  : meta?.campusCode
                  ? `Cơ sở ${meta.campusCode} đối chiếu Toàn hệ thống`
                  : "—"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Trạng thái lỗi */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="font-medium">{error}</div>
        </div>
      )}

      {/* =====================================================================
          TAB BIỂU ĐỒ PHỔ ĐIỂM (VẼ THEO MẪU ẢNH VỚI 8 KHOẢNG ĐIỂM CHUẨN)
          Khoảng điểm: Điểm 0, 0 < điểm < 2, 2 ≤ điểm < 4, 4 ≤ điểm < 5, 5 ≤ điểm < 7, 7 ≤ điểm < 8, 8 ≤ điểm < 10, Điểm 10
         ===================================================================== */}
      {activeTab === "CHART" && (
        <div
          className="space-y-4"
          data-testid="thkq-score-distribution-chart-panel"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            {/* Thanh điều khiển trục dọc (Tỷ lệ % / Số học sinh) & Phạm vi cột */}
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#003B3A]">
                  a. Biểu đồ phổ điểm môn {meta?.subjectName || "—"} ({meta?.gradeLabel || "Tất cả khối"})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  8 khoảng điểm chuẩn: Điểm 0 · 0 &lt; điểm &lt; 2 · 2 ≤ điểm &lt; 4 · 4 ≤ điểm &lt; 5 · 5 ≤ điểm &lt; 7 · 7 ≤ điểm &lt; 8 · 8 ≤ điểm &lt; 10 · Điểm 10
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isAllSystemSelected && (
                  <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E2E8F0] text-xs">
                    <button
                      type="button"
                      onClick={() => setCompareMode("COMPARE")}
                      className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                        compareMode === "COMPARE"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Đối chiếu {scoreDistribution?.campusLabel} & Hệ thống
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareMode("SINGLE_CAMPUS")}
                      style={
                        compareMode === "SINGLE_CAMPUS"
                          ? { backgroundColor: campusChartColor.fill, color: "#FFFFFF" }
                          : undefined
                      }
                      className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                        compareMode === "SINGLE_CAMPUS"
                          ? "text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Chỉ Cơ sở {scoreDistribution?.campusLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareMode("SINGLE_SYSTEM")}
                      style={
                        compareMode === "SINGLE_SYSTEM"
                          ? { backgroundColor: systemChartColor.fill, color: "#FFFFFF" }
                          : undefined
                      }
                      className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                        compareMode === "SINGLE_SYSTEM"
                          ? "text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Chỉ Toàn hệ thống
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Trục dọc:</span>
                  <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E2E8F0]">
                    <button
                      type="button"
                      data-testid="yaxis-btn-rate"
                      onClick={() => setYAxisMode("RATE")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        yAxisMode === "RATE"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tỷ lệ (%)
                    </button>
                    <button
                      type="button"
                      data-testid="yaxis-btn-count"
                      onClick={() => setYAxisMode("COUNT")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        yAxisMode === "COUNT"
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Số học sinh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {!hasAnyValidScoreForChart ? (
              <div
                className="py-16 px-4 text-center text-xs font-semibold text-slate-500"
                data-testid="empty-score-distribution-message"
              >
                Chưa có dữ liệu điểm theo bộ lọc đã chọn
              </div>
            ) : (
              <div className="p-6 space-y-7">
                {/* 3 chỉ số phía trên biểu đồ: Số học sinh có điểm · Tỷ lệ dưới 5 điểm · Tỷ lệ từ 5 điểm trở lên (tính từ 4 nhóm cuối) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Số học sinh có điểm
                    </div>
                    {isAllSystemSelected ? (
                      <div className="mt-1 text-lg font-bold text-[#003B3A]">
                        {sysDist?.totalValidCountDisplay || "0"}{" "}
                        <span className="text-xs font-medium text-slate-500">học sinh</span>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">{scoreDistribution?.campusLabel}: </span>
                          <strong className="text-base font-bold text-[#008B85]">
                            {cpDist?.totalValidCountDisplay || "0"}
                          </strong>{" "}
                          <span className="text-slate-500">HS</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Toàn hệ thống: </span>
                          <strong className="text-base font-bold text-[#003B3A]">
                            {sysDist?.totalValidCountDisplay || "0"}
                          </strong>{" "}
                          <span className="text-slate-500">HS</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Tỷ lệ dưới 5 điểm (4 nhóm đầu)
                    </div>
                    {isAllSystemSelected ? (
                      <div className="mt-1 text-lg font-bold text-amber-700">
                        {sysDist?.below5RateDisplay || "—"}
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">{scoreDistribution?.campusLabel}: </span>
                          <strong className="text-sm font-bold text-amber-700">
                            {cpDist?.below5RateDisplay || "—"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Hệ thống: </span>
                          <strong className="text-sm font-bold text-slate-800">
                            {sysDist?.below5RateDisplay || "—"}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <div className="text-xs font-semibold text-slate-600">
                      Tỷ lệ từ 5 điểm trở lên (4 nhóm cuối)
                    </div>
                    {isAllSystemSelected ? (
                      <div className="mt-1 text-lg font-bold text-emerald-700">
                        {sysDist?.aboveOrEqual5RateDisplay || "—"}
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">{scoreDistribution?.campusLabel}: </span>
                          <strong className="text-sm font-bold text-emerald-700">
                            {cpDist?.aboveOrEqual5RateDisplay || "—"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Hệ thống: </span>
                          <strong className="text-sm font-bold text-[#003B3A]">
                            {sysDist?.aboveOrEqual5RateDisplay || "—"}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PHẦN A: BIỂU ĐỒ PHỔ ĐIỂM SVG (8 KHOẢNG ĐIỂM CHUẨN THAY THẾ CHO 40 KHOẢNG BƯỚC 0,25) */}
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
                  {/* Chú giải mã màu cơ sở & Hộp hiển thị chi tiết khi rê chuột hoặc chạm vào cột */}
                  <div className="mb-3 flex flex-col gap-2.5 px-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {showDualBars ? (
                          <>
                            <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                              <span
                                className="w-3.5 h-3.5 rounded-xs inline-block shrink-0"
                                style={{ backgroundColor: campusChartColor.fill }}
                              />
                              Cơ sở {scoreDistribution?.campusLabel} ({campusChartColor.colorName})
                            </span>
                            <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                              <span
                                className="w-3.5 h-3.5 rounded-xs inline-block shrink-0"
                                style={{ backgroundColor: systemChartColor.fill }}
                              />
                              Toàn hệ thống Sky-Line ({systemChartColor.colorName})
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                            <span
                              className="w-3.5 h-3.5 rounded-xs inline-block shrink-0"
                              style={{
                                backgroundColor:
                                  isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                    ? systemChartColor.fill
                                    : campusChartColor.fill,
                              }}
                            />
                            {isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                              ? `Toàn hệ thống Sky-Line (${systemChartColor.colorName})`
                              : `Cơ sở ${scoreDistribution?.campusLabel} (${campusChartColor.colorName})`}
                          </span>
                        )}
                      </div>

                      <div
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A] tabular-nums"
                        data-testid="active-bar-tooltip-banner"
                      >
                        {activeBarTooltip ? (
                          <span>
                            {showDualBars && (
                              <strong className="text-[#008B85] mr-1.5">
                                [{activeBarTooltip.scopeLabel}]
                              </strong>
                            )}
                            {activeBarTooltip.text}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">
                            Rê chuột hoặc chạm vào cột để xem: Khoảng điểm · Số học sinh · Tỷ lệ (%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dải quy ước mã màu biểu đồ cho từng cơ sở */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5">
                      <span className="font-semibold text-slate-700">Quy ước màu biểu đồ:</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: "#00A19A" }} />
                        <span>Hệ thống: Xanh</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: "#0EA5E9" }} />
                        <span>CS1: Xanh thiên thanh</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: "#312E81" }} />
                        <span>CS3: Tím than</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: "#D49A3D" }} />
                        <span>CS4: Vàng đất</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: "#1D4ED8" }} />
                        <span>CS5: Xanh dương</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[760px]">
                      <svg
                        viewBox={`0 0 ${svgPlot.viewWidth} ${svgPlot.viewHeight}`}
                        className="w-full h-auto select-none"
                        role="img"
                        aria-label={`Biểu đồ phổ điểm môn ${meta?.subjectName || ""}`}
                      >
                        {/* Tiêu đề chính giữa phía trên khung biểu đồ giống mẫu ảnh */}
                        <text
                          x={svgPlot.left + svgPlot.width / 2}
                          y={28}
                          textAnchor="middle"
                          fontSize="17.5"
                          fontWeight="600"
                          fill="#0F172A"
                        >
                          {`Biểu đồ phổ điểm ${meta?.evaluationPeriodLabel || evaluationPeriod} môn ${
                            meta?.subjectName || ""
                          }${
                            meta?.gradeLabel && meta.gradeLabel !== "Tất cả khối"
                              ? ` (${meta.gradeLabel})`
                              : ""
                          } - năm học ${meta?.academicYearName || ""}`}
                        </text>

                        {/* Nhãn trục tung xoay dọc */}
                        <text
                          x={22}
                          y={svgPlot.top + svgPlot.height / 2}
                          transform={`rotate(-90, 22, ${svgPlot.top + svgPlot.height / 2})`}
                          textAnchor="middle"
                          fontSize="14.5"
                          fontWeight="500"
                          fill="#0F172A"
                        >
                          {yAxisMode === "RATE" ? "Tỷ lệ học sinh (%)" : "Số lượng học sinh"}
                        </text>

                        {/* Khung viền 4 cạnh của vùng vẽ biểu đồ giống ảnh mẫu */}
                        <rect
                          x={svgPlot.left}
                          y={svgPlot.top}
                          width={svgPlot.width}
                          height={svgPlot.height}
                          fill="#FFFFFF"
                          stroke="#334155"
                          strokeWidth="1.2"
                        />

                        {/* Các mốc chia trục tung (Y-axis ticks, gridlines & labels) */}
                        {svgYTicks.map((tickVal, idx) => {
                          const yPos =
                            svgPlot.bottom -
                            (svgMaxY > 0 ? (tickVal / svgMaxY) * (svgPlot.height - 28) : 0)
                          return (
                            <g key={`ytick-${idx}`}>
                              {/* Đường lưới ngang mảnh */}
                              {tickVal > 0 && (
                                <line
                                  x1={svgPlot.left}
                                  y1={yPos}
                                  x2={svgPlot.left + svgPlot.width}
                                  y2={yPos}
                                  stroke="#E2E8F0"
                                  strokeDasharray="4 4"
                                  strokeWidth="1"
                                />
                              )}
                              {/* Vạch chia nhỏ bên trái trục tung */}
                              <line
                                x1={svgPlot.left - 6}
                                y1={yPos}
                                x2={svgPlot.left}
                                y2={yPos}
                                stroke="#334155"
                                strokeWidth="1.2"
                              />
                              {/* Nhãn số trên trục tung */}
                              <text
                                x={svgPlot.left - 10}
                                y={yPos + 4}
                                textAnchor="end"
                                fontSize="13"
                                fill="#0F172A"
                              >
                                {yAxisMode === "RATE"
                                  ? `${String(tickVal).replace(".", ",")}%`
                                  : tickVal.toLocaleString("vi-VN")}
                              </text>
                            </g>
                          )
                        })}

                        {/* 8 Nhóm cột: Điểm 0, 0 < điểm < 2, 2 ≤ điểm < 4, 4 ≤ điểm < 5, 5 ≤ điểm < 7, 7 ≤ điểm < 8, 8 ≤ điểm < 10, Điểm 10 */}
                        {(sysDist?.buckets || []).map((sysB, idx) => {
                          const cpB = cpDist?.buckets[idx]
                          const slotWidth = (svgPlot.width - 40) / 8
                          const slotCenterX = svgPlot.left + 20 + idx * slotWidth + slotWidth / 2
                          const usableHeight = svgPlot.height - 28

                          if (showDualBars && cpB) {
                            const barWidth = 32
                            const gap = 6
                            const cpBarX = slotCenterX - barWidth - gap / 2
                            const sysBarX = slotCenterX + gap / 2

                            const cpVal = yAxisMode === "RATE" ? cpB.rate : cpB.count
                            const sysVal = yAxisMode === "RATE" ? sysB.rate : sysB.count

                            const cpBarH = svgMaxY > 0 ? (cpVal / svgMaxY) * usableHeight : 0
                            const sysBarH = svgMaxY > 0 ? (sysVal / svgMaxY) * usableHeight : 0

                            const cpBarY = svgPlot.bottom - cpBarH
                            const sysBarY = svgPlot.bottom - sysBarH

                            const cpTopText =
                              yAxisMode === "RATE"
                                ? cpB.rateDisplay
                                : cpB.count.toLocaleString("vi-VN")
                            const sysTopText =
                              yAxisMode === "RATE"
                                ? sysB.rateDisplay
                                : sysB.count.toLocaleString("vi-VN")

                            return (
                              <g key={sysB.id}>
                                {/* Cột 1: Cơ sở đang chọn */}
                                <g
                                  className="cursor-pointer"
                                  data-testid={`chart-bar-campus-${sysB.id}`}
                                  onMouseEnter={() =>
                                    setActiveBarTooltip({
                                      bucketId: sysB.id,
                                      scope: "CAMPUS",
                                      scopeLabel: `Cơ sở ${scoreDistribution?.campusLabel}`,
                                      text: cpB.tooltipText,
                                    })
                                  }
                                  onClick={() =>
                                    setActiveBarTooltip({
                                      bucketId: sysB.id,
                                      scope: "CAMPUS",
                                      scopeLabel: `Cơ sở ${scoreDistribution?.campusLabel}`,
                                      text: cpB.tooltipText,
                                    })
                                  }
                                >
                                  <title>{`[${scoreDistribution?.campusLabel}] ${cpB.tooltipText}`}</title>
                                  <rect
                                    x={cpBarX}
                                    y={cpVal > 0 ? cpBarY : svgPlot.bottom - 1.5}
                                    width={barWidth}
                                    height={Math.max(1.5, cpBarH)}
                                    fill={campusChartColor.fill}
                                    rx="2"
                                  />
                                  <text
                                    x={cpBarX + barWidth / 2}
                                    y={(cpVal > 0 ? cpBarY : svgPlot.bottom) - 6}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill={campusChartColor.textFill}
                                  >
                                    {cpTopText}
                                  </text>
                                </g>

                                {/* Cột 2: Toàn hệ thống */}
                                <g
                                  className="cursor-pointer"
                                  data-testid={`chart-bar-system-${sysB.id}`}
                                  onMouseEnter={() =>
                                    setActiveBarTooltip({
                                      bucketId: sysB.id,
                                      scope: "SYSTEM",
                                      scopeLabel: "Toàn hệ thống",
                                      text: sysB.tooltipText,
                                    })
                                  }
                                  onClick={() =>
                                    setActiveBarTooltip({
                                      bucketId: sysB.id,
                                      scope: "SYSTEM",
                                      scopeLabel: "Toàn hệ thống",
                                      text: sysB.tooltipText,
                                    })
                                  }
                                >
                                  <title>{`[Toàn hệ thống] ${sysB.tooltipText}`}</title>
                                  <rect
                                    x={sysBarX}
                                    y={sysVal > 0 ? sysBarY : svgPlot.bottom - 1.5}
                                    width={barWidth}
                                    height={Math.max(1.5, sysBarH)}
                                    fill={systemChartColor.fill}
                                    rx="2"
                                  />
                                  <text
                                    x={sysBarX + barWidth / 2}
                                    y={(sysVal > 0 ? sysBarY : svgPlot.bottom) - 6}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill={systemChartColor.textFill}
                                  >
                                    {sysTopText}
                                  </text>
                                </g>

                                {/* Vạch chia trục hoành & Nhãn khoảng điểm */}
                                <line
                                  x1={slotCenterX}
                                  y1={svgPlot.bottom}
                                  x2={slotCenterX}
                                  y2={svgPlot.bottom + 6}
                                  stroke="#334155"
                                  strokeWidth="1.2"
                                />
                                <text
                                  x={slotCenterX}
                                  y={svgPlot.bottom + 24}
                                  textAnchor="middle"
                                  fontSize="12"
                                  fontWeight="600"
                                  fill="#1E293B"
                                >
                                  {sysB.label}
                                </text>
                              </g>
                            )
                          }

                          // Chế độ 1 dãy cột (Toàn hệ thống hoặc Chỉ 1 cơ sở)
                          const targetB = singleDist?.buckets[idx] || sysB
                          const barWidth = 54
                          const barX = slotCenterX - barWidth / 2
                          const val = yAxisMode === "RATE" ? targetB.rate : targetB.count
                          const barH = svgMaxY > 0 ? (val / svgMaxY) * usableHeight : 0
                          const barY = svgPlot.bottom - barH
                          const topText =
                            yAxisMode === "RATE"
                              ? targetB.rateDisplay
                              : targetB.count.toLocaleString("vi-VN")

                          return (
                            <g
                              key={targetB.id}
                              className="cursor-pointer"
                              data-testid={`chart-bar-system-${targetB.id}`}
                              onMouseEnter={() =>
                                setActiveBarTooltip({
                                  bucketId: targetB.id,
                                  scope:
                                    isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                      ? "SYSTEM"
                                      : "CAMPUS",
                                  scopeLabel:
                                    isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                      ? "Toàn hệ thống"
                                      : `Cơ sở ${scoreDistribution?.campusLabel}`,
                                  text: targetB.tooltipText,
                                })
                              }
                              onClick={() =>
                                setActiveBarTooltip({
                                  bucketId: targetB.id,
                                  scope:
                                    isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                      ? "SYSTEM"
                                      : "CAMPUS",
                                  scopeLabel:
                                    isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                      ? "Toàn hệ thống"
                                      : `Cơ sở ${scoreDistribution?.campusLabel}`,
                                  text: targetB.tooltipText,
                                })
                              }
                            >
                              <title>{targetB.tooltipText}</title>
                              <rect
                                x={barX}
                                y={val > 0 ? barY : svgPlot.bottom - 1.5}
                                width={barWidth}
                                height={Math.max(1.5, barH)}
                                fill={
                                  isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                    ? systemChartColor.fill
                                    : campusChartColor.fill
                                }
                                rx="2"
                              />
                              <text
                                x={slotCenterX}
                                y={(val > 0 ? barY : svgPlot.bottom) - 7}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="600"
                                fill={
                                  isAllSystemSelected || compareMode === "SINGLE_SYSTEM"
                                    ? systemChartColor.textFill
                                    : campusChartColor.textFill
                                }
                              >
                                {topText}
                              </text>

                              <line
                                x1={slotCenterX}
                                y1={svgPlot.bottom}
                                x2={slotCenterX}
                                y2={svgPlot.bottom + 6}
                                stroke="#334155"
                                strokeWidth="1.2"
                              />
                              <text
                                x={slotCenterX}
                                y={svgPlot.bottom + 24}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="600"
                                fill="#1E293B"
                              >
                                {targetB.label}
                              </text>
                            </g>
                          )
                        })}

                        {/* Nhãn trục hoành "Khoảng điểm" ở chính giữa dưới cùng */}
                        <text
                          x={svgPlot.left + svgPlot.width / 2}
                          y={438}
                          textAnchor="middle"
                          fontSize="14.5"
                          fontWeight="600"
                          fill="#0F172A"
                        >
                          Khoảng điểm
                        </text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* PHẦN B & PHẦN C: b. Bảng tần số (8 khoảng điểm) & c. Một số chỉ số thống kê cơ bản */}
                {renderFrequencyAndSummaryTables("chart-tab")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB BẢNG SỐ LIỆU (BẢNG ĐỐI CHIẾU THEO KHỐI + BẢNG TẦN SỐ 8 KHOẢNG ĐIỂM + CHỈ SỐ CƠ BẢN)
         ===================================================================== */}
      {activeTab === "TABLE" && (
        <div className="space-y-6">
          {/* 1. Bảng Thống kê cơ bản đối chiếu theo từng Khối (11 chỉ số) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span className="font-bold text-[#003B3A]">
                  1. Bảng thống kê cơ bản đối chiếu theo từng Khối • Môn {meta?.subjectName || "—"}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Đối chiếu cơ sở:{" "}
                  <strong className="text-[#008B85]">
                    {meta?.comparisonCampusCode
                      ? `Cơ sở ${meta.comparisonCampusCode}`
                      : meta?.campusCode
                      ? `Cơ sở ${meta.campusCode}`
                      : "—"}
                  </strong>{" "}
                  với <strong className="text-[#003B3A]">Hệ thống Sky-Line</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("CHART")}
                className="text-xs font-semibold text-[#008B85] hover:text-[#003B3A] inline-flex items-center gap-1 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Xem biểu đồ phổ điểm →
              </button>
            </div>

            <div className="overflow-x-auto relative">
              {loading && indicatorRows.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#008B85]" />
                  <span>Đang tải bảng thống kê cơ bản...</span>
                </div>
              ) : (
                <table
                  className="w-full border-collapse text-xs tabular-nums"
                  data-testid="thkq-basic-stats-table"
                >
                  <thead>
                    <tr className="bg-[#003B3A] border-b border-[#0F766E]/60 text-[11px] font-semibold whitespace-nowrap">
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-20 bg-[#003B3A] text-white text-left py-3 px-4 border-r border-[#0F766E]/60 min-w-[230px] align-middle"
                      >
                        Chỉ số
                      </th>
                      {displayPairs.map((gp) => {
                        const isSelectedGrade =
                          grade !== "ALL" && String(gp.gradeNumber) === String(grade)
                        return (
                          <th
                            key={`tier1-grade-${gp.gradeNumber}`}
                            colSpan={2}
                            className={`text-center py-2.5 px-3 border-r border-[#0F766E]/60 ${
                              gp.gradeNumber === 0
                                ? "text-[#5EEAD4] bg-[#002827]"
                                : isSelectedGrade
                                ? "text-[#5EEAD4] bg-[#004D4B]"
                                : "text-white"
                            }`}
                          >
                            {gp.gradeLabel}
                          </th>
                        )
                      })}
                    </tr>

                    <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                      {displayPairs.map((gp) => (
                        <React.Fragment key={`tier2-grade-${gp.gradeNumber}`}>
                          <th className="text-right text-teal-100 py-2 px-3.5 border-r border-[#0F766E]/40 min-w-[115px]">
                            {gp.campusColumnLabel}
                          </th>
                          <th className="text-right text-[#5EEAD4] bg-[#002E2D] py-2 px-3.5 border-r border-[#0F766E]/60 min-w-[115px]">
                            {gp.systemColumnLabel}
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {indicatorRows.map((row) => (
                      <tr
                        key={row.key}
                        className="group transition-colors align-middle hover:bg-[#F8FAFC]"
                      >
                        <td
                          className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] py-3 px-4 font-semibold text-slate-800 border-r border-[#E2E8F0] align-middle whitespace-nowrap"
                          title={row.description}
                        >
                          {row.label}
                        </td>

                        {displayPairs.map((gp) => {
                          const cell = row.cellsByGrade[gp.gradeNumber]
                          const campusVal = cell?.campusDisplay ?? "—"
                          const systemVal = cell?.systemDisplay ?? "—"

                          return (
                            <React.Fragment key={`${row.key}-grade-${gp.gradeNumber}`}>
                              <td
                                data-testid={`cell-${row.key}-G${gp.gradeNumber}-CAMPUS`}
                                className="py-3 px-3.5 text-right align-middle tabular-nums text-slate-800 font-medium border-r border-[#F1F5F9] whitespace-nowrap"
                              >
                                {campusVal}
                              </td>

                              <td
                                data-testid={`cell-${row.key}-G${gp.gradeNumber}-SYSTEM`}
                                className="py-3 px-3.5 text-right align-middle tabular-nums bg-[#F1F5F9]/75 group-hover:bg-[#E2E8F0]/60 text-[#003B3A] font-semibold border-r border-[#E2E8F0] whitespace-nowrap"
                              >
                                {systemVal}
                              </td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 2. b. Bảng tần số (8 khoảng điểm) & c. Một số chỉ số thống kê cơ bản */}
          {hasAnyValidScoreForChart && renderFrequencyAndSummaryTables("table-tab")}
        </div>
      )}
    </div>
  )
}
