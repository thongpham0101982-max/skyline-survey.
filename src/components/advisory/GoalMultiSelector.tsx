"use client"

import React from "react"
import { Check, Sparkles, Lightbulb, Plus, Trash2, Edit3, Users, Heart } from "lucide-react"

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
  teacherSupport?: string
  parentSupport?: string
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
  customItems = [{ targetText: "", actionText: "", teacherSupport: "", parentSupport: "" }],
  onCustomItemsChange,
  readOnly = false
}: GoalMultiSelectorProps) {
  const catPresets = presets.filter(p => p.category === categoryKey && p.status !== "INACTIVE")

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

  const selectedPresets = presets.filter(p => selectedPresetIds.includes(p.id))

  const handleAddCustomRow = () => {
    if (readOnly) return
    onCustomItemsChange([...customItems, { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" }])
  }

  const handleRemoveCustomRow = (idx: number) => {
    if (readOnly) return
    onCustomItemsChange(customItems.filter((_, i) => i !== idx))
  }

  const handleUpdateCustomRow = (idx: number, field: keyof CustomGoalItem, val: string) => {
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
            {customItems.filter(i => i.targetText.trim()).length} mục tiêu đã điền
          </span>
        </div>
      </div>

      {/* NỘI DUNG MỤC TIÊU CỤ THỂ CỦA EM (ĐI KÈM HÀNH ĐỘNG & NỘI DUNG HỖ TRỢ) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-amber-500" />
            <span>NỘI DUNG MỤC TIÊU CỤ THỂ CỦA EM (ĐI KÈM HÀNH ĐỘNG & NỘI DUNG HỖ TRỢ):</span>
          </label>
          <span className="text-[10px] text-slate-400 font-medium">
            ({customItems.length} mục tiêu bổ sung)
          </span>
        </div>

        <div className="space-y-4">
          {customItems.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-medium text-center">
              Chưa có mục tiêu cá nhân tự gõ. Nhấn nút <strong>"+ Thêm 1 mục tiêu cụ thể mới"</strong> bên dưới để bổ sung mục tiêu riêng của em.
            </div>
          )}
          {customItems.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50/90 border-2 border-slate-200 space-y-3.5 relative group">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] font-black text-teal-800 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>Mục tiêu cụ thể #{idx + 1}</span>
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

              {/* Row 1: Target Text & Action Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              {/* Row 2: Support Questions (Teacher & Parent Support per specific goal item) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-teal-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Em mong muốn Thầy Cô / bạn bè hỗ trợ mình như thế nào?</span>
                  </label>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={item.teacherSupport || ""}
                    onChange={e => handleUpdateCustomRow(idx, "teacherSupport", e.target.value)}
                    placeholder="Thầy cô/bạn bè hỗ trợ em..."
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                      readOnly ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed" : "border-teal-200 bg-white focus:border-teal-500"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-amber-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-amber-600" />
                    <span>Em mong muốn Ba Mẹ hỗ trợ mình như thế nào?</span>
                  </label>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={item.parentSupport || ""}
                    onChange={e => handleUpdateCustomRow(idx, "parentSupport", e.target.value)}
                    placeholder="Ba mẹ hỗ trợ em..."
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                      readOnly ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed" : "border-amber-200 bg-white focus:border-amber-500"
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
