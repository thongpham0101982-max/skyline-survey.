"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, CheckCircle2, Heart, ShieldCheck, Send, Lock, Plus, Trash2, Edit3, User, BookOpen, Clock, Smile, Award, Star, Trophy, ThumbsUp, Zap, Gift } from "lucide-react"

export interface K1GoalData {
  category: "HOC_TAP" | "THOI_QUEN" | "KY_NANG_CAM_XUC" | "DINH_HUONG"
  targetText: string
  actionText: string
  teacherSupportRequest?: string
  parentSupportRequest?: string
}

interface K1GoalFormProps {
  studentName: string
  className?: string
  academicYear?: string
  initialGoals?: K1GoalData[]
  initialCommitment?: string
  initialFingerprint?: boolean
  isSubmitted?: boolean
  submittedAt?: string | null
  onSave: (data: { goals: K1GoalData[]; studentCommitment: string; fingerprintStamped: boolean }) => Promise<void>
  saving?: boolean
}

// Preset options directly extracted from Sky-Line official Grade 1 printed form with playful kid-friendly icons & themes
export const K1_PRESETS = [
  {
    category: "HOC_TAP",
    title: "1. Mục tiêu học tập",
    subtitle: "Học giỏi & Chăm ngoan",
    icon: "📚",
    badge: "Bút thần kỳ",
    color: "sky",
    theme: {
      border: "border-sky-300 hover:border-sky-400",
      bgHeader: "bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 text-white",
      cardBg: "bg-sky-50/70",
      pill: "bg-white text-slate-800 border-sky-200 hover:border-sky-400 hover:bg-sky-50",
      activePill: "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-blue-600 shadow-md scale-[1.02]"
    },
    targets: [
      "Hoàn thành bài tập đầy đủ",
      "Mạnh dạn phát biểu",
      "Đọc to, rõ ràng và tự tin",
      "Viết chữ đúng, đẹp",
      "Đạt kết quả tốt các môn học"
    ],
    actions: [
      "Tự giác học tập, làm bài",
      "Tích cực phát biểu",
      "Chăm chỉ luyện đọc, luyện viết mỗi ngày ít nhất 15 phút",
      "Làm bài đầy đủ, cẩn thận"
    ]
  },
  {
    category: "THOI_QUEN",
    title: "2. Mục tiêu thói quen / sức khỏe",
    subtitle: "Dậy sớm & Khoẻ mạnh",
    icon: "⏰",
    badge: "Đồng hồ thông minh",
    color: "emerald",
    theme: {
      border: "border-emerald-300 hover:border-emerald-400",
      bgHeader: "bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-white",
      cardBg: "bg-emerald-50/70",
      pill: "bg-white text-slate-800 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50",
      activePill: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-teal-600 shadow-md scale-[1.02]"
    },
    targets: [
      "Đi học đúng giờ.",
      "Chuẩn bị đầy đủ đồ dùng, sách vở",
      "Tự giác làm bài",
      "Đọc sách mỗi ngày"
    ],
    actions: [
      "Đi ngủ sớm và dậy đúng giờ",
      "Tự chuẩn bị cặp sách và sắp xếp gọn gàng. Luyện đọc 1 bài/ngày",
      "Hoàn thành các nhiệm vụ học tập"
    ]
  },
  {
    category: "KY_NANG_CAM_XUC",
    title: "3. Mục tiêu kĩ năng / sở thích",
    icon: "🎨",
    color: "purple",
    badge: "Họa sĩ nhí",
    subtitle: "Tự tin & Năng động",
    theme: {
      border: "border-purple-300 hover:border-purple-400",
      bgHeader: "bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 text-white",
      cardBg: "bg-purple-50/70",
      pill: "bg-white text-slate-800 border-purple-200 hover:border-purple-400 hover:bg-purple-50",
      activePill: "bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-fuchsia-600 shadow-md scale-[1.02]"
    },
    targets: [
      "Tự tin giao tiếp",
      "Tự phục vụ bản thân",
      "Hợp tác với bạn",
      "Tự tin tham gia CLB/cuộc thi",
      "Học thêm một kĩ năng mới"
    ],
    actions: [
      "Mạnh dạn chào hỏi, trò chuyện với thầy cô, bạn bè.",
      "Biết lắng nghe, chia sẻ và hợp tác với bạn để hoàn thành nhiệm vụ",
      "Tham gia ít nhất 1 cuộc thi/phong trào/CLB"
    ]
  },
  {
    category: "DINH_HUONG",
    title: "4. Mục tiêu phẩm chất",
    subtitle: "Lễ phép & Trung thực",
    icon: "⭐",
    badge: "Bé ngoan Sky-Line",
    color: "amber",
    theme: {
      border: "border-amber-300 hover:border-amber-400",
      bgHeader: "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white",
      cardBg: "bg-amber-50/70",
      pill: "bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:bg-amber-50",
      activePill: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-orange-600 shadow-md scale-[1.02]"
    },
    targets: [
      "Biết nói lời cảm ơn, xin lỗi",
      "Biết giúp đỡ bạn",
      "Lễ phép với thầy cô, người lớn",
      "Đoàn kết",
      "Trung thực"
    ],
    actions: [
      "Thực hành nói lời cảm ơn, xin lỗi đúng lúc",
      "Giao tiếp lịch sự, lễ phép. Vâng lời thầy cô, ba mẹ.",
      "Chơi vui vẻ với bạn, sẵn sàng giúp đỡ.",
      "Luôn nói thật, biết nhận lỗi và sửa sai."
    ]
  }
]

export function K1GoalForm({
  studentName,
  className = "",
  academicYear = "2026 - 2027",
  initialGoals = [],
  initialCommitment = "",
  initialFingerprint = false,
  isSubmitted = false,
  submittedAt = null,
  onSave,
  saving = false
}: K1GoalFormProps) {

  const [selectedTargets, setSelectedTargets] = useState<Record<string, string[]>>({
    HOC_TAP: [],
    THOI_QUEN: [],
    KY_NANG_CAM_XUC: [],
    DINH_HUONG: []
  })

  const [selectedActions, setSelectedActions] = useState<Record<string, string[]>>({
    HOC_TAP: [],
    THOI_QUEN: [],
    KY_NANG_CAM_XUC: [],
    DINH_HUONG: []
  })

  const [customGoals, setCustomGoals] = useState<Record<string, { targetText: string; actionText: string }[]>>({
    HOC_TAP: [],
    THOI_QUEN: [],
    KY_NANG_CAM_XUC: [],
    DINH_HUONG: []
  })

  const [studentCommitment, setStudentCommitment] = useState(initialCommitment)
  const [fingerprintStamped, setFingerprintStamped] = useState(initialFingerprint)
  const [showCelebrateEffect, setShowCelebrateEffect] = useState(false)

  useEffect(() => {
    if (initialGoals && initialGoals.length > 0) {
      const tgtMap: Record<string, string[]> = { HOC_TAP: [], THOI_QUEN: [], KY_NANG_CAM_XUC: [], DINH_HUONG: [] }
      const actMap: Record<string, string[]> = { HOC_TAP: [], THOI_QUEN: [], KY_NANG_CAM_XUC: [], DINH_HUONG: [] }
      const custMap: Record<string, { targetText: string; actionText: string }[]> = { HOC_TAP: [], THOI_QUEN: [], KY_NANG_CAM_XUC: [], DINH_HUONG: [] }

      initialGoals.forEach(g => {
        let cat = g.category
        if ((cat as string) === "THOI_QUEN_SUC_KHOE") cat = "THOI_QUEN"
        if ((cat as string) === "KY_NANG_SO_THICH" || (cat as string) === "PHAM_CHAT") cat = "KY_NANG_CAM_XUC"
        if (!tgtMap[cat]) cat = "HOC_TAP"

        const catConfig = K1_PRESETS.find(p => p.category === cat)
        const isPresetTarget = catConfig?.targets.includes(g.targetText)
        const isPresetAction = g.actionText && catConfig?.actions.includes(g.actionText)

        if (isPresetTarget && g.targetText) {
          if (!tgtMap[cat].includes(g.targetText)) tgtMap[cat].push(g.targetText)
        }
        if (isPresetAction && g.actionText) {
          if (!actMap[cat].includes(g.actionText)) actMap[cat].push(g.actionText)
        }
        if (!isPresetTarget && g.targetText) {
          custMap[cat].push({ targetText: g.targetText, actionText: g.actionText || "" })
        }
      })

      setSelectedTargets(tgtMap)
      setSelectedActions(actMap)
      setCustomGoals(custMap)
    }

    if (initialCommitment) setStudentCommitment(initialCommitment)
    setFingerprintStamped(Boolean(initialFingerprint))
  }, [initialGoals, initialCommitment, initialFingerprint])

  const toggleTarget = (category: string, targetText: string) => {
    if (isSubmitted) return
    setSelectedTargets(prev => {
      const list = prev[category] || []
      const updated = list.includes(targetText)
        ? list.filter(t => t !== targetText)
        : [...list, targetText]
      return { ...prev, [category]: updated }
    })
  }

  const toggleAction = (category: string, actionText: string) => {
    if (isSubmitted) return
    setSelectedActions(prev => {
      const list = prev[category] || []
      const updated = list.includes(actionText)
        ? list.filter(a => a !== actionText)
        : [...list, actionText]
      return { ...prev, [category]: updated }
    })
  }

  const addCustomGoalRow = (category: string) => {
    if (isSubmitted) return
    setCustomGoals(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), { targetText: "", actionText: "" }]
    }))
  }

  const updateCustomGoalRow = (category: string, index: number, field: "targetText" | "actionText", val: string) => {
    if (isSubmitted) return
    setCustomGoals(prev => {
      const list = [...(prev[category] || [])]
      list[index] = { ...list[index], [field]: val }
      return { ...prev, [category]: list }
    })
  }

  const removeCustomGoalRow = (category: string, index: number) => {
    if (isSubmitted) return
    setCustomGoals(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter((_, i) => i !== index)
    }))
  }

  const handleFingerprintTap = () => {
    if (isSubmitted) return
    const newState = !fingerprintStamped
    setFingerprintStamped(newState)
    if (newState) {
      setShowCelebrateEffect(true)
      setTimeout(() => setShowCelebrateEffect(false), 3000)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitted) return

    const goalsPayload: K1GoalData[] = []

    K1_PRESETS.forEach(p => {
      const cat = p.category as keyof typeof selectedTargets
      const tgts = selectedTargets[cat] || []
      const acts = selectedActions[cat] || []
      const custs = customGoals[cat] || []

      tgts.forEach((t, i) => {
        goalsPayload.push({
          category: cat as any,
          targetText: t,
          actionText: acts[i] || acts[0] || ""
        })
      })

      custs.forEach(c => {
        if (c.targetText.trim()) {
          goalsPayload.push({
            category: cat as any,
            targetText: c.targetText.trim(),
            actionText: c.actionText.trim()
          })
        }
      })
    })

    if (goalsPayload.length === 0) {
      alert("Bé ơi! Em hãy chạm bấm chọn ít nhất 1 mục tiêu nhé! 🐥")
      return
    }

    await onSave({
      goals: goalsPayload,
      studentCommitment: studentCommitment || "Em cam kết sẽ cố gắng thực hiện tốt các mục tiêu đã đề ra!",
      fingerprintStamped
    })
  }

  // Calculate total selected count for visual kid tracker
  const totalTgts = Object.values(selectedTargets).reduce((acc, l) => acc + l.length, 0) +
                   Object.values(customGoals).reduce((acc, l) => acc + l.filter(i => i.targetText.trim()).length, 0)

  return (
    <div className="max-w-5xl mx-auto bg-gradient-to-b from-sky-100 via-amber-50/50 to-teal-50 rounded-3xl border-4 border-sky-300 p-3 sm:p-7 shadow-2xl space-y-6 font-sans relative overflow-hidden">
      
      {/* Sparkle Confetti Effect overlay when fingerprint is stamped */}
      {showCelebrateEffect && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-teal-900/10 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white/95 p-6 rounded-3xl border-4 border-amber-400 shadow-2xl text-center space-y-2 transform scale-110 animate-bounce">
            <div className="text-6xl">🎉 🔴 ✨</div>
            <h3 className="text-xl font-black text-teal-950 uppercase">HOAN HÔ! ĐÃ ĐÓNG DẤU TAY THÀNH CÔNG!</h3>
            <p className="text-xs font-bold text-teal-800">Em đã ký cam kết quyết tâm thực hiện mục tiêu năm học! 🌟</p>
          </div>
        </div>
      )}

      {/* ------------------- HEADER WITH MASCOT & ANIMATED KID BANNER ------------------- */}
      <div className="relative bg-white rounded-3xl p-5 sm:p-7 border-3 border-sky-300 shadow-xl space-y-4 overflow-hidden">
        
        {/* Colorful top bar */}
        <div className="h-3 bg-gradient-to-r from-amber-400 via-rose-400 via-purple-400 to-sky-400 rounded-full -mt-2 -mx-2" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-base shadow-md">
              S
            </div>
            <div>
              <span className="font-black text-teal-900 tracking-wide text-sm block">SKY-LINE EDUCATION</span>
              <span className="text-[11px] font-bold text-sky-700">Trường Tiểu Học Sky-Line • Khối 1</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 shadow-sm border border-amber-400">
            <Sparkles className="w-4 h-4 text-rose-600 animate-spin" />
            <span>MỤC TIÊU BÉ KHỐI 1 (2026 - 2027)</span>
          </div>
        </div>

        {/* Mascot & Playful Title */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-gradient-to-r from-sky-50 via-indigo-50/50 to-amber-50 p-4 sm:p-5 rounded-3xl border-2 border-dashed border-sky-300">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-300 via-sky-300 to-emerald-300 p-1.5 shadow-xl flex items-center justify-center text-5xl animate-bounce">
                🐥
              </div>
              <span className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs border border-white">
                Sky-Line Mascot
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#003B3A] uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <span>BẢNG MỤC TIÊU ĐẦU NĂM HỌC</span>
                <span className="text-amber-500">🎯</span>
              </h1>
              <p className="text-xs sm:text-sm font-extrabold text-sky-900 leading-relaxed max-w-xl">
                Bé ơi! Hãy chạm bấm chọn những mục tiêu và việc làm bé muốn làm trong năm học này nhé! ✨
              </p>
            </div>
          </div>

          {/* Kid Interactive Counter Widget */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-sky-300 shadow-sm text-center shrink-0 space-y-1 min-w-[170px]">
            <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">TIẾN TRÌNH CHỌN MỤC TIÊU</span>
            <div className="flex items-center justify-center gap-1.5">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="text-2xl font-black text-teal-800">{totalTgts}</span>
              <span className="text-xs font-black text-slate-400">mục tiêu</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
              {totalTgts >= 4 ? "🌟 Bé chọn giỏi lắm!" : "👉 Chạm chọn bên dưới nhé"}
            </span>
          </div>

        </div>

        {/* Student Meta Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs font-black text-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-sm font-black">🎒</span>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Họ tên học sinh</span>
              <span className="text-slate-900 font-extrabold text-xs">{studentName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black">🏫</span>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Lớp học</span>
              <span className="text-teal-900 font-extrabold text-xs">{className || "Khối 1"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-black">📋</span>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Trạng thái phiếu</span>
              {isSubmitted ? (
                <span className="text-emerald-700 font-black text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã lưu ({submittedAt || "Năm học"})
                </span>
              ) : (
                <span className="text-amber-800 font-black text-[11px]">📝 Đang chạm chọn</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ------------------- 4 PLAYFUL INTERACTIVE GOAL CATEGORIES ------------------- */}
      <div className="space-y-6">
        
        {K1_PRESETS.map((catConfig) => {
          const catKey = catConfig.category
          const tgtsList = selectedTargets[catKey] || []
          const actsList = selectedActions[catKey] || []
          const customList = customGoals[catKey] || []

          return (
            <div 
              key={catKey} 
              className={`bg-white rounded-3xl border-3 ${catConfig.theme.border} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden space-y-4 font-sans` }
            >
              
              {/* Category Gradient Header with Badge */}
              <div className={`p-4 sm:p-5 ${catConfig.theme.bgHeader} flex flex-wrap items-center justify-between gap-3 border-b-2 border-white/20`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl bg-white/20 p-2 rounded-2xl backdrop-blur-xs shadow-inner">{catConfig.icon}</span>
                  <div>
                    <h3 className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                      <span>{catConfig.title}</span>
                    </h3>
                    <p className="text-xs font-bold text-white/90 italic">
                      ✨ {catConfig.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/25 backdrop-blur-md text-white border border-white/40 rounded-full text-xs font-black shadow-xs">
                    🏆 {catConfig.badge}
                  </span>
                  <span className="px-3.5 py-1 bg-white text-slate-900 rounded-full text-xs font-black shadow-sm">
                    Đã chọn {tgtsList.length}
                  </span>
                </div>
              </div>

              {/* Main Category Interactive Container */}
              <div className="p-4 sm:p-6 space-y-5">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  
                  {/* Left Column: Interactive Checkable Targets ("Mục tiêu của em") */}
                  <div className="lg:col-span-6 space-y-3 bg-gradient-to-b from-sky-50/60 to-white p-4 sm:p-5 rounded-3xl border-2 border-sky-200">
                    <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                      <span className="text-xs font-black text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="text-base">🎯</span>
                        <span>MỤC TIÊU CỦA EM (Bé chạm để chọn):</span>
                      </span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                        {tgtsList.length}/{catConfig.targets.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {catConfig.targets.map((tgt, idx) => {
                        const isChecked = tgtsList.includes(tgt)
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => toggleTarget(catKey, tgt)}
                            className={`w-full text-left p-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-start gap-3 border-2 ${
                              isChecked
                                ? catConfig.theme.activePill
                                : "bg-white text-slate-800 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 hover:scale-[1.01]"
                            } ${isSubmitted ? "cursor-not-allowed opacity-90" : "cursor-pointer active:scale-95"}`}
                          >
                            {/* Cute Kid Checkbox Circle */}
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 transition-all font-black border-2 ${
                              isChecked 
                                ? "bg-white text-teal-800 border-white shadow-xs animate-bounce" 
                                : "border-slate-300 bg-slate-100 text-transparent"
                            }`}>
                              {isChecked ? "✓" : ""}
                            </span>
                            <span className="leading-relaxed flex-1">{tgt}</span>
                            {isChecked && <span className="text-xs">⭐</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right Column: Interactive Checkable Actions ("Em sẽ làm gì để đạt được?") */}
                  <div className="lg:col-span-6 space-y-3 bg-gradient-to-b from-amber-50/60 to-white p-4 sm:p-5 rounded-3xl border-2 border-amber-200">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="text-base">⚡</span>
                        <span>EM SẼ LÀM GÌ ĐỂ ĐẠT ĐƯỢC? (Chạm chọn):</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {actsList.length}/{catConfig.actions.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {catConfig.actions.map((act, idx) => {
                        const isChecked = actsList.includes(act)
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => toggleAction(catKey, act)}
                            className={`w-full text-left p-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-start gap-3 border-2 ${
                              isChecked
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-orange-600 shadow-md scale-[1.02]"
                                : "bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 hover:scale-[1.01]"
                            } ${isSubmitted ? "cursor-not-allowed opacity-90" : "cursor-pointer active:scale-95"}`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 transition-all font-black border-2 ${
                              isChecked 
                                ? "bg-white text-amber-950 border-white shadow-xs animate-bounce" 
                                : "border-slate-300 bg-slate-100 text-transparent"
                            }`}>
                              {isChecked ? "✓" : ""}
                            </span>
                            <span className="leading-relaxed flex-1">{act}</span>
                            {isChecked && <span className="text-xs">🚀</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Custom Goal Rows (Optional custom input) */}
                {customList.length > 0 && (
                  <div className="space-y-2 border-t-2 border-slate-100 pt-3">
                    <span className="text-xs font-black text-teal-800 uppercase flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-teal-600" />
                      <span>Mục tiêu tự chọn bổ sung của em:</span>
                    </span>

                    {customList.map((cItem, cIdx) => (
                      <div key={cIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-teal-50/70 p-3 rounded-2xl border-2 border-teal-200 shadow-xs">
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            readOnly={isSubmitted}
                            value={cItem.targetText}
                            onChange={(e) => updateCustomGoalRow(catKey, cIdx, "targetText", e.target.value)}
                            placeholder="Gõ mục tiêu khác bé muốn làm..."
                            className="w-full p-3 rounded-xl border border-teal-300 text-xs font-extrabold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            readOnly={isSubmitted}
                            value={cItem.actionText}
                            onChange={(e) => updateCustomGoalRow(catKey, cIdx, "actionText", e.target.value)}
                            placeholder="Hành động cụ thể bé sẽ cố gắng..."
                            className="w-full p-3 rounded-xl border border-teal-300 text-xs font-extrabold bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                          />
                        </div>
                        {!isSubmitted && (
                          <div className="sm:col-span-1 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeCustomGoalRow(catKey, cIdx)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isSubmitted && (
                  <button
                    type="button"
                    onClick={() => addCustomGoalRow(catKey)}
                    className="w-full py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-teal-800 text-xs font-black border-2 border-dashed border-teal-300 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.005] active:scale-[0.995]"
                  >
                    <Plus className="w-4 h-4 text-teal-600 stroke-[3]" />
                    <span>+ Bé muốn viết thêm 1 mục tiêu khác nhóm này? (Bấm vào đây)</span>
                  </button>
                )}

              </div>

            </div>
          )
        })}

      </div>

      {/* ------------------- INTERACTIVE FINGERPRINT PLEDGE STAMP SECTION ------------------- */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-3 border-amber-300 shadow-xl space-y-6">
        
        <div className="flex items-center justify-between border-b-2 border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm">
              ✍️
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-950 uppercase tracking-tight">
                LỜI CAM KẾT & DẤU ẤN VÂN TAY CỦA BÉ
              </h3>
              <p className="text-xs text-amber-800 font-bold">Chạm vào dấu vân tay màu đỏ bên dưới để hoàn tất cam kết nhé!</p>
            </div>
          </div>

          {fingerprintStamped && (
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>ĐÃ ĐÓNG DẤU VÂN TAY CỦA BÉ</span>
            </span>
          )}
        </div>

        {/* Commitment Message Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Lời hứa / Cam kết của bé cho năm học này:</span>
          </label>
          <textarea
            rows={3}
            readOnly={isSubmitted}
            value={studentCommitment}
            onChange={(e) => !isSubmitted && setStudentCommitment(e.target.value)}
            placeholder="Em cam kết sẽ luôn cố gắng học tập tốt, vâng lời Thầy Cô và Ba Mẹ..."
            className={`w-full p-4 rounded-2xl border-2 text-xs sm:text-sm font-extrabold focus:outline-none transition-all ${
              isSubmitted 
                ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed" 
                : "border-amber-300 focus:border-amber-500 bg-amber-50/30 focus:bg-white shadow-inner"
            }`}
          />
        </div>

        {/* Interactive Fingerprint & Submission Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-3 border-amber-300 shadow-inner">
          
          {/* Large Touch Fingerprint Stamp Button */}
          <div className="md:col-span-7 flex flex-col sm:flex-row items-center gap-5 bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-300 shadow-md">
            
            <button
              type="button"
              disabled={isSubmitted}
              onClick={handleFingerprintTap}
              className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 shadow-xl shrink-0 cursor-pointer active:scale-90 ${
                isSubmitted
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed border-2 border-slate-300"
                  : fingerprintStamped
                  ? "bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white shadow-rose-300 scale-105 ring-4 ring-rose-300"
                  : "bg-amber-100 text-amber-700 border-3 border-dashed border-amber-400 hover:border-rose-500 hover:bg-rose-50 animate-pulse"
              }`}
            >
              <span className="text-4xl">{fingerprintStamped ? "🔴" : "👉"}</span>
              <span className="text-[10px] font-black uppercase mt-1">
                {fingerprintStamped ? "Đã đóng dấu" : "Chạm vân tay"}
              </span>
            </button>

            <div className="space-y-1.5 text-center sm:text-left">
              <p className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center justify-center sm:justify-start gap-1">
                <span>DẤU ẤN VÂN TAY CAM KẾT</span>
                <span>🔴</span>
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-amber-900 leading-snug">
                "Hãy ấn dấu tay cam kết cố gắng thực hiện mục tiêu đã đề ra của em nhé!"
              </p>
              <p className={`text-xs font-black pt-1 ${fingerprintStamped ? "text-rose-600" : "text-amber-700"}`}>
                {fingerprintStamped 
                  ? "🎉 Hoan hô! Bé đã đóng dấu vân tay màu đỏ xác nhận cam kết!" 
                  : "👇 Bé nhấn ngón tay vào ô bàn tay bên cạnh để đóng dấu đỏ nhé!"}
              </p>
            </div>

          </div>

          {/* Submit Action Button */}
          <div className="md:col-span-5 flex items-center justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || isSubmitted}
              className={`w-full h-full min-h-[70px] px-6 py-4 rounded-3xl font-black text-sm shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 ${
                isSubmitted
                  ? "bg-slate-400 text-white cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-teal-700 hover:to-teal-800 text-white shadow-teal-950/30 hover:scale-[1.03] active:scale-95 cursor-pointer"
              }`}
            >
              {isSubmitted ? (
                <>
                  <Lock className="w-5 h-5 text-slate-200" />
                  <span>PHIẾU ĐÃ GỬI CHO GVCN (ĐÃ KHÓA)</span>
                </>
              ) : (
                <>
                  <Send className="w-6 h-6 text-amber-300 animate-bounce" />
                  <span>{saving ? "Đang gửi phiếu..." : "LƯU & GỬI PHIẾU MỤC TIÊU CHO GVCN 🚀"}</span>
                </>
              )}
            </button>
          </div>

        </div>



      </div>

    </div>
  )
}
