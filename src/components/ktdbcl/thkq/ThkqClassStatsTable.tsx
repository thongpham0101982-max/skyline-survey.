// @ts-nocheck
"use client"

import React, { useState, useMemo } from "react"
import {
  Table,
  Layers,
  ArrowUpDown,
  Search,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Building2,
  Info
} from "lucide-react"

interface Props {
  classStats: any[]
  onSelectClass?: (classInfo: any) => void
}

export function ThkqClassStatsTable({ classStats, onSelectClass }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("avgScore")
  const [sortAsc, setSortAsc] = useState(false)

  // Lọc theo tìm kiếm
  const filteredData = useMemo(() => {
    if (!classStats) return []
    return classStats.filter(c => {
      const kw = searchTerm.toLowerCase().trim()
      if (!kw) return true
      return (
        c.className.toLowerCase().includes(kw) ||
        c.classCode.toLowerCase().includes(kw) ||
        c.campusName.toLowerCase().includes(kw) ||
        c.subjectName.toLowerCase().includes(kw) ||
        c.homeroomTeacher.toLowerCase().includes(kw)
      )
    })
  }, [classStats, searchTerm])

  // Sắp xếp
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortAsc ? valA - valB : valB - valA
    })
  }, [filteredData, sortField, sortAsc])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 mb-6 border-l-4 border-l-[#003B3A]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#003B3A] flex items-center justify-center text-white shadow-md shadow-[#003B3A]/20">
            <Layers className="h-5 w-5 text-[#00A19A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Bảng Thống kê ĐTB Môn Lớp, ĐTB Khối & Độ Lệch Chuẩn
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00736E] border border-teal-200">
                Phân tích Phổ điểm & Độ Đồng đều (σ)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đối sánh ĐTB môn của từng Lớp so với Cơ sở, Khối và kiểm tra Độ lệch chuẩn (σ) mức độ đồng đều theo chuẩn Data Science
            </p>
          </div>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm tên lớp, GV, cơ sở, môn học..."
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A]"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4 max-h-[550px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/95 sticky top-0 z-20 backdrop-blur-xs">
            <tr className="divide-x divide-slate-200">
              <th className="py-2.5 px-3 font-bold text-slate-700">Lớp</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Khối</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Cơ sở</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">Môn học</th>
              <th className="py-2.5 px-3 font-bold text-slate-700">GVCN</th>
              <th
                onClick={() => handleSort("studentCount")}
                className="py-2.5 px-3 font-bold text-center text-slate-700 cursor-pointer hover:bg-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  Sĩ số <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("avgScore")}
                className="py-2.5 px-3 font-bold text-center text-slate-800 bg-slate-200/50 cursor-pointer hover:bg-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  ĐTB Lớp (μ) <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("gradeAvgScore")}
                className="py-2.5 px-3 font-bold text-center text-slate-700 cursor-pointer hover:bg-slate-200"
              >
                <div className="flex items-center justify-center gap-1">
                  ĐTB Khối <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("stdDev")}
                className="py-2.5 px-3 font-bold text-center text-[#003B3A] bg-teal-50/50 cursor-pointer hover:bg-teal-100/60"
                title="Độ lệch chuẩn mẫu (σ) đo lường độ phân tán năng lực học sinh trong lớp"
              >
                <div className="flex items-center justify-center gap-1">
                  Độ lệch chuẩn (σ) & Phân hóa <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("deltaCampus")}
                className="py-2.5 px-3 font-bold text-center text-slate-700 cursor-pointer hover:bg-slate-200"
                title="Độ lệch giữa ĐTB môn của Lớp so với ĐTB môn Cơ sở"
              >
                <div className="flex items-center justify-center gap-1">
                  Lệch Cơ sở (Δ) <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("deltaGrade")}
                className="py-2.5 px-3 font-bold text-center text-slate-700 cursor-pointer hover:bg-slate-200"
                title="Độ lệch giữa ĐTB môn của Lớp so với ĐTB môn Khối"
              >
                <div className="flex items-center justify-center gap-1">
                  Lệch Khối (Δ) <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("below5Count")}
                className="py-2.5 px-3 font-bold text-center text-rose-700 bg-rose-50/70 cursor-pointer hover:bg-rose-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Dưới 5.0 <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("belowSkylineCount")}
                className="py-2.5 px-3 font-bold text-center text-amber-700 bg-amber-50/70 cursor-pointer hover:bg-amber-100"
              >
                <div className="flex items-center justify-center gap-1">
                  &lt; Chuẩn SL <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("perfect10Count")}
                className="py-2.5 px-3 font-bold text-center text-emerald-700 bg-emerald-50/70 cursor-pointer hover:bg-emerald-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Điểm 10 <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-bold text-center text-slate-700">
                Đánh giá & Khuyến nghị Sư phạm
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400">
                  Không tìm thấy lớp học nào phù hợp điều kiện lọc
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const isPositiveCampus = row.deltaCampus >= 0
                const isPositiveGrade = row.deltaGrade >= 0

                return (
                  <tr
                    key={`${row.classId}_${row.subjectId}_${idx}`}
                    className="hover:bg-slate-50 transition divide-x divide-slate-100"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                      {row.className}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                      {row.gradeLabel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {row.campusName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-semibold whitespace-nowrap">
                      {row.subjectName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {row.homeroomTeacher || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700 tabular-nums">
                      {row.studentCount}
                    </td>

                    {/* ĐTB môn Lớp */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-100/60 tabular-nums text-xs">
                      {row.avgScore}
                    </td>

                    {/* ĐTB môn Khối */}
                    <td className="py-2.5 px-3 text-center text-slate-600 font-medium tabular-nums">
                      {row.gradeAvgScore}
                    </td>

                    {/* Độ lệch chuẩn (σ) */}
                    <td className="py-2.5 px-3 text-center bg-teal-50/20 whitespace-nowrap">
                      <div className="font-bold tabular-nums text-[#003B3A] text-xs">
                        {row.stdDev}
                      </div>
                      {row.studentCount <= 1 ? (
                        <span className="inline-block text-[10px] text-slate-400 font-normal">Mẫu n=1</span>
                      ) : row.studentCount <= 2 ? (
                        <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 font-medium" title="Cỡ mẫu n ≤ 2 không đủ độ tin cậy thống kê">
                          Mẫu n=2 (Tham khảo)
                        </span>
                      ) : row.stdDev < 0.8 ? (
                        <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200 font-medium">
                          Đồng đều cao
                        </span>
                      ) : row.stdDev <= 1.5 ? (
                        <span className="inline-block text-[10px] text-[#00736E] bg-teal-50 px-1 rounded border border-teal-200 font-medium">
                          Phân hóa vừa
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] text-rose-700 bg-rose-50 px-1 rounded border border-rose-200 font-semibold">
                          Phân hóa mạnh
                        </span>
                      )}
                    </td>

                    {/* Lệch Cơ sở */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.isSingleClassInCampus && row.deltaCampus === 0 ? (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium tabular-nums" title="Lớp duy nhất của cơ sở">
                          = Cơ sở
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] tabular-nums ${
                            isPositiveCampus ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isPositiveCampus ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositiveCampus ? `+${row.deltaCampus}` : row.deltaCampus}
                        </span>
                      )}
                    </td>

                    {/* Lệch Khối */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.isSingleClassInGrade && row.deltaGrade === 0 ? (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium tabular-nums" title="Lớp duy nhất của khối tại cơ sở">
                          = Khối
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] tabular-nums ${
                            isPositiveGrade ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isPositiveGrade ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositiveGrade ? `+${row.deltaGrade}` : row.deltaGrade}
                        </span>
                      )}
                    </td>

                    {/* Số HS < 5 */}
                    <td className="py-2.5 px-3 text-center font-bold text-rose-700 bg-rose-50/20 tabular-nums">
                      {row.below5Count > 0 ? (
                        <span>
                          {row.below5Count}{" "}
                          <span className="text-[10px] opacity-75 font-normal">({row.below5Rate}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Số HS < Chuẩn Sky-Line */}
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/20 tabular-nums">
                      {row.belowSkylineCount > 0 ? (
                        <span>
                          {row.belowSkylineCount}{" "}
                          <span className="text-[10px] opacity-75 font-normal">({row.belowSkylineRate}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Điểm 10 */}
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/20 tabular-nums">
                      {row.perfect10Count > 0 ? row.perfect10Count : <span className="text-slate-300 font-normal">0</span>}
                    </td>

                    {/* Đánh giá & Khuyến nghị Sư phạm */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {row.pedagogicalPriority === "URGENT" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                          {row.pedagogicalNote}
                        </span>
                      ) : row.pedagogicalPriority === "WARNING" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                          {row.pedagogicalNote}
                        </span>
                      ) : row.pedagogicalPriority === "GOOD" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          {row.pedagogicalNote}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-600 bg-slate-100">
                          {row.pedagogicalNote || "Theo dõi định kỳ"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
