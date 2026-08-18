"use client"

import React from "react"
import { Check, Sparkles, Lightbulb, Plus, Trash2, Edit3 } from "lucide-react"

export interface GoalPreset {
  id: string
  gradeGroup: string
  category: string
  goalText: string
  actionPreset?: string
  sortOrder?: number
  status?: string
}

export interface CustomGoalItem {
  targetText: string
  actionText: string
}

interface GoalMultiSelectorProps {
  categoryKey: string
  categoryTitle: string
  categoryHint?: string
  presets: GoalPreset[]
  selectedPresetIds: string[]
  onSelectionChange: (selectedIds: string[], calculatedActions: string[]) => void
  customItems: CustomGoalItem[]
  onCustomItemsChange: (items: CustomGoalItem[]) => void
  readOnly?: boolean
}

export function GoalMultiSelector({
  categoryKey,
  categoryTitle,
  categoryHint,
  presets = [],
  selectedPresetIds = [],
  onSelectionChange,
  customItems = [{ targetText: "", actionText: "" }],
  onCustomItemsChange,
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

    const actions: string[] = []
    newSelectedIds.forEach(id => {
      const match = presets.find(p => p.id === id)
      if (match?.actionPreset) {
        actions.push(match.actionPreset)
      }
    })

    onSelectionChange(newSelectedIds, actions)
  }

  // Calculate matching actions for selected presets
  const selectedPresets = presets.filter(p => selectedPresetIds.includes(p.id))

  const handleAddCustomRow = () => {
    if (readOnly) return
    onCustomItemsChange([...customItems, { targetText: "", actionText: "" }])
  }

  const handleRemoveCustomRow = (idx: number) => {
    if (readOnly) return
    onCustomItemsChange(customItems.filter((_, i) => i !== idx))
  }

  const handleUpdateCustomRow = (idx: number, field: "targetText" | "actionText", val: string) => {
    if (readOnly) return
    const updated = customItems.map((item, i) => i === idx ? { ...item, [field]: val } : item)
    onCustomItemsChange(updated)
  }

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
            {selectedPresetIds.length + customItems.filter(i => i.targetText.trim()).length} mục tiêu chọn/điền
          </span>
        </div>
      </div>

      {/* SECTION 1: Linh động chọn 1 hoặc nhiều Mục tiêu mẫu (Multi-select goal options) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-teal-800">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>1. CHỌN 1 HOẶC NHIỀU MỤC TIÊU MẪU (BGH GỢI Ý):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-normal normal-case">
            (Có thể chọn nhiều mục tiêu cùng lúc)
          </span>
        </label>

        {catPresets.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium text-center">
            Chưa có mục tiêu mẫu BGH trong nhóm này. Bạn có thể tự gõ thêm các mục tiêu bên dưới.
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

      {/* SECTION 3: MULTI CUSTOM GOALS (TỰ GÕ / THÊM NHIỀU MỤC TIÊU CỤ THỂ KHÁC CỦA HỌC SINH) */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span>2. TỰ GÕ / BỔ SUNG CÁC MỤC TIÊU CỤ THỂ KHÁC CỦA EM (CÓ THỂ THÊM NHIỀU MỤC TIÊU):</span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">
            ({customItems.length} mục tiêu bổ sung)
          </span>
        </div>

        <div className="space-y-3">
          {customItems.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium text-center">
              Chưa có mục tiêu cá nhân tự gõ. Nhấn nút <strong>"+ Thêm 1 mục tiêu cụ thể mới"</strong> bên dưới để bổ sung mục tiêu riêng của em.
            </div>
          )}
          {customItems.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-teal-800 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>Mục tiêu cụ thể khác #{idx + 1}</span>
                </span>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomRow(idx)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-rose-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa dòng này</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Input Target */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-700 block">
                    Nội dung mục tiêu cụ thể của em:
                  </label>
                  <textarea
                    rows={2}
                    readOnly={readOnly}
                    value={item.targetText}
                    onChange={e => handleUpdateCustomRow(idx, "targetText", e.target.value)}
                    placeholder="Gõ mục tiêu riêng chi tiết của em..."
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                      readOnly ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 focus:border-teal-500"
                    }`}
                  />
                </div>

                {/* Input Actions */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-amber-900 block">
                    Em sẽ làm gì để đạt được mục tiêu này (Hành động cụ thể):
                  </label>
                  <textarea
                    rows={2}
                    readOnly={readOnly}
                    value={item.actionText}
                    onChange={e => handleUpdateCustomRow(idx, "actionText", e.target.value)}
                    placeholder="Các bước hành động cụ thể em sẽ làm..."
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                      readOnly ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed" : "bg-white border-slate-300 focus:border-amber-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddCustomRow}
            className="w-full py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-black border border-dashed border-teal-300 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-teal-600" />
            <span>+ Thêm 1 mục tiêu cụ thể khác</span>
          </button>
        )}
      </div>
    </div>
  )
}
