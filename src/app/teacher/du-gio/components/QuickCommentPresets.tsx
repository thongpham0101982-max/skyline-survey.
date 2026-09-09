"use client"

import React, { useState } from "react"
import { Sparkles, Plus, Check, RotateCcw, Save } from "lucide-react"

interface QuickCommentPresetsProps {
  isPreschool?: boolean
  onAddStrength: (text: string) => void
  onAddImprovement: (text: string) => void
  draftSavedAt?: Date | null
  onRestoreDraft?: () => void
  hasDraft?: boolean
}

const K12_STRENGTH_PRESETS = [
  "Chuẩn bị kế hoạch bài dạy công phu, bám sát yêu cầu cần đạt (YCCĐ) theo CTGDPT 2018.",
  "Ứng dụng CNTT và học liệu số sinh động, kích thích sự hứng thú và tò mò của học sinh.",
  "Tổ chức hoạt động nhóm hiệu quả, phát huy tính tích cực và năng lực tự học của học sinh.",
  "Tác phong sư phạm chuẩn mực, bao quát lớp tốt, xử lý linh hoạt các tình huống sư phạm.",
  "Phương pháp đặt câu hỏi phân hóa tốt, tạo cơ hội cho mọi đối tượng học sinh tham gia phát biểu."
]

const K12_IMPROVEMENT_PRESETS = [
  "Cần chú ý phân bổ thời gian hợp lý hơn ở phần củng cố, luyện tập và vận dụng.",
  "Tăng cường hỗ trợ và động viên thêm các em học sinh còn nhút nhát hoặc tiếp thu chậm.",
  "Nên liên hệ thực tiễn phong phú, gần gũi hơn với đời sống thực tế của học sinh.",
  "Điều chỉnh âm lượng và tốc độ giảng dạy phù hợp hơn với không gian lớp học.",
  "Cần tạo thêm thời gian để học sinh tự nhận xét, đánh giá chéo sản phẩm của nhau."
]

const MAMNON_STRENGTH_PRESETS = [
  "Chuẩn bị đồ dùng, học cụ trực quan đẹp mắt, phong phú và an toàn cho trẻ.",
  "Tác phong cô giáo nhẹ nhàng, ân cần, gần gũi, tạo không khí lớp học vui vẻ, ấm áp.",
  "Trẻ rất hứng thú, tích cực tham gia các góc hoạt động và thực hành trải nghiệm.",
  "Tổ chức chuyển tiếp giữa các hoạt động linh hoạt, nhịp nhàng và tự nhiên.",
  "Bao quát tốt toàn bộ trẻ trong lớp, kịp thời khích lệ, động viên và khen ngợi trẻ."
]

const MAMNON_IMPROVEMENT_PRESETS = [
  "Nên tạo thêm cơ hội để trẻ được tự do trải nghiệm, thao tác thay vì giáo viên làm hộ.",
  "Phân bổ thời gian giữa hoạt động tĩnh và hoạt động động hài hòa hơn.",
  "Cần chú ý hơn đến khoảng cách và vị trí ngồi của trẻ khi quan sát vật mẫu.",
  "Tăng cường đàm thoại mở để kích thích tư duy và phát triển ngôn ngữ cho trẻ.",
  "Rèn luyện thêm nền nếp tự phục vụ và cất dọn đồ chơi sau khi chơi xong."
]

export function QuickCommentPresets({
  isPreschool = false,
  onAddStrength,
  onAddImprovement,
  draftSavedAt,
  onRestoreDraft,
  hasDraft = false
}: QuickCommentPresetsProps) {
  const [activePresetTab, setActivePresetTab] = useState<"strength" | "improvement">("strength")

  const strengths = isPreschool ? MAMNON_STRENGTH_PRESETS : K12_STRENGTH_PRESETS
  const improvements = isPreschool ? MAMNON_IMPROVEMENT_PRESETS : K12_IMPROVEMENT_PRESETS

  return (
    <div className="p-4 bg-gradient-to-r from-teal-50/70 via-sky-50/50 to-amber-50/60 rounded-2xl border border-teal-200/80 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
            {isPreschool ? "Gợi ý nhận xét mẫu (Mầm non)" : "Gợi ý nhận xét mẫu (K-12)"}
          </span>
        </div>

        {/* Auto-save / Restore Draft Indicator */}
        <div className="flex items-center gap-2">
          {draftSavedAt && (
            <span className="text-[10px] font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs flex items-center gap-1">
              <Save className="w-3 h-3 text-teal-600" />
              <span>Đã lưu nháp lúc {draftSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </span>
          )}
          {hasDraft && onRestoreDraft && (
            <button
              type="button"
              onClick={onRestoreDraft}
              className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục bản nháp</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-teal-200/50 pb-2">
        <button
          type="button"
          onClick={() => setActivePresetTab("strength")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePresetTab === "strength"
              ? "bg-teal-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-white/80"
          }`}
        >
          ✨ Ưu điểm nổi bật ({strengths.length})
        </button>
        <button
          type="button"
          onClick={() => setActivePresetTab("improvement")}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePresetTab === "improvement"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-white/80"
          }`}
        >
          💡 Góp ý phát triển ({improvements.length})
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap gap-1.5">
        {(activePresetTab === "strength" ? strengths : improvements).map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (activePresetTab === "strength") {
                onAddStrength(preset)
              } else {
                onAddImprovement(preset)
              }
            }}
            className="text-[11px] font-medium text-slate-700 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 text-left cursor-pointer group"
          >
            <Plus className="w-3 h-3 text-teal-600 group-hover:scale-125 transition-transform shrink-0" />
            <span>{preset}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
