"use client"

import { useState, useEffect } from "react"
import {
  Sparkles, Save, Heart, CheckCircle2, Compass, Send, BookOpen, User,
  Check, Info, CheckSquare, HelpCircle, Award, Feather, FileText, ArrowRight,
  ShieldCheck, Edit3, History, Clock, MessageSquare, AlertCircle, Users, Lock,
  Key, Target, Calendar, Flame, Play, RefreshCw
} from "lucide-react"
import Link from "next/link"
import { GoalMultiSelector } from "@/components/advisory/GoalMultiSelector"
import { K1GoalForm, K1GoalData } from "@/components/advisory/K1GoalForm"
import { GoalUnlockWizard } from "@/components/advisory/GoalUnlockWizard"
import { GoalUnlockCard } from "@/components/advisory/GoalUnlockCard"

export default function StudentGoalPortalPage() {
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("Học sinh Sky-Line")
  const [studentGrade, setStudentGrade] = useState("K8")
  const [gradeLevel, setGradeLevel] = useState("K8")
  const [className, setClassName] = useState("")
  const [academicYearId, setAcademicYearId] = useState("")
  
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [presets, setPresets] = useState<any[]>([])
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [trackingLogs, setTrackingLogs] = useState<any[]>([])
  
  // Unlock Sprint States (Stage 2)
  const [goalSheetId, setGoalSheetId] = useState("")
  const [stage1GoalItems, setStage1GoalItems] = useState<Array<{ category: string, targetText: string }>>([])
  const [unlockData, setUnlockData] = useState<any>(null)
  const [unlockHistory, setUnlockHistory] = useState<any[]>([])
  const [showWizard, setShowWizard] = useState(false)

  // Goal Form Data States - Dynamic Multi Custom Goals per Category
  const [selectedPresetGoals, setSelectedPresetGoals] = useState<Record<string, boolean>>({})
  const [k1GoalsList, setK1GoalsList] = useState<K1GoalData[]>([])
  const [customGoals, setCustomGoals] = useState<Record<string, any>>({
    HOC_TAP: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    THOI_QUEN: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    KY_NANG_CAM_XUC: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" },
    DINH_HUONG: { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" }
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
          
          function parseGradeLevel(gInput: any, cInput: any): string {
            const gStr = String(gInput || "").trim()
            const cStr = String(cInput || "").trim()
            const combined = (gStr + " " + cStr).toUpperCase()
            
            if (cStr.startsWith("1.") || cStr.startsWith("1INT") || cStr.startsWith("1UK") || cStr.startsWith("1S") || combined.includes("KHỐI 1") || combined.includes("LỚP 1") || gStr === "1" || gStr === "K1") {
              return "K1"
            }
            const match = combined.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
            if (match && match[1]) {
              return "K" + parseInt(match[1], 10)
            }
            return "K1"
          }

          let parsedGrade = parseGradeLevel(data.grade, data.className)

          setStudentGrade(parsedGrade)
          setGradeLevel(parsedGrade)
          localStorage.setItem("currentStudent", JSON.stringify(data))

          fetchGoalsForStudent(sId, parsedGrade)
          fetchUnlockData(sId)
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
          setGoalSheetId(data.existingSheet.id)
          setStudentCommitment(data.existingSheet.studentCommitment || "")
          setFingerprintStamped(!!data.existingSheet.signedByStudent)
          
          const rawGoals = data.existingSheet.goals || []
          const extractedList: Array<{ category: string, targetText: string }> = []
          rawGoals.forEach((g: any) => {
            if (g.targetText && g.targetText.trim()) {
              extractedList.push({
                category: g.category,
                targetText: g.targetText.trim()
              })
            }
          })
          setStage1GoalItems(extractedList)

          const loadedK1: K1GoalData[] = rawGoals.map((g: any) => ({
            category: g.category,
            targetText: g.targetText || "",
            actionText: g.actions?.[0]?.actionText || ""
          }))
          setK1GoalsList(loadedK1)

          if (data.existingSheet.submittedAt) {
            setSubmittedAt(new Date(data.existingSheet.submittedAt).toLocaleDateString("vi-VN"))
          }
          const customMap: Record<string, any> = {
            HOC_TAP: { items: [], teacherSupport: "", parentSupport: "" },
            THOI_QUEN: { items: [], teacherSupport: "", parentSupport: "" },
            KY_NANG_CAM_XUC: { items: [], teacherSupport: "", parentSupport: "" },
            DINH_HUONG: { items: [], teacherSupport: "", parentSupport: "" }
          }

          rawGoals.forEach((g: any) => {
            let catKey = g.category
            if (catKey === "THOI_QUEN_SUC_KHOE") catKey = "THOI_QUEN"
            if (catKey === "KY_NANG_SO_THICH" || catKey === "PHAM_CHAT") catKey = "KY_NANG_CAM_XUC"

            if (catKey && customMap[catKey]) {
              if (g.teacherSupportRequest) customMap[catKey].teacherSupport = g.teacherSupportRequest
              if (g.parentSupportRequest) customMap[catKey].parentSupport = g.parentSupportRequest
              
              if (g.targetText) {
                customMap[catKey].items.push({
                  targetText: g.targetText || "",
                  actionText: g.actions?.[0]?.actionText || "",
                  teacherSupport: g.teacherSupportRequest || "",
                  parentSupport: g.parentSupportRequest || ""
                })
              }
            }
          })

          Object.keys(customMap).forEach(cat => {
            if (customMap[cat].items.length === 0) {
              customMap[cat].items = [{ targetText: "", actionText: "" }]
            }
          })

          setCustomGoals(customMap)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUnlockData(sId: string) {
    if (!sId) return
    try {
      const res = await fetch(`/api/advisory/goals/unlock?studentId=${sId}&academicYearId=${academicYearId}&_t=${Date.now()}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setUnlockData(data.activeUnlock || null)
        setUnlockHistory(data.history || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSaveK1Goals(data: { goals: K1GoalData[]; studentCommitment: string; fingerprintStamped: boolean }) {
    if (submittedAt) {
      alert("Phiếu mục tiêu đã được gửi cho GVCN nên không thể chỉnh sửa.")
      return
    }
    if (!studentId) {
      alert("Chưa xác định được thông tin học sinh. Vui lòng đăng nhập lại.")
      return
    }
    try {
      setSaving(true)
      const goalListPayload = data.goals.map(g => ({
        category: g.category,
        targetText: g.targetText,
        actions: g.actionText ? [{ actionText: g.actionText }] : []
      }))

      const res = await fetch("/api/advisory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          gradeLevel: "K1",
          goals: goalListPayload,
          studentCommitment: data.studentCommitment,
          signedByStudent: data.fingerprintStamped
        })
      })

      const resData = await res.json().catch(() => ({}))
      if (res.ok && resData.success) {
        setSubmittedAt(new Date().toLocaleDateString("vi-VN"))
        setToastMessage("Đã LƯU & GỬI BẢNG MỤC TIÊU KHỐI 1 về Quản lý Cố Vấn Học Tập & GVCN thành công!")
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

  async function handleSaveGoals() {
    if (submittedAt) {
      alert("Phiếu mục tiêu đã được gửi cho GVCN nên không thể chỉnh sửa.")
      return
    }

    if (!studentId) {
      alert("Chưa xác định được thông tin học sinh. Vui lòng đăng nhập lại.")
      return
    }

    try {
      setSaving(true)
      const goalListPayload: any[] = []

      // Collect ALL custom specific goals added by student
      Object.keys(customGoals).forEach(cat => {
        const catObj = customGoals[cat]
        if (catObj && catObj.items && Array.isArray(catObj.items)) {
          catObj.items.forEach((item: any) => {
            if (item.targetText && item.targetText.trim()) {
              goalListPayload.push({
                category: cat,
                targetText: item.targetText.trim(),
                teacherSupportRequest: item.teacherSupport || catObj.teacherSupport || null,
                parentSupportRequest: item.parentSupport || catObj.parentSupport || null,
                actions: item.actionText ? [{ actionText: item.actionText.trim() }] : []
              })
            }
          })
        }
      })

      if (goalListPayload.length === 0) {
        alert("Vui lòng chọn hoặc gõ ít nhất 1 mục tiêu cụ thể trước khi lưu phiếu.")
        setSaving(false)
        return
      }

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
        fetchUnlockData(studentId)
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

  const isK1 = gradeLevel === "K1" || gradeLevel === "1" || studentGrade === "K1" || (className && (className.startsWith("1.") || className.startsWith("1INT") || className.startsWith("1UK") || className.startsWith("1S") || className.includes("Khối 1")))
  const isHighSchool = ["K9", "K10", "K11", "K12", "9", "10", "11", "12"].includes(gradeLevel) || ["K9", "K10", "K11", "K12", "9", "10", "11", "12"].includes(studentGrade) || (className && /(?:^|[\s_])(9|10|11|12)[A-Z._]/i.test(className))
  const isSubmitted = !!submittedAt

  // 4 Target Categories matching official Word/PDF Form Template
  const secondaryCategories = [
    {
      key: "HOC_TAP",
      number: "1",
      title: "Mục tiêu học tập",
      hint: "Môn học, phương pháp học, điểm số...",
    },
    {
      key: "THOI_QUEN",
      number: "2",
      title: "Mục tiêu thói quen",
      hint: "Kỷ luật, tự học, hoàn thành nhiệm vụ đúng thời hạn, thói quen ăn uống, nghỉ ngơi...",
    },
    {
      key: "KY_NANG_CAM_XUC",
      number: "3",
      title: "Mục tiêu kỹ năng, cảm xúc",
      hint: "Giao tiếp, thuyết trình, làm việc nhóm, tư duy phản biện, quản lý cảm xúc...",
    },
    {
      key: "DINH_HUONG",
      number: "4",
      title: "Mục tiêu định hướng",
      hint: "Khám phá bản thân, ngành nghề, lộ trình tương lai...",
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
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-[#003B3A] rounded-3xl p-6 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-white/20 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>MỤC TIÊU NĂM HỌC 2026 - 2027 — KHỐI {gradeLevel.replace("K", "")}</span>
          </div>

          <div className="flex items-center gap-2 select-grade-level-switcher">
            <span className="text-xs font-bold text-teal-100">Chuyển xem Khối:</span>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="px-3 py-1 rounded-xl bg-white/20 text-white font-extrabold text-xs focus:outline-none border border-white/30 cursor-pointer"
            >
              <option value="K1" className="text-slate-800">🎒 Khối 1 (Mẫu Mới)</option>
              <option value="K2" className="text-slate-800">Khối 2</option>
              <option value="K3" className="text-slate-800">Khối 3</option>
              <option value="K4" className="text-slate-800">Khối 4 - 5</option>
              <option value="K8" className="text-slate-800">Khối 6 - 8</option>
              <option value="K9" className="text-slate-800">Khối 9 - 12 (Có Mở Khóa)</option>
            </select>
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">KẾ HOẠCH PHÁT TRIỂN & MỤC TIÊU CÁ NHÂN</h1>
          <p className="text-xs sm:text-sm text-teal-100 font-medium italic">
            Hệ thống quản lý mục tiêu học tập, rèn luyện và mở khóa hành động 7 ngày cho học sinh Sky-Line
          </p>
        </div>

        {/* Submission Status Badge */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {isSubmitted ? (
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>GIAI ĐOẠN 1: ĐÃ GỬI CHO GVCN ({submittedAt})</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 shadow-sm">
              <Clock className="w-4 h-4" />
              <span>GIAI ĐOẠN 1: ĐANG DỰ THẢO — CHƯA GỬI</span>
            </span>
          )}

          {isHighSchool && (
            <span className="px-3 py-1.5 rounded-full bg-indigo-500/80 text-white font-black text-xs flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span>Áp dụng Giai đoạn 2: Mở khóa mục tiêu</span>
            </span>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-3 animate-bounce shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3-STAGE PROGRESS STEPPER */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveStage(1)}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeStage === 1
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <div className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-black ${
            activeStage === 1 ? "bg-white text-[#003B3A]" : "bg-slate-200 text-slate-600"
          }`}>
            1
          </div>
          <span>1. Mục Tiêu Năm Học</span>
          {isSubmitted && <Check className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveStage(2)
            setShowWizard(false)
          }}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeStage === 2
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <div className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-black ${
            activeStage === 2 ? "bg-white text-[#003B3A]" : "bg-slate-200 text-slate-600"
          }`}>
            2
          </div>
          <span>2. Mở Khóa Mục Tiêu {isHighSchool ? "(K9–12)" : ""}</span>
          {unlockData && unlockData.status === "IN_PROGRESS" && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-[10px] text-white font-bold">
              Đang Sprint 7 ngày
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveStage(3)}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeStage === 3
              ? "bg-[#003B3A] text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <div className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-black ${
            activeStage === 3 ? "bg-white text-[#003B3A]" : "bg-slate-200 text-slate-600"
          }`}>
            3
          </div>
          <span>3. Theo Dõi Tiến Trình</span>
          {trackingLogs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
              {trackingLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: MỤC TIÊU NĂM HỌC (GIỮ NGUYÊN 100% CẤU TRÚC GIAI ĐOẠN 1) */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-6">
          {/* Quick CTA banner to Stage 2 if High School and Submitted */}
          {isHighSchool && isSubmitted && (
            <div className="bg-gradient-to-r from-teal-900 to-sky-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-teal-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-300">GIAI ĐOẠN 2 SẴN SÀNG</h4>
                  <p className="text-xs text-teal-100 font-medium">
                    Phiếu mục tiêu năm học đã nộp. Em có thể bước vào <strong>Giai đoạn 2: Mở khóa mục tiêu (Sprint 7 ngày)</strong> bất kỳ lúc nào!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveStage(2)
                  setShowWizard(false)
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <span>Chuyển sang Giai đoạn 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Lock Notice Banner when Submitted */}
          {isSubmitted && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-amber-950">PHIẾU MỤC TIÊU ĐÃ GỬI CHO GVCN — CHẾ ĐỘ CHỈ XEM</h3>
                  <p className="text-xs text-amber-800 font-medium">
                    Phiếu mục tiêu năm học đã được gửi chính thức ngày <strong className="text-amber-950 font-black">{submittedAt}</strong>. Học sinh chỉ có thể xem lại và theo dõi nhật ký đánh giá từ GVCN, không thể chỉnh sửa.
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 bg-amber-200 text-amber-950 rounded-2xl font-black text-xs shrink-0 border border-amber-300 shadow-xs">
                🔒 ĐÃ KHÓA CHỈNH SỬA
              </span>
            </div>
          )}

          {isK1 ? (
            <K1GoalForm
              studentName={studentName}
              studentGrade={studentGrade}
              className={className}
              initialGoals={k1GoalsList}
              initialCommitment={studentCommitment}
              isSubmitted={isSubmitted}
              onSave={handleSaveK1Goals}
            />
          ) : (
            <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase">
                    BẢNG ĐIỀN MỤC TIÊU & HÀNH ĐỘNG NĂM HỌC — KHỐI {gradeLevel.replace("K", "")}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Điền mục tiêu cụ thể, hành động tương ứng và nội dung cần Thầy Cô / Ba Mẹ đồng hành
                  </p>
                </div>
                <div className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  4 Nhóm Mục Tiêu Chuẩn
                </div>
              </div>

              {secondaryCategories.map((cat) => {
                const catObj = customGoals[cat.key] || { items: [{ targetText: "", actionText: "" }], teacherSupport: "", parentSupport: "" }
                const items = catObj.items || [{ targetText: "", actionText: "" }]

                return (
                  <div key={cat.key} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#003B3A] text-white text-xs font-black flex items-center justify-center">
                          {cat.number}
                        </span>
                        <h3 className="text-sm font-black text-slate-900">{cat.title}</h3>
                      </div>
                      <span className="text-[11px] text-slate-500 italic hidden sm:inline">{cat.hint}</span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-teal-800">
                              Mục tiêu {idx + 1}:
                            </span>
                            {!isSubmitted && items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextItems = items.filter((_: any, i: number) => i !== idx)
                                  setCustomGoals({
                                    ...customGoals,
                                    [cat.key]: { ...catObj, items: nextItems }
                                  })
                                }}
                                className="text-[11px] text-rose-600 font-bold hover:underline"
                              >
                                Xóa mục tiêu này
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Nội dung mục tiêu:
                              </label>
                              <input
                                type="text"
                                readOnly={isSubmitted}
                                value={item.targetText || ""}
                                onChange={(e) => {
                                  const nextItems = [...items]
                                  nextItems[idx] = { ...nextItems[idx], targetText: e.target.value }
                                  setCustomGoals({
                                    ...customGoals,
                                    [cat.key]: { ...catObj, items: nextItems }
                                  })
                                }}
                                placeholder="Ví dụ: Đạt IELTS 6.5, dậy lúc 5h30 sáng..."
                                className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                                  isSubmitted ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed" : "border-slate-300 focus:border-teal-500"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Hành động cụ thể:
                              </label>
                              <input
                                type="text"
                                readOnly={isSubmitted}
                                value={item.actionText || ""}
                                onChange={(e) => {
                                  const nextItems = [...items]
                                  nextItems[idx] = { ...nextItems[idx], actionText: e.target.value }
                                  setCustomGoals({
                                    ...customGoals,
                                    [cat.key]: { ...catObj, items: nextItems }
                                  })
                                }}
                                placeholder="Ví dụ: Luyện đề mỗi tối 45 phút..."
                                className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                                  isSubmitted ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed" : "border-slate-300 focus:border-teal-500"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextItems = [...items, { targetText: "", actionText: "" }]
                            setCustomGoals({
                              ...customGoals,
                              [cat.key]: { ...catObj, items: nextItems }
                            })
                          }}
                          className="text-xs font-black text-teal-700 hover:text-teal-900 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-teal-50"
                        >
                          + Thêm mục tiêu trong nhóm này
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Nội dung cần Thầy Cô hỗ trợ:
                        </label>
                        <input
                          type="text"
                          readOnly={isSubmitted}
                          value={catObj.teacherSupport || ""}
                          onChange={(e) => {
                            setCustomGoals({
                              ...customGoals,
                              [cat.key]: { ...catObj, teacherSupport: e.target.value }
                            })
                          }}
                          placeholder="Thầy Cô hỗ trợ cung cấp tài liệu, hướng dẫn phương pháp..."
                          className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                            isSubmitted ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed" : "border-slate-300 focus:border-teal-500"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Nội dung cần Ba Mẹ hỗ trợ:
                        </label>
                        <input
                          type="text"
                          readOnly={isSubmitted}
                          value={catObj.parentSupport || ""}
                          onChange={(e) => {
                            setCustomGoals({
                              ...customGoals,
                              [cat.key]: { ...catObj, parentSupport: e.target.value }
                            })
                          }}
                          placeholder="Ba Mẹ động viên, nhắc nhở giờ giấc, tạo không gian yên tĩnh..."
                          className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                            isSubmitted ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed" : "border-slate-300 focus:border-teal-500"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                  <span>Em cam kết sẽ:</span>
                </label>
                <textarea
                  rows={3}
                  readOnly={isSubmitted}
                  value={studentCommitment}
                  onChange={(e) => !isSubmitted && setStudentCommitment(e.target.value)}
                  placeholder="Chủ động và nghiêm túc thực hiện những mục tiêu đã đề ra, duy trì kỷ luật, thói quen tự học..."
                  className={`w-full p-4 rounded-2xl border-2 text-xs font-semibold focus:outline-none ${
                    isSubmitted ? "bg-slate-100/80 text-slate-700 border-slate-200 cursor-not-allowed" : "border-slate-200 focus:border-teal-500"
                  }`}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => !isSubmitted && setFingerprintStamped(!fingerprintStamped)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md ${
                      isSubmitted
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                        : fingerprintStamped
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
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isSubmitted ? "Phiếu đã được đóng dấu cam kết và gửi về GVCN" : "Nhấn vào dấu tay để xác nhận cam kết cá nhân"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveGoals}
                  disabled={saving || isSubmitted}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isSubmitted
                      ? "bg-slate-400 text-slate-100 cursor-not-allowed shadow-none"
                      : "bg-[#003B3A] hover:bg-[#002D2C] text-white shadow-teal-950/20 hover:scale-105 active:scale-95"
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <Lock className="w-4 h-4 text-slate-200" />
                      <span>ĐÃ GỬI CHO GVCN (KHÔNG THỂ SỬA)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-teal-300" />
                      <span>{saving ? "Đang gửi..." : "LƯU & GỬI PHIẾU MỤC TIÊU CHO GVCN"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: MỞ KHÓA MỤC TIÊU (KHỐI 9–12 SPRINT 7 NGÀY) */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-6">
          {!isHighSchool ? (
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900">Giai Đoạn 2 Dành Riêng Cho Học Sinh Khối 9 – 12</h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                Quy trình "Mở khóa mục tiêu" và Sprint hành động 7 ngày hiện áp dụng cho cấp THPT (Khối 9, 10, 11, 12).
                Học sinh các khối khác tiếp tục theo dõi tiến trình tại Giai đoạn 1 và Giai đoạn 3.
              </p>
              <button
                onClick={() => setActiveStage(1)}
                className="px-4 py-2 bg-[#003B3A] text-white font-bold text-xs rounded-xl"
              >
                Quay lại Giai đoạn 1
              </button>
            </div>
          ) : !unlockData || showWizard ? (
            <GoalUnlockWizard
              studentId={studentId}
              goalSheetId={goalSheetId}
              academicYearId={academicYearId}
              stage1Goals={stage1GoalItems}
              onFinish={(createdUnlock) => {
                setUnlockData(createdUnlock)
                setShowWizard(false)
                setToastMessage("Đã mở khóa mục tiêu thành công! Bắt đầu Sprint 7 ngày.")
                setTimeout(() => setToastMessage(""), 5000)
                fetchUnlockData(studentId)
              }}
              onCancel={() => {
                if (unlockData) setShowWizard(false)
                else setActiveStage(1)
              }}
            />
          ) : (
            <div className="space-y-6">
              <GoalUnlockCard
                unlock={unlockData}
                onSprintCompleted={(updated) => {
                  setUnlockData(updated)
                  setToastMessage("Chúc mừng em đã hoàn thành Sprint 7 ngày!")
                  setTimeout(() => setToastMessage(""), 5000)
                  fetchUnlockData(studentId)
                }}
                onStartNewSprint={() => setShowWizard(true)}
              />

              {/* Lịch sử các đợt mở khóa trước nếu có */}
              {unlockHistory.length > 1 && (
                <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-black text-xs uppercase text-slate-700 tracking-wider">
                    LỊCH SỬ CÁC ĐỢT MỞ KHÓA MỤC TIÊU ({unlockHistory.length - 1} đợt trước)
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {unlockHistory.filter(u => u.id !== unlockData.id).map(prevU => (
                      <div key={prevU.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{prevU.targetText}</p>
                          <p className="text-[11px] text-slate-500">
                            Chìa khóa: <strong>{prevU.selectedKey}</strong> • Bắt đầu: {new Date(prevU.startDate).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                          {prevU.status === "COMPLETED" ? "ĐÃ HOÀN THÀNH" : "ĐANG CHẠY"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: THEO DÕI TIẾN TRÌNH & NHẬT KÝ ĐÁNH GIÁ CỦA GVCN */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                <span>LỊCH SỬ PHIẾU & NHẬT KÝ THEO DÕI ĐÁNH GIÁ CỦA GVCN</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ghi nhận các mốc đánh giá, nhận xét động viên và đồng hành từ Giáo viên Chủ nhiệm
              </p>
            </div>
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
      )}

    </div>
  )
}
