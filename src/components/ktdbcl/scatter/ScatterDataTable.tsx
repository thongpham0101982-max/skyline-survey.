// @ts-nocheck
"use client"

import React, { useState, useMemo } from "react"
import {
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  AlertTriangle,
  ArrowUpDown
} from "lucide-react"

interface Props {
  points: any[]
  activeQuadrant: string
  searchKeyword: string
  onSelectStudent: (student: any) => void
  onActionClick: (student: any, actionType: string) => void
}

export function ScatterDataTable({
  points = [],
  activeQuadrant = "ALL",
  searchKeyword = "",
  onSelectStudent,
  onActionClick
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const filtered = useMemo(() => {
    let list = points
    if (activeQuadrant !== "ALL") {
      list = list.filter(p => p.quadrant === activeQuadrant)
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      list = list.filter(p => {
        return (
          (p.studentName || "").toLowerCase().includes(kw) ||
          (p.studentCode || "").toLowerCase().includes(kw) ||
          (p.className || "").toLowerCase().includes(kw) ||
          (p.teacherName || "").toLowerCase().includes(kw) ||
          (p.campusName || "").toLowerCase().includes(kw)
        )
      })
    }
    return list
  }, [points, activeQuadrant, searchKeyword])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const displayedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            Danh sách Học sinh theo Phân nhóm Tọa độ
          </span>
          <span className="text-[11px] font-extrabold text-[#005B58] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            {filtered.length} học sinh
          </span>
        </div>

        {/* Phân trang */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-bold"
            >
              Trước
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-bold"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <th className="py-3 px-2 text-center w-8">STT</th>
              <th className="py-3 px-3">Mã HS</th>
              <th className="py-3 px-3">Họ và tên học sinh</th>
              <th className="py-3 px-3">Lớp & Cơ sở</th>
              <th className="py-3 px-3">Giáo viên phụ trách</th>
              <th className="py-3 px-2 text-center">Trục X</th>
              <th className="py-3 px-2 text-center">Trục Y</th>
              <th className="py-3 px-2 text-center">Độ lệch (Δ)</th>
              <th className="py-3 px-3 text-center">Phân nhóm Sky-Line</th>
              <th className="py-3 px-3">Xếp loại GDPT 2018</th>
              <th className="py-3 px-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                  Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              displayedRows.map((st, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1
                return (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2 text-center text-slate-400">{globalIndex}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{st.studentCode}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-slate-900">{st.studentName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {st.hasAdmissionCommitment && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Cam kết ĐV
                          </span>
                        )}
                        {st.hasLearningCommitment && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            Cam kết HT
                          </span>
                        )}
                        {st.isOutlier && (
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Ngoại lai
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-extrabold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 whitespace-nowrap">
                        {st.className}
                      </span>
                      {st.campusName && (
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{st.campusName}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{st.teacherName}</td>

                    {/* Điểm X */}
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700 bg-slate-50/40">
                      {st.x}đ
                    </td>

                    {/* Điểm Y */}
                    <td className="py-2.5 px-2 text-center font-black text-[#005B58] bg-teal-50/30">
                      {st.y}đ
                    </td>

                    {/* Delta */}
                    <td className="py-2.5 px-2 text-center">
                      <span className={`font-black text-xs px-1.5 py-0.5 rounded ${
                        st.delta > 0
                          ? "text-emerald-700 bg-emerald-50"
                          : st.delta < 0
                          ? "text-rose-700 bg-rose-50"
                          : "text-slate-500"
                      }`}>
                        {st.delta > 0 ? `+${st.delta}` : st.delta}
                      </span>
                    </td>

                    {/* Phân nhóm Quadrant */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                        st.quadrant === "Q1"
                          ? "bg-emerald-100 text-emerald-800"
                          : st.quadrant === "Q2"
                          ? "bg-sky-100 text-sky-800"
                          : st.quadrant === "Q3"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {st.quadrant === "Q1" ? "🌟 Honor" : st.quadrant === "Q2" ? "🚀 Rising" : st.quadrant === "Q3" ? "🚨 Priority" : "⚠️ Attention"}
                      </span>
                    </td>

                    {/* Xếp loại GDPT 2018 */}
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.classification?.color || "text-slate-500"}`}>
                        {st.classification?.label || "-"}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectStudent(st)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                          title="Xem hồ sơ học tập 360"
                        >
                          Hồ sơ 360
                        </button>
                        <button
                          onClick={() => onActionClick(st, "SUPPORT")}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-200"
                          title="Tạo kế hoạch phụ đạo"
                        >
                          Phụ đạo
                        </button>
                      </div>
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
