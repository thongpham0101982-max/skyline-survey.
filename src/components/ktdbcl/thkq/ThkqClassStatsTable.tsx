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
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Building2
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Bảng Thống kê ĐTB Môn Lớp, ĐTB Khối & Độ Lệch Chuẩn
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                Class Matrix & Standard Deviation
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đối sánh ĐTB môn của từng Lớp so với Cơ sở, Khối và kiểm tra Độ lệch chuẩn (σ) mức độ đồng đều
            </p>
          </div>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm tên lớp, GV, cơ sở..."
            className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4 max-h-[550px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-20 backdrop-blur-xs">
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
                className="py-2.5 px-3 font-bold text-center text-sky-800 bg-sky-50/70 cursor-pointer hover:bg-sky-100"
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
                className="py-2.5 px-3 font-bold text-center text-purple-800 bg-purple-50/70 cursor-pointer hover:bg-purple-100"
                title="Độ lệch chuẩn mẫu (Standard Deviation) đo lường độ phân tán năng lực học sinh trong lớp"
              >
                <div className="flex items-center justify-center gap-1">
                  Độ lệch chuẩn (σ) <ArrowUpDown className="h-3 w-3" />
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
                className="py-2.5 px-3 font-bold text-center text-red-700 bg-red-50/70 cursor-pointer hover:bg-red-100"
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
                className="py-2.5 px-3 font-bold text-center text-violet-700 bg-violet-50/70 cursor-pointer hover:bg-violet-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Điểm 10 <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-400">
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
                    <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                      {row.subjectName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {row.homeroomTeacher || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {row.studentCount}
                    </td>

                    {/* ĐTB môn Lớp */}
                    <td className="py-2.5 px-3 text-center font-black text-sky-700 bg-sky-50/30">
                      {row.avgScore}
                    </td>

                    {/* ĐTB môn Khối */}
                    <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">
                      {row.gradeAvgScore}
                    </td>

                    {/* Độ lệch chuẩn (σ) */}
                    <td className="py-2.5 px-3 text-center font-bold text-purple-700 bg-purple-50/30">
                      {row.stdDev}
                    </td>

                    {/* Lệch Cơ sở */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isPositiveCampus ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isPositiveCampus ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositiveCampus ? `+${row.deltaCampus}` : row.deltaCampus}
                      </span>
                    </td>

                    {/* Lệch Khối */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isPositiveGrade ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isPositiveGrade ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositiveGrade ? `+${row.deltaGrade}` : row.deltaGrade}
                      </span>
                    </td>

                    {/* Số HS < 5 */}
                    <td className="py-2.5 px-3 text-center font-bold text-red-600 bg-red-50/30">
                      {row.below5Count > 0 ? (
                        <span>
                          {row.below5Count}{" "}
                          <span className="text-[10px] opacity-70 font-normal">({row.below5Rate}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Số HS < Chuẩn Sky-Line */}
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/30">
                      {row.belowSkylineCount > 0 ? (
                        <span>
                          {row.belowSkylineCount}{" "}
                          <span className="text-[10px] opacity-70 font-normal">({row.belowSkylineRate}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Điểm 10 */}
                    <td className="py-2.5 px-3 text-center font-extrabold text-violet-700 bg-violet-50/30">
                      {row.perfect10Count > 0 ? row.perfect10Count : <span className="text-slate-300 font-normal">0</span>}
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
