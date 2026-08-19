"use client"

import React from "react"
import { Plus, Trash2, Edit3, Users, Heart, Target, Sparkles, Compass } from "lucide-react"

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
  customItems: CustomGoalItem[]
  onCustomItemsChange: (items: CustomGoalItem[]) => void
  readOnly?: boolean
}

export function GoalMultiSelector({
  categoryKey,
  categoryTitle,
  categoryHint,
  customItems = [{ targetText: "", actionText: "", teacherSupport: "", parentSupport: "" }],
  onCustomItemsChange,
  readOnly = false
}: GoalMultiSelectorProps) {

  const themeMap: Record<string, {
    border: string
    badgeBg: string
    badgeText: string
    iconColor: string
    focusBorder: string
    numberBadge: string
    icon: any
  }> = {
    HOC_TAP: {
      border: "border-sky-200 hover:border-sky-300",
      badgeBg: "bg-sky-50 border-sky-200",
      badgeText: "text-sky-800",
      iconColor: "text-sky-600",
      focusBorder: "focus:border-sky-500 focus:ring-sky-500/20",
      numberBadge: "bg-sky-600 text-white",
      icon: Target
    },
    THOI_QUEN: {
      border: "border-emerald-200 hover:border-emerald-300",
      badgeBg: "bg-emerald-50 border-emerald-200",
      badgeText: "text-emerald-800",
      iconColor: "text-emerald-600",
      focusBorder: "focus:border-emerald-500 focus:ring-emerald-500/20",
      numberBadge: "bg-emerald-600 text-white",
      icon: Sparkles
    },
    KY_NANG_CAM_XUC: {
      border: "border-purple-200 hover:border-purple-300",
      badgeBg: "bg-purple-50 border-purple-200",
      badgeText: "text-purple-800",
      iconColor: "text-purple-600",
      focusBorder: "focus:border-purple-500 focus:ring-purple-500/20",
      numberBadge: "bg-purple-600 text-white",
      icon: Heart
    },
    DINH_HUONG: {
      border: "border-amber-200 hover:border-amber-300",
      badgeBg: "bg-amber-50 border-amber-200",
      badgeText: "text-amber-900",
      iconColor: "text-amber-600",
      focusBorder: "focus:border-amber-500 focus:ring-amber-500/20",
      numberBadge: "bg-amber-600 text-white",
      icon: Compass
    }
  }

  const theme = themeMap[categoryKey] || themeMap.HOC_TAP
  const CategoryIcon = theme.icon

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

  const filledCount = customItems.filter(i => i.targetText.trim()).length

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 border-2 ${theme.border} shadow-xs hover:shadow-md transition-all space-y-5`}>
      {/* Category Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-2xl ${theme.badgeBg} ${theme.iconColor} shrink-0 shadow-2xs`}>
            <CategoryIcon className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{categoryTitle}</span>
            </h3>
            {categoryHint && (
              <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                💡 {categoryHint}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1.5 ${theme.badgeBg} ${theme.badgeText} border rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-2xs`}>
            <Edit3 className="w-3.5 h-3.5" />
            <span>{filledCount} mục tiêu đã điền</span>
          </span>
        </div>
      </div>

      {/* Goal Items List */}
      <div className="space-y-4">
        {customItems.length === 0 && (
          <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 text-xs font-medium text-center space-y-1">
            <p className="font-bold text-slate-500">Chưa có mục tiêu cá nhân nào trong nhóm này</p>
            <p>Nhấn nút <strong>"+ Thêm 1 mục tiêu cụ thể khác"</strong> bên dưới để viết mục tiêu của em.</p>
          </div>
        )}

        {customItems.map((item, idx) => (
          <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border-2 border-slate-200/90 space-y-4 relative transition-all hover:bg-slate-50 hover:border-slate-300">
            {/* Header of Item Row */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full ${theme.numberBadge} text-[11px] flex items-center justify-center font-black shrink-0 shadow-2xs`}>
                  {idx + 1}
                </span>
                <span>MỤC TIÊU CỤ THỂ #{idx + 1}</span>
              </span>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveCustomRow(idx)}
                  className="text-rose-500 hover:text-rose-700 text-xs font-black px-2.5 py-1 rounded-xl hover:bg-rose-50 flex items-center gap-1 transition-all border border-transparent hover:border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa dòng này</span>
                </button>
              )}
            </div>

            {/* Row 1: Target Text & Action Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <span>🎯 Nội dung mục tiêu cụ thể của em:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  readOnly={readOnly}
                  value={item.targetText}
                  onChange={e => handleUpdateCustomRow(idx, "targetText", e.target.value)}
                  placeholder="Ví dụ: Đạt điểm TBM Toán từ 8.5 trở lên trong Học kỳ 1..."
                  className={`w-full p-3 rounded-xl border text-xs font-semibold focus:outline-none transition-all shadow-2xs ${
                    readOnly
                      ? "bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed"
                      : `bg-white border-slate-300 focus:ring-2 ${theme.focusBorder}`
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                  <span>⚡ Em sẽ làm gì để đạt được mục tiêu này (Hành động cụ thể):</span>
                </label>
                <textarea
                  rows={2}
                  readOnly={readOnly}
                  value={item.actionText}
                  onChange={e => handleUpdateCustomRow(idx, "actionText", e.target.value)}
                  placeholder="Ví dụ: Ôn tập lại kiến thức 30 phút mỗi ngày sau giờ học..."
                  className={`w-full p-3 rounded-xl border text-xs font-semibold focus:outline-none transition-all shadow-2xs ${
                    readOnly
                      ? "bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed"
                      : "bg-white border-slate-300 focus:ring-2 focus:border-amber-500 focus:ring-amber-500/20"
                  }`}
                />
              </div>
            </div>

            {/* Row 2: Support Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-teal-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Em mong muốn Thầy Cô / bạn bè hỗ trợ mình như thế nào?</span>
                </label>
                <input
                  type="text"
                  readOnly={readOnly}
                  value={item.teacherSupport || ""}
                  onChange={e => handleUpdateCustomRow(idx, "teacherSupport", e.target.value)}
                  placeholder="Ví dụ: Thầy Cô hướng dẫn thêm các bài tập toán nâng cao..."
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all shadow-2xs ${
                    readOnly
                      ? "bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed"
                      : "bg-white border-teal-200 focus:ring-2 focus:border-teal-500 focus:ring-teal-500/20"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Em mong muốn Ba Mẹ hỗ trợ mình như thế nào?</span>
                </label>
                <input
                  type="text"
                  readOnly={readOnly}
                  value={item.parentSupport || ""}
                  onChange={e => handleUpdateCustomRow(idx, "parentSupport", e.target.value)}
                  placeholder="Ví dụ: Ba mẹ nhắc nhở em đi ngủ đúng giờ và giữ yên tĩnh góc học tập..."
                  className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all shadow-2xs ${
                    readOnly
                      ? "bg-slate-100/90 text-slate-700 border-slate-200 cursor-not-allowed"
                      : "bg-white border-amber-200 focus:ring-2 focus:border-amber-500 focus:ring-amber-500/20"
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
          className={`w-full py-3 rounded-2xl ${theme.badgeBg} hover:opacity-90 ${theme.badgeText} text-xs font-black border-2 border-dashed ${theme.border} flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer hover:scale-[1.005] active:scale-[0.995]`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Thêm 1 mục tiêu cụ thể khác trong nhóm này</span>
        </button>
      )}
    </div>
  )
}
