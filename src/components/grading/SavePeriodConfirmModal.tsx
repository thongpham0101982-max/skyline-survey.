"use client"

import React, { useEffect, useState } from "react"
import { Calendar, CheckCircle2, Save, X, AlertTriangle } from "lucide-react"

export interface SavePeriodOption {
  value: string
  label: string
  sublabel?: string
  group?: string
}

interface SavePeriodConfirmModalProps {
  isOpen: boolean
  title?: string
  description?: string
  contextSummary?: string
  currentValue: string
  options: SavePeriodOption[]
  saving?: boolean
  confirmButtonLabel?: string
  onClose: () => void
  onConfirm: (selectedValue: string) => void
}

export function SavePeriodConfirmModal({
  isOpen,
  title = "Chọn kỳ đánh giá trước khi lưu",
  description = "Vui lòng chọn rõ Học kỳ / Kỳ đánh giá cần lưu để tránh ghi nhầm dữ liệu sang kỳ khác.",
  contextSummary,
  currentValue,
  options,
  saving = false,
  confirmButtonLabel,
  onClose,
  onConfirm,
}: SavePeriodConfirmModalProps) {
  // Bắt buộc người dùng chủ động bấm chọn kỳ trước khi nút Lưu được kích hoạt
  const [chosenValue, setChosenValue] = useState<string>("")

  useEffect(() => {
    if (isOpen) {
      setChosenValue("")
    }
  }, [isOpen])

  if (!isOpen) return null

  const currentOpt = options.find((o) => o.value === currentValue)
  const chosenOpt = options.find((o) => o.value === chosenValue)
  const isDifferentFromCurrent = Boolean(chosenValue && currentValue && chosenValue !== currentValue)

  // Group options if any option specifies a group
  const hasGroups = options.some((o) => Boolean(o.group))
  const groupedOptions: Array<{ group: string; items: SavePeriodOption[] }> = hasGroups
    ? Array.from(
        options.reduce((map, opt) => {
          const g = opt.group || "Khác"
          if (!map.has(g)) map.set(g, [])
          map.get(g)!.push(opt)
          return map
        }, new Map<string, SavePeriodOption[]>())
      ).map(([group, items]) => ({ group, items }))
    : [{ group: "", items: options }]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px]"
      onClick={() => {
        if (!saving) onClose()
      }}
    >
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden tabular-nums"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#003B3A] px-5 py-4 flex items-start justify-between gap-3 text-white">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4.5 h-4.5 text-[#5EEAD4]" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-snug">{title}</h3>
              <p className="text-xs text-teal-100 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {contextSummary && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-700">
              {contextSummary}
            </div>
          )}

          <div className="space-y-3">
            {groupedOptions.map((grp) => (
              <div key={grp.group || "default"} className="space-y-2">
                {grp.group && (
                  <div className="text-xs font-semibold text-slate-600 px-0.5">
                    {grp.group}
                  </div>
                )}
                <div className={`grid gap-2.5 ${grp.items.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                  {grp.items.map((opt) => {
                    const isSelected = chosenValue === opt.value
                    const isCurrent = currentValue === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={saving}
                        onClick={() => setChosenValue(opt.value)}
                        className={`text-left px-3.5 py-3 rounded-xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? "border-[#003B3A] bg-[#F0FDFA] ring-2 ring-[#008B85]/25"
                            : "border-[#E2E8F0] bg-white hover:border-[#008B85]/60 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-bold ${isSelected ? "text-[#003B3A]" : "text-slate-800"}`}>
                              {opt.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-[#E2E8F0]">
                                Đang xem
                              </span>
                            )}
                          </div>
                          {opt.sublabel && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{opt.sublabel}</div>
                          )}
                        </div>
                        <div
                          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? "bg-[#003B3A] border-[#003B3A] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!chosenValue && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>Bắt buộc chọn một Học kỳ / Kỳ đánh giá ở trên trước khi xác nhận lưu.</span>
            </div>
          )}

          {isDifferentFromCurrent && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                Lưu ý: Bạn đang xem <strong>{currentOpt?.label || currentValue}</strong>, nhưng dữ liệu sẽ được lưu vào{" "}
                <strong>{chosenOpt?.label || chosenValue}</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!chosenValue || saving}
            onClick={() => {
              if (chosenValue) onConfirm(chosenValue)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] shadow-xs transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5 text-[#5EEAD4]" />
            {saving
              ? "Đang lưu..."
              : chosenOpt
              ? confirmButtonLabel || `Xác nhận lưu (${chosenOpt.label})`
              : "Chọn kỳ để lưu"}
          </button>
        </div>
      </div>
    </div>
  )
}
