"use client"

import { useState, useEffect } from "react"
import {
  Sparkles, Save, Heart, CheckCircle2, Compass, Send, BookOpen, User,
  Check, Info, CheckSquare, HelpCircle, Award, Feather, FileText, ArrowRight,
  ShieldCheck, Edit3
} from "lucide-react"
import Link from "next/link"

export default function StudentGoalPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("Học sinh Sky-Line")
  const [studentGrade, setStudentGrade] = useState("K11")
  const [gradeLevel, setGradeLevel] = useState("K11")
  const [academicYearId, setAcademicYearId] = useState("")
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [presets, setPresets] = useState<any[]>([])

  // Goal Form Data States
  const [selectedPresetGoals, setSelectedPresetGoals] = useState<Record<string, boolean>>({})
  const [customGoals, setCustomGoals] = useState<Record<string, any>>({
    HOC_TAP: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "", smartSpecific: "", smartMeasurable: "", smartAchievable: "", smartRelevant: "", smartTimeBound: "" },
    THOI_QUEN_SUC_KHOE: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    KY_NANG_SO_THICH: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    PHAM_CHAT: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    DINH_HUONG: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" }
  })
  
  const [studentCommitment, setStudentCommitment] = useState("")
  const [fingerprintStamped, setFingerprintStamped] = useState(false)

  // SMART Modal State for K6-K12
  const [showSmartGuideModal, setShowSmartGuideModal] = useState(false)
  const [smartChecklist, setSmartChecklist] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch("/api/hocsinh/me")
      .then(r => {
        if (!r.ok) {
          window.location.href = "/login"
          return null
        }
        return r.json()
      })
      .then(data => {
        if (data && data.studentCode) {
          const sId = data.id || data.studentId
          setStudentId(sId)
          setStudentName(data.studentName)
          
          let parsedGrade = "K11"
          if (data.grade) {
            const gNum = String(data.grade).replace(/[^0-9]/g, "")
            if (gNum) parsedGrade = "K" + gNum
          } else if (data.className) {
            const match = data.className.toUpperCase().match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
            if (match && match[1]) parsedGrade = "K" + match[1]
          }

          setStudentGrade(parsedGrade)
          setGradeLevel(parsedGrade)
          localStorage.setItem("currentStudent", JSON.stringify(data))

          fetchGoalsForStudent(sId, parsedGrade)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)
    }
  }, [])

  async function fetchGoalsForStudent(sId: string, gLevel: string) {
    if (!sId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/advisory/goals?studentId=${sId}&academicYearId=${academicYearId}&gradeLevel=${gLevel}`)
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets || [])
        if (data.existingSheet) {
          setStudentCommitment(data.existingSheet.studentCommitment || "")
          setFingerprintStamped(!!data.existingSheet.signedByStudent)
          const presetMap: Record<string, boolean> = {}
          const customMap = { ...customGoals }

          data.existingSheet.goals.forEach((g: any) => {
            if (g.presetId) presetMap[g.presetId] = true
            if (g.category && customMap[g.category]) {
              customMap[g.category] = {
                targetText: g.targetText || "",
                actionText: g.actions?.[0]?.actionText || "",
                teacherSupport: g.teacherSupportRequest || "",
                parentSupport: g.parentSupportRequest || "",
                smartSpecific: g.smartSpecific || "",
                smartMeasurable: g.smartMeasurable || "",
                smartAchievable: g.smartAchievable || "",
                smartRelevant: g.smartRelevant || "",
                smartTimeBound: g.smartTimeBound || ""
              }
            }
          })
          setSelectedPresetGoals(presetMap)
          setCustomGoals(customMap)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoals() {
    if (!studentId) {
      alert("Chưa xác định được thông tin học sinh.")
      return
    }

    try {
      setSaving(true)
      const goalListPayload: any[] = []

      // 1. Collect checked preset goals for K1-K3
      if (["K1", "K2", "K3"].includes(gradeLevel)) {
        presets.forEach(p => {
          if (selectedPresetGoals[p.id]) {
            goalListPayload.push({
              category: p.category,
              presetId: p.id,
              targetText: p.goalText,
              actions: p.actionPreset ? p.actionPreset.split("|").map((act: string) => ({ actionText: act })) : []
            })
          }
        })
      }

      // 2. Collect custom inputs for all grades (including K1-K3 if filled)
      Object.keys(customGoals).forEach(cat => {
        const item = customGoals[cat]
        if (item.targetText.trim()) {
          goalListPayload.push({
            category: cat,
            targetText: item.targetText,
            teacherSupportRequest: item.teacherSupport,
            parentSupportRequest: item.parentSupport,
            smartSpecific: item.smartSpecific,
            smartMeasurable: item.smartMeasurable,
            smartAchievable: item.smartAchievable,
            smartRelevant: item.smartRelevant,
            smartTimeBound: item.smartTimeBound,
            actions: item.actionText ? [{ actionText: item.actionText }] : []
          })
        }
      })

      const res = await fetch("/api/advisory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          gradeLevel,
          goals: goalListPayload,
          studentCommitment,
          signedByStudent: fingerprintStamped
        })
      })

      if (res.ok) {
        setToastMessage("Đã lưu thành công Phiếu Mục Tiêu Khối " + gradeLevel + "! Thầy Cô & Ba Mẹ sẽ đồng hành cùng em.")
        setTimeout(() => setToastMessage(""), 4000)
      } else {
        alert("Lỗi khi lưu phiếu mục tiêu.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const isK1ToK3 = ["K1", "K2", "K3"].includes(gradeLevel)
  const isK6ToK8 = ["K6", "K7", "K8"].includes(gradeLevel)
  const isHighSchool = ["K9", "K10", "K11", "K12"].includes(gradeLevel)

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-teal-800 font-extrabold text-sm animate-pulse space-y-2">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang nạp Sổ Mục Tiêu Năm Học cho {studentName}...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-500 via-teal-500 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>PHIẾU MỤC TIÊU ĐẦU NĂM HỌC — KHỐI {gradeLevel.replace("K", "")}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white font-black text-xs flex items-center gap-1.5 border border-white/30 shadow-xs">
              🎓 Khối của em: Khối {gradeLevel.replace("K", "")} ({studentName})
            </span>

            <Link
              href="/hocsinh/portal/ho-tro"
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Nút SOS "Em Cần Hỗ Trợ"</span>
            </Link>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black">Bảng Mục Tiêu Năm Học — {studentName}</h1>
        <p className="text-xs sm:text-sm text-teal-100 font-medium">
          Hệ thống đã tự động chọn Phiếu mục tiêu phù hợp với <strong className="text-white">Khối {gradeLevel.replace("K", "")}</strong> của em. Hãy tích chọn mục tiêu và ghi rõ việc làm cụ thể nhé!
        </p>

        {/* Tab Indicator */}
        <div className="flex items-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-full bg-white text-[#003B3A] font-black text-xs flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> 1. Phiếu Mục Tiêu (Khối {gradeLevel})
          </span>
          <Link href="/hocsinh/portal/reflection" className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1">
            2. Tự Đánh Giá (Reflection)
          </Link>
          <Link href="/hocsinh/portal/ho-tro" className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1">
            3. Yêu Cầu Hỗ Trợ (SOS)
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-800 font-black text-xs flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ------------------- FORM KHỐI 1 - KHỐI 3 (CHECKBOXES) ------------------- */}
      {isK1ToK3 && (
        <div className="space-y-6">
          <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-5 text-sky-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🐧</div>
              <div>
                <h3 className="font-black text-sm uppercase">CHẾ ĐỘ NHẬP LIỆU TRỰC TIẾP — KHỐI {gradeLevel}</h3>
                <p className="text-xs text-sky-700 font-medium">Em hãy nhấn vào ô vuông để tích chọn mục tiêu có sẵn, hoặc gõ thêm lời cam kết của em bên dưới nhé!</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-sky-200 text-sky-800 rounded-full font-black text-[10px] uppercase">
              KHỐI {gradeLevel} MỞ NHẬP LIỆU
            </span>
          </div>

          {/* Preset Checkbox Categories */}
          {["HOC_TAP", "THOI_QUEN_SUC_KHOE", "KY_NANG_SO_THICH", "PHAM_CHAT"].map((cat, idx) => {
            const catTitles: Record<string, string> = {
              HOC_TAP: "1. MỤC TIÊU HỌC TẬP 📚",
              THOI_QUEN_SUC_KHOE: "2. THÓI QUEN & SỨC KHỎE ⏰",
              KY_NANG_SO_THICH: "3. KỸ NĂNG & SỞ THÍCH 🎨",
              PHAM_CHAT: "4. PHẨM CHẤT & THÁI ĐỘ 💖"
            }
            const catPresets = presets.filter(p => p.category === cat)

            return (
              <div key={cat} className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
                <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3">{catTitles[cat]}</h3>
                
                {/* List Checkboxes */}
                {catPresets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catPresets.map(p => {
                      const isChecked = !!selectedPresetGoals[p.id]
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPresetGoals(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                            isChecked
                              ? "bg-teal-50 border-teal-500 shadow-sm"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? "bg-teal-500 border-teal-500 text-white" : "bg-white border-slate-300"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-800">{p.goalText}</p>
                            {p.actionPreset && (
                              <p className="text-[11px] text-teal-700 font-bold bg-teal-100/60 px-2 py-0.5 rounded-md inline-block">
                                👉 Việc làm: {p.actionPreset}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Chưa có danh mục mẫu có sẵn cho phần này.</p>
                )}

                {/* Additional Custom Goal for K1-K3 */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ý kiến bổ sung / Mục tiêu khác của em (nếu có):</span>
                  </label>
                  <input
                    type="text"
                    value={customGoals[cat]?.targetText || ""}
                    onChange={(e) => setCustomGoals(prev => ({
                      ...prev,
                      [cat]: { ...prev[cat], targetText: e.target.value }
                    }))}
                    placeholder="Gõ mục tiêu riêng của em tại đây..."
                    className="w-full p-3 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ------------------- FORM KHỐI 4 - KHỐI 12 (NHẬP LIỆU CHI TIẾT & SMART) ------------------- */}
      {!isK1ToK3 && (
        <div className="space-y-6">
          <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-5 text-teal-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="font-black text-sm uppercase">PHIẾU ĐIỀN MỤC TIÊU NĂM HỌC — KHỐI {gradeLevel}</h3>
                <p className="text-xs text-teal-700 font-medium">Em hãy tự thiết lập mục tiêu cá nhân, hành động cụ thể và mong muốn nhận được sự hỗ trợ từ Thầy Cô & Gia đình!</p>
              </div>
            </div>
            {isHighSchool && (
              <button
                onClick={() => setShowSmartGuideModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-xs shadow-md hover:scale-105 transition-transform flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>Hướng dẫn SMART (5 Tiêu Chí)</span>
              </button>
            )}
          </div>

          {/* Detailed Input Categories */}
          {[
            { key: "HOC_TAP", title: "1. MỤC TIÊU HỌC TẬP & NĂNG LỰC 📚", placeholder: "Ví dụ: Đạt học sinh giỏi, nâng cao kỹ năng Tiếng Anh..." },
            { key: "THOI_QUEN_SUC_KHOE", title: "2. THÓI QUEN & SỨC KHỎE ⏰", placeholder: "Ví dụ: Thức dậy đúng 6h sáng, tập thể dục 30 phút/ngày..." },
            { key: "KY_NANG_SO_THICH", title: "3. KỸ NĂNG & HOẠT ĐỘNG TRẢI NGHIỆM 🎨", placeholder: "Ví dụ: Tham gia CLB Âm nhạc, rèn luyện kỹ năng thuyết trình..." },
            { key: "PHAM_CHAT", title: "4. PHẨM CHẤT & THÁI ĐỘ SỐNG 💖", placeholder: "Ví dụ: Tích cực giúp đỡ bạn bè, luôn trung thực và tự giác..." },
            { key: "DINH_HUONG", title: "5. ĐỊNH HƯỚNG BẢN THÂN 🚀", placeholder: "Ví dụ: Định hướng nghề nghiệp tương lai, học sinh tiêu biểu hệ thống..." }
          ].map((catObj) => {
            const item = customGoals[catObj.key] || {}
            return (
              <div key={catObj.key} className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
                <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3">{catObj.title}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">📌 Mục tiêu cụ thể em muốn đạt được:</label>
                    <textarea
                      rows={3}
                      value={item.targetText || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], targetText: e.target.value }
                      }))}
                      placeholder={catObj.placeholder}
                      className="w-full p-3 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">⚡ Hành động / Việc làm cụ thể hàng ngày:</label>
                    <textarea
                      rows={3}
                      value={item.actionText || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], actionText: e.target.value }
                      }))}
                      placeholder="Ghi rõ từng bước em sẽ thực hiện..."
                      className="w-full p-3 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-teal-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>Điều em muốn Thầy/Cô hỗ trợ:</span>
                    </label>
                    <input
                      type="text"
                      value={item.teacherSupport || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], teacherSupport: e.target.value }
                      }))}
                      placeholder="Thầy cô cố vấn giúp em..."
                      className="w-full p-3 rounded-2xl border-2 border-teal-100 text-xs font-semibold focus:border-teal-500 focus:outline-none bg-teal-50/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-amber-600" />
                      <span>Điều em muốn Ba/Mẹ hỗ trợ:</span>
                    </label>
                    <input
                      type="text"
                      value={item.parentSupport || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], parentSupport: e.target.value }
                      }))}
                      placeholder="Ba mẹ nhắc nhở em..."
                      className="w-full p-3 rounded-2xl border-2 border-amber-100 text-xs font-semibold focus:border-amber-500 focus:outline-none bg-amber-50/40"
                    />
                  </div>
                </div>

                {/* SMART Criteria inputs for K9-K12 */}
                {isHighSchool && catObj.key === "HOC_TAP" && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" /> Tiêu chuẩn SMART dành cho Học sinh Trung học (K9 - K12)
                      </span>
                      <span className="text-[10px] font-black text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full uppercase">
                        Khuôn Khổ SMART
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Specific (Cụ thể):</label>
                        <input
                          type="text"
                          value={item.smartSpecific || ""}
                          onChange={(e) => setCustomGoals(prev => ({
                            ...prev,
                            [catObj.key]: { ...prev[catObj.key], smartSpecific: e.target.value }
                          }))}
                          placeholder="Mục tiêu cụ thể là gì?"
                          className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Measurable (Đo lường được):</label>
                        <input
                          type="text"
                          value={item.smartMeasurable || ""}
                          onChange={(e) => setCustomGoals(prev => ({
                            ...prev,
                            [catObj.key]: { ...prev[catObj.key], smartMeasurable: e.target.value }
                          }))}
                          placeholder="Con số / Kết quả đo?"
                          className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Achievable (Khả thi):</label>
                        <input
                          type="text"
                          value={item.smartAchievable || ""}
                          onChange={(e) => setCustomGoals(prev => ({
                            ...prev,
                            [catObj.key]: { ...prev[catObj.key], smartAchievable: e.target.value }
                          }))}
                          placeholder="Làm sao để đạt được?"
                          className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Relevant (Thực tế):</label>
                        <input
                          type="text"
                          value={item.smartRelevant || ""}
                          onChange={(e) => setCustomGoals(prev => ({
                            ...prev,
                            [catObj.key]: { ...prev[catObj.key], smartRelevant: e.target.value }
                          }))}
                          placeholder="Ý nghĩa với bản thân?"
                          className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Time-bound (Thời hạn):</label>
                        <input
                          type="text"
                          value={item.smartTimeBound || ""}
                          onChange={(e) => setCustomGoals(prev => ({
                            ...prev,
                            [catObj.key]: { ...prev[catObj.key], smartTimeBound: e.target.value }
                          }))}
                          placeholder="Hạn chót hoàn thành?"
                          className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ------------------- LOI CAM KET & DONG DAU AN VAN TAY ------------------- */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
        <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <span>LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ✍️</span>
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700">Lời cam kết nỗ lực của em trong năm học này:</label>
          <textarea
            rows={3}
            value={studentCommitment}
            onChange={(e) => setStudentCommitment(e.target.value)}
            placeholder="Em xin cam kết sẽ quyết tâm thực hiện đầy đủ các mục tiêu đã đề ra..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Fingerprint Stamping Simulation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFingerprintStamped(!fingerprintStamped)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md ${
                fingerprintStamped
                  ? "bg-rose-500 text-white shadow-rose-200 scale-105"
                  : "bg-white text-slate-400 border-2 border-dashed border-slate-300 hover:border-rose-400"
              }`}
            >
              👉
            </button>
            <div>
              <p className="text-xs font-black text-slate-800">
                {fingerprintStamped ? "🔴 Đã đóng dấu vân tay xác nhận cam kết!" : "Chưa đóng dấu ấn vân tay"}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Nhấn vào dấu tay để xác nhận cam kết cá nhân</p>
            </div>
          </div>

          <button
            onClick={handleSaveGoals}
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#003B3A] hover:bg-[#002D2C] text-white font-black text-xs shadow-lg shadow-teal-950/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4 text-teal-300" />
            <span>{saving ? "Đang lưu..." : "LƯU PHIẾU MỤC TIÊU NĂM HỌC"}</span>
          </button>
        </div>
      </div>

    </div>
  )
}
