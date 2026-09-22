"use client"

import { useState, useMemo } from "react"
import { 
  Building2, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Users, 
  CheckCircle2, 
  Filter,
  BarChart3
} from "lucide-react"

interface Props {
  benchmarkData: any[]
  evaluationPeriod: string
  subjectName: string
}

export function CampusGradeBenchmarkTab({
  benchmarkData,
  evaluationPeriod,
  subjectName
}: Props) {
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL")

  // Extract unique grades
  const grades = useMemo(() => {
    const set = new Set<string>()
    benchmarkData.forEach(item => {
      if (item.grade) set.add(item.grade)
    })
    return Array.from(set).sort()
  }, [benchmarkData])

  // Filtered benchmark rows
  const filteredData = useMemo(() => {
    if (selectedGrade === "ALL") return benchmarkData
    return benchmarkData.filter(item => item.grade === selectedGrade)
  }, [benchmarkData, selectedGrade])

  if (!benchmarkData || benchmarkData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">Không có dữ liệu đối sánh cơ sở</h3>
        <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
          Chưa tìm thấy dữ liệu điểm của các lớp cùng khối trong cơ sở cho đợt {evaluationPeriod}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter and Highlights */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" />
            Lọc theo Khối:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedGrade("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedGrade === "ALL"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả các Khối
            </button>
            {grades.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedGrade === g
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Khối {g}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-[#003B3A]">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-200"></span>
            Lớp bạn phụ trách
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            Lớp cùng cơ sở
          </span>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 text-center">Xếp hạng</th>
                <th className="py-3 px-4">Lớp học</th>
                <th className="py-3 px-3 text-center">Khối</th>
                <th className="py-3 px-3 text-center">Hệ đào tạo</th>
                <th className="py-3 px-3 text-center">Sĩ số / Đã chấm</th>
                <th className="py-3 px-3 text-center">ĐTB Môn ({subjectName})</th>
                <th className="py-3 px-3 text-center">ĐTB Khối Toàn Cơ sở</th>
                <th className="py-3 px-3 text-center">Chênh lệch vs Khối (Δ)</th>
                <th className="py-3 px-3 text-center">Tỉ lệ Đạt chuẩn SKL</th>
                <th className="py-3 px-3 text-center">Tỉ lệ Khá - Giỏi</th>
                <th className="py-3 px-3 text-center">Phụ trách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredData.map((item, idx) => {
                const isMy = item.isMyClass
                const delta = item.deltaVsCampusGradeAvg

                return (
                  <tr 
                    key={item.classId} 
                    className={`transition-colors ${
                      isMy 
                        ? "bg-teal-50/40 hover:bg-teal-50/70 font-medium" 
                        : "hover:bg-slate-50/60 text-slate-600"
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums ${
                        item.rankInGrade === 1 
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300" 
                          : item.rankInGrade === 2 
                          ? "bg-slate-200 text-slate-700" 
                          : item.rankInGrade === 3 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {item.rankInGrade}
                      </span>
                    </td>

                    {/* Class Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isMy ? "text-[#003B3A]" : "text-slate-800"}`}>
                          {item.className}
                        </span>
                        {isMy && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-2xs">
                            Lớp bạn
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {item.campusName}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-3 px-3 text-center font-medium">
                      Khối {item.grade}
                    </td>

                    {/* Education System */}
                    <td className="py-3 px-3 text-center text-[11px] text-slate-600">
                      {item.educationSystem}
                    </td>

                    {/* Student count */}
                    <td className="py-3 px-3 text-center tabular-nums">
                      <span className="font-semibold text-slate-800">{item.gradedCount}</span>
                      <span className="text-slate-400"> / {item.totalStudents}</span>
                    </td>

                    {/* Class Avg Score */}
                    <td className="py-3 px-3 text-center tabular-nums">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg font-bold text-sm ${
                        item.avgScore >= 8.0 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : item.avgScore >= 6.5 
                          ? "bg-sky-50 text-sky-700 border border-sky-200" 
                          : item.avgScore >= 5.0 
                          ? "bg-amber-50 text-amber-700 border border-amber-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {item.avgScore > 0 ? item.avgScore.toFixed(1) : "—"}
                      </span>
                    </td>

                    {/* Campus Grade Avg */}
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-slate-600 bg-slate-50/40">
                      {item.campusGradeAvg > 0 ? item.campusGradeAvg.toFixed(1) : "—"}
                    </td>

                    {/* Delta */}
                    <td className="py-3 px-3 text-center tabular-nums">
                      {delta !== undefined && delta !== null ? (
                        delta > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                            <TrendingUp className="w-3.5 h-3.5" /> +{delta.toFixed(1)}
                          </span>
                        ) : delta < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full text-xs">
                            <TrendingDown className="w-3.5 h-3.5" /> {delta.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Bằng TB khối</span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Pass benchmark % */}
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-slate-800">
                      {item.pctPassed}%
                    </td>

                    {/* Excellent/Good % */}
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-teal-700">
                      {item.pctExcellent}%
                    </td>

                    {/* Teacher status */}
                    <td className="py-3 px-3 text-center">
                      {isMy ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Bạn giảng dạy
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Đồng nghiệp</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
