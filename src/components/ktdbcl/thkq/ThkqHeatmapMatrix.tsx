// @ts-nocheck
"use client"

import React, { useState } from "react"
import { Info } from "lucide-react"

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
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center shadow-xs">
        <Info className="h-7 w-7 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">
          Chưa có đủ dữ liệu để kết xuất bản đồ nhiệt
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Vui lòng chọn năm học hoặc kỳ kiểm tra có phát sinh điểm số.
        </p>
      </div>
    )
  }

  const uniqueCampuses = Array.from(
    new Map(
      heatmap.columns.map((c) => [c.campusId, { id: c.campusId, name: c.campusName }])
    ).values()
  )

  const filteredColumns = heatmap.columns.filter((c) => {
    if (campusFilter === "ALL") return true
    return c.campusId === campusFilter
  })

  const getCellColorClass = (cell: any) => {
    if (!cell || cell.total === 0) return "bg-slate-50 text-slate-400 border-slate-100"
    const rate = cell.rate

    if (rate === 0) {
      return "bg-emerald-50 text-[#059669] border-emerald-200/70 hover:bg-emerald-100"
    }
    if (rate > 0 && rate <= 5.0) {
      return "bg-amber-50 text-[#D97706] border-amber-200 hover:bg-amber-100"
    }
    if (rate > 5.0 && rate <= 15.0) {
      return "bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200 font-semibold"
    }
    return "bg-[#E11D48] text-white border-rose-700 hover:bg-rose-700 font-bold shadow-2xs"
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Ma trận phân phối điểm dưới chuẩn (&lt; 5.0) các môn theo khối &amp; cơ sở
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhấn vào ô bất kỳ để xem danh sách học sinh cấu thành chỉ tiêu theo từng môn và khối học.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="text-xs font-medium rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-slate-800 focus:outline-none focus:border-[#008B85]"
          >
            <option value="ALL">Tất cả cơ sở &amp; toàn hệ thống</option>
            {uniqueCampuses.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl bg-[#F8FAFC] p-0.5 border border-[#E2E8F0] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("RATE")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === "RATE"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tỷ lệ %
            </button>
            <button
              type="button"
              onClick={() => setViewMode("COUNT")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === "COUNT"
                  ? "bg-[#003B3A] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Số học sinh
            </button>
          </div>
        </div>
      </div>

      {/* Thang chú giải */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3 bg-[#F8FAFC] rounded-xl my-3 text-xs text-slate-600 border border-[#E2E8F0]">
        <span className="font-semibold text-slate-800">Ngưỡng cảnh báo tỷ lệ &lt; 5.0:</span>
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>0% (Đạt 100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" />
            <span>0.1% – 5.0% (Theo dõi)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300 inline-block" />
            <span>5.1% – 15.0% (Cần phụ đạo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#E11D48] inline-block" />
            <span className="font-semibold text-[#E11D48]">&gt; 15% (Can thiệp khẩn)</span>
          </div>
        </div>
      </div>

      {/* Bảng Heatmap chuẩn Sky-Line Academic Ledger */}
      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] shadow-xs max-h-[540px]">
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead className="bg-[#003B3A] sticky top-0 z-20 text-white border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-3 px-4 sticky left-0 bg-[#003B3A] z-30 border-r border-teal-800/80 min-w-[180px] text-white">
                Môn học
              </th>
              {filteredColumns.map((col) => {
                const isSystem = col.campusId === "SYSTEM"
                return (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 text-center border-r border-teal-800/80 min-w-[104px] ${
                      isSystem ? "bg-[#002B2A] text-[#5EEAD4]" : "text-teal-100"
                    }`}
                  >
                    <div className="text-[11px] font-medium opacity-90">{col.campusName}</div>
                    <div className="text-xs font-bold text-white mt-0.5">{col.gradeLabel}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] bg-white tabular-nums">
            {heatmap.rows.map((row) => (
              <tr key={row.subjectId} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                <td className="py-2.5 px-4 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-[#E2E8F0] whitespace-nowrap">
                  {row.subjectName}
                </td>

                {filteredColumns.map((col) => {
                  const cell = row.cells[col.key]
                  const colorClass = getCellColorClass(cell)
                  const hasData = cell && cell.total > 0

                  return (
                    <td
                      key={col.key}
                      onClick={() => hasData && onCellClick && onCellClick(cell)}
                      className={`p-1.5 text-center border-r border-[#F1F5F9] transition ${
                        hasData ? "cursor-pointer" : ""
                      }`}
                    >
                      <div
                        className={`rounded-lg py-1.5 px-2 border transition ${colorClass}`}
                        title={
                          hasData
                            ? `${row.subjectName} (${col.label}): ${cell.below5}/${cell.total} học sinh dưới 5.0 (${cell.rate}%). Nhấn để xem danh sách.`
                            : "Không có dữ liệu"
                        }
                      >
                        {hasData ? (
                          viewMode === "RATE" ? (
                            <div>
                              <div className="text-xs font-bold leading-tight">{cell.rate}%</div>
                              <div className="text-[10px] opacity-85 leading-tight mt-0.5">
                                {cell.below5}/{cell.total} HS
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-bold leading-tight">
                                {cell.below5} HS
                              </div>
                              <div className="text-[10px] opacity-85 leading-tight mt-0.5">
                                ({cell.rate}%)
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
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
