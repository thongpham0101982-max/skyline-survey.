"use client"

import React, { useState, useEffect, useCallback } from "react"
import * as XLSX from "xlsx"
import {
  BarChart3,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  X,
  Building2,
  Layers
} from "lucide-react"
import { SKL_PSYCH_CATALOG, type SklPsychTestCode } from "@/lib/advisory/skl-psych-suite"
import SklPsychReportViewer from "./SklPsychReportViewer"
import SklPsychCatalogHub from "./SklPsychCatalogHub"

interface SklPsychStatsDashboardProps {
  role: "ADMIN" | "TEACHER"
  academicYearId?: string
  defaultClassId?: string
  defaultCampusId?: string
  classesList?: any[]
  campusesList?: any[]
}

export default function SklPsychStatsDashboard({
  role,
  academicYearId = "",
  defaultClassId = "ALL",
  defaultCampusId = "ALL",
  classesList = [],
  campusesList = []
}: SklPsychStatsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)

  // Filters
  const [selectedCampusId, setSelectedCampusId] = useState<string>(defaultCampusId || "ALL")
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL")
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || "ALL")
  const [selectedTestCode, setSelectedTestCode] = useState<string>("ALL")
  const [selectedValidity, setSelectedValidity] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Sub-tabs: "overview" | "matrix" | "assessments"
  const [subTab, setSubTab] = useState<"overview" | "matrix" | "assessments">("overview")

  // Modals
  const [selectedAssessmentDetail, setSelectedAssessmentDetail] = useState<any>(null)
  const [selectedStudentPortfolio, setSelectedStudentPortfolio] = useState<{
    id: string
    studentName: string
    studentCode: string
    className: string
    initialTest?: SklPsychTestCode
  } | null>(null)

  useEffect(() => {
    if (defaultClassId && defaultClassId !== "ALL") {
      setSelectedClassId(defaultClassId)
    }
  }, [defaultClassId])

  useEffect(() => {
    if (defaultCampusId && defaultCampusId !== "ALL") {
      setSelectedCampusId(defaultCampusId)
    }
  }, [defaultCampusId])

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        mode: "stats",
        _t: String(Date.now())
      })
      if (academicYearId) params.set("academicYearId", academicYearId)
      if (selectedCampusId && selectedCampusId !== "ALL")
        params.set("campusId", selectedCampusId)
      if (selectedGrade && selectedGrade !== "ALL") params.set("grade", selectedGrade)
      if (selectedClassId && selectedClassId !== "ALL") params.set("classId", selectedClassId)
      if (selectedTestCode && selectedTestCode !== "ALL")
        params.set("testCode", selectedTestCode)
      if (selectedValidity && selectedValidity !== "ALL")
        params.set("validity", selectedValidity)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())

      const res = await fetch(`/api/advisory/psych-suite?${params.toString()}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const json = await res.json()
        setStatsData(json)
      }
    } catch (e) {
      console.error("[SklPsychStatsDashboard] loadStats error:", e)
    } finally {
      setLoading(false)
    }
  }, [
    academicYearId,
    selectedCampusId,
    selectedGrade,
    selectedClassId,
    selectedTestCode,
    selectedValidity,
    searchQuery
  ])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const openAssessmentById = async (id: string) => {
    try {
      const res = await fetch(`/api/advisory/psych-suite?id=${encodeURIComponent(id)}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const json = await res.json()
        if (json.assessment) {
          setSelectedAssessmentDetail(json.assessment)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleExportExcel = () => {
    if (!statsData) return

    if (subTab === "matrix") {
      const matrixRows = (statsData.studentMatrix || []).map((st: any, idx: number) => ({
        STT: idx + 1,
        "Mã học sinh": st.studentCode,
        "Họ và tên": st.studentName,
        "Cơ sở": st.campusName,
        Khối: st.grade,
        Lớp: st.className,
        "Số bài đã làm": `${st.completedCount}/5`,
        "DISC (Hành vi)": st.tests?.DISC?.code || "Chưa làm",
        "EPI (Khí chất)": st.tests?.EPI?.code || "Chưa làm",
        "HOLLAND (Hướng nghiệp)": st.tests?.HOLLAND?.code || "Chưa làm",
        "LYUSIN EQ (Cảm xúc)": st.tests?.LYUSIN_EQ?.code || "Chưa làm",
        "MBTI (Tính cách)": st.tests?.MBTI?.code || "Chưa làm",
        "Đề nghị tư vấn 1:1": st.hasConsultationRequest ? "Có" : "Không",
        "Lưu ý độ tin cậy": st.hasWarning ? "Cần lưu ý (L≥5)" : "Hợp lệ"
      }))
      const ws = XLSX.utils.json_to_sheet(matrixRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Ma_Tran_5_Bo_Cong_Cu")
      XLSX.writeFile(
        wb,
        `SKL_PSYCH_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      return
    }

    const assessments = statsData.assessments || []
    if (assessments.length === 0) {
      const matrixRows = (statsData.studentMatrix || []).map((st: any, idx: number) => ({
        STT: idx + 1,
        "Mã học sinh": st.studentCode,
        "Họ và tên": st.studentName,
        "Cơ sở": st.campusName,
        Khối: st.grade,
        Lớp: st.className,
        "Số bài đã làm": `${st.completedCount}/5`,
        "DISC (Hành vi)": st.tests?.DISC?.code || "Chưa làm",
        "EPI (Khí chất)": st.tests?.EPI?.code || "Chưa làm",
        "HOLLAND (Hướng nghiệp)": st.tests?.HOLLAND?.code || "Chưa làm",
        "LYUSIN EQ (Cảm xúc)": st.tests?.LYUSIN_EQ?.code || "Chưa làm",
        "MBTI (Tính cách)": st.tests?.MBTI?.code || "Chưa làm"
      }))
      const ws = XLSX.utils.json_to_sheet(matrixRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Sinh")
      XLSX.writeFile(
        wb,
        `SKL_PSYCH_Students_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      return
    }

    const rows = assessments.map((e: any, t: number) => {
      const n = e.scoresSummary || {}
      const r: Record<string, any> = {
        STT: t + 1,
        "Mã tra cứu": e.lookupCode,
        "Mã học sinh": e.studentCode,
        "Họ và tên": e.studentName,
        "Cơ sở": e.campusName || "",
        Khối: e.gradeLevel || "",
        Lớp: e.className || "",
        "Mã bài test": e.testCode,
        "Kết quả chủ đạo": e.primaryResultLabel,
        "Mã kết quả": e.primaryResultCode,
        "Độ tin cậy": e.validityStatus === "VALID" ? "Hợp lệ" : "Cần lưu ý",
        "Thời gian làm (giây)": e.durationSeconds || 0,
        "Thời gian hoàn thành": e.submittedAt
          ? new Date(e.submittedAt).toLocaleString("vi-VN")
          : ""
      }
      if (e.testCode === "EPI" && n.EPI) {
        r["Điểm E (Hướng ngoại)"] = n.EPI.e_score
        r["Điểm N (Cảm xúc)"] = n.EPI.n_score
        r["Điểm L (Tính khách quan)"] = n.EPI.l_score
        r["Khí chất"] = n.EPI.temperament
      } else if (e.testCode === "HOLLAND" && n.HOLLAND) {
        r["Top 3 RIASEC"] = n.HOLLAND.top3Code || e.primaryResultCode || ""
        r["Điểm R"] = n.HOLLAND.scores?.R
        r["Điểm I"] = n.HOLLAND.scores?.I
        r["Điểm A"] = n.HOLLAND.scores?.A
        r["Điểm S"] = n.HOLLAND.scores?.S
        r["Điểm E"] = n.HOLLAND.scores?.E
        r["Điểm C"] = n.HOLLAND.scores?.C
      } else if (e.testCode === "MBTI" && n.MBTI) {
        r["Nhóm MBTI"] = n.MBTI.code
        r["Cặp E/I"] = `${n.MBTI.dimensions?.EI?.E}/${n.MBTI.dimensions?.EI?.I}`
        r["Cặp S/N"] = `${n.MBTI.dimensions?.SN?.S}/${n.MBTI.dimensions?.SN?.N}`
        r["Cặp T/F"] = `${n.MBTI.dimensions?.TF?.T}/${n.MBTI.dimensions?.TF?.F}`
        r["Cặp J/P"] = `${n.MBTI.dimensions?.JP?.J}/${n.MBTI.dimensions?.JP?.P}`
      } else if (e.testCode === "DISC" && n.DISC) {
        r["Phong cách DISC"] = n.DISC.pattern
        r["Điểm Net D"] = n.DISC.dimensions?.D?.net
        r["Điểm Net I"] = n.DISC.dimensions?.I?.net
        r["Điểm Net S"] = n.DISC.dimensions?.S?.net
        r["Điểm Net C"] = n.DISC.dimensions?.C?.net
      } else if (e.testCode === "LYUSIN_EQ" && n.LYUSIN_EQ) {
        const sc = n.LYUSIN_EQ.totalEI?.score
        const mx = n.LYUSIN_EQ.totalEI?.maxScore || 138
        r["Tổng điểm EI"] = typeof sc === "number" ? `${sc}/${mx}` : ""
        r["Điểm MEI (Liên nhân cách)"] = n.LYUSIN_EQ.compositeScales?.MEI?.score
        r["Điểm VEI (Nội nhân cách)"] = n.LYUSIN_EQ.compositeScales?.VEI?.score
      }
      return r
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Bao_cao_${selectedTestCode}`)
    XLSX.writeFile(
      wb,
      `SKL_PSYCH_Export_${selectedTestCode}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  const summary = statsData?.summary || {
    totalStudents: 0,
    participatedStudents: 0,
    participationRate: 0,
    totalCompletedAssessments: 0,
    consultationRequestCount: 0,
    warningCount: 0
  }
  const testDistribution = statsData?.testDistribution || {
    DISC: 0,
    EPI: 0,
    HOLLAND: 0,
    LYUSIN_EQ: 0,
    MBTI: 0
  }
  const traitDistributions = statsData?.traitDistributions || {}
  const classDistribution = statsData?.classDistribution || []
  const campusDistribution = statsData?.campusDistribution || []
  const studentMatrix = statsData?.studentMatrix || []
  const assessments = statsData?.assessments || []

  const availableClasses =
    classesList.length > 0
      ? classesList
      : classDistribution.map((c: any) => ({
          id: c.classId,
          name: c.className,
          className: c.className
        }))

  return (
    <div className="space-y-6">
      {/* Slim Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5B2D8B] border border-purple-200 text-[10px] font-black uppercase tracking-wider">
              SKL_PSYCH v2.6.1 • 5 Bộ Công Cụ Chuẩn Hóa
            </span>
            <span className="text-xs text-teal-700 font-bold">
              {role === "ADMIN"
                ? "Quản trị & Thống kê Toàn hệ thống / Cơ sở"
                : "Thống kê & Hồ sơ Tâm lý - Hướng nghiệp Lớp phụ trách"}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            Hệ Thống Khảo Sát Tâm Lý & Hướng Nghiệp Đa Chiều (DISC • EPI • HOLLAND • EQ • MBTI)
          </h2>
          <p className="text-xs text-slate-500">
            Tổng hợp dữ liệu thời gian thực từ Cổng Học sinh & Cổng Phụ huynh, hỗ trợ GVCN/CVHT và Ban Giám hiệu định hướng học tập, lựa chọn tổ hợp môn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadStats}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        {role === "ADMIN" && campusesList.length > 0 && (
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Cơ sở</label>
            <select
              value={selectedCampusId}
              onChange={e => {
                setSelectedCampusId(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {campusesList.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {cp.campusName || cp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === "ADMIN" && (
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={e => {
                setSelectedGrade(e.target.value)
                setSelectedClassId("ALL")
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">Tất cả khối</option>
              {[6, 7, 8, 9, 10, 11, 12].map(g => (
                <option key={g} value={String(g)}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">
            Lớp học {role === "TEACHER" ? "(Theo phân công)" : ""}
          </label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Tất cả lớp phụ trách ({availableClasses.length})</option>
            {availableClasses.map((cls: any) => (
              <option key={cls.id} value={cls.id}>
                {cls.className || cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">
            Bộ công cụ khảo sát
          </label>
          <select
            value={selectedTestCode}
            onChange={e => setSelectedTestCode(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Tất cả 5 bộ công cụ</option>
            <option value="DISC">⚡ DISC (Phong cách Hành vi)</option>
            <option value="EPI">🧠 EPI (Khí chất Hướng nội/ngoại)</option>
            <option value="HOLLAND">🧭 HOLLAND (Sở thích Nghề nghiệp)</option>
            <option value="LYUSIN_EQ">💖 LYUSIN EQ (Trí tuệ Cảm xúc)</option>
            <option value="MBTI">🧩 MBTI (16 Nhóm Tính cách)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">Độ tin cậy</label>
          <select
            value={selectedValidity}
            onChange={e => setSelectedValidity(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="VALID">Hợp lệ</option>
            <option value="WARNING">Cần lưu ý (Lie-Score L≥5)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">
            Tìm kiếm học sinh
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tên HS, mã HS, mã tra cứu..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubTab("overview")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            subTab === "overview"
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <span>📊</span>
          <span>1. Tổng Quan Thống Kê 360°</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("matrix")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            subTab === "matrix"
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <span>👥</span>
          <span>2. Ma Trận Học Sinh × 5 Bộ Công Cụ ({studentMatrix.length} HS)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("assessments")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
            subTab === "assessments"
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <span>📑</span>
          <span>3. Nhật Ký Bài Khảo Sát Chi Tiết ({assessments.length} bài)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Tổng lượt khảo sát hoàn thành
          </span>
          <div className="text-3xl font-black text-slate-800 mt-2">
            {summary.totalCompletedAssessments}
          </div>
          <span className="text-[11px] text-teal-600 font-semibold mt-1 block">
            Trên 5 bộ công cụ chuẩn hóa SKL_PSYCH
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Học sinh đã tham gia
          </span>
          <div className="text-3xl font-black text-teal-700 mt-2">
            {summary.participatedStudents} / {summary.totalStudents}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
            Tỷ lệ độ phủ: <strong className="text-teal-700">{summary.participationRate}%</strong> học
            sinh trong phạm vi
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Đề nghị Tư vấn 1:1
          </span>
          <div className="text-3xl font-black text-purple-700 mt-2">
            {summary.consultationRequestCount}
          </div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
            Học sinh / PHHS đăng ký trao đổi cùng GVCN
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Cảnh báo Lie-Score (L≥5)
          </span>
          <div className="text-3xl font-black text-amber-600 mt-2">{summary.warningCount}</div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            Cần GVCN / Chuyên viên tâm lý lưu ý hỗ trợ
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW STATISTICS                                            */}
      {/* ===================================================================== */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* Distribution across 5 tools */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-black text-slate-800">
                Phân bổ số lượt hoàn thành theo 5 Bộ công cụ chuẩn hóa SKL_PSYCH
              </h3>
              <span className="text-xs text-slate-400">
                Tỷ lệ tính trên tổng số {summary.totalStudents} học sinh trong phạm vi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[
                {
                  code: "DISC" as const,
                  name: "DISC Hành vi",
                  icon: "⚡",
                  color: "bg-rose-500",
                  grade: "Từ Khối 7"
                },
                {
                  code: "HOLLAND" as const,
                  name: "Holland Hướng nghiệp",
                  icon: "🧭",
                  color: "bg-amber-500",
                  grade: "Từ Khối 8"
                },
                {
                  code: "EPI" as const,
                  name: "EPI Khí chất",
                  icon: "🧠",
                  color: "bg-teal-500",
                  grade: "Từ Khối 10"
                },
                {
                  code: "MBTI" as const,
                  name: "MBTI 16 Nhóm",
                  icon: "🧩",
                  color: "bg-indigo-500",
                  grade: "Từ Khối 10"
                },
                {
                  code: "LYUSIN_EQ" as const,
                  name: "Lyusin Trí tuệ EQ",
                  icon: "💖",
                  color: "bg-sky-500",
                  grade: "Khối 11 & 12"
                }
              ].map(item => {
                const count = testDistribution[item.code] || 0
                const pct =
                  summary.totalStudents > 0
                    ? Math.round((count / summary.totalStudents) * 100)
                    : 0
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setSelectedTestCode(item.code)
                      setSubTab("matrix")
                    }}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.code}</span>
                      </span>
                      <span className="text-sm font-black text-slate-900">{count} HS</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{item.name}</span>
                      <span className="font-bold text-slate-700">{pct}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trait Distributions Across the 5 Instruments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Holland RIASEC & DISC */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-3">
                  🧭 Phân bổ Nhóm Sở thích Nghề nghiệp Chủ đạo (HOLLAND RIASEC)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(["R", "I", "A", "S", "E", "C"] as const).map(code => {
                    const cnt = traitDistributions.HOLLAND?.[code] || 0
                    return (
                      <div
                        key={code}
                        className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-center"
                      >
                        <div className="text-xs font-black text-amber-900">Nhóm {code}</div>
                        <div className="text-lg font-black text-amber-700 mt-0.5">{cnt}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-3">
                  ⚡ Phân bổ Trục Phong cách Hành vi Chủ đạo (DISC)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { code: "D", label: "D – Định hướng mục tiêu" },
                    { code: "I", label: "I – Kết nối cảm hứng" },
                    { code: "S", label: "S – Đồng hành tin cậy" },
                    { code: "C", label: "C – Phân tích cẩn trọng" }
                  ].map(d => (
                    <div
                      key={d.code}
                      className="p-3 rounded-xl bg-rose-50/60 border border-rose-200"
                    >
                      <div className="text-[11px] font-bold text-rose-900">{d.label}</div>
                      <div className="text-xl font-black text-rose-700 mt-1">
                        {traitDistributions.DISC?.[d.code] || 0} HS
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* EPI, MBTI & LYUSIN EQ */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-teal-800 mb-3">
                  🧠 Phân bổ 4 Nhóm Khí chất (EPI) & 🧩 Nhóm Tính cách (MBTI)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { k: "Sanguine", label: "Hoạt bát" },
                    { k: "Choleric", label: "Nóng nảy" },
                    { k: "Phlegmatic", label: "Điềm tĩnh" },
                    { k: "Melancholic", label: "Ưu tư" }
                  ].map(t => (
                    <div
                      key={t.k}
                      className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-center"
                    >
                      <div className="text-[11px] font-bold text-teal-900">{t.label}</div>
                      <div className="text-lg font-black text-teal-700">
                        {traitDistributions.EPI?.[t.k] || 0}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { k: "NT", label: "NT – Phân tích" },
                    { k: "NF", label: "NF – Ngoại giao" },
                    { k: "SJ", label: "SJ – Bảo hộ" },
                    { k: "SP", label: "SP – Khám phá" }
                  ].map(m => (
                    <div
                      key={m.k}
                      className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center"
                    >
                      <div className="text-[11px] font-bold text-indigo-900">{m.label}</div>
                      <div className="text-lg font-black text-indigo-700">
                        {traitDistributions.MBTI?.[m.k] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-sky-800">
                    💖 Thang đo Trí tuệ Cảm xúc (LYUSIN EQ)
                  </h4>
                  <span className="text-xs font-bold text-sky-700">
                    Trung bình EI: {traitDistributions.LYUSIN_EQ?.avgPercent || 0}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-[10px] font-bold text-emerald-800">Cao (≥75%)</div>
                    <div className="text-lg font-black text-emerald-700">
                      {traitDistributions.LYUSIN_EQ?.high || 0} HS
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-center">
                    <div className="text-[10px] font-bold text-sky-800">Khá (50–74%)</div>
                    <div className="text-lg font-black text-sky-700">
                      {traitDistributions.LYUSIN_EQ?.medium || 0} HS
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-[10px] font-bold text-amber-800">Cần bồi dưỡng (&lt;50%)</div>
                    <div className="text-lg font-black text-amber-700">
                      {traitDistributions.LYUSIN_EQ?.developing || 0} HS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Class / Campus Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Bảng Thống Kê Tiến Độ Khảo Sát Theo Lớp & GVCN Phụ Trách
                </h3>
                <p className="text-xs text-slate-400">
                  Nhấn vào từng lớp để xem Ma trận Học sinh × 5 Bộ công cụ của lớp đó
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Lớp / Cơ sở</th>
                    <th className="py-3 px-3">GVCN Phụ trách</th>
                    <th className="py-3 px-3 text-center">Sĩ số</th>
                    <th className="py-3 px-3 text-center">HS Đã tham gia</th>
                    <th className="py-3 px-3 text-center">⚡ DISC</th>
                    <th className="py-3 px-3 text-center">🧠 EPI</th>
                    <th className="py-3 px-3 text-center">🧭 HOLLAND</th>
                    <th className="py-3 px-3 text-center">💖 EQ</th>
                    <th className="py-3 px-3 text-center">🧩 MBTI</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classDistribution.map((cls: any) => (
                    <tr key={cls.classId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">{cls.className}</span>
                        <span className="text-[10px] text-slate-400">
                          {cls.campusName} • Khối {cls.grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">
                        {cls.homeroomTeacherName}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {cls.studentCount}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                          {cls.participatedCount}/{cls.studentCount} ({cls.participationRate}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                        {cls.byTest?.DISC || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-teal-700">
                        {cls.byTest?.EPI || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                        {cls.byTest?.HOLLAND || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-sky-700">
                        {cls.byTest?.LYUSIN_EQ || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                        {cls.byTest?.MBTI || 0}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassId(cls.classId)
                            setSubTab("matrix")
                          }}
                          className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg font-bold text-[11px] transition cursor-pointer"
                        >
                          Xem danh sách lớp →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {classDistribution.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu lớp học trong phạm vi chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: STUDENT 5-TEST MATRIX                                          */}
      {/* ===================================================================== */}
      {subTab === "matrix" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Ma Trận Kết Quả 5 Bộ Công Cụ SKL_PSYCH Theo Học Sinh ({studentMatrix.length} học
                sinh)
              </h3>
              <p className="text-xs text-slate-500">
                Nhấn vào mã kết quả của từng bài hoặc nút <strong>Hồ sơ 360°</strong> để xem biểu đồ
                phân tích, nhập nhận xét tư vấn và công bố cho Phụ huynh.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">STT</th>
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Lớp / Cơ sở</th>
                  <th className="py-3 px-3 text-center">Tiến độ</th>
                  <th className="py-3 px-3 text-center">⚡ DISC</th>
                  <th className="py-3 px-3 text-center">🧠 EPI</th>
                  <th className="py-3 px-3 text-center">🧭 HOLLAND</th>
                  <th className="py-3 px-3 text-center">💖 LYUSIN EQ</th>
                  <th className="py-3 px-3 text-center">🧩 MBTI</th>
                  <th className="py-3 px-3 text-right">Hồ sơ 360°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentMatrix.map((st: any, idx: number) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{st.studentName}</span>
                        {st.hasConsultationRequest && (
                          <span
                            title="Có đề nghị tư vấn 1:1"
                            className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold"
                          >
                            🙋 1:1
                          </span>
                        )}
                        {st.hasWarning && (
                          <span
                            title="Cảnh báo Lie-Score L≥5"
                            className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold"
                          >
                            ⚠️ L≥5
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Mã HS: {st.studentCode || "---"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-700 block">{st.className}</span>
                      <span className="text-[10px] text-slate-400">{st.campusName}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.completedCount > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {st.completedCount}/5 bài
                      </span>
                    </td>

                    {(["DISC", "EPI", "HOLLAND", "LYUSIN_EQ", "MBTI"] as const).map(tc => {
                      const cell = st.tests?.[tc]
                      return (
                        <td key={tc} className="py-3 px-3 text-center">
                          {cell ? (
                            <button
                              type="button"
                              onClick={() => openAssessmentById(cell.id)}
                              title={cell.label}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-mono font-black text-[11px] transition cursor-pointer"
                            >
                              {cell.code}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}

                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStudentPortfolio({
                            id: st.id,
                            studentName: st.studentName,
                            studentCode: st.studentCode,
                            className: st.className
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-teal-900 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        Hồ sơ 360°
                      </button>
                    </td>
                  </tr>
                ))}
                {studentMatrix.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      Không tìm thấy học sinh phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DETAILED ASSESSMENTS TABLE                                     */}
      {/* ===================================================================== */}
      {subTab === "assessments" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Hồ Sơ Bài Khảo Sát Chi Tiết ({assessments.length} bản ghi)
              </h3>
              <p className="text-xs text-slate-500">
                Danh sách tất cả các bài trắc nghiệm đã hoàn thành trên 5 bộ công cụ chuẩn hóa.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã tra cứu</th>
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Cơ sở / Lớp</th>
                  <th className="py-3 px-3">Bài test</th>
                  <th className="py-3 px-3">Kết quả chủ đạo</th>
                  <th className="py-3 px-3">Độ tin cậy</th>
                  <th className="py-3 px-3">Ngày làm</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assessments.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-teal-700">
                      {item.lookupCode}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block">{item.studentName}</span>
                      <span className="text-[10px] text-slate-400">
                        Mã HS: {item.studentCode || "---"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-700 block">{item.campusName || "Sky-Line"}</span>
                      <span className="text-[10px] text-slate-400">
                        Khối {item.gradeLevel} ({item.className})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                        {item.testCode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="font-bold text-slate-800 block truncate max-w-[240px]"
                        title={item.primaryResultLabel}
                      >
                        {item.primaryResultLabel}
                      </span>
                      <span className="text-[10px] font-mono text-teal-600 font-bold">
                        Mã: {item.primaryResultCode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {item.validityStatus === "WARNING" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Cần lưu ý (L≥5)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hợp lệ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleDateString("vi-VN")
                        : "---"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAssessmentDetail(item)}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-bold text-[11px] transition cursor-pointer"
                      >
                        Chi tiết & Tư vấn
                      </button>
                    </td>
                  </tr>
                ))}
                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Chưa có bài khảo sát nào hoàn thành trong bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: SINGLE ASSESSMENT REPORT & ADVISOR REVIEW                    */}
      {/* ===================================================================== */}
      {selectedAssessmentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedAssessmentDetail(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="mb-4 pr-10">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-full">
                {selectedAssessmentDetail.testName} ({selectedAssessmentDetail.testCode})
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-2">
                Học sinh: {selectedAssessmentDetail.studentName} (
                {selectedAssessmentDetail.className})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã HS: {selectedAssessmentDetail.studentCode || "---"} • Cơ sở:{" "}
                {selectedAssessmentDetail.campusName || "Sky-Line"} • Mã tra cứu:{" "}
                <strong className="font-mono text-teal-700">
                  {selectedAssessmentDetail.lookupCode}
                </strong>
              </p>
            </div>

            <SklPsychReportViewer
              assessment={selectedAssessmentDetail}
              viewerRole={role}
              onUpdated={updated => {
                setSelectedAssessmentDetail(updated)
                loadStats()
              }}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: FULL 360° STUDENT PORTFOLIO (ALL 5 TOOLS)                    */}
      {/* ===================================================================== */}
      {selectedStudentPortfolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-5xl bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Hồ Sơ Tâm Lý & Hướng Nghiệp 360° (5 Bộ Công Cụ SKL_PSYCH)
                </span>
                <h3 className="text-lg font-black text-slate-800">
                  {selectedStudentPortfolio.studentName} ({selectedStudentPortfolio.className})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentPortfolio(null)
                  loadStats()
                }}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <SklPsychCatalogHub
              studentId={selectedStudentPortfolio.id}
              studentCode={selectedStudentPortfolio.studentCode}
              academicYearId={academicYearId}
              viewerRole={role}
            />
          </div>
        </div>
      )}
    </div>
  )
}
