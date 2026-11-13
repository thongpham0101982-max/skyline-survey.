"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import {
  BookmarkCheck,
  CheckCircle2,
  CopyCheck,
  GripVertical,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Trash2,
  Unlock,
  X,
} from "lucide-react"
import { TimetableShell, VERSION_STATUS_BADGE } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { ValidationSummaryPanel } from "@/components/timetable/ValidationSummaryPanel"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import { DAY_LABELS, SHORT_DAY_LABELS } from "@/lib/timetable/scopeResolver"
import { validateTimetable } from "@/lib/timetable/validator"
import {
  buildBulkScopePlacement,
  evaluateCellDropTarget,
  makeSlotCellKey,
  recomputeLiveQuotaItems,
  type DraggedTimetablePayload,
  type DropTargetEvaluation,
} from "@/lib/timetable/dragDropHelper"
import type {
  DayOfWeekCode,
  FixedSlotRule,
  ManageableScopeGroup,
  SessionCode,
  SlotDiffItem,
  SlotRecord,
  UnscheduledActivity,
  ValidationIssue,
  WeekTypeCode,
} from "@/lib/timetable/types"
import {
  clearDraftVersionSlotsAction,
  compareVersionWithBaselineAction,
  createTimetableVersionAction,
  downloadTimetableExcelTemplateAction,
  getTimetableSchedulerPageAction,
  previewTimetableExcelImportAction,
  removeScopeFixedSlotRuleAction,
  runAutoScheduleDraftAction,
  saveDraftSlotsBatchAction,
  saveScopeFixedSlotRuleAction,
} from "../actions"

type SchedulerPageData = Extract<
  Awaited<ReturnType<typeof getTimetableSchedulerPageAction>>,
  { success: true }
>

type PaletteTabCode = "UNSCHEDULED" | "BY_CLASS" | "SCOPE_SUBJECTS"
type AutoSaveStatus = "IDLE" | "PENDING" | "SAVING" | "SAVED" | "ERROR"

const SCOPE_WORKSPACE_PREFS_KEY = "ssm_tkb_scheduler_prefs_v1"

interface ScopeWorkspacePrefs {
  paletteOpen: boolean
  paletteTab: PaletteTabCode
  autoLockManual: boolean
  focusedClassId: string
}

function readScopeWorkspacePrefs(scopeGroup: string): ScopeWorkspacePrefs {
  const fallback: ScopeWorkspacePrefs = {
    paletteOpen: true,
    paletteTab: "UNSCHEDULED",
    autoLockManual: true,
    focusedClassId: "",
  }
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(SCOPE_WORKSPACE_PREFS_KEY)
    if (!raw) return fallback
    const map = JSON.parse(raw) as Record<string, Partial<ScopeWorkspacePrefs>>
    return { ...fallback, ...(map[scopeGroup] || {}) }
  } catch {
    return fallback
  }
}

function writeScopeWorkspacePrefs(scopeGroup: string, prefs: ScopeWorkspacePrefs) {
  if (typeof window === "undefined" || !scopeGroup) return
  try {
    const raw = window.localStorage.getItem(SCOPE_WORKSPACE_PREFS_KEY)
    const map: Record<string, ScopeWorkspacePrefs> = raw ? JSON.parse(raw) : {}
    map[scopeGroup] = prefs
    window.localStorage.setItem(SCOPE_WORKSPACE_PREFS_KEY, JSON.stringify(map))
  } catch {
    // ignore storage quota errors
  }
}

export function SchedulerClient({ initialData }: { initialData: SchedulerPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<SchedulerPageData>(initialData, getTimetableSchedulerPageAction)

  const activeScopeCode = data.filterContext.selectedScopeGroup

  const [slots, setSlots] = useState<SlotRecord[]>(data.slots)
  const [fixedSlotsConfig, setFixedSlotsConfig] = useState<FixedSlotRule[]>(
    data.config.fixedSlots || []
  )
  const [revision, setRevision] = useState<number>(data.selectedVersion?.revision || 1)
  const [dirty, setDirty] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("IDLE")
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const [autoRunning, setAutoRunning] = useState(false)

  // Per-Bộ TKB workspace preferences
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [paletteTab, setPaletteTab] = useState<PaletteTabCode>("UNSCHEDULED")
  const [autoLockManual, setAutoLockManual] = useState(true)
  const [focusedClassId, setFocusedClassId] = useState<string>("")
  const [paletteSearch, setPaletteSearch] = useState("")
  const [paletteWeekType, setPaletteWeekType] = useState<WeekTypeCode>("ALL")
  const [scopeUseHomeroom, setScopeUseHomeroom] = useState(false)

  // Drag & Drop live state
  const [activeDrag, setActiveDrag] = useState<DraggedTimetablePayload | null>(null)
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null)
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null)

  // Modals & Drawers
  const [showCreateDraftModal, setShowCreateDraftModal] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [cloneSourceId, setCloneSourceId] = useState("")
  const [draftEffectiveFrom, setDraftEffectiveFrom] = useState("")
  const [applyRememberedOnNewDraft, setApplyRememberedOnNewDraft] = useState(true)

  const [bulkApplyModal, setBulkApplyModal] = useState<{
    subjectId: string
    subjectCode: string
    subjectName: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    weekType: WeekTypeCode
    useHomeroomTeacher: boolean
    targetMode: "ALL_SCOPE" | "GRADE"
    targetGrade: string
    lockPlacedSlots: boolean
    overwriteUnlocked: boolean
    rememberInScopeConfig: boolean
  } | null>(null)

  const [editingCell, setEditingCell] = useState<{
    classId: string
    className: string
    grade: string
    level: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    slot: SlotRecord | null
  } | null>(null)

  const [showClearDraftModal, setShowClearDraftModal] = useState(false)
  const [confirmVersionCode, setConfirmVersionCode] = useState("")
  const [keepLockedOnClear, setKeepLockedOnClear] = useState(true)

  const [unscheduledList, setUnscheduledList] = useState<UnscheduledActivity[]>([])
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false)

  const [diffResult, setDiffResult] = useState<{
    baselineName: string | null
    diffs: SlotDiffItem[]
  } | null>(null)

  const [excelPreview, setExcelPreview] = useState<
    Extract<Awaited<ReturnType<typeof previewTimetableExcelImportAction>>, { success: true }> | null
  >(null)

  // Serialized Auto-Save Refs (prevents revision race conditions on rapid drag-drops)
  const latestSlotsRef = useRef<SlotRecord[]>(data.slots)
  const revisionRef = useRef<number>(data.selectedVersion?.revision || 1)
  const versionIdRef = useRef<string | null>(data.selectedVersion?.id || null)
  const allScopeClassIdsRef = useRef<string[]>(data.allScopeClasses.map((c) => c.id))
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightSavePromiseRef = useRef<Promise<boolean> | null>(null)
  const pendingAfterFlightRef = useRef<boolean>(false)

  // Restore remembered workspace prefs whenever switching Bộ thời khóa biểu
  useEffect(() => {
    const prefs = readScopeWorkspacePrefs(activeScopeCode)
    setPaletteOpen(prefs.paletteOpen)
    setPaletteTab(prefs.paletteTab)
    setAutoLockManual(prefs.autoLockManual)
    const validFocus = data.allScopeClasses.some((c) => c.id === prefs.focusedClassId)
      ? prefs.focusedClassId
      : data.filterContext.classes[0]?.id || data.allScopeClasses[0]?.id || ""
    setFocusedClassId(validFocus)
  }, [activeScopeCode, data.allScopeClasses, data.filterContext.classes])

  useEffect(() => {
    writeScopeWorkspacePrefs(activeScopeCode, {
      paletteOpen,
      paletteTab,
      autoLockManual,
      focusedClassId,
    })
  }, [activeScopeCode, paletteOpen, paletteTab, autoLockManual, focusedClassId])

  // Sync local working state whenever server dataset changes (filter/version switch)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingAfterFlightRef.current = false
    setSlots(data.slots)
    latestSlotsRef.current = data.slots
    setFixedSlotsConfig(data.config.fixedSlots || [])
    const nextRev = data.selectedVersion?.revision || 1
    setRevision(nextRev)
    revisionRef.current = nextRev
    versionIdRef.current = data.selectedVersion?.id || null
    allScopeClassIdsRef.current = data.allScopeClasses.map((c) => c.id)
    setDirty(false)
    setAutoSaveStatus("IDLE")
    setAutoSaveError(null)
    setDiffResult(null)
    setExcelPreview(null)
  }, [data])

  // Browser tab close guard if an auto-save is still pending or errored
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const isEditableDraft = data.selectedVersion?.status === "DRAFT"

  const flushAutoSave = useCallback(async (): Promise<boolean> => {
    const verId = versionIdRef.current
    if (!verId) return false

    if (inFlightSavePromiseRef.current) {
      pendingAfterFlightRef.current = true
      return inFlightSavePromiseRef.current
    }

    const executeLoop = async (): Promise<boolean> => {
      const snapshotSlots = latestSlotsRef.current
      const expectedRev = revisionRef.current
      setAutoSaveStatus("SAVING")
      setAutoSaveError(null)

      const res = await saveDraftSlotsBatchAction({
        versionId: verId,
        expectedRevision: expectedRev,
        scopedClassIds: allScopeClassIdsRef.current,
        slots: snapshotSlots,
      })

      if (!res.success) {
        setAutoSaveStatus("ERROR")
        setAutoSaveError(res.error)
        toast.error(res.error)
        pendingAfterFlightRef.current = false
        return false
      }

      revisionRef.current = res.newRevision
      setRevision(res.newRevision)

      if (pendingAfterFlightRef.current || latestSlotsRef.current !== snapshotSlots) {
        pendingAfterFlightRef.current = false
        return executeLoop()
      }

      setDirty(false)
      setAutoSaveStatus("SAVED")
      return true
    }

    const p = executeLoop().finally(() => {
      inFlightSavePromiseRef.current = null
    })
    inFlightSavePromiseRef.current = p
    return p
  }, [])

  const applySlotsAndAutoSave = useCallback(
    (nextSlots: SlotRecord[]) => {
      setSlots(nextSlots)
      latestSlotsRef.current = nextSlots
      setDirty(true)
      setAutoSaveStatus("PENDING")

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        void flushAutoSave()
      }, 450)
    },
    [flushAutoSave]
  )

  const slotByCell = useMemo(() => {
    const map = new Map<string, SlotRecord>()
    for (const s of slots) {
      map.set(makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber), s)
    }
    return map
  }, [slots])

  const teachersById = useMemo(
    () => new Map(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  )

  const effectiveConfig = useMemo(
    () => ({
      ...data.config,
      fixedSlots: fixedSlotsConfig,
    }),
    [data.config, fixedSlotsConfig]
  )

  // Real-time Quota Reconciliation across the entire Bộ thời khóa biểu
  const liveQuotaItems = useMemo(
    () => recomputeLiveQuotaItems(data.quotaItems, slots),
    [data.quotaItems, slots]
  )

  // Real-time 10-rule Validation Report on Client (0 server roundtrip lag)
  const liveValidationReport = useMemo(() => {
    return validateTimetable({
      slots,
      config: effectiveConfig,
      campusId: data.filterContext.selectedCampusId,
      campusName: data.campusName,
      classes: data.allScopeClasses,
      teachersById,
      quotaItems: liveQuotaItems,
      rooms: data.rooms,
      busySlots: data.busySlots,
      travelRules: data.travelRules,
      externalActiveSlots: data.externalActiveSlots,
    })
  }, [
    slots,
    effectiveConfig,
    data.filterContext.selectedCampusId,
    data.campusName,
    data.allScopeClasses,
    teachersById,
    liveQuotaItems,
    data.rooms,
    data.busySlots,
    data.travelRules,
    data.externalActiveSlots,
  ])

  // Map per-cell validation errors for instant visual cell indicators
  const cellIssuesMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>()
    for (const issue of liveValidationReport.allIssues) {
      if (
        issue.severity === "ERROR" &&
        issue.classId &&
        issue.dayOfWeek &&
        issue.session &&
        issue.periodNumber
      ) {
        const key = makeSlotCellKey(
          issue.classId,
          issue.dayOfWeek,
          issue.session,
          issue.periodNumber
        )
        const list = map.get(key) || []
        list.push(issue)
        map.set(key, list)
      }
    }
    return map
  }, [liveValidationReport])

  const displayedClasses = useMemo(() => {
    const filteredIds = new Set(data.filterContext.classes.map((c) => c.id))
    const base = data.allScopeClasses.filter((c) => filteredIds.has(c.id))
    if (data.filterContext.selectedClassId !== "ALL") {
      return base.filter((c) => c.id === data.filterContext.selectedClassId)
    }
    return base
  }, [data.allScopeClasses, data.filterContext.classes, data.filterContext.selectedClassId])

  const displayedClassIdsSet = useMemo(
    () => new Set(displayedClasses.map((c) => c.id)),
    [displayedClasses]
  )

  const periodRows = useMemo(() => {
    const rows: Array<{ dayOfWeek: DayOfWeekCode; session: SessionCode; periodNumber: number }> = []
    const days =
      effectiveConfig.workingDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    for (const d of days) {
      for (let p = 1; p <= (effectiveConfig.morningPeriods || 4); p++) {
        rows.push({ dayOfWeek: d, session: "MORNING", periodNumber: p })
      }
      for (let p = 1; p <= (effectiveConfig.afternoonPeriods ?? 4); p++) {
        rows.push({ dayOfWeek: d, session: "AFTERNOON", periodNumber: p })
      }
    }
    return rows
  }, [effectiveConfig])

  // Precompute drop-target evaluations across displayed cells while dragging (< 2ms)
  const dropEvalByCell = useMemo(() => {
    const map = new Map<string, DropTargetEvaluation>()
    if (!activeDrag || !isEditableDraft) return map

    for (const cls of displayedClasses) {
      if (activeDrag.kind === "CELL_SLOT" && activeDrag.slot.classId !== cls.id) continue
      if (activeDrag.kind === "QUOTA_ACTIVITY" && activeDrag.item.classId !== cls.id) continue

      for (const pr of periodRows) {
        const cKey = makeSlotCellKey(cls.id, pr.dayOfWeek, pr.session, pr.periodNumber)
        map.set(
          cKey,
          evaluateCellDropTarget({
            dragged: activeDrag,
            targetClass: cls,
            dayOfWeek: pr.dayOfWeek,
            session: pr.session,
            periodNumber: pr.periodNumber,
            currentSlots: slots,
            slotByCell,
            quotaItems: liveQuotaItems,
            teachersById,
            campusId: data.filterContext.selectedCampusId,
            config: effectiveConfig,
            busySlots: data.busySlots,
            externalActiveSlots: data.externalActiveSlots,
            travelRules: data.travelRules,
            autoLockManual,
          })
        )
      }
    }
    return map
  }, [
    activeDrag,
    isEditableDraft,
    displayedClasses,
    periodRows,
    slots,
    slotByCell,
    liveQuotaItems,
    teachersById,
    data.filterContext.selectedCampusId,
    effectiveConfig,
    data.busySlots,
    data.externalActiveSlots,
    data.travelRules,
    autoLockManual,
  ])

  const pendingQuotaActivities = useMemo(() => {
    return liveQuotaItems.filter(
      (q) =>
        displayedClassIdsSet.has(q.classId) &&
        (q.missingWeeklyPeriods > 0 || q.status === "MISSING_TEACHER")
    )
  }, [liveQuotaItems, displayedClassIdsSet])

  const filteredPaletteUnscheduled = useMemo(() => {
    const kw = paletteSearch.trim().toLowerCase()
    return pendingQuotaActivities.filter((q) => {
      if (!kw) return true
      return (
        q.subjectName.toLowerCase().includes(kw) ||
        q.className.toLowerCase().includes(kw) ||
        (q.primaryTeacherName || "").toLowerCase().includes(kw) ||
        (q.primaryTeacherCode || "").toLowerCase().includes(kw)
      )
    })
  }, [pendingQuotaActivities, paletteSearch])

  const byClassQuotaItems = useMemo(() => {
    const targetId = focusedClassId || displayedClasses[0]?.id || ""
    const kw = paletteSearch.trim().toLowerCase()
    return liveQuotaItems
      .filter((q) => q.classId === targetId && q.weeklyQuota > 0)
      .filter((q) => {
        if (!kw) return true
        return (
          q.subjectName.toLowerCase().includes(kw) ||
          (q.primaryTeacherName || "").toLowerCase().includes(kw)
        )
      })
  }, [liveQuotaItems, focusedClassId, displayedClasses, paletteSearch])

  const filteredScopeSubjects = useMemo(() => {
    const kw = paletteSearch.trim().toLowerCase()
    return data.subjects.filter((s) => {
      if (!kw) return true
      return (
        s.subjectName.toLowerCase().includes(kw) ||
        s.subjectCode.toLowerCase().includes(kw)
      )
    })
  }, [data.subjects, paletteSearch])

  const handleDropOnCell = (
    cls: SchedulerPageData["allScopeClasses"][number],
    dayOfWeek: DayOfWeekCode,
    session: SessionCode,
    periodNumber: number
  ) => {
    if (!isEditableDraft || !activeDrag) return
    const targetKey = makeSlotCellKey(cls.id, dayOfWeek, session, periodNumber)
    const evalRes =
      dropEvalByCell.get(targetKey) ||
      evaluateCellDropTarget({
        dragged: activeDrag,
        targetClass: cls,
        dayOfWeek,
        session,
        periodNumber,
        currentSlots: slots,
        slotByCell,
        quotaItems: liveQuotaItems,
        teachersById,
        campusId: data.filterContext.selectedCampusId,
        config: effectiveConfig,
        busySlots: data.busySlots,
        externalActiveSlots: data.externalActiveSlots,
        travelRules: data.travelRules,
        autoLockManual,
      })

    setActiveDrag(null)
    setHoveredCellKey(null)
    setHoveredRowKey(null)

    if (evalRes.status === "OUT_OF_COLUMN") {
      if (evalRes.reason) toast.error(evalRes.reason)
      return
    }
    if (evalRes.status === "BLOCKED" || !evalRes.resolvedSlot) {
      toast.error(evalRes.reason || "Không thể thả vào ô tiết này.")
      return
    }

    let nextSlots: SlotRecord[]
    if (activeDrag.kind === "CELL_SLOT") {
      const remaining = slots.filter((s) => {
        const k = makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber)
        return k !== activeDrag.sourceCellKey && k !== targetKey
      })
      nextSlots = evalRes.swappedBackSlot
        ? [...remaining, evalRes.resolvedSlot, evalRes.swappedBackSlot]
        : [...remaining, evalRes.resolvedSlot]
    } else {
      const remaining = slots.filter(
        (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== targetKey
      )
      nextSlots = [...remaining, evalRes.resolvedSlot]
    }

    applySlotsAndAutoSave(nextSlots)

    if (evalRes.status === "CONFLICT" && evalRes.reason) {
      toast.error(`Cảnh báo trùng lịch: ${evalRes.reason}`)
    }
  }

  const handleToggleLock = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditableDraft) return
    const nextSlots = slots.map((s) =>
      makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) === cellKey
        ? { ...s, isLocked: !s.isLocked }
        : s
    )
    applySlotsAndAutoSave(nextSlots)
  }

  const handleQuickClearCell = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditableDraft) return
    const target = slotByCell.get(cellKey)
    if (!target) return
    if (target.isLocked) {
      toast.error("Ô tiết đang khóa cố định. Hãy mở khóa trước khi làm trống.")
      return
    }
    const nextSlots = slots.filter(
      (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== cellKey
    )
    applySlotsAndAutoSave(nextSlots)
  }

  const openBulkApplyFromSlotOrSubject = (params: {
    subjectId: string
    subjectCode: string
    subjectName: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    weekType?: WeekTypeCode
    useHomeroomTeacher?: boolean
    defaultGrade?: string
  }) => {
    const isHomeroomLikely =
      params.useHomeroomTeacher ??
      /chào cờ|sinh hoạt|shl|hđtn|gdcđ/i.test(params.subjectName)
    const currentFilterGrade =
      data.filterContext.selectedGrade !== "ALL"
        ? data.filterContext.selectedGrade
        : params.defaultGrade || data.filterContext.availableGrades[0] || ""

    setBulkApplyModal({
      subjectId: params.subjectId,
      subjectCode: params.subjectCode,
      subjectName: params.subjectName,
      dayOfWeek: params.dayOfWeek,
      session: params.session,
      periodNumber: params.periodNumber,
      weekType: params.weekType || "ALL",
      useHomeroomTeacher: isHomeroomLikely,
      targetMode: data.filterContext.selectedGrade !== "ALL" ? "GRADE" : "ALL_SCOPE",
      targetGrade: currentFilterGrade,
      lockPlacedSlots: true,
      overwriteUnlocked: true,
      rememberInScopeConfig: true,
    })
  }

  const handleExecuteBulkApply = async () => {
    if (!bulkApplyModal || !isEditableDraft) return

    const targetClasses =
      bulkApplyModal.targetMode === "ALL_SCOPE"
        ? data.allScopeClasses
        : data.allScopeClasses.filter((c) => c.grade === bulkApplyModal.targetGrade)

    if (targetClasses.length === 0) {
      toast.error("Không có lớp học nào thuộc phạm vi áp dụng đã chọn.")
      return
    }

    const bulkRes = buildBulkScopePlacement({
      targetClasses,
      subjectId: bulkApplyModal.subjectId,
      subjectCode: bulkApplyModal.subjectCode,
      subjectName: bulkApplyModal.subjectName,
      dayOfWeek: bulkApplyModal.dayOfWeek,
      session: bulkApplyModal.session,
      periodNumber: bulkApplyModal.periodNumber,
      weekType: bulkApplyModal.weekType,
      useHomeroomTeacher: bulkApplyModal.useHomeroomTeacher,
      lockPlacedSlots: bulkApplyModal.lockPlacedSlots,
      overwriteUnlocked: bulkApplyModal.overwriteUnlocked,
      currentSlots: slots,
      quotaItems: liveQuotaItems,
      teachersById,
      campusId: data.filterContext.selectedCampusId,
      config: effectiveConfig,
      busySlots: data.busySlots,
      externalActiveSlots: data.externalActiveSlots,
      travelRules: data.travelRules,
    })

    applySlotsAndAutoSave(bulkRes.nextSlots)

    if (bulkApplyModal.rememberInScopeConfig) {
      const saveRuleRes = await saveScopeFixedSlotRuleAction({
        academicYearId: data.filterContext.selectedYearId,
        semester: data.filterContext.semester,
        campusId: data.filterContext.selectedCampusId,
        scopeGroup: activeScopeCode as ManageableScopeGroup,
        rule: {
          subjectId: bulkApplyModal.subjectId,
          subjectCode: bulkApplyModal.subjectCode,
          subjectName: bulkApplyModal.subjectName,
          dayOfWeek: bulkApplyModal.dayOfWeek,
          session: bulkApplyModal.session,
          periodNumber: bulkApplyModal.periodNumber,
          appliesToGrades:
            bulkApplyModal.targetMode === "GRADE" && bulkApplyModal.targetGrade
              ? [bulkApplyModal.targetGrade]
              : undefined,
          assignHomeroomTeacher: bulkApplyModal.useHomeroomTeacher,
          weekType: bulkApplyModal.weekType,
        },
      })
      if (saveRuleRes.success) {
        setFixedSlotsConfig(saveRuleRes.fixedSlots)
      }
    }

    const skipNotes: string[] = []
    if (bulkRes.skippedLockedCount > 0) skipNotes.push(`${bulkRes.skippedLockedCount} ô đã khóa`)
    if (bulkRes.skippedConflictCount > 0) skipNotes.push(`${bulkRes.skippedConflictCount} ô trùng GV`)

    toast.success(
      `Đã xếp "${bulkApplyModal.subjectName}" cho ${bulkRes.appliedCount}/${targetClasses.length} lớp${
        bulkApplyModal.rememberInScopeConfig ? " và ghi nhớ vào Bộ TKB" : ""
      }${skipNotes.length > 0 ? ` (bỏ qua ${skipNotes.join(", ")})` : ""}.`
    )
    setBulkApplyModal(null)
  }

  const handleRemoveRememberedFixedRule = async (ruleId: string) => {
    const res = await removeScopeFixedSlotRuleAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: activeScopeCode as ManageableScopeGroup,
      ruleId,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setFixedSlotsConfig(res.fixedSlots)
    toast.success("Đã gỡ quy tắc cố định khỏi Bộ thời khóa biểu.")
  }

  const handleCreateDraft = async () => {
    if (!draftName.trim()) {
      toast.error("Vui lòng nhập tên bản nháp / phương án.")
      return
    }
    const res = await createTimetableVersionAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: activeScopeCode as ManageableScopeGroup,
      name: draftName.trim(),
      effectiveFrom: draftEffectiveFrom || null,
      cloneFromVersionId: cloneSourceId || null,
      applyRememberedSetup: !cloneSourceId && applyRememberedOnNewDraft,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Đã tạo bản nháp "${res.version.name}".`)
    setShowCreateDraftModal(false)
    setDraftName("")
    await reloadWithPatch({ versionId: res.version.id })
  }

  const handleAutoSchedule = async () => {
    if (!data.selectedVersion || !isEditableDraft) {
      toast.error("Vui lòng chọn hoặc tạo một bản Nháp (DRAFT) để chạy chia lịch tự động.")
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (dirty || inFlightSavePromiseRef.current) {
      const flushed = await flushAutoSave()
      if (!flushed) return
    }

    setAutoRunning(true)
    const res = await runAutoScheduleDraftAction({
      versionId: data.selectedVersion.id,
      expectedRevision: revisionRef.current,
      timeLimitMs: 7000,
    })
    setAutoRunning(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    const r = res.autoScheduleResult
    setUnscheduledList(r.unscheduledActivities)
    if (r.unscheduledActivities.length > 0) {
      setShowUnscheduledPanel(true)
    }
    toast.success(
      `${r.outcomeLabel}: xếp ${r.placedCount}/${r.requiredCount} tiết mới (${r.elapsedMs} ms, giữ ${r.lockedPreservedCount} tiết khóa).`
    )
    await reloadWithPatch({ versionId: data.selectedVersion.id })
  }

  const handleDownloadExcelTemplate = async () => {
    const res = await downloadTimetableExcelTemplateAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      scopeGroup: activeScopeCode,
      campusId: data.filterContext.selectedCampusId,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    const byteChars = atob(res.base64)
    const bytes = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = res.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExcelUpload = async (file: File) => {
    if (!data.selectedVersion || !isEditableDraft) {
      toast.error("Chỉ nhập Excel vào bản Nháp (DRAFT).")
      return
    }
    const buf = await file.arrayBuffer()
    let binary = ""
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64Content = btoa(binary)

    const preview = await previewTimetableExcelImportAction({
      versionId: data.selectedVersion.id,
      base64Content,
    })
    if (!preview.success) {
      toast.error(preview.error)
      return
    }
    setExcelPreview(preview)
  }

  const activeScopeLabel =
    data.filterContext.validScopes.find((s) => s.code === activeScopeCode)?.label ||
    activeScopeCode

  const dragFocusClassId =
    activeDrag?.kind === "CELL_SLOT"
      ? activeDrag.slot.classId
      : activeDrag?.kind === "QUOTA_ACTIVITY"
      ? activeDrag.item.classId
      : null

  return (
    <TimetableShell
      title="Xếp thời khóa biểu"
      subtitle="Kéo thả trực quan theo Bộ thời khóa biểu, báo trùng tức thì, áp dụng nhanh cả khối - tự động lưu và ghi nhớ cách thiết lập"
      activeTabCode="SCHEDULE"
      hasUnsavedChanges={dirty}
      headerActions={
        <>
          {/* Live Auto-Save Status Pill */}
          {isEditableDraft && (
            <button
              type="button"
              onClick={() => {
                if (dirty || autoSaveStatus === "ERROR") void flushAutoSave()
              }}
              title={autoSaveError || "Mọi thao tác kéo thả đều được tự động lưu vào bản nháp"}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                autoSaveStatus === "ERROR"
                  ? "bg-rose-50 border-rose-200 text-[#E11D48]"
                  : autoSaveStatus === "SAVING" || autoSaveStatus === "PENDING"
                  ? "bg-amber-50 border-amber-200 text-[#D97706]"
                  : "bg-emerald-50 border-emerald-200 text-[#059669]"
              }`}
            >
              {autoSaveStatus === "ERROR"
                ? "Lỗi lưu tự động — Nhấn thử lại"
                : autoSaveStatus === "SAVING" || autoSaveStatus === "PENDING"
                ? "Đang tự động lưu..."
                : `Đã tự động lưu • Rev #${revision}`}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateDraftModal(true)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
          >
            Tạo phương án nháp
          </button>

          {isEditableDraft && (
            <>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
              >
                Tải mẫu Excel
              </button>

              <label className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer">
                Nhập Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleExcelUpload(f)
                    e.currentTarget.value = ""
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleAutoSchedule}
                disabled={autoRunning}
                className="px-3.5 py-2 rounded-xl bg-[#00A19A] text-white text-xs font-semibold hover:bg-[#008B85] disabled:opacity-50 cursor-pointer"
              >
                {autoRunning ? "Đang chia lịch..." : "Chia lịch tự động"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmVersionCode("")
                  setShowClearDraftModal(true)
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold hover:bg-rose-100 cursor-pointer"
              >
                Xóa dữ liệu bản nháp
              </button>
            </>
          )}

          {data.selectedVersion && (
            <button
              type="button"
              onClick={async () => {
                const res = await compareVersionWithBaselineAction({
                  versionId: data.selectedVersion!.id,
                })
                if (!res.success) {
                  toast.error(res.error)
                  return
                }
                setDiffResult({ baselineName: res.baselineName, diffs: res.diffs })
              }}
              className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
            >
              So sánh với lịch nền
            </button>
          )}
        </>
      }
    >
      <TimetableFilterBar
        context={data.filterContext}
        onChange={reloadWithPatch}
        hasUnsavedChanges={dirty && autoSaveStatus === "ERROR"}
        loading={loading}
        extraSlot={
          <div className="flex flex-wrap items-center gap-2">
            {isEditableDraft && (
              <button
                type="button"
                onClick={() => setPaletteOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  paletteOpen
                    ? "bg-[#003B3A] border-[#003B3A] text-white"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-700 hover:border-[#00A19A]"
                }`}
              >
                {paletteOpen ? (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                )}
                <span>Khay kéo thả Bộ TKB</span>
              </button>
            )}

            {isEditableDraft && (
              <label
                title="Khi bật, mọi ô tiết do thầy/cô tự kéo thả sẽ được tự động khóa cố định để khi chạy Chia lịch tự động hệ thống giữ nguyên không xáo trộn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={autoLockManual}
                  onChange={(e) => setAutoLockManual(e.target.checked)}
                  className="accent-[#003B3A]"
                />
                <span>Tự khóa tiết kéo thả</span>
              </label>
            )}

            <button
              type="button"
              onClick={() => setShowUnscheduledPanel((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:border-[#00A19A] tabular-nums cursor-pointer"
            >
              Hoạt động chưa xếp ({pendingQuotaActivities.length})
            </button>
          </div>
        }
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {data.selectedVersion?.reviewComment && (
        <div className="bg-amber-50 border border-amber-200 text-[#D97706] rounded-2xl px-4 py-3 text-xs">
          <strong>Ý kiến phản hồi xét duyệt:</strong> {data.selectedVersion.reviewComment}
        </div>
      )}

      {!data.selectedVersion ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[#003B3A]">
            Phạm vi này chưa có bản nháp hoặc phiên bản thời khóa biểu
          </p>
          <p className="text-xs text-slate-600">
            Khởi tạo một bản nháp mới (tự động kế thừa {fixedSlotsConfig.length} quy tắc cố định đã ghi nhớ của Bộ TKB{" "}
            <strong>{activeScopeLabel}</strong>) để bắt đầu xếp lịch cho{" "}
            {data.allScopeClasses.length} lớp học.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateDraftModal(true)}
            className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
          >
            Tạo phương án nháp đầu tiên
          </button>
        </div>
      ) : (
        <>
          {data.selectedVersion.status !== "DRAFT" && (
            <div className="bg-[#F0FDFA] border border-teal-200 text-[#003B3A] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                Phiên bản <strong>{data.selectedVersion.name}</strong> đang ở trạng thái{" "}
                <strong>
                  {VERSION_STATUS_BADGE[data.selectedVersion.status]?.label ||
                    data.selectedVersion.status}
                </strong>{" "}
                (chế độ chỉ xem để bảo toàn lịch sử). Để chỉnh sửa, hãy tạo bản nháp mới sao chép từ phiên bản này.
              </span>
              <button
                type="button"
                onClick={() => {
                  setCloneSourceId(data.selectedVersion!.id)
                  setDraftName(`${data.selectedVersion!.name} (Bản điều chỉnh)`)
                  setShowCreateDraftModal(true)
                }}
                className="px-3 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Tạo phiên bản nháp từ lịch này
              </button>
            </div>
          )}

          {/* Live 10-Rule Validation Summary */}
          <ValidationSummaryPanel report={liveValidationReport} />

          {/* Unscheduled Activities Detail Table */}
          {showUnscheduledPanel && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#003B3A]">
                  Hoạt động chưa xếp đủ tiết và nguyên nhân chi tiết
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUnscheduledPanel(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn học</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                      Giáo viên
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] text-right">
                      Số tiết thiếu
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                      Nguyên nhân chưa xếp được
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {unscheduledList.map((u, idx) => (
                    <tr key={`U_${idx}`} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{u.className}</td>
                      <td className="py-2.5 px-3 text-slate-800">{u.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.teacherName ? `${u.teacherName} (${u.teacherCode})` : "Chưa gán"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#E11D48]">
                        {u.missingPeriods}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{u.reasonDetail}</td>
                    </tr>
                  ))}
                  {unscheduledList.length === 0 &&
                    pendingQuotaActivities.map((q, idx) => (
                      <tr key={`Q_${idx}`} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{q.className}</td>
                        <td className="py-2.5 px-3 text-slate-800">{q.subjectName}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {q.primaryTeacherName
                            ? `${q.primaryTeacherName} (${q.primaryTeacherCode})`
                            : "Chưa gán"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#D97706]">
                          {q.missingWeeklyPeriods}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {q.status === "MISSING_TEACHER"
                            ? "Chưa có phân công giáo viên cho môn học này"
                            : "Kéo thả từ Khay Bộ TKB bên trái vào ô tiết trên ma trận"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diff Comparison Panel */}
          {diffResult && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#003B3A] tabular-nums">
                  Đối chiếu thay đổi với lịch nền:{" "}
                  {diffResult.baselineName || "Chưa có lịch nền đã ban hành"} (
                  {diffResult.diffs.length} ô thay đổi)
                </h3>
                <button
                  type="button"
                  onClick={() => setDiffResult(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Ô tiết</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">Loại</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                      Lịch nền (Trước)
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                      Phương án hiện tại (Sau)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {diffResult.diffs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-center text-slate-500">
                        Không có sự khác biệt nào so với lịch nền.
                      </td>
                    </tr>
                  ) : (
                    diffResult.diffs.slice(0, 80).map((d) => (
                      <tr key={d.cellKey} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{d.className}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {SHORT_DAY_LABELS[d.dayOfWeek]} •{" "}
                          {d.session === "MORNING" ? "Sáng" : "Chiều"} T{d.periodNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-[#00736E] border border-teal-200">
                            {d.changeType === "ADDED"
                              ? "Thêm mới"
                              : d.changeType === "REMOVED"
                              ? "Xóa tiết"
                              : "Đổi nội dung"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{d.beforeSummary}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {d.afterSummary}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Excel Preview Panel */}
          {excelPreview && (
            <div className="bg-white rounded-2xl border-2 border-[#00A19A] p-4 shadow-sm space-y-3 tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    Kết quả đối chiếu mã file Excel trước khi ghi
                  </h3>
                  <p className="text-xs text-slate-600">
                    Khớp hợp lệ:{" "}
                    <strong className="text-[#059669]">{excelPreview.parsed.matchedCount}</strong>{" "}
                    dòng • Lỗi mã không khớp:{" "}
                    <strong className="text-[#E11D48]">{excelPreview.parsed.errorCount}</strong>{" "}
                    dòng
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExcelPreview(null)}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={
                      excelPreview.parsed.matchedCount === 0 || excelPreview.parsed.errorCount > 0
                    }
                    onClick={async () => {
                      if (!data.selectedVersion) return
                      const res = await saveDraftSlotsBatchAction({
                        versionId: data.selectedVersion.id,
                        expectedRevision: revisionRef.current,
                        scopedClassIds: Array.from(
                          new Set(excelPreview.parsed.matchedSlots.map((s) => s.classId))
                        ),
                        slots: excelPreview.parsed.matchedSlots,
                      })
                      if (!res.success) {
                        toast.error(res.error)
                        return
                      }
                      revisionRef.current = res.newRevision
                      setRevision(res.newRevision)
                      toast.success(`Đã ghi ${res.savedCount} tiết từ Excel vào bản nháp.`)
                      setExcelPreview(null)
                      await reloadWithPatch({})
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Xác nhận ghi vào bản nháp
                  </button>
                </div>
              </div>

              {excelPreview.parsed.errorCount > 0 && (
                <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-xl p-3 bg-rose-50/40 text-xs text-[#E11D48] space-y-1">
                  {excelPreview.parsed.diagnostics
                    .filter((d) => d.status === "ERROR")
                    .map((d, i) => (
                      <div key={i}>
                        Dòng {d.rowNumber} ({d.className} - {d.dayLabel} {d.periodLabel}):{" "}
                        {d.errorMessage}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* MAIN WORKSPACE: DOCKABLE DRAG-DROP PALETTE + STICKY MATRIX */}
          <div className="flex flex-col lg:flex-row items-start gap-3">
            {/* LEFT DRAG & DROP DOCK PER BỘ THỜI KHÓA BIỂU */}
            {isEditableDraft && paletteOpen && (
              <aside className="w-full lg:w-[310px] shrink-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden lg:sticky lg:top-4">
                <div className="bg-[#003B3A] px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Khay kéo thả • Bộ {activeScopeLabel}
                    </div>
                    <div className="text-[11px] text-teal-100">
                      Kéo thẻ thả vào ô tiết (tự động lưu & báo trùng)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(false)}
                    title="Thu gọn khay kéo thả"
                    className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Segmented Tabs */}
                <div className="p-2 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaletteTab("UNSCHEDULED")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors tabular-nums cursor-pointer ${
                      paletteTab === "UNSCHEDULED"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Chưa xếp ({pendingQuotaActivities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteTab("BY_CLASS")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      paletteTab === "BY_CLASS"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Theo lớp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteTab("SCOPE_SUBJECTS")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      paletteTab === "SCOPE_SUBJECTS"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Môn Bộ TKB
                  </button>
                </div>

                {/* Controls inside Palette */}
                <div className="p-2.5 border-b border-[#F1F5F9] space-y-2 text-xs">
                  {paletteTab === "BY_CLASS" && (
                    <select
                      value={focusedClassId}
                      onChange={(e) => setFocusedClassId(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] focus:outline-none tabular-nums"
                    >
                      {displayedClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.className} (Khối {c.grade})
                        </option>
                      ))}
                    </select>
                  )}

                  {paletteTab === "SCOPE_SUBJECTS" && (
                    <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[11px] font-medium text-[#003B3A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopeUseHomeroom}
                        onChange={(e) => setScopeUseHomeroom(e.target.checked)}
                        className="accent-[#003B3A]"
                      />
                      <span>Tự gán GV chủ nhiệm (HĐTN / SHL)</span>
                    </label>
                  )}

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={paletteSearch}
                        onChange={(e) => setPaletteSearch(e.target.value)}
                        placeholder={
                          paletteTab === "SCOPE_SUBJECTS"
                            ? "Tìm môn học..."
                            : "Tìm lớp, môn, GV..."
                        }
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-[#E2E8F0] text-xs focus:border-[#00A19A] focus:outline-none"
                      />
                    </div>
                    <select
                      value={paletteWeekType}
                      onChange={(e) => setPaletteWeekType(e.target.value as WeekTypeCode)}
                      title="Chu kỳ tuần áp dụng khi kéo thả"
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:border-[#00A19A] focus:outline-none"
                    >
                      <option value="ALL">Cả tuần</option>
                      <option value="ODD">Tuần lẻ</option>
                      <option value="EVEN">Tuần chẵn</option>
                    </select>
                  </div>
                </div>

                {/* Draggable Card List */}
                <div className="max-h-[56vh] overflow-y-auto p-2.5 space-y-2">
                  {paletteTab === "UNSCHEDULED" && (
                    <>
                      {filteredPaletteUnscheduled.length === 0 ? (
                        <div className="py-8 px-3 text-center text-xs text-slate-500 space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-[#059669] mx-auto" />
                          <p className="font-semibold text-slate-700">
                            Đã xếp đủ định mức các môn hiển thị
                          </p>
                        </div>
                      ) : (
                        filteredPaletteUnscheduled.map((q) => {
                          const effectiveWt: WeekTypeCode =
                            paletteWeekType !== "ALL"
                              ? paletteWeekType
                              : q.missingWeeklyPeriods === 0.5
                              ? "ODD"
                              : "ALL"
                          const missingTeacher = !q.primaryTeacherId

                          return (
                            <div
                              key={`${q.classId}::${q.subjectId}`}
                              draggable={!missingTeacher}
                              onClick={() => setFocusedClassId(q.classId)}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "copyMove"
                                setFocusedClassId(q.classId)
                                setActiveDrag({
                                  kind: "QUOTA_ACTIVITY",
                                  item: q,
                                  weekType: effectiveWt,
                                })
                              }}
                              onDragEnd={() => {
                                setActiveDrag(null)
                                setHoveredCellKey(null)
                              }}
                              className={`p-2.5 rounded-xl border transition-colors tabular-nums ${
                                missingTeacher
                                  ? "bg-rose-50/40 border-rose-200 cursor-not-allowed"
                                  : "bg-white border-[#E2E8F0] hover:border-[#00A19A] hover:bg-[#F0FDFA]/40 cursor-grab active:cursor-grabbing"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-xs font-semibold text-slate-900 truncate">
                                    {q.subjectName}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded-md bg-[#003B3A] text-white text-[10px] font-semibold shrink-0">
                                  {q.className}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                                <span
                                  className={`truncate ${
                                    missingTeacher
                                      ? "text-[#E11D48] font-medium"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {q.primaryTeacherName
                                    ? `${q.primaryTeacherName}${
                                        q.primaryTeacherCode ? ` (${q.primaryTeacherCode})` : ""
                                      }`
                                    : "Chưa phân công GV"}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-[#D97706] border border-amber-200 text-[10px] font-semibold shrink-0">
                                  Thiếu {q.missingWeeklyPeriods}/{q.weeklyQuota}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </>
                  )}

                  {paletteTab === "BY_CLASS" && (
                    <>
                      {byClassQuotaItems.length === 0 ? (
                        <div className="py-6 px-3 text-center text-xs text-slate-500">
                          Chưa có định mức môn học cho lớp đang chọn.
                        </div>
                      ) : (
                        byClassQuotaItems.map((q) => {
                          const isComplete =
                            q.missingWeeklyPeriods === 0 && q.overScheduledWeeklyPeriods === 0
                          const effectiveWt: WeekTypeCode =
                            paletteWeekType !== "ALL"
                              ? paletteWeekType
                              : q.missingWeeklyPeriods === 0.5
                              ? "ODD"
                              : "ALL"

                          return (
                            <div
                              key={`${q.classId}::${q.subjectId}`}
                              draggable={Boolean(q.primaryTeacherId)}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "copyMove"
                                setActiveDrag({
                                  kind: "QUOTA_ACTIVITY",
                                  item: q,
                                  weekType: effectiveWt,
                                })
                              }}
                              onDragEnd={() => {
                                setActiveDrag(null)
                                setHoveredCellKey(null)
                              }}
                              className={`p-2.5 rounded-xl border transition-colors tabular-nums ${
                                !q.primaryTeacherId
                                  ? "bg-rose-50/40 border-rose-200 cursor-not-allowed"
                                  : isComplete
                                  ? "bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#00A19A] cursor-grab"
                                  : "bg-white border-[#E2E8F0] hover:border-[#00A19A] hover:bg-[#F0FDFA]/40 cursor-grab active:cursor-grabbing"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {q.subjectName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                                    isComplete
                                      ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                                      : q.overScheduledWeeklyPeriods > 0
                                      ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                                      : "bg-amber-50 text-[#D97706] border border-amber-200"
                                  }`}
                                >
                                  {q.scheduledWeeklyEquivalent}/{q.weeklyQuota} tiết
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600 truncate">
                                {q.primaryTeacherName
                                  ? `${q.primaryTeacherName}${
                                      q.primaryTeacherCode ? ` (${q.primaryTeacherCode})` : ""
                                    }`
                                  : "Chưa phân công GV"}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </>
                  )}

                  {paletteTab === "SCOPE_SUBJECTS" && (
                    <>
                      <div className="px-2 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-slate-600 leading-relaxed">
                        Kéo môn thả vào <strong>1 ô lớp</strong> hoặc thả thẳng vào cột{" "}
                        <strong>Thứ / Buổi / Tiết</strong> để xếp đồng loạt cả Khối / Bộ TKB và ghi nhớ quy tắc cố định.
                      </div>

                      {filteredScopeSubjects.map((sub) => {
                        const autoHr =
                          scopeUseHomeroom ||
                          /chào cờ|sinh hoạt|shl|hđtn|gdcđ/i.test(sub.subjectName)
                        return (
                          <div
                            key={sub.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "copy"
                              setActiveDrag({
                                kind: "SCOPE_SUBJECT",
                                subjectId: sub.id,
                                subjectCode: sub.subjectCode,
                                subjectName: sub.subjectName,
                                useHomeroomTeacher: autoHr,
                                weekType: paletteWeekType,
                              })
                            }}
                            onDragEnd={() => {
                              setActiveDrag(null)
                              setHoveredCellKey(null)
                              setHoveredRowKey(null)
                            }}
                            className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#00A19A] hover:bg-[#F0FDFA]/40 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {sub.subjectName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {autoHr ? "Gán GV chủ nhiệm từng lớp" : "Gán GV phân công từng lớp"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openBulkApplyFromSlotOrSubject({
                                  subjectId: sub.id,
                                  subjectCode: sub.subjectCode,
                                  subjectName: sub.subjectName,
                                  dayOfWeek: "MONDAY",
                                  session: "MORNING",
                                  periodNumber: 1,
                                  weekType: paletteWeekType,
                                  useHomeroomTeacher: autoHr,
                                })
                              }
                              title="Áp dụng đồng loạt cho cả Khối / Bộ TKB & ghi nhớ"
                              className="px-2 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[10px] font-semibold hover:bg-[#00A19A] hover:text-white shrink-0 cursor-pointer"
                            >
                              Cả bộ
                            </button>
                          </div>
                        )
                      })}

                      {/* Remembered Fixed Rules of this Bộ TKB */}
                      {fixedSlotsConfig.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-[#E2E8F0] space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#003B3A]">
                            <BookmarkCheck className="w-3.5 h-3.5 text-[#00A19A]" />
                            <span>Đã ghi nhớ cho Bộ {activeScopeLabel} ({fixedSlotsConfig.length})</span>
                          </div>
                          {fixedSlotsConfig.map((fx) => (
                            <div
                              key={fx.id}
                              className="px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2 text-[11px]"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 truncate">
                                  {fx.subjectName}
                                </div>
                                <div className="text-[10px] text-slate-500 tabular-nums">
                                  {SHORT_DAY_LABELS[fx.dayOfWeek]} •{" "}
                                  {fx.session === "MORNING" ? "Sáng" : "Chiều"} T{fx.periodNumber}
                                  {fx.appliesToGrades?.length
                                    ? ` • Khối ${fx.appliesToGrades.join(",")}`
                                    : " • Toàn bộ TKB"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRememberedFixedRule(fx.id)}
                                title="Xóa quy tắc đã ghi nhớ này"
                                className="p-1 text-slate-400 hover:text-[#E11D48] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </aside>
            )}

            {/* FULL-SPACE STICKY SCHEDULING MATRIX */}
            <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="overflow-auto max-h-[74vh]">
                <table className="w-full text-left border-collapse tabular-nums">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                      <th className="sticky left-0 z-30 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap border-r border-white/10 min-w-[125px]">
                        Thứ / Buổi / Tiết
                      </th>
                      {displayedClasses.map((cls) => {
                        const isTargetCol = dragFocusClassId === cls.id
                        const isSelectedCol = focusedClassId === cls.id
                        return (
                          <th
                            key={cls.id}
                            onClick={() => {
                              setFocusedClassId(cls.id)
                              if (paletteOpen && paletteTab === "UNSCHEDULED") {
                                // keeps class focused for quick inspection
                              }
                            }}
                            className={`py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap border-r border-white/10 min-w-[162px] transition-colors cursor-pointer ${
                              isTargetCol
                                ? "bg-[#00736E]"
                                : isSelectedCol
                                ? "bg-[#005250]"
                                : "hover:bg-[#004A48]"
                            } ${
                              dragFocusClassId && !isTargetCol ? "opacity-55" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span>Lớp {cls.className}</span>
                              {isTargetCol && (
                                <span className="px-1.5 py-0.2 rounded bg-[#5EEAD4]/20 text-[#5EEAD4] text-[10px]">
                                  Đích thả
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-normal text-teal-100">
                              Khối {cls.grade} • {cls.educationSystem || "Chuẩn"}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                    {periodRows.map((pr, rowIdx) => {
                      const prev = periodRows[rowIdx - 1]
                      const isNewDay = !prev || prev.dayOfWeek !== pr.dayOfWeek
                      const isAfternoonStart =
                        pr.session === "AFTERNOON" && pr.periodNumber === 1
                      const rKey = `${pr.dayOfWeek}::${pr.session}::${pr.periodNumber}`
                      const canDropRowScope =
                        isEditableDraft && activeDrag?.kind === "SCOPE_SUBJECT"
                      const isRowHovered = canDropRowScope && hoveredRowKey === rKey

                      return (
                        <tr
                          key={rKey}
                          className={`${isNewDay ? "border-t-2 border-t-[#003B3A]/25" : ""} ${
                            isAfternoonStart ? "border-t border-t-slate-300" : ""
                          } ${isRowHovered ? "bg-[#F0FDFA]" : ""}`}
                        >
                          {/* Row Header (supports dropping SCOPE_SUBJECT to apply across entire row/scope!) */}
                          <td
                            onDragOver={(e) => {
                              if (canDropRowScope) {
                                e.preventDefault()
                                setHoveredRowKey(rKey)
                              }
                            }}
                            onDragLeave={() => {
                              if (hoveredRowKey === rKey) setHoveredRowKey(null)
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              setHoveredRowKey(null)
                              if (activeDrag?.kind === "SCOPE_SUBJECT") {
                                openBulkApplyFromSlotOrSubject({
                                  subjectId: activeDrag.subjectId,
                                  subjectCode: activeDrag.subjectCode,
                                  subjectName: activeDrag.subjectName,
                                  dayOfWeek: pr.dayOfWeek,
                                  session: pr.session,
                                  periodNumber: pr.periodNumber,
                                  weekType: activeDrag.weekType,
                                  useHomeroomTeacher: activeDrag.useHomeroomTeacher,
                                })
                                setActiveDrag(null)
                              }
                            }}
                            className={`sticky left-0 z-10 py-2 px-3 align-middle border-r border-[#E2E8F0] whitespace-nowrap transition-colors ${
                              isRowHovered
                                ? "bg-[#CCFBF1] ring-2 ring-inset ring-[#00A19A]"
                                : canDropRowScope
                                ? "bg-[#F0FDFA]/80"
                                : "bg-[#F8FAFC]"
                            }`}
                          >
                            <div className="font-bold text-[#003B3A] text-[11px]">
                              {SHORT_DAY_LABELS[pr.dayOfWeek]}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {pr.session === "MORNING" ? "Sáng" : "Chiều"} • Tiết{" "}
                              {pr.periodNumber}
                            </div>
                            {canDropRowScope && (
                              <div className="text-[10px] font-semibold text-[#00736E] mt-0.5">
                                Thả: Xếp cả dãy
                              </div>
                            )}
                          </td>

                          {displayedClasses.map((cls) => {
                            const cKey = makeSlotCellKey(
                              cls.id,
                              pr.dayOfWeek,
                              pr.session,
                              pr.periodNumber
                            )
                            const slot = slotByCell.get(cKey) || null
                            const cellIssues = cellIssuesMap.get(cKey) || []
                            const dropEval = dropEvalByCell.get(cKey) || null
                            const isHovered = hoveredCellKey === cKey
                            const isDimmedCol =
                              Boolean(dragFocusClassId) && dragFocusClassId !== cls.id

                            let dragHighlightClass = ""
                            if (activeDrag && dropEval) {
                              if (
                                dropEval.status === "VALID" ||
                                dropEval.status === "SWAP_VALID"
                              ) {
                                dragHighlightClass = isHovered
                                  ? "bg-[#CCFBF1]/70 ring-2 ring-inset ring-[#00A19A]"
                                  : "bg-[#F0FDFA]/55 ring-1 ring-inset ring-[#00A19A]/40"
                              } else if (
                                dropEval.status === "CONFLICT" ||
                                dropEval.status === "BLOCKED"
                              ) {
                                dragHighlightClass = isHovered
                                  ? "bg-rose-100/80 ring-2 ring-inset ring-[#E11D48]"
                                  : "bg-rose-50/60 ring-1 ring-inset ring-rose-200"
                              }
                            }

                            return (
                              <td
                                key={cKey}
                                draggable={Boolean(isEditableDraft && slot && !slot.isLocked)}
                                onDragStart={(e) => {
                                  if (!slot || slot.isLocked) return
                                  e.dataTransfer.effectAllowed = "move"
                                  setFocusedClassId(cls.id)
                                  setActiveDrag({
                                    kind: "CELL_SLOT",
                                    sourceCellKey: cKey,
                                    slot,
                                  })
                                }}
                                onDragEnd={() => {
                                  setActiveDrag(null)
                                  setHoveredCellKey(null)
                                }}
                                onDragOver={(e) => {
                                  if (!isEditableDraft || !activeDrag) return
                                  if (dropEval?.status === "OUT_OF_COLUMN") return
                                  e.preventDefault()
                                  if (hoveredCellKey !== cKey) setHoveredCellKey(cKey)
                                }}
                                onDragLeave={() => {
                                  if (hoveredCellKey === cKey) setHoveredCellKey(null)
                                }}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  handleDropOnCell(
                                    cls,
                                    pr.dayOfWeek,
                                    pr.session,
                                    pr.periodNumber
                                  )
                                }}
                                onClick={() => {
                                  if (!isEditableDraft) return
                                  setFocusedClassId(cls.id)
                                  setEditingCell({
                                    classId: cls.id,
                                    className: cls.className,
                                    grade: cls.grade,
                                    level: cls.level,
                                    dayOfWeek: pr.dayOfWeek,
                                    session: pr.session,
                                    periodNumber: pr.periodNumber,
                                    slot,
                                  })
                                }}
                                title={
                                  cellIssues.length > 0
                                    ? cellIssues.map((i) => i.message).join("\n")
                                    : dropEval?.reason || undefined
                                }
                                className={`group py-2 px-2.5 align-top border-r border-[#F1F5F9] transition-colors ${
                                  isEditableDraft ? "cursor-pointer hover:bg-[#F0FDFA]/60" : ""
                                } ${slot?.isLocked && !dragHighlightClass ? "bg-slate-50/90" : ""} ${
                                  cellIssues.length > 0 && !dragHighlightClass
                                    ? "bg-rose-50/45 border-l-2 border-l-[#E11D48]"
                                    : ""
                                } ${isDimmedCol ? "opacity-45" : ""} ${dragHighlightClass}`}
                              >
                                {slot && (slot.subjectName || slot.subjectId) ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="font-semibold text-slate-900 leading-tight">
                                        {slot.subjectName}
                                      </span>

                                      {isEditableDraft && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {slot.subjectId && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openBulkApplyFromSlotOrSubject({
                                                  subjectId: slot.subjectId!,
                                                  subjectCode: slot.subjectCode || "",
                                                  subjectName: slot.subjectName || "",
                                                  dayOfWeek: pr.dayOfWeek,
                                                  session: pr.session,
                                                  periodNumber: pr.periodNumber,
                                                  weekType:
                                                    (slot.weekType as WeekTypeCode) || "ALL",
                                                  defaultGrade: cls.grade,
                                                })
                                              }}
                                              title="Áp dụng tiết này cho cả Khối / Bộ TKB & ghi nhớ"
                                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#00A19A] p-0.5 transition-opacity cursor-pointer"
                                            >
                                              <CopyCheck className="w-3 h-3" />
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleLock(cKey, e)}
                                            title={
                                              slot.isLocked
                                                ? "Mở khóa tiết"
                                                : "Khóa cố định tiết"
                                            }
                                            className="text-slate-400 hover:text-[#003B3A] p-0.5 cursor-pointer"
                                          >
                                            {slot.isLocked ? (
                                              <Lock className="w-3 h-3 text-[#003B3A]" />
                                            ) : (
                                              <Unlock className="w-3 h-3 opacity-35 group-hover:opacity-100" />
                                            )}
                                          </button>

                                          {!slot.isLocked && (
                                            <button
                                              type="button"
                                              onClick={(e) => handleQuickClearCell(cKey, e)}
                                              title="Làm trống nhanh ô tiết"
                                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#E11D48] p-0.5 transition-opacity cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-[11px] text-slate-600 truncate">
                                      {slot.teacherName
                                        ? `${slot.teacherName}${
                                            slot.teacherCode ? ` (${slot.teacherCode})` : ""
                                          }`
                                        : "Chưa gán GV"}
                                    </div>

                                    {(slot.coTeacherName || slot.assistantTeacherName) && (
                                      <div className="text-[10px] text-[#00736E] truncate">
                                        + {slot.coTeacherName || slot.assistantTeacherName}
                                      </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                      {slot.roomName && (
                                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                          {slot.roomCode || slot.roomName}
                                        </span>
                                      )}
                                      {slot.weekType && slot.weekType !== "ALL" && (
                                        <span className="px-1.5 py-0.2 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-semibold">
                                          {slot.weekType === "ODD" ? "Tuần lẻ" : "Tuần chẵn"}
                                        </span>
                                      )}
                                      {cellIssues.length > 0 && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-[#E11D48] text-[10px] font-semibold">
                                          Trùng lịch
                                        </span>
                                      )}
                                    </div>

                                    {slot.altSubjectName && (
                                      <div className="pt-1 mt-1 border-t border-dashed border-slate-200 text-[10px] text-slate-600">
                                        Luân phiên: <strong>{slot.altSubjectName}</strong>
                                      </div>
                                    )}

                                    {activeDrag && dropEval?.reason && (
                                      <div
                                        className={`mt-1 text-[10px] font-semibold leading-tight ${
                                          dropEval.status === "CONFLICT" ||
                                          dropEval.status === "BLOCKED"
                                            ? "text-[#E11D48]"
                                            : "text-[#00736E]"
                                        }`}
                                      >
                                        {dropEval.reason}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="min-h-[40px] flex flex-col items-center justify-center text-center">
                                    {activeDrag && dropEval && dropEval.status !== "OUT_OF_COLUMN" ? (
                                      <span
                                        className={`text-[10px] font-semibold leading-tight px-1 ${
                                          dropEval.status === "VALID"
                                            ? "text-[#059669]"
                                            : "text-[#E11D48]"
                                        }`}
                                      >
                                        {dropEval.status === "VALID"
                                          ? isHovered
                                            ? "Thả để xếp tiết"
                                            : "Ô hợp lệ"
                                          : dropEval.reason || "Không hợp lệ"}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-300">—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Scope / Grade Apply & Remember Modal */}
      {bulkApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 space-y-4 shadow-lg text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#003B3A]">
                Áp dụng nhanh & ghi nhớ thiết lập Bộ {activeScopeLabel}
              </h3>
              <p className="text-slate-600 mt-0.5">
                Môn học: <strong className="text-slate-900">{bulkApplyModal.subjectName}</strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thứ</label>
                <select
                  value={bulkApplyModal.dayOfWeek}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      dayOfWeek: e.target.value as DayOfWeekCode,
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2"
                >
                  {(effectiveConfig.workingDays || []).map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buổi</label>
                <select
                  value={bulkApplyModal.session}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      session: e.target.value as SessionCode,
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2"
                >
                  <option value="MORNING">Buổi sáng</option>
                  <option value="AFTERNOON">Buổi chiều</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiết</label>
                <select
                  value={bulkApplyModal.periodNumber}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      periodNumber: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 tabular-nums"
                >
                  {Array.from(
                    {
                      length:
                        bulkApplyModal.session === "MORNING"
                          ? effectiveConfig.morningPeriods || 4
                          : effectiveConfig.afternoonPeriods || 4,
                    },
                    (_, i) => i + 1
                  ).map((p) => (
                    <option key={p} value={p}>
                      Tiết {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">Phạm vi lớp áp dụng</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setBulkApplyModal({ ...bulkApplyModal, targetMode: "ALL_SCOPE" })
                  }
                  className={`py-2 px-3 rounded-xl border font-semibold text-left cursor-pointer ${
                    bulkApplyModal.targetMode === "ALL_SCOPE"
                      ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                      : "border-[#E2E8F0] text-slate-600"
                  }`}
                >
                  Toàn Bộ {activeScopeLabel} ({data.allScopeClasses.length} lớp)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBulkApplyModal({ ...bulkApplyModal, targetMode: "GRADE" })
                  }
                  className={`py-2 px-3 rounded-xl border font-semibold text-left cursor-pointer ${
                    bulkApplyModal.targetMode === "GRADE"
                      ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                      : "border-[#E2E8F0] text-slate-600"
                  }`}
                >
                  Theo từng Khối lớp
                </button>
              </div>

              {bulkApplyModal.targetMode === "GRADE" && (
                <select
                  value={bulkApplyModal.targetGrade}
                  onChange={(e) =>
                    setBulkApplyModal({ ...bulkApplyModal, targetGrade: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                >
                  {data.filterContext.availableGrades.map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2 pt-1 border-t border-[#F1F5F9]">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkApplyModal.useHomeroomTeacher}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      useHomeroomTeacher: e.target.checked,
                    })
                  }
                  className="accent-[#003B3A]"
                />
                <span>Gán Giáo viên chủ nhiệm của từng lớp (thay vì GV bộ môn)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkApplyModal.lockPlacedSlots}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      lockPlacedSlots: e.target.checked,
                    })
                  }
                  className="accent-[#003B3A]"
                />
                <span>Khóa cố định các ô tiết này để giữ nguyên khi Chia lịch tự động</span>
              </label>

              <label className="flex items-center gap-2 text-[#003B3A] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkApplyModal.rememberInScopeConfig}
                  onChange={(e) =>
                    setBulkApplyModal({
                      ...bulkApplyModal,
                      rememberInScopeConfig: e.target.checked,
                    })
                  }
                  className="accent-[#00A19A]"
                />
                <span>
                  Ghi nhớ thành quy tắc cố định của Bộ {activeScopeLabel} cho các phương án sau
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkApplyModal(null)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkApply}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-semibold cursor-pointer"
              >
                Áp dụng & lưu ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cell Editor Modal */}
      {editingCell && (
        <CellEditorModal
          cell={editingCell}
          subjects={data.subjects}
          teachers={data.teachers}
          rooms={data.rooms}
          classQuotas={liveQuotaItems.filter((q) => q.classId === editingCell.classId)}
          autoLockDefault={autoLockManual}
          onClose={() => setEditingCell(null)}
          onSave={(updated) => {
            const cKey = makeSlotCellKey(
              editingCell.classId,
              editingCell.dayOfWeek,
              editingCell.session,
              editingCell.periodNumber
            )
            const filtered = slots.filter(
              (s) =>
                makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== cKey
            )
            const nextSlots = updated ? [...filtered, updated] : filtered
            applySlotsAndAutoSave(nextSlots)
            setEditingCell(null)
          }}
        />
      )}

      {/* Create Draft Modal */}
      {showCreateDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-[#003B3A]">Khởi tạo phương án / bản nháp mới</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên bản nháp / phương án
                </label>
                <input
                  type="text"
                  placeholder="VD: TKB Học kỳ 1 - Đợt 1"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sao chép dữ liệu nền từ phiên bản (tùy chọn)
                </label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Bản nháp mới --</option>
                  {data.filterContext.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
              </div>

              {!cloneSourceId && fixedSlotsConfig.length > 0 && (
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#003B3A] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRememberedOnNewDraft}
                    onChange={(e) => setApplyRememberedOnNewDraft(e.target.checked)}
                    className="accent-[#003B3A]"
                  />
                  <span>
                    Áp dụng sẵn {fixedSlotsConfig.length} quy tắc tiết cố định đã ghi nhớ của Bộ{" "}
                    {activeScopeLabel}
                  </span>
                </label>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày dự kiến áp dụng
                </label>
                <input
                  type="date"
                  value={draftEffectiveFrom}
                  onChange={(e) => setDraftEffectiveFrom(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateDraftModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCreateDraft}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Khởi tạo bản nháp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Clear Draft Modal */}
      {showClearDraftModal && data.selectedVersion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-[#E11D48]">
              Xác nhận xóa dữ liệu bản nháp (Không ảnh hưởng lịch đã ban hành)
            </h3>
            <p className="text-xs text-slate-600">
              Thao tác này chỉ xóa các tiết trên bản nháp{" "}
              <strong className="text-slate-900">{data.selectedVersion.name}</strong>. Vui lòng nhập chính xác mã phiên bản{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-900">
                {data.selectedVersion.code}
              </code>{" "}
              để xác nhận:
            </p>
            <input
              type="text"
              value={confirmVersionCode}
              onChange={(e) => setConfirmVersionCode(e.target.value)}
              placeholder={data.selectedVersion.code}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={keepLockedOnClear}
                onChange={(e) => setKeepLockedOnClear(e.target.checked)}
              />
              <span>Giữ lại các tiết đang khóa cố định</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearDraftModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await clearDraftVersionSlotsAction({
                    versionId: data.selectedVersion!.id,
                    expectedRevision: revisionRef.current,
                    keepLockedSlots: keepLockedOnClear,
                    confirmVersionCode,
                  })
                  if (!res.success) {
                    toast.error(res.error)
                    return
                  }
                  toast.success(`Đã xóa ${res.deletedCount} tiết khỏi bản nháp.`)
                  setShowClearDraftModal(false)
                  await reloadWithPatch({})
                }}
                className="px-4 py-2 rounded-xl bg-[#E11D48] text-white text-xs font-semibold cursor-pointer"
              >
                Xóa dữ liệu bản nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </TimetableShell>
  )
}

function CellEditorModal({
  cell,
  subjects,
  teachers,
  rooms,
  classQuotas,
  autoLockDefault,
  onClose,
  onSave,
}: {
  cell: {
    classId: string
    className: string
    grade: string
    level: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    slot: SlotRecord | null
  }
  subjects: SchedulerPageData["subjects"]
  teachers: SchedulerPageData["teachers"]
  rooms: SchedulerPageData["rooms"]
  classQuotas: SchedulerPageData["quotaItems"]
  autoLockDefault: boolean
  onClose: () => void
  onSave: (slot: SlotRecord | null) => void
}) {
  const [subjectId, setSubjectId] = useState(cell.slot?.subjectId || "")
  const [teacherId, setTeacherId] = useState(cell.slot?.teacherId || "")
  const [coTeacherId, setCoTeacherId] = useState(cell.slot?.coTeacherId || "")
  const [assistantTeacherId, setAssistantTeacherId] = useState(
    cell.slot?.assistantTeacherId || ""
  )
  const [roomId, setRoomId] = useState(cell.slot?.roomId || "")
  const [weekType, setWeekType] = useState(cell.slot?.weekType || "ALL")
  const [altSubjectId, setAltSubjectId] = useState(cell.slot?.altSubjectId || "")
  const [altTeacherId, setAltTeacherId] = useState(cell.slot?.altTeacherId || "")
  const [isLocked, setIsLocked] = useState(
    cell.slot ? Boolean(cell.slot.isLocked) : autoLockDefault
  )

  const handleSubjectChange = (nextSubId: string) => {
    setSubjectId(nextSubId)
    const assigned = classQuotas.find((q) => q.subjectId === nextSubId)
    if (assigned?.primaryTeacherId) {
      setTeacherId(assigned.primaryTeacherId)
      setCoTeacherId(assigned.coTeacherId || "")
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-lg w-full p-5 space-y-4 shadow-lg text-xs">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Cập nhật tiết học — Lớp {cell.className}
            </h3>
            <p className="text-slate-500 mt-0.5">
              {DAY_LABELS[cell.dayOfWeek]} •{" "}
              {cell.session === "MORNING" ? "Buổi sáng" : "Buổi chiều"} • Tiết{" "}
              {cell.periodNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Môn học chính</label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Trống --</option>
              {subjects.map((s) => {
                const q = classQuotas.find((item) => item.subjectId === s.id)
                return (
                  <option key={s.id} value={s.id}>
                    {s.subjectName}
                    {q && q.weeklyQuota > 0
                      ? ` (${q.scheduledWeeklyEquivalent}/${q.weeklyQuota} tiết)`
                      : ""}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Giáo viên chính (tự lấy theo phân công)
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Chưa chọn --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              GV đồng giảng (tùy chọn)
            </label>
            <select
              value={coTeacherId}
              onChange={(e) => setCoTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Không --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Trợ giảng (tùy chọn)
            </label>
            <select
              value={assistantTeacherId}
              onChange={(e) => setAssistantTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Không --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Phòng học / Chức năng
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Phòng lớp mặc định --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomName} ({r.roomCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chu kỳ tuần</label>
            <select
              value={weekType}
              onChange={(e) => setWeekType(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="ALL">Hàng tuần</option>
              <option value="ODD">Tuần lẻ (0.5 tiết/tuần)</option>
              <option value="EVEN">Tuần chẵn (0.5 tiết/tuần)</option>
            </select>
          </div>

          {weekType !== "ALL" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Môn luân phiên tuần còn lại
                </label>
                <select
                  value={altSubjectId}
                  onChange={(e) => setAltSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Trống --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GV luân phiên</label>
                <select
                  value={altTeacherId}
                  onChange={(e) => setAltTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Không --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} ({t.teacherCode})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
          />
          <span>Khóa cố định ô tiết này khi chạy chia lịch tự động</span>
        </label>

        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => onSave(null)}
            className="px-3 py-2 rounded-xl text-[#E11D48] hover:bg-rose-50 font-semibold cursor-pointer"
          >
            Làm trống ô này
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                if (!subjectId) {
                  onSave(null)
                  return
                }
                const sub = subjects.find((s) => s.id === subjectId)
                const tMain = teachers.find((t) => t.id === teacherId)
                const tCo = teachers.find((t) => t.id === coTeacherId)
                const tAss = teachers.find((t) => t.id === assistantTeacherId)
                const rm = rooms.find((r) => r.id === roomId)
                const altSub = subjects.find((s) => s.id === altSubjectId)
                const altT = teachers.find((t) => t.id === altTeacherId)

                onSave({
                  classId: cell.classId,
                  className: cell.className,
                  grade: cell.grade,
                  level: cell.level,
                  dayOfWeek: cell.dayOfWeek,
                  session: cell.session,
                  periodNumber: cell.periodNumber,
                  subjectId: sub?.id || null,
                  subjectCode: sub?.subjectCode || null,
                  subjectName: sub?.subjectName || null,
                  teacherId: tMain?.id || null,
                  teacherCode: tMain?.teacherCode || null,
                  teacherName: tMain?.teacherName || null,
                  coTeacherId: tCo?.id || null,
                  coTeacherCode: tCo?.teacherCode || null,
                  coTeacherName: tCo?.teacherName || null,
                  assistantTeacherId: tAss?.id || null,
                  assistantTeacherCode: tAss?.teacherCode || null,
                  assistantTeacherName: tAss?.teacherName || null,
                  roomId: rm?.id || null,
                  roomCode: rm?.roomCode || null,
                  roomName: rm?.roomName || null,
                  weekType,
                  altSubjectId: altSub?.id || null,
                  altSubjectName: altSub?.subjectName || null,
                  altTeacherId: altT?.id || null,
                  altTeacherCode: altT?.teacherCode || null,
                  altTeacherName: altT?.teacherName || null,
                  isLocked,
                })
              }}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-semibold cursor-pointer"
            >
              Áp dụng & tự động lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
