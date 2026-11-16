"use client"

import React from "react"
import Link from "next/link"
import { ArrowUpRight, Calculator, X } from "lucide-react"
import type {
  WorkHubPlanRecord,
  WorkHubReportRecord,
  WorkHubTaskRecord,
} from "@/lib/workhub/types"

interface SourceDrilldownDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  displayValue: string
  formulaDescription: string
  sourceType: "TASKS" | "REPORTS" | "PLANS" | "KPIS"
  tasks?: WorkHubTaskRecord[]
  reports?: WorkHubReportRecord[]
  plans?: WorkHubPlanRecord[]
}

const STATUS_VI: Record<string, string> = {
  DRAFT: "Nháp",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang thực hiện",
  PENDING_REVIEW: "Chờ nghiệm thu",
  COMPLETED: "Hoàn thành",
  PAUSED: "Tạm dừng",
  CANCELLED: "Đã hủy",
  SUBMITTED: "Đã gửi",
  NEEDS_REVISION: "Cần bổ sung",
  APPROVED: "Đã duyệt",
  ADJUSTED: "Đã điều chỉnh",
}

export function SourceDrilldownDrawer({
  open,
  onClose,
  title,
  displayValue,
  formulaDescription,
  sourceType,
  tasks = [],
  reports = [],
  plans = [],
}: SourceDrilldownDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-start justify-between gap-3 bg-[#F8FAFC]">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h3 className="text-sm font-bold text-[#003B3A]">{title}</h3>
            <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
              Giá trị hiện tại: <strong className="text-[#00736E]">{displayValue}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded-xl bg-[#F0FDFA] border border-teal-200 p-3.5 text-xs space-y-1">
            <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#00A19A]" />
              Mô tả công thức & quy tắc tính
            </div>
            <p className="text-slate-700 leading-relaxed">{formulaDescription}</p>
          </div>

          {sourceType === "TASKS" && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#003B3A] tabular-nums">
                Danh sách công việc nguồn ({tasks.length} bản ghi)
              </div>
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
                  Chưa có công việc nguồn trong tập dữ liệu này.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                            Mã CV
                          </th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                            Tên công việc
                          </th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                            Phụ trách chính
                          </th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                            Trạng thái & Hạn
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {tasks.map((t) => (
                          <tr key={t.id} className="hover:bg-[#F8FAFC] align-middle">
                            <td className="py-2.5 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                              <Link
                                href="/admin/tasks"
                                className="inline-flex items-center gap-1 hover:text-[#008B85]"
                              >
                                {t.taskCode}
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{t.title}</td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {t.assignedToName || "—"}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-semibold text-[#00736E]">
                                {STATUS_VI[t.workStatus] || t.workStatus}
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Hạn: {new Date(t.endDate).toLocaleDateString("vi-VN")}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {sourceType === "REPORTS" && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#003B3A] tabular-nums">
                Danh sách báo cáo nguồn ({reports.length} bản ghi)
              </div>
              {reports.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
                  Chưa có báo cáo nguồn trong kỳ đang chọn.
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between text-xs tabular-nums"
                    >
                      <div>
                        <div className="font-bold text-[#003B3A]">
                          {r.reportCode} • {r.periodLabel}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Người lập: {r.ownerName} • Phiên bản v{r.versionNumber}
                        </div>
                      </div>
                      <Link
                        href="/admin/weekly-reports"
                        className="px-3 py-1.5 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 font-semibold"
                      >
                        Mở báo cáo
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sourceType === "PLANS" && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#003B3A] tabular-nums">
                Danh sách kế hoạch công tác ({plans.length} bản ghi)
              </div>
              {plans.length === 0 ? (
                <div className="rounded-xl border border-[#E2E8F0] p-6 text-center text-xs text-slate-500">
                  Chưa có kế hoạch công tác trong phạm vi lọc.
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between text-xs tabular-nums"
                    >
                      <div>
                        <div className="font-bold text-[#003B3A]">
                          {p.planCode} • {p.title}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Phụ trách: {p.ownerName} • Tiến độ: {p.metrics?.progressPercent || 0}%
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-semibold text-slate-700">
                        {STATUS_VI[p.status] || p.status} (v{p.versionNumber})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
