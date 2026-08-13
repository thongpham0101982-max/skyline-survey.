"use client"

import { useState, useEffect } from "react"
import {
  Sparkles, Save, Heart, CheckCircle2, Compass, Send, BookOpen, User,
  Check, Info, CheckSquare, HelpCircle, Award, Feather, FileText, ArrowRight,
  ShieldCheck, Edit3, History, Clock, MessageSquare, AlertCircle, Users
} from "lucide-react"
import Link from "next/link"

export default function StudentGoalPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("Học sinh Sky-Line")
  const [studentGrade, setStudentGrade] = useState("K8")
  const [gradeLevel, setGradeLevel] = useState("K8")
  const [className, setClassName] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [presets, setPresets] = useState<any[]>([])
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])

  // Goal Form Data States - Strictly 4 Categories as per official Word/PDF template
  const [selectedPresetGoals, setSelectedPresetGoals] = useState<Record<string, boolean>>({})
  const [customGoals, setCustomGoals] = useState<Record<string, any>>({
    HOC_TAP: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    THOI_QUEN: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    KY_NANG_CAM_XUC: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" },
    DINH_HUONG: { targetText: "", actionText: "", teacherSupport: "", parentSupport: "" }
  })
  
  const [studentCommitment, setStudentCommitment] = useState("")
  const [fingerprintStamped, setFingerprintStamped] = useState(false)

  useEffect(() => {
    fetch("/api/hocsinh/me", { cache: "no-store" })
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
          setClassName(data.className || "")
          
          let parsedGrade = "K8"
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
      const res = await fetch(`/api/advisory/goals?studentId=${sId}&academicYearId=${academicYearId}&gradeLevel=${gLevel}&_t=${Date.now()}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets || [])
        setTrackingLogs(data.trackingLogs || [])

        if (data.existingSheet) {
          setStudentCommitment(data.existingSheet.studentCommitment || "")
          setFingerprintStamped(!!data.existingSheet.signedByStudent)
          if (data.existingSheet.submittedAt) {
            setSubmittedAt(new Date(data.existingSheet.submittedAt).toLocaleDateString("vi-VN"))
          }
          const presetMap: Record<string, boolean> = {}
          const customMap = { ...customGoals }

          data.existingSheet.goals.forEach((g: any) => {
            if (g.presetId) presetMap[g.presetId] = true
            
            // Map legacy category keys if any
            let catKey = g.category
            if (catKey === "THOI_QUEN_SUC_KHOE") catKey = "THOI_QUEN"
            if (catKey === "KY_NANG_SO_THICH" || catKey === "PHAM_CHAT") catKey = "KY_NANG_CAM_XUC"

            if (catKey && customMap[catKey]) {
              customMap[catKey] = {
                targetText: g.targetText || "",
                actionText: g.actions?.[0]?.actionText || "",
                teacherSupport: g.teacherSupportRequest || "",
                parentSupport: g.parentSupportRequest || ""
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
      alert("Chưa xác định được thông tin học sinh. Vui lòng đăng nhập lại.")
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

      // 2. Collect custom inputs for all 4 categories
      Object.keys(customGoals).forEach(cat => {
        const item = customGoals[cat]
        if (item.targetText && item.targetText.trim()) {
          goalListPayload.push({
            category: cat,
            targetText: item.targetText,
            teacherSupportRequest: item.teacherSupport,
            parentSupportRequest: item.parentSupport,
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

      const resData = await res.json().catch(() => ({}))

      if (res.ok && resData.success) {
        setSubmittedAt(new Date().toLocaleDateString("vi-VN"))
        setToastMessage("Đã LƯU & GỬI PHIẾU MỤC TIÊU Khối " + gradeLevel.replace("K","") + " về Quản lý Cố Vấn Học Tập & GVCN thành công!")
        setTimeout(() => setToastMessage(""), 5000)
        fetchGoalsForStudent(studentId, gradeLevel)
      } else {
        alert(resData.error || "Lỗi khi lưu phiếu mục tiêu. Vui lòng thử lại.")
      }
    } catch (e: any) {
      console.error(e)
      alert("Lỗi kết nối khi lưu phiếu: " + (e.message || "Vui lòng thử lại."))
    } finally {
      setSaving(false)
    }
  }

  const isK1ToK3 = ["K1", "K2", "K3"].includes(gradeLevel)

  // 4 Target Categories matching official Word/PDF Form Template
  const secondaryCategories = [
    {
      key: "HOC_TAP",
      number: "1",
      title: "Mục tiêu học tập",
      hint: "Môn học, phương pháp học, điểm số...",
      placeholderTarget: "Các mục tiêu học tập cụ thể của em...",
      placeholderAction: "Em sẽ làm gì để đạt được những mục tiêu học tập này?"
    },
    {
      key: "THOI_QUEN",
      number: "2",
      title: "Mục tiêu thói quen",
      hint: "Kỷ luật, tự học, hoàn thành nhiệm vụ đúng thời hạn, thói quen ăn uống, nghỉ ngơi...",
      placeholderTarget: "Các mục tiêu thói quen cụ thể của em...",
      placeholderAction: "Em sẽ làm gì để đạt được những mục tiêu thói quen này?"
    },
    {
      key: "KY_NANG_CAM_XUC",
      number: "3",
      title: "Mục tiêu kỹ năng, cảm xúc",
      hint: "Giao tiếp, thuyết trình, làm việc nhóm, tư duy phản biện, quản lý cảm xúc...",
      placeholderTarget: "Các mục tiêu kỹ năng & cảm xúc cụ thể của em...",
      placeholderAction: "Em sẽ làm gì để rèn luyện kỹ năng & quản lý cảm xúc?"
    },
    {
      key: "DINH_HUONG",
      number: "4",
      title: "Mục tiêu định hướng",
      hint: "Khám phá bản thân, ngành nghề, lộ trình tương lai...",
      placeholderTarget: "Các mục tiêu định hướng bản thân của em...",
      placeholderAction: "Em sẽ làm gì để thực hiện định hướng này?"
    }
  ]

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-teal-800 font-extrabold text-sm animate-pulse space-y-2">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Đang nạp Sổ Mục Tiêu Năm Học cho {studentName}...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans text-slate-800 pb-20">
      
      {/* Top Banner Header - SKY-LINE Official Theme */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>MỤC TIÊU NĂM HỌC 2026 - 2027 — KHỐI {gradeLevel.replace("K", "")}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/20 text-white font-black text-xs flex items-center gap-1.5 border border-white/30 shadow-xs">
              🏫 Học sinh: {studentName} {className ? `(${className})` : ""}
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

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">MỤC TIÊU NĂM HỌC 2026 - 2027</h1>
          <p className="text-xs sm:text-sm text-teal-100 font-medium italic">
            Em hãy dành thời gian suy nghĩ và viết mục tiêu của mình cho năm học này. Mục tiêu tốt cần rõ ràng, đo lường được và có việc làm cụ thể đi kèm.
          </p>
        </div>

        {/* Submission Status Badge */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {submittedAt ? (
            <span className="px-3.5 py-1 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>ĐÃ LƯU & GỬI CHO GVCN VÀ QUẢN LÝ CỐ VẤN ({submittedAt})</span>
            </span>
          ) : (
            <span className="px-3.5 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 shadow-sm">
              <Clock className="w-4 h-4" />
              <span>ĐANG DỰ THẢO — CHƯA GỬI</span>
            </span>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-800 font-black text-xs flex items-center justify-between animate-bounce shadow-md">
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
          {["HOC_TAP", "THOI_QUEN", "KY_NANG_CAM_XUC", "DINH_HUONG"].map((cat) => {
            const catTitles: Record<string, string> = {
              HOC_TAP: "1. Mục tiêu học tập 📚",
              THOI_QUEN: "2. Mục tiêu thói quen ⏰",
              KY_NANG_CAM_XUC: "3. Mục tiêu kỹ năng, cảm xúc 🎨",
              DINH_HUONG: "4. Mục tiêu định hướng 🚀"
            }
            const catPresets = presets.filter(p => p.category === cat)

            return (
              <div key={cat} className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
                <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3">{catTitles[cat]}</h3>
                
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

      {/* ------------------- FORM CHUẨN ĐÚNG THEO MẪU WORD/PDF KHỐI 4 - KHỐI 12 ------------------- */}
      {!isK1ToK3 && (
        <div className="space-y-6">
          <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-5 text-teal-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📝</div>
              <div>
                <h3 className="font-black text-sm uppercase">PHIẾU MỤC TIÊU NĂM HỌC — KHỐI {gradeLevel.replace("K", "")}</h3>
                <p className="text-xs text-teal-700 font-medium">Bảng lập mục tiêu năm học gồm đúng 4 Nhóm mục tiêu chuẩn theo biểu mẫu của Hệ thống Trường Sky-Line.</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-teal-600 text-white rounded-2xl font-black text-xs shadow-xs">
              Mẫu biểu chuẩn Khối {gradeLevel.replace("K", "")}
            </span>
          </div>

          {/* Render 4 Categories matching Word/PDF Template */}
          {secondaryCategories.map((catObj) => {
            const item = customGoals[catObj.key] || {}
            return (
              <div key={catObj.key} className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md space-y-5">
                
                {/* Category Header */}
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {catObj.number}. {catObj.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                      Gợi ý: {catObj.hint}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase shrink-0">
                    Nhóm {catObj.number}
                  </span>
                </div>
                
                {/* 2 Main Input Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 2: Các mục tiêu cụ thể của em */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                      <span>Các mục tiêu cụ thể của em:</span>
                    </label>
                    <textarea
                      rows={4}
                      value={item.targetText || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], targetText: e.target.value }
                      }))}
                      placeholder={catObj.placeholderTarget}
                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Column 3: Em sẽ làm gì để đạt được những mục tiêu này? */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <span>Em sẽ làm gì để đạt được những mục tiêu này?</span>
                    </label>
                    <textarea
                      rows={4}
                      value={item.actionText || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], actionText: e.target.value }
                      }))}
                      placeholder={catObj.placeholderAction}
                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 2 Support Questions (Columns 4 & 5) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                  
                  {/* Column 4: Em mong muốn thầy cô/ bạn bè hỗ trợ mình như thế nào? */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-teal-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      <span>Em mong muốn thầy cô/ bạn bè hỗ trợ mình như thế nào?</span>
                    </label>
                    <input
                      type="text"
                      value={item.teacherSupport || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], teacherSupport: e.target.value }
                      }))}
                      placeholder="Thầy cô/bạn bè hỗ trợ em..."
                      className="w-full p-3 rounded-2xl border-2 border-teal-100 text-xs font-semibold focus:border-teal-500 focus:outline-none bg-teal-50/40"
                    />
                  </div>

                  {/* Column 5: Em mong muốn ba mẹ hỗ trợ mình như thế nào? */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-amber-600" />
                      <span>Em mong muốn ba mẹ hỗ trợ mình như thế nào?</span>
                    </label>
                    <input
                      type="text"
                      value={item.parentSupport || ""}
                      onChange={(e) => setCustomGoals(prev => ({
                        ...prev,
                        [catObj.key]: { ...prev[catObj.key], parentSupport: e.target.value }
                      }))}
                      placeholder="Ba mẹ hỗ trợ em..."
                      className="w-full p-3 rounded-2xl border-2 border-amber-100 text-xs font-semibold focus:border-amber-500 focus:outline-none bg-amber-50/40"
                    />
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ------------------- LỜI CAM KẾT & XÁC NHẬN ĐỒNG HÀNH (CAM KẾT SẼ & 3 CHỮ KÝ) ------------------- */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md space-y-5">
        <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <span>LỜI CAM KẾT VÀ XÁC NHẬN CỦA HỌC SINH ✍️</span>
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
            <span>Em cam kết sẽ:</span>
          </label>
          <textarea
            rows={3}
            value={studentCommitment}
            onChange={(e) => setStudentCommitment(e.target.value)}
            placeholder="Chủ động và nghiêm túc thực hiện những mục tiêu đã đề ra, duy trì kỷ luật, thói quen tự học..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Confirmation Button Block */}

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
            <Send className="w-4 h-4 text-teal-300" />
            <span>{saving ? "Đang gửi..." : "LƯU & GỬI PHIẾU MỤC TIÊU CHO GVCN"}</span>
          </button>
        </div>
      </div>

      {/* ------------------- BẢNG LỊCH SỬ PHIẾU & THEO DÕI ĐÁNH GIÁ CỦA GVCN ------------------- */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <span>LỊCH SỬ PHIẾU & NHẬT KÝ THEO DÕI ĐÁNH GIÁ CỦA GVCN</span>
          </h3>
          <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            {trackingLogs.length} Nhật ký ghi nhận
          </span>
        </div>

        {trackingLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black">
                <tr>
                  <th className="p-3 rounded-l-xl">Mốc kiểm tra</th>
                  <th className="p-3">Nội dung mục tiêu</th>
                  <th className="p-3">Trạng thái tiến độ</th>
                  <th className="p-3 rounded-r-xl">Nhận xét của GVCN / Thầy Cô</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trackingLogs.map((log: any, idx: number) => {
                  const checkPointNames: Record<string, string> = {
                    DAU_NAM: "1. Mốc Đầu Năm Học",
                    GIUA_KY_1: "2. Mốc Giữa Học Kỳ 1",
                    CUOI_KY_1: "3. Mốc Cuối Học Kỳ 1",
                    GIUA_KY_2: "4. Mốc Giữa Học Kỳ 2",
                    CUOI_NAM: "5. Mốc Cuối Năm Học"
                  }
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-900">
                        {checkPointNames[log.checkPoint] || log.checkPoint}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{log.targetText}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                          {log.progressStatus || "TIẾN TRIỂN TỐT"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 bg-amber-50/40 rounded-xl">
                        {log.teacherNotes || "Chờ Thầy Cô nhận xét"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Chưa có nhật ký theo dõi từ GVCN</p>
            <p className="text-[11px] text-slate-400">Sau khi em nhấn "LƯU & GỬI PHIẾU MỤC TIÊU", Thầy Cô GVCN sẽ theo dõi và gửi nhận xét động viên em tại đây!</p>
          </div>
        )}
      </div>

    </div>
  )
}
