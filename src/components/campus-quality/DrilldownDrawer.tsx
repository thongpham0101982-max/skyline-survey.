"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { Download, ExternalLink, Loader2, Search, X } from "lucide-react"
import { DrilldownPayload } from "@/lib/campus-quality/types"

interface DrilldownDrawerProps {
  open: boolean
  loading: boolean
  payload: DrilldownPayload | null
  error: string | null
  canExportExcel: boolean
  onClose: () => void
  onExportExcel: () => void
}

export function DrilldownDrawer({
  open,
  loading,
  payload,
  error,
  canExportExcel,
  onClose,
  onExportExcel,
}: DrilldownDrawerProps) {
  const [query, setQuery] = useState("")

  const filteredRecords = useMemo(() => {
    if (!payload) return []
    const q = query.trim().toLowerCase()
    if (!q) return payload.records
    return payload.records.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.subLabel.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q)
    )
  }, [payload, query])

  if (!open) return null

  const toneClass = (tone: "emerald" | "amber" | "rose" | "slate") => {
    if (tone === "emerald") return "bg-emerald-50 text-emerald-700 border-emerald-200"
    if (tone === "amber") return "bg-amber-50 text-amber-700 border-amber-200"
    if (tone === "rose") return "bg-rose-50 text-rose-700 border-rose-200"
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-4xl bg-[#F8FAFC] h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0] px-6 py-4 border-l-4 border-l-[#003B3A] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#003B3A]">
              {payload?.title || "Danh sách hồ sơ chi tiết"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
              {payload?.subtitle || "Đang tải dữ liệu theo bộ lọc hiện hành..."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canExportExcel && payload && payload.records.length > 0 && (
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003B3A] text-white text-xs font-medium hover:bg-[#005250] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất Excel danh sách
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-600 hover:bg-slate-100"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search strip */}
        <div className="px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, mã hồ sơ, lớp hoặc người phụ trách..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#00A19A]"
            />
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Hiển thị {filteredRecords.length} / {payload?.totalCount ?? 0} hồ sơ
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#00A19A]" />
              <span className="text-xs">Đang truy vấn hồ sơ chi tiết...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              {error}
            </div>
          ) : !payload || filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center text-xs text-slate-500">
              Không có hồ sơ nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">
                        {payload.columns.nameLabel}
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                        {payload.columns.subLabel}
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                        {payload.columns.metricLabel}
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                        {payload.columns.statusLabel}
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                        {payload.columns.ownerLabel}
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                        {payload.columns.milestoneLabel}
                      </th>
                      <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-white whitespace-nowrap">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {filteredRecords.map((r) => (
                      <tr key={r.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 align-middle">
                          <div className="font-medium text-slate-900">{r.name}</div>
                          {r.code && <div className="text-[11px] text-slate-500">{r.code}</div>}
                        </td>
                        <td className="py-3 px-3 align-middle text-slate-600">{r.subLabel}</td>
                        <td className="py-3 px-3 align-middle font-semibold text-[#003B3A]">
                          {r.metricValue}
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${toneClass(
                              r.statusTone
                            )}`}
                          >
                            {r.statusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-middle text-slate-700">{r.ownerName}</td>
                        <td className="py-3 px-3 align-middle text-slate-600">{r.nextMilestone}</td>
                        <td className="py-3 px-3 align-middle text-right">
                          <Link
                            href={r.ssmHref}
                            className="inline-flex items-center gap-1 text-[#00736E] hover:text-[#003B3A] font-medium whitespace-nowrap"
                          >
                            Mở hồ sơ
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
