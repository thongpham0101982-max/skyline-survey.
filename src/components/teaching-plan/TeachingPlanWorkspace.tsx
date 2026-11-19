"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Paperclip,
  Layers,
} from "lucide-react"
import type {
  TeachingPlanLessonRecord,
  TeachingPlanPeriodRecord,
  TeachingPlanRecord,
  TeachingPlanVersionRecord,
} from "@/lib/teaching-plan/types"
import { TeachingPlanExcelImportModal } from "./TeachingPlanExcelImportModal"
import { TeachingPlanPublishModal } from "./TeachingPlanPublishModal"

interface CatalogState {
  academicYears: Array<{ id: string; name: string; status: string }>
  levels: string[]
  grades: string[]
  subjects: Array<{ id: string; subjectCode: string; subjectName: string }>
  programs: Array<{ code: string; name: string }>
  campuses: Array<{ id: string; campusCode: string; campusName: string }>
  permissions: {
    canManage: boolean
    canApprove: boolean
    isFullAccess: boolean
    allowedCampusIds: string[]
  }
}

interface PlanListItem extends TeachingPlanRecord {
  versions: TeachingPlanVersionRecord[]
  activeDraft: TeachingPlanVersionRecord | null
  activePublished: TeachingPlanVersionRecord | null
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Nháp", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  PENDING_APPROVAL: { label: "Chờ duyệt", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  PUBLISHED: { label: "Đã công bố", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  ARCHIVED: { label: "Lưu trữ", cls: "bg-slate-100 text-slate-600 border-slate-200" },
}

export function TeachingPlanWorkspace() {
  const [catalog, setCatalog] = useState<CatalogState>({
    academicYears: [],
    levels: [],
    grades: [],
    subjects: [],
    programs: [],
    campuses: [],
    permissions: { canManage: false, canApprove: false, isFullAccess: false, allowedCampusIds: [] },
  })

  // Cascading filters
  const [academicYearId, setAcademicYearId] = useState("")
  const [level, setLevel] = useState("")
  const [grade, setGrade] = useState("")
  const [subjectId, setSubjectId] = useState("")

  // Conditional disambiguation filters
  const [programFilter, setProgramFilter] = useState("ALL")
  const [scopeFilter, setScopeFilter] = useState("ALL")
  const [needsProgramFilter, setNeedsProgramFilter] = useState(false)
  const [needsScopeFilter, setNeedsScopeFilter] = useState(false)

  // Loaded plans & active version
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [savedDirectory, setSavedDirectory] = useState<any[]>([])
  const [loadingDirectory, setLoadingDirectory] = useState(false)
  const [directorySubjectFilter, setDirectorySubjectFilter] = useState("ALL")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [activeVersion, setActiveVersion] = useState<TeachingPlanVersionRecord | null>(null)
  const [activePlan, setActivePlan] = useState<TeachingPlanRecord | null>(null)
  const [lessons, setLessons] = useState<TeachingPlanLessonRecord[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingVersion, setLoadingVersion] = useState(false)
  const [bannerMsg, setBannerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Table view filters
  const [semesterTab, setSemesterTab] = useState<1 | 2>(1)
  const [weekFilter, setWeekFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedLessonIds, setExpandedLessonIds] = useState<Record<string, boolean>>({})

  // Menus & Modals
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [historyData, setHistoryData] = useState<{ versions: any[]; logs: any[] }>({
    versions: [],
    logs: [],
  })

  // Create plan form state
  const [createForm, setCreateForm] = useState({
    programCode: "",
    scopeType: "SYSTEM" as "SYSTEM" | "CAMPUS",
    campusId: "",
    title: "",
    mode: "DIRECT" as "DIRECT" | "EXCEL",
  })

  // Lesson & Period drawers
  const [editingLesson, setEditingLesson] = useState<Partial<TeachingPlanLessonRecord> | null>(null)
  const [selectedPeriodCtx, setSelectedPeriodCtx] = useState<{
    lesson: TeachingPlanLessonRecord
    period: TeachingPlanPeriodRecord
  } | null>(null)
  const [periodForm, setPeriodForm] = useState({
    plannedWeek: 1,
    focus: "",
    objectives: "",
    expectedEvidence: "",
    adjustments: "",
    attachmentName: "",
    attachmentUrl: "",
  })
  const [savingMutation, setSavingMutation] = useState(false)
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null)

  const handleToggleSyncObservation = async (planId: string, nextEnabled: boolean) => {
    setSyncingPlanId(planId)
    setBannerMsg(null)
    try {
      const res = await fetch(`/api/teaching-plans/${planId}/sync-observation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({
          type: "error",
          text: json.error || "Không thể cập nhật trạng thái đồng bộ Dự giờ.",
        })
        return
      }
      setSavedDirectory((prev) =>
        prev.map((item) =>
          item.id === planId ? { ...item, syncToObservation: nextEnabled } : item
        )
      )
      setActivePlan((prev) =>
        prev && prev.id === planId ? { ...prev, syncToObservation: nextEnabled } : prev
      )
      setBannerMsg({
        type: "success",
        text: nextEnabled
          ? "Đã đồng bộ Kế hoạch dạy học qua Chủ đề Dự giờ theo khối."
          : "Đã tắt đồng bộ Kế hoạch dạy học với Dự giờ.",
      })
    } finally {
      setSyncingPlanId(null)
    }
  }

  // Close actions menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load catalogs whenever upstream selectors change
  const fetchCatalogs = useCallback(
    async (yId?: string, lvl?: string, grd?: string) => {
      const qs = new URLSearchParams()
      if (yId) qs.set("academicYearId", yId)
      if (lvl) qs.set("level", lvl)
      if (grd) qs.set("grade", grd)
      const res = await fetch(`/api/teaching-plans/catalogs?${qs.toString()}`)
      const json = await res.json()
      if (json.success) {
        setCatalog({
          academicYears: json.academicYears || [],
          levels: json.levels || [],
          grades: json.grades || [],
          subjects: json.subjects || [],
          programs: json.programs || [],
          campuses: json.campuses || [],
          permissions: json.permissions || {
            canManage: false,
            canApprove: false,
            isFullAccess: false,
            allowedCampusIds: [],
          },
        })
        if (!yId && json.defaultAcademicYearId) {
          setAcademicYearId(json.defaultAcademicYearId)
        }
      }
    },
    []
  )

  useEffect(() => {
    fetchCatalogs()
  }, [fetchCatalogs])

  // Load saved teaching plans directory grouped by subject
  const fetchSavedDirectory = useCallback(
    async (yId: string, lvl?: string, grd?: string) => {
      if (!yId) return
      setLoadingDirectory(true)
      try {
        const qs = new URLSearchParams({ listAll: "1", academicYearId: yId })
        if (lvl) qs.set("level", lvl)
        if (grd) qs.set("grade", grd)
        const res = await fetch(`/api/teaching-plans?${qs.toString()}`)
        const json = await res.json()
        if (json.success) {
          setSavedDirectory(json.items || [])
        }
      } finally {
        setLoadingDirectory(false)
      }
    },
    []
  )

  useEffect(() => {
    if (academicYearId) {
      fetchSavedDirectory(academicYearId, level, grade)
    }
  }, [academicYearId, level, grade, fetchSavedDirectory])

  // Cascading change handlers: clear downstream & reload
  const handleYearChange = (nextYearId: string) => {
    setAcademicYearId(nextYearId)
    setLevel("")
    setGrade("")
    setSubjectId("")
    setPlans([])
    setSelectedPlanId("")
    setActivePlan(null)
    setActiveVersion(null)
    setLessons([])
    fetchCatalogs(nextYearId, "", "")
  }

  const handleLevelChange = (nextLevel: string) => {
    setLevel(nextLevel)
    setGrade("")
    setSubjectId("")
    setPlans([])
    setSelectedPlanId("")
    setActivePlan(null)
    setActiveVersion(null)
    setLessons([])
    fetchCatalogs(academicYearId, nextLevel, "")
  }

  const handleGradeChange = (nextGrade: string) => {
    setGrade(nextGrade)
    setSubjectId("")
    setPlans([])
    setSelectedPlanId("")
    setActivePlan(null)
    setActiveVersion(null)
    setLessons([])
    fetchCatalogs(academicYearId, level, nextGrade)
  }

  const loadVersionDetail = useCallback(async (versionId: string) => {
    setLoadingVersion(true)
    try {
      const res = await fetch(`/api/teaching-plans/versions/${versionId}`)
      const json = await res.json()
      if (json.success) {
        setActivePlan(json.plan)
        setActiveVersion(json.version)
        setLessons(json.lessons || [])
      }
    } finally {
      setLoadingVersion(false)
    }
  }, [])

  const loadPlansForSelection = useCallback(
    async (yId: string, lvl: string, grd: string, subId: string, prog?: string, scope?: string) => {
      if (!yId || !lvl || !grd || !subId) return
      setLoadingPlans(true)
      setBannerMsg(null)
      try {
        const qs = new URLSearchParams({
          academicYearId: yId,
          level: lvl,
          grade: grd,
          subjectId: subId,
        })
        if (prog && prog !== "ALL") qs.set("programCode", prog)
        if (scope && scope !== "ALL") {
          if (scope === "SYSTEM") qs.set("scopeType", "SYSTEM")
          else if (scope.startsWith("CAMPUS:")) {
            qs.set("scopeType", "CAMPUS")
            qs.set("campusId", scope.replace("CAMPUS:", ""))
          }
        }
        const res = await fetch(`/api/teaching-plans?${qs.toString()}`)
        const json = await res.json()
        if (json.success) {
          const list: PlanListItem[] = json.plans || []
          setPlans(list)
          setNeedsProgramFilter(Boolean(json.needsProgramFilter))
          setNeedsScopeFilter(Boolean(json.needsScopeFilter))
          if (list.length > 0) {
            const target = list.find((p) => p.id === selectedPlanId) || list[0]
            setSelectedPlanId(target.id)
            const targetVer = target.activeDraft || target.activePublished || target.versions[0]
            if (targetVer) {
              await loadVersionDetail(targetVer.id)
            } else {
              setActivePlan(target)
              setActiveVersion(null)
              setLessons([])
            }
          } else {
            setSelectedPlanId("")
            setActivePlan(null)
            setActiveVersion(null)
            setLessons([])
          }
        }
      } finally {
        setLoadingPlans(false)
      }
    },
    [loadVersionDetail, selectedPlanId]
  )

  const handleSubjectChange = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId)
    setProgramFilter("ALL")
    setScopeFilter("ALL")
    if (nextSubjectId) {
      loadPlansForSelection(academicYearId, level, grade, nextSubjectId)
    } else {
      setPlans([])
      setActivePlan(null)
      setActiveVersion(null)
      setLessons([])
    }
  }

  // Re-load when conditional program/scope filter changes
  useEffect(() => {
    if (academicYearId && level && grade && subjectId) {
      loadPlansForSelection(academicYearId, level, grade, subjectId, programFilter, scopeFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programFilter, scopeFilter])

  const selectedYearObj = catalog.academicYears.find((y) => y.id === academicYearId)
  const selectedSubjectObj = catalog.subjects.find((s) => s.id === subjectId)
  const isSelectionComplete = Boolean(academicYearId && level && grade && subjectId)
  const isDraftEditable =
    Boolean(activeVersion && activeVersion.status === "DRAFT") && catalog.permissions.canManage

  const directorySubjects = useMemo(() => {
    const map = new Map<string, { subjectId: string; subjectName: string; subjectCode: string | null; count: number }>()
    for (const item of savedDirectory) {
      const prev = map.get(item.subjectId)
      if (prev) prev.count++
      else
        map.set(item.subjectId, {
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          subjectCode: item.subjectCode,
          count: 1,
        })
    }
    return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "vi"))
  }, [savedDirectory])

  const filteredDirectory = useMemo(() => {
    if (directorySubjectFilter === "ALL") return savedDirectory
    return savedDirectory.filter((item) => item.subjectId === directorySubjectFilter)
  }, [savedDirectory, directorySubjectFilter])

  const openSavedPlanFromDirectory = async (item: any) => {
    setLevel(item.level)
    setGrade(item.grade)
    setSubjectId(item.subjectId)
    setSelectedPlanId(item.id)
    setProgramFilter("ALL")
    setScopeFilter("ALL")
    await fetchCatalogs(item.academicYearId, item.level, item.grade)
    await loadPlansForSelection(item.academicYearId, item.level, item.grade, item.subjectId)
  }

  // Filtered lessons by semester tab, week, and search query
  const semesterLessons = useMemo(
    () => lessons.filter((l) => l.semester === semesterTab),
    [lessons, semesterTab]
  )

  const availableWeeks = useMemo(() => {
    const s = new Set<number>()
    for (const l of semesterLessons) {
      for (let w = l.weekFrom; w <= l.weekTo; w++) s.add(w)
    }
    return Array.from(s).sort((a, b) => a - b)
  }, [semesterLessons])

  const filteredLessons = useMemo(() => {
    return semesterLessons.filter((l) => {
      if (weekFilter !== "ALL") {
        const wf = Number(weekFilter)
        if (wf < l.weekFrom || wf > l.weekTo) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const hay = `${l.lessonCode} ${l.topicName} ${l.lessonName} ${l.objectives}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [semesterLessons, weekFilter, searchQuery])

  // Open Period Drawer
  const openPeriodDrawer = (lesson: TeachingPlanLessonRecord, period: TeachingPlanPeriodRecord) => {
    setSelectedPeriodCtx({ lesson, period })
    setPeriodForm({
      plannedWeek: period.plannedWeek,
      focus: period.focus,
      objectives: period.objectives,
      expectedEvidence: period.expectedEvidence,
      adjustments: period.adjustments,
      attachmentName: period.attachments[0]?.name || "",
      attachmentUrl: period.attachments[0]?.url || "",
    })
  }

  const handleSavePeriod = async () => {
    if (!activeVersion || !selectedPeriodCtx) return
    setSavingMutation(true)
    setBannerMsg(null)
    try {
      const attachments =
        periodForm.attachmentName.trim() && periodForm.attachmentUrl.trim()
          ? [{ name: periodForm.attachmentName.trim(), url: periodForm.attachmentUrl.trim() }]
          : []
      const res = await fetch(`/api/teaching-plans/versions/${activeVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: activeVersion.revision,
          operation: {
            type: "UPDATE_PERIOD",
            periodId: selectedPeriodCtx.period.id,
            plannedWeek: Number(periodForm.plannedWeek),
            focus: periodForm.focus,
            objectives: periodForm.objectives,
            expectedEvidence: periodForm.expectedEvidence,
            adjustments: periodForm.adjustments,
            attachments,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể lưu thay đổi tiết dạy." })
        return
      }
      setActiveVersion(json.version)
      setLessons(json.lessons || [])
      setSelectedPeriodCtx(null)
      setBannerMsg({ type: "success", text: "Đã cập nhật chi tiết tiết dạy vào bản nháp." })
    } finally {
      setSavingMutation(false)
    }
  }

  const handleSaveLesson = async () => {
    if (!activeVersion || !editingLesson) return
    setSavingMutation(true)
    setBannerMsg(null)
    try {
      const res = await fetch(`/api/teaching-plans/versions/${activeVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: activeVersion.revision,
          operation: {
            type: "UPSERT_LESSON",
            lessonId: editingLesson.id,
            lessonCode: editingLesson.lessonCode || "",
            semester: Number(editingLesson.semester || semesterTab),
            weekFrom: Number(editingLesson.weekFrom || 1),
            weekTo: Number(editingLesson.weekTo || 1),
            topicName: editingLesson.topicName || "",
            lessonName: editingLesson.lessonName || "",
            periodCount: Number(editingLesson.periodCount || 1),
            objectives: editingLesson.objectives || "",
            adjustments: editingLesson.adjustments || "",
            projectNotes: editingLesson.projectNotes || "",
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể lưu bài dạy." })
        return
      }
      setActiveVersion(json.version)
      setLessons(json.lessons || [])
      setEditingLesson(null)
      setBannerMsg({ type: "success", text: "Đã lưu bài dạy vào bản nháp." })
    } finally {
      setSavingMutation(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!activeVersion || !confirm("Xóa bài dạy này khỏi bản nháp? Nếu tiết đang gắn lịch dự giờ tương lai, hệ thống sẽ yêu cầu chọn tiết thay thế khi công bố.")) {
      return
    }
    setSavingMutation(true)
    try {
      const res = await fetch(`/api/teaching-plans/versions/${activeVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: activeVersion.revision,
          operation: { type: "DELETE_LESSON", lessonId },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể xóa bài dạy." })
        return
      }
      setActiveVersion(json.version)
      setLessons(json.lessons || [])
      setEditingLesson(null)
      setBannerMsg({ type: "success", text: "Đã xóa bài dạy khỏi bản nháp." })
    } finally {
      setSavingMutation(false)
    }
  }

  const handleCreatePlan = async () => {
    if (createForm.mode === "EXCEL") {
      setShowCreateModal(false)
      setShowImportModal(true)
      return
    }
    setSavingMutation(true)
    setBannerMsg(null)
    try {
      const res = await fetch("/api/teaching-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          level,
          grade,
          subjectId,
          programCode: createForm.programCode,
          programName:
            catalog.programs.find((p) => p.code === createForm.programCode)?.name ||
            createForm.programCode,
          scopeType: createForm.scopeType,
          campusId: createForm.scopeType === "CAMPUS" ? createForm.campusId : null,
          title: createForm.title || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể tạo kế hoạch." })
        return
      }
      setShowCreateModal(false)
      setBannerMsg({ type: "success", text: "Đã tạo kế hoạch dạy học mới (Bản nháp v1)." })
      await loadPlansForSelection(academicYearId, level, grade, subjectId)
    } finally {
      setSavingMutation(false)
    }
  }

  const handleCreateDraftFromPublished = async () => {
    if (!activePlan) return
    setSavingMutation(true)
    setBannerMsg(null)
    try {
      const res = await fetch(`/api/teaching-plans/${activePlan.id}/versions`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể tạo bản nháp mới." })
        return
      }
      setActiveVersion(json.version)
      setLessons(json.lessons || [])
      setBannerMsg({
        type: "success",
        text: `Đã tạo bản nháp v${json.version.versionNumber} từ bản đang công bố. Bản công bố hiện hành vẫn tiếp tục phục vụ dự giờ cho đến khi bản mới được công bố.`,
      })
      await loadPlansForSelection(academicYearId, level, grade, subjectId)
    } finally {
      setSavingMutation(false)
    }
  }

  const handleWorkflowAction = async (action: "SUBMIT" | "REQUEST_CHANGES") => {
    if (!activeVersion) return
    let comment = ""
    if (action === "REQUEST_CHANGES") {
      const reason = prompt("Nhập nội dung yêu cầu chỉnh sửa:")
      if (reason === null) return
      comment = reason
    }
    setSavingMutation(true)
    setBannerMsg(null)
    try {
      const res = await fetch(`/api/teaching-plans/versions/${activeVersion.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setBannerMsg({ type: "error", text: json.error || "Không thể chuyển trạng thái." })
        return
      }
      setActiveVersion(json.detail.version)
      setLessons(json.detail.lessons || [])
      setBannerMsg({
        type: "success",
        text:
          action === "SUBMIT"
            ? "Đã gửi duyệt phiên bản kế hoạch dạy học."
            : "Đã chuyển về trạng thái Nháp kèm yêu cầu chỉnh sửa.",
      })
      await loadPlansForSelection(academicYearId, level, grade, subjectId)
    } finally {
      setSavingMutation(false)
    }
  }

  const openVersionHistory = async () => {
    if (!activePlan) return
    setActionsMenuOpen(false)
    setShowHistoryDrawer(true)
    const res = await fetch(`/api/teaching-plans/${activePlan.id}/versions`)
    const json = await res.json()
    if (json.success) {
      setHistoryData({ versions: json.versions || [], logs: json.logs || [] })
    }
  }

  const templateDownloadUrl = `/api/teaching-plans/template?academicYearName=${encodeURIComponent(
    selectedYearObj?.name || ""
  )}&grade=${encodeURIComponent(grade)}&subjectName=${encodeURIComponent(
    selectedSubjectObj?.subjectName || ""
  )}`

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 space-y-5">
      {/* Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00736E] font-medium">
            <BookOpen className="w-4 h-4" />
            <span>Chuyên môn</span>
            <span>/</span>
            <span>Kế hoạch dạy học</span>
          </div>
          <h1 className="text-xl font-bold text-[#003B3A] mt-1 tracking-tight">
            Kế hoạch dạy học & Phân phối chương trình
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Quản lý phiên bản kế hoạch dạy học theo năm học, bậc, khối, môn và đồng bộ trực tiếp với Thời khóa biểu & Dự giờ chuyên môn.
          </p>
        </div>

        {/* Actions menu (authorized users only) */}
        {catalog.permissions.canManage && isSelectionComplete && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeVersion?.status === "PUBLISHED" && (
              <button
                type="button"
                disabled={savingMutation}
                onClick={handleCreateDraftFromPublished}
                className="px-3.5 py-2 text-xs font-medium text-[#003B3A] bg-white border border-[#003B3A]/30 hover:bg-[#F0FDFA] rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Tạo bản nháp chỉnh sửa</span>
              </button>
            )}

            {activeVersion?.status === "DRAFT" && (
              <button
                type="button"
                disabled={savingMutation || lessons.length === 0}
                onClick={() => handleWorkflowAction("SUBMIT")}
                className="px-3.5 py-2 text-xs font-medium text-[#003B3A] bg-white border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-40 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi duyệt</span>
              </button>
            )}

            {activeVersion?.status === "PENDING_APPROVAL" && catalog.permissions.canApprove && (
              <button
                type="button"
                disabled={savingMutation}
                onClick={() => handleWorkflowAction("REQUEST_CHANGES")}
                className="px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu cầu chỉnh sửa</span>
              </button>
            )}

            {(activeVersion?.status === "DRAFT" || activeVersion?.status === "PENDING_APPROVAL") &&
              catalog.permissions.canApprove && (
                <button
                  type="button"
                  disabled={savingMutation || lessons.length === 0}
                  onClick={() => setShowPublishModal(true)}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] disabled:opacity-40 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Công bố</span>
                </button>
              )}

            {/* Compact Actions Menu: Tải mẫu, Nhập Excel, Lịch sử phiên bản */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((v) => !v)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>Thao tác</span>
              </button>
              {actionsMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-[#E2E8F0] shadow-lg py-1.5 z-30">
                  <a
                    href={templateDownloadUrl}
                    onClick={() => setActionsMenuOpen(false)}
                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-[#00736E]" />
                    <span>Tải mẫu Excel</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false)
                      setShowImportModal(true)
                    }}
                    disabled={Boolean(activeVersion && activeVersion.status !== "DRAFT")}
                    className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center gap-2 text-left"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#00736E]" />
                    <span>Nhập Excel</span>
                  </button>
                  {activePlan && (
                    <button
                      type="button"
                      onClick={openVersionHistory}
                      className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-[#F8FAFC] flex items-center gap-2 text-left"
                    >
                      <History className="w-3.5 h-3.5 text-[#00736E]" />
                      <span>Lịch sử phiên bản</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cascading Filter Strip: Năm học -> Bậc học -> Khối -> Môn */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Năm học</label>
            <select
              value={academicYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E]"
            >
              <option value="">Chọn năm học</option>
              {catalog.academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Đang hoạt động)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Bậc học</label>
            <select
              value={level}
              onChange={(e) => handleLevelChange(e.target.value)}
              disabled={!academicYearId}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#00736E]"
            >
              <option value="">Chọn bậc học</option>
              {catalog.levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Khối</label>
            <select
              value={grade}
              onChange={(e) => handleGradeChange(e.target.value)}
              disabled={!level}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#00736E]"
            >
              <option value="">Chọn khối</option>
              {catalog.grades.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!grade}
              className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#00736E]"
            >
              <option value="">Chọn môn học</option>
              {catalog.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.subjectCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conditional disambiguation selectors: only shown when multiple plans exist */}
        {(needsProgramFilter || needsScopeFilter || plans.length > 1) && (
          <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-3 gap-3">
            {needsProgramFilter && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Chương trình / Bộ sách
                </label>
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E]"
                >
                  <option value="ALL">Tất cả chương trình</option>
                  {catalog.programs.map((p) => (
                    <option key={p.code || "_default"} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {needsScopeFilter && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phạm vi áp dụng
                </label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E]"
                >
                  <option value="ALL">Tất cả phạm vi</option>
                  <option value="SYSTEM">Toàn hệ thống</option>
                  {catalog.campuses.map((c) => (
                    <option key={c.id} value={`CAMPUS:${c.id}`}>
                      Cơ sở {c.campusCode}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {plans.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Chọn bản kế hoạch áp dụng
                </label>
                <select
                  value={selectedPlanId}
                  onChange={async (e) => {
                    const pid = e.target.value
                    setSelectedPlanId(pid)
                    const found = plans.find((p) => p.id === pid)
                    const ver = found?.activeDraft || found?.activePublished || found?.versions[0]
                    if (ver) await loadVersionDetail(ver.id)
                  }}
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.scopeType === "CAMPUS" ? p.campusCode : "Toàn hệ thống"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {bannerMsg && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            bannerMsg.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button type="button" onClick={() => setBannerMsg(null)} className="text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!isSelectionComplete ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#003B3A]">
                  Kho Kế hoạch dạy học đã lưu theo môn ({savedDirectory.length} kế hoạch)
                </h2>
                <p className="text-xs text-slate-500">
                  Bấm vào một kế hoạch để mở chi tiết, hoặc chọn đủ Năm học → Bậc → Khối → Môn ở trên để tạo kế hoạch mới.
                </p>
              </div>
              {directorySubjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDirectorySubjectFilter("ALL")}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      directorySubjectFilter === "ALL"
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                    }`}
                  >
                    Tất cả môn ({savedDirectory.length})
                  </button>
                  {directorySubjects.map((sub) => (
                    <button
                      key={sub.subjectId}
                      type="button"
                      onClick={() => setDirectorySubjectFilter(sub.subjectId)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors tabular-nums ${
                        directorySubjectFilter === sub.subjectId
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                      }`}
                    >
                      {sub.subjectName} ({sub.count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingDirectory ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#00736E]" />
                <span>Đang tải danh sách kế hoạch đã lưu...</span>
              </div>
            ) : filteredDirectory.length === 0 ? (
              <div className="py-10 text-center space-y-2 border-t border-[#F1F5F9]">
                <Layers className="w-8 h-8 text-[#00736E]/50 mx-auto" />
                <div className="text-sm font-medium text-slate-800">
                  Chưa có Kế hoạch dạy học nào được lưu trong phạm vi lọc hiện tại
                </div>
                <p className="text-xs text-slate-500">
                  Chọn đủ Năm học, Bậc học, Khối và Môn học ở thanh bộ lọc phía trên để tạo mới hoặc nhập Excel.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                      <tr>
                        <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap">Môn học</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">Bậc / Khối</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap">Tên kế hoạch & Phạm vi</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-center">Bài / Tiết</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Trạng thái</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Đồng bộ Dự giờ</th>
                        <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {filteredDirectory.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => openSavedPlanFromDirectory(item)}
                          className="transition-colors align-middle hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          <td className="py-3 px-3 font-semibold text-[#003B3A] whitespace-nowrap">
                            {item.subjectName}
                            {item.subjectCode && (
                              <span className="ml-1.5 text-[11px] font-normal text-slate-500">({item.subjectCode})</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {item.level} • Khối {item.grade}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{item.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {item.scopeType === "CAMPUS" ? `Cơ sở ${item.campusCode}` : "Toàn hệ thống"}
                              {item.programName ? ` • ${item.programName}` : ""}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700 whitespace-nowrap">
                            {item.lessonCount} bài • {item.periodCount} tiết
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${
                                STATUS_LABELS[item.latestVersionStatus]?.cls || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              v{item.latestVersionNumber} •{" "}
                              {STATUS_LABELS[item.latestVersionStatus]?.label || item.latestVersionStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {item.syncToObservation ? (
                              <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                                Đã đồng bộ
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                                Chưa đồng bộ
                              </span>
                            )}
                          </td>
                          <td
                            className="py-3 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-2">
                              {catalog.permissions.canManage && Boolean(item.activePublishedVersionId) && (
                                <button
                                  type="button"
                                  disabled={syncingPlanId === item.id}
                                  onClick={() =>
                                    handleToggleSyncObservation(item.id, !item.syncToObservation)
                                  }
                                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                                    item.syncToObservation
                                      ? "text-slate-700 bg-white border-[#E2E8F0] hover:bg-slate-50"
                                      : "text-white bg-[#003B3A] border-[#003B3A] hover:bg-[#005250]"
                                  }`}
                                >
                                  {syncingPlanId === item.id
                                    ? "Đang xử lý..."
                                    : item.syncToObservation
                                    ? "Tắt đồng bộ"
                                    : "Đồng bộ Dự giờ"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openSavedPlanFromDirectory(item)}
                                className="text-[#00736E] font-medium hover:underline text-xs"
                              >
                                Mở kế hoạch
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : loadingPlans || loadingVersion ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-[#00736E]" />
          <span>Đang tải kế hoạch dạy học...</span>
        </div>
      ) : !activePlan || !activeVersion ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Chưa có kế hoạch</h2>
            <p className="text-xs text-slate-500 mt-1">
              Chưa có kế hoạch dạy học cho {level} • Khối {grade} • {selectedSubjectObj?.subjectName} ({selectedYearObj?.name}).
            </p>
          </div>
          {catalog.permissions.canManage && (
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCreateForm({
                    programCode: "",
                    scopeType: catalog.permissions.isFullAccess ? "SYSTEM" : "CAMPUS",
                    campusId: catalog.permissions.allowedCampusIds[0] || catalog.campuses[0]?.id || "",
                    title: "",
                    mode: "DIRECT",
                  })
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo kế hoạch</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 text-xs font-medium text-[#003B3A] bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Nhập từ file Excel</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Plan Status Ledger Strip */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubjectId("")
                  setPlans([])
                  setActivePlan(null)
                  setActiveVersion(null)
                  setLessons([])
                  fetchSavedDirectory(academicYearId, level, grade)
                }}
                className="px-2.5 py-1 text-[11px] font-medium text-[#003B3A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100 rounded-lg transition-colors"
              >
                ← Kho KHDH theo môn
              </button>
              <span className="text-sm font-semibold text-[#003B3A]">{activePlan.title}</span>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${
                  STATUS_LABELS[activeVersion.status]?.cls || "bg-slate-100 text-slate-700"
                }`}
              >
                v{activeVersion.versionNumber} • {STATUS_LABELS[activeVersion.status]?.label || activeVersion.status}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {lessons.length} bài • {lessons.reduce((sum, l) => sum + l.periods.length, 0)} tiết chi tiết
              </span>
              {activePlan.scopeType === "CAMPUS" ? (
                <span className="text-xs text-slate-600">Phạm vi: Cơ sở {activePlan.campusCode}</span>
              ) : (
                <span className="text-xs text-slate-600">Phạm vi: Toàn hệ thống</span>
              )}
              {activePlan.activePublishedVersionId && (
                <span
                  className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border ${
                    activePlan.syncToObservation
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {activePlan.syncToObservation ? "Đã đồng bộ Dự giờ" : "Chưa đồng bộ Dự giờ"}
                </span>
              )}
            </div>

            {catalog.permissions.canManage && activePlan.activePublishedVersionId && (
              <button
                type="button"
                disabled={syncingPlanId === activePlan.id}
                onClick={() =>
                  handleToggleSyncObservation(activePlan.id, !activePlan.syncToObservation)
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activePlan.syncToObservation
                    ? "text-slate-700 bg-white border-[#E2E8F0] hover:bg-slate-50"
                    : "text-white bg-[#003B3A] border-[#003B3A] hover:bg-[#005250]"
                }`}
              >
                {syncingPlanId === activePlan.id
                  ? "Đang xử lý..."
                  : activePlan.syncToObservation
                  ? "Tắt đồng bộ Dự giờ"
                  : "Đồng bộ qua Dự giờ"}
              </button>
            )}

            {activeVersion.reviewComment && activeVersion.status === "DRAFT" && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                Yêu cầu chỉnh sửa: {activeVersion.reviewComment}
              </div>
            )}
          </div>

          {/* Semester Tabs + Week Filter + Search + Add Lesson */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex bg-white border border-[#E2E8F0] rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => {
                  setSemesterTab(1)
                  setWeekFilter("ALL")
                }}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  semesterTab === 1
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ I
              </button>
              <button
                type="button"
                onClick={() => {
                  setSemesterTab(2)
                  setWeekFilter("ALL")
                }}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  semesterTab === 2
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Học kỳ II
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E] tabular-nums"
              >
                <option value="ALL">Tất cả các tuần</option>
                {availableWeeks.map((w) => (
                  <option key={w} value={String(w)}>
                    Tuần {w}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên bài, mã bài..."
                  className="text-xs border border-[#E2E8F0] rounded-lg pl-8 pr-3 py-2 bg-white w-56 focus:outline-none focus:border-[#00736E]"
                />
              </div>

              {isDraftEditable && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-3.5 py-2 text-xs font-medium text-[#003B3A] bg-white border border-[#003B3A]/30 hover:bg-[#F0FDFA] rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#00736E]" />
                    <span>Nhập Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingLesson({
                        semester: semesterTab,
                        weekFrom: 1,
                        weekTo: 1,
                        periodCount: 1,
                        lessonCode: "",
                        topicName: "",
                        lessonName: "",
                        objectives: "",
                        adjustments: "",
                        projectNotes: "",
                      })
                    }
                    className="px-3.5 py-2 text-xs font-medium text-white bg-[#00736E] hover:bg-[#005e5a] rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm bài dạy</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Academic Ledger Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr>
                    <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap w-24">
                      Tuần
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-48">
                      Chủ đề / Mạch nội dung
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                      Tên bài hoặc nội dung dạy học
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap w-20 text-center">
                      Số tiết
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                      Yêu cầu cần đạt
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-48">
                      Điều chỉnh / Bổ sung
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {filteredLessons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center text-slate-500">
                        <div className="space-y-3">
                          <p>
                            Chưa có bài dạy nào trong Học kỳ {semesterTab === 1 ? "I" : "II"} phù hợp bộ lọc.
                          </p>
                          {isDraftEditable && (
                            <div className="flex items-center justify-center gap-2.5">
                              <a
                                href={templateDownloadUrl}
                                className="px-3.5 py-1.5 text-xs font-medium text-[#003B3A] bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5 text-[#00736E]" />
                                <span>Tải file mẫu Excel</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => setShowImportModal(true)}
                                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg inline-flex items-center gap-1.5"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Nhập từ file Excel</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLessons.map((lesson) => {
                      const isExpanded = Boolean(expandedLessonIds[lesson.id])
                      const skeletonCount = lesson.periods.filter((p) => p.isSkeleton).length
                      return (
                        <React.Fragment key={lesson.id}>
                          <tr
                            onClick={() =>
                              setExpandedLessonIds((prev) => ({
                                ...prev,
                                [lesson.id]: !prev[lesson.id],
                              }))
                            }
                            className={`transition-colors align-middle cursor-pointer ${
                              isExpanded
                                ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <td className="py-3 px-3 font-medium text-[#003B3A] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-[#00736E] shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span>
                                  {lesson.weekFrom === lesson.weekTo
                                    ? `Tuần ${lesson.weekFrom}`
                                    : `Tuần ${lesson.weekFrom}–${lesson.weekTo}`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-700">{lesson.topicName}</td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{lesson.lessonName}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Mã: {lesson.lessonCode}</span>
                                {skeletonCount > 0 && (
                                  <span className="text-amber-700 font-medium">
                                    • {skeletonCount} tiết khung cần bổ sung
                                  </span>
                                )}
                                {lesson.projectNotes && (
                                  <span className="text-[#00736E]">• Có ghi chú dự án</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-[#003B3A]">
                              {lesson.periodCount}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-pre-line max-w-md">
                              {lesson.objectives || <span className="text-slate-400">—</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-pre-line">
                              <div className="flex items-start justify-between gap-2">
                                <span>{lesson.adjustments || "—"}</span>
                                {isDraftEditable && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingLesson(lesson)
                                    }}
                                    className="text-[#00736E] hover:text-[#003B3A] text-[11px] font-medium shrink-0"
                                  >
                                    Sửa bài
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded inline periods */}
                          {isExpanded && (
                            <tr className="bg-[#F8FAFC]">
                              <td colSpan={6} className="px-6 py-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-semibold text-[#003B3A]">
                                      Danh sách tiết của {lesson.lessonName} ({lesson.periods.length}/{lesson.periodCount} tiết) — bấm vào một tiết để xem hoặc chỉnh chi tiết
                                    </div>
                                    {lesson.projectNotes && (
                                      <div className="text-[11px] text-slate-600">
                                        Ghi chú dự án: {lesson.projectNotes}
                                      </div>
                                    )}
                                  </div>

                                  <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
                                    {lesson.periods.map((period) => (
                                      <div
                                        key={period.id}
                                        onClick={() => openPeriodDrawer(lesson, period)}
                                        className="px-4 py-2.5 hover:bg-[#F0FDFA]/60 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className="px-2 py-0.5 rounded-md bg-[#003B3A]/10 text-[#003B3A] font-semibold text-[11px] whitespace-nowrap">
                                            Tiết {period.periodIndexInLesson}/{lesson.periodCount}
                                          </span>
                                          <div>
                                            <div className="font-medium text-slate-900">
                                              {period.focus || (
                                                <span className="text-amber-700 italic">
                                                  Chưa nhập trọng tâm tiết (tiết khung)
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                              Mã tiết: {period.periodCode} • Tuần dự kiến: Tuần {period.plannedWeek}
                                              {period.attachments.length > 0 && " • Có tài liệu kèm theo"}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {period.isSkeleton ? (
                                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                                              Cần bổ sung
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              Đủ thông tin
                                            </span>
                                          )}
                                          <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Period Detail / Edit Slide-over Drawer */}
      {selectedPeriodCtx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {selectedPeriodCtx.lesson.lessonName} — Tiết {selectedPeriodCtx.period.periodIndexInLesson}/
                  {selectedPeriodCtx.lesson.periodCount} của bài
                </h3>
                <p className="text-xs text-teal-100 mt-0.5">
                  Mã tiết: {selectedPeriodCtx.period.periodCode} • Định danh nội bộ: {selectedPeriodCtx.period.stablePeriodId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPeriodCtx(null)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Explicit separation of Tiết trong bài vs Tiết trên TKB */}
              <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 tabular-nums">
                <div>
                  <div className="text-[11px] text-slate-500">Vị trí trong bài học</div>
                  <div className="font-semibold text-[#003B3A] mt-0.5">
                    Tiết {selectedPeriodCtx.period.periodIndexInLesson}/{selectedPeriodCtx.lesson.periodCount} của bài
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Tiết trên thời khóa biểu</div>
                  <div className="font-medium text-slate-700 mt-0.5">
                    Xác định khi gắn vào buổi dạy TKB
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tuần dự kiến (trong khoảng Tuần {selectedPeriodCtx.lesson.weekFrom}–{selectedPeriodCtx.lesson.weekTo})
                </label>
                <input
                  type="number"
                  min={selectedPeriodCtx.lesson.weekFrom}
                  max={selectedPeriodCtx.lesson.weekTo}
                  disabled={!isDraftEditable}
                  value={periodForm.plannedWeek}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, plannedWeek: Number(e.target.value) }))}
                  className="w-32 border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Trọng tâm tiết</label>
                <input
                  type="text"
                  disabled={!isDraftEditable}
                  value={periodForm.focus}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, focus: e.target.value }))}
                  placeholder="Nhập trọng tâm kiến thức/kỹ năng của tiết..."
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Yêu cầu cần đạt của tiết (mỗi dòng một yêu cầu)
                </label>
                <textarea
                  rows={5}
                  disabled={!isDraftEditable}
                  value={periodForm.objectives}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, objectives: e.target.value }))}
                  placeholder="- Yêu cầu cần đạt 1&#10;- Yêu cầu cần đạt 2"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Minh chứng học tập dự kiến</label>
                <textarea
                  rows={3}
                  disabled={!isDraftEditable}
                  value={periodForm.expectedEvidence}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, expectedEvidence: e.target.value }))}
                  placeholder="Phiếu học tập, sản phẩm nhóm, câu trả lời bảng con..."
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Điều chỉnh / Bổ sung</label>
                <textarea
                  rows={2}
                  disabled={!isDraftEditable}
                  value={periodForm.adjustments}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, adjustments: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                />
              </div>

              <div className="border-t border-[#F1F5F9] pt-3 space-y-2">
                <div className="font-medium text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#00736E]" />
                  <span>Tài liệu kèm theo (nếu có)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    disabled={!isDraftEditable}
                    value={periodForm.attachmentName}
                    onChange={(e) => setPeriodForm((p) => ({ ...p, attachmentName: e.target.value }))}
                    placeholder="Tên tài liệu (VD: Phiếu bài tập)"
                    className="border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                  />
                  <input
                    type="url"
                    disabled={!isDraftEditable}
                    value={periodForm.attachmentUrl}
                    onChange={(e) => setPeriodForm((p) => ({ ...p, attachmentUrl: e.target.value }))}
                    placeholder="Liên kết tài liệu (https://...)"
                    className="border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPeriodCtx(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-[#E2E8F0] rounded-lg"
              >
                Đóng
              </button>
              {isDraftEditable && (
                <button
                  type="button"
                  disabled={savingMutation}
                  onClick={handleSavePeriod}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg inline-flex items-center gap-1.5"
                >
                  {savingMutation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingLesson.id ? "Chỉnh sửa bài dạy" : "Thêm bài dạy mới"}
              </h3>
              <button type="button" onClick={() => setEditingLesson(null)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã bài *</label>
                  <input
                    type="text"
                    value={editingLesson.lessonCode || ""}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, lessonCode: e.target.value }))}
                    placeholder="VD: TOAN1-B10"
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Học kỳ *</label>
                  <select
                    value={editingLesson.semester || 1}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, semester: Number(e.target.value) }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                  >
                    <option value={1}>Học kỳ I</option>
                    <option value={2}>Học kỳ II</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tuần từ *</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={editingLesson.weekFrom || 1}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, weekFrom: Number(e.target.value) }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tuần đến *</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={editingLesson.weekTo || 1}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, weekTo: Number(e.target.value) }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Chủ đề / Mạch nội dung *</label>
                  <input
                    type="text"
                    value={editingLesson.topicName || ""}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, topicName: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Số tiết *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editingLesson.periodCount || 1}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, periodCount: Number(e.target.value) }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tên bài hoặc nội dung dạy học *</label>
                <input
                  type="text"
                  value={editingLesson.lessonName || ""}
                  onChange={(e) => setEditingLesson((l) => ({ ...l, lessonName: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Yêu cầu cần đạt của bài</label>
                <textarea
                  rows={3}
                  value={editingLesson.objectives || ""}
                  onChange={(e) => setEditingLesson((l) => ({ ...l, objectives: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Điều chỉnh / Bổ sung</label>
                  <textarea
                    rows={2}
                    value={editingLesson.adjustments || ""}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, adjustments: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ghi chú dự án (cấp bài)</label>
                  <textarea
                    rows={2}
                    value={editingLesson.projectNotes || ""}
                    onChange={(e) => setEditingLesson((l) => ({ ...l, projectNotes: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
              <div>
                {editingLesson.id ? (
                  <button
                    type="button"
                    disabled={savingMutation}
                    onClick={() => handleDeleteLesson(editingLesson.id!)}
                    className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa bài khỏi bản nháp</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLesson(null)
                      setShowImportModal(true)
                    }}
                    className="text-xs font-medium text-[#00736E] hover:text-[#003B3A] inline-flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Nhập hàng loạt từ file Excel mẫu</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-[#E2E8F0] rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingMutation}
                  onClick={handleSaveLesson}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg"
                >
                  Lưu bài dạy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tạo Kế hoạch dạy học mới</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-slate-700">
                {selectedYearObj?.name} • {level} • Khối {grade} • {selectedSubjectObj?.subjectName}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Chương trình / Bộ sách</label>
                <select
                  value={createForm.programCode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, programCode: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                >
                  {catalog.programs.map((p) => (
                    <option key={p.code || "_def"} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phạm vi áp dụng</label>
                  <select
                    value={createForm.scopeType}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        scopeType: e.target.value === "CAMPUS" ? "CAMPUS" : "SYSTEM",
                      }))
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="SYSTEM">Toàn hệ thống</option>
                    <option value="CAMPUS">Theo cơ sở</option>
                  </select>
                </div>
                {createForm.scopeType === "CAMPUS" && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Cơ sở</label>
                    <select
                      value={createForm.campusId}
                      onChange={(e) => setCreateForm((f) => ({ ...f, campusId: e.target.value }))}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">Chọn cơ sở</option>
                      {catalog.campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.campusCode} – {c.campusName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Cách khởi tạo</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, mode: "DIRECT" }))}
                    className={`p-3 rounded-xl border text-left ${
                      createForm.mode === "DIRECT"
                        ? "border-[#003B3A] bg-[#F0FDFA] text-[#003B3A] font-medium"
                        : "border-[#E2E8F0] text-slate-600"
                    }`}
                  >
                    Nhập trực tiếp trên SSM
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, mode: "EXCEL" }))}
                    className={`p-3 rounded-xl border text-left ${
                      createForm.mode === "EXCEL"
                        ? "border-[#003B3A] bg-[#F0FDFA] text-[#003B3A] font-medium"
                        : "border-[#E2E8F0] text-slate-600"
                    }`}
                  >
                    Nhập từ file Excel mẫu
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-[#E2E8F0] rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingMutation}
                onClick={handleCreatePlan}
                className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Drawer */}
      {showHistoryDrawer && activePlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold">Lịch sử phiên bản</h3>
              <button type="button" onClick={() => setShowHistoryDrawer(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {historyData.versions.map((v: any) => (
                <div
                  key={v.id}
                  onClick={async () => {
                    await loadVersionDetail(v.id)
                    setShowHistoryDrawer(false)
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    activeVersion?.id === v.id
                      ? "border-[#003B3A] bg-[#F0FDFA]"
                      : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Phiên bản v{v.versionNumber}</span>
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full border ${
                        STATUS_LABELS[v.status]?.cls || ""
                      }`}
                    >
                      {STATUS_LABELS[v.status]?.label || v.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                    <div>Người tạo: {v.createdByName || "—"}</div>
                    {v.publishedByName && <div>Công bố bởi: {v.publishedByName}</div>}
                    {v.reviewComment && <div className="text-amber-800">Ghi chú duyệt: {v.reviewComment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <TeachingPlanExcelImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        context={{
          academicYearId,
          academicYearName: selectedYearObj?.name || "",
          level,
          grade,
          subjectId,
          subjectName: selectedSubjectObj?.subjectName || "",
          programCode: activePlan?.programCode ?? createForm.programCode,
          programName: activePlan?.programName ?? createForm.programCode,
          scopeType: activePlan?.scopeType ?? createForm.scopeType,
          campusId: activePlan?.campusId ?? (createForm.scopeType === "CAMPUS" ? createForm.campusId : null),
          versionId: activeVersion?.status === "DRAFT" ? activeVersion.id : undefined,
          expectedRevision: activeVersion?.status === "DRAFT" ? activeVersion.revision : undefined,
        }}
        onCommitted={async (data) => {
          setActivePlan(data.plan)
          setActiveVersion(data.version)
          setLessons(data.lessons || [])
          setBannerMsg({
            type: "success",
            text: `Đã nhập Excel vào bản nháp v${data.version.versionNumber} (${data.lessons?.length || 0} bài).`,
          })
          await loadPlansForSelection(academicYearId, level, grade, subjectId)
        }}
      />

      {/* Pre-Publish Modal */}
      {activeVersion && (
        <TeachingPlanPublishModal
          open={showPublishModal}
          versionId={activeVersion.id}
          versionNumber={activeVersion.versionNumber}
          lessons={lessons}
          onClose={() => setShowPublishModal(false)}
          onPublished={async (res) => {
            setActiveVersion(res.detail.version)
            setLessons(res.detail.lessons || [])
            setBannerMsg({
              type: "success",
              text: `Đã công bố phiên bản v${res.detail.version.versionNumber} thành công.`,
            })
            await loadPlansForSelection(academicYearId, level, grade, subjectId)
          }}
        />
      )}
    </div>
  )
}
