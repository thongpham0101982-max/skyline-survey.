"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react"
import { ImportBatchSummary, ValidatedImportRow } from "@/lib/testing/resultValidationService"

interface ResultImportPreviewProps {
  summary: ImportBatchSummary
  rows: ValidatedImportRow[]
  overwritePolicy: "KEEP" | "REPLACE" | "SKIP"
  onOverwritePolicyChange: (v: "KEEP" | "REPLACE" | "SKIP") => void
  onConfirmImport: () => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ResultImportPreview({
  summary,
  rows,
  overwritePolicy,
  onOverwritePolicyChange,
  onConfirmImport,
  onCancel,
  isSubmitting
}: ResultImportPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-slate-500 font-medium">Tổng số dòng</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{summary.totalRows}</div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="text-emerald-700 font-medium">Hợp lệ</div>
          <div className="text-lg font-bold text-emerald-900 font-mono mt-0.5">{summary.validCount}</div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-amber-700 font-medium">Cảnh báo / Vắng</div>
          <div className="text-lg font-bold text-amber-900 font-mono mt-0.5">{summary.warningCount}</div>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="text-blue-700 font-medium">Trùng dữ liệu</div>
          <div className="text-lg font-bold text-blue-900 font-mono mt-0.5">{summary.duplicateCount}</div>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl col-span-2 sm:col-span-1">
          <div className="text-red-700 font-medium">Lỗi / Thiếu HS</div>
          <div className="text-lg font-bold text-red-900 font-mono mt-0.5">
            {summary.errorCount + summary.unmatchedStudentCount}
          </div>
        </div>
      </div>

      {/* Duplicate Handling Policy */}
      {summary.duplicateCount > 0 && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Phát hiện {summary.duplicateCount} dòng trùng lặp. Chọn chính sách xử lý:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="overwrite"
                checked={overwritePolicy === "REPLACE"}
                onChange={() => onOverwritePolicyChange("REPLACE")}
                className="text-[#003B3A]"
              />
              <span>Ghi đè bằng điểm mới</span>
            </label>
            <label className="flex items-center gap-1 text-slate-700 cursor-pointer ml-2">
              <input
                type="radio"
                name="overwrite"
                checked={overwritePolicy === "KEEP"}
                onChange={() => onOverwritePolicyChange("KEEP")}
                className="text-[#003B3A]"
              />
              <span>Giữ nguyên điểm cũ</span>
            </label>
          </div>
        </div>
      )}

      {/* Table Preview */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs max-h-96">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-3">Dòng</th>
              <th className="py-2.5 px-3">Mã HS</th>
              <th className="py-2.5 px-3">Môn học</th>
              <th className="py-2.5 px-3 text-center">Điểm nạp</th>
              <th className="py-2.5 px-3">Trạng thái</th>
              <th className="py-2.5 px-3">Chi tiết / Hướng xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isErr = r.status === "ERROR" || r.status === "UNMATCHED_STUDENT"
              const isWarn = r.status === "WARNING"
              const isDup = r.status === "DUPLICATE"

              return (
                <tr key={r.rowNumber} className={isErr ? "bg-red-50/40" : isWarn ? "bg-amber-50/30" : ""}>
                  <td className="py-2 px-3 text-slate-400 font-mono">{r.rowNumber}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.raw.studentCode}</td>
                  <td className="py-2 px-3 text-slate-800 font-medium">
                    {r.canonicalSubjectName || r.raw.subjectCodeOrName}
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold">
                    {r.parsedScore !== null ? r.parsedScore.toFixed(1) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge
                      status={isErr ? "danger" : isWarn ? "warning" : isDup ? "info" : "success"}
                      label={
                        isErr ? "Lỗi" : isWarn ? "Vắng / Thiếu" : isDup ? "Trùng điểm" : "Hợp lệ"
                      }
                    />
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-[11px]">
                    {r.issueDescription ? (
                      <div>
                        <span className="font-semibold text-slate-700">{r.issueDescription}</span>
                        {r.suggestedAction && <div className="text-slate-500 mt-0.5">→ {r.suggestedAction}</div>}
                      </div>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng lưu
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={!summary.canProceed || isSubmitting}
          onClick={onConfirmImport}
          className="px-5 py-2 bg-[#003B3A] text-white rounded-lg text-xs font-semibold hover:bg-[#002d2c] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {isSubmitting ? "Đang lưu..." : `Xác nhận nạp (${summary.validCount + (overwritePolicy === "REPLACE" ? summary.duplicateCount : 0)} bản ghi)`}
        </button>
      </div>
    </div>
  )
}
