"use client"

import React from "react"
import { Check, Sparkles, Lightbulb } from "lucide-react"

export interface GoalPreset {
  id: string
  gradeGroup: string
  category: string
  goalText: string
  actionPreset?: string
  sortOrder?: number
  status?: string
}

interface GoalMultiSelectorProps {
  categoryKey: string
  categoryTitle: string
  categoryHint?: string
  presets: GoalPreset[]
  selectedPresetIds: string[]
  onSelectionChange: (selectedIds: string[], calculatedActions: string[]) => void
  customTargetText: string
  onCustomTargetChange: (val: string) => void
  customActionText: string
  onCustomActionChange: (val: string) => void
  readOnly?: boolean
}

export function GoalMultiSelector({
  categoryKey,
  categoryTitle,
  categoryHint,
  presets = [],
  selectedPresetIds = [],
  onSelectionChange,
  customTargetText = "",
  onCustomTargetChange,
  customActionText = "",
  onCustomActionChange,
  readOnly = false
}: GoalMultiSelectorProps) {
  // Filter presets matching this category
  const catPresets = presets.filter(p => p.category === categoryKey && p.status !== "INACTIVE")

  // Toggle selecting a preset
  const handleTogglePreset = (presetId: string) => {
    if (readOnly) return

    const isAlreadySelected = selectedPresetIds.includes(presetId)
    let newSelectedIds: string[] = []

    if (isAlreadySelected) {
      newSelectedIds = selectedPresetIds.filter(id => id !== presetId)
    } else {
      newSelectedIds = [...selectedPresetIds, presetId]
    }

    // Extract corresponding suggested actions from all selected presets
    const actions: string[] = []
    const goals: string[] = []
    
    newSelectedIds.forEach(id => {
      const match = presets.find(p => p.id === id)
      if (match?.goalText) {
        goals.push(match.goalText)
      }
      if (match?.actionPreset) {
        actions.push(match.actionPreset)
      }
    })

    // Automatically fill target text & action text if empty or append
    if (goals.length > 0) {
      onCustomTargetChange(goals.join("; "))
    }
    if (actions.length > 0) {
      onCustomActionChange(actions.map((act, idx) => (idx + 1) + ". " + act).join("\n"))
    }

    onSelectionChange(newSelectedIds, actions)
  }

  // Calculate matching actions for selected presets
  const selectedPresets = presets.filter(p => selectedPresetIds.includes(p.id))

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-5">
      {/* Category Header */}
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            <span>{categoryTitle}</span>
          </h3>
          {categoryHint && (
            <p className="text-xs text-slate-500 font-medium italic mt-0.5 pl-4">
              Gợi ý: {categoryHint}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-[11px] font-black">
            {selectedPresetIds.length} mục tiêu chọn
          </span>
        </div>
      </div>

      {/* SECTION 1: Linh động chọn 1 hoặc nhiều Mục tiêu mẫu (Multi-select goal options) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-teal-800">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>CHỌN 1 HOẶC NHIỀU MỤC TIÊU MẪU (BGH GỢI Ý):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal normal-case">
            (Có thể chọn nhiều mục tiêu cùng lúc)
          </span>
        </label>

        {catPresets.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium text-center">
            Chưa có mục tiêu mẫu BGH trong nhóm này. Bạn có thể tự nhập bên dưới.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catPresets.map((item) => {
              const isSelected = selectedPresetIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleTogglePreset(item.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                    readOnly ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:border-teal-400"
                  } ${
                    isSelected
                      ? "bg-teal-50/80 border-teal-500 text-teal-950 shadow-xs ring-1 ring-teal-400"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-extrabold leading-snug">
                        {item.goalText}
                      </p>
                      {item.actionPreset && (
                        <p className={`text-[10px] font-medium leading-tight flex items-center gap-1 ${
                          isSelected ? "text-teal-800 font-bold" : "text-slate-500"
                        }`}>
                          <span>⚡ Hành động gợi ý:</span>
                          <span className="truncate">{item.actionPreset}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TỰ ĐỘNG ĐỒNG BỘ HÀNH ĐỘNG GỢI Ý THEO NỘI DUNG ĐÃ CHỌN */}
      {selectedPresets.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>HÀNH ĐỘNG GỢI Ý TƯƠNG ỨNG VỚI {selectedPresets.length} MỤC TIÊU ĐÃ CHỌN:</span>
          </div>

          <div className="space-y-1.5 pl-6">
            {selectedPresets.map((p, i) => (
              <div key={p.id} className="text-xs text-amber-950 font-semibold flex items-start gap-2">
                <span className="text-amber-600 font-bold shrink-0">{i + 1}.</span>
                <div>
                  <span className="font-extrabold text-slate-800">[{p.goalText}]:</span>{" "}
                  <span className="text-amber-900">{p.actionPreset || "Chưa có hành động mẫu"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: EDITABLE INPUTS (Các mục tiêu cụ thể & Hành động thực hiện) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        {/* Input Target */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
              <span>Nội dung mục tiêu chi tiết của em:</span>
            </span>
          </label>
          <textarea
            rows={3}
            readOnly={readOnly}
            value={customTargetText}
            onChange={e => onCustomTargetChange(e.target.value)}
            placeholder="Mục tiêu đã chọn hoặc nội dung mục tiêu cá nhân của em..."
            className={`w-full p-3 rounded-2xl border-2 text-xs font-semibold focus:outline-none transition-colors ${
              readOnly
                ? "bg-slate-100/80 text-slate-700 border-slate-200 cursor-not-allowed"
                : "border-slate-200 focus:border-teal-500"
            }`}
          />
        </div>

        {/* Input Actions */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>Em sẽ làm gì để đạt mục tiêu này (Hành động cụ thể):</span>
            </span>
          </label>
          <textarea
            rows={3}
            readOnly={readOnly}
            value={customActionText}
            onChange={e => onCustomActionChange(e.target.value)}
            placeholder="Các bước hành động cụ thể để đạt mục tiêu trên..."
            className={`w-full p-3 rounded-2xl border-2 text-xs font-semibold focus:outline-none transition-colors ${
              readOnly
                ? "bg-slate-100/80 text-slate-700 border-slate-200 cursor-not-allowed"
                : "border-slate-200 focus:border-amber-500"
            }`}
          />
        </div>
      </div>
    </div>
  )
}
