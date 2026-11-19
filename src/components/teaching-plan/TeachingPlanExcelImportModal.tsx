"use client"

import React, { useState } from "react"
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import type { ExcelImportPreviewResult } from "@/lib/teaching-plan/types"

interface Props {
  open: boolean
  onClose: () => void
  context: {
    academicYearId: string
    academicYearName: string
    level: string
    grade: string
    subjectId: string
    subjectName: string
    programCode: string
    programName: string
    scopeType: "SYSTEM" | "CAMPUS"
    campusId: string | null
    versionId?: string
    expectedRevision?: number
  }
  onCommitted: (data: any) => void
}

export function TeachingPlanExcelImportModal({
  open,
  onClose,
  context,
  onCommitted,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [preview, setPreview] = useState<ExcelImportPreviewResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  if (!open) return null

  const handleFileChange = async (selectedFile: File | null) => {
    setFile(selectedFile)
    setPreview(null)
    setErrorMsg("")
    if (!selectedFile) return

    setLoadingPreview(true)
    try {
      const fd = new FormData()
      fd.append("file", selectedFile)
      if (context.versionId) fd.append("versionId", context.versionId)
      fd.append("academicYearId", context.academicYearId)
      fd.append("grade", context.grade)
      fd.append("subjectId", context.subjectId)
      fd.append("programCode", context.programCode)
      fd.append("programName", context.programName)
      fd.append("scopeType", context.scopeType)
      if (context.campusId) fd.append("campusId", context.campusId)

      const res = await fetch("/api/teaching-plans/import/preview", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Không thể đọc tệp Excel.")
        return
      }
      setPreview(json.preview)
    } catch (e: any) {
      setErrorMsg(e?.message || "Lỗi kết nối khi xem trước tệp Excel.")
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleCommit = async () => {
    if (!preview || !preview.valid) return
    setCommitting(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/teaching-plans/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: context.versionId || undefined,
          expectedRevision: context.expectedRevision,
          academicYearId: context.academicYearId,
          level: context.level,
          grade: context.grade,
          subjectId: context.subjectId,
          programCode: context.programCode,
          programName: context.programName,
          scopeType: context.scopeType,
          campusId: context.campusId,
          lessons: preview.lessons,
          periods: preview.periods,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Không thể lưu dữ liệu nhập vào bản nháp.")
        return
      }
      onCommitted(json)
      onClose()
    } catch (e: any) {
      setErrorMsg(e?.message || "Lỗi kết nối khi lưu bản nháp.")
    } finally {
      setCommitting(false)
    }
  }

  const templateUrl = `/api/teaching-plans/template?academicYearName=${encodeURIComponent(
    context.academicYearName
  )}&grade=${encodeURIComponent(context.grade)}&subjectName=${encodeURIComponent(
    context.subjectName
  )}&programName=${encodeURIComponent(context.programName || "")}`

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-[#E2E8F0] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-[#5EEAD4]" />
            <div>
              <h3 className="text-base font-semibold">Nhập Kế hoạch dạy học từ Excel</h3>
              <p className="text-xs text-teal-100">
                {context.academicYearName} • {context.level} • Khối {context.grade} • {context.subjectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8FAFC]">
          {/* Upload Bar */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Chọn tệp Excel theo mẫu chuẩn SSM (3 sheet: Thong_tin, Phan_phoi, Chi_tiet_tiet)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống sẽ kiểm tra mã bài, mã tiết, khoảng tuần và đối chiếu thông tin trước khi lưu vào bản nháp.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={templateUrl}
                className="px-3 py-2 text-xs font-medium text-[#003B3A] bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg transition-colors"
              >
                Tải file mẫu
              </a>
              <label className="px-3.5 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{file ? "Chọn tệp khác" : "Tải tệp lên"}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {file && (
            <div className="text-xs text-slate-600 flex items-center gap-2 px-1">
              <FileSpreadsheet className="w-4 h-4 text-[#00736E]" />
              <span>Tệp đã chọn:</span>
              <span className="font-medium text-slate-900">{file.name}</span>
            </div>
          )}

          {loadingPreview && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 flex items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#00736E]" />
              <span>Đang đọc và kiểm tra dữ liệu tệp Excel...</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* Summary Strip */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 tabular-nums">
                <div>
                  <div className="text-xs text-slate-500">Bài thêm / cập nhật</div>
                  <div className="text-base font-semibold text-[#003B3A] mt-0.5">
                    +{preview.summary.lessonsAdded} / {preview.summary.lessonsUpdated} sửa
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {preview.summary.lessonsUnchanged} không đổi
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tiết thêm / cập nhật</div>
                  <div className="text-base font-semibold text-[#00736E] mt-0.5">
                    +{preview.summary.periodsAdded} / {preview.summary.periodsUpdated} sửa
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {preview.summary.periodsUnchanged} không đổi
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tiết khung tạo mới</div>
                  <div className="text-base font-semibold text-amber-700 mt-0.5">
                    {preview.summary.periodsSkeletonCreated}
                  </div>
                  <div className="text-[11px] text-slate-500">Cần bổ sung trước công bố</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Đánh giá cần xác nhận</div>
                  <div className="text-base font-semibold text-amber-700 mt-0.5">
                    {preview.summary.lessonsNeedsConfirmation}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Số lỗi kiểm tra</div>
                  <div
                    className={`text-base font-semibold mt-0.5 ${
                      preview.summary.errorCount > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {preview.summary.errorCount}
                  </div>
                </div>
              </div>

              {/* Thong_tin mismatches */}
              {preview.mismatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Chênh lệch thông tin trên sheet Thong_tin</span>
                  </div>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
                    {preview.mismatches.map((m, i) => (
                      <li key={i}>
                        <strong>{m.label}:</strong> File ghi &ldquo;{m.fileValue}&rdquo;, trên SSM đang chọn &ldquo;{m.expectedValue}&rdquo;
                        {m.severity === "ERROR" ? " (Bắt buộc khớp)" : " (Cảnh báo)"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation errors table */}
              {preview.errors.length > 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Danh sách lỗi cần chỉnh sửa trong file trước khi nhập ({preview.errors.length})</span>
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                        <tr>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">Sheet</th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">Dòng</th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">Cột</th>
                          <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">Lý do</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {preview.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 font-medium text-slate-900">{err.sheet}</td>
                            <td className="py-2.5 px-3 text-slate-700">{err.row}</td>
                            <td className="py-2.5 px-3 text-slate-700">{err.column}</td>
                            <td className="py-2.5 px-3 text-rose-700">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Dữ liệu hợp lệ ({preview.lessons.length} bài, {preview.periods.length} tiết). Bấm &ldquo;Xác nhận lưu bản nháp&rdquo; để cập nhật theo mã mà không tạo trùng lặp.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!preview || !preview.valid || committing}
            onClick={handleCommit}
            className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            {committing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Xác nhận lưu bản nháp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
