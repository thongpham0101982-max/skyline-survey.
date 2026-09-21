// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import {
  BarChart2,
  TrendingUp,
  Layers,
  Users,
  Award,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  BookOpen,
  Filter,
  CheckCircle2,
  Download,
  RefreshCw
} from "lucide-react"

import { ScatterFilterToolbar } from "@/components/ktdbcl/scatter/ScatterFilterToolbar"
import { ScatterMetricsBar } from "@/components/ktdbcl/scatter/ScatterMetricsBar"
import { ScatterPlotCanvas } from "@/components/ktdbcl/scatter/ScatterPlotCanvas"
import { ScatterQuadrantSummary } from "@/components/ktdbcl/scatter/ScatterQuadrantSummary"
import { ScatterDataTable } from "@/components/ktdbcl/scatter/ScatterDataTable"
import { ScatterDrilldownDrawer } from "@/components/ktdbcl/scatter/ScatterDrilldownDrawer"
import { ScatterActionModal } from "@/components/ktdbcl/scatter/ScatterActionModal"

interface Props {
  academicYears: any[]
  activeYearId: string
  campuses: any[]
  subjects: any[]
  classes: any[]
}

export function ScatterPlotClient({
  academicYears = [],
  activeYearId = "",
  campuses = [],
  subjects = [],
  classes = []
}: Props) {
  const router = useRouter()

  // Filter States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id ?? ""))
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedLevel, setSelectedLevel] = useState("ALL")
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("ALL")
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? "")
  const [selectedSemester, setSelectedSemester] = useState("ALL")
  const [mode, setMode] = useState<"GROWTH" | "FORMATIVE_SUMMATIVE" | "CROSS_SUBJECT" | "ADMISSION_PERFORMANCE">("GROWTH")
  const [periodX, setPeriodX] = useState("KSĐN")
  const [periodY, setPeriodY] = useState("GK1")
  const [compareSubjectId, setCompareSubjectId] = useState(subjects[1]?.id ?? "")
  const [searchKeyword, setSearchKeyword] = useState("")

  // View state: "STUDENT" | "CLASS"
  const [viewScope, setViewScope] = useState<"STUDENT" | "CLASS">("STUDENT")
  const [activeQuadrant, setActiveQuadrant] = useState("ALL")

  // Drawer & Action Modal states
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [actionType, setActionType] = useState<"SUPPORT" | "COMMITMENT" | null>(null)
  const [actionStudent, setActionStudent] = useState<any>(null)

  // Data fetching state
  const [loading, setLoading] = useState(false)
  const [scatterData, setScatterData] = useState<{
    points: any[]
    metrics: any
    benchmarks: any
    quadrants: any
    classesAggregated: any[]
    meta: any
  }>({
    points: [],
    metrics: null,
    benchmarks: null,
    quadrants: null,
    classesAggregated: [],
    meta: null
  })

  // Filter classes locally for the dropdown
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedCampusId !== "ALL" && c.campusId !== selectedCampusId && c.campus?.id !== selectedCampusId) {
        return false
      }
      if (selectedGrade !== "ALL" && c.grade !== selectedGrade) {
        return false
      }
      return true
    })
  }, [classes, selectedCampusId, selectedGrade])

  // Reset selectedClassId if not valid
  useEffect(() => {
    if (selectedClassId !== "ALL" && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId("ALL")
    }
  }, [filteredClasses, selectedClassId])

  // Fetch Scatter Plot Analytics API
  const fetchScatterData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        campusId: selectedCampusId,
        levelFilter: selectedLevel,
        gradeFilter: selectedGrade,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        semester: selectedSemester,
        mode,
        periodX,
        periodY,
        compareSubjectId
      })

      const res = await fetch(`/api/admin/ktdbcl/scatter-analytics?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setScatterData(json)
      } else {
        console.error("Lỗi API scatter-analytics:", json.error)
      }
    } catch (err) {
      console.error("Lỗi kết nối tải dữ liệu scatter:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScatterData()
  }, [
    selectedYearId,
    selectedCampusId,
    selectedLevel,
    selectedGrade,
    selectedClassId,
    selectedSubjectId,
    selectedSemester,
    mode,
    periodX,
    periodY,
    compareSubjectId
  ])

  // Drilldown handler
  const handleSelectStudent = (st: any) => {
    setSelectedStudent(st)
    setDrawerOpen(true)
  }

  // Open Action Modal
  const handleActionClick = (st: any, type: "SUPPORT" | "COMMITMENT") => {
    setActionStudent(st)
    setActionType(type)
    setActionModalOpen(true)
  }

  // Export Excel: 4 Quadrants
  const handleExportExcel = () => {
    if (!scatterData.points || scatterData.points.length === 0) {
      alert("Không có dữ liệu học sinh để xuất!")
      return
    }

    const rows = scatterData.points.map((p, idx) => ({
      "STT": idx + 1,
      "Mã HS": p.studentCode,
      "Họ và tên": p.studentName,
      "Cơ sở": p.campusName,
      "Lớp": p.className,
      "Khối": p.grade,
      "Giáo viên phụ trách": p.teacherName,
      "Môn học": p.subjectName,
      [`Điểm Trục X (${scatterData.meta?.labelX || "Gốc"})`]: p.x,
      [`Điểm Trục Y (${scatterData.meta?.labelY || "Hiện tại"})`]: p.y,
      "Độ lệch (Δ)": p.delta,
      "Phân nhóm Sky-Line": p.quadrant === "Q1" ? "Q1: Vượt trội & Bền vững" : p.quadrant === "Q2" ? "Q2: Bứt phá Năng lực" : p.quadrant === "Q3" ? "Q3: Can thiệp Trọng điểm" : "Q4: Sa sút Bất thường",
      "Xếp loại GDPT 2018": p.classification?.label || "",
      "Cam kết Tuyển sinh ĐV": p.hasAdmissionCommitment ? "CÓ" : "KHÔNG",
      "Cam kết Học tập": p.hasLearningCommitment ? "CÓ" : "KHÔNG",
      "Điểm Ngoại lai (Outlier)": p.isOutlier ? "CÓ" : "KHÔNG",
      "Nhận xét GV": p.remark || ""
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Phan_Tich_Phan_Tan_SkyLine")
    XLSX.writeFile(wb, `Bao_Cao_Scatter_Plot_SkyLine_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const currentYearName = academicYears.find(y => y.id === selectedYearId)?.name || "2026-2027"

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-50 text-[#005B58] border border-teal-200 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Khảo thí & ĐBCL Sky-Line
            </span>
            <span className="text-xs font-bold text-slate-500">[{currentYearName}]</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Phân tích Phân tán Học thuật (Scatter Plot)</span>
            <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              GDPT 2018
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Mô hình trực quan hóa tương quan 2D khoa học, phân cụm 4 nhóm sư phạm theo chuẩn kép (Bộ GD&ĐT và Chuẩn Sky-Line), giúp nhận diện sớm học sinh bứt phá và học sinh cần can thiệp khẩn.
          </p>
        </div>

        {/* View Switch: Học sinh cá nhân vs Lớp học / Giáo viên */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setViewScope("STUDENT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              viewScope === "STUDENT"
                ? "bg-white text-[#005B58] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Học sinh cá nhân ({scatterData.points.length})
          </button>
          <button
            onClick={() => setViewScope("CLASS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              viewScope === "CLASS"
                ? "bg-white text-[#005B58] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Đối soát Lớp / Giáo viên ({scatterData.classesAggregated.length})
          </button>
        </div>
      </div>

      {/* 2. Tầng 1 & 2: Toolbar Bộ lọc & Chế độ tương quan */}
      <ScatterFilterToolbar
        academicYears={academicYears}
        campuses={campuses}
        subjects={subjects}
        classes={filteredClasses}
        selectedYearId={selectedYearId}
        setSelectedYearId={setSelectedYearId}
        selectedCampusId={selectedCampusId}
        setSelectedCampusId={setSelectedCampusId}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedSubjectId={selectedSubjectId}
        setSelectedSubjectId={setSelectedSubjectId}
        mode={mode}
        setMode={setMode}
        periodX={periodX}
        setPeriodX={setPeriodX}
        periodY={periodY}
        setPeriodY={setPeriodY}
        compareSubjectId={compareSubjectId}
        setCompareSubjectId={setCompareSubjectId}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        loading={loading}
        onRefresh={fetchScatterData}
        onExportExcel={handleExportExcel}
        onNavigateToGradebook={() => router.push("/admin/ktdbcl/diem-nhan-xet")}
      />

      {/* 3. Tầng 3: Thẻ chỉ số Thống kê Tổng quan */}
      <ScatterMetricsBar
        metrics={scatterData.metrics}
        benchmarks={scatterData.benchmarks}
        meta={scatterData.meta}
      />

      {/* 4. Tầng 6: Thẻ tổng kết 4 Góc phần tư (Quadrant Summary) */}
      <ScatterQuadrantSummary
        quadrants={scatterData.quadrants}
        activeQuadrant={activeQuadrant}
        onSelectQuadrant={setActiveQuadrant}
      />

      {/* 5. Tầng 4 & 5: Canvas Biểu đồ Phân tán 2D (hoặc Bảng so sánh giáo viên) */}
      {viewScope === "STUDENT" ? (
        <ScatterPlotCanvas
          points={scatterData.points}
          benchmarks={scatterData.benchmarks}
          meta={scatterData.meta}
          activeQuadrant={activeQuadrant}
          selectedStudentId={selectedStudent?.studentId}
          onSelectStudent={handleSelectStudent}
        />
      ) : (
        /* Bảng tổng hợp đối soát Giáo viên & Lớp học */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800">
              Đối soát Chất lượng Giảng dạy & Độ phân tán theo Lớp học
            </span>
            <span className="text-[11px] text-slate-500">
              Đánh giá tính đồng đều (CV% & σ) của các lớp trong cùng khối
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Lớp học</th>
                  <th className="py-2.5 px-3">Cơ sở</th>
                  <th className="py-2.5 px-3">Giáo viên phụ trách</th>
                  <th className="py-2.5 px-2 text-center">Sỹ số</th>
                  <th className="py-2.5 px-2 text-center">TB Gốc (X)</th>
                  <th className="py-2.5 px-2 text-center">TB Hiện tại (Y)</th>
                  <th className="py-2.5 px-2 text-center">Độ lệch chuẩn (σ)</th>
                  <th className="py-2.5 px-2 text-center">Biến thiên (CV%)</th>
                  <th className="py-2.5 px-2 text-center">Tỷ lệ Đạt chuẩn</th>
                  <th className="py-2.5 px-2 text-center">Số HS &lt; 5đ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scatterData.classesAggregated.map(cls => (
                  <tr key={cls.classId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-black text-teal-900">{cls.className}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{cls.campusName}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{cls.teacherName}</td>
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-700">{cls.count}</td>
                    <td className="py-2.5 px-2 text-center text-slate-600">{cls.meanX}đ</td>
                    <td className="py-2.5 px-2 text-center font-extrabold text-[#005B58] bg-teal-50/40">{cls.meanY}đ</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-600">{cls.stdDevY}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        cls.cvY < 15 ? "text-emerald-700 bg-emerald-50" : cls.cvY <= 25 ? "text-sky-700 bg-sky-50" : "text-amber-700 bg-amber-50"
                      }`}>
                        {cls.cvY}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-emerald-700">{cls.passRate}%</td>
                    <td className="py-2.5 px-2 text-center font-bold text-rose-600">{cls.atRiskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tầng 7: Bảng dữ liệu Học sinh tương tác */}
      <ScatterDataTable
        points={scatterData.points}
        activeQuadrant={activeQuadrant}
        searchKeyword={searchKeyword}
        onSelectStudent={handleSelectStudent}
        onActionClick={handleActionClick}
      />

      {/* 7. Tầng 7: Drawer Hồ sơ học sinh 360 */}
      <ScatterDrilldownDrawer
        student={selectedStudent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onActionClick={handleActionClick}
      />

      {/* 8. Tầng 8: Modal Hành động Can thiệp (Phụ đạo / Cam kết) */}
      <ScatterActionModal
        student={actionStudent}
        actionType={actionType}
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onSuccess={fetchScatterData}
      />
    </div>
  )
}
