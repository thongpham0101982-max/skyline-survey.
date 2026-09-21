// @ts-nocheck
"use client"

import React, { useMemo } from "react"
import {
  Filter,
  Search,
  RefreshCw,
  Download,
  Layers,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  BookOpen,
  Calendar,
  Building2,
  GraduationCap
} from "lucide-react"

interface Props {
  academicYears: any[]
  campuses: any[]
  subjects: any[]
  classes: any[]
  selectedYearId: string
  setSelectedYearId: (id: string) => void
  selectedCampusId: string
  setSelectedCampusId: (id: string) => void
  selectedLevel: string
  setSelectedLevel: (lvl: string) => void
  selectedGrade: string
  setSelectedGrade: (grd: string) => void
  selectedClassId: string
  setSelectedClassId: (id: string) => void
  selectedSemester: string
  setSelectedSemester: (sem: string) => void
  selectedSubjectId: string
  setSelectedSubjectId: (id: string) => void
  mode: string
  setMode: (m: string) => void
  periodX: string
  setPeriodX: (p: string) => void
  periodY: string
  setPeriodY: (p: string) => void
  compareSubjectId: string
  setCompareSubjectId: (id: string) => void
  searchKeyword: string
  setSearchKeyword: (kw: string) => void
  loading: boolean
  onRefresh: () => void
  onExportExcel: () => void
  onNavigateToGradebook: () => void
}

export const PERIODS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)", semester: "HK1" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)", semester: "HK1" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)", semester: "HK1" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)", semester: "HK2" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)", semester: "HK2" }
]

const GRADES = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
]

export function ScatterFilterToolbar({
  academicYears,
  campuses,
  subjects,
  classes,
  selectedYearId,
  setSelectedYearId,
  selectedCampusId,
  setSelectedCampusId,
  selectedLevel,
  setSelectedLevel,
  selectedGrade,
  setSelectedGrade,
  selectedClassId,
  setSelectedClassId,
  selectedSemester,
  setSelectedSemester,
  selectedSubjectId,
  setSelectedSubjectId,
  mode,
  setMode,
  periodX,
  setPeriodX,
  periodY,
  setPeriodY,
  compareSubjectId,
  setCompareSubjectId,
  searchKeyword,
  setSearchKeyword,
  loading,
  onRefresh,
  onExportExcel,
  onNavigateToGradebook
}: Props) {
  // Lọc danh sách kỳ khảo sát theo học kỳ đã chọn
  const availablePeriods = useMemo(() => {
    if (selectedSemester === "HK1") return PERIODS.filter(p => p.semester === "HK1")
    if (selectedSemester === "HK2") return PERIODS.filter(p => p.semester === "HK2")
    return PERIODS
  }, [selectedSemester])

  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem)
    if (sem === "HK1") {
      if (!["KSĐN", "GK1", "CK1"].includes(periodY)) {
        setPeriodY("CK1")
      }
    } else if (sem === "HK2") {
      if (!["GK2", "CK2"].includes(periodY)) {
        setPeriodY("CK2")
      }
    }
  }

  const handlePeriodYChange = (pCode: string) => {
    setPeriodY(pCode)
    const found = PERIODS.find(p => p.code === pCode)
    if (found && selectedSemester !== "ALL" && found.semester !== selectedSemester) {
      setSelectedSemester(found.semester)
    }
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
      {/* Hàng 1: Tiêu đề bộ lọc, Chế độ tương quan & Nút tác vụ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#005B58] flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Bộ lọc Phân tích Phân tán (Scatter Plot)
            </span>
            <span className="text-[11px] text-slate-500">
              Định hướng GDPT 2018 • Chuẩn kép Bộ GD&ĐT & Sky-Line Benchmark
            </span>
          </div>
        </div>

        {/* Nút tác vụ */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNavigateToGradebook}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Chuyển sang màn hình Sổ điểm và Phổ điểm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Quản lý Sổ điểm</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel 4 Nhóm</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005B58] hover:bg-[#004845] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      {/* Hàng 2: Chọn Chế độ Tương quan Sư phạm (4 Correlation Modes) */}
      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-extrabold text-slate-700 px-2 flex items-center gap-1">
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#005B58]" />
          Chế độ Phân tích:
        </span>

        <button
          type="button"
          onClick={() => setMode("GROWTH")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "GROWTH"
              ? "bg-[#005B58] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <span>📈 1. Tiến độ Phát triển (Kỳ trước vs Kỳ này)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("FORMATIVE_SUMMATIVE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "FORMATIVE_SUMMATIVE"
              ? "bg-[#005B58] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <span>⚖️ 2. Quá trình vs Định kỳ (ĐGTX vs ĐGĐK)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("CROSS_SUBJECT")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "CROSS_SUBJECT"
              ? "bg-[#005B58] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <span>🔀 3. Tương quan Liên môn (Định hướng THPT)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("ADMISSION_PERFORMANCE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === "ADMISSION_PERFORMANCE"
              ? "bg-[#005B58] text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
          }`}
        >
          <span>🎯 4. Đầu vào vs Thực tế (Kiểm chứng cam kết)</span>
        </button>
      </div>

      {/* Hàng 3: Phạm vi hành chính (Năm học, Cơ sở, Cấp học, Khối, Lớp) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {/* 1. Năm học */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">Năm học:</label>
          <select
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Cơ sở (Campus) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">Cơ sở:</label>
          <select
            value={selectedCampusId}
            onChange={e => setSelectedCampusId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            <option value="ALL">-- Tất cả Cơ sở --</option>
            {campuses.map(cp => (
              <option key={cp.id} value={cp.id}>{cp.campusName || cp.campusCode}</option>
            ))}
          </select>
        </div>

        {/* 3. Cấp học */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">Cấp học:</label>
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            <option value="ALL">-- Tất cả Cấp --</option>
            <option value="TieuHoc">Tiểu học (Chuẩn 7.0đ)</option>
            <option value="THCS">THCS (Chuẩn 6.0đ)</option>
            <option value="THPT">THPT (Chuẩn 6.0đ)</option>
          </select>
        </div>

        {/* 4. Khối */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">Khối:</label>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            <option value="ALL">-- Tất cả Khối --</option>
            {GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 5. Lớp */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-1">
            Lớp ({classes.length} lớp):
          </label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-[#005B58] bg-teal-50/40 focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            <option value="ALL">🌟 Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.className}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hàng 4: Phạm vi Chuyên môn & Tương quan (Học kỳ, Học kỳ / Kỳ khảo sát, Môn học, và Tùy biến theo Mode) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
        {/* 6. Học kỳ */}
        <div>
          <label className="block text-[10px] font-bold text-teal-800 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#005B58]" />
            Học kỳ:
          </label>
          <select
            value={selectedSemester}
            onChange={e => handleSemesterChange(e.target.value)}
            className="w-full border border-teal-200 rounded-xl px-2 py-1.5 text-xs font-bold text-teal-900 bg-teal-50/30 focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            <option value="ALL">-- Tất cả Học kỳ --</option>
            <option value="HK1">🍂 Học kỳ 1 (HK1)</option>
            <option value="HK2">🌱 Học kỳ 2 (HK2)</option>
          </select>
        </div>

        {/* 7. Học kỳ / Kỳ khảo sát */}
        <div>
          <label className="block text-[10px] font-bold text-teal-800 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#005B58]" />
            {mode === "GROWTH" ? "Học kỳ / Kỳ khảo sát (Hiện tại - Trục Y):" : "Học kỳ / Kỳ khảo sát:"}
          </label>
          <select
            value={periodY}
            onChange={e => handlePeriodYChange(e.target.value)}
            className="w-full border border-teal-200 rounded-xl px-2 py-1.5 text-xs font-bold text-teal-900 bg-teal-50/40 focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            {selectedSemester === "ALL" ? (
              <>
                <optgroup label="🍂 Học kỳ 1">
                  {PERIODS.filter(p => p.semester === "HK1").map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="🌱 Học kỳ 2">
                  {PERIODS.filter(p => p.semester === "HK2").map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </optgroup>
              </>
            ) : (
              availablePeriods.map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))
            )}
          </select>
        </div>

        {/* 8. Môn học trọng tâm (Trục Y) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-slate-500" />
            {mode === "CROSS_SUBJECT" ? "Môn học trọng tâm (Trục Y):" : "Môn học (Trục Y):"}
          </label>
          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName}</option>
            ))}
          </select>
        </div>

        {/* 9. Tùy chọn chuyên sâu theo Mode: Kỳ mốc đối sánh (GROWTH) hoặc Môn đối sánh (CROSS_SUBJECT) */}
        {mode === "GROWTH" && (
          <div>
            <label className="block text-[10px] font-bold text-amber-800 mb-1 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-amber-600" />
              Kỳ mốc đối sánh (Trục X):
            </label>
            <select
              value={periodX}
              onChange={e => setPeriodX(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-2 py-1.5 text-xs font-bold text-amber-900 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {PERIODS.filter(p => p.code !== periodY).map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "CROSS_SUBJECT" && (
          <div>
            <label className="block text-[10px] font-bold text-indigo-800 mb-1 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
              Môn đối sánh (Trục X):
            </label>
            <select
              value={compareSubjectId}
              onChange={e => setCompareSubjectId(e.target.value)}
              className="w-full border border-indigo-200 rounded-xl px-2 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- Chọn môn đối sánh --</option>
              {subjects.filter(s => s.id !== selectedSubjectId).map(s => (
                <option key={s.id} value={s.id}>{s.subjectName}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "FORMATIVE_SUMMATIVE" && (
          <div className="flex flex-col justify-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1">
            <span className="text-[10px] font-bold text-slate-600">Quy tắc đối sánh:</span>
            <span className="text-[11px] font-bold text-teal-800">Trục X: ĐGTX • Trục Y: ĐGĐK</span>
          </div>
        )}

        {mode === "ADMISSION_PERFORMANCE" && (
          <div className="flex flex-col justify-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1">
            <span className="text-[10px] font-bold text-slate-600">Quy tắc đối sánh:</span>
            <span className="text-[11px] font-bold text-teal-800">Trục X: Điểm ĐGNL đầu vào • Trục Y: Khảo sát thực tế</span>
          </div>
        )}
      </div>

      {/* Hàng 5: Ô tìm nhanh */}
      <div className="relative pt-1">
        <input
          type="text"
          placeholder="Tìm nhanh theo tên học sinh, mã HS, lớp, giáo viên phụ trách, cơ sở..."
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#005B58] outline-none transition-all"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 translate-y-[1px]" />
      </div>
    </div>
  )
}
