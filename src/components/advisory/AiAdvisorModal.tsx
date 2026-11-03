"use client"

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  Target,
  HeartHandshake,
  Award,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Send,
  Calendar,
  Eye,
  ArrowLeft,
  Clock,
  Share2
} from "lucide-react"

export type AiModalMode =
  | "PROGRESS_ANALYSIS" // 3.2: AI Phân tích học sinh & tiến bộ
  | "CONSULTATION_TOPICS" // 3.3: AI Gợi ý nội dung trao đổi
  | "SMART_GOALS" // 3.4: AI Gợi ý mục tiêu SMART
  | "SUPPORT_SOLUTIONS" // 3.5: AI Đề xuất giải pháp & đánh giá
  | "TERM_EVALUATION" // 3.1: AI Nhận xét tiến bộ theo rubric

interface DraftGvbmAssignment {
  subjectId: string
  subjectName: string
  currentScore: number | null
  assignedToTeacherId: string
  assignedToTeacherName: string
  consultationPrompt: string
  supportGoal: string
  dueDate: string
  availableTeachers: Array<{
    teacherId: string
    teacherName: string
    teacherCode?: string
    subjectName?: string
  }>
}

interface AiAdvisorModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  academicYearId: string
  studentName?: string
  initialMode?: AiModalMode
  onApplyQuestion?: (question: string) => void
  onApplyGoal?: (goal: any) => void
  onApplyAction?: (actionText: string, deadlineDays?: number) => void
  onApplyRubricComment?: (comment: string, scores?: any) => void
}

function getDefaultDueDateStr(days = 5) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export default function AiAdvisorModal({
  isOpen,
  onClose,
  studentId,
  academicYearId,
  studentName,
  initialMode = "PROGRESS_ANALYSIS",
  onApplyQuestion,
  onApplyGoal,
  onApplyAction,
  onApplyRubricComment
}: AiAdvisorModalProps) {
  const [currentMode, setCurrentMode] = useState<AiModalMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [appliedItem, setAppliedItem] = useState<string | null>(null)

  // State quản lý Phân công GVBM & Chi tiết nhiệm vụ (giữ nguyên trạng thái AI Advisor)
  const [gvbmTasks, setGvbmTasks] = useState<any[]>([])
  const [selectedSubjectsForBatch, setSelectedSubjectsForBatch] = useState<Record<string, boolean>>({})
  const [activeSubDrawer, setActiveSubDrawer] = useState<"NONE" | "ASSIGN_FORM" | "TASK_LIST">("NONE")
  const [draftAssignments, setDraftAssignments] = useState<DraftGvbmAssignment[]>([])
  const [submittingAssign, setSubmittingAssign] = useState(false)
  const [toastBanner, setToastBanner] = useState<string>("")

  // State duyệt & công bố tư vấn GVBM cho PHHS ngay trong modal
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null)
  const [publishParentText, setPublishParentText] = useState<Record<string, string>>({})
  const [cvhtReviewNotes, setCvhtReviewNotes] = useState<Record<string, string>>({})
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const cacheRef = React.useRef<Record<string, any>>({})
  const abortRef = React.useRef<AbortController | null>(null)

  const loadGvbmTasks = async () => {
    if (!studentId) return
    try {
      const res = await fetch(
        `/api/advisory/gvbm-tasks?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.tasks)) {
          setGvbmTasks(json.tasks)
        }
      }
    } catch {}
  }

  const fetchAiSuggestions = async (mode: AiModalMode, forceRefresh = false) => {
    const cacheKey = `${studentId}_${academicYearId || "all"}_${mode}`

    if (!forceRefresh && cacheRef.current[cacheKey]) {
      setData(cacheRef.current[cacheKey])
      setLoading(false)
      setErrorMessage("")
      return
    }

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    let didTimeout = false
    const timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, 25000)

    try {
      setLoading(true)
      setErrorMessage("")
      if (!cacheRef.current[cacheKey]) {
        setData(null)
      }

      const res = await fetch("/api/advisory/ai-advisor/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          studentId,
          academicYearId,
          mode
        })
      })

      clearTimeout(timeoutId)
      if (abortRef.current !== controller) return

      if (res.ok) {
        const json = await res.json()
        cacheRef.current[cacheKey] = json
        setData(json)
        if (Array.isArray(json.existingGvbmTasks)) {
          setGvbmTasks(json.existingGvbmTasks)
        }
      } else {
        const errJson = await res.json().catch(() => null)
        setErrorMessage(errJson?.error || "Không thể tổng hợp dữ liệu từ máy chủ. Vui lòng thử lại.")
      }
    } catch (e: any) {
      if (abortRef.current !== controller) return
      if (didTimeout) {
        setErrorMessage("Thời gian phản hồi máy chủ kéo dài hơn bình thường. Vui lòng bấm 'Thử lại ngay'.")
      } else if (e?.name === "AbortError") {
        return
      } else {
        console.error("AiAdvisorModal error:", e)
        setErrorMessage("Lỗi kết nối khi gửi yêu cầu AI Advisor.")
      }
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (isOpen && studentId) {
      const mode = initialMode || "PROGRESS_ANALYSIS"
      setCurrentMode(mode)
      setActiveSubDrawer("NONE")
      fetchAiSuggestions(mode)
      loadGvbmTasks()
    } else if (!isOpen) {
      setData(null)
      setErrorMessage("")
      setActiveSubDrawer("NONE")
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [isOpen, studentId, initialMode])

  const handleSwitchMode = (mode: AiModalMode) => {
    setActiveSubDrawer("NONE")
    setCurrentMode(mode)
    fetchAiSuggestions(mode)
  }

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  // Mở form phân công cho 1 hoặc nhiều môn học
  const openAssignDrawerForTrends = (trendsToAssign: any[]) => {
    if (!trendsToAssign || trendsToAssign.length === 0) return
    const fallbackTeachers = Array.isArray(data?.classTeachers) ? data.classTeachers : []

    const drafts: DraftGvbmAssignment[] = trendsToAssign.map(tr => {
      const candidates =
        Array.isArray(tr.assignedTeachers) && tr.assignedTeachers.length > 0
          ? tr.assignedTeachers
          : fallbackTeachers
      const firstTeacher = candidates[0] || { teacherId: "", teacherName: "" }
      return {
        subjectId: tr.subjectId || firstTeacher.subjectId || "",
        subjectName: tr.subject,
        currentScore: typeof tr.currentScore === "number" ? tr.currentScore : null,
        assignedToTeacherId: firstTeacher.teacherId || "",
        assignedToTeacherName: firstTeacher.teacherName || "GVBM",
        consultationPrompt:
          tr.aiSuggestedPrompt ||
          `Nhờ Thầy/Cô GVBM môn ${tr.subject} nhận định nguyên nhân kết quả hiện tại (${tr.currentScore} đ) và đề xuất biện pháp bồi dưỡng cho học sinh ${studentName || ""}.`,
        supportGoal:
          tr.aiSuggestedGoal ||
          `Cải thiện điểm số môn ${tr.subject} đạt chuẩn từ 6.5 trở lên trong đợt kiểm tra tiếp theo.`,
        dueDate: getDefaultDueDateStr(5),
        availableTeachers: candidates
      }
    })

    setDraftAssignments(drafts)
    setActiveSubDrawer("ASSIGN_FORM")
  }

  const handleConfirmAssignGvbm = async (e: React.FormEvent) => {
    e.preventDefault()
    const validDrafts = draftAssignments.filter(
      d => d.assignedToTeacherId && d.consultationPrompt.trim()
    )
    if (validDrafts.length === 0) {
      alert("Vui lòng chọn Giáo viên bộ môn và nhập nội dung tư vấn.")
      return
    }

    try {
      setSubmittingAssign(true)
      const res = await fetch("/api/advisory/gvbm-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          tasks: validDrafts.map(d => ({
            subjectId: d.subjectId,
            subjectName: d.subjectName,
            currentScore: d.currentScore,
            assignedToTeacherId: d.assignedToTeacherId,
            assignedToTeacherName: d.assignedToTeacherName,
            consultationPrompt: d.consultationPrompt,
            supportGoal: d.supportGoal,
            dueDate: d.dueDate
          }))
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setToastBanner(
          json.message ||
            `Đã phân công ${validDrafts.length} GVBM hỗ trợ và đồng bộ sang Sổ Giáo viên!`
        )
        setTimeout(() => setToastBanner(""), 4500)
        setSelectedSubjectsForBatch({})
        await loadGvbmTasks()
        setActiveSubDrawer("TASK_LIST")
      } else {
        alert(json.error || "Không thể lưu phân công GVBM.")
      }
    } catch (err) {
      console.error("Assign GVBM error:", err)
    } finally {
      setSubmittingAssign(false)
    }
  }

  const handleApproveAndPublishToParent = async (task: any) => {
    const finalAdvice = (
      publishParentText[task.id] ??
      task.publishedParentAdvice ??
      task.gvbmParentAdvice ??
      task.gvbmProposedSolutions ??
      ""
    ).trim()

    if (!finalAdvice) {
      alert("Vui lòng nhập hoặc kiểm tra Nội dung tư vấn dành cho PHHS trước khi công bố.")
      return
    }

    try {
      setPublishingId(task.id)
      const res = await fetch("/api/advisory/gvbm-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: "CVHT_APPROVE_PUBLISH",
          publishedParentAdvice: finalAdvice,
          cvhtReviewNote: cvhtReviewNotes[task.id] || ""
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setToastBanner(json.message || "Đã phê duyệt và công bố tư vấn bộ môn tới PHHS!")
        setTimeout(() => setToastBanner(""), 4500)
        setReviewingTaskId(null)
        await loadGvbmTasks()
      } else {
        alert(json.error || "Không thể phê duyệt công bố.")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setPublishingId(null)
    }
  }

  if (!isOpen) return null

  const totalAssignedCount = gvbmTasks.length
  const respondedCount = gvbmTasks.filter(
    t =>
      t.status === "GVBM_RESPONDED" ||
      t.status === "APPROVED_FOR_PARENT" ||
      t.status === "PARENT_ACKNOWLEDGED"
  ).length
  const selectedBatchList = (data?.progressTrends || []).filter(
    (tr: any) => selectedSubjectsForBatch[tr.subject]
  )

  const STEPS: Array<{ id: AiModalMode; step: number; label: string; icon: any }> = [
    { id: "PROGRESS_ANALYSIS", step: 1, label: "Phân tích tiến bộ", icon: Target },
    { id: "CONSULTATION_TOPICS", step: 2, label: "Gợi ý trao đổi", icon: HelpCircle },
    { id: "SMART_GOALS", step: 3, label: "Mục tiêu SMART", icon: Award },
    { id: "SUPPORT_SOLUTIONS", step: 4, label: "Đề xuất giải pháp", icon: HeartHandshake },
    { id: "TERM_EVALUATION", step: 5, label: "Nhận xét định kỳ", icon: BookOpen }
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* 1. HEADER THANH MẢNH KÈM BADGE TIẾN ĐỘ PHÂN CÔNG GVBM */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#028090] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  Sky-Line AI Advisor • Trợ Lý Cố Vấn
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-100 text-[10px] font-semibold border border-emerald-400/30">
                  Dữ liệu Nội bộ SSM
                </span>
              </div>
              <p className="text-[11px] text-teal-100/90">
                {studentName ? `Hồ sơ học sinh: ${studentName}` : "Phân tích sư phạm & phối hợp GVBM"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút mở nhanh danh sách Nhiệm vụ GVBM mà không mất state đang nhập */}
            <button
              type="button"
              onClick={() =>
                setActiveSubDrawer(prev => (prev === "TASK_LIST" ? "NONE" : "TASK_LIST"))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeSubDrawer === "TASK_LIST"
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-xs"
                  : "bg-white/15 hover:bg-white/25 text-white border-white/20"
              }`}
              title="Xem chi tiết các nhiệm vụ GVBM đã giao và phê duyệt gửi PHHS"
            >
              <Users className="w-3.5 h-3.5" />
              <span>GVBM phối hợp: {totalAssignedCount}</span>
              {totalAssignedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/30 text-emerald-100 text-[10px]">
                  {respondedCount}/{totalAssignedCount} phản hồi
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. RESPONSIVE STEPPER BAR (KHÔNG CUỘN NGANG) */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {STEPS.map(st => {
              const Icon = st.icon
              const isActive = currentMode === st.id && activeSubDrawer === "NONE"
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSwitchMode(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer truncate ${
                    isActive
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isActive ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {st.step}
                  </span>
                  <Icon className="w-3.5 h-3.5 shrink-0 hidden md:inline" />
                  <span className="truncate">{st.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {toastBanner && (
          <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastBanner("")}
              className="text-emerald-600 hover:text-emerald-900 text-[11px]"
            >
              Đóng
            </button>
          </div>
        )}

        {/* 3. SINGLE VERTICAL SCROLL CONTAINER (KHÔNG LỒNG SCROLL) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ================================================================= */}
          {/* SUB-VIEW A: FORM PHÂN CÔNG 1 HOẶC NHIỀU GVBM HỖ TRỢ */}
          {/* ================================================================= */}
          {activeSubDrawer === "ASSIGN_FORM" ? (
            <form onSubmit={handleConfirmAssignGvbm} className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubDrawer("NONE")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại phân tích</span>
                  </button>
                  <h4 className="text-sm font-bold text-slate-900">
                    Phân Công GVBM Hỗ Trợ Học Sinh ({draftAssignments.length} môn)
                  </h4>
                </div>
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-semibold">
                  Đồng bộ trực tiếp sang Sổ Giáo viên của GVBM
                </span>
              </div>

              <div className="space-y-3">
                {draftAssignments.map((draft, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-[11px] font-bold">
                          Môn #{idx + 1}: {draft.subjectName}
                        </span>
                        {draft.currentScore !== null && (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Điểm hiện tại: {draft.currentScore} đ
                          </span>
                        )}
                      </div>
                      {draftAssignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftAssignments(prev => prev.filter((_, i) => i !== idx))
                          }
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa môn này
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          1. Giáo viên Bộ môn phụ trách (Tự động truy xuất theo phân công) *
                        </label>
                        <select
                          value={draft.assignedToTeacherId}
                          onChange={e => {
                            const selectedId = e.target.value
                            const matchedT = draft.availableTeachers.find(
                              t => t.teacherId === selectedId
                            )
                            setDraftAssignments(prev =>
                              prev.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      assignedToTeacherId: selectedId,
                                      assignedToTeacherName: matchedT?.teacherName || "GVBM"
                                    }
                                  : item
                              )
                            )
                          }}
                          className="raw-select w-full h-10 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 leading-normal focus:outline-none focus:border-teal-600"
                        >
                          {draft.availableTeachers.length === 0 ? (
                            <option value="">-- Chưa tìm thấy GVBM trong phân công --</option>
                          ) : (
                            draft.availableTeachers.map((t, tIdx) => (
                              <option key={`${t.teacherId}_${tIdx}`} value={t.teacherId}>
                                {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""}{" "}
                                {t.subjectName ? `— ${t.subjectName}` : ""}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          2. Thời hạn phản hồi của GVBM *
                        </label>
                        <input
                          type="date"
                          value={draft.dueDate}
                          onChange={e =>
                            setDraftAssignments(prev =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, dueDate: e.target.value } : item
                              )
                            )
                          }
                          className="raw-input w-full h-10 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-800 leading-normal focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        3. Mục tiêu hỗ trợ bộ môn (AI gợi ý — CVHT có thể chỉnh sửa) *
                      </label>
                      <input
                        type="text"
                        value={draft.supportGoal}
                        onChange={e =>
                          setDraftAssignments(prev =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, supportGoal: e.target.value } : item
                            )
                          )
                        }
                        className="raw-input w-full h-10 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 leading-normal focus:outline-none focus:border-teal-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        4. Nội dung CVHT đề nghị GVBM tư vấn & hỗ trợ *
                      </label>
                      <textarea
                        rows={2}
                        value={draft.consultationPrompt}
                        onChange={e =>
                          setDraftAssignments(prev =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, consultationPrompt: e.target.value }
                                : item
                            )
                          )
                        }
                        className="raw-textarea w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveSubDrawer("NONE")}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-4 py-2 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {submittingAssign
                      ? "Đang lưu & gửi thông báo..."
                      : `Xác nhận phân công (${draftAssignments.length} GVBM)`}
                  </span>
                </button>
              </div>
            </form>
          ) : activeSubDrawer === "TASK_LIST" ? (
            /* ================================================================= */
            /* SUB-VIEW B: DANH SÁCH NHIỆM VỤ GVBM & PHÊ DUYỆT CÔNG BỐ PHHS */
            /* ================================================================= */
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubDrawer("NONE")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại AI Advisor</span>
                  </button>
                  <h4 className="text-sm font-bold text-slate-900">
                    Theo Dõi Nhiệm Vụ GVBM & Rà Soát Tư Vấn Gửi PHHS ({gvbmTasks.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={loadGvbmTasks}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Làm mới</span>
                </button>
              </div>

              {gvbmTasks.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-1.5">
                  <p className="font-semibold text-slate-600">
                    Chưa có nhiệm vụ GVBM nào được phân công cho học sinh này.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Hãy chọn nút &ldquo;Phân công GVBM hỗ trợ&rdquo; tại mục Phân tích tiến bộ để giao nhiệm vụ.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gvbmTasks.map(task => {
                    const isResponded =
                      task.status === "GVBM_RESPONDED" ||
                      task.status === "APPROVED_FOR_PARENT" ||
                      task.status === "PARENT_ACKNOWLEDGED"
                    const isPublished =
                      task.status === "APPROVED_FOR_PARENT" ||
                      task.status === "PARENT_ACKNOWLEDGED"

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                              Môn: {task.subjectName}
                            </span>
                            <span className="font-semibold text-slate-800">
                              GVBM: {task.assignedToTeacherName || "GVBM"}
                            </span>
                            {task.dueDate && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Hạn: {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              task.status === "PARENT_ACKNOWLEDGED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : task.status === "APPROVED_FOR_PARENT"
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : task.status === "GVBM_RESPONDED"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {task.status === "PARENT_ACKNOWLEDGED"
                              ? "✓ PHHS Đã Xác Nhận & Phản Hồi"
                              : task.status === "APPROVED_FOR_PARENT"
                              ? "🟢 Đã Duyệt & Công Bố PHHS"
                              : task.status === "GVBM_RESPONDED"
                              ? "🔵 GVBM Đã Tư Vấn — Chờ CVHT Duyệt"
                              : "⏳ Đã Giao GVBM — Chờ Phản Hồi"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                            <span className="font-semibold text-slate-500 block">
                              Yêu cầu từ CVHT & Mục tiêu hỗ trợ:
                            </span>
                            <p className="font-semibold text-teal-800">🎯 {task.supportGoal}</p>
                            <p className="text-slate-700">{task.consultationPrompt}</p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                            <span className="font-semibold text-slate-500 block">
                              Nhận định chuyên môn nội bộ của GVBM (Ẩn với PHHS):
                            </span>
                            {task.gvbmProfessionalAssessment ? (
                              <p className="text-slate-800 font-medium">
                                {task.gvbmProfessionalAssessment}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">
                                GVBM chưa nhập nhận định chuyên môn.
                              </p>
                            )}
                            {task.gvbmProposedSolutions && (
                              <p className="text-teal-800 pt-1">
                                <strong>Giải pháp đề xuất:</strong> {task.gvbmProposedSolutions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Khu vực Nội dung tư vấn dành cho PHHS & Nút Phê duyệt của CVHT */}
                        {isResponded && (
                          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                                <Share2 className="w-3.5 h-3.5 text-teal-600" />
                                <span>
                                  Nội dung tư vấn dành cho PHHS (CVHT rà soát trước khi công bố):
                                </span>
                              </span>
                              {!isPublished && (
                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                  Cần CVHT phê duyệt để hiển thị cho PHHS
                                </span>
                              )}
                            </div>

                            {reviewingTaskId === task.id || !isPublished ? (
                              <div className="space-y-2">
                                <textarea
                                  rows={2}
                                  value={
                                    publishParentText[task.id] ??
                                    task.publishedParentAdvice ??
                                    task.gvbmParentAdvice ??
                                    task.gvbmProposedSolutions ??
                                    ""
                                  }
                                  onChange={e =>
                                    setPublishParentText(prev => ({
                                      ...prev,
                                      [task.id]: e.target.value
                                    }))
                                  }
                                  placeholder="Nội dung tư vấn, biện pháp và hướng dẫn phối hợp tại nhà gửi tới Phụ huynh..."
                                  className="w-full p-2.5 rounded-lg bg-white border border-teal-300 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  {reviewingTaskId === task.id && (
                                    <button
                                      type="button"
                                      onClick={() => setReviewingTaskId(null)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold cursor-pointer"
                                    >
                                      Đóng
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={publishingId === task.id}
                                    onClick={() => handleApproveAndPublishToParent(task)}
                                    className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {publishingId === task.id
                                        ? "Đang công bố..."
                                        : isPublished
                                        ? "Cập nhật nội dung công bố PHHS"
                                        : "Phê duyệt & Công bố cho PHHS"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs text-teal-950 font-medium italic">
                                  “{task.publishedParentAdvice || task.gvbmParentAdvice}”
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setReviewingTaskId(task.id)}
                                  className="px-2.5 py-1 rounded-md bg-white border border-teal-200 text-teal-700 text-[11px] font-semibold shrink-0 cursor-pointer"
                                >
                                  Chỉnh sửa
                                </button>
                              </div>
                            )}

                            {task.parentFeedback && (
                              <div className="p-2 rounded-lg bg-white border border-emerald-200 text-[11px] text-emerald-900">
                                <strong>🏡 Phản hồi từ PHHS:</strong> “{task.parentFeedback}”
                                {task.parentRequestFollowUp && (
                                  <span className="ml-2 px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold">
                                    PHHS đề nghị trao đổi thêm
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : loading ? (
            /* ================================================================= */
            /* TRẠNG THÁI ĐANG TẢI */
            /* ================================================================= */
            <div className="py-14 text-center space-y-2.5">
              <RefreshCw className="w-7 h-7 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Đang đối chiếu dữ liệu học tập, phân công giảng dạy và tổng hợp khuyến nghị...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="py-10 px-6 text-center space-y-3 bg-rose-50/60 rounded-xl border border-rose-200">
              <AlertTriangle className="w-7 h-7 text-rose-500 mx-auto" />
              <p className="text-xs font-semibold text-rose-800">{errorMessage}</p>
              <button
                type="button"
                onClick={() => fetchAiSuggestions(currentMode, true)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại ngay</span>
              </button>
            </div>
          ) : !data ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Chưa có dữ liệu phân tích từ AI Advisor.
            </div>
          ) : (
            /* ================================================================= */
            /* NỘI DUNG CHÍNH 5 BƯỚC CỦA SKY-LINE AI ADVISOR */
            /* ================================================================= */
            <div className="space-y-4 text-xs">
              {/* THÔNG BÁO DỮ LIỆU BẰNG CHỨNG */}
              {Array.isArray(data.dataEvidence) && data.dataEvidence.length > 0 && (
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-teal-950 uppercase text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Dữ liệu Căn cứ Học thuật (Data Evidence):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {data.dataEvidence.map((ev: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 bg-white rounded-lg border border-teal-100 flex flex-col justify-between"
                      >
                        <span className="text-slate-500 font-medium text-[10px]">
                          {ev.metric}:
                        </span>
                        <div className="flex items-baseline justify-between gap-1 mt-0.5">
                          <strong className="text-slate-900 font-bold">{ev.value}</strong>
                          <span className="text-[10px] text-slate-400">({ev.timepoint})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ----------------- CHẾ ĐỘ 1: PROGRESS_ANALYSIS ----------------- */}
              {currentMode === "PROGRESS_ANALYSIS" && (
                <div className="space-y-3.5">
                  {/* Điểm mạnh & Khoảng cách mục tiêu */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase block">
                        🌟 Điểm mạnh học thuật:
                      </span>
                      <ul className="space-y-1 text-slate-700 text-[11px]">
                        {data.strengths?.map((st: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 uppercase block">
                        🎯 Khoảng cách Mục tiêu (Gap):
                      </span>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {data.gapAnalysis}
                      </p>
                    </div>

                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-rose-900 uppercase block">
                        ⚠️ Khó khăn ghi nhận:
                      </span>
                      <ul className="space-y-1 text-slate-700 text-[11px]">
                        {data.difficultiesRecorded?.map((d: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* XU HƯỚNG MÔN HỌC & PHÂN CÔNG GVBM HỖ TRỢ (KHÔNG LỒNG SCROLL) */}
                  {Array.isArray(data.progressTrends) && data.progressTrends.length > 0 && (
                    <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 uppercase text-[11px]">
                            Xu hướng môn học & Phân công GVBM hỗ trợ
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (Tự động kết nối phân công giảng dạy hiện hành)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedBatchList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAssignDrawerForTrends(selectedBatchList)}
                              className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3 text-amber-300" />
                              <span>Phân công {selectedBatchList.length} GVBM đã chọn</span>
                            </button>
                          )}
                          {totalAssignedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveSubDrawer("TASK_LIST")}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem & Duyệt ({totalAssignedCount})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {data.progressTrends.map((tr: any, idx: number) => {
                          const needsSupport = tr.currentScore < 6.5 || tr.status === "Cần hỗ trợ"
                          const primaryTeacher =
                            Array.isArray(tr.assignedTeachers) && tr.assignedTeachers[0]
                              ? tr.assignedTeachers[0]
                              : null
                          const existingTask = gvbmTasks.find(
                            t =>
                              t.subjectName?.toLowerCase() === tr.subject?.toLowerCase()
                          )

                          return (
                            <div
                              key={idx}
                              className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                                needsSupport ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-slate-50/70"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedSubjectsForBatch[tr.subject])}
                                  onChange={e =>
                                    setSelectedSubjectsForBatch(prev => ({
                                      ...prev,
                                      [tr.subject]: e.target.checked
                                    }))
                                  }
                                  className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                  title="Chọn để phân công nhiều GVBM cùng lúc"
                                />
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong className="text-slate-900 font-bold text-xs">
                                      {tr.subject}
                                    </strong>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                                        tr.currentScore < 6.0
                                          ? "bg-rose-50 text-rose-700"
                                          : tr.currentScore < 6.5
                                          ? "bg-amber-50 text-amber-800"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {tr.currentScore} đ
                                    </span>
                                    {primaryTeacher && (
                                      <span className="text-[11px] text-teal-700 font-medium">
                                        • GVBM: {primaryTeacher.teacherName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {tr.recommendation}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                                {existingTask && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveSubDrawer("TASK_LIST")}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                                      existingTask.status === "APPROVED_FOR_PARENT" ||
                                      existingTask.status === "PARENT_ACKNOWLEDGED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : existingTask.status === "GVBM_RESPONDED"
                                        ? "bg-sky-50 text-sky-700 border-sky-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                    }`}
                                  >
                                    {existingTask.status === "PARENT_ACKNOWLEDGED"
                                      ? "✓ PHHS đã xem"
                                      : existingTask.status === "APPROVED_FOR_PARENT"
                                      ? "🟢 Đã gửi PHHS"
                                      : existingTask.status === "GVBM_RESPONDED"
                                      ? "🔵 GVBM đã phản hồi (Chờ duyệt)"
                                      : "⏳ Đã giao GVBM"}
                                  </button>
                                )}

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    tr.currentScore >= 8.0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : tr.currentScore >= 6.5
                                      ? "bg-sky-50 text-sky-700"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {tr.status}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => openAssignDrawerForTrends([tr])}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                    needsSupport
                                      ? "bg-teal-700 hover:bg-teal-800 text-white shadow-2xs"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Phân công GVBM hỗ trợ</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Nội dung cần xác minh thêm */}
                  {Array.isArray(data.verifiedTopicsNeeded) && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-1">
                      <span className="text-[10px] font-bold text-indigo-950 uppercase block">
                        🔍 Nội dung cần CVHT xác minh thêm cùng học sinh:
                      </span>
                      <ul className="space-y-1 text-slate-700 text-[11px]">
                        {data.verifiedTopicsNeeded.map((t: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- CHẾ ĐỘ 2: CONSULTATION_TOPICS ----------------- */}
              {currentMode === "CONSULTATION_TOPICS" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                    <span className="text-[10px] font-bold text-emerald-950 uppercase block">
                      ✨ Chuyển biến tích cực:
                    </span>
                    <p className="text-slate-800 text-[11px] mt-0.5">{data.positivePoints}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 uppercase">
                        💬 Câu hỏi gợi mở sư phạm:
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Bấm nút để áp dụng vào biên bản 1:1
                      </span>
                    </div>

                    <div className="space-y-2">
                      {data.openQuestions?.map((q: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-teal-300 transition-all flex items-center justify-between gap-3"
                        >
                          <p className="text-slate-800 text-[11px] leading-relaxed flex-1">
                            <strong className="text-teal-700 font-bold mr-1.5">#{idx + 1}</strong>
                            {q}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyText(q, idx)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Sao chép"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {onApplyQuestion && (
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyQuestion(q)
                                  setAppliedItem(`q-${idx}`)
                                  setTimeout(() => setAppliedItem(null), 1500)
                                }}
                                className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-[10px] cursor-pointer flex items-center gap-1"
                              >
                                {appliedItem === `q-${idx}` ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  "+ Áp dụng"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- CHẾ ĐỘ 3: SMART_GOALS ----------------- */}
              {currentMode === "SMART_GOALS" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase">
                      🎯 Gợi ý mục tiêu SMART (Trạng thái Đề xuất):
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                      Chờ CVHT & HS thống nhất
                    </span>
                  </div>

                  <div className="space-y-3">
                    {data.smartGoalsProposed?.map((g: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 mr-2 uppercase">
                              {g.category}
                            </span>
                            <strong className="text-xs font-bold text-slate-900">{g.title}</strong>
                          </div>
                          {onApplyGoal && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyGoal(g)
                                setAppliedItem(`goal-${idx}`)
                                setTimeout(() => setAppliedItem(null), 1500)
                              }}
                              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                            >
                              {appliedItem === `goal-${idx}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                "+ Áp dụng SMART"
                              )}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <strong className="text-slate-600 font-semibold block text-[10px] uppercase">
                              S (Cụ thể):
                            </strong>
                            <p className="text-slate-800">{g.specific}</p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <strong className="text-slate-600 font-semibold block text-[10px] uppercase">
                              M (Đo lường):
                            </strong>
                            <p className="text-slate-800">{g.measurable}</p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <strong className="text-slate-600 font-semibold block text-[10px] uppercase">
                              A & R (Khả thi & Liên quan):
                            </strong>
                            <p className="text-slate-800">{g.achievable}</p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <strong className="text-slate-600 font-semibold block text-[10px] uppercase">
                              T (Thời hạn):
                            </strong>
                            <p className="text-amber-800 font-semibold">{g.timeBound}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ----------------- CHẾ ĐỘ 4: SUPPORT_SOLUTIONS ----------------- */}
              {currentMode === "SUPPORT_SOLUTIONS" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.solutionsProposed?.map((sol: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1"
                      >
                        <strong className="text-xs font-bold text-slate-900 block">
                          {sol.solutionName}
                        </strong>
                        <p className="text-[11px] text-slate-600">
                          {sol.format} ({sol.durationWeeks} tuần)
                        </p>
                        <div className="p-1.5 bg-teal-50 rounded text-[10px] text-teal-900 font-medium mt-1">
                          Kỳ vọng: {sol.targetOutcome}
                        </div>
                      </div>
                    ))}
                  </div>

                  {data.postSupportEvaluation && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-800 uppercase block">
                        📊 Đánh giá so sánh Trước và Sau Hỗ trợ:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                          <span className="text-slate-500 block text-[10px]">Trước hỗ trợ:</span>
                          <strong className="text-slate-900">
                            {data.postSupportEvaluation.beforeResult}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                          <span className="text-slate-500 block text-[10px]">Sau hỗ trợ:</span>
                          <strong className="text-teal-800">
                            {data.postSupportEvaluation.afterResult}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200/70">
                          <span className="text-slate-500 block text-[10px]">Mức cải thiện:</span>
                          <strong className="text-emerald-700">
                            {data.postSupportEvaluation.observedImprovement}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- CHẾ ĐỘ 5: TERM_EVALUATION ----------------- */}
              {currentMode === "TERM_EVALUATION" && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase">
                      📝 Dự thảo nhận xét tiến bộ định kỳ ({data.evalTerm}):
                    </span>
                    {onApplyRubricComment && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyRubricComment(
                            data.draftRubricComment,
                            data.suggestedRubricScores
                          )
                          setAppliedItem("rubric")
                          setTimeout(() => setAppliedItem(null), 1500)
                        }}
                        className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                      >
                        {appliedItem === "rubric" ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          "+ Áp dụng nhận xét"
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-slate-800 text-[11px] leading-relaxed italic">
                    &ldquo;{data.draftRubricComment}&rdquo;
                  </div>
                </div>
              )}

              {/* FOOTER DISCLAIMER */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span className="italic">
                  {data.disclaimer ||
                    "AI Advisor chỉ gợi ý • Mọi nhiệm vụ GVBM và nội dung gửi PHHS đều do CVHT xác nhận"}
                </span>
                <span className="font-semibold text-teal-800">Sky-Line Education System</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
