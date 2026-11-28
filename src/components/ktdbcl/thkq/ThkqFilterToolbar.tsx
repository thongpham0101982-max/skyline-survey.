// @ts-nocheck
"use client"

import React, { useMemo } from "react"
import {
  RefreshCw,
  Download,
  Search,
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
  availableSubjects?: any[]
  loading: boolean
  onRefresh: () => void
  onExportExcel: () => void
  hideScoreRangeFilter?: boolean
}

const EVALUATION_PERIODS = [
  { value: "ALL", label: "[Tất cả kỳ kiểm tra]" },
  { value: "GK1", label: "Giữa kỳ 1 (GK1)" },
  { value: "CK1", label: "Cuối kỳ 1 (CK1)" },
  { value: "HK1", label: "Học kỳ 1 (HK1)" },
  { value: "GK2", label: "Giữa kỳ 2 (GK2)" },
  { value: "CK2", label: "Cuối kỳ 2 (CK2)" },
  { value: "HK2", label: "Học kỳ 2 (HK2)" },
  { value: "KSĐN", label: "Khảo sát đầu năm (KSĐN)" },
  { value: "CN", label: "Cả năm (CN)" },
]

const LEVELS = [
  { value: "ALL", label: "[Tất cả cấp học]" },
  { value: "TIEU_HOC", label: "Tiểu học (Khối 1–5)" },
  { value: "THCS", label: "THCS (Khối 6–9)" },
  { value: "THPT", label: "THPT (Khối 10–12)" },
]

const SCORE_RANGES = [
  { value: "ALL", label: "[Tất cả ngưỡng điểm]" },
  { value: "UNDER_5", label: "Dưới 5.0 (Dưới chuẩn Bộ)" },
  { value: "UNDER_BENCHMARK", label: "Dưới chuẩn nội bộ Sky-Line" },
  { value: "8_TO_10", label: "Từ 8.0 đến 10.0 (Khá – Giỏi)" },
  { value: "PERFECT_10", label: "Điểm 10 tuyệt đối" },
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
  availableSubjects,
  loading,
  onRefresh,
  onExportExcel,
  hideScoreRangeFilter = false,
}: Props) {
  const displaySubjects =
    availableSubjects && availableSubjects.length > 0 ? availableSubjects : subjects

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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Năm học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Năm học
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || y.yearCode || "Năm học"}{" "}
                {y.status === "ACTIVE" ? "(Mặc định SSM)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Kỳ kiểm tra */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kỳ kiểm tra / Học kỳ
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            {EVALUATION_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cấp học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cấp học
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value)
              setSelectedGrade("ALL")
            }}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>

        {/* Khối học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Khối học
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            <option value="ALL">[Tất cả khối]</option>
            {availableGrades.map((g) => (
              <option key={g} value={g}>
                {formatGradeDisplay(g)}
              </option>
            ))}
          </select>
        </div>

        {/* Môn học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Môn học</span>
            <span className="text-[11px] font-medium text-[#00736E] tabular-nums">
              {displaySubjects.length} môn
            </span>
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            <option value="ALL">
              [Tất cả môn theo kỳ ({displaySubjects.length} môn)]
            </option>
            {displaySubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subjectName}
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
            value={selectedCampusId}
            onChange={(e) => setSelectedCampusId(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
          >
            <option value="ALL">[Toàn hệ thống Sky-Line]</option>
            {campuses.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.campusName}
              </option>
            ))}
          </select>
        </div>

        {/* Khoảng điểm hoặc Tìm kiếm */}
        {!hideScoreRangeFilter && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngưỡng điểm lọc nhanh
            </label>
            <select
              value={selectedScoreRange}
              onChange={(e) => setSelectedScoreRange(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-slate-900 focus:outline-none focus:border-[#008B85]"
            >
              {SCORE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tìm kiếm & Hành động */}
        <div className={hideScoreRangeFilter ? "lg:col-span-2" : ""}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tìm theo tên / mã học sinh / lớp
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Nhập tên, mã HS hoặc lớp..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-slate-900 focus:outline-none focus:border-[#008B85]"
              />
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#003B3A] hover:bg-[#004E4C] text-white transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Xem
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#059669] hover:bg-emerald-700 text-white transition cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
