"use client"

import React, { useState } from "react"
import type { RuleStatus, ValidationReport } from "@/lib/timetable/types"
import { ChevronDown, ChevronUp } from "lucide-react"

const RULE_BADGE_MAP: Record<RuleStatus, { label: string; className: string }> = {
  PASSED: {
    label: "Đạt",
    className: "bg-emerald-50 text-[#059669] border border-emerald-200",
  },
  VIOLATED: {
    label: "Vi phạm",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
  INSUFFICIENT_DATA: {
    label: "Chưa đủ dữ liệu",
    className: "bg-amber-50 text-[#D97706] border border-amber-200",
  },
  NOT_APPLICABLE: {
    label: "Không áp dụng",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
}

interface ValidationSummaryPanelProps {
  report: ValidationReport
  defaultExpanded?: boolean
  title?: string
}

export function ValidationSummaryPanel({
  report,
  defaultExpanded = false,
  title = "Kết quả bộ kiểm tra ràng buộc dùng chung (10 quy tắc)",
}: ValidationSummaryPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [selectedRuleCode, setSelectedRuleCode] = useState<string>("ALL")

  const passedCount = report.rules.filter((r) => r.status === "PASSED").length
  const violatedCount = report.rules.filter((r) => r.status === "VIOLATED").length
  const insufficientCount = report.rules.filter((r) => r.status === "INSUFFICIENT_DATA").length
  const naCount = report.rules.filter((r) => r.status === "NOT_APPLICABLE").length

  const displayedIssues =
    selectedRuleCode === "ALL"
      ? report.allIssues
      : report.allIssues.filter((i) => i.ruleCode === selectedRuleCode)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div
        onClick={() => setExpanded((v) => !v)}
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-xs font-bold text-[#003B3A]">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 tabular-nums text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 font-semibold">
              Đạt: {passedCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 font-semibold">
              Vi phạm: {violatedCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 font-semibold">
              Chưa đủ dữ liệu: {insufficientCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              Không áp dụng: {naCount}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#008B85] hover:text-[#003B3A]"
        >
          <span>{expanded ? "Thu gọn" : "Xem chi tiết quy tắc"}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#E2E8F0] p-4 space-y-4">
          {/* 10 Rules Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Mã quy tắc
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Nội dung kiểm tra
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Tóm tắt đối chiếu
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {report.rules.map((r) => {
                  const badge = RULE_BADGE_MAP[r.status]
                  const isSelected = selectedRuleCode === r.ruleCode
                  return (
                    <tr
                      key={r.ruleCode}
                      onClick={() =>
                        setSelectedRuleCode((prev) => (prev === r.ruleCode ? "ALL" : r.ruleCode))
                      }
                      className={`transition-colors align-middle cursor-pointer ${
                        isSelected
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-600">
                        {r.ruleCode}
                      </td>
                      <td className="py-3 px-3 align-middle font-semibold text-slate-800">
                        {r.ruleName}
                      </td>
                      <td className="py-3 px-3 align-middle text-slate-600">{r.summary}</td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${badge.className}`}>
                          {badge.label}
                          {r.issues.length > 0 ? ` (${r.issues.length})` : ""}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Issues Detail Table */}
          {displayedIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#003B3A] tabular-nums">
                  Danh sách phát hiện cần xử lý ({displayedIssues.length})
                </h4>
                {selectedRuleCode !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedRuleCode("ALL")}
                    className="text-xs font-semibold text-[#008B85] hover:underline"
                  >
                    Hiện tất cả quy tắc
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                        Mức độ
                      </th>
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                        Quy tắc
                      </th>
                      <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                        Chi tiết xung đột / dữ liệu thiếu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                    {displayedIssues.map((iss, idx) => (
                      <tr key={idx} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              iss.severity === "ERROR"
                                ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                                : "bg-amber-50 text-[#D97706] border border-amber-200"
                            }`}
                          >
                            {iss.severity === "ERROR" ? "Bắt buộc" : "Cảnh báo"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {iss.ruleCode}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-800">{iss.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
