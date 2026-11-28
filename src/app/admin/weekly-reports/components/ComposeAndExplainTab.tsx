"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Link2,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react"
import type {
  AssignedPositionTemplateOption,
  AssignedWorkTaskOption,
  EnrichedWeeklyReportItem,
  MemberAssignmentContext,
} from "../ktdbcl_actions"
import type {
  KtdbclMemberProfile,
  MonthWeekDefinition,
} from "@/lib/qa-workspace/weeklyReportSchema"

export interface DraftReportRow {
  id?: string
  taskGroup: string
  category: string
  mainTask: string
  taskTitle: string
  taskHandlingDetail: string
  workContent: string
  expectedCompletion: string
  progress: string
  proposedSolution: string
  linkedWorkTaskId?: string | null
}

function parseWorkContentToTaskFields(workContent: string): {
  taskTitle: string
  taskHandlingDetail: string
} {
  const raw = String(workContent || "").trim()
  if (!raw) return { taskTitle: "", taskHandlingDetail: "" }
  if (raw.startsWith("[Task] ")) {
    const nlIdx = raw.indexOf("\n")
    if (nlIdx === -1) {
      return { taskTitle: raw.slice(7).trim(), taskHandlingDetail: "" }
    }
    return {
      taskTitle: raw.slice(7, nlIdx).trim(),
      taskHandlingDetail: raw.slice(nlIdx + 1).trim(),
    }
  }
  return { taskTitle: raw, taskHandlingDetail: "" }
}

function serializeTaskFieldsToWorkContent(
  taskTitle: string,
  taskHandlingDetail: string
): string {
  const t = taskTitle.trim()
  const d = taskHandlingDetail.trim()
  if (t && d) return `[Task] ${t}\n${d}`
  if (t) return `[Task] ${t}`
  return d
}

interface ComposeAndExplainTabProps {
  weekNumber: number
  month: number
  year: number
  allWeeks: MonthWeekDefinition[]
  onChangeWeek: (weekNum: number) => void
  currentUserId: string
  isLeadership: boolean
  members: KtdbclMemberProfile[]
  specialistGroups: string[]
  taskCategories: Array<{ id: string; name: string; weight?: number }>
  targetUserId: string
  onChangeTargetUserId: (uid: string) => void
  existingWeekItems: EnrichedWeeklyReportItem[]
  allMonthItemsForTarget: EnrichedWeeklyReportItem[]
  assignmentContext?: MemberAssignmentContext | null
  onSyncFromQaWorkspace: (targetUid: string) => Promise<DraftReportRow[]>
  onSaveReport: (targetUid: string, rows: DraftReportRow[]) => Promise<void>
  onSubmitExplanation: (payload: {
    itemId: string
    explanationText: string
    recoveryDate: string
  }) => Promise<void>
}

function resolveGroupOption(
  preferred: string | undefined | null,
  specialistGroups: string[],
  fallback: string
): string {
  if (!preferred) return fallback
  const exact = specialistGroups.find(
    (g) => g.trim().toLowerCase() === preferred.trim().toLowerCase()
  )
  return exact || fallback
}

function formatMtcvLabel(itemCode: string, title: string): string {
  const cleanTitle = String(title || "").trim()
  const escaped = itemCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const stripped = cleanTitle.replace(new RegExp(`^\\[?${escaped}\\]?\\.?\\s*`, "i"), "").trim()
  return `[${itemCode}] ${stripped || cleanTitle}`
}

function buildRowFromAssignedTask(
  task: AssignedWorkTaskOption,
  specialistGroups: string[],
  defaultGroup: string
): DraftReportRow {
  const mappedProgress =
    task.progress === "COMPLETED"
      ? "COMPLETED"
      : task.progress === "IN_PROGRESS"
      ? "DOING"
      : "NOT_STARTED"
  const displayTitle = task.templateItemCode
    ? formatMtcvLabel(task.templateItemCode, task.title)
    : task.title

  const contentParts: string[] = []
  if (task.deliverables) {
    contentParts.push(`Đầu ra kỳ vọng: ${task.deliverables}`)
  } else if (task.description && task.description.trim() !== task.title.trim()) {
    contentParts.push(task.description.trim().slice(0, 220))
  }
  const handlingText = contentParts.join("\n")

  return {
    linkedWorkTaskId: task.id,
    taskGroup: resolveGroupOption(task.taskGroupName, specialistGroups, defaultGroup),
    category: task.templateItemCode ? `RACI ${task.templateItemCode}` : task.category || "Chuyên môn",
    mainTask: displayTitle,
    taskTitle: task.title,
    taskHandlingDetail: handlingText,
    workContent: serializeTaskFieldsToWorkContent(task.title, handlingText),
    expectedCompletion: task.endDateLabel || "",
    progress: mappedProgress,
    proposedSolution: "",
  }
}

function buildRowFromRaciTemplate(
  tpl: AssignedPositionTemplateOption,
  specialistGroups: string[],
  defaultGroup: string
): DraftReportRow {
  const handlingHint = tpl.deliverables ? `Đầu ra kỳ vọng: ${tpl.deliverables}` : ""
  return {
    linkedWorkTaskId: null,
    taskGroup: resolveGroupOption(tpl.taskGroupName, specialistGroups, defaultGroup),
    category: `RACI ${tpl.itemCode}`,
    mainTask: formatMtcvLabel(tpl.itemCode, tpl.title),
    taskTitle: "",
    taskHandlingDetail: handlingHint,
    workContent: serializeTaskFieldsToWorkContent("", handlingHint),
    expectedCompletion: "",
    progress: "DOING",
    proposedSolution: "",
  }
}

export function ComposeAndExplainTab({
  weekNumber,
  month,
  year,
  allWeeks,
  onChangeWeek,
  isLeadership,
  members,
  specialistGroups,
  taskCategories,
  targetUserId,
  onChangeTargetUserId,
  existingWeekItems,
  allMonthItemsForTarget,
  assignmentContext,
  onSyncFromQaWorkspace,
  onSaveReport,
  onSubmitExplanation,
}: ComposeAndExplainTabProps) {
  const activeMember = members.find((m) => m.id === targetUserId)
  const defaultGroup =
    assignmentContext?.positions?.[0]?.taskGroupName
      ? resolveGroupOption(
          assignmentContext.positions[0].taskGroupName,
          specialistGroups,
          activeMember?.specialistGroups?.[0] || specialistGroups[0] || "ĐBCL"
        )
      : activeMember?.specialistGroups?.[0] || specialistGroups[0] || "ĐBCL"
  const defaultCategory = taskCategories[0]?.name || "Chuyên môn"

  const assignedTasks = assignmentContext?.assignedTasks || []
  const positionTemplates = assignmentContext?.positionTemplates || []
  const assignedPositions = assignmentContext?.positions || []

  const [rows, setRows] = useState<DraftReportRow[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showBindingErrors, setShowBindingErrors] = useState(false)

  const requiresJobDescBinding = positionTemplates.length > 0 || assignedTasks.length > 0

  const isRowBoundToJobDesc = (row: DraftReportRow): boolean => {
    if (row.linkedWorkTaskId && String(row.linkedWorkTaskId).trim()) return true
    if (/^RACI\s+\d+(\.\d+)+$/i.test((row.category || "").trim())) return true
    if (/^\[\d+(\.\d+)+\]/.test((row.mainTask || "").trim())) return true
    return false
  }

  // Assigned context tray state — tự thu gọn khi đã có dòng báo cáo để nhường không gian cho bảng nhập liệu
  const [trayExpanded, setTrayExpanded] = useState(() => existingWeekItems.length === 0)
  const [trayMode, setTrayMode] = useState<"TASKS" | "RACI">("TASKS")
  const [raciSearch, setRaciSearch] = useState("")
  const [raciCadenceFilter, setRaciCadenceFilter] = useState<string>("ALL")

  // Inline explanation drafts keyed by itemId
  const [explainTexts, setExplainTexts] = useState<Record<string, string>>({})
  const [explainDates, setExplainDates] = useState<Record<string, string>>({})
  const [submittingExplainId, setSubmittingExplainId] = useState<string | null>(null)

  // Switch default tray tab intelligently when member has no tasks yet but has RACI templates
  useEffect(() => {
    if (assignedTasks.length === 0 && positionTemplates.length > 0) {
      setTrayMode("RACI")
    } else if (assignedTasks.length > 0) {
      setTrayMode("TASKS")
    }
  }, [targetUserId, assignedTasks.length, positionTemplates.length])

  useEffect(() => {
    if (existingWeekItems.length > 0) {
      setRows(
        existingWeekItems.map((it) => {
          const parsed = parseWorkContentToTaskFields(it.workContent)
          return {
            id: it.id,
            taskGroup: it.taskGroup || defaultGroup,
            category: it.category || it.mainTask || defaultCategory,
            mainTask: it.mainTask,
            taskTitle: parsed.taskTitle,
            taskHandlingDetail: parsed.taskHandlingDetail,
            workContent: it.workContent,
            expectedCompletion: it.expectedCompletion || "",
            progress: it.progress || "DOING",
            proposedSolution: it.proposedSolution || "",
            linkedWorkTaskId: it.meta.linkedWorkTaskId || null,
          }
        })
      )
    } else {
      setRows([
        {
          taskGroup: defaultGroup,
          category: defaultCategory,
          mainTask: "",
          taskTitle: "",
          taskHandlingDetail: "",
          workContent: "",
          expectedCompletion: "",
          progress: "DOING",
          proposedSolution: "",
          linkedWorkTaskId: null,
        },
      ])
    }
  }, [targetUserId, weekNumber, month, year, existingWeekItems.length])

  const pendingExplanationItems = allMonthItemsForTarget.filter(
    (it) => it.meta.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
  )

  const taskById = useMemo(
    () => new Map(assignedTasks.map((t) => [t.id, t])),
    [assignedTasks]
  )

  const includedTaskIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of rows) {
      if (r.linkedWorkTaskId) ids.add(r.linkedWorkTaskId)
    }
    return ids
  }, [rows])

  const includedNormalizedTitles = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.mainTask.trim()) set.add(r.mainTask.trim().toLowerCase())
    }
    return set
  }, [rows])

  const isTaskInReport = (task: AssignedWorkTaskOption) => {
    if (includedTaskIds.has(task.id)) return true
    const rawTitle = task.title.trim().toLowerCase()
    const codedTitle = task.templateItemCode
      ? `[${task.templateItemCode}] ${task.title}`.trim().toLowerCase()
      : rawTitle
    return includedNormalizedTitles.has(rawTitle) || includedNormalizedTitles.has(codedTitle)
  }

  const countTemplateTasksInReport = (tpl: AssignedPositionTemplateOption) => {
    const codeToken = `[${tpl.itemCode}]`.toLowerCase()
    const raciCat = `raci ${tpl.itemCode}`.toLowerCase()
    return rows.filter(
      (r) =>
        r.mainTask.toLowerCase().includes(codeToken) ||
        r.category.toLowerCase() === raciCat
    ).length
  }

  const activeUnfinishedTasks = useMemo(
    () => assignedTasks.filter((t) => t.progress !== "COMPLETED" && !isTaskInReport(t)),
    [assignedTasks, rows]
  )

  const filteredRaciTemplates = useMemo(() => {
    const q = raciSearch.trim().toLowerCase()
    return positionTemplates.filter((tpl) => {
      if (raciCadenceFilter !== "ALL") {
        if (!tpl.reportCadences.includes(raciCadenceFilter)) return false
      }
      if (!q) return true
      return (
        tpl.itemCode.toLowerCase().includes(q) ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.deliverables.toLowerCase().includes(q) ||
        tpl.functionGroup.toLowerCase().includes(q)
      )
    })
  }, [positionTemplates, raciSearch, raciCadenceFilter])

  const appendDraftRows = (incoming: DraftReportRow[]) => {
    if (incoming.length === 0) return
    setRows((prev) => {
      const meaningful = prev.filter(
        (r) =>
          r.taskTitle.trim().length > 0 ||
          r.taskHandlingDetail.trim().length > 0 ||
          r.mainTask.trim().length > 0 ||
          Boolean(r.linkedWorkTaskId)
      )
      return [...meaningful, ...incoming]
    })
  }

  const handleAddAssignedTask = (task: AssignedWorkTaskOption) => {
    appendDraftRows([buildRowFromAssignedTask(task, specialistGroups, defaultGroup)])
  }

  const handleLoadAllActiveTasks = () => {
    if (activeUnfinishedTasks.length === 0) return
    const nextRows = activeUnfinishedTasks.map((t) =>
      buildRowFromAssignedTask(t, specialistGroups, defaultGroup)
    )
    appendDraftRows(nextRows)
  }

  const handleAddRaciTemplate = (tpl: AssignedPositionTemplateOption) => {
    // Cho phép tạo nhiều task việc thuộc cùng một Nhiệm vụ mô tả công việc (MTCV)
    appendDraftRows([buildRowFromRaciTemplate(tpl, specialistGroups, defaultGroup)])
  }

  const handleAddSiblingTaskForSameMtcv = (idx: number) => {
    const source = rows[idx]
    if (!source) return
    const sibling: DraftReportRow = {
      taskGroup: source.taskGroup,
      category: source.category,
      mainTask: source.mainTask,
      taskTitle: "",
      taskHandlingDetail: "",
      workContent: "",
      expectedCompletion: source.expectedCompletion || "",
      progress: "DOING",
      proposedSolution: "",
      linkedWorkTaskId: source.linkedWorkTaskId || null,
    }
    setRows((prev) => [...prev.slice(0, idx + 1), sibling, ...prev.slice(idx + 1)])
  }

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        taskGroup: defaultGroup,
        category: defaultCategory,
        mainTask: "",
        taskTitle: "",
        taskHandlingDetail: "",
        workContent: "",
        expectedCompletion: "",
        progress: "DOING",
        proposedSolution: "",
        linkedWorkTaskId: null,
      },
    ])
  }

  const handleRemoveRow = (idx: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  const updateRow = (idx: number, patch: Partial<DraftReportRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const handleRowSourceSelect = (idx: number, rawValue: string) => {
    const currentRow = rows[idx]
    if (!currentRow || !rawValue) return

    if (rawValue.startsWith("TASK:")) {
      const taskId = rawValue.slice(5)
      const task = taskById.get(taskId)
      if (!task) return
      const built = buildRowFromAssignedTask(task, specialistGroups, defaultGroup)
      updateRow(idx, {
        linkedWorkTaskId: built.linkedWorkTaskId,
        taskGroup: built.taskGroup,
        category: built.category,
        mainTask: built.mainTask,
        expectedCompletion: built.expectedCompletion || currentRow.expectedCompletion,
        progress: built.progress,
        taskTitle: currentRow.taskTitle.trim() ? currentRow.taskTitle : built.taskTitle,
        taskHandlingDetail: currentRow.taskHandlingDetail.trim()
          ? currentRow.taskHandlingDetail
          : built.taskHandlingDetail,
        workContent: serializeTaskFieldsToWorkContent(
          currentRow.taskTitle.trim() ? currentRow.taskTitle : built.taskTitle,
          currentRow.taskHandlingDetail.trim()
            ? currentRow.taskHandlingDetail
            : built.taskHandlingDetail
        ),
      })
      return
    }

    if (rawValue.startsWith("RACI:")) {
      const tplId = rawValue.slice(5)
      const tpl = positionTemplates.find((t) => t.id === tplId)
      if (!tpl) return
      const built = buildRowFromRaciTemplate(tpl, specialistGroups, defaultGroup)
      updateRow(idx, {
        linkedWorkTaskId: null,
        taskGroup: built.taskGroup,
        category: built.category,
        mainTask: built.mainTask,
        taskHandlingDetail: currentRow.taskHandlingDetail.trim()
          ? currentRow.taskHandlingDetail
          : built.taskHandlingDetail,
        workContent: serializeTaskFieldsToWorkContent(
          currentRow.taskTitle,
          currentRow.taskHandlingDetail.trim()
            ? currentRow.taskHandlingDetail
            : built.taskHandlingDetail
        ),
      })
      return
    }

    if (rawValue.startsWith("CAT:")) {
      const catName = rawValue.slice(4)
      updateRow(idx, {
        linkedWorkTaskId: null,
        category: catName,
        mainTask:
          !currentRow.mainTask || currentRow.mainTask === currentRow.category
            ? catName
            : currentRow.mainTask,
      })
    }
  }

  const resolveRowSelectValue = (row: DraftReportRow): string => {
    if (row.linkedWorkTaskId && taskById.has(row.linkedWorkTaskId)) {
      return `TASK:${row.linkedWorkTaskId}`
    }
    if (row.category.startsWith("RACI ")) {
      const code = row.category.slice(5).trim()
      const matchedTpl = positionTemplates.find((t) => t.itemCode === code)
      if (matchedTpl) return `RACI:${matchedTpl.id}`
    }
    if (taskCategories.some((c) => c.name === row.category)) {
      return `CAT:${row.category}`
    }
    return ""
  }

  const handleSyncQa = async () => {
    setIsSyncing(true)
    try {
      const imported = await onSyncFromQaWorkspace(targetUserId)
      if (imported.length > 0) {
        const normalizedImported: DraftReportRow[] = imported.map((imp: any) => {
          const parsed = parseWorkContentToTaskFields(imp.workContent || "")
          const tTitle = imp.taskTitle || imp.mainTask || parsed.taskTitle
          const tDetail = imp.taskHandlingDetail || parsed.taskHandlingDetail
          return {
            ...imp,
            taskTitle: tTitle,
            taskHandlingDetail: tDetail,
            workContent: serializeTaskFieldsToWorkContent(tTitle, tDetail),
          }
        })
        setRows((prev) => {
          const nonEmpty = prev.filter(
            (r) =>
              r.taskTitle.trim().length > 0 ||
              r.taskHandlingDetail.trim().length > 0 ||
              r.mainTask.trim().length > 0 ||
              Boolean(r.linkedWorkTaskId)
          )
          const existingTaskIds = new Set(
            nonEmpty.map((r) => r.linkedWorkTaskId).filter(Boolean) as string[]
          )
          const existingTitles = new Set(nonEmpty.map((r) => r.mainTask.trim().toLowerCase()))
          const fresh = normalizedImported.filter(
            (imp) =>
              !(imp.linkedWorkTaskId && existingTaskIds.has(imp.linkedWorkTaskId)) &&
              !existingTitles.has(imp.mainTask.trim().toLowerCase())
          )
          return [...nonEmpty, ...fresh]
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = async () => {
    const serializedRows = rows.map((r) => ({
      ...r,
      workContent: serializeTaskFieldsToWorkContent(r.taskTitle, r.taskHandlingDetail),
    }))
    const meaningfulRows = serializedRows.filter(
      (r) =>
        r.taskTitle.trim().length > 0 ||
        r.taskHandlingDetail.trim().length > 0 ||
        r.mainTask.trim().length > 0 ||
        Boolean(r.linkedWorkTaskId)
    )
    if (meaningfulRows.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nhiệm vụ mô tả công việc để lập báo cáo tuần.")
      return
    }
    if (requiresJobDescBinding) {
      const unboundIdx: number[] = []
      serializedRows.forEach((r, idx) => {
        const hasContent =
          r.taskTitle.trim().length > 0 ||
          r.taskHandlingDetail.trim().length > 0 ||
          r.mainTask.trim().length > 0 ||
          Boolean(r.linkedWorkTaskId)
        if (hasContent && !isRowBoundToJobDesc(r)) {
          unboundIdx.push(idx + 1)
        }
      })
      if (unboundIdx.length > 0) {
        setShowBindingErrors(true)
        toast.error(
          `Dòng ${unboundIdx.join(", ")} chưa gắn với Nhiệm vụ mô tả công việc (MTCV/RACI) hoặc Công việc được giao. Vui lòng chọn trước khi nộp.`
        )
        return
      }
    }
    setShowBindingErrors(false)
    setIsSaving(true)
    try {
      await onSaveReport(targetUserId, serializedRows)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickSubmitExplanation = async (item: EnrichedWeeklyReportItem) => {
    const text = (explainTexts[item.id] ?? item.meta.staffExplanation ?? "").trim()
    const recDate = (explainDates[item.id] ?? item.meta.staffRecoveryDate ?? "").trim()
    setSubmittingExplainId(item.id)
    try {
      await onSubmitExplanation({
        itemId: item.id,
        explanationText: text,
        recoveryDate: recDate,
      })
    } finally {
      setSubmittingExplainId(null)
    }
  }

  const linkedReportRowsCount = rows.filter(
    (r) => Boolean(r.linkedWorkTaskId) || r.category.startsWith("RACI ")
  ).length

  return (
    <div className="space-y-4">
      {/* 1. Khối Yêu cầu Giải trình Trễ tiến độ (nếu có) */}
      {pendingExplanationItems.length > 0 && (
        <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#E11D48]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold">
              Cần gửi giải trình tiến độ ({pendingExplanationItems.length} đầu việc chậm hạn trong Tháng {month})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingExplanationItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-rose-200 p-3.5 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#003B3A]">
                      [Tuần {item.weekNumber}] {item.mainTask}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px]">
                      {item.taskGroup}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#E11D48]">
                    Hạn dự kiến: {item.expectedCompletion || "Đã quá hạn"}
                  </span>
                </div>

                <p className="text-slate-600">{item.workContent}</p>

                {item.meta.explanationRequestNote && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-[#E11D48] font-medium">
                    Yêu cầu từ {item.meta.overdueFlaggedByName || "Lãnh đạo Ban"}:{" "}
                    {item.meta.explanationRequestNote}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
                  <div className="md:col-span-7">
                    <input
                      type="text"
                      value={explainTexts[item.id] ?? ""}
                      onChange={(e) =>
                        setExplainTexts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Nhập nguyên nhân trễ tiến độ & giải pháp khắc phục..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={explainDates[item.id] ?? ""}
                      onChange={(e) =>
                        setExplainDates((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Cam kết ngày HT bù (VD: 22/11)"
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      disabled={submittingExplainId === item.id}
                      onClick={() => handleQuickSubmitExplanation(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Gửi giải trình
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Thanh chọn Nhân sự, Tuần báo cáo & Đồng bộ từ QA Workspace */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isLeadership ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Nhân sự báo cáo:</label>
              <select
                value={targetUserId}
                onChange={(e) => onChangeTargetUserId(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.position})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs font-semibold text-[#003B3A]">
              Người lập báo cáo: {activeMember?.fullName || "Thành viên Ban KT&ĐBCL"}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Kỳ tuần:</label>
            <select
              value={weekNumber}
              onChange={(e) => onChangeWeek(Number(e.target.value))}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#003B3A] tabular-nums focus:outline-none focus:border-[#00A19A]"
            >
              {allWeeks.map((w) => (
                <option key={w.weekNum} value={w.weekNum}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncQa}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ đầu việc từ QA Workspace"}
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-[#003B3A] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#00A19A]" />
            Thêm dòng việc
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Đang lưu..." : `Lưu & Nộp báo cáo Tuần ${weekNumber}`}
          </button>
        </div>
      </div>

      {/* 3. Bảng ngữ cảnh: Nhiệm vụ & Công việc được gán cho nhân sự (Bám sát RACI & QA Workspace) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 border-l-4 border-[#003B3A] pl-3">
            <span className="text-xs font-bold text-[#003B3A]">
              Nhiệm vụ &amp; công việc được gán — {activeMember?.fullName || "Nhân sự"}
            </span>
            {assignedPositions.length > 0 ? (
              assignedPositions.map((pos) => (
                <span
                  key={pos.positionCode}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#003B3A] text-white tabular-nums"
                >
                  <Briefcase className="w-3 h-3 text-[#5EEAD4]" />
                  {pos.positionCode} · {pos.positionName}
                </span>
              ))
            ) : (
              <Link
                href="/admin/tasks"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                Chưa gán vị trí RACI · Gán tại Điều hành &amp; giao việc
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
            <span className="text-[11px] text-slate-500 tabular-nums">
              • Đã bám sát trong báo cáo: <strong className="text-[#00736E]">{linkedReportRowsCount}</strong>/{rows.length} dòng
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <div className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setTrayMode("TASKS")
                  setTrayExpanded(true)
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  trayMode === "TASKS"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Công việc được giao ({assignedTasks.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrayMode("RACI")
                  setTrayExpanded(true)
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  trayMode === "RACI"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Nhiệm vụ vị trí RACI ({positionTemplates.length})
              </button>
            </div>

            {activeUnfinishedTasks.length > 0 && (
              <button
                type="button"
                onClick={handleLoadAllActiveTasks}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#00A19A] text-white hover:bg-[#008B85] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nạp {activeUnfinishedTasks.length} việc đang thực hiện
              </button>
            )}

            <button
              type="button"
              onClick={() => setTrayExpanded((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 border border-[#E2E8F0] bg-white hover:bg-slate-50"
            >
              {trayExpanded ? (
                <>
                  Thu gọn <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Mở danh sách <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {trayExpanded && (
          <div className="p-3.5 space-y-2.5 bg-white">
            {trayMode === "TASKS" ? (
              assignedTasks.length === 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-slate-600">
                  <span>
                    Nhân sự chưa có đầu việc nào được giao trên QA Workspace. Anh/chị có thể chuyển sang tab{" "}
                    <button
                      type="button"
                      onClick={() => setTrayMode("RACI")}
                      className="font-semibold text-[#00736E] underline"
                    >
                      Nhiệm vụ vị trí RACI ({positionTemplates.length})
                    </button>{" "}
                    để chọn trực tiếp nhiệm vụ theo khung vị trí.
                  </span>
                  <Link
                    href="/admin/tasks"
                    className="inline-flex items-center gap-1 font-semibold text-[#003B3A] hover:text-[#00736E] shrink-0"
                  >
                    Mở Điều hành &amp; giao việc
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 tabular-nums">
                  {assignedTasks.map((task) => {
                    const alreadyIn = isTaskInReport(task)
                    const statusBadge = task.isOverdue
                      ? { label: "Quá hạn", cls: "bg-rose-50 text-[#E11D48] border-rose-200" }
                      : task.progress === "COMPLETED"
                      ? { label: "Hoàn thành", cls: "bg-emerald-50 text-[#059669] border-emerald-200" }
                      : task.progress === "IN_PROGRESS"
                      ? { label: "Đang thực hiện", cls: "bg-amber-50 text-[#D97706] border-amber-200" }
                      : { label: "Chưa bắt đầu", cls: "bg-slate-50 text-slate-600 border-[#E2E8F0]" }

                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition-colors ${
                          alreadyIn
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-[#E2E8F0] bg-white hover:border-[#00A19A]"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              {task.templateItemCode && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#003B3A] text-white">
                                  {task.templateItemCode}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                                {task.taskGroupName}
                              </span>
                              {task.isCollaborator && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                                  Phối hợp
                                </span>
                              )}
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${statusBadge.cls}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-[#003B3A] line-clamp-2">
                            {task.title}
                          </p>
                          {task.deliverables && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              Đầu ra: {task.deliverables}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
                          <span className="text-[11px] text-slate-500">
                            {task.endDateLabel ? `Hạn: ${task.endDateLabel}` : "Chưa đặt hạn"}
                          </span>
                          {alreadyIn ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã có trong báo cáo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddAssignedTask(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-[#00A19A] hover:text-white transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Đưa vào báo cáo
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : positionTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Nhân sự này chưa được gán vào vị trí RACI nào trong 07 vị trí của Ban KT&amp;ĐBCL.
                </span>
                <Link
                  href="/admin/tasks"
                  className="inline-flex items-center gap-1 font-semibold text-[#00736E] hover:underline"
                >
                  Gán nhân sự vào vị trí tại Nhiệm vụ theo vị trí
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={raciSearch}
                      onChange={(e) => setRaciSearch(e.target.value)}
                      placeholder="Tìm mã mục (VD: 3.1.1, 4.1.2) hoặc tên nhiệm vụ theo vị trí..."
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1">
                    {[
                      { key: "ALL", label: "Tất cả" },
                      { key: "WEEKLY", label: "Tuần" },
                      { key: "MONTHLY", label: "Tháng" },
                      { key: "SEMESTER", label: "Kỳ học" },
                    ].map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setRaciCadenceFilter(c.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          raciCadenceFilter === c.key
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 tabular-nums">
                  {filteredRaciTemplates.map((tpl) => {
                    const taskCount = countTemplateTasksInReport(tpl)
                    return (
                      <div
                        key={tpl.id}
                        className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition-colors ${
                          taskCount > 0
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-[#E2E8F0] bg-white hover:border-[#00A19A]"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#003B3A] text-white">
                              {tpl.itemCode}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 truncate">
                              {tpl.positionCode} · {tpl.frequency}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#003B3A] line-clamp-2">
                            {tpl.title}
                          </p>
                          {tpl.deliverables && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              Đầu ra: {tpl.deliverables}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
                          {taskCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {taskCount} task
                            </span>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddRaciTemplate(tpl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-[#00A19A] hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {taskCount > 0 ? "Thêm task nữa" : "Đưa vào báo cáo"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bảng nhập liệu Báo cáo Tuần theo chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-white w-9 text-center">
                  STT
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-36">
                  Nhóm chuyên môn
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-56">
                  Nhiệm vụ MTCV <span className="text-[#5EEAD4]">*</span>
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-white min-w-[180px]">
                  Task việc
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-white min-w-[230px]">
                  Nội dung xử lý task việc
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-teal-100 w-28">
                  Dự kiến HT
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] w-32">
                  Tiến độ
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-teal-100 min-w-[165px]">
                  Đề xuất / Kiến nghị
                </th>
                <th className="py-3 px-2.5 text-[11px] font-semibold whitespace-nowrap text-white w-10 text-center">
                  Xóa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {rows.map((row, idx) => {
                const linkedTask = row.linkedWorkTaskId ? taskById.get(row.linkedWorkTaskId) : null
                const selectVal = resolveRowSelectValue(row)
                const isBound = isRowBoundToJobDesc(row)
                const hasAnyInput =
                  row.taskTitle.trim().length > 0 ||
                  row.taskHandlingDetail.trim().length > 0 ||
                  row.mainTask.trim().length > 0 ||
                  Boolean(row.linkedWorkTaskId)
                const isMissingBinding = requiresJobDescBinding && !isBound && (showBindingErrors || hasAnyInput)

                return (
                  <tr
                    key={row.id || `draft_${idx}`}
                    className={`align-top transition-colors ${
                      isMissingBinding ? "bg-rose-50/40" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-semibold text-slate-500 pt-4">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={row.taskGroup}
                        onChange={(e) => updateRow(idx, { taskGroup: e.target.value })}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                      >
                        {specialistGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 space-y-1.5">
                      <select
                        value={selectVal}
                        onChange={(e) => handleRowSourceSelect(idx, e.target.value)}
                        className={`w-full rounded-xl border px-2.5 py-1.5 text-xs focus:outline-none ${
                          isMissingBinding
                            ? "border-rose-300 bg-rose-50 text-[#E11D48] font-semibold focus:border-rose-500"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-slate-700 focus:border-[#00A19A]"
                        }`}
                      >
                        <option value="">
                          {requiresJobDescBinding
                            ? "-- Bắt buộc chọn nhiệm vụ MTCV / việc được giao --"
                            : "-- Chọn danh mục công việc --"}
                        </option>
                        {positionTemplates.length > 0 && (
                          <optgroup label={`Nhiệm vụ mô tả công việc theo vị trí RACI (${positionTemplates.length})`}>
                            {positionTemplates.map((tpl) => (
                              <option key={tpl.id} value={`RACI:${tpl.id}`}>
                                {formatMtcvLabel(tpl.itemCode, tpl.title)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {assignedTasks.length > 0 && (
                          <optgroup label={`Công việc được giao trên QA Workspace (${assignedTasks.length})`}>
                            {assignedTasks.map((t) => (
                              <option key={t.id} value={`TASK:${t.id}`}>
                                {t.templateItemCode ? formatMtcvLabel(t.templateItemCode, t.title) : t.title}
                                {t.endDateLabel ? ` (Hạn ${t.endDateLabel})` : ""}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {!requiresJobDescBinding && taskCategories.length > 0 && (
                          <optgroup label="Danh mục công việc chung">
                            {taskCategories.map((c) => (
                              <option key={c.id} value={`CAT:${c.name}`}>
                                {c.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {row.mainTask && isBound && (
                        <p className="text-[11px] font-medium text-[#003B3A] leading-snug line-clamp-2 px-0.5">
                          {row.mainTask}
                        </p>
                      )}
                      {isMissingBinding ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          Bắt buộc chọn nhiệm vụ MTCV hoặc việc được giao
                        </div>
                      ) : (
                        (row.linkedWorkTaskId || row.category.startsWith("RACI ")) && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {row.linkedWorkTaskId && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                                <Link2 className="w-3 h-3" />
                                Gắn việc QA
                              </span>
                            )}
                            {(linkedTask?.templateItemCode || row.category.startsWith("RACI ")) && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#003B3A] text-white">
                                {linkedTask?.templateItemCode
                                  ? `MTCV · ${linkedTask.templateItemCode}`
                                  : `MTCV · ${row.category.replace(/^RACI\s+/i, "")}`}
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <textarea
                        rows={3}
                        value={row.taskTitle}
                        onChange={(e) =>
                          updateRow(idx, {
                            taskTitle: e.target.value,
                            workContent: serializeTaskFieldsToWorkContent(
                              e.target.value,
                              row.taskHandlingDetail
                            ),
                          })
                        }
                        placeholder="Nhập tên task việc cụ thể thuộc MTCV này..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs font-medium text-[#003B3A] focus:outline-none focus:border-[#00A19A]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <textarea
                        rows={3}
                        value={row.taskHandlingDetail}
                        onChange={(e) =>
                          updateRow(idx, {
                            taskHandlingDetail: e.target.value,
                            workContent: serializeTaskFieldsToWorkContent(
                              row.taskTitle,
                              e.target.value
                            ),
                          })
                        }
                        placeholder="Nội dung xử lý, kết quả đạt được, số liệu hoặc link minh chứng..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#00A19A]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={row.expectedCompletion}
                        onChange={(e) => updateRow(idx, { expectedCompletion: e.target.value })}
                        placeholder="VD: 18/11/2026"
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={row.progress}
                        onChange={(e) => updateRow(idx, { progress: e.target.value })}
                        className={`w-full rounded-xl border px-2.5 py-2 text-xs font-semibold focus:outline-none ${
                          row.progress === "COMPLETED"
                            ? "bg-emerald-50 text-[#059669] border-emerald-200"
                            : row.progress === "DOING"
                            ? "bg-amber-50 text-[#D97706] border-amber-200"
                            : "bg-slate-50 text-slate-600 border-[#E2E8F0]"
                        }`}
                      >
                        <option value="COMPLETED">Hoàn thành</option>
                        <option value="DOING">Đang thực hiện</option>
                        <option value="NOT_STARTED">Chưa bắt đầu</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <textarea
                        rows={3}
                        value={row.proposedSolution}
                        onChange={(e) => updateRow(idx, { proposedSolution: e.target.value })}
                        placeholder="Đề xuất hỗ trợ, phối hợp (nếu có)..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#00A19A]"
                      />
                    </td>
                    <td className="py-3 px-3 text-center pt-3.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Thanh tổng kết & thao tác nhanh cuối bảng */}
        <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 tabular-nums">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Tổng: <strong className="text-[#003B3A]">{rows.length}</strong> dòng
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[#059669] font-medium">
              Hoàn thành: {rows.filter((r) => r.progress === "COMPLETED").length}
            </span>
            <span className="text-[#D97706] font-medium">
              Đang thực hiện: {rows.filter((r) => r.progress === "DOING").length}
            </span>
            <span className="text-slate-500 font-medium">
              Chưa bắt đầu: {rows.filter((r) => r.progress === "NOT_STARTED").length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00A19A]" />
              Thêm dòng việc
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Đang lưu..." : `Lưu & Nộp báo cáo Tuần ${weekNumber}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
