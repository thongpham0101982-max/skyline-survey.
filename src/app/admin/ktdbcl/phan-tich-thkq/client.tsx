// @ts-nocheck
"use client"

import React, { useState, useEffect, useCallback } from "react"
import * as XLSX from "xlsx"
import { toast } from "react-hot-toast"
import {
  ShieldCheck,
  ChevronRight,
  Home
} from "lucide-react"

import { ThkqFilterToolbar } from "@/components/ktdbcl/thkq/ThkqFilterToolbar"
import { ThkqKpiCards } from "@/components/ktdbcl/thkq/ThkqKpiCards"
import { ThkqHeatmapMatrix } from "@/components/ktdbcl/thkq/ThkqHeatmapMatrix"
import { ThkqComparativeCharts } from "@/components/ktdbcl/thkq/ThkqComparativeCharts"
import { ThkqClassStatsTable } from "@/components/ktdbcl/thkq/ThkqClassStatsTable"
import { ThkqTargetStudentsTable } from "@/components/ktdbcl/thkq/ThkqTargetStudentsTable"
import { ThkqDrilldownModal } from "@/components/ktdbcl/thkq/ThkqDrilldownModal"

interface Props {
  academicYears: any[]
  activeYearId: string
  campuses: any[]
  subjects: any[]
  classes: any[]
}

export function PhanTichThkqClient({
  academicYears = [],
  activeYearId = "",
  campuses = [],
  subjects = [],
  classes = []
}: Props) {
  // Bộ lọc States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id ?? ""))
  const [selectedPeriod, setSelectedPeriod] = useState("ALL")
  const [selectedLevel, setSelectedLevel] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedScoreRange, setSelectedScoreRange] = useState("ALL")
  const [selectedTargetType, setSelectedTargetType] = useState("ALL")
  const [searchKeyword, setSearchKeyword] = useState("")

  // Data State
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<{
    kpi: any
    benchmarks: any
    heatmap: any
    classStats: any[]
    charts: any
    targetStudents: any[]
    totalTargetStudentsCount: number
    countsByTargetGroup: any
  }>({
    kpi: null,
    benchmarks: null,
    heatmap: { columns: [], rows: [] },
    classStats: [],
    charts: null,
    targetStudents: [],
    totalTargetStudentsCount: 0,
    countsByTargetGroup: { belowSkyline: 0, belowMoet: 0, commitment: 0, psychological: 0, perfect10: 0 }
  })

  // Modal Drill-down State
  const [drilldownCell, setDrilldownCell] = useState<any>(null)
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false)

  // Fetch dữ liệu từ API
  const fetchData = useCallback(async () => {
    if (!selectedYearId) return
    setLoading(true)
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
        searchKeyword
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
      setLoading(false)
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
    searchKeyword
  ])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Xử lý khi click vào ô Bản đồ nhiệt
  const handleCellClick = (cell: any) => {
    setDrilldownCell(cell)
    setDrilldownModalOpen(true)
  }

  // Xử lý khi click thẻ KPI để lọc nhanh
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
      setSelectedTargetType("ALL")
    } else if (filterType === "PERFECT_10") {
      setSelectedScoreRange("PERFECT_10")
      setSelectedTargetType("PERFECT_10")
    }
  }

  // Xuất file Excel tổng hợp
  const handleExportExcel = () => {
    if (!analyticsData || !analyticsData.classStats) {
      toast.error("Không có dữ liệu để xuất file")
      return
    }

    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: Thống kê Lớp & Độ lệch chuẩn
      const classRows = analyticsData.classStats.map((c, idx) => ({
        STT: idx + 1,
        "Lớp": c.className,
        "Khối": c.gradeLabel,
        "Cơ sở": c.campusName,
        "Môn học": c.subjectName,
        "GVCN": c.homeroomTeacher || "",
        "Sĩ số": c.studentCount,
        "ĐTB Lớp": c.avgScore,
        "ĐTB Khối": c.gradeAvgScore,
        "ĐTB Cơ sở": c.campusAvgScore,
        "ĐTB Hệ thống": c.systemAvgScore,
        "Độ lệch chuẩn (σ)": c.stdDev,
        "Lệch với Cơ sở (Δ)": c.deltaCampus,
        "Lệch với Khối (Δ)": c.deltaGrade,
        "Số HS dưới 5": c.below5Count,
        "Tỷ lệ dưới 5 (%)": c.below5Rate,
        "Số HS dưới chuẩn SL": c.belowSkylineCount,
        "Tỷ lệ dưới chuẩn SL (%)": c.belowSkylineRate,
        "Số HS Điểm 10": c.perfect10Count
      }))
      const wsClass = XLSX.utils.json_to_sheet(classRows)
      XLSX.utils.book_append_sheet(wb, wsClass, "ThongKe_Lop_DoLechChuan")

      // Sheet 2: Danh sách Học sinh Trọng tâm
      const studentRows = (analyticsData.targetStudents || []).map((s, idx) => ({
        STT: idx + 1,
        "Mã Học Sinh": s.studentCode,
        "Họ và Tên": s.studentName,
        "Lớp": s.className,
        "Khối": s.gradeLabel,
        "Cơ sở": s.campusName,
        "Môn học": s.subjectName,
        "Điểm số": s.score,
        "Chuẩn Sky-Line": s.skylineBenchmark,
        "Chuẩn Bộ": s.moetBenchmark,
        "Chênh lệch Chuẩn SL": s.deltaSkyline,
        "Dưới chuẩn Sky-Line": s.isBelowSkyline ? "Có" : "Không",
        "Dưới chuẩn Bộ (<5)": s.isBelowMoet ? "Có" : "Không",
        "Cam kết đầu vào": s.isCommitment ? "Có" : "Không",
        "Theo dõi tâm lý": s.isPsychological ? "Có" : "Không",
        "Điểm 10": s.isPerfect10 ? "Có" : "Không",
        "GVCN": s.homeroomTeacher || ""
      }))
      const wsStudent = XLSX.utils.json_to_sheet(studentRows)
      XLSX.utils.book_append_sheet(wb, wsStudent, "HocSinh_TrongDiem")

      // Sheet 3: KPI Tổng quan
      if (analyticsData.kpi) {
        const kpiRows = [
          { "Chỉ số": "Tổng số lượt đánh giá", "Giá trị": analyticsData.kpi.totalEvaluations },
          { "Chỉ số": "Số HS Dưới trung bình (< 5.0)", "Giá trị": analyticsData.kpi.below5Count },
          { "Chỉ số": "Tỷ lệ Dưới trung bình (%)", "Giá trị": `${analyticsData.kpi.below5Rate}%` },
          { "Chỉ số": "Số HS Dưới Chuẩn Sky-Line", "Giá trị": analyticsData.kpi.belowSkylineCount },
          { "Chỉ số": "Tỷ lệ Dưới Chuẩn Sky-Line (%)", "Giá trị": `${analyticsData.kpi.belowSkylineRate}%` },
          { "Chỉ số": "Số HS Đạt & Vượt Chuẩn", "Giá trị": analyticsData.kpi.aboveSkylineCount },
          { "Chỉ số": "Tỷ lệ Đạt Chuẩn (%)", "Giá trị": `${analyticsData.kpi.aboveSkylineRate}%` },
          { "Chỉ số": "Số HS Đạt 8.0 - 10.0", "Giá trị": analyticsData.kpi.score8To10Count },
          { "Chỉ số": "Số HS Điểm 10 Tuyệt đối", "Giá trị": analyticsData.kpi.perfect10Count }
        ]
        const wsKpi = XLSX.utils.json_to_sheet(kpiRows)
        XLSX.utils.book_append_sheet(wb, wsKpi, "KPI_TongHop")
      }

      const campusNameStr =
        selectedCampusId !== "ALL"
          ? campuses.find(c => c.id === selectedCampusId)?.campusName || "CoSo"
          : "ToanHeThong"
      XLSX.writeFile(wb, `BaoCao_PhanTich_THKQ_${campusNameStr}_${selectedPeriod}.xlsx`)
      toast.success("Xuất báo cáo Excel thành công!")
    } catch (err: any) {
      console.error("Lỗi xuất Excel:", err)
      toast.error("Không thể xuất file Excel: " + err.message)
    }
  }

  const selectedCampusObj = campuses.find(c => c.id === selectedCampusId)
  const selectedCampusName = selectedCampusObj ? selectedCampusObj.campusName : "Toàn hệ thống"

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Tiêu đề trang */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-medium">
          <a href="/admin" className="hover:text-slate-800 transition flex items-center gap-1">
            <Home className="h-3.5 w-3.5" /> Quản trị
          </a>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-600">Khảo thí & ĐBCL</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-sky-600 font-bold">Phân tích THKQ</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Phân tích Tổng hợp Kết quả (THKQ)</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> KT&ĐBCL
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Giám sát chất lượng học tập, tính ĐTB Lớp - Khối - Cơ sở, Độ lệch chuẩn mẫu (σ), nhận diện học sinh dưới
              chuẩn Sky-Line, chuẩn Bộ GD&ĐT, học sinh cam kết đầu vào và theo dõi tâm lý học đường.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Bộ lọc Đa cấp */}
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
        loading={loading}
        onRefresh={fetchData}
        onExportExcel={handleExportExcel}
      />

      {/* 2. Khối KPI Cards */}
      <ThkqKpiCards
        kpi={analyticsData.kpi}
        onSelectKpiFilter={handleKpiFilter}
      />

      {/* 3. Bản đồ nhiệt Heatmap (< 5.0) */}
      <ThkqHeatmapMatrix heatmap={analyticsData.heatmap} onCellClick={handleCellClick} />

      {/* 4. Khối Biểu đồ So sánh Đa tầng Recharts */}
      {analyticsData.charts && (
        <ThkqComparativeCharts
          charts={analyticsData.charts}
          selectedCampusName={selectedCampusName}
          selectedLevel={selectedLevel}
        />
      )}

      {/* 5. Bảng Thống kê Lớp, ĐTB & Độ lệch chuẩn */}
      <ThkqClassStatsTable classStats={analyticsData.classStats} />

      {/* 6. Danh sách Học sinh Trọng tâm (Dưới chuẩn, Cam kết, Tâm lý, Điểm 10) */}
      <ThkqTargetStudentsTable
        students={analyticsData.targetStudents}
        totalCount={analyticsData.totalTargetStudentsCount}
        countsByGroup={analyticsData.countsByTargetGroup}
        selectedTargetType={selectedTargetType}
        setSelectedTargetType={setSelectedTargetType}
      />

      {/* Modal Drill-down xem chi tiết học sinh ô Heatmap */}
      <ThkqDrilldownModal
        isOpen={drilldownModalOpen}
        onClose={() => setDrilldownModalOpen(false)}
        cellData={drilldownCell}
        allTargetStudents={analyticsData.targetStudents}
      />
    </div>
  )
}
