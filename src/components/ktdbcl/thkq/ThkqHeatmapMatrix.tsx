// @ts-nocheck
"use client"

import React, { useState } from "react"
import { Flame, Info } from "lucide-react"

interface Props {
  heatmap: {
    columns: any[]
    rows: any[]
  }
  onCellClick: (cell: any) => void
}

export function ThkqHeatmapMatrix({ heatmap, onCellClick }: Props) {
  const [viewMode, setViewMode] = useState<"RATE" | "COUNT">("RATE")
  const [campusFilter, setCampusFilter] = useState("ALL")

  if (!heatmap || !heatmap.rows || heatmap.rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-sm mb-6">
        <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Chưa có đủ dữ liệu để kết xuất Bản đồ nhiệt</p>
        <p className="text-xs text-slate-500 mt-1">Vui lòng chọn Năm học hoặc Kỳ khảo sát có phát sinh điểm số</p>
      </div>
    )
  }

  // Danh sách cơ sở có trong cột
  const uniqueCampuses = Array.from(
    new Map(heatmap.columns.map(c => [c.campusId, { id: c.campusId, name: c.campusName }])).values()
  )

  // Lọc cột theo cơ sở được chọn
  const filteredColumns = heatmap.columns.filter(c => {
    if (campusFilter === "ALL") return true
    return c.campusId === campusFilter
  })

  // Hàm trả về màu sắc trực quan (Heatmap Gradient) cho ô
  const getCellColorClass = (cell: any) => {
    if (!cell || cell.total === 0) return "bg-slate-50 text-slate-400 border-slate-100"
    const rate = cell.rate

    if (rate === 0) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
    }
    if (rate > 0 && rate <= 5.0) {
      return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
    }
    if (rate > 5.0 && rate <= 15.0) {
      return "bg-orange-100/90 text-orange-900 border-orange-300 hover:bg-orange-200 font-semibold"
    }
    // > 15%: Báo động đỏ
    return "bg-red-500 text-white border-red-600 hover:bg-red-600 font-bold shadow-sm"
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-6">
      {/* Header Bản đồ nhiệt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Bản đồ nhiệt Phân tích Điểm dưới 5 (&lt; 5.0) các Môn theo Khối
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                Heatmap Matrix
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ma trận kiểm soát rủi ro học tập theo từng Cơ sở và Khối học. Nhấp vào ô bất kỳ để xem danh sách HS chi tiết.
            </p>
          </div>
        </div>

        {/* Thanh công cụ điều khiển Bản đồ nhiệt */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lọc cơ sở hiển thị */}
          <select
            value={campusFilter}
            onChange={e => setCampusFilter(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="ALL">Hiển thị Tất cả Cơ sở & Hệ thống</option>
            {uniqueCampuses.map(cp => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
              </option>
            ))}
          </select>

          {/* Nút toggle Tỷ lệ % / Số lượng */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 text-xs font-semibold">
            <button
              onClick={() => setViewMode("RATE")}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === "RATE" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tỷ lệ %
            </button>
            <button
              onClick={() => setViewMode("COUNT")}
              className={`px-3 py-1 rounded-lg transition ${
                viewMode === "COUNT" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Số học sinh
            </button>
          </div>
        </div>
      </div>

      {/* Chú giải Thang màu (Legend) */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-3 bg-slate-50/70 rounded-xl my-3 text-[11px] font-medium text-slate-600 border border-slate-100">
        <span className="font-bold text-slate-700">Thang cảnh báo:</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>0% (An toàn)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>0.1% - 5.0% (Chấp nhận)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-orange-200 border border-orange-400 inline-block" />
            <span>5.1% - 15.0% (Cảnh báo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-red-500 border border-red-600 inline-block" />
            <span className="font-bold text-red-600">&gt; 15% (Nguy cơ cao)</span>
          </div>
        </div>
      </div>

      {/* Bảng Heatmap cuộn ngang */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2 max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-20 backdrop-blur-xs">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-100 z-30 border-b border-r border-slate-200 min-w-[180px]">
                Môn học
              </th>
              {filteredColumns.map(col => {
                const isSystem = col.campusId === "SYSTEM"
                return (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 font-bold text-center border-b border-r border-slate-200 whitespace-nowrap min-w-[110px] ${
                      isSystem ? "bg-indigo-50 text-indigo-900 border-indigo-200" : "text-slate-700"
                    }`}
                  >
                    <div className="text-[10px] uppercase opacity-75 font-semibold">{col.campusName}</div>
                    <div className="text-xs font-extrabold">{col.gradeLabel}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {heatmap.rows.map(row => (
              <tr key={row.subjectId} className="hover:bg-slate-50/50 transition">
                {/* Tên môn học cố định cột trái */}
                <td className="py-2.5 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs whitespace-nowrap">
                  {row.subjectName}
                </td>

                {/* Các ô số liệu */}
                {filteredColumns.map(col => {
                  const cell = row.cells[col.key]
                  const colorClass = getCellColorClass(cell)
                  const hasData = cell && cell.total > 0

                  return (
                    <td
                      key={col.key}
                      onClick={() => hasData && onCellClick && onCellClick(cell)}
                      className={`p-1.5 text-center border-r border-slate-100 transition ${
                        hasData ? "cursor-pointer active:scale-95" : ""
                      }`}
                    >
                      <div
                        className={`rounded-lg py-2 px-2 border transition ${colorClass}`}
                        title={
                          hasData
                            ? `${row.subjectName} (${col.label}): ${cell.below5}/${cell.total} HS dưới 5 (${cell.rate}%). Nhấp để xem danh sách.`
                            : "Không có dữ liệu"
                        }
                      >
                        {hasData ? (
                          viewMode === "RATE" ? (
                            <div>
                              <div className="text-xs font-bold leading-tight">{cell.rate}%</div>
                              <div className="text-[9px] opacity-80 leading-tight">({cell.below5}/{cell.total} HS)</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-bold leading-tight">{cell.below5} HS</div>
                              <div className="text-[9px] opacity-80 leading-tight">({cell.rate}%)</div>
                            </div>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-300 font-medium">—</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
