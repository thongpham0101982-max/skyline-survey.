"use client"

import { useState, useMemo } from "react"
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  FileSpreadsheet, 
  UserCheck, 
  Search,
  Filter,
  CheckCircle2,
  BookOpen
} from "lucide-react"
import Link from "next/link"

interface Props {
  classItem: any
  isOpen: boolean
  onClose: () => void
  subjectName: string
}

export function StudentTrackingDrawer({
  classItem,
  isOpen,
  onClose,
  subjectName
}: Props) {
  const [filterType, setFilterType] = useState<"ALL" | "BELOW_BENCHMARK" | "POOR" | "COMMITMENT">("ALL")
  const [search, setSearch] = useState("")

  const students = classItem?.trackingStudents || []

  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      // Filter by type
      if (filterType === "BELOW_BENCHMARK" && !s.isBelowBenchmark) return false
      if (filterType === "POOR" && !s.isPoor) return false
      if (filterType === "COMMITMENT" && !s.entranceCommitment && s.commitmentsCount === 0) return false

      // Filter by search
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim()
        const matchName = (s.studentName || "").toLowerCase().includes(q)
        const matchCode = (s.studentCode || "").toLowerCase().includes(q)
        return matchName || matchCode
      }

      return true
    })
  }, [students, filterType, search])

  if (!isOpen || !classItem) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Học sinh cần theo dõi trọng tâm
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lớp <span className="font-bold text-slate-800">{classItem.className}</span> • Môn {subjectName} • Chuẩn sàn: ≥ {classItem.benchmark}đ
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterType === "ALL"
                  ? "bg-[#003B3A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setFilterType("BELOW_BENCHMARK")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterType === "BELOW_BENCHMARK"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              Dưới chuẩn sàn (&lt; {classItem.benchmark}đ)
            </button>
            <button
              onClick={() => setFilterType("POOR")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterType === "POOR"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
            >
              Dưới TB (&lt; 5.0đ)
            </button>
            <button
              onClick={() => setFilterType("COMMITMENT")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterType === "COMMITMENT"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              Có cam kết học tập
            </button>
          </div>
        </div>

        {/* Student list content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Không có học sinh nào trong nhóm phân loại này.
            </div>
          ) : (
            filteredStudents.map((st: any) => (
              <div 
                key={st.studentId}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-teal-300 bg-white transition-all shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {st.studentName}
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({st.studentCode})
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-black tabular-nums ${
                      st.score === null ? "bg-slate-100 text-slate-400" :
                      st.score >= 5.0 ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {st.score !== null ? `${st.score.toFixed(1)}đ` : "Chưa có điểm"}
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {st.isBelowBenchmark && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      Dưới chuẩn sàn ({st.score} &lt; {st.benchmark})
                    </span>
                  )}
                  {st.isPoor && (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-medium">
                      Học lực Chưa đạt (&lt; 5.0)
                    </span>
                  )}
                  {st.entranceCommitment && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                      Cam kết đầu vào: {st.entranceCommitment}
                    </span>
                  )}
                  {st.commitmentsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                      {st.commitmentsCount} cam kết cải thiện
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3">
          <Link
            href="/teacher/ho-tro-hoc-tap"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Lập kế hoạch Phụ đạo</span>
          </Link>

          <Link
            href="/teacher/so-diem-nhan-xet"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Mở Sổ điểm lớp</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
