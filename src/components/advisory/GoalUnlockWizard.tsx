"use client"

import { useState, useMemo } from "react"
import {
  Key, CheckCircle2, ChevronRight, ChevronLeft, ArrowRight,
  ShieldCheck, AlertCircle, Sparkles, BookOpen, Clock, Heart,
  Compass, UserCheck, Check, Info, Loader2, HelpCircle
} from "lucide-react"

export interface Stage1GoalItem {
  id?: string
  category: string
  targetText: string
  deadline?: string
  status?: string
}

export interface GoalUnlockWizardProps {
  goals?: Stage1GoalItem[]
  stage1Goals?: Stage1GoalItem[]
  studentId: string
  academicYearId?: string
  goalSheetId?: string
  onUnlockSuccess?: (unlockData: any) => void
  onFinish?: (unlockData: any) => void
  onCancel?: () => void
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; badgeColor: string }> = {
  HOC_TAP: {
    label: "Mục tiêu học tập",
    icon: BookOpen,
    color: "text-sky-700 bg-sky-50 border-sky-200",
    badgeColor: "bg-sky-100 text-sky-800"
  },
  THOI_QUEN: {
    label: "Mục tiêu thói quen",
    icon: Clock,
    color: "text-amber-700 bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800"
  },
  KY_NANG_CAM_XUC: {
    label: "Mục tiêu kỹ năng, cảm xúc",
    icon: Heart,
    color: "text-rose-700 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-100 text-rose-800"
  },
  DINH_HUONG: {
    label: "Mục tiêu định hướng",
    icon: Compass,
    color: "text-purple-700 bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800"
  }
}

const CURRENT_STATES = [
  {
    key: "STILL_COMMITTED",
    title: "Vẫn muốn thực hiện",
    desc: "Em vẫn muốn đạt mục tiêu và muốn tiếp tục thực hiện.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotClass: "bg-emerald-500"
  },
  {
    key: "STALLED",
    title: "Đang chững lại",
    desc: "Em đã bắt đầu nhưng hiện tại chưa tiến triển như mong muốn.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500"
  },
  {
    key: "NOT_STARTED",
    title: "Chưa biết bắt đầu từ đâu",
    desc: "Em đã có mục tiêu nhưng chưa biết việc đầu tiên nên làm là gì.",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-300",
    dotClass: "bg-sky-500"
  }
]

const BARRIER_OPTIONS = [
  { key: "NOT_KNOW_WHERE_TO_START", label: "Chưa biết bắt đầu từ đâu" },
  { key: "PROCRASTINATION", label: "Hay trì hoãn" },
  { key: "TIME_MANAGEMENT", label: "Chưa sắp xếp được thời gian" },
  { key: "INEFFECTIVE_METHOD", label: "Cách học/cách làm hiện tại chưa hiệu quả" },
  { key: "GOAL_TOO_BIG", label: "Mục tiêu có vẻ quá lớn" },
  { key: "LACK_MOTIVATION", label: "Thiếu động lực" },
  { key: "PRESSURE", label: "Áp lực" },
  { key: "FEAR_OF_FAILURE", label: "Lo lắng hoặc sợ thất bại" },
  { key: "LACK_SUPPORT", label: "Thiếu người hỗ trợ" },
  { key: "GOAL_NOT_FIT", label: "Mục tiêu hiện tại chưa còn phù hợp" },
  { key: "OTHER", label: "Khác (tự nhập nội dung bên dưới)" }
]

const KEYS_CATALOG = [
  {
    key: "FIND_REASON",
    title: "TÌM LẠI LÝ DO",
    desc: "Khi em biết mục tiêu nhưng không còn thấy đủ ý nghĩa hoặc động lực để tiếp tục.",
    triggerBarriers: ["LACK_MOTIVATION", "PRESSURE", "FEAR_OF_FAILURE"]
  },
  {
    key: "CHANGE_METHOD",
    title: "ĐỔI CÁCH LÀM",
    desc: "Khi em đã cố gắng nhưng cách hiện tại chưa hiệu quả hoặc quá nặng.",
    triggerBarriers: ["INEFFECTIVE_METHOD", "TIME_MANAGEMENT", "PROCRASTINATION"]
  },
  {
    key: "START_SMALL",
    title: "BẮT ĐẦU THẬT NHỎ",
    desc: "Khi mục tiêu quá lớn hoặc em chưa biết bắt đầu từ đâu.",
    triggerBarriers: ["GOAL_TOO_BIG", "NOT_KNOW_WHERE_TO_START", "PROCRASTINATION"]
  },
  {
    key: "FIND_COMPANION",
    title: "TÌM NGƯỜI ĐỒNG HÀNH",
    desc: "Khi em cần người nhắc nhở, hỗ trợ hoặc cùng thực hiện.",
    triggerBarriers: ["LACK_SUPPORT", "FEAR_OF_FAILURE", "PRESSURE"]
  },
  {
    key: "ADJUST_GOAL",
    title: "ĐIỀU CHỈNH MỤC TIÊU",
    desc: "Khi mục tiêu hoặc cách tiếp cận hiện tại không còn phù hợp.",
    triggerBarriers: ["GOAL_NOT_FIT", "GOAL_TOO_BIG"]
  }
]

const TIMING_OPTIONS = [
  "Buổi sáng (trước giờ học)",
  "Sau giờ học tại trường",
  "Buổi tối (sau bữa ăn)",
  "Cuối tuần (Thứ 7 & Chủ Nhật)",
  "Linh hoạt trong ngày"
]

const COMPANION_OPTIONS = [
  "Tôi tự thực hiện",
  "Bạn bè cùng lớp",
  "Cố vấn học tập / GVCN",
  "Giáo viên bộ môn",
  "Ba mẹ / Người thân",
  "Khác"
]

export function GoalUnlockWizard({ goals, stage1Goals, studentId, academicYearId, goalSheetId, onUnlockSuccess, onFinish, onCancel }: GoalUnlockWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Step 1 State: Chosen Goal
  const [selectedGoalId, setSelectedGoalId] = useState<string>("")
  
  // Step 2 State: Current State
  const [currentState, setCurrentState] = useState<string>("")

  // Step 3 State: Barriers
  const [selectedBarriers, setSelectedBarriers] = useState<string[]>([])
  const [otherBarrierText, setOtherBarrierText] = useState<string>("")

  // Step 4 State: Selected Key
  const [selectedKey, setSelectedKey] = useState<string>("")

  // Step 5 State: 7-Day Action
  const [sevenDayAction, setSevenDayAction] = useState<string>("")
  const [actionTiming, setActionTiming] = useState<string>(TIMING_OPTIONS[2])
  const [companion, setCompanion] = useState<string>(COMPANION_OPTIONS[0])

  // Normalized Goals List
  const normalizedGoals = useMemo(() => {
    const list = goals || stage1Goals || []
    if (!Array.isArray(list)) return []
    return list.map((g, idx) => ({
      ...g,
      id: g.id || `goal-${idx}-${(g.targetText || '').slice(0, 10)}`,
      category: g.category || "HOC_TAP",
      targetText: g.targetText || ""
    }))
  }, [goals, stage1Goals])

  // Selected Goal Object
  const selectedGoal = useMemo(() => {
    if (!normalizedGoals || !Array.isArray(normalizedGoals)) return null
    return normalizedGoals.find(g => g.id === selectedGoalId) || null
  }, [normalizedGoals, selectedGoalId])

  // Suggested Key based on Step 3 barriers
  const suggestedKeys = useMemo(() => {
    const matched = new Set<string>()
    selectedBarriers.forEach(b => {
      KEYS_CATALOG.forEach(k => {
        if (k.triggerBarriers.includes(b)) {
          matched.add(k.key)
        }
      })
    })
    return Array.from(matched)
  }, [selectedBarriers])

  // Toggle barrier selection (max 3)
  function handleToggleBarrier(key: string) {
    if (selectedBarriers.includes(key)) {
      setSelectedBarriers(selectedBarriers.filter(k => k !== key))
    } else {
      if (selectedBarriers.length >= 3) {
        alert("Em chỉ được chọn tối đa 3 trở ngại chính lúc này.")
        return
      }
      setSelectedBarriers([...selectedBarriers, key])
    }
  }

  // Handle Submit
  async function handleSubmit() {
    if (!selectedGoalId || !selectedGoal) {
      alert("Vui lòng chọn 1 mục tiêu ở Bước 1.")
      setCurrentStep(1)
      return
    }
    if (!currentState) {
      alert("Vui lòng chọn trạng thái hiện tại ở Bước 2.")
      setCurrentStep(2)
      return
    }
    if (!selectedKey) {
      alert("Vui lòng chọn 1 chìa khóa ở Bước 4.")
      setCurrentStep(4)
      return
    }
    if (!sevenDayAction.trim()) {
      alert("Vui lòng nhập hành động cụ thể cho 7 ngày tới ở Bước 5.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        studentId,
        academicYearId,
        goalId: selectedGoalId,
        targetCategory: selectedGoal.category,
        targetText: selectedGoal.targetText,
        currentState,
        barriers: selectedBarriers,
        otherBarrier: otherBarrierText.trim(),
        selectedKey,
        sevenDayAction: sevenDayAction.trim(),
        actionTiming,
        companion,
        needSupport: companion.includes("Cố vấn") || companion.includes("GVCN") || companion.includes("Giáo viên")
      }

      const res = await fetch("/api/advisory/goals/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const callback = onUnlockSuccess || onFinish
        if (callback) callback(data.activeUnlock || data)
      } else {
        alert(data.error || "Có lỗi xảy ra khi mở khóa mục tiêu.")
      }
    } catch (e: any) {
      console.error(e)
      alert("Lỗi kết nối: " + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 duration-300">
      
      {/* Wizard Header Stepper */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-teal-800 p-6 text-white">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-teal-200">
              <Key className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide">
                Giai đoạn 2: Mở Khóa Mục Tiêu (7-Day Sprint)
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                Tập trung thực hiện mục tiêu cụ thể bằng các hành động nhỏ trong 7 ngày tới
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black bg-white/15 px-3 py-1 rounded-full text-teal-100 border border-white/20">
              Bước {currentStep} / 5
            </span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {[
            { step: 1, label: "1. Chọn mục tiêu" },
            { step: 2, label: "2. Trạng thái" },
            { step: 3, label: "3. Trở ngại" },
            { step: 4, label: "4. Chìa khóa" },
            { step: 5, label: "5. Hành động 7 ngày" }
          ].map((s) => (
            <div key={s.step} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  currentStep >= s.step ? "bg-amber-400" : "bg-white/20"
                }`}
              />
              <span className={`text-[10px] font-bold block truncate ${
                currentStep === s.step ? "text-amber-300 font-black" : "text-teal-200/70"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Content Body */}
      <div className="p-6 sm:p-8 space-y-6">

        {/* ========================================================================= */}
        {/* BƯỚC 1 – CHỌN MỤC TIÊU */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Mục tiêu nào em muốn tập trung vào lúc này?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Chọn 01 mục tiêu em đã đề ra ở Giai đoạn 1 để bắt đầu chu kỳ mở khóa hành động 7 ngày.
              </p>
            </div>

            {normalizedGoals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Chưa tìm thấy mục tiêu nào từ Giai đoạn 1.</p>
                <p className="text-[11px] text-slate-400">Vui lòng hoàn thành và gửi Phiếu Mục Tiêu Năm Học trước khi mở khóa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {normalizedGoals.map((g, idx) => {
                  const meta = CATEGORY_META[g.category] || CATEGORY_META.HOC_TAP
                  const Icon = meta.icon
                  const isSelected = selectedGoalId === g.id

                  return (
                    <div
                      key={g.id || idx}
                      onClick={() => setSelectedGoalId(g.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? "border-[#003B3A] bg-teal-50/70 shadow-md ring-2 ring-teal-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${meta.badgeColor}`}>
                            <Icon className="w-3 h-3" />
                            <span>{meta.label}</span>
                          </span>

                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-[#003B3A] bg-[#003B3A] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <p className="text-xs font-black text-slate-900 leading-snug">
                          {g.targetText}
                        </p>
                      </div>

                      {g.deadline && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          Thời hạn: {g.deadline}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 2 – TRẠNG THÁI HIỆN TẠI */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Hiện tại em đang ở đâu với mục tiêu này?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Mục tiêu đã chọn: <strong className="text-teal-900">{selectedGoal?.targetText}</strong>
              </p>
            </div>

            <div className="space-y-3">
              {CURRENT_STATES.map((st) => {
                const isSelected = currentState === st.key

                return (
                  <div
                    key={st.key}
                    onClick={() => setCurrentState(st.key)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                      isSelected
                        ? "border-[#003B3A] bg-teal-50/70 shadow-md ring-2 ring-teal-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                      isSelected ? "border-[#003B3A] bg-[#003B3A] text-white" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                        <h4 className="text-xs font-black text-slate-900">{st.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{st.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 3 – NHẬN DIỆN TRỞ NGẠI */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">
                  Điều gì đang khiến em khó bắt đầu hoặc khó tiếp tục?
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Đã chọn {selectedBarriers.length}/3
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Chọn tối đa 3 trở ngại lớn nhất lúc này để hệ thống gợi ý chìa khóa giải quyết phù hợp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BARRIER_OPTIONS.map((item) => {
                const isSelected = selectedBarriers.includes(item.key)

                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleBarrier(item.key)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? "border-teal-700 bg-teal-50/80 text-teal-950 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-semibold text-xs"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs leading-snug">{item.label}</span>
                  </div>
                )
              })}
            </div>

            {selectedBarriers.includes("OTHER") && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in-50">
                <label className="block text-xs font-black text-slate-800">
                  Nhập trở ngại khác của em:
                </label>
                <textarea
                  rows={2}
                  value={otherBarrierText}
                  onChange={(e) => setOtherBarrierText(e.target.value)}
                  placeholder="Chia sẻ ngắn gọn trở ngại cụ thể em đang gặp phải..."
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-xs font-medium outline-none focus:border-teal-600"
                />
              </div>
            )}

            {/* Privacy note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <p className="text-[11px] font-medium leading-relaxed">
                Nội dung này giúp em tìm cách thực hiện phù hợp. Em không phải chia sẻ trước lớp.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 4 – CHÌA KHÓA CỦA TÔI */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Chìa khóa nào phù hợp nhất với em lúc này?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Dựa trên trở ngại đã chọn, hệ thống có gợi ý chìa khóa phù hợp, tuy nhiên em có toàn quyền chọn chìa khóa em thấy thoải mái nhất.
              </p>
            </div>

            <div className="space-y-3">
              {KEYS_CATALOG.map((k) => {
                const isSelected = selectedKey === k.key
                const isSuggested = suggestedKeys.includes(k.key)

                return (
                  <div
                    key={k.key}
                    onClick={() => setSelectedKey(k.key)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                      isSelected
                        ? "border-[#003B3A] bg-teal-50/80 shadow-md ring-2 ring-teal-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? "border-[#003B3A] bg-[#003B3A] text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            {k.title}
                          </h4>
                          {isSuggested && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                              Gợi ý phù hợp
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {k.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BƯỚC 5 – HÀNH ĐỘNG 7 NGÀY */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Trong 7 ngày tới, em sẽ thử làm một việc nhỏ nào?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Thiết lập một hành động cụ thể, khả thi và đo lường được trong tuần tới để bắt đầu mở khóa mục tiêu.
              </p>
            </div>

            {/* Action Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800">
                Việc tôi sẽ thử trong 7 ngày tới: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={sevenDayAction}
                onChange={(e) => setSevenDayAction(e.target.value)}
                placeholder="Ví dụ: Sau bữa tối, em học 10 từ tiếng Anh trong 15 phút vào thứ 2, 4 và 6."
                className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 text-xs font-medium focus:border-teal-600 outline-none leading-relaxed"
              />
            </div>

            {/* Timing & Companion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Thời điểm thực hiện:
                </label>
                <select
                  value={actionTiming}
                  onChange={(e) => setActionTiming(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold outline-none"
                >
                  {TIMING_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Người có thể đồng hành / hỗ trợ:
                </label>
                <select
                  value={companion}
                  onChange={(e) => setCompanion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold outline-none"
                >
                  {COMPANION_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Support Flag Notice */}
            {(companion.includes("Cố vấn") || companion.includes("GVCN") || companion.includes("Giáo viên")) && (
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Hệ thống sẽ gửi thông báo và đánh dấu <strong>Cần hỗ trợ</strong> đến Thầy Cô GVCN / Cố Vấn Học Tập của lớp để đồng hành cùng em.
                </span>
              </div>
            )}

            {/* Summary preview of 7-day window */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-500 block text-[11px]">Thời gian chu kỳ 7 ngày:</span>
                <span className="font-extrabold text-slate-900">
                  {new Date().toLocaleDateString("vi-VN")} — {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-black">
                Sprint 7 ngày
              </span>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all"
              >
                Hủy
              </button>
            ) : null}
          </div>

          <div>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !selectedGoalId) {
                    alert("Vui lòng chọn 1 mục tiêu để tiếp tục.")
                    return
                  }
                  if (currentStep === 2 && !currentState) {
                    alert("Vui lòng chọn trạng thái hiện tại của em.")
                    return
                  }
                  if (currentStep === 4 && !selectedKey) {
                    alert("Vui lòng chọn 1 chìa khóa phù hợp.")
                    return
                  }
                  setCurrentStep(currentStep + 1)
                }}
                className="px-6 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black transition-all flex items-center gap-2 shadow-xs"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-teal-700 to-[#003B3A] hover:from-teal-800 hover:to-[#002D2C] text-white text-xs font-black transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu mở khóa...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-amber-300" />
                    <span>MỞ KHÓA MỤC TIÊU</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
