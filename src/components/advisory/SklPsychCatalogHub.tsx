"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  CheckCircle2,
  RefreshCw,
  Sparkles,
  FileCheck2,
  ArrowLeft,
  ArrowRight,
  Save,
  Compass,
  Clock,
  FileText,
  Layers,
  Award,
  Check,
  Play,
  RotateCcw,
  ShieldCheck,
  User
} from "lucide-react"
import {
  SKL_PSYCH_CATALOG,
  OFFICIAL_DISCLAIMER_VI,
  getTestConfig,
  isQuestionAnswered,
  normalizeAnswersArray,
  type SklPsychTestCode
} from "@/lib/advisory/skl-psych-suite"
import SklPsychReportViewer from "./SklPsychReportViewer"

interface SklPsychCatalogHubProps {
  studentId?: string
  studentCode?: string
  academicYearId?: string
  viewerRole: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN"
  initialTestCode?: SklPsychTestCode | null
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const TEST_DIMENSIONS: Record<SklPsychTestCode, { label: string; color: string }[]> = {
  DISC: [
    { label: "D • Thống trị", color: "bg-rose-50 text-rose-700 border-rose-200/70" },
    { label: "I • Ảnh hưởng", color: "bg-amber-50 text-amber-700 border-amber-200/70" },
    { label: "S • Kiên định", color: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
    { label: "C • Tuân thủ", color: "bg-sky-50 text-sky-700 border-sky-200/70" }
  ],
  EPI: [
    { label: "E • Hướng ngoại – Hướng nội", color: "bg-teal-50 text-teal-700 border-teal-200/70" },
    { label: "N • Ổn định cảm xúc", color: "bg-indigo-50 text-indigo-700 border-indigo-200/70" },
    { label: "L • Thang độ tin cậy", color: "bg-slate-100 text-slate-700 border-slate-200" }
  ],
  HOLLAND: [
    { label: "R • Thực tế", color: "bg-orange-50 text-orange-700 border-orange-200/70" },
    { label: "I • Nghiên cứu", color: "bg-sky-50 text-sky-700 border-sky-200/70" },
    { label: "A • Nghệ thuật", color: "bg-purple-50 text-purple-700 border-purple-200/70" },
    { label: "S • Xã hội", color: "bg-emerald-50 text-emerald-700 border-emerald-200/70" },
    { label: "E • Quản lý", color: "bg-amber-50 text-amber-700 border-amber-200/70" },
    { label: "C • Nghiệp vụ", color: "bg-teal-50 text-teal-700 border-teal-200/70" }
  ],
  LYUSIN_EQ: [
    { label: "MEI • EQ Liên nhân cách", color: "bg-sky-50 text-sky-700 border-sky-200/70" },
    { label: "VEI • EQ Nội nhân cách", color: "bg-teal-50 text-teal-700 border-teal-200/70" },
    { label: "PE • Thấu cảm", color: "bg-purple-50 text-purple-700 border-purple-200/70" },
    { label: "UE • Quản trị cảm xúc", color: "bg-emerald-50 text-emerald-700 border-emerald-200/70" }
  ],
  MBTI: [
    { label: "E / I • Xu hướng tự nhiên", color: "bg-purple-50 text-purple-700 border-purple-200/70" },
    { label: "S / N • Tìm hiểu thế giới", color: "bg-indigo-50 text-indigo-700 border-indigo-200/70" },
    { label: "T / F • Quyết định & Lý trí", color: "bg-sky-50 text-sky-700 border-sky-200/70" },
    { label: "J / P • Tổ chức & Nguyên tắc", color: "bg-teal-50 text-teal-700 border-teal-200/70" }
  ]
}

const TEST_THEME: Record<
  SklPsychTestCode,
  {
    iconBg: string
    iconBorder: string
    codeColor: string
    topBar: string
    stepRoleLabel: string
  }
> = {
  DISC: {
    iconBg: "bg-rose-50 text-rose-600",
    iconBorder: "border-rose-200/80",
    codeColor: "text-rose-600",
    topBar: "from-rose-500 to-orange-500",
    stepRoleLabel: "HÀNH VI"
  },
  EPI: {
    iconBg: "bg-teal-50 text-teal-600",
    iconBorder: "border-teal-200/80",
    codeColor: "text-teal-600",
    topBar: "from-teal-500 to-emerald-500",
    stepRoleLabel: "KHÍ CHẤT"
  },
  HOLLAND: {
    iconBg: "bg-amber-50 text-amber-600",
    iconBorder: "border-amber-200/80",
    codeColor: "text-amber-600",
    topBar: "from-amber-500 to-orange-500",
    stepRoleLabel: "NGHỀ NGHIỆP"
  },
  LYUSIN_EQ: {
    iconBg: "bg-sky-50 text-sky-600",
    iconBorder: "border-sky-200/80",
    codeColor: "text-sky-600",
    topBar: "from-sky-500 to-blue-600",
    stepRoleLabel: "CẢM XÚC EQ"
  },
  MBTI: {
    iconBg: "bg-purple-50 text-[#5B2D8B]",
    iconBorder: "border-purple-200/80",
    codeColor: "text-[#5B2D8B]",
    topBar: "from-[#5B2D8B] to-indigo-600",
    stepRoleLabel: "TÍNH CÁCH"
  }
}

export default function SklPsychCatalogHub({
  studentId,
  studentCode,
  academicYearId = "",
  viewerRole,
  initialTestCode = null
}: SklPsychCatalogHubProps) {
  const [loading, setLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [catalog, setCatalog] = useState<any[]>(SKL_PSYCH_CATALOG)
  const [completedByTest, setCompletedByTest] = useState<Record<string, any>>({})
  const [draftsByTest, setDraftsByTest] = useState<Record<string, any>>({})
  const [orientationGoals, setOrientationGoals] = useState<any[]>([])

  // Views: "hub" | "player" | "report"
  const [view, setView] = useState<"hub" | "player" | "report">("hub")
  const [activeTestCode, setActiveTestCode] = useState<SklPsychTestCode>(
    initialTestCode || "HOLLAND"
  )

  // Player states
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [savingDraft, setSavingDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [navFilter, setNavFilter] = useState<"ALL" | "UNANSWERED">("ALL")
  const [errorMsg, setErrorMsg] = useState("")
  const [toastMsg, setToastMsg] = useState("")

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ mode: "student", _t: String(Date.now()) })
      if (studentId) params.set("studentId", studentId)
      if (studentCode) params.set("studentCode", studentCode)

      const res = await fetch(`/api/advisory/psych-suite?${params.toString()}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const data = await res.json()
        setStudentInfo(data.student || null)
        if (Array.isArray(data.catalog)) setCatalog(data.catalog)
        setCompletedByTest(data.completedByTest || {})
        setDraftsByTest(data.draftsByTest || {})
        setOrientationGoals(data.orientationGoals || [])
      }
    } catch (e) {
      console.error("[SklPsychCatalogHub] loadPortfolio error:", e)
    } finally {
      setLoading(false)
    }
  }, [studentId, studentCode])

  useEffect(() => {
    loadPortfolio()
  }, [loadPortfolio])

  // Timer when in player mode
  useEffect(() => {
    if (view !== "player") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [view])

  const startTestPlayer = async (testCode: SklPsychTestCode, forceNew = false) => {
    setErrorMsg("")
    setActiveTestCode(testCode)
    setView("player")
    setNavFilter("ALL")
    setLoadingQuestions(true)

    try {
      const params = new URLSearchParams({
        mode: "student",
        testCode,
        includeQuestions: "1",
        _t: String(Date.now())
      })
      if (studentInfo?.id || studentId) {
        params.set("studentId", studentInfo?.id || studentId || "")
      }
      const res = await fetch(`/api/advisory/psych-suite?${params.toString()}`, {
        cache: "no-store"
      })
      const data = await res.json()
      const qList = Array.isArray(data.questions) ? data.questions : []
      setQuestions(qList)

      const existingDraft = !forceNew ? data.draftsByTest?.[testCode] : null
      if (existingDraft?.answers) {
        const norm = normalizeAnswersArray(testCode, existingDraft.answers)
        setAnswers(norm)
        setElapsedSeconds(existingDraft.durationSeconds || 0)
        const firstUnanswered = norm.findIndex(v => !isQuestionAnswered(testCode, v))
        setCurrentIdx(firstUnanswered !== -1 ? firstUnanswered : 0)
      } else {
        setAnswers(Array(qList.length).fill(null))
        setElapsedSeconds(0)
        setCurrentIdx(0)
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Không thể tải ngân hàng câu hỏi.")
    } finally {
      setLoadingQuestions(false)
    }
  }

  const openTestReport = (testCode: SklPsychTestCode) => {
    setActiveTestCode(testCode)
    setView("report")
  }

  const handleSelectSimpleAnswer = useCallback(
    (val: any) => {
      setErrorMsg("")
      setAnswers(prev => {
        const next = [...prev]
        next[currentIdx] = val
        return next
      })
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(idx => Math.min(questions.length - 1, idx + 1))
      }
    },
    [currentIdx, questions.length]
  )

  const handleSelectDiscAnswer = (optIdx: number, kind: "most" | "least") => {
    setErrorMsg("")
    const cur = answers[currentIdx] || {}
    let most = cur.most
    let least = cur.least
    if (kind === "most") {
      most = optIdx
      if (least === optIdx) least = undefined
    } else {
      least = optIdx
      if (most === optIdx) most = undefined
    }
    const updatedItem = { most, least }
    const next = [...answers]
    next[currentIdx] = updatedItem
    setAnswers(next)

    if (most !== undefined && least !== undefined && most !== least) {
      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(idx => Math.min(questions.length - 1, idx + 1))
        }
      }, 280)
    }
  }

  // Keyboard shortcuts in player
  useEffect(() => {
    if (view !== "player" || loadingQuestions || submitting || questions.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (activeTestCode === "MBTI") {
        if (e.key === "1" || e.key.toLowerCase() === "a") {
          e.preventDefault()
          handleSelectSimpleAnswer("A")
        } else if (e.key === "2" || e.key.toLowerCase() === "b") {
          e.preventDefault()
          handleSelectSimpleAnswer("B")
        }
      } else if (activeTestCode === "LYUSIN_EQ") {
        if (["1", "2", "3", "4"].includes(e.key)) {
          e.preventDefault()
          handleSelectSimpleAnswer(Number(e.key) - 1)
        }
      } else if (activeTestCode === "EPI" || activeTestCode === "HOLLAND") {
        if (e.key === "1" || e.key.toLowerCase() === "y") {
          e.preventDefault()
          handleSelectSimpleAnswer(true)
        } else if (e.key === "2" || e.key.toLowerCase() === "n") {
          e.preventDefault()
          handleSelectSimpleAnswer(false)
        }
      }

      if (e.key === "ArrowRight" && currentIdx < questions.length - 1) {
        e.preventDefault()
        setCurrentIdx(i => Math.min(questions.length - 1, i + 1))
      } else if (e.key === "ArrowLeft" && currentIdx > 0) {
        e.preventDefault()
        setCurrentIdx(i => Math.max(0, i - 1))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    view,
    loadingQuestions,
    submitting,
    questions.length,
    activeTestCode,
    currentIdx,
    handleSelectSimpleAnswer
  ])

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true)
      const res = await fetch("/api/advisory/psych-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          testCode: activeTestCode,
          studentId: studentInfo?.id || studentId,
          academicYearId,
          currentStep: currentIdx + 1,
          durationSeconds: elapsedSeconds,
          answers
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.assessment) {
        setDraftsByTest(prev => ({ ...prev, [activeTestCode]: json.assessment }))
        setToastMsg("Đã lưu nháp tiến độ làm bài thành công!")
        setTimeout(() => setToastMsg(""), 3500)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSubmitAssessment = async () => {
    setErrorMsg("")
    const firstUnanswered = answers.findIndex(v => !isQuestionAnswered(activeTestCode, v))
    if (firstUnanswered !== -1) {
      setErrorMsg(
        `Bạn chưa hoàn thành câu số ${firstUnanswered + 1}. Vui lòng trả lời đầy đủ tất cả câu hỏi trước khi nộp bài.`
      )
      setCurrentIdx(firstUnanswered)
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/advisory/psych-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_ASSESSMENT",
          testCode: activeTestCode,
          studentId: studentInfo?.id || studentId,
          academicYearId,
          currentStep: questions.length,
          durationSeconds: elapsedSeconds,
          answers
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(json.error || "Đã xảy ra lỗi khi chấm điểm bài khảo sát.")
        setSubmitting(false)
        return
      }
      if (json.assessment) {
        setCompletedByTest(prev => ({ ...prev, [activeTestCode]: json.assessment }))
        setDraftsByTest(prev => ({ ...prev, [activeTestCode]: null }))
        setView("report")
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi kết nối máy chủ khi nộp bài.")
    } finally {
      setSubmitting(false)
    }
  }

  const completedCount = Object.values(completedByTest).filter(Boolean).length
  const completionPct = Math.round((completedCount / 5) * 100)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2 shadow-2xs">
        <Compass className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-600">
          Đang tải Hệ thống Khảo sát Tâm lý & Hướng nghiệp (SKL_PSYCH v2.6.1)...
        </p>
      </div>
    )
  }

  // ===========================================================================
  // SHARED HEADER & 5-STEP PROGRESS STRIP (MATCHING PARENT ADVISORY DESIGN)
  // ===========================================================================
  const renderTopSuiteHeader = () => (
    <div className="space-y-3.5 print:hidden">
      {/* 1. COMPACT SKY-LINE HERO BANNER (FOR STUDENT PORTAL STANDALONE PAGE) */}
      {viewerRole === "STUDENT" && (
        <div
          className="rounded-2xl px-5 py-4 sm:px-6 sm:py-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #003B3A 0%, #005250 55%, #007796 100%)"
          }}
        >
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-[38%] pointer-events-none select-none opacity-25"
            style={{
              backgroundImage: "url(/banners/banner-campus-general.png)",
              backgroundSize: "cover",
              backgroundPosition: "center right",
              maskImage: "linear-gradient(to right, transparent 0%, black 45%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 45%)"
            }}
          />

          <div className="space-y-1 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-300" />
              <span>Student Portal — Sky-Line Career & Psychology (SKL_PSYCH v2.6.1)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">
              Khảo Sát Tâm Lý & Hướng Nghiệp Toàn Diện
            </h1>
            <p className="text-xs text-teal-50/90 leading-relaxed">
              Đồng bộ liên thông 5 bộ công cụ trắc nghiệm chuẩn mực (<strong>DISC • EPI • HOLLAND • EQ Lyusin • MBTI</strong>) giữa <strong>Học Sinh ⇄ Thầy Cô Cố Vấn ⇄ Gia Đình</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative z-10">
            <span className="px-3 py-1 rounded-full bg-white text-[#003B3A] text-xs font-bold shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>{studentInfo?.campusName || "Sky-Line School"}</span>
            </span>
          </div>
        </div>
      )}

      {/* 2. UNIFIED SLIM STUDENT IDENTITY & STATUS BAR */}
      <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-white font-bold text-xs flex items-center justify-center shrink-0">
            {(studentInfo?.studentName || "H").charAt(0)}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-800">
              {studentInfo?.studentName || "Học sinh Sky-Line"}
            </span>
            {studentInfo?.className && (
              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 text-[11px] font-semibold">
                Lớp {studentInfo.className} (Khối {studentInfo?.gradeLevel || 10})
              </span>
            )}
            {studentInfo?.studentCode && (
              <span className="text-slate-500 hidden sm:inline">
                • Mã HS: <strong className="text-slate-700 font-mono">{studentInfo.studentCode}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 ${
              completedCount === 5
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : completedCount > 0
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                completedCount === 5
                  ? "bg-emerald-500"
                  : completedCount > 0
                  ? "bg-teal-500"
                  : "bg-amber-500"
              }`}
            />
            <span>
              {completedCount === 5
                ? "Đã hoàn thành 5/5 bộ công cụ"
                : completedCount > 0
                ? `Đã hoàn thành ${completedCount}/5 bộ công cụ`
                : "Chưa thực hiện bài khảo sát"}
            </span>
          </span>
        </div>
      </div>

      {/* 3. SLIM 5-STEP INSTRUMENT PROGRESS STRIP (MATCHING 8-STEP WORKFLOW BANNER) */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70">
              HỒ SƠ TÂM LÝ & HƯỚNG NGHIỆP 360°
            </span>
            <span className="text-xs font-bold text-slate-800">
              Chu trình Khám phá Bản thân & Định hướng Nghề nghiệp (5 Bộ Công Cụ)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#003B3A] to-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(6, completionPct)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-600">
              {completedCount}/5 bài ({completionPct}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SKL_PSYCH_CATALOG.map((item, idx) => {
            const done = completedByTest[item.code]
            const draft = draftsByTest[item.code]
            const isActiveTest = activeTestCode === item.code && view !== "hub"
            const theme = TEST_THEME[item.code]

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  if (done) {
                    openTestReport(item.code)
                  } else if (viewerRole === "STUDENT" || viewerRole === "PARENT") {
                    startTestPlayer(item.code)
                  } else {
                    openTestReport(item.code)
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isActiveTest
                    ? "bg-teal-50/90 border-teal-500 ring-1 ring-teal-500/30 shadow-2xs"
                    : done
                    ? "bg-emerald-50/40 border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/70"
                    : draft
                    ? "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                    : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      done
                        ? "bg-emerald-600 text-white"
                        : draft
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      done
                        ? "bg-white text-emerald-700 border-emerald-200 font-mono"
                        : draft
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-white text-slate-500 border-slate-200/80"
                    }`}
                  >
                    {done
                      ? done.primaryResultCode
                      : draft
                      ? `${draft.answeredCount}/${item.questionCount}`
                      : theme.stepRoleLabel}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {idx + 1}. {item.code === "LYUSIN_EQ" ? "EQ Lyusin" : item.code}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {done
                      ? "Đã có báo cáo 360°"
                      : draft
                      ? "Đang lưu nháp"
                      : `${item.questionCount} câu • ${item.estimatedMinutes}p`}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. SLEEK SEGMENTED TAB BAR */}
      <div className="bg-white rounded-xl p-1 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setView("hub")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              view === "hub"
                ? "bg-[#003B3A] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${view === "hub" ? "text-amber-300" : "text-slate-400"}`} />
            <span>1. Danh Mục 5 Bộ Công Cụ Khảo Sát</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstDone = SKL_PSYCH_CATALOG.find(c => completedByTest[c.code])
              openTestReport(firstDone ? firstDone.code : activeTestCode || "HOLLAND")
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              view === "report"
                ? "bg-[#003B3A] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Award className={`w-3.5 h-3.5 ${view === "report" ? "text-amber-300" : "text-slate-400"}`} />
            <span>2. Báo Cáo & Hồ Sơ Hướng Nghiệp 360° ({completedCount}/5)</span>
          </button>

          {view === "player" && (
            <button
              type="button"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[#003B3A] text-white shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>3. Đang Làm Bài Khảo Sát ({activeTestCode})</span>
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Chuẩn hóa SKL_PSYCH v2.6.1 • Bảo mật hồ sơ học sinh</span>
        </div>
      </div>
    </div>
  )

  // ===========================================================================
  // VIEW 1: MODERN 12-COLUMN INTERACTIVE PLAYER
  // ===========================================================================
  if (view === "player") {
    const cfg = getTestConfig(activeTestCode)
    const answeredCount = answers.filter(v => isQuestionAnswered(activeTestCode, v)).length
    const pct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0
    const currentQuestion = questions[currentIdx]

    return (
      <div className="space-y-4 select-none">
        {renderTopSuiteHeader()}

        {loadingQuestions ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2 shadow-2xs">
            <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
            <p className="text-xs font-bold text-slate-700">
              Đang nạp ngân hàng câu hỏi {cfg.name} ({cfg.questionCount} câu)...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT 8 COLUMNS: QUESTION PLAYER */}
            <div className="lg:col-span-8 space-y-3.5">
              {/* Slim Player Control Bar */}
              <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setView("hub")}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Danh mục</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/70">
                        {activeTestCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{cfg.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-teal-600" />
                    <span>{savingDraft ? "Đang lưu..." : "Lưu nháp"}</span>
                  </button>
                  <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>{formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>
              </div>

              {toastMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{toastMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Question Card */}
              {currentQuestion && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
                  {/* Progress bar inside card top */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#003B3A] uppercase tracking-wider">
                        {activeTestCode === "DISC"
                          ? `NHÓM CÂU HỎI ${currentIdx + 1} / ${questions.length}`
                          : `CÂU HỎI ${currentIdx + 1} / ${questions.length}`}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        Đã hoàn thành:{" "}
                        <strong className="text-teal-700">
                          {answeredCount}/{questions.length}
                        </strong>{" "}
                        ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#003B3A] via-teal-600 to-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="py-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {activeTestCode === "DISC"
                        ? `Nhóm ${currentIdx + 1}: Hãy chọn 01 đặc điểm GIỐNG EM NHẤT và 01 đặc điểm ÍT GIỐNG EM NHẤT trong 4 mô tả dưới đây:`
                        : currentQuestion.text}
                    </h3>
                  </div>

                  {/* 1. DISC MATRIX */}
                  {activeTestCode === "DISC" && currentQuestion.options && (
                    <div className="space-y-2.5">
                      <div className="hidden sm:flex items-center justify-between text-[11px] font-bold text-slate-500 px-3.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                        <span>Mô tả đặc điểm hành vi</span>
                        <div className="flex gap-2">
                          <span className="text-emerald-700 w-28 text-center">Giống nhất</span>
                          <span className="text-rose-700 w-28 text-center">Ít giống nhất</span>
                        </div>
                      </div>
                      {currentQuestion.options.map((opt: any, optIdx: number) => {
                        const curAns = answers[currentIdx] || {}
                        const isMost = curAns.most === optIdx
                        const isLeast = curAns.least === optIdx
                        return (
                          <div
                            key={optIdx}
                            className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isMost
                                ? "bg-emerald-50/60 border-emerald-300"
                                : isLeast
                                ? "bg-rose-50/60 border-rose-300"
                                : "bg-white border-slate-200/80 hover:border-slate-300"
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm block">
                                {opt.en}
                              </span>
                              <span className="text-xs text-slate-500 mt-0.5 block">{opt.vi}</span>
                            </div>
                            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => handleSelectDiscAnswer(optIdx, "most")}
                                className={`flex-1 sm:flex-none sm:w-28 py-2 px-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center border cursor-pointer ${
                                  isMost
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                                }`}
                              >
                                {isMost ? "✓ Giống nhất" : "Giống nhất"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectDiscAnswer(optIdx, "least")}
                                className={`flex-1 sm:flex-none sm:w-28 py-2 px-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center border cursor-pointer ${
                                  isLeast
                                    ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                                }`}
                              >
                                {isLeast ? "✓ Ít giống nhất" : "Ít giống nhất"}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 2. LYUSIN EQ 4-OPTION LIKERT */}
                  {activeTestCode === "LYUSIN_EQ" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { val: 0, text: "Hoàn toàn không đồng ý", key: "1" },
                        { val: 1, text: "Hiếm khi đồng ý", key: "2" },
                        { val: 2, text: "Đồng ý", key: "3" },
                        { val: 3, text: "Hoàn toàn đồng ý", key: "4" }
                      ].map(item => {
                        const selected = answers[currentIdx] === item.val
                        return (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => handleSelectSimpleAnswer(item.val)}
                            className={`p-3.5 rounded-xl font-bold text-xs sm:text-sm text-left transition flex items-center justify-between border cursor-pointer ${
                              selected
                                ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                                : "bg-white hover:bg-teal-50/40 text-slate-700 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            <span>{item.text}</span>
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              [{item.key}]
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 3. MBTI A/B OPTIONS */}
                  {activeTestCode === "MBTI" && currentQuestion.options && (
                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt: any, oIdx: number) => {
                        const selected = answers[currentIdx] === opt.value
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectSimpleAnswer(opt.value)}
                            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-left transition flex items-center justify-between border cursor-pointer ${
                              selected
                                ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                                : "bg-white hover:bg-teal-50/40 text-slate-700 border-slate-200 hover:border-teal-300"
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 ml-2 ${
                                selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              [{oIdx === 0 ? "1 / A" : "2 / B"}]
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 4. EPI & HOLLAND YES/NO */}
                  {(activeTestCode === "EPI" || activeTestCode === "HOLLAND") && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectSimpleAnswer(true)}
                        className={`py-3.5 px-5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 border cursor-pointer ${
                          answers[currentIdx] === true
                            ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                            : "bg-white hover:bg-teal-50/50 text-slate-700 border-slate-200 hover:border-teal-300"
                        }`}
                      >
                        <span className="text-xs font-mono opacity-70">[1]</span>
                        <span>Có (Đúng với em)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSimpleAnswer(false)}
                        className={`py-3.5 px-5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 border cursor-pointer ${
                          answers[currentIdx] === false
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-white hover:bg-rose-50/50 text-slate-700 border-slate-200 hover:border-rose-300"
                        }`}
                      >
                        <span className="text-xs font-mono opacity-70">[2]</span>
                        <span>Không</span>
                      </button>
                    </div>
                  )}

                  {/* Prev / Next / Submit Footer inside Question Card */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                      disabled={currentIdx === 0}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition cursor-pointer"
                    >
                      ← Câu trước
                    </button>

                    {answeredCount === questions.length && questions.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleSubmitAssessment}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-gradient-to-r from-[#003B3A] to-teal-600 hover:from-[#005250] hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang chấm điểm & Phân tích hồ sơ 360°...</span>
                          </>
                        ) : (
                          <span>✓ Hoàn Thành & Xem Báo Cáo 360°</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                        disabled={currentIdx === questions.length - 1}
                        className="px-4 py-2 rounded-xl bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition cursor-pointer"
                      >
                        Câu tiếp theo →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions Box */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs text-xs text-slate-600 leading-relaxed space-y-1">
                <div className="font-bold text-[#003B3A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Hướng dẫn thực hiện bài khảo sát {cfg.shortName}:</span>
                </div>
                <p className="whitespace-pre-line">{cfg.instructions}</p>
              </div>
            </div>

            {/* RIGHT 4 COLUMNS: STICKY QUESTION NAVIGATOR */}
            <div className="lg:col-span-4 space-y-3.5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Bảng điều hướng ({answeredCount}/{questions.length})
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setNavFilter("ALL")}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        navFilter === "ALL" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setNavFilter("UNANSWERED")}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        navFilter === "UNANSWERED"
                          ? "bg-white text-rose-700 shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      Chưa làm ({questions.length - answeredCount})
                    </button>
                  </div>
                </div>

                <div
                  className="grid gap-1.5 max-h-64 overflow-y-auto pr-1"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(34px, 1fr))" }}
                >
                  {questions.map((_, idx) => {
                    const isAns = isQuestionAnswered(activeTestCode, answers[idx])
                    if (navFilter === "UNANSWERED" && isAns) return null
                    const isCurrent = idx === currentIdx
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={`h-8 rounded-lg text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                          isCurrent
                            ? "bg-[#003B3A] text-white ring-2 ring-teal-500/40"
                            : isAns
                            ? "bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100"
                            : "bg-slate-50 border border-slate-200/80 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-teal-100 border border-teal-300 inline-block" />
                    Đã trả lời ({answeredCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-300 inline-block" />
                    Chưa làm ({questions.length - answeredCount})
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-[11px] text-slate-500 leading-relaxed">
                {OFFICIAL_DISCLAIMER_VI}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================================================================
  // VIEW 2: REPORT & 360 PORTFOLIO VIEW
  // ===========================================================================
  if (view === "report") {
    const activeAssessment = completedByTest[activeTestCode]
    const cfg = getTestConfig(activeTestCode)

    return (
      <div className="space-y-4">
        {renderTopSuiteHeader()}

        {activeAssessment ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cfg.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{cfg.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    Mã hồ sơ: <strong className="font-mono text-slate-700">{activeAssessment.lookupCode}</strong> • Hoàn thành ngày{" "}
                    {activeAssessment.completedAt
                      ? new Date(activeAssessment.completedAt).toLocaleDateString("vi-VN")
                      : "gần đây"}
                  </p>
                </div>
              </div>

              {(viewerRole === "STUDENT" || viewerRole === "PARENT") && (
                <button
                  type="button"
                  onClick={() => startTestPlayer(activeTestCode, true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại khảo sát {activeTestCode}</span>
                </button>
              )}
            </div>

            <SklPsychReportViewer
              assessment={activeAssessment}
              viewerRole={viewerRole}
              orientationGoals={orientationGoals}
              onUpdated={updated => {
                setCompletedByTest(prev => ({ ...prev, [activeTestCode]: updated }))
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-2xl mx-auto">
              {cfg.icon}
            </div>
            <h3 className="text-base font-bold text-slate-800">{cfg.name}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {viewerRole === "PARENT"
                ? `Con (${studentInfo?.studentName || "Học sinh"}) hiện chưa thực hiện bài khảo sát ${cfg.shortName} (${cfg.questionCount} câu). Quý Phụ huynh có thể nhắc con thực hiện hoặc đồng hành cùng con làm bài ngay bên dưới.`
                : `Em chưa thực hiện bài khảo sát ${cfg.shortName} (${cfg.questionCount} câu hỏi • ~${cfg.estimatedMinutes} phút). Hãy bấm nút bên dưới để bắt đầu khám phá bản thân nhé!`}
            </p>
            {(viewerRole === "STUDENT" || viewerRole === "PARENT") && (
              <button
                type="button"
                onClick={() => startTestPlayer(activeTestCode)}
                className="px-5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắt đầu khảo sát {activeTestCode}</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ===========================================================================
  // VIEW 3: SLEEK, MODERN CATALOG HUB (MATCHING PARENT ADVISORY AESTHETIC)
  // ===========================================================================
  return (
    <div className="space-y-4">
      {renderTopSuiteHeader()}

      {/* Catalog Grid: 2 Columns of Refined, Slim Sky-Line Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map((item: any) => {
          const code = item.code as SklPsychTestCode
          const completed = completedByTest[code]
          const draft = draftsByTest[code]
          const isRec = item.recommendedGrades?.includes(studentInfo?.gradeLevel || 10)
          const theme = TEST_THEME[code] || TEST_THEME.HOLLAND
          const dimensions = TEST_DIMENSIONS[code] || []

          return (
            <div
              key={code}
              className="bg-white border border-slate-200/85 hover:border-teal-400/80 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 relative overflow-hidden group"
            >
              {/* Subtle top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.topBar}`} />

              <div className="space-y-3">
                {/* Card Header: Icon + Code + Single Clean Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl border ${theme.iconBorder} ${theme.iconBg} flex items-center justify-center text-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${theme.codeColor}`}>
                          {code === "LYUSIN_EQ" ? "LYUSIN EQ" : code}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {item.recommendedLabel}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mt-0.5 group-hover:text-[#003B3A] transition-colors">
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  {/* Single Status / Grade Match Badge on Right */}
                  {completed ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã hoàn thành</span>
                    </span>
                  ) : isRec ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80 text-[10px] font-semibold shrink-0">
                      ★ Phù hợp Khối {studentInfo?.gradeLevel || 10}
                    </span>
                  ) : null}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                {/* Measured Dimensions Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {dimensions.map((d, dIdx) => (
                    <span
                      key={dIdx}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${d.color}`}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>

                {/* Completed Result Summary Banner */}
                {completed && (
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-emerald-700 block">
                        Kết quả gần nhất • Mã hồ sơ: {completed.lookupCode}
                      </span>
                      <span className="text-xs font-bold text-emerald-950 truncate block">
                        {completed.primaryResultLabel || completed.primaryResultCode}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-mono font-bold text-xs shrink-0 shadow-2xs">
                      {completed.primaryResultCode}
                    </span>
                  </div>
                )}

                {/* Draft Progress Banner */}
                {!completed && draft && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 font-semibold flex items-center justify-between">
                    <span>
                      Đang lưu nháp: <strong>{draft.answeredCount}/{item.questionCount} câu</strong>
                    </span>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                      Tiếp tục làm bài
                    </span>
                  </div>
                )}
              </div>

              {/* Clean Slim Footer: Left Metadata • Right Action Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.estimatedMinutes} phút</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.questionCount} câu hỏi</span>
                  </span>
                </div>

                {completed ? (
                  <div className="flex items-center gap-2">
                    {viewerRole === "STUDENT" && (
                      <button
                        type="button"
                        onClick={() => startTestPlayer(code, true)}
                        className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      >
                        Làm lại
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openTestReport(code)}
                      className="px-4 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Xem báo cáo 360°</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startTestPlayer(code)}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-[#003B3A] hover:bg-[#005250] text-white shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>
                      {draft
                        ? `Tiếp tục (${draft.answeredCount}/${item.questionCount})`
                        : "Bắt đầu khảo sát"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* 6th Card in the 2x3 Bento Grid: Liên kết Sổ Mục Tiêu SMART & Tư Vấn 1:1 */}
        <div className="bg-gradient-to-br from-[#F4FBF9] via-white to-[#F0F7FF] border border-teal-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003B3A] to-[#48BFE3]" />

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#003B3A] text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 block">
                    LIÊN THÔNG CỐ VẤN HỌC TẬP 3 BÊN
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    Tổng Hợp Hồ Sơ Hướng Nghiệp 360° & Mục Tiêu SMART
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100/80 text-teal-800 text-[10px] font-bold shrink-0">
                {completedCount}/5 hoàn thành
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Kết quả từ 5 bộ công cụ tâm lý & hướng nghiệp được tự động đồng bộ vào <strong>Hồ sơ Cố vấn học tập</strong>, giúp gợi ý tổ hợp môn THPT, liên kết <strong>Mục tiêu Định hướng SMART</strong> và đặt lịch <strong>Tư vấn 1:1</strong> cùng Thầy Cô GVCN.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block">Đã hoàn thành</span>
                <span className="text-sm font-black text-[#003B3A]">{completedCount}/5 bài</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block">Mục tiêu Định hướng</span>
                <span className="text-sm font-black text-teal-700">{orientationGoals.length} mục tiêu</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-center">
                <span className="text-[10px] text-slate-500 font-semibold block">Đồng hành 3 bên</span>
                <span className="text-sm font-black text-emerald-700">HS ⇄ GV ⇄ PH</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-teal-100/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-teal-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>GVCN & Phụ huynh xem theo phân quyền</span>
            </span>

            <button
              type="button"
              onClick={() => {
                const firstDone = SKL_PSYCH_CATALOG.find(c => completedByTest[c.code])
                openTestReport(firstDone ? firstDone.code : "HOLLAND")
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Mở Hồ Sơ Hướng Nghiệp 360°</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
