"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Lock,
  Unlock,
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Info,
} from "lucide-react"
import type {
  ParentGradePeriodCode,
  ParentGradeVisibilityItem,
} from "@/lib/grading/parent-grade-visibility"

export interface ParentGradeVisibilityPanelProps {
  academicYearId: string
  academicYearName?: string
  onChanged?: (lockedPeriods: string[]) => void
  embedded?: boolean
}

export interface ParentGradeVisibilityModalProps {
  open: boolean
  onClose: () => void
  academicYearId: string
  academicYearName?: string
  onChanged?: (lockedPeriods: string[]) => void
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Mặc định hệ thống"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export function ParentGradeVisibilityPanel({
  academicYearId,
  academicYearName,
  onChanged,
  embedded = false,
}: ParentGradeVisibilityPanelProps) {
  const [loading, setLoading] = useState(false)
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const [periods, setPeriods] = useState<ParentGradeVisibilityItem[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<ParentGradePeriodCode[]>([])
  const [reason, setReason] = useState("")
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const query = academicYearId
        ? `?academicYearId=${encodeURIComponent(academicYearId)}`
        : ""
      const res = await fetch(`/api/admin/ktdbcl/parent-grade-visibility${query}`)
      const data = await res.json()
      if (data?.success && Array.isArray(data.periods)) {
        setPeriods(data.periods)
        if (onChangedRef.current && Array.isArray(data.lockedPeriods)) {
          onChangedRef.current(data.lockedPeriods)
        }
      } else {
        setFeedback({
          type: "error",
          text: data?.error || "Không thể tải cấu hình hiển thị điểm PHHS",
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối khi tải cấu hình hiển thị điểm PHHS"
      setFeedback({ type: "error", text: msg })
    } finally {
      setLoading(false)
    }
  }, [academicYearId])

  useEffect(() => {
    setFeedback(null)
    setSelectedPeriods([])
    fetchConfig()
  }, [fetchConfig])

  const openItems = useMemo(() => periods.filter((p) => !p.isLocked), [periods])
  const lockedItems = useMemo(() => periods.filter((p) => p.isLocked), [periods])
  const allSelected = periods.length > 0 && selectedPeriods.length === periods.length

  const toggleSelectPeriod = (code: ParentGradePeriodCode) => {
    setSelectedPeriods((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    )
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPeriods([])
    } else {
      setSelectedPeriods(periods.map((p) => p.period))
    }
  }

  const submitPeriodsUpdate = async (
    busyKey: string,
    nextMap: Partial<Record<ParentGradePeriodCode, boolean>>,
    defaultReason: string,
    clearSelectionAfter = false
  ) => {
    try {
      setSubmittingKey(busyKey)
      setFeedback(null)
      const res = await fetch("/api/admin/ktdbcl/parent-grade-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          periods: nextMap,
          reason: reason.trim() || defaultReason,
        }),
      })
      const data = await res.json()
      if (data?.success && Array.isArray(data.periods)) {
        setPeriods(data.periods)
        if (clearSelectionAfter) setSelectedPeriods([])
        setFeedback({ type: "success", text: data.message || "Đã cập nhật thành công." })
        if (onChangedRef.current && Array.isArray(data.lockedPeriods)) {
          onChangedRef.current(data.lockedPeriods)
        }
      } else {
        setFeedback({ type: "error", text: data?.error || "Cập nhật thất bại." })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối máy chủ."
      setFeedback({ type: "error", text: msg })
    } finally {
      setSubmittingKey(null)
    }
  }

  const handleToggleSingle = async (item: ParentGradeVisibilityItem) => {
    await submitPeriodsUpdate(
      item.period,
      { [item.period]: !item.isLocked },
      !item.isLocked
        ? `Khóa hiển thị điểm kỳ ${item.label} trên cổng PHHS`
        : `Mở hiển thị điểm kỳ ${item.label} trên cổng PHHS`
    )
  }

  const handleBulkSelected = async (lockTarget: boolean) => {
    if (selectedPeriods.length === 0) return
    const nextMap: Partial<Record<ParentGradePeriodCode, boolean>> = {}
    selectedPeriods.forEach((p) => {
      nextMap[p] = lockTarget
    })
    await submitPeriodsUpdate(
      lockTarget ? "BULK_LOCK_SELECTED" : "BULK_UNLOCK_SELECTED",
      nextMap,
      lockTarget
        ? `Khóa hiển thị ${selectedPeriods.length} kỳ (${selectedPeriods.join(", ")}) trên cổng PHHS`
        : `Mở hiển thị ${selectedPeriods.length} kỳ (${selectedPeriods.join(", ")}) trên cổng PHHS`,
      true
    )
  }

  return (
    <div className={embedded ? "space-y-4" : "p-5 space-y-4 overflow-y-auto"}>
      {/* Embedded Masthead Banner */}
      {embedded && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-[#008B85]" />
              <h2 className="text-base font-bold text-[#003B3A]">
                Danh mục Khóa / Mở quyền xem điểm trên cổng PHHS
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Năm học:{" "}
              <span className="font-semibold text-slate-900">
                {academicYearName || "Hiện hành"}
              </span>{" "}
              · Phụ huynh chỉ nhìn thấy và xem được đúng các kỳ đang ở trạng thái{" "}
              <span className="font-semibold text-emerald-700">Đang mở cho PHHS</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchConfig}
              disabled={loading || submittingKey !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Strip: What Parents Can See Right Now */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              Các kỳ PHHS đang được xem ({openItems.length}/{periods.length || 5})
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {openItems.length > 0 ? (
                openItems.map((p) => (
                  <span
                    key={p.period}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                  >
                    {p.shortLabel} · {p.label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-emerald-800/80 italic">
                  Không có kỳ nào đang mở (đã khóa toàn bộ)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-amber-50/70 rounded-xl border border-amber-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              Các kỳ đang ẩn / khóa trên cổng PHHS ({lockedItems.length}/{periods.length || 5})
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {lockedItems.length > 0 ? (
                lockedItems.map((p) => (
                  <span
                    key={p.period}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 text-[11px] font-semibold"
                  >
                    {p.shortLabel}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-amber-800/80 italic">
                  Không có kỳ nào bị khóa
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets & Reason */}
      <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">
            Thiết lập nhanh toàn bộ kỳ đánh giá
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={submittingKey !== null || loading}
              onClick={() =>
                submitPeriodsUpdate(
                  "PRESET_LOCK_ALL",
                  { KSĐN: true, GK1: true, CK1: true, GK2: true, CK2: true },
                  "Tạm khóa hiển thị tất cả các kỳ đánh giá trên cổng PHHS",
                  true
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Khóa hết các kỳ
            </button>
            <button
              type="button"
              disabled={submittingKey !== null || loading}
              onClick={() =>
                submitPeriodsUpdate(
                  "PRESET_ONLY_ENDTERM",
                  { KSĐN: true, GK1: true, CK1: false, GK2: true, CK2: false },
                  "Chỉ mở hiển thị điểm Cuối kỳ (CK1 & CK2) trên cổng PHHS",
                  true
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005B58] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Chỉ mở Cuối kỳ (CK1 &amp; CK2)
            </button>
            <button
              type="button"
              disabled={submittingKey !== null || loading}
              onClick={() =>
                submitPeriodsUpdate(
                  "PRESET_MIDTERM",
                  { KSĐN: false, GK1: true, CK1: false, GK2: true, CK2: false },
                  "Khóa hiển thị điểm giữa kỳ (GK1 & GK2) trên cổng PHHS",
                  true
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Khóa Giữa kỳ (GK1 &amp; GK2)
            </button>
            <button
              type="button"
              disabled={submittingKey !== null || loading}
              onClick={() =>
                submitPeriodsUpdate(
                  "PRESET_OPEN_ALL",
                  { KSĐN: false, GK1: false, CK1: false, GK2: false, CK2: false },
                  "Mở hiển thị tất cả kỳ đánh giá trên cổng PHHS",
                  true
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Mở tất cả
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Thông báo / lý do hiển thị cho PHHS khi khóa (tùy chọn)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Nhà trường đang tổng hợp và rà soát điểm, sẽ mở công bố trên cổng PHHS theo lịch thông báo..."
            className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs text-slate-800 focus:outline-none focus:border-[#008B85]"
          />
        </div>
      </div>

      {/* Multi-Select Bulk Action Bar */}
      {selectedPeriods.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#F0FDFA] border border-[#00A19A]/40">
          <div className="text-xs font-semibold text-[#003B3A] tabular-nums">
            Đã chọn <span className="font-bold text-[#00736E]">{selectedPeriods.length}</span> kỳ:{" "}
            <span className="font-bold">{selectedPeriods.join(", ")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={submittingKey !== null}
              onClick={() => handleBulkSelected(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Khóa {selectedPeriods.length} kỳ đã chọn
            </button>
            <button
              type="button"
              disabled={submittingKey !== null}
              onClick={() => handleBulkSelected(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Mở {selectedPeriods.length} kỳ đã chọn
            </button>
            <button
              type="button"
              disabled={submittingKey !== null}
              onClick={() => setSelectedPeriods([])}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] text-slate-600 text-xs font-medium cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Sky-Line Academic Ledger Table with Multi-Select */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-10 text-white">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    disabled={loading || periods.length === 0}
                    className="inline-flex items-center justify-center text-white hover:text-[#5EEAD4] cursor-pointer disabled:opacity-50"
                    title={allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả các kỳ"}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#5EEAD4]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 text-white">Kỳ đánh giá</th>
                <th className="py-3 px-3 text-[#5EEAD4] text-center">Trạng thái PHHS</th>
                <th className="py-3 px-3 text-teal-100">Cập nhật gần nhất</th>
                <th className="py-3 px-3 text-white text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading && periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-[#008B85]" />
                    Đang tải cấu hình...
                  </td>
                </tr>
              ) : (
                periods.map((item) => {
                  const isBusy = submittingKey === item.period
                  const isChecked = selectedPeriods.includes(item.period)
                  return (
                    <tr
                      key={item.period}
                      className={`transition-colors align-middle ${
                        isChecked
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleSelectPeriod(item.period)}
                          className="inline-flex items-center justify-center text-slate-500 hover:text-[#008B85] cursor-pointer"
                          aria-label={`Chọn kỳ ${item.label}`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#008B85]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td
                        className="py-3 px-3 align-middle cursor-pointer"
                        onClick={() => toggleSelectPeriod(item.period)}
                      >
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[#003B3A] font-semibold text-[11px]">
                            {item.shortLabel}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.description}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        {item.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                            <Lock className="w-3 h-3" />
                            Đang khóa (Ẩn trên PHHS)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                            <Eye className="w-3 h-3" />
                            Đang mở cho PHHS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-[11px] text-slate-600">
                        <div className="font-medium text-slate-700">
                          {item.updatedBy || (item.isDefault ? "Mặc định hệ thống" : "—")}
                        </div>
                        <div className="text-slate-400">
                          {item.updatedAt ? formatDateTime(item.updatedAt) : "Chưa thay đổi thủ công"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right align-middle">
                        <button
                          type="button"
                          disabled={submittingKey !== null}
                          onClick={() => handleToggleSingle(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                            item.isLocked
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-600 hover:bg-amber-700 text-white"
                          }`}
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : item.isLocked ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                          {item.isLocked ? "Mở cho PHHS" : "Khóa PHHS"}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-[#008B85] shrink-0 mt-0.5" />
        <div>
          Trạng thái ở đây kiểm soát trực tiếp việc <strong>hiển thị hay ẩn kỳ đánh giá trên cổng Phụ huynh</strong> (áp dụng đồng bộ cho cả{" "}
          <span className="font-semibold text-slate-800">Bảng điểm (/parent/grades)</span> và{" "}
          <span className="font-semibold text-slate-800">Hồ sơ học sinh 360° (/parent/children/profile)</span>).
          Cơ chế này độc lập với nút <em>Quản lý Khóa điểm &amp; Mở điểm</em> (khóa sổ nhập điểm của Giáo viên).
        </div>
      </div>
    </div>
  )
}

export function ParentGradeVisibilityModal({
  open,
  onClose,
  academicYearId,
  academicYearName,
  onChanged,
}: ParentGradeVisibilityModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-[#5EEAD4]" />
              <h2 className="text-base font-bold tracking-tight">
                Khóa / Mở quyền xem điểm trên cổng PHHS
              </h2>
            </div>
            <p className="text-xs text-teal-100">
              Năm học:{" "}
              <span className="font-semibold text-white">
                {academicYearName || "Hiện hành"}
              </span>{" "}
              · Chọn 1, nhiều kỳ hoặc khóa hết các kỳ — PHHS chỉ xem được các kỳ đang mở.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ParentGradeVisibilityPanel
          academicYearId={academicYearId}
          academicYearName={academicYearName}
          onChanged={onChanged}
        />

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
