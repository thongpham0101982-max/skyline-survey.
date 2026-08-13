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
  const [studentGrade, setStudentGrade] = useState("K1")
  const [gradeLevel, setGradeLevel] = useState("K1")
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
    if (typeof window !== "undefined") {
      const storedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(storedYear)

      const storedStudent = localStorage.getItem("currentStudent")
      if (storedStudent) {
        try {
          const parsed = JSON.parse(storedStudent)
          setStudentId(parsed.id || "")
          setStudentName(parsed.studentName || "Học sinh Sky-Line")
          const cName = parsed.class?.className || parsed.className || ""
          if (cName) {
            const match = cName.toUpperCase().match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
            if (match && match[1]) {
              const gVal = "K" + match[1]
              setStudentGrade(gVal)
              setGradeLevel(gVal)
            }
          }
        } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (!studentId) {
      fetch("/api/students/search?limit=1")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentId(data[0].id)
            setStudentName(data[0].studentName)
            if (data[0].class?.grade) {
              const gr = data[0].class.grade.toUpperCase()
              setStudentGrade(gr)
              setGradeLevel(gr)
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      loadGoals()
    }
  }, [studentId, gradeLevel, academicYearId])

  async function loadGoals() {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/advisory/goals?studentId=${studentId}&academicYearId=${academicYearId}&gradeLevel=${gradeLevel}`)
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets || [])
        if (data.goals && data.goals.length > 0) {
          const first = data.goals[0]
          setStudentCommitment(first.studentCommitment || "")
          setFingerprintStamped(first.signedByStudent || false)

          const presetMap: Record<string, boolean> = {}
          const customMap: any = { ...customGoals }

          data.goals.forEach((g: any) => {
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

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-500 via-teal-500 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>PHIẾU MỤC TIÊU ĐẦU NĂM HỌC — KHỐI {gradeLevel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-teal-100 hidden sm:inline">Khối của em: {studentGrade}</span>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="px-3 py-1 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              {["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10", "K11", "K12"].map(g => (
                <option key={g} value={g} className="text-slate-800">
                  {g === studentGrade ? `Khối ${g} (Lớp của Em)` : `Xem Phiếu Khối ${g}`}
                </option>
              ))}
            </select>

            <Link
              href="/hocsinh/portal/ho-tro"
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Nút SOS "Em Cần Hỗ Trợ"</span>
            </Link>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Bảng Mục Tiêu Năm Học — {studentName}</h1>
          <p className="text-xs text-teal-100 font-medium mt-1">
            Hệ thống đã tự động chọn Phiếu mục tiêu phù hợp với <strong>Khối {gradeLevel}</strong> của em. Hãy tích chọn mục tiêu và ghi rõ việc làm cụ thể nhé!
          </p>
        </div>

        {/* Portal Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
          <Link
            href="/hocsinh/portal/muc-tieu"
            className="px-4 py-1.5 rounded-xl bg-white text-[#003B3A] text-xs font-black flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span>1. Phiếu Mục Tiêu (Khối {gradeLevel})</span>
          </Link>
          <Link
            href="/hocsinh/portal/reflection"
            className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center gap-1.5"
          >
            <Feather className="w-3.5 h-3.5 text-amber-300" />
            <span>2. Tự Đánh Giá (Reflection)</span>
          </Link>
          <Link
            href="/hocsinh/portal/ho-tro"
            className="px-4 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>3. Yêu Cầu Hỗ Trợ (SOS)</span>
          </Link>

          {(isK6ToK8 || isHighSchool) && (
            <button
              onClick={() => setShowSmartGuideModal(true)}
              className="ml-auto px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-900 text-xs font-black flex items-center gap-1 hover:bg-amber-500 transition-all"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Hướng Dẫn SMART</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Goal Form Container */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">

        {/* ----------------- K1 - K3 INTERACTIVE CHECKBOXES & ENTRY FORM ----------------- */}
        {isK1ToK3 && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🐧</div>
                <div>
                  <h4 className="text-xs font-black text-sky-900 uppercase">Chế độ Nhập Liệu Trực Tiếp — Khối {gradeLevel}</h4>
                  <p className="text-[11px] text-sky-800 font-medium">
                    Em hãy nhấn vào ô vuông để tích chọn mục tiêu có sẵn, hoặc gõ thêm lời cam kết của em bên dưới nhé!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-200 text-sky-900 text-[10px] font-black uppercase shrink-0">
                Khối {gradeLevel} Mở Nhập Liệu
              </span>
            </div>

            {/* Render Presets by Category */}
            {["HOC_TAP", "THOI_QUEN_SUC_KHOE", "KY_NANG_SO_THICH", "PHAM_CHAT"].map((catKey) => {
              const catTitle =
                catKey === "HOC_TAP" ? "1. Mục tiêu học tập 📚" :
                catKey === "THOI_QUEN_SUC_KHOE" ? "2. Thói quen & Sức khỏe ⏰" :
                catKey === "KY_NANG_SO_THICH" ? "3. Kỹ năng & Sở thích 🎨" : "4. Phẩm chất & Đạo đức 💖"

              const categoryPresets = presets.filter(p => p.category === catKey)
              const curCustom = customGoals[catKey] || {}

              return (
                <div key={catKey} className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider">{catTitle}</h3>

                  {/* Preset Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {categoryPresets.map((p) => {
                      const isChecked = Boolean(selectedPresetGoals[p.id])
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPresetGoals({ ...selectedPresetGoals, [p.id]: !isChecked })}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isChecked
                              ? "bg-teal-50 border-teal-500 text-teal-900 shadow-xs font-bold"
                              : "bg-white border-slate-200 hover:border-teal-300 text-slate-700 font-semibold"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? "bg-[#003B3A] border-[#003B3A] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs leading-relaxed">{p.goalText}</p>
                            {p.actionPreset && (
                              <p className="text-[10px] text-teal-700 font-medium mt-1">
                                Việc cần làm: {p.actionPreset.replace(/\|/g, " • ")}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Custom Extra Text Input for K1-K3 */}
                  <div className="pt-2">
                    <label className="text-[11px] font-extrabold text-slate-600 block mb-1">
                      ✏️ Ý kiến bổ sung / Mục tiêu khác của em (nếu có):
                    </label>
                    <input
                      type="text"
                      value={curCustom.targetText}
                      onChange={(e) => setCustomGoals({
                        ...customGoals,
                        [catKey]: { ...curCustom, targetText: e.target.value }
                      })}
                      placeholder="Gõ mục tiêu riêng của em tại đây..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ----------------- K4 - K12 FORM ----------------- */}
        {!isK1ToK3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Viết Mục Tiêu & Việc Làm Cụ Thể (Chuẩn Khối {gradeLevel})</span>
              </h3>

              {["HOC_TAP", "THOI_QUEN_SUC_KHOE", "KY_NANG_SO_THICH", "DINH_HUONG"].map((catKey) => {
                const label =
                  catKey === "HOC_TAP" ? "1. Mục tiêu học tập (Môn học, điểm số, phương pháp học)" :
                  catKey === "THOI_QUEN_SUC_KHOE" ? "2. Mục tiêu thói quen (Kỷ luật, tự học, giờ giấc)" :
                  catKey === "KY_NANG_SO_THICH" ? "3. Mục tiêu kỹ năng & cảm xúc (Giao tiếp, làm việc nhóm, cảm xúc)" :
                  "4. Mục tiêu định hướng (Ngành nghề, khối thi, lộ trình tương lai)"

                const cur = customGoals[catKey] || {}

                return (
                  <div key={catKey} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <h4 className="text-xs font-black text-[#003B3A] uppercase">{label}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600">Các mục tiêu cụ thể của em *</label>
                        <textarea
                          rows={2}
                          value={cur.targetText}
                          onChange={(e) => setCustomGoals({
                            ...customGoals,
                            [catKey]: { ...cur, targetText: e.target.value }
                          })}
                          placeholder="Nhập mục tiêu của em..."
                          className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600">Em sẽ làm gì để đạt được?</label>
                        <textarea
                          rows={2}
                          value={cur.actionText}
                          onChange={(e) => setCustomGoals({
                            ...customGoals,
                            [catKey]: { ...cur, actionText: e.target.value }
                          })}
                          placeholder="Liệt kê 2-3 việc làm cụ thể hằng ngày..."
                          className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        />
                      </div>
                    </div>

                    {(isK6ToK8 || isHighSchool) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Thầy cô / bạn bè hỗ trợ như thế nào?</label>
                          <input
                            type="text"
                            value={cur.teacherSupport}
                            onChange={(e) => setCustomGoals({
                              ...customGoals,
                              [catKey]: { ...cur, teacherSupport: e.target.value }
                            })}
                            placeholder="Mong muốn hỗ trợ từ thầy cô..."
                            className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Ba mẹ hỗ trợ như thế nào?</label>
                          <input
                            type="text"
                            value={cur.parentSupport}
                            onChange={(e) => setCustomGoals({
                              ...customGoals,
                              [catKey]: { ...cur, parentSupport: e.target.value }
                            })}
                            placeholder="Mong muốn hỗ trợ từ ba mẹ..."
                            className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ----------------- LỜI CAM KẾT & DẤU ẤN VÂN TAY (K1-K12) ----------------- */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 space-y-4">
          <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
            <Feather className="w-4 h-4 text-teal-600" />
            <span>Lời Cam Kết Của Em</span>
          </h3>

          <textarea
            rows={3}
            value={studentCommitment}
            onChange={(e) => setStudentCommitment(e.target.value)}
            placeholder="Viết lời cam kết của em (Ví dụ: Em cam kết sẽ nỗ lực thực hiện các mục tiêu mỗi ngày, rèn luyện 5 trụ cột phát triển Sky-Line...)"
            className="w-full p-3 rounded-xl border border-teal-200 text-xs font-semibold bg-white focus:outline-none focus:border-teal-500"
          />

          {/* Interactive Digital Fingerprint Button for Primary Grades */}
          {isK1ToK3 && (
            <div className="pt-2 flex flex-col items-center justify-center space-y-2">
              <button
                type="button"
                onClick={() => setFingerprintStamped(!fingerprintStamped)}
                className={`p-4 rounded-full border-2 transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-md cursor-pointer ${
                  fingerprintStamped
                    ? "bg-rose-500 border-rose-600 text-white animate-pulse"
                    : "bg-white border-teal-400 text-teal-700 hover:bg-teal-50"
                }`}
              >
                <div className="text-2xl">👆</div>
                <span className="text-xs font-black">
                  {fingerprintStamped ? "✓ Đã Đóng Dấu Ấn Vân Tay Cam Kết!" : "Bấm Đóng Dấu Ấn Vân Tay Cam Kết Tại Đây"}
                </span>
              </button>
              <p className="text-[10px] text-slate-500 font-bold">Em/Ba mẹ chạm vào đây để xác nhận dấu ấn vân tay cam kết</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={handleSaveGoals}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Đang lưu..." : `Lưu & Gửi Phiếu Mục Tiêu Khối ${gradeLevel}`}</span>
          </button>
        </div>
      </div>

      {/* SMART Guide Modal */}
      {showSmartGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-[#003B3A] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>HƯỚNG DẪN ĐẶT MỤC TIÊU THEO CHUẨN SMART</span>
              </h3>
              <button onClick={() => setShowSmartGuideModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <h4 className="font-extrabold text-amber-900">1. SMART là gì?</h4>
                <ul className="space-y-1 text-slate-700 font-medium">
                  <li><strong>S (Specific - Cụ thể):</strong> Mục tiêu rõ ràng.</li>
                  <li><strong>M (Measurable - Đo lường được):</strong> Dựa vào con số/kết quả để kiểm tra.</li>
                  <li><strong>A (Achievable - Vừa sức):</strong> Phù hợp với năng lực thực tế.</li>
                  <li><strong>R (Relevant - Phù hợp):</strong> Phù hợp với sở thích & định hướng.</li>
                  <li><strong>T (Time-bound - Có thời hạn):</strong> Mốc hoàn thành cụ thể.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800">2. Checklist tự kiểm tra mục tiêu của em:</h4>
                {[
                  "1. Mục tiêu có nêu rõ điều cụ thể muốn đạt được không?",
                  "2. Em có thể đo được kết quả bằng con số / điểm số không?",
                  "3. Mục tiêu này có vừa sức và khả thi không?",
                  "4. Mục tiêu có phù hợp với định hướng cá nhân không?",
                  "5. Em đã xác định mốc thời gian hoàn thành chưa?",
                  "6. Em đã liệt kê được 2-3 việc làm cụ thể để đạt mục tiêu chưa?"
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(smartChecklist[idx])}
                      onChange={(e) => setSmartChecklist({ ...smartChecklist, [idx]: e.target.checked })}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSmartGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-bold"
              >
                Hiểu Rồi & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
