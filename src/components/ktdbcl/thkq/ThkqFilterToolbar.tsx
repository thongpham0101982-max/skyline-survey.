// @ts-nocheck
"use client"

import React, { useMemo } from "react"
import {
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  Building2,
  Filter,
  RefreshCw,
  Download,
  Search,
  SlidersHorizontal
} from "lucide-react"

interface Props {
  academicYears: any[]
  selectedYearId: string
  setSelectedYearId: (id: string) => void

  selectedPeriod: string
  setSelectedPeriod: (p: string) => void

  selectedLevel: string
  setSelectedLevel: (lvl: string) => void

  selectedGrade: string
  setSelectedGrade: (g: string) => void

  selectedSubjectId: string
  setSelectedSubjectId: (subId: string) => void

  selectedCampusId: string
  setSelectedCampusId: (cid: string) => void

  selectedScoreRange: string
  setSelectedScoreRange: (r: string) => void

  searchKeyword: string
  setSearchKeyword: (kw: string) => void

  campuses: any[]
  subjects: any[]
  loading: boolean
  onRefresh: () => void
  onExportExcel: () => void
}

const EVALUATION_PERIODS = [
  { value: "ALL", label: "Tất cả kỳ khảo sát" },
  { value: "KSĐN", label: "Khảo sát đầu năm (KSĐN)" },
  { value: "GK1", label: "Giữa kỳ 1 (GK1)" },
  { value: "CK1", label: "Cuối kỳ 1 (CK1)" },
  { value: "HK1", label: "Học kỳ 1 (HK1)" },
  { value: "GK2", label: "Giữa kỳ 2 (GK2)" },
  { value: "CK2", label: "Cuối kỳ 2 (CK2)" },
  { value: "HK2", label: "Học kỳ 2 (HK2)" },
  { value: "CN", label: "Cả năm (CN)" }
]

const LEVELS = [
  { value: "ALL", label: "Tất cả Bậc học" },
  { value: "TIEU_HOC", label: "Tiểu học (K1 - K5)" },
  { value: "THCS", label: "THCS (K6 - K9)" },
  { value: "THPT", label: "THPT (K10 - K12)" }
]

const SCORE_RANGES = [
  { value: "ALL", label: "Tất cả khoảng điểm" },
  { value: "UNDER_5", label: "Dưới 5.0 (Dưới trung bình)" },
  { value: "UNDER_BENCHMARK", label: "Dưới điểm chuẩn Sky-Line" },
  { value: "8_TO_10", label: "Từ 8.0 đến 10.0 (Khá - Giỏi)" },
  { value: "PERFECT_10", label: "Điểm 10 tuyệt đối" }
]

export function ThkqFilterToolbar({
  academicYears,
  selectedYearId,
  setSelectedYearId,
  selectedPeriod,
  setSelectedPeriod,
  selectedLevel,
  setSelectedLevel,
  selectedGrade,
  setSelectedGrade,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedCampusId,
  setSelectedCampusId,
  selectedScoreRange,
  setSelectedScoreRange,
  searchKeyword,
  setSearchKeyword,
  campuses,
  subjects,
  loading,
  onRefresh,
  onExportExcel
}: Props) {
  // Lọc danh sách khối dựa trên Bậc học đã chọn
  const availableGrades = useMemo(() => {
    if (selectedLevel === "TIEU_HOC") return ["K1", "K2", "K3", "K4", "K5"]
    if (selectedLevel === "THCS") return ["K6", "K7", "K8", "K9"]
    if (selectedLevel === "THPT") return ["K10", "K11", "K12"]
    return ["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10", "K11", "K12"]
  }, [selectedLevel])

  const formatGradeDisplay = (g: string) => {
    const num = g.replace(/[^0-9]/g, "")
    return `Khối ${num}`
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              Bộ lọc Phân tích Tổng hợp Kết quả (THKQ)
            </h2>
            <p className="text-xs text-slate-500">
              Đối chuẩn chất lượng các môn học, theo dõi học sinh cam kết & tâm lý học đường
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50"
            title="Tải lại số liệu"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
            Làm mới
          </button>

          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition active:scale-95"
            title="Xuất báo cáo Excel đầy đủ"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Grid các bộ lọc chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
        {/* Năm học */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-sky-500" />
            Năm học
          </label>
          <select
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>
                {y.name || y.yearCode || "Năm học"} {y.status === "ACTIVE" ? "★ (Hiện hành)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Kỳ khảo sát / Học kỳ */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            Kỳ khảo sát / Học kỳ
          </label>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            {EVALUATION_PERIODS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bậc học */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
            Bậc học
          </label>
          <select
            value={selectedLevel}
            onChange={e => {
              setSelectedLevel(e.target.value)
              setSelectedGrade("ALL") // Reset khối khi đổi bậc
            }}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            {LEVELS.map(lvl => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>

        {/* Khối */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-emerald-500" />
            Khối học
          </label>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="ALL">Tất cả Khối</option>
            {availableGrades.map(g => (
              <option key={g} value={g}>
                {formatGradeDisplay(g)}
              </option>
            ))}
          </select>
        </div>

        {/* Môn học */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-amber-500" />
            Môn học
          </label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="ALL">Tất cả các môn học</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                {s.subjectName || s.subjectCode}
              </option>
            ))}
          </select>
        </div>

        {/* Cơ sở */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-rose-500" />
            Cơ sở / Hệ thống
          </label>
          <select
            value={selectedCampusId}
            onChange={e => setSelectedCampusId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            <option value="ALL">Toàn Hệ Thống Sky-Line</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>
                {c.campusName || c.campusCode}
              </option>
            ))}
          </select>
        </div>

        {/* Khoảng điểm */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-500" />
            Khoảng điểm
          </label>
          <select
            value={selectedScoreRange}
            onChange={e => setSelectedScoreRange(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          >
            {SCORE_RANGES.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tìm kiếm học sinh */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            Tìm theo Tên / Mã HS / Lớp
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Nhập tên học sinh, mã HS..."
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
