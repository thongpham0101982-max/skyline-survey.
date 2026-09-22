"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Filter,
  GraduationCap,
  Layers,
  RefreshCw,
  TrendingUp,
  Users,
  Award,
  AlertTriangle
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { ClassQualityMatrixTab } from "./components/ClassQualityMatrixTab"
import { CampusGradeBenchmarkTab } from "./components/CampusGradeBenchmarkTab"
import { DepartmentBenchmarkTab } from "./components/DepartmentBenchmarkTab"
import { ChartsVisualTab } from "./components/ChartsVisualTab"
import { StudentTrackingDrawer } from "./components/StudentTrackingDrawer"

interface Props {
  academicYears: any[]
  activeYearId: string
  teacherProfile: any
  userRole: string
}

const EVAL_PERIODS = [
  { code: "KSĐN", label: "Khảo sát đầu năm (KSĐN)", short: "KSĐN" },
  { code: "GK1", label: "Giữa kỳ 1 (GK1)", short: "GK1" },
  { code: "CK1", label: "Cuối kỳ 1 (CK1)", short: "CK1" },
  { code: "GK2", label: "Giữa kỳ 2 (GK2)", short: "GK2" },
  { code: "CK2", label: "Cuối kỳ 2 (CK2)", short: "CK2" }
]

export function SubjectAnalyticsClient({
  academicYears,
  activeYearId,
  teacherProfile,
  userRole
}: Props) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("GK1")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ALL")
  const [activeTab, setActiveTab] = useState<"matrix" | "campus" | "department" | "charts">("matrix")

  // Data states
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Drawer state for student tracking
  const [selectedClassForTracking, setSelectedClassForTracking] = useState<any>(null)
  const [isTrackingOpen, setIsTrackingOpen] = useState(false)

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedYearId) params.append("academicYearId", selectedYearId)
      if (selectedSubjectId) params.append("subjectId", selectedSubjectId)
      if (selectedPeriod) params.append("evaluationPeriod", selectedPeriod)
      if (selectedGradeFilter) params.append("gradeFilter", selectedGradeFilter)

      const res = await fetch(`/api/teacher/subject-analytics?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setData(json)
        // Auto select first subject if not yet selected
        if (!selectedSubjectId && json.assignedSubjects?.length > 0) {
          setSelectedSubjectId(json.assignedSubjects[0].id)
        }
      } else {
        toast.error(json.error || "Không thể tải dữ liệu phân tích")
      }
    } catch (e) {
      console.error(e)
      toast.error("Lỗi khi tải dữ liệu phân tích môn học")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYearId, selectedSubjectId, selectedPeriod, selectedGradeFilter])

  // Extract unique grades for filter
  const gradeOptions = useMemo(() => {
    if (!data?.classAnalytics) return []
    const set = new Set<string>()
    data.classAnalytics.forEach((c: any) => {
      if (c.grade) set.add(c.grade)
    })
    return Array.from(set).sort()
  }, [data?.classAnalytics])

  // Export to Excel
  const handleExportExcel = () => {
    if (!data?.classAnalytics || data.classAnalytics.length === 0) {
      toast.error("Không có dữ liệu để xuất Excel")
      return
    }

    try {
      const subjectName = data.currentSubject?.name || "MonHoc"
      const rows = data.classAnalytics.map((c: any) => ({
        "Lớp": c.className,
        "Khối": c.grade,
        "Hệ đào tạo": c.educationSystem,
        "Cơ sở": c.campusName,
        "Sĩ số": c.totalStudents,
        "Đã chấm": c.gradedCount,
        "ĐTB Môn": c.avgScore,
        "Điểm trung vị": c.median,
        "Điểm thấp nhất": c.minScore,
        "Điểm cao nhất": c.maxScore,
        "Độ lệch chuẩn": c.stdDev,
        "Số lượng Xuất sắc (9-10)": c.bands?.excellent?.count || 0,
        "% Xuất sắc": `${c.bands?.excellent?.pct || 0}%`,
        "Số lượng Giỏi (8-8.9)": c.bands?.good?.count || 0,
        "% Giỏi": `${c.bands?.good?.pct || 0}%`,
        "Số lượng Khá (7-7.9)": c.bands?.satisfactory?.count || 0,
        "% Khá": `${c.bands?.satisfactory?.pct || 0}%`,
        "Số lượng TB (5-6.9)": c.bands?.average?.count || 0,
        "% TB": `${c.bands?.average?.pct || 0}%`,
        "Số lượng Chưa đạt (<5)": c.bands?.poor?.count || 0,
        "% Chưa đạt": `${c.bands?.poor?.pct || 0}%`,
        "Chuẩn sàn SKL": c.benchmark,
        "% Đạt sàn SKL": `${c.pctPassed}%`,
        "Mục tiêu Quota": `${c.targetQuota}%`,
        "Trạng thái Quota": c.isMeetingQuota ? "Đạt Quota" : "Chưa đạt"
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Phân tích chất lượng")
      XLSX.writeFile(wb, `Bao_Cao_Chat_Luong_${subjectName}_${selectedPeriod}.xlsx`)
      toast.success("Xuất file Excel thành công!")
    } catch (e) {
      console.error(e)
      toast.error("Lỗi khi xuất file Excel")
    }
  }

  const kpi = data?.summaryKpi
  const currentSubject = data?.currentSubject
  const dept = data?.departmentBenchmark

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4B] to-[#0A5C59] rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-400/30">
                Không gian Giáo viên Bộ môn
              </span>
              <span className="text-teal-200/60">•</span>
              <span className="text-xs text-teal-100/90 font-medium">
                {teacherProfile?.teacherName || "Giáo viên"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Phân tích Chất lượng Môn học & Đối sánh Chuyên môn
            </h1>
            <p className="text-xs text-teal-100/80 mt-1 max-w-2xl">
              Theo dõi chất lượng học tập theo phân công giảng dạy, đối chuẩn 5 dải phổ điểm Sky-Line K12, đối sánh Khối - Cơ sở và Tổ chuyên môn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors border border-white/20 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 shadow-xs"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Năm học:</span>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-800"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Môn học:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-teal-200 text-xs font-bold text-[#003B3A] focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-teal-50/50"
            >
              {data?.assignedSubjects?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Period */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Đợt đánh giá:</span>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl">
              {EVAL_PERIODS.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setSelectedPeriod(p.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedPeriod === p.code
                      ? "bg-white text-[#003B3A] shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {p.short}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Filter */}
          {gradeOptions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Khối:</span>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-800"
              >
                <option value="ALL">Tất cả các khối</option>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Teacher Info Badge */}
        {data?.teacher && (
          <div className="text-xs text-slate-500 font-medium">
            Tổ chuyên môn: <span className="font-bold text-slate-800">{data.teacher.departmentName || "Bộ môn"}</span> • Cơ sở: <span className="font-bold text-slate-800">{data.teacher.campusName}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      {kpi && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: My Average */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              ĐTB Môn của Bạn ({selectedPeriod})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {kpi.teacherAvgScore > 0 ? kpi.teacherAvgScore.toFixed(2) : "—"}
              </span>
              {dept && dept.deltaVsDepartment !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  dept.deltaVsDepartment >= 0 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "bg-red-50 text-red-700"
                }`}>
                  {dept.deltaVsDepartment >= 0 ? `+${dept.deltaVsDepartment.toFixed(1)}` : dept.deltaVsDepartment.toFixed(1)} vs Tổ CM
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Phụ trách {kpi.totalClasses} lớp • {kpi.gradedCount}/{kpi.totalStudents} học sinh
            </p>
          </div>

          {/* KPI 2: Pass Benchmark Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Tỉ lệ Đạt chuẩn Sky-Line
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 tabular-nums">
                {kpi.pctPassedBenchmark}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Học sinh đạt chuẩn sàn môn học (≥ 6.0 hoặc ≥ 7.0đ)
            </p>
          </div>

          {/* KPI 3: Excellent & Good Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Tỉ lệ Khá & Giỏi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-700 tabular-nums">
                {kpi.pctExcellent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Học sinh thuộc dải Giỏi & Xuất sắc (≥ 8.0đ)
            </p>
          </div>

          {/* KPI 4: Quota Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Chỉ tiêu Quota Nhà trường
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#003B3A] tabular-nums">
                {kpi.classesMeetingQuota}
                <span className="text-slate-400 text-lg font-normal"> / {kpi.totalClasses}</span>
              </span>
              <span className="text-xs font-semibold text-slate-500">lớp đạt</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {kpi.classesNeedingSupport > 0 ? (
                <span className="text-amber-600 font-semibold">
                  Có {kpi.classesNeedingSupport} lớp cần tăng cường phụ đạo
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">
                  Tất cả các lớp đều đạt chỉ tiêu Quota
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200/80">
        <nav className="flex space-x-2 md:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
              activeTab === "matrix"
                ? "border-teal-600 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Phân tích theo Lớp phụ trách (Chuẩn Sky-Line)</span>
          </button>

          <button
            onClick={() => setActiveTab("campus")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
              activeTab === "campus"
                ? "border-teal-600 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Đối sánh Khối & Cơ sở</span>
          </button>

          <button
            onClick={() => setActiveTab("department")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
              activeTab === "department"
                ? "border-teal-600 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>3. Đối sánh Tổ chuyên môn & Hệ thống</span>
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
              activeTab === "charts"
                ? "border-teal-600 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>4. Biểu đồ Trực quan hóa</span>
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Đang tổng hợp và phân tích dữ liệu môn học...</p>
          <p className="text-xs text-slate-400 mt-1">Đang xử lý đối chuẩn phổ điểm Sky-Line và so sánh khối/cơ sở</p>
        </div>
      ) : (
        <div>
          {activeTab === "matrix" && (
            <ClassQualityMatrixTab
              classAnalytics={data?.classAnalytics || []}
              trendMatrix={data?.trendMatrix || []}
              evaluationPeriod={selectedPeriod}
              onOpenTracking={(c) => {
                setSelectedClassForTracking(c)
                setIsTrackingOpen(true)
              }}
            />
          )}

          {activeTab === "campus" && (
            <CampusGradeBenchmarkTab
              benchmarkData={data?.campusGradeBenchmark || []}
              evaluationPeriod={selectedPeriod}
              subjectName={currentSubject?.name || "Môn học"}
            />
          )}

          {activeTab === "department" && (
            <DepartmentBenchmarkTab
              departmentData={data?.departmentBenchmark}
              evaluationPeriod={selectedPeriod}
              subjectName={currentSubject?.name || "Môn học"}
            />
          )}

          {activeTab === "charts" && (
            <ChartsVisualTab
              classAnalytics={data?.classAnalytics || []}
              trendMatrix={data?.trendMatrix || []}
              departmentData={data?.departmentBenchmark}
              evaluationPeriod={selectedPeriod}
              subjectName={currentSubject?.name || "Môn học"}
            />
          )}
        </div>
      )}

      {/* Student Tracking Drawer */}
      <StudentTrackingDrawer
        classItem={selectedClassForTracking}
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        subjectName={currentSubject?.name || "Môn học"}
      />
    </div>
  )
}
