"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Users,
  Calendar,
  BookOpen,
  Award,
  Layers,
  RefreshCw,
  BellRing,
  SlidersHorizontal,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Send,
  ShieldCheck,
  FileCheck2,
  History,
  Check,
  Play,
  ExternalLink
} from "lucide-react"
import type {
  NextBestAction,
  JourneyStageComputed,
  AdvisoryWorkQueueItem,
  SmartAdvisoryReminder,
  TeacherAdvisoryTab
} from "@/lib/advisory/advisory-journey-engine"

// ============================================================================
// 1. BADGE HELPERS
// ============================================================================
export function getJourneyStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Đã hoàn thành",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
    case "OVERDUE":
      return {
        label: "Quá hạn",
        cls: "bg-rose-50 text-rose-700 border-rose-200"
      }
    case "WAITING_GVBM":
      return {
        label: "Chờ GVBM",
        cls: "bg-teal-50 text-[#003B3A] border-teal-200"
      }
    case "WAITING_APPROVAL":
      return {
        label: "Chờ duyệt",
        cls: "bg-amber-50 text-amber-800 border-amber-200"
      }
    case "IN_PROGRESS":
      return {
        label: "Đang thực hiện",
        cls: "bg-teal-50 text-teal-800 border-teal-200"
      }
    default:
      return {
        label: "Chưa thực hiện",
        cls: "bg-slate-100 text-slate-600 border-slate-200"
      }
  }
}

export function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return {
        label: "Khẩn cấp",
        cls: "bg-rose-600 text-white border-rose-600"
      }
    case "HIGH":
      return {
        label: "Ưu tiên cao",
        cls: "bg-amber-500 text-white border-amber-500"
      }
    case "NORMAL":
      return {
        label: "Bình thường",
        cls: "bg-teal-600 text-white border-teal-600"
      }
    default:
      return {
        label: "Thấp / Duy trì",
        cls: "bg-slate-500 text-white border-slate-500"
      }
  }
}

// ============================================================================
// 2. PHHS-STYLE 8-STEP INTERACTIVE JOURNEY BAR + SLIM "BƯỚC TIẾP THEO" STRIP
// ============================================================================
const CANONICAL_8_STEPS: Array<{
  stepNumber: number
  shortLabel: string
  roleBadge: string
  targetTab: TeacherAdvisoryTab
  actionMode?: string
}> = [
  { stepNumber: 1, shortLabel: "1. Khởi tạo hồ sơ", roleBadge: "CỐ VẤN", targetTab: "skl_psych", actionMode: "STAGE_1" },
  { stepNumber: 2, shortLabel: "2. Tìm hiểu & SKL_PSYCH", roleBadge: "CVHT ⇄ HS", targetTab: "skl_psych", actionMode: "STAGE_2" },
  { stepNumber: 3, shortLabel: "3. Mục tiêu SMART", roleBadge: "HỌC SINH", targetTab: "tracking", actionMode: "STAGE_3" },
  { stepNumber: 4, shortLabel: "4. Kế hoạch 7 ngày", roleBadge: "HS & CVHT", targetTab: "unlocks", actionMode: "STAGE_4" },
  { stepNumber: 5, shortLabel: "5. Tư vấn 1:1 & GVBM", roleBadge: "VÒNG LẶP", targetTab: "consultations", actionMode: "STAGE_5" },
  { stepNumber: 6, shortLabel: "6. Rà soát & Điều chỉnh", roleBadge: "CVHT ⇄ PH", targetTab: "requests", actionMode: "STAGE_6" },
  { stepNumber: 7, shortLabel: "7. Đánh giá Rubric", roleBadge: "CỐ VẤN", targetTab: "rubric_eval", actionMode: "STAGE_7" },
  { stepNumber: 8, shortLabel: "8. Duyệt & Công bố", roleBadge: "3 BÊN", targetTab: "rubric_eval", actionMode: "STAGE_8" }
]

export function NextBestActionHeroCard({
  studentName,
  studentCode,
  className,
  currentStageNumber = 1,
  completedStagesCount = 0,
  loopCount = 1,
  nba,
  stages,
  activeTab,
  onContinueAction,
  onOpenAiAdvisor,
  onOpenFullJourney,
  studentOptions,
  selectedStudentId,
  onChangeStudent
}: {
  studentName: string
  studentCode?: string
  className?: string
  currentStageNumber?: number
  completedStagesCount?: number
  loopCount?: number
  nba: NextBestAction
  stages?: JourneyStageComputed[]
  activeTab?: string
  onContinueAction: (targetTab: TeacherAdvisoryTab, actionMode?: string, stepNumber?: number) => void
  onOpenAiAdvisor?: () => void
  onOpenFullJourney?: () => void
  studentOptions?: Array<{ id: string; studentName: string; studentCode?: string; priority?: string }>
  selectedStudentId?: string
  onChangeStudent?: (studentId: string) => void
}) {
  if (!nba) return null
  const priBadge = getPriorityBadge(nba.priority)
  const stBadge = getJourneyStatusBadge(nba.status)
  const progressPct = Math.round((completedStagesCount / 8) * 100)

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
      {/* Row 1: Top Header Strip (PHHS Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase tracking-wider">
            LỘ TRÌNH CỐ VẤN 8 BƯỚC
          </span>
          <span className="text-xs font-extrabold text-slate-800">
            Chu trình Cố vấn & Đồng hành Học sinh: <span className="text-teal-700">{studentName}</span>
            {studentCode ? <span className="text-slate-500 font-semibold"> ({studentCode})</span> : null}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold">
            👉 Nhấn vào từng bước để mở ngay chức năng thực hiện
          </span>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {loopCount > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
              🔄 Vòng lặp #{loopCount}
            </span>
          )}
          <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(8, progressPct))}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-700">
            {completedStagesCount}/8 mốc ({progressPct}%)
          </span>
        </div>
      </div>

      {/* Row 2: 8-Step Interactive Cards (PHHS Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {CANONICAL_8_STEPS.map(step => {
          const computedStage = stages?.find(s => s.stepNumber === step.stepNumber)
          const isCompleted = computedStage
            ? computedStage.status === "COMPLETED"
            : step.stepNumber < currentStageNumber
          const isCurrent = step.stepNumber === currentStageNumber
          const isOverdue = computedStage?.status === "OVERDUE"

          return (
            <button
              key={step.stepNumber}
              type="button"
              onClick={() =>
                onContinueAction(
                  computedStage?.targetTab || step.targetTab,
                  step.actionMode,
                  step.stepNumber
                )
              }
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                isCurrent
                  ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200/70 shadow-2xs"
                  : isOverdue
                  ? "bg-rose-50/60 border-rose-300 hover:border-rose-400"
                  : isCompleted
                  ? "bg-emerald-50/30 border-emerald-200/90 hover:border-emerald-400"
                  : "bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-teal-300"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : isCurrent
                      ? "bg-amber-500 text-white shadow-2xs"
                      : isOverdue
                      ? "bg-rose-600 text-white"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${
                    isCurrent
                      ? "bg-amber-200/80 text-amber-950"
                      : isCompleted
                      ? "bg-emerald-100/80 text-emerald-800"
                      : "bg-white text-slate-500 border border-slate-200/80"
                  }`}
                >
                  {step.roleBadge}
                </span>
              </div>

              <div>
                <div
                  className={`text-[11px] font-black leading-snug group-hover:text-teal-800 ${
                    isCurrent
                      ? "text-amber-950"
                      : isCompleted
                      ? "text-slate-800"
                      : "text-slate-600"
                  }`}
                >
                  {step.shortLabel}
                </div>
                <div
                  className={`text-[10px] font-semibold mt-0.5 truncate ${
                    isCurrent
                      ? "text-amber-700"
                      : isOverdue
                      ? "text-rose-600"
                      : isCompleted
                      ? "text-emerald-700"
                      : "text-slate-400"
                  }`}
                >
                  {isCurrent
                    ? "● Bước hiện tại"
                    : isOverdue
                    ? "⚠ Quá hạn"
                    : isCompleted
                    ? "✓ Hoàn thành"
                    : "Chờ thực hiện"}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Row 3: Slim Light-Themed "Bước Tiếp Theo (Next Best Action)" Strip */}
      <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-sky-50/70 rounded-2xl p-3.5 border border-teal-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3" />
              <span>BƯỚC TIẾP THEO</span>
            </span>

            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${priBadge.cls}`}>
              {priBadge.label}
            </span>

            <span className="text-xs font-extrabold text-teal-900">
              {nba.stageName}
            </span>

            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${stBadge.cls}`}>
              {stBadge.label}
            </span>
          </div>

          <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
            → Công việc tiếp theo: <span className="text-[#003B3A]">{nba.title}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span>
              <strong>Lý do:</strong> {nba.reason}{" "}
              <span className="text-slate-400 italic">({nba.dataSource})</span>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Phụ trách: <strong>{nba.responsibleName}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Hạn: <strong>{nba.deadlineLabel}</strong></span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onContinueAction(nba.targetTab, nba.actionMode, nba.stageNumber)}
            className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white font-black text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <span>Tiếp tục thực hiện</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>

          {onOpenFullJourney && (
            <button
              type="button"
              onClick={onOpenFullJourney}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Bảng điều phối 8 bước</span>
            </button>
          )}

          {onOpenAiAdvisor && (
            <button
              type="button"
              onClick={onOpenAiAdvisor}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-teal-50 border border-teal-200 text-[#003B3A] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#003B3A]" />
              <span>AI Advisor gợi ý</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function TeacherStudentJourneyBar({
  academicYearId,
  selectedClassId,
  selectedStudentId,
  onNavigateAction,
  onOpenAiAdvisor,
  onOpenFullJourney
}: {
  academicYearId: string
  selectedClassId: string
  selectedStudentId?: string
  onNavigateAction: (
    studentId: string,
    targetTab: TeacherAdvisoryTab,
    actionMode?: string,
    stepNumber?: number
  ) => void
  onOpenAiAdvisor?: (studentId: string) => void
  onOpenFullJourney?: () => void
}) {
  const [journey, setJourney] = useState<any | null>(null)

  useEffect(() => {
    if (!selectedClassId) return
    let cancelled = false
    const load = async () => {
      try {
        const qs = new URLSearchParams()
        qs.set("classId", selectedClassId)
        if (academicYearId) qs.set("academicYearId", academicYearId)
        if (selectedStudentId) qs.set("studentId", selectedStudentId)
        const res = await fetch(`/api/advisory/journey?${qs.toString()}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (data.selectedStudentJourney) {
          setJourney(data.selectedStudentJourney)
        } else if (Array.isArray(data.studentJourneys) && data.studentJourneys.length > 0) {
          const matched = selectedStudentId
            ? data.studentJourneys.find((j: any) => j.studentId === selectedStudentId)
            : null
          setJourney(matched || data.studentJourneys[0])
        } else {
          setJourney(null)
        }
      } catch (e) {
        console.error("TeacherStudentJourneyBar error:", e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedClassId, academicYearId, selectedStudentId])

  if (!journey || !journey.nextBestAction) return null

  return (
    <NextBestActionHeroCard
      studentName={journey.studentName}
      studentCode={journey.studentCode}
      className={journey.className}
      currentStageNumber={journey.currentStageNumber}
      completedStagesCount={journey.completedStagesCount}
      loopCount={journey.loopCount}
      nba={journey.nextBestAction}
      stages={journey.stages}
      onContinueAction={(targetTab, actionMode, stepNumber) => {
        onNavigateAction(journey.studentId, targetTab, actionMode, stepNumber)
      }}
      onOpenAiAdvisor={onOpenAiAdvisor ? () => onOpenAiAdvisor(journey.studentId) : undefined}
      onOpenFullJourney={onOpenFullJourney}
    />
  )
}

// ============================================================================
// 3. MAIN ADVISORY JOURNEY TAB COMPONENT (TEACHER & ADMIN)
// ============================================================================
interface AdvisoryJourneyTabProps {
  role: "TEACHER" | "ADMIN"
  academicYearId: string
  selectedClassId?: string
  selectedStudentId?: string
  selectedCampusId?: string
  classesList?: Array<{ id: string; className: string; grade?: string }>
  campusesList?: Array<{ id: string; campusName: string }>
  onNavigateToStudentAction?: (
    studentId: string,
    targetTab: TeacherAdvisoryTab,
    actionMode?: string
  ) => void
  onOpenAiAdvisor?: (studentId: string) => void
}

export default function AdvisoryJourneyTab({
  role,
  academicYearId,
  selectedClassId = "ALL",
  selectedStudentId = "",
  selectedCampusId = "ALL",
  classesList = [],
  campusesList = [],
  onNavigateToStudentAction,
  onOpenAiAdvisor
}: AdvisoryJourneyTabProps) {
  const [term, setTerm] = useState<"HK1" | "HK2">("HK1")
  const [classFilter, setClassFilter] = useState<string>(selectedClassId || "ALL")
  const [campusFilter, setCampusFilter] = useState<string>(selectedCampusId || "ALL")
  const [gradeFilter, setGradeFilter] = useState<string>("ALL")
  const [activeStudentId, setActiveStudentId] = useState<string>(selectedStudentId || "")
  const [workStatusFilter, setWorkStatusFilter] = useState<string>("ALL")
  const [stageFilter, setStageFilter] = useState<string>("ALL")
  const [workSearch, setWorkSearch] = useState<string>("")
  const [studentFilterInTable, setStudentFilterInTable] = useState<string>("ALL")

  const [loading, setLoading] = useState<boolean>(true)
  const [actionSaving, setActionSaving] = useState<boolean>(false)
  const [toastMsg, setToastMsg] = useState<string>("")
  const [expandedStageNum, setExpandedStageNum] = useState<number | null>(null)

  const [data, setData] = useState<any>(null)

  // Modal cấu hình Nhắc việc thông minh (Admin)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configForm, setConfigForm] = useState({
    dueSoonHours: 48,
    overdueEscalateHours: 24,
    cooldownHours: 12,
    unupdatedProgressDays: 14,
    enableInApp: true
  })

  useEffect(() => {
    if (selectedClassId && selectedClassId !== classFilter) {
      setClassFilter(selectedClassId)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedStudentId && selectedStudentId !== activeStudentId) {
      setActiveStudentId(selectedStudentId)
    }
  }, [selectedStudentId])

  const loadJourneyData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        term,
        academicYearId: academicYearId || "",
        classId: classFilter || "ALL",
        campusId: campusFilter || "ALL",
        grade: gradeFilter || "ALL",
        _t: String(Date.now())
      })
      if (activeStudentId) {
        params.set("studentId", activeStudentId)
      }

      const res = await fetch(`/api/advisory/journey?${params.toString()}`, {
        cache: "no-store"
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        if (json.reminderConfig) {
          setConfigForm(json.reminderConfig)
        }
        if (!activeStudentId && json.selectedStudentJourney?.studentId) {
          setActiveStudentId(json.selectedStudentJourney.studentId)
        }
      }
    } catch (e) {
      console.error("[AdvisoryJourneyTab] loadJourneyData error:", e)
    } finally {
      setLoading(false)
    }
  }, [term, academicYearId, classFilter, campusFilter, gradeFilter, activeStudentId])

  useEffect(() => {
    loadJourneyData()
  }, [loadJourneyData])

  const handleStageTransitionAction = async (
    action:
      | "CONFIRM_STAGE_1"
      | "CONFIRM_STAGE_2"
      | "START_NEW_FOLLOWUP_LOOP"
      | "APPROVE_RUBRIC_EVAL"
      | "PUBLISH_TERM_RESULT"
      | "PREPARE_NEXT_TERM",
    targetStudentId?: string,
    extraNote?: string
  ) => {
    const sid = targetStudentId || selectedJourney?.studentId || activeStudentId
    if (!sid) return
    try {
      setActionSaving(true)
      const res = await fetch("/api/advisory/journey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          studentId: sid,
          academicYearId,
          term,
          note: extraNote,
          loopNote: extraNote
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json.error || "Không thể thực hiện thao tác.")
        return
      }
      setToastMsg(json.message || "Đã cập nhật lộ trình cố vấn thành công!")
      setTimeout(() => setToastMsg(""), 4000)
      await loadJourneyData()
    } catch (e: any) {
      alert(e.message || "Lỗi kết nối máy chủ.")
    } finally {
      setActionSaving(false)
    }
  }

  const handleDispatchSmartReminders = async () => {
    try {
      setActionSaving(true)
      const res = await fetch("/api/advisory/journey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_REMINDERS",
          reminders: data?.smartReminders || []
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setToastMsg(json.message || "Đã đồng bộ thông báo nhắc việc thông minh!")
        setTimeout(() => setToastMsg(""), 4500)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setActionSaving(false)
    }
  }

  const handleSaveReminderConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setActionSaving(true)
      const res = await fetch("/api/advisory/journey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_REMINDER_CONFIG",
          ...configForm
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setToastMsg(json.message || "Đã lưu cấu hình nhắc việc thành công!")
        setShowConfigModal(false)
        setTimeout(() => setToastMsg(""), 4000)
        loadJourneyData()
      } else {
        alert(json.error || "Không thể lưu cấu hình")
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionSaving(false)
    }
  }

  const summary = data?.dashboardSummary || {}
  const studentJourneys: any[] = data?.studentJourneys || []
  const selectedJourney = data?.selectedStudentJourney || null
  const allWorkItems: AdvisoryWorkQueueItem[] = data?.workQueue || []
  const smartReminders: SmartAdvisoryReminder[] = data?.smartReminders || []

  // Lọc Bảng công việc GVCN (Mục 5)
  const filteredWorkQueue = useMemo(() => {
    return allWorkItems.filter(item => {
      if (studentFilterInTable !== "ALL" && item.studentId !== studentFilterInTable) {
        return false
      }
      if (workStatusFilter !== "ALL" && item.status !== workStatusFilter) {
        return false
      }
      if (stageFilter !== "ALL" && String(item.stageNumber) !== stageFilter) {
        return false
      }
      if (workSearch.trim()) {
        const q = workSearch.trim().toLowerCase()
        const match =
          item.studentName.toLowerCase().includes(q) ||
          item.studentCode.toLowerCase().includes(q) ||
          item.taskTitle.toLowerCase().includes(q) ||
          item.className.toLowerCase().includes(q) ||
          item.responsibleName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [allWorkItems, studentFilterInTable, workStatusFilter, stageFilter, workSearch])

  const executeNavigation = (
    studentId: string,
    targetTab: TeacherAdvisoryTab,
    actionMode?: string
  ) => {
    if (actionMode === "APPROVE_RUBRIC") {
      handleStageTransitionAction("APPROVE_RUBRIC_EVAL", studentId)
      return
    }
    if (actionMode === "PUBLISH_RUBRIC") {
      handleStageTransitionAction("PUBLISH_TERM_RESULT", studentId)
      return
    }
    if (actionMode === "PREPARE_NEXT_TERM") {
      handleStageTransitionAction("PREPARE_NEXT_TERM", studentId)
      return
    }
    if (onNavigateToStudentAction) {
      onNavigateToStudentAction(studentId, targetTab, actionMode)
    } else {
      window.location.href = `/teacher/co-van-hoc-tap?classId=${classFilter !== "ALL" ? classFilter : ""}&studentId=${studentId}&tab=${targetTab}`
    }
  }

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2 shadow-2xs">
        <RefreshCw className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs font-bold text-slate-600">
          Đang tổng hợp Lộ trình Cố vấn 8 Giai đoạn & Next Best Action Engine...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. FILTER & CONTROL TOOLBAR (LỚP • HỌC KỲ • KHỐI • CƠ SỞ) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Lộ Trình Cố Vấn 8 Giai Đoạn:</span>
          </span>

          {/* Term Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
            {(["HK1", "HK2"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTerm(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  term === t
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "HK1" ? "Học kỳ 1" : "Học kỳ 2"}
              </button>
            ))}
          </div>

          {/* Campus filter for Admin */}
          {role === "ADMIN" && campusesList.length > 0 && (
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Tất cả Cơ sở</option>
              {campusesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          )}

          {/* Class filter */}
          {classesList.length > 0 && (
            <select
              value={classFilter}
              onChange={e => {
                setClassFilter(e.target.value)
                setActiveStudentId("")
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Tất cả Lớp phụ trách ({classesList.length})</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>
                  Lớp {c.className}
                </option>
              ))}
            </select>
          )}

          {/* Student Selector */}
          {studentJourneys.length > 0 && (
            <select
              value={activeStudentId}
              onChange={e => setActiveStudentId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50/60 text-xs font-bold text-[#003B3A]"
            >
              {studentJourneys.map(s => (
                <option key={s.studentId} value={s.studentId}>
                  HS: {s.studentName} ({s.className}) — Bước {s.currentStageNumber}/8
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDispatchSmartReminders}
            disabled={actionSaving}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Gửi nhắc việc thông minh vào hộp thư thông báo (có lọc chống trùng lặp)"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            <span>Đồng bộ nhắc việc ({smartReminders.length})</span>
          </button>

          {role === "ADMIN" && (
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Cấu hình nhắc việc</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadJourneyData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. DASHBOARD THEO LỚP VÀ CƠ SỞ (MỤC 8: 6 CHỈ SỐ + PHễu 8 GIAI ĐOẠN) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">
            1. Tổng HS theo dõi
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {summary.totalStudents || 0} <span className="text-xs font-semibold text-slate-500">HS</span>
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
            Học kỳ: {term}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">
            2. HS cần tư vấn 1:1
          </span>
          <div className="text-xl font-black text-amber-600 mt-1">
            {summary.needConsultationCount || 0}{" "}
            <span className="text-xs font-semibold text-slate-500">HS</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Chưa gặp hoặc mức Đỏ/Vàng
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">
            3. Đến hạn & Quá hạn
          </span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {(summary.overdueCount || 0) + (summary.dueSoonCount || 0)}{" "}
            <span className="text-xs font-semibold text-rose-500">
              ({summary.overdueCount || 0} quá hạn)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.dueSoonCount || 0} việc sắp đến hạn
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-[#003B3A] block">
            4. Yêu cầu GVBM xử lý
          </span>
          <div className="text-xl font-black text-[#003B3A] mt-1">
            {summary.gvbmPendingCount || 0}{" "}
            <span className="text-xs font-semibold text-slate-500">nhiệm vụ</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Đang phối hợp GV bộ môn
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-teal-700 block">
            5. Hoàn thiện kế hoạch
          </span>
          <div className="text-xl font-black text-teal-700 mt-1">
            {summary.planCompletionRate || 0}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.planCompletionCount || 0}/{summary.totalStudents || 0} HS đủ SMART & HĐ
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
            6. Hoàn thành Đánh giá kỳ
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {summary.termEvalCompletionRate || 0}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.termEvalCompletionCount || 0}/{summary.totalStudents || 0} HS xong Rubric
          </span>
        </div>
      </div>

      {/* 8-Stage Distribution Funnel Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Phân bổ Học sinh theo 8 Giai đoạn Cố vấn Học tập (Bấm vào giai đoạn để lọc bảng công việc):</span>
          </span>
          {stageFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setStageFilter("ALL")}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              Bỏ lọc giai đoạn (Xem tất cả 8 bước)
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(summary.stageDistribution || []).map((st: any) => {
            const isSelected = stageFilter === String(st.stepNumber)
            return (
              <button
                key={st.stepNumber}
                type="button"
                onClick={() =>
                  setStageFilter(isSelected ? "ALL" : String(st.stepNumber))
                }
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                    : "bg-slate-50/70 hover:bg-teal-50/50 text-slate-800 border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected ? "bg-amber-400 text-slate-950" : "bg-teal-100 text-teal-900"
                    }`}
                  >
                    B{st.stepNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      isSelected ? "text-teal-200" : "text-slate-500"
                    }`}
                  >
                    Đạt {st.percent}%
                  </span>
                </div>
                <div className="text-[11px] font-bold leading-snug mt-1.5 line-clamp-2">
                  {st.shortName}
                </div>
                <div
                  className={`text-[10px] font-semibold mt-1 ${
                    isSelected ? "text-amber-300" : "text-teal-700"
                  }`}
                >
                  Đang ở bước này: <strong>{st.count} HS</strong>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. CARD "BƯỚC TIẾP THEO" & CHI TIẾT 8 GIAI ĐOẠN CỦA HỌC SINH ĐANG CHỌN */}
      {/* ===================================================================== */}
      {selectedJourney && (
        <div className="space-y-4">
          <NextBestActionHeroCard
            studentName={selectedJourney.studentName}
            studentCode={selectedJourney.studentCode}
            className={selectedJourney.className}
            currentStageNumber={selectedJourney.currentStageNumber}
            completedStagesCount={selectedJourney.completedStagesCount}
            loopCount={selectedJourney.loopCount}
            nba={selectedJourney.nextBestAction}
            stages={selectedJourney.stages}
            onContinueAction={(targetTab, actionMode) =>
              executeNavigation(selectedJourney.studentId, targetTab, actionMode)
            }
            onOpenAiAdvisor={
              onOpenAiAdvisor
                ? () => onOpenAiAdvisor(selectedJourney.studentId)
                : undefined
            }
            studentOptions={studentJourneys.map(s => ({
              id: s.studentId,
              studentName: s.studentName,
              studentCode: s.studentCode
            }))}
            selectedStudentId={selectedJourney.studentId}
            onChangeStudent={sid => setActiveStudentId(sid)}
          />

          {/* 8 STAGES INTERACTIVE TIMELINE & DYNAMIC LOOP PANEL */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Lộ Trình 8 Giai Đoạn Chi Tiết — Học sinh: {selectedJourney.studentName}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    Hoàn thành {selectedJourney.completedStagesCount}/8 bước ({selectedJourney.overallProgressPercent}%)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhấn vào từng bước để xem Mục tiêu nghiệp vụ, Công việc bắt buộc, Dữ liệu đầu vào, Điều kiện hoàn thành và Lịch sử thao tác.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleStageTransitionAction(
                      "START_NEW_FOLLOWUP_LOOP",
                      selectedJourney.studentId,
                      `Vòng lặp theo dõi & hỗ trợ #${(selectedJourney.loopCount || 1) + 1}`
                    )
                  }
                  disabled={actionSaving}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                  <span>+ Mở vòng lặp Theo dõi – Tư vấn mới (#{(selectedJourney.loopCount || 1) + 1})</span>
                </button>
              </div>
            </div>

            {/* 8 Stages Grid / Accordion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(selectedJourney.stages || []).map((st: JourneyStageComputed) => {
                const badge = getJourneyStatusBadge(st.status)
                const isExpanded = expandedStageNum === st.stepNumber
                const isCurrent = selectedJourney.currentStageNumber === st.stepNumber

                return (
                  <div
                    key={st.code}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? "bg-teal-50/30 border-teal-400 ring-1 ring-teal-400/30 shadow-xs"
                        : st.status === "COMPLETED"
                        ? "bg-emerald-50/20 border-emerald-200/80"
                        : st.status === "OVERDUE"
                        ? "bg-rose-50/30 border-rose-200"
                        : "bg-white border-slate-200/80"
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                              st.status === "COMPLETED"
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-[#003B3A] text-amber-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st.status === "COMPLETED" ? <Check className="w-4 h-4" /> : st.stepNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {st.code}
                              </span>
                              {st.supportsDynamicLoop && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/70">
                                  🔄 Vòng lặp động
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                              {st.name}
                            </h4>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Progress Summary & Metadata */}
                      <p className="text-xs font-semibold text-teal-800 bg-teal-50/60 px-3 py-1.5 rounded-lg border border-teal-100">
                        {st.progressText}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          Phụ trách: <strong className="text-slate-700">{st.responsiblePerson}</strong>
                        </span>
                        <span>
                          Hạn: <strong className="text-slate-700">{st.deadline}</strong>
                        </span>
                        {st.completedAt && (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Hoàn thành: {new Date(st.completedAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>

                      {/* Blockers if any */}
                      {st.blockers && st.blockers.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                          {st.blockers.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Expandable Details: Mục tiêu nghiệp vụ, Công việc bắt buộc, Đầu vào, Điều kiện hoàn thành, Lịch sử */}
                      {isExpanded && (
                        <div className="pt-2 mt-2 border-t border-slate-200/70 space-y-2.5 text-xs text-slate-600">
                          <div>
                            <strong className="text-slate-800 block">🎯 Mục tiêu nghiệp vụ:</strong>
                            <p className="mt-0.5">{st.businessObjective}</p>
                          </div>

                          <div>
                            <strong className="text-slate-800 block">📋 Công việc bắt buộc:</strong>
                            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                              {st.mandatoryTasks.map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <strong className="text-slate-800 block">📥 Dữ liệu đầu vào:</strong>
                            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                              {st.inputDataDesc.map((inp, idx) => (
                                <li key={idx}>{inp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                            <strong className="text-slate-800 block">✓ Điều kiện hoàn thành:</strong>
                            <p className="mt-0.5 text-slate-700">{st.completionConditionDesc}</p>
                          </div>

                          {st.historyItems && st.historyItems.length > 0 && (
                            <div>
                              <strong className="text-slate-800 flex items-center gap-1">
                                <History className="w-3.5 h-3.5 text-teal-600" />
                                <span>Lịch sử thao tác ghi nhận:</span>
                              </strong>
                              <div className="mt-1 space-y-1">
                                {st.historyItems.map((h, hIdx) => (
                                  <div
                                    key={hIdx}
                                    className="text-[11px] bg-slate-50 px-2.5 py-1 rounded border border-slate-100"
                                  >
                                    <strong>{h.date}</strong> ({h.actor}): {h.summary}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stage Action Footer */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStageNum(isExpanded ? null : st.stepNumber)
                        }
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Thu gọn quy định bước</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Chi tiết điều kiện & lịch sử</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {st.stepNumber === 1 && st.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStageTransitionAction(
                                "CONFIRM_STAGE_1",
                                selectedJourney.studentId
                              )
                            }
                            disabled={actionSaving}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            ✓ Xác nhận đã rà soát
                          </button>
                        )}

                        {st.stepNumber === 8 &&
                          selectedJourney.stages?.[6]?.status === "COMPLETED" && (
                            <>
                              {selectedJourney.journeyState?.rubricApprovalStatus !==
                                "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStageTransitionAction(
                                      "APPROVE_RUBRIC_EVAL",
                                      selectedJourney.studentId
                                    )
                                  }
                                  disabled={actionSaving}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  ✓ Duyệt kết quả kỳ
                                </button>
                              )}

                              {!selectedJourney.journeyState?.isPublishedToParent && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStageTransitionAction(
                                      "PUBLISH_TERM_RESULT",
                                      selectedJourney.studentId
                                    )
                                  }
                                  disabled={actionSaving}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  📢 Công bố PHHS
                                </button>
                              )}

                              {selectedJourney.journeyState?.isPublishedToParent &&
                                !selectedJourney.journeyState?.nextTermPrepared && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStageTransitionAction(
                                        "PREPARE_NEXT_TERM",
                                        selectedJourney.studentId
                                      )
                                    }
                                    disabled={actionSaving}
                                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Chuyển kỳ tiếp theo →
                                  </button>
                                )}
                            </>
                          )}

                        <button
                          type="button"
                          onClick={() =>
                            executeNavigation(
                              selectedJourney.studentId,
                              st.targetTab,
                              "OPEN_TAB"
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Mở chức năng</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DYNAMIC LOOP CYCLES (MỤC 3: THEO DÕI → TƯ VẤN → HỖ TRỢ → RÀ SOÁT → ĐIỀU CHỈNH) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black uppercase">
                    CHU TRÌNH VÒNG LẶP ĐỘNG (GIAI ĐOẠN 5 & 6)
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Theo dõi → Tư vấn 1:1 → Hỗ trợ GVBM → Rà soát → Điều chỉnh → Tiếp tục theo dõi ({selectedJourney.dynamicLoops?.length || 0} hoạt động trong kỳ)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeNavigation(
                        selectedJourney.studentId,
                        "consultations",
                        "OPEN_CONSULTATION_MODAL"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                  >
                    + Thêm phiên tư vấn 1:1
                  </button>

                  {onOpenAiAdvisor && (
                    <button
                      type="button"
                      onClick={() => onOpenAiAdvisor(selectedJourney.studentId)}
                      className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#4A2273] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Phân công GVBM hỗ trợ</span>
                    </button>
                  )}
                </div>
              </div>

              {(!selectedJourney.dynamicLoops || selectedJourney.dynamicLoops.length === 0) ? (
                <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Chưa có vòng lặp phiên tư vấn 1:1 hoặc nhiệm vụ hỗ trợ GVBM nào được ghi nhận cho học sinh này.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {selectedJourney.dynamicLoops.map((lp: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-teal-700 uppercase">
                            Hoạt động #{lp.loopNumber} • {lp.actor}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              lp.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-700"
                                : lp.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {lp.badgeText}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                          {lp.title}
                        </h5>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {lp.subtitle}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {lp.date ? new Date(lp.date).toLocaleDateString("vi-VN") : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            executeNavigation(selectedJourney.studentId, lp.targetTab, "OPEN_TAB")
                          }
                          className="font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          Mở chi tiết →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. BẢNG "VIỆC CẦN LÀM TRONG CỐ VẤN HỌC TẬP" (MỤC 5) */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-600" />
                <span>Bảng Việc Cần Làm Trong Cố Vấn Học Tập ({filteredWorkQueue.length} công việc)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động tổng hợp từ Next Best Action Engine và đồng bộ trực tiếp với Sổ Giáo viên.
              </p>
            </div>

            {/* Search & Student Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={studentFilterInTable}
                onChange={e => setStudentFilterInTable(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả học sinh ({studentJourneys.length})</option>
                {studentJourneys.map(s => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentName} ({s.className})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={workSearch}
                  onChange={e => setWorkSearch(e.target.value)}
                  placeholder="Tìm học sinh, công việc..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-500 w-52"
                />
              </div>
            </div>
          </div>

          {/* Status Filter Pills (Mục 5) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "NOT_STARTED", label: "Chưa thực hiện" },
              { id: "IN_PROGRESS", label: "Đang thực hiện" },
              { id: "OVERDUE", label: "Quá hạn" },
              { id: "WAITING_GVBM", label: "Chờ GVBM" },
              { id: "WAITING_APPROVAL", label: "Chờ duyệt" },
              { id: "COMPLETED", label: "Đã hoàn thành" }
            ].map(tab => {
              const active = workStatusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Work Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">1. Học sinh</th>
                <th className="py-3 px-3">2. Bước lộ trình</th>
                <th className="py-3 px-4">3. Công việc & Nguồn dữ liệu</th>
                <th className="py-3 px-3">4. Mức ưu tiên</th>
                <th className="py-3 px-3">5. Người thực hiện</th>
                <th className="py-3 px-3">6. Hạn hoàn thành</th>
                <th className="py-3 px-3">7. Trạng thái</th>
                <th className="py-3 px-4 text-right">8. Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                    Không có công việc nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredWorkQueue.slice(0, 60).map(item => {
                  const pri = getPriorityBadge(item.priority)
                  const st = getJourneyStatusBadge(item.status)
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-teal-50/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setActiveStudentId(item.studentId)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-bold text-slate-900 group-hover:text-teal-700">
                            {item.studentName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Lớp {item.className} • {item.studentCode}
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70 font-bold text-[11px]">
                          Bước {item.stageNumber}: {item.stageShortName}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-slate-900">{item.taskTitle}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.reason}
                        </div>
                        <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                          Nguồn: {item.dataSource}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pri.cls}`}>
                          {pri.label}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.responsibleName}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{item.responsibleRole}</div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {item.deadlineLabel}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            executeNavigation(
                              item.studentId,
                              item.targetTab,
                              item.actionMode
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <span>Mở thực hiện</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. TRUNG TÂM NHẮC VIỆC THÔNG MINH & BẢNG LỚP (MỤC 7 & MỤC 8) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Smart Reminders Panel */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-500" />
                <span>Nhắc Việc Thông Minh ({smartReminders.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Tự động phát hiện hạn sắp tới, quá hạn, phản hồi GVBM/HS và phiếu chờ duyệt (chống lặp {configForm.cooldownHours}h).
              </p>
            </div>
          </div>

          {smartReminders.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Không có cảnh báo hoặc nhắc việc tồn đọng.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {smartReminders.slice(0, 15).map(rem => (
                <div
                  key={rem.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    rem.severity === "URGENT"
                      ? "bg-rose-50/50 border-rose-200"
                      : rem.severity === "HIGH"
                      ? "bg-amber-50/50 border-amber-200"
                      : "bg-slate-50 border-slate-200/80"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {rem.categoryLabel}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        Lớp {rem.className}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{rem.title}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{rem.message}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      executeNavigation(rem.studentId, rem.targetTab, "OPEN_TAB")
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Xử lý →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Class Breakdown Table (Mục 8) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Tiến Độ Lộ Trình Theo Lớp & Cơ Sở ({summary.classBreakdown?.length || 0} lớp)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Tổng hợp tỷ lệ hoàn thiện kế hoạch, đánh giá Rubric và công việc quá hạn theo từng lớp.
            </p>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-2 px-2.5">Lớp / GVCN</th>
                  <th className="py-2 px-2 text-center">Sĩ số</th>
                  <th className="py-2 px-2 text-center">Kế hoạch</th>
                  <th className="py-2 px-2 text-center">Đánh giá kỳ</th>
                  <th className="py-2 px-2 text-center">Quá hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(summary.classBreakdown || []).map((cls: any) => (
                  <tr key={cls.classId} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-slate-800">
                        Lớp {cls.className} ({cls.campusName})
                      </div>
                      <div className="text-[10px] text-slate-500">{cls.homeroomTeacherName}</div>
                    </td>
                    <td className="py-2 px-2 text-center font-bold">{cls.totalStudents}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="font-bold text-teal-700">{cls.planCompletionRate}%</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="font-bold text-emerald-700">
                        {cls.termEvalCompletionRate}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cls.overdueCount > 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cls.overdueCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. MODAL CẤU HÌNH CHU KỲ NHẮC & NGƯỠNG CẢNH BÁO (ADMIN - MỤC 7) */}
      {/* ===================================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Cấu Hình Nhắc Việc Thông Minh (CVHT)
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReminderConfig} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Ngưỡng cảnh báo "Sắp đến hạn" (Số giờ trước hạn):
                </label>
                <input
                  type="number"
                  min={6}
                  max={168}
                  value={configForm.dueSoonHours}
                  onChange={e =>
                    setConfigForm(p => ({ ...p, dueSoonHours: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  2. Chu kỳ chống gửi nhắc lặp lại (Cooldown giờ):
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={configForm.cooldownHours}
                  onChange={e =>
                    setConfigForm(p => ({ ...p, cooldownHours: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  3. Ngưỡng nhắc "Chưa cập nhật tiến độ" (Số ngày):
                </label>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={configForm.unupdatedProgressDays}
                  onChange={e =>
                    setConfigForm(p => ({
                      ...p,
                      unupdatedProgressDays: Number(e.target.value)
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="px-5 py-2 rounded-xl bg-[#003B3A] text-white font-bold cursor-pointer"
                >
                  {actionSaving ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
