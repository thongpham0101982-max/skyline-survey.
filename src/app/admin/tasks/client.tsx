"use client"

function getCategoryBadgeStyle(catName: string) {
  const name = catName?.toLowerCase() || ""
  if (name.includes("kỳ thi") || name.includes("đầu ra"))
    return "bg-teal-50 text-[#0284C7] border-teal-200"
  if (name.includes("mầm non") || name.includes("mn"))
    return "bg-amber-50 text-amber-700 border-amber-200"
  if (name.includes("phổ thông") || name.includes("pt"))
    return "bg-sky-50 text-sky-700 border-sky-200"
  if (name.includes("quốc tế"))
    return "bg-teal-50 text-teal-800 border-teal-200"
  if (name.includes("định kì") || name.includes("kiểm tra"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (name.includes("khảo sát") || name.includes("đbcl"))
    return "bg-teal-50 text-teal-800 border-teal-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
}

import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import React, { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ClipboardList,
  Plus,
  Bell,
  Edit,
  Trash2,
  AlertTriangle,
  User,
  Users,
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  LayoutList,
  Kanban,
  Calendar,
  Search,
  ShieldCheck,
  XCircle,
  Clock,
  Filter,
  ArrowRight,
  Download,
  Settings,
  Sparkles,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Building2,
  Sliders,
  Monitor,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react"
import {
  deleteTask,
  remindTask,
  updateTaskProgress,
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
  confirmTaskAssignment,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  assignStaffToTaskGroup,
  setTaskGroupLeader,
  saveDepartmentSettings,
} from "./actions"
import {
  createQaWorkspaceTask,
  confirmAndAcceptQaTask,
} from "./qa_workspace_actions"
import { TaskDetailPanel } from "./TaskDetailPanel"
import { WorkspaceCardsView } from "./components/WorkspaceCardsView"
import { CommandRoomView } from "./components/CommandRoomView"
import { MemberWorkspacePanel } from "./components/MemberWorkspacePanel"
import { TaskAssignmentModal } from "./components/TaskAssignmentModal"
import { PositionTasksView, type PositionCatalogBundle } from "./components/PositionTasksView"
import { Briefcase } from "lucide-react"
import { QaAssistantPanel } from "./components/QaAssistantPanel"
import {
  QaAnalyticsReportModal,
  QaSmartReminderModal,
  QaCapaActionModal,
} from "./components/QaGovernanceModals"
import { QaGuideModal } from "./components/QaGuideModal"
import {
  WORKFLOW_STATUS_LABELS,
  type QaWorkspaceViewMode,
  type WorkspaceCardConfig,
} from "@/lib/qa-workspace/types"

const PROGRESS_OPTIONS = [
  {
    value: "PENDING",
    label: "Chưa thực hiện",
    color: "bg-slate-100 text-slate-700 border-slate-300",
  },
  {
    value: "IN_PROGRESS",
    label: "Đang thực hiện",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "COMPLETED",
    label: "Hoàn thành",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "OVERDUE",
    label: "Trễ hạn",
    color: "bg-red-50 text-red-700 border-red-200",
  },
]

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Thấp", color: "text-slate-500 bg-slate-100" },
  { value: "MEDIUM", label: "Bình thường", color: "text-blue-700 bg-blue-50" },
  { value: "HIGH", label: "Ưu tiên cao", color: "text-amber-800 bg-amber-50" },
  {
    value: "URGENT",
    label: "Khẩn cấp",
    color: "text-rose-700 bg-rose-100",
  },
]

export function TasksClient({
  initialTasks,
  years,
  roles,
  dbCategories,
  initialTaskGroups,
  allStaffUsers,
  currentRole,
  currentUserId,
  operationalScope,
  initialDepartmentSettings,
  campuses = [],
  initialImprovementActions = [],
  initialSourceModules = [],
  initialRecentReminders = [],
  initialPositionCatalog = { positions: [], staffMappings: [], templates: [] },
  ktdbclStaffUsers = [],
}: any) {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState(initialTasks || [])

  // 5 Chế độ làm việc chuẩn (Mục II.3): Không gian công việc / Phòng điều hành / Danh sách / Dashboard trạng thái / Lịch
  const [viewMode, setViewMode] = useState<QaWorkspaceViewMode>("workspace")
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<
    "ALL" | "ASSIGNED" | "IN_PROGRESS" | "PENDING_REVIEW" | "NEEDS_REVISION" | "COMPLETED"
  >("ALL")
  const [dashboardOverdueOnly, setDashboardOverdueOnly] = useState(false)

  // Modals & Panels state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [editingTaskForModal, setEditingTaskForModal] = useState<any | null>(null)
  const [presetAssignmentDraft, setPresetAssignmentDraft] = useState<any | null>(null)

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showAssistantPanel, setShowAssistantPanel] = useState(false)
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | undefined>(
    undefined
  )

  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [recentReminders, setRecentReminders] = useState<any[]>(
    initialRecentReminders || []
  )
  const [positionCatalog, setPositionCatalog] = useState<PositionCatalogBundle>(
    initialPositionCatalog || { positions: [], staffMappings: [], templates: [] }
  )
  const [filterPosition, setFilterPosition] = useState<string>("ALL")

  const [showCapaModal, setShowCapaModal] = useState(false)
  const [editingCapaAction, setEditingCapaAction] = useState<any | null>(null)
  const [syncingRecordId, setSyncingRecordId] = useState<string | null>(null)

  // Calendar month navigation state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Tổ chuyên môn mặc định của QA Workspace (mặc định: KT&ĐBCL)
  const resolvedInitialDefaultDept =
    initialDepartmentSettings?.defaultDepartment ||
    roles?.find(
      (r: any) =>
        r.code === "KT&ĐBCL" ||
        r.name === "KT&ĐBCL" ||
        r.deptCode === "KT-ĐBCL" ||
        r.divisionCode === "BAN_KT_DBCL"
    )?.code ||
    "KT&ĐBCL"

  const [defaultDepartment, setDefaultDepartment] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("qa_workspace_default_dept")
      if (saved) return saved
    }
    return resolvedInitialDefaultDept
  })
  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("qa_workspace_default_dept")
      if (saved) return saved
    }
    return resolvedInitialDefaultDept
  })
  const [modalMemberDeptFilter, setModalMemberDeptFilter] = useState<string>(
    resolvedInitialDefaultDept
  )

  // Quick Context & Team Filters (dùng chung cho mọi chế độ xem)
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(() =>
    searchParams?.get("scope") === "mine" ? "MY_TASKS" : "ALL"
  )
  const [filterPriority, setFilterPriority] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterProgress, setFilterProgress] = useState("ALL")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [filterAcceptance, setFilterAcceptance] = useState("ALL")
  const [filterYear, setFilterYear] = useState("ALL")
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // Category & Group Manager states
  const [categoriesList, setCategoriesList] = useState(dbCategories || [])
  const [taskGroupsList, setTaskGroupsList] = useState<any[]>(
    initialTaskGroups || []
  )
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [catTab, setCatTab] = useState<"categories" | "groups" | "settings">(
    "categories"
  )
  const [catName, setCatName] = useState("")
  const [catRole, setCatRole] = useState(resolvedInitialDefaultDept)
  const [catGroupName, setCatGroupName] = useState("")
  const [catWeight, setCatWeight] = useState<number | string>(1.0)
  const [catEditId, setCatEditId] = useState<string | null>(null)

  // Task Group CRUD & Assignment states
  const [groupEditId, setGroupEditId] = useState<string | null>(null)
  const [groupNameInput, setGroupNameInput] = useState("")
  const [groupDescInput, setGroupDescInput] = useState("")
  const [groupLeaderInput, setGroupLeaderInput] = useState("")
  const [groupDeptInput, setGroupDeptInput] = useState(
    resolvedInitialDefaultDept
  )
  const [groupMemberIdsInput, setGroupMemberIdsInput] = useState<string[]>([])
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState<any>(null)
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [savingGroup, setSavingGroup] = useState(false)

  // Configurable Department Settings State
  const [deptSettings, setDeptSettings] = useState<any>(
    initialDepartmentSettings || {
      defaultDepartment: resolvedInitialDefaultDept,
      topology: "3_LEVEL",
      hasTeams: true,
      requireAcceptance: true,
      requireLeaderApproval: false,
      enableActionItems: true,
      enableKpiWeights: true,
      syncWeeklyReports: true,
      permissions: {
        leader: {
          canViewAllBan: false,
          canViewOtherTeams: true,
          canAssignAcrossTeams: false,
          canApproveTeamTasks: true,
          canManageBlockers: true,
          canExportReports: true,
        },
        member: {
          canSelfAssign: false,
          canViewOtherTeams: false,
          canCreateActionItems: true,
        },
      },
    }
  )
  const [savingSettings, setSavingSettings] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)
  const [taskToast, setTaskToast] = useState<{ msg: string; type: string } | null>(
    null
  )
  const [detailTask, setDetailTask] = useState<any>(null)

  const isTBP = operationalScope?.isTBP || false
  const isTTCM = operationalScope?.isTTCM || false
  const isManager =
    operationalScope?.isManager ?? (currentRole === "ADMIN" || isTBP || isTTCM)
  const isAdmin = isManager

  // Open modal if URL has taskId or assistant=open
  useEffect(() => {
    const taskId = searchParams?.get("taskId")
    const assistantParam = searchParams?.get("assistant")
    if (assistantParam === "open") {
      setShowAssistantPanel(true)
    }
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t: any) => t.id === taskId)
      if (task) {
        setDetailTask(task)
      }
    }
  }, [searchParams, tasks])

  const handleOpenNewAssignment = (preset?: any) => {
    setEditingTaskForModal(null)
    setPresetAssignmentDraft(preset || null)
    setShowAssignmentModal(true)
  }

  const handleEditTask = (t: any) => {
    setEditingTaskForModal(t)
    setPresetAssignmentDraft(null)
    setShowAssignmentModal(true)
  }

  const handleAssignToCardGroup = (
    card: WorkspaceCardConfig,
    matchedGroupId?: string | null
  ) => {
    const grp = matchedGroupId
      ? taskGroupsList.find(g => g.id === matchedGroupId)
      : null
    handleOpenNewAssignment({
      workspaceCardKey: card.key,
      category: card.defaultCategory,
      taskGroupId: matchedGroupId || taskGroupsList[0]?.id || null,
      assignmentMode: matchedGroupId ? "GROUP" : "INDIVIDUAL",
      assignedToUserId: grp?.leaderUserId || null,
    })
  }

  const handleQuickAssignMember = (userId: string, groupId?: string | null) => {
    setSelectedMemberId(null)
    handleOpenNewAssignment({
      assignmentMode: "INDIVIDUAL",
      assignedToUserId: userId,
      taskGroupId: groupId || null,
    })
  }

  const handleSyncSourceRecord = async (moduleCode: string, item: any) => {
    const recordId = item.sourceRecordId || item.id
    const recordUrl = item.sourceUrl || item.url || null
    setSyncingRecordId(recordId)
    try {
      const externalSyncKey = item.externalSyncKey || `SYNC:${moduleCode}:${recordId}`
      const res = await createQaWorkspaceTask({
        title: item.title?.startsWith("[") ? item.title : `[Liên thông ${moduleCode}] ${item.title}`,
        description: `Đồng bộ từ hồ sơ nguồn: ${item.title} (${item.subtitle || item.category || ""})`,
        category:
          item.category ||
          (moduleCode === "KHAO_THI"
            ? "Khảo thí"
            : moduleCode === "KHAO_SAT_DAU_VAO"
            ? "Khảo sát đầu vào"
            : "Đảm bảo chất lượng"),
        taskGroupId: taskGroupsList[0]?.id || null,
        assignmentMode: "INDIVIDUAL",
        assignedToUserId:
          item.suggestedAssigneeId ||
          taskGroupsList[0]?.leaderUserId ||
          currentUserId ||
          allStaffUsers[0]?.id,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: item.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        priority: "HIGH",
        sourceModule: moduleCode as any,
        sourceRecordId: recordId,
        sourceUrl: recordUrl,
        externalSyncKey,
        academicYearId: getDefaultAcademicYearClient(years)?.id || null,
      })

      if (res.success) {
        if ((res as any).deduplicated) {
          setTaskToast({
            msg: "ℹ️ Hồ sơ nguồn này đã được liên thông trước đó (Chống tạo việc trùng lặp).",
            type: "success",
          })
        } else {
          setTaskToast({
            msg: "✅ Đã khởi tạo phiếu giao việc liên thông từ hồ sơ nguồn!",
            type: "success",
          })
          setTimeout(() => window.location.reload(), 1200)
        }
      } else {
        alert(res.error)
      }
    } finally {
      setSyncingRecordId(null)
      setTimeout(() => setTaskToast(null), 3500)
    }
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) return alert("Vui lòng nhập tên danh mục")
    const weightNum = parseFloat(String(catWeight)) || 1.0
    if (catEditId) {
      const res = await updateTaskCategory(catEditId, {
        name: catName,
        assignedToRole: catRole,
        groupName: catGroupName || undefined,
        weight: weightNum,
      })
      if (res.success) {
        setCategoriesList(
          categoriesList.map((c: any) =>
            c.id === catEditId
              ? {
                  ...c,
                  name: catName,
                  assignedToRole: catRole,
                  groupName: catGroupName || null,
                  weight: weightNum,
                }
              : c
          )
        )
        setCatEditId(null)
        setCatName("")
        setCatGroupName("")
        setCatWeight(1.0)
      } else alert("Lỗi: " + res.error)
    } else {
      const res: any = await createTaskCategory({
        name: catName,
        assignedToRole: catRole,
        groupName: catGroupName || undefined,
        weight: weightNum,
      })
      if (res.success) {
        setCategoriesList([...categoriesList, res.category])
        setCatName("")
        setCatGroupName("")
        setCatWeight(1.0)
      } else alert("Lỗi: " + res.error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return
    const res = await deleteTaskCategory(id)
    if (res.success)
      setCategoriesList(categoriesList.filter((c: any) => c.id !== id))
    else alert("Lỗi: " + res.error)
  }

  const handleSaveTaskGroup = async () => {
    if (!groupNameInput.trim()) return alert("Vui lòng nhập tên nhóm công việc")
    setSavingGroup(true)
    if (groupEditId) {
      const res = await updateTaskGroup(groupEditId, {
        name: groupNameInput.trim(),
        description: groupDescInput.trim() || undefined,
        department: groupDeptInput,
        leaderUserId: groupLeaderInput || null,
        memberUserIds: groupMemberIdsInput,
      })
      if (res.success) {
        setTaskGroupsList(
          taskGroupsList.map(g =>
            g.id === groupEditId
              ? {
                  ...g,
                  name: groupNameInput.trim(),
                  description: groupDescInput.trim() || null,
                  department: groupDeptInput,
                  leaderUserId: groupLeaderInput || null,
                  memberUserIds: JSON.stringify(groupMemberIdsInput),
                }
              : g
          )
        )
        setGroupEditId(null)
        setGroupNameInput("")
        setGroupDescInput("")
        setGroupLeaderInput("")
        setGroupMemberIdsInput([])
      } else alert("Lỗi: " + res.error)
    } else {
      const res = await createTaskGroup({
        name: groupNameInput.trim(),
        description: groupDescInput.trim() || undefined,
        department: groupDeptInput,
        leaderUserId: groupLeaderInput || null,
        memberUserIds: groupMemberIdsInput,
      })
      if (res.success) {
        setTaskGroupsList([...taskGroupsList, res.group])
        setGroupNameInput("")
        setGroupDescInput("")
        setGroupLeaderInput("")
        setGroupMemberIdsInput([])
      } else alert("Lỗi: " + res.error)
    }
    setSavingGroup(false)
  }

  const handleDeleteTaskGroup = async (id: string) => {
    if (!confirm("Xóa nhóm công việc này?")) return
    const res = await deleteTaskGroup(id)
    if (res.success)
      setTaskGroupsList(taskGroupsList.filter(g => g.id !== id))
    else alert("Lỗi: " + res.error)
  }

  const handleSetGroupLeaderAction = async (
    groupId: string,
    leaderUserId: string
  ) => {
    const res = await setTaskGroupLeader(groupId, leaderUserId || null)
    if (res.success) {
      setTaskGroupsList(prev =>
        prev.map(g =>
          g.id === groupId ? { ...g, leaderUserId: leaderUserId || null } : g
        )
      )
      setTaskToast({
        msg: "✅ Đã phân công Người điều phối nhóm thành công!",
        type: "success",
      })
      setTimeout(() => setTaskToast(null), 2500)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const isUserInDepartment = (u: any, deptCode: string) => {
    if (!deptCode || deptCode === "ALL") return true
    const dRel = u?.teacher?.departmentRel
    const uName = dRel?.name || ""
    const uCode = dRel?.code || ""
    const uDiv = dRel?.divisionCode || ""
    if (
      deptCode === "KT&ĐBCL" ||
      deptCode === "KT-ĐBCL" ||
      deptCode === "KT_DBCL" ||
      deptCode === "BAN_KT_DBCL"
    ) {
      return (
        uName === "KT&ĐBCL" ||
        uCode === "KT-ĐBCL" ||
        uCode === "KT&ĐBCL" ||
        uDiv === "BAN_KT_DBCL"
      )
    }
    return uName === deptCode || uCode === deptCode || uDiv === deptCode
  }

  const scopedStaffUsers = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === "ALL") {
      return allStaffUsers || []
    }
    const filtered = (allStaffUsers || []).filter((u: any) =>
      isUserInDepartment(u, selectedDepartment)
    )
    return filtered.length > 0 ? filtered : allStaffUsers || []
  }, [allStaffUsers, selectedDepartment])

  const handleSetDefaultDepartment = async (deptCode: string) => {
    if (!deptCode || deptCode === "ALL") return
    setDefaultDepartment(deptCode)
    setSelectedDepartment(deptCode)
    setModalMemberDeptFilter(deptCode)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qa_workspace_default_dept", deptCode)
    }
    const nextSettings = {
      ...deptSettings,
      defaultDepartment: deptCode,
    }
    setDeptSettings(nextSettings)
    if (isAdmin) {
      await saveDepartmentSettings("KT&ĐBCL", nextSettings).catch(() => {})
    }
    setTaskToast({
      msg: `✅ Đã đặt "${deptCode}" làm Tổ chuyên môn mặc định của QA Workspace!`,
      type: "success",
    })
    setTimeout(() => setTaskToast(null), 3000)
  }

  const handleSaveDepartmentSettings = async () => {
    setSavingSettings(true)
    const targetDept = "KT&ĐBCL"
    const res = await saveDepartmentSettings(targetDept, deptSettings)
    setSavingSettings(false)
    if (res.success) {
      if (deptSettings.defaultDepartment) {
        setDefaultDepartment(deptSettings.defaultDepartment)
        setSelectedDepartment(deptSettings.defaultDepartment)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "qa_workspace_default_dept",
            deptSettings.defaultDepartment
          )
        }
      }
      setTaskToast({
        msg: "✅ Đã lưu cấu hình Tổ chuyên môn mặc định & phân quyền của Ban thành công!",
        type: "success",
      })
      setTimeout(() => setTaskToast(null), 3000)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleOpenAssignModal = (group: any) => {
    setSelectedGroupForAssign(group)
    let members: string[] = []
    if (group.memberUserIds) {
      try {
        members =
          typeof group.memberUserIds === "string"
            ? JSON.parse(group.memberUserIds)
            : group.memberUserIds
      } catch {
        members = []
      }
    } else if (Array.isArray(group.memberUserIdsList)) {
      members = group.memberUserIdsList
    }
    setAssignedMemberIds(members || [])
    setMemberSearchQuery("")
  }

  const handleToggleMember = (uid: string) => {
    setAssignedMemberIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const handleSaveGroupAssignment = async () => {
    if (!selectedGroupForAssign) return
    setSavingGroup(true)
    const res = await assignStaffToTaskGroup(
      selectedGroupForAssign.id,
      assignedMemberIds
    )
    setSavingGroup(false)
    if (res.success) {
      setTaskToast({
        msg: `✅ Đã phân công ${assignedMemberIds.length} nhân sự cho nhóm ${selectedGroupForAssign.name}!`,
        type: "success",
      })
      setTimeout(() => {
        setTaskToast(null)
        window.location.reload()
      }, 1200)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa công việc này?")) return
    const res = await deleteTask(id)
    if (res.success) setTasks(tasks.filter((t: any) => t.id !== id))
  }

  const handleRemind = async (id: string) => {
    const res: any = await remindTask(id)
    if (res.success) {
      setTaskToast({
        msg: `🔔 Đã gửi ${res.sent || 0} thông báo nhắc việc thành công!`,
        type: "success",
      })
      setTimeout(() => setTaskToast(null), 3000)
    } else alert("Lỗi: " + res.error)
  }

  const handleConfirmTaskAction = async (taskId: string) => {
    setActionLoading(true)
    const res: any = await confirmAndAcceptQaTask(taskId)
    setActionLoading(false)
    if (res.success) {
      setTasks(
        tasks.map((t: any) =>
          t.id === taskId
            ? {
                ...t,
                acceptanceStatus: "ACCEPTED",
                acceptedAt: new Date().toISOString(),
                progress: t.progress === "PENDING" ? "IN_PROGRESS" : t.progress,
                qaMeta: {
                  ...(t.qaMeta || {}),
                  workflowStatus: res.workflowStatus || "IN_PROGRESS",
                },
              }
            : t
        )
      )
      setTaskToast({
        msg: "Đã xác nhận tiếp nhận công việc, chuyển sang Đang thực hiện và báo email cho người giao!",
        type: "success",
      })
      setTimeout(() => setTaskToast(null), 3500)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleProgressChange = async (id: string, progress: string) => {
    setTasks(tasks.map((t: any) => (t.id === id ? { ...t, progress } : t)))
    await updateTaskProgress(id, progress)
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx")
      const exportRows = displayedTasks.map((t: any, index: number) => {
        const blockers = (t.comments || []).filter(
          (c: any) => c.commentType === "BLOCKER"
        )
        const unresolved = blockers.filter(
          (b: any) => b.actionStatus !== "RESOLVED"
        )
        const wfStatus = t.qaMeta?.workflowStatus || t.progress
        return {
          STT: index + 1,
          "Nhóm Chuyên Môn": t.taskGroup?.name || "Toàn Ban",
          "Danh Mục": t.category || "Công việc",
          "Tiêu Đề Công Việc": t.title,
          "Mức Độ Ưu Tiên":
            t.priority === "URGENT"
              ? "Khẩn cấp"
              : t.priority === "HIGH"
              ? "Ưu tiên cao"
              : "Bình thường",
          "Người Chịu Trách Nhiệm Chính":
            t.assignedToUser?.fullName || t.assignedToRole,
          "Người Giao Việc": t.assignedBy?.fullName || "Ban Điều Hành",
          "Người Phối Hợp": t.collaborators || "",
          "Ngày Bắt Đầu": new Date(t.startDate).toLocaleDateString("vi-VN"),
          "Hạn Thực Hiện": new Date(t.endDate).toLocaleDateString("vi-VN"),
          "Trạng Thái Luồng":
            WORKFLOW_STATUS_LABELS[
              wfStatus as keyof typeof WORKFLOW_STATUS_LABELS
            ] || wfStatus,
          "Nhãn Thời Hạn": t.deadlineInfo?.label || "",
          "Vướng Mắc Tồn Đọng":
            unresolved.length > 0
              ? `${unresolved.length} vướng mắc đang xử lý`
              : "Không có",
        }
      })

      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "QA_Workspace_KTDBCL")
      XLSX.writeFile(
        wb,
        `QA_Workspace_KTDBCL_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      setTaskToast({
        msg: "✅ Đã xuất file Excel thành công!",
        type: "success",
      })
      setTimeout(() => setTaskToast(null), 3000)
    } catch (e: any) {
      alert("Lỗi xuất Excel: " + e.message)
    }
  }

  // Filter tasks with full Team, Priority, and Context awareness (dùng chung cho cả 5 chế độ)
  const displayedTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      let matchTeam = true
      if (selectedTeamFilter === "MY_TASKS") {
        matchTeam =
          t.assignedToUserId === currentUserId ||
          (t.collaborators && t.collaborators.includes(currentUserId)) ||
          (Array.isArray(t.qaMeta?.collaboratorUserIds) &&
            t.qaMeta.collaboratorUserIds.includes(currentUserId))
      } else if (selectedTeamFilter === "BLOCKERS") {
        matchTeam = (t.comments || []).some(
          (c: any) =>
            c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
        )
      } else if (selectedTeamFilter === "PENDING_REVIEW") {
        matchTeam = t.qaMeta?.workflowStatus === "PENDING_REVIEW"
      } else if (selectedTeamFilter !== "ALL") {
        matchTeam =
          t.taskGroupId === selectedTeamFilter ||
          t.taskGroup?.id === selectedTeamFilter ||
          t.taskGroup?.name === selectedTeamFilter
      }

      const matchPriority =
        filterPriority === "ALL" || (t.priority || "MEDIUM") === filterPriority

      const wfStatus =
        t.qaMeta?.workflowStatus ||
        (t.progress === "COMPLETED"
          ? "COMPLETED"
          : t.progress === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "ASSIGNED")
      const matchProgress =
        filterProgress === "ALL" ||
        (filterProgress === "OVERDUE"
          ? Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
          : wfStatus === filterProgress)

      const matchCategory =
        filterCategory === "ALL" || t.category === filterCategory
      const matchAcceptance =
        filterAcceptance === "ALL" ||
        (t.acceptanceStatus || "WAITING_CONFIRMATION") === filterAcceptance
      const matchYear =
        filterYear === "ALL" || t.academicYearId === filterYear

      const taskPosCodes: string[] = Array.isArray(t.qaMeta?.scopeMeta?.positionCodes)
        ? t.qaMeta.scopeMeta.positionCodes
        : []
      const matchPosition =
        filterPosition === "ALL" || taskPosCodes.includes(filterPosition)

      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.category && t.category.toLowerCase().includes(query)) ||
        (t.taskGroup?.name &&
          t.taskGroup.name.toLowerCase().includes(query)) ||
        (t.assignedToUser?.fullName &&
          t.assignedToUser.fullName.toLowerCase().includes(query)) ||
        (t.assignedBy?.fullName &&
          t.assignedBy.fullName.toLowerCase().includes(query))

      return (
        matchTeam &&
        matchPriority &&
        matchProgress &&
        matchCategory &&
        matchAcceptance &&
        matchYear &&
        matchPosition &&
        matchQuery
      )
    })
  }, [
    tasks,
    selectedTeamFilter,
    currentUserId,
    filterPriority,
    filterProgress,
    filterCategory,
    filterAcceptance,
    filterYear,
    filterPosition,
    searchQuery,
  ])

  const filterCategoriesList = categoriesList.map((c: any) => c.name)

  // Thống kê chuẩn quản trị (Tách Chờ duyệt khỏi Hoàn thành; Tách Chậm thực hiện và Chậm duyệt)
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(
      (t: any) => (t.qaMeta?.workflowStatus || t.progress) === "COMPLETED"
    ).length
    const pendingReview = tasks.filter(
      (t: any) => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
    ).length
    const inProgress = tasks.filter(
      (t: any) => (t.qaMeta?.workflowStatus || t.progress) === "IN_PROGRESS"
    ).length
    const overdueExecution = tasks.filter(
      (t: any) =>
        t.deadlineInfo?.code === "OVERDUE_EXECUTION" ||
        (t.progress === "OVERDUE" && !t.deadlineInfo)
    ).length
    const overdueReview = tasks.filter(
      (t: any) => t.deadlineInfo?.code === "OVERDUE_REVIEW"
    ).length
    const totalOverdue = overdueExecution + overdueReview
    const blockers = tasks.filter((t: any) =>
      (t.comments || []).some(
        (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
      )
    ).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      completed,
      pendingReview,
      inProgress,
      overdueExecution,
      overdueReview,
      totalOverdue,
      blockers,
      completionRate,
    }
  }, [tasks])

  // Calendar grid days for "Lịch" mode
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7 // Monday = 0
    const days: Array<{ date: Date | null; tasks: any[] }> = []

    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, tasks: [] })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const curDate = new Date(year, month, d)
      const dateStr = curDate.toISOString().slice(0, 10)
      const dayTasks = displayedTasks.filter((t: any) => {
        const endStr = new Date(t.endDate).toISOString().slice(0, 10)
        return endStr === dateStr
      })
      days.push({ date: curDate, tasks: dayTasks })
    }
    return days
  }, [calendarMonth, displayedTasks])

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto bg-slate-50/60 min-h-screen">
      {/* Toast Notification */}
      {taskToast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-top-4 duration-300 ${
            taskToast.type === "success"
              ? "bg-emerald-600 border-emerald-500 text-white"
              : "bg-red-600 border-red-500 text-white"
          }`}
        >
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <div className="flex-1">
            <p className="font-bold text-sm">Thông báo QA Workspace</p>
            <p className="text-xs opacity-95">{taskToast.msg}</p>
          </div>
          <button
            onClick={() => setTaskToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER BAR — QA WORKSPACE | KT&ĐBCL (Academic Ledger) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="border-l-4 border-[#003B3A] pl-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[#003B3A]">
              Điều hành &amp; giao việc — Ban KT&amp;ĐBCL
            </h1>
            <span className="text-xs px-2.5 py-0.5 bg-[#F0FDFA] text-[#00736E] border border-teal-200 rounded-lg font-semibold tabular-nums">
              {stats.total} nhiệm vụ • Nghiệm thu {stats.completionRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ theo nhóm và cá nhân, điều phối đầu việc, và nhận gợi ý trực tiếp từ Trợ lý QA trên dữ liệu SSM.
          </p>
        </div>

        {/* 4 CHẾ ĐỘ LÀM VIỆC TINH GỌN + CÁC HÀNH ĐỘNG CỐT LÕI */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#F8FAFC] p-1 rounded-xl flex items-center border border-[#E2E8F0] overflow-x-auto">
            {[
              {
                id: "workspace" as QaWorkspaceViewMode,
                label: "Nhóm & cá nhân",
                icon: Users,
              },
              {
                id: "positions" as QaWorkspaceViewMode,
                label: "Nhiệm vụ theo vị trí",
                icon: Briefcase,
              },
              {
                id: "list" as QaWorkspaceViewMode,
                label: "Danh sách",
                icon: LayoutList,
              },
              {
                id: "kanban" as QaWorkspaceViewMode,
                label: "Dashboard trạng thái",
                icon: Kanban,
              },
              {
                id: "calendar" as QaWorkspaceViewMode,
                label: "Lịch",
                icon: Calendar,
              },
            ].map(m => {
              const Icon = m.icon
              const active = viewMode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAssistantPanel(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0FDFA] hover:bg-teal-100/80 text-[#003B3A] border border-teal-200 font-semibold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#008B85]" />
            Trợ lý QA
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] font-semibold text-xs cursor-pointer"
              title="Nhắc việc thông minh"
            >
              <Bell className="w-3.5 h-3.5 text-[#D97706]" />
              Nhắc việc
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowCategoryManager(true)
                setCatTab("groups")
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] font-semibold text-xs cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Nhóm &amp; cấu hình
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenNewAssignment()}
            className="inline-flex items-center gap-1.5 bg-[#003B3A] hover:bg-[#005250] text-white px-3.5 py-2 rounded-xl transition-all shadow-xs font-semibold text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Giao việc mới
          </button>
        </div>
      </div>

      {/* THANH BỘ LỌC PHẠM VI NHÓM & TRẠNG THÁI DÙNG CHUNG CHO CẢ 5 CHẾ ĐỘ */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-teal-800" /> Phạm vi:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTeamFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
              selectedTeamFilter === "ALL"
                ? "bg-teal-500 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toàn Ban KT&ĐBCL ({tasks.length})
          </button>

          {taskGroupsList.map((g: any) => {
            const groupTasksCount = tasks.filter(
              (t: any) =>
                t.taskGroupId === g.id ||
                t.taskGroup?.id === g.id ||
                t.taskGroup?.name === g.name
            ).length
            const isSelected =
              selectedTeamFilter === g.id || selectedTeamFilter === g.name
            return (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setSelectedTeamFilter(isSelected ? "ALL" : g.id)
                }
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-teal-500 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {g.name} ({groupTasksCount})
              </button>
            )
          })}

          <button
            type="button"
            onClick={() =>
              setSelectedTeamFilter(
                selectedTeamFilter === "MY_TASKS" ? "ALL" : "MY_TASKS"
              )
            }
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              selectedTeamFilter === "MY_TASKS"
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-800 hover:bg-teal-100"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Việc của tôi
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedTeamFilter(
                selectedTeamFilter === "PENDING_REVIEW"
                  ? "ALL"
                  : "PENDING_REVIEW"
              )
            }
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              selectedTeamFilter === "PENDING_REVIEW"
                ? "bg-teal-500 text-white"
                : "bg-teal-50 text-teal-800 hover:bg-teal-50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Chờ duyệt ({stats.pendingReview})
          </button>
        </div>

        {/* Chọn Tổ chuyên môn mặc định, Tìm kiếm nhanh & lọc năm học / ưu tiên */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-extrabold text-teal-800 whitespace-nowrap">
              Tổ chuyên môn:
            </span>
            <select
              value={selectedDepartment}
              onChange={e => {
                setSelectedDepartment(e.target.value)
                setModalMemberDeptFilter(e.target.value)
              }}
              className="bg-transparent text-xs font-extrabold text-teal-800 outline-none cursor-pointer"
            >
              {(roles && roles.length > 0
                ? roles
                : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
              ).map((r: any) => (
                <option key={r.code} value={r.code}>
                  {r.name} {r.code === defaultDepartment ? "(Mặc định)" : ""}
                </option>
              ))}
              <option value="ALL">Tất cả Tổ chuyên môn</option>
            </select>
            {selectedDepartment !== "ALL" &&
            selectedDepartment !== defaultDepartment ? (
              <button
                type="button"
                onClick={() => handleSetDefaultDepartment(selectedDepartment)}
                className="px-2 py-0.5 rounded-lg bg-teal-500 hover:bg-teal-500 text-white text-[10px] font-extrabold whitespace-nowrap cursor-pointer"
                title="Đặt Tổ chuyên môn này làm mặc định khi mở QA Workspace"
              >
                Đặt mặc định
              </button>
            ) : (
              selectedDepartment === defaultDepartment && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold whitespace-nowrap">
                  ★ Mặc định
                </span>
              )
            )}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tên việc, người nhận, nhóm..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-teal-200 outline-none"
            />
          </div>
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-slate-50"
          >
            <option value="ALL">Tất cả năm học</option>
            {(years || []).map((y: any) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          {positionCatalog.positions.length > 0 && (
            <select
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
              className="border border-teal-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-[#F0FDFA] text-[#003B3A]"
            >
              <option value="ALL">Mọi vị trí ({positionCatalog.positions.length})</option>
              {positionCatalog.positions.map((pos) => (
                <option key={pos.positionCode} value={pos.positionCode}>
                  {pos.positionCode} — {pos.positionName}
                </option>
              ))}
            </select>
          )}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-slate-50"
          >
            <option value="ALL">Mọi mức ưu tiên</option>
            {PRIORITY_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================================
       * CHẾ ĐỘ 1: KHÔNG GIAN CÔNG VIỆC (MỤC II.1 — LƯỚI THẺ CHỨC NĂNG 3/2/1 CỘT)
       * ===================================================================== */}
      {viewMode === "workspace" && (
        <WorkspaceCardsView
          tasks={displayedTasks}
          taskGroups={taskGroupsList}
          allStaffUsers={scopedStaffUsers}
          sourceModules={initialSourceModules}
          improvementActions={initialImprovementActions}
          canManage={isAdmin}
          onAssignToCardGroup={handleAssignToCardGroup}
          onSelectGroupScope={groupId => {
            setSelectedTeamFilter(groupId)
            setViewMode("list")
          }}
          onSelectMember={uid => setSelectedMemberId(uid)}
          onOpenAssistant={prompt => {
            if (prompt) setAssistantInitialPrompt(prompt)
            setShowAssistantPanel(true)
          }}
          onOpenGroupManager={() => {
            setShowCategoryManager(true)
            setCatTab("groups")
          }}
          onOpenCapaModal={act => {
            setEditingCapaAction(act || null)
            setShowCapaModal(true)
          }}
          onSyncSourceRecord={handleSyncSourceRecord}
          syncingRecordId={syncingRecordId}
        />
      )}

      {/* =====================================================================
       * CHẾ ĐỘ 2: PHÒNG ĐIỀU HÀNH (MỤC II.2 — PHÒNG HỌP 3D/2D TRỰC QUAN)
       * ===================================================================== */}
      {viewMode === "command_room" && (
        <CommandRoomView
          tasks={displayedTasks}
          taskGroups={taskGroupsList}
          allStaffUsers={allStaffUsers}
          selectedGroupId={selectedTeamFilter}
          selectedDepartment={selectedDepartment}
          defaultDepartment={defaultDepartment}
          departments={roles}
          onChangeDepartment={dept => {
            setSelectedDepartment(dept)
            setModalMemberDeptFilter(dept)
          }}
          onSetDefaultDepartment={handleSetDefaultDepartment}
          onSelectMember={uid => setSelectedMemberId(uid)}
          onQuickAssignMember={handleQuickAssignMember}
          onQuickAssignGroup={groupId =>
            handleOpenNewAssignment({
              assignmentMode: "GROUP",
              taskGroupId: groupId,
            })
          }
          onSelectTask={t => setDetailTask(t)}
        />
      )}

      {/* =====================================================================
       * CHẾ ĐỘ 2B: NHIỆM VỤ THEO VỊ TRÍ (07 VỊ TRÍ & 78 MẪU RACI BAN KT&ĐBCL)
       * ===================================================================== */}
      {viewMode === "positions" && (
        <PositionTasksView
          catalog={positionCatalog}
          onCatalogChange={setPositionCatalog}
          allStaffUsers={ktdbclStaffUsers.length > 0 ? ktdbclStaffUsers : allStaffUsers}
          years={years}
          campuses={campuses}
          canConfigure={isAdmin}
          onAssignFromTemplate={(template, selectedPosCode) => {
            setEditingTaskForModal(null)
            setPresetAssignmentDraft({
              templateId: template.id,
              selectedPositionCode: selectedPosCode || template.rPositions[0] || null,
              title: template.title,
              deliverables: template.deliverables,
              completionCriteria: template.completionCriteria,
            })
            setShowAssignmentModal(true)
          }}
          onBatchTasksCreated={() => {
            setTimeout(() => window.location.reload(), 700)
          }}
        />
      )}

      {/* =====================================================================
       * CHẾ ĐỘ 3: DANH SÁCH NHIỆM VỤ CHI TIẾT (LIST VIEW — ACADEMIC LEDGER)
       * ===================================================================== */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Unified Academic Ledger Summary Strip */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] overflow-hidden tabular-nums">
            <button
              type="button"
              onClick={() =>
                setFilterProgress(
                  filterProgress === "COMPLETED" ? "ALL" : "COMPLETED"
                )
              }
              className={`p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                filterProgress === "COMPLETED"
                  ? "bg-[#F0FDFA]"
                  : "hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Hoàn thành ({stats.completionRate}%)
                </p>
                <p className="text-xl font-bold text-[#059669] mt-0.5">
                  {stats.completed}
                  <span className="text-xs font-medium text-slate-400">
                    /{stats.total}
                  </span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#059669] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterProgress(
                  filterProgress === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS"
                )
              }
              className={`p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                filterProgress === "IN_PROGRESS"
                  ? "bg-[#F0FDFA]"
                  : "hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Đang thực hiện
                </p>
                <p className="text-xl font-bold text-[#003B3A] mt-0.5">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#008B85] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterProgress(
                  filterProgress === "PENDING_REVIEW" ? "ALL" : "PENDING_REVIEW"
                )
              }
              className={`p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                filterProgress === "PENDING_REVIEW"
                  ? "bg-amber-50/60"
                  : "hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Đang chờ duyệt
                </p>
                <p className="text-xl font-bold text-[#D97706] mt-0.5">
                  {stats.pendingReview}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-[#D97706] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterProgress(
                  filterProgress === "OVERDUE" ? "ALL" : "OVERDUE"
                )
              }
              className={`p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                filterProgress === "OVERDUE"
                  ? "bg-rose-50/70"
                  : "hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Quá hạn ({stats.overdueExecution} TH · {stats.overdueReview} duyệt)
                </p>
                <p className="text-xl font-bold text-[#E11D48] mt-0.5">
                  {stats.totalOverdue}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 text-[#E11D48] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Main Ledger Table Card with Status Filter Tags */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
              {/* Left: Title + Interactive Status Tags */}
              <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                <h2 className="text-sm font-bold text-[#003B3A] whitespace-nowrap">
                  Danh sách nhiệm vụ ({displayedTasks.length})
                </h2>

                <div className="hidden sm:block w-px h-4 bg-[#E2E8F0]" />

                <div
                  role="tablist"
                  aria-label="Lọc theo trạng thái nhiệm vụ"
                  className="inline-flex flex-wrap items-center gap-1.5"
                >
                  {[
                    {
                      id: "ALL",
                      label: "Tất cả",
                      count: stats.total,
                      dot: "bg-slate-400",
                      activeCls:
                        "bg-[#003B3A] text-white border-[#003B3A]",
                      idleCls:
                        "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:border-slate-300 hover:text-[#003B3A]",
                    },
                    {
                      id: "IN_PROGRESS",
                      label: "Đang thực hiện",
                      count: stats.inProgress,
                      dot: "bg-[#00A19A]",
                      activeCls:
                        "bg-[#008B85] text-white border-[#008B85]",
                      idleCls:
                        "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1] hover:border-[#00A19A]/60",
                    },
                    {
                      id: "PENDING_REVIEW",
                      label: "Đang chờ duyệt",
                      count: stats.pendingReview,
                      dot: "bg-[#D97706]",
                      activeCls:
                        "bg-[#D97706] text-white border-[#D97706]",
                      idleCls:
                        "bg-amber-50 text-[#B45309] border-amber-200 hover:border-amber-300",
                    },
                    {
                      id: "COMPLETED",
                      label: "Hoàn thành",
                      count: stats.completed,
                      dot: "bg-[#059669]",
                      activeCls:
                        "bg-[#059669] text-white border-[#059669]",
                      idleCls:
                        "bg-emerald-50 text-[#047857] border-emerald-200 hover:border-emerald-300",
                    },
                    ...(stats.totalOverdue > 0
                      ? [
                          {
                            id: "OVERDUE",
                            label: "Quá hạn",
                            count: stats.totalOverdue,
                            dot: "bg-[#E11D48]",
                            activeCls:
                              "bg-[#E11D48] text-white border-[#E11D48]",
                            idleCls:
                              "bg-rose-50 text-[#BE123C] border-rose-200 hover:border-rose-300",
                          },
                        ]
                      : []),
                  ].map((tag) => {
                    const isActive = filterProgress === tag.id
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setFilterProgress(tag.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isActive ? tag.activeCls : tag.idleCls
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-white" : tag.dot
                          }`}
                        />
                        <span>{tag.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[11px] font-bold leading-tight ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white/80 text-current"
                          }`}
                        >
                          {tag.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right: Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#003B3A] cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#059669]" />
                <span>Xuất Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1060px] tabular-nums">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-11 font-semibold text-teal-100">STT</th>
                    <th className="py-3 px-3 w-44 font-semibold text-teal-100">Nhóm &amp; danh mục</th>
                    <th className="py-3 px-3 min-w-[300px] font-semibold text-white">Nhiệm vụ &amp; sản phẩm</th>
                    <th className="py-3 px-3 w-48 font-semibold text-teal-100">Chịu trách nhiệm</th>
                    <th className="py-3 px-3 w-36 font-semibold text-teal-100">Hạn thực hiện</th>
                    <th className="py-3 px-3 w-48 font-semibold text-[#5EEAD4]">Trạng thái</th>
                    <th className="py-3 px-3 text-right w-40 font-semibold text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {displayedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        Không có nhiệm vụ nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayedTasks.map((t: any, i: number) => {
                      const wfStatus = (t.qaMeta?.workflowStatus ||
                        (t.progress === "COMPLETED"
                          ? "COMPLETED"
                          : t.progress === "IN_PROGRESS"
                          ? "IN_PROGRESS"
                          : "ASSIGNED")) as keyof typeof WORKFLOW_STATUS_LABELS
                      const isOverdue = Boolean(
                        t.deadlineInfo?.isOverdue || t.progress === "OVERDUE"
                      )
                      const isOverdueReview =
                        t.deadlineInfo?.code === "OVERDUE_REVIEW"
                      const blockers = (t.comments || []).filter(
                        (c: any) =>
                          c.commentType === "BLOCKER" &&
                          c.actionStatus !== "RESOLVED"
                      )

                      const statusBadge =
                        wfStatus === "COMPLETED"
                          ? {
                              label: "Hoàn thành",
                              cls: "bg-emerald-50 text-[#059669] border border-emerald-200",
                              dot: "bg-[#059669]",
                            }
                          : wfStatus === "PENDING_REVIEW"
                          ? {
                              label: "Đang chờ duyệt",
                              cls: "bg-amber-50 text-[#B45309] border border-amber-200",
                              dot: "bg-[#D97706]",
                            }
                          : wfStatus === "IN_PROGRESS"
                          ? {
                              label: "Đang thực hiện",
                              cls: "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]",
                              dot: "bg-[#00A19A]",
                            }
                          : wfStatus === "NEEDS_REVISION"
                          ? {
                              label: "Cần bổ sung",
                              cls: "bg-amber-50 text-[#D97706] border border-amber-200",
                              dot: "bg-[#D97706]",
                            }
                          : {
                              label: WORKFLOW_STATUS_LABELS[wfStatus] || "Đã giao",
                              cls: "bg-slate-100 text-slate-600 border border-slate-200",
                              dot: "bg-slate-400",
                            }

                      return (
                        <tr
                          key={t.id}
                          className={`transition-colors align-middle ${
                            isOverdue
                              ? "bg-rose-50/25 hover:bg-rose-50/45"
                              : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-medium text-slate-400">
                            {i + 1}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col items-start gap-1">
                              {t.taskGroup?.name && (
                                <span className="text-[11px] font-semibold text-[#003B3A] bg-[#F0FDFA] border border-[#CCFBF1] px-2 py-0.5 rounded-md leading-tight">
                                  {t.taskGroup.name}
                                </span>
                              )}
                              <span
                                className={`border font-medium px-2 py-0.5 rounded-md text-[11px] leading-tight ${getCategoryBadgeStyle(
                                  t.category
                                )}`}
                              >
                                {t.category || "Công việc"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-start gap-1.5 flex-wrap">
                              {t.priority === "URGENT" && (
                                <span className="bg-rose-50 text-[#E11D48] border border-rose-200 font-semibold text-[11px] px-2 py-0.5 rounded-md leading-tight shrink-0">
                                  Khẩn cấp
                                </span>
                              )}
                              {t.priority === "HIGH" && (
                                <span className="bg-amber-50 text-[#D97706] border border-amber-200 font-semibold text-[11px] px-2 py-0.5 rounded-md leading-tight shrink-0">
                                  Ưu tiên cao
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setDetailTask(t)}
                                className="font-semibold text-slate-900 hover:text-[#00736E] text-left cursor-pointer leading-snug"
                              >
                                {t.title}
                              </button>
                            </div>
                            {t.qaMeta?.deliverables && (
                              <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                Sản phẩm: {t.qaMeta.deliverables}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {(t.checklistStats?.totalSteps ?? 0) > 0 && (
                                <span className="text-[11px] font-medium text-[#00736E]">
                                  Checklist: {t.checklistStats?.completedSteps ?? 0}/
                                  {t.checklistStats?.totalSteps ?? 0} (
                                  {t.checklistStats?.percent ?? 0}%)
                                </span>
                              )}
                              {blockers.length > 0 && (
                                <span className="text-[11px] font-semibold text-[#E11D48] bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                  {blockers.length} vướng mắc
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {t.assignedToUser ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedMemberId(t.assignedToUser.id)
                                }
                                className="font-semibold text-[#003B3A] hover:text-[#008B85] hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                              >
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{t.assignedToUser.fullName}</span>
                              </button>
                            ) : (
                              <span className="text-slate-700 font-semibold">
                                {t.assignedToRole}
                              </span>
                            )}
                            {t.reviewerUser && (
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                Duyệt: {t.reviewerUser.fullName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 whitespace-nowrap">
                              {new Date(t.endDate).toLocaleDateString("vi-VN")}
                            </div>
                            {isOverdue && (
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                                  isOverdueReview
                                    ? "bg-amber-50 text-[#B45309] border border-amber-200"
                                    : "bg-rose-50 text-[#E11D48] border border-rose-200"
                                }`}
                              >
                                {isOverdueReview
                                  ? "Chậm duyệt"
                                  : "Chậm thực hiện"}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${statusBadge.cls}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBadge.dot}`}
                              />
                              <span>{statusBadge.label}</span>
                            </span>
                            {wfStatus !== "DRAFT" && wfStatus !== "CANCELLED" && (
                              <div className="text-[11px] font-medium mt-1 whitespace-nowrap">
                                {(t.acceptanceStatus || "WAITING_CONFIRMATION") ===
                                  "WAITING_CONFIRMATION" && wfStatus === "ASSIGNED" ? (
                                  <span className="text-[#D97706]">
                                    Chờ xác nhận nhận việc
                                  </span>
                                ) : t.acceptanceStatus === "REJECTED" ? (
                                  <span className="text-[#E11D48]">
                                    Có phản hồi nhận việc
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    Đã xác nhận nhận việc
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              {(t.acceptanceStatus || "WAITING_CONFIRMATION") ===
                                "WAITING_CONFIRMATION" &&
                                wfStatus === "ASSIGNED" &&
                                (t.assignedToUserId === currentUserId || isAdmin) && (
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleConfirmTaskAction(t.id)}
                                    className="px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                    title="Xác nhận tiếp nhận nhiệm vụ ngay"
                                  >
                                    Xác nhận
                                  </button>
                                )}
                              <button
                                type="button"
                                onClick={() => setDetailTask(t)}
                                className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] rounded-lg cursor-pointer"
                                title="Mở chi tiết, xác nhận & nghiệm thu"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRemind(t.id)}
                                    className="p-1.5 text-[#D97706] hover:bg-amber-50 rounded-lg cursor-pointer"
                                    title="Gửi email & thông báo nhắc việc"
                                  >
                                    <Bell className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditTask(t)}
                                    className="p-1.5 text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Chỉnh sửa phiếu"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(t.id)}
                                    className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * CHẾ ĐỘ 4: DASHBOARD TRẠNG THÁI CÔNG VIỆC & BẢNG ĐẦU VIỆC (ACADEMIC LEDGER)
       * ===================================================================== */}
      {viewMode === "kanban" && (() => {
        const statusBuckets = [
          {
            key: "ASSIGNED" as const,
            match: ["DRAFT", "ASSIGNED", "PENDING"],
            title: "Nháp / Đã giao",
            barColor: "bg-slate-500",
            accentBorder: "border-t-slate-500",
            badgeCls: "bg-slate-100 text-slate-700 border-slate-200",
            countCls: "text-slate-800",
          },
          {
            key: "IN_PROGRESS" as const,
            match: ["IN_PROGRESS"],
            title: "Đang thực hiện",
            barColor: "bg-[#00A19A]",
            accentBorder: "border-t-[#00A19A]",
            badgeCls: "bg-[#F0FDFA] text-[#00736E] border-teal-200",
            countCls: "text-[#00736E]",
          },
          {
            key: "PENDING_REVIEW" as const,
            match: ["PENDING_REVIEW"],
            title: "Chờ duyệt nghiệm thu",
            barColor: "bg-[#003B3A]",
            accentBorder: "border-t-[#003B3A]",
            badgeCls: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/25",
            countCls: "text-[#003B3A]",
          },
          {
            key: "NEEDS_REVISION" as const,
            match: ["NEEDS_REVISION", "PAUSED"],
            title: "Cần bổ sung / Tạm dừng",
            barColor: "bg-[#D97706]",
            accentBorder: "border-t-[#D97706]",
            badgeCls: "bg-amber-50 text-[#D97706] border-amber-200",
            countCls: "text-[#D97706]",
          },
          {
            key: "COMPLETED" as const,
            match: ["COMPLETED"],
            title: "Đã hoàn thành",
            barColor: "bg-[#059669]",
            accentBorder: "border-t-[#059669]",
            badgeCls: "bg-emerald-50 text-[#059669] border-emerald-200",
            countCls: "text-[#059669]",
          },
        ]

        const totalCount = displayedTasks.length
        const bucketMetrics = statusBuckets.map(bucket => {
          const items = displayedTasks.filter((t: any) => {
            const st = t.qaMeta?.workflowStatus || t.progress
            return bucket.match.includes(st)
          })
          const overdueCount = items.filter((t: any) => Boolean(t.deadlineInfo?.isOverdue)).length
          const pct = totalCount > 0 ? Math.round((items.length / totalCount) * 100) : 0
          return { ...bucket, items, count: items.length, overdueCount, pct }
        })

        const totalOverdueInScope = displayedTasks.filter((t: any) =>
          Boolean(t.deadlineInfo?.isOverdue)
        ).length
        const completedCount =
          bucketMetrics.find(b => b.key === "COMPLETED")?.count || 0
        const completedRate =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        const activeBucket =
          dashboardStatusFilter === "ALL"
            ? null
            : bucketMetrics.find(b => b.key === dashboardStatusFilter) || null

        const tableTasks = displayedTasks.filter((t: any) => {
          if (activeBucket) {
            const st = t.qaMeta?.workflowStatus || t.progress
            if (!activeBucket.match.includes(st)) return false
          }
          if (dashboardOverdueOnly && !t.deadlineInfo?.isOverdue) return false
          return true
        })

        const getStatusMeta = (rawStatus: string) => {
          const found = statusBuckets.find(b => b.match.includes(rawStatus))
          return (
            found || {
              title: rawStatus || "Khác",
              badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
            }
          )
        }

        return (
          <div className="space-y-5 tabular-nums">
            {/* 1. DASHBOARD TRẠNG THÁI CÔNG VIỆC */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
                <div className="border-l-4 border-[#003B3A] pl-3">
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    Dashboard trạng thái công việc
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tổng quan phân bổ {totalCount} đầu việc theo 5 trạng thái luồng xử lý — nhấp từng thẻ để lọc nhanh bảng bên dưới
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                    Hoàn thành: {completedCount}/{totalCount} ({completedRate}%)
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg border ${
                      totalOverdueInScope > 0
                        ? "bg-rose-50 text-[#E11D48] border-rose-200"
                        : "bg-emerald-50 text-[#059669] border-emerald-200"
                    }`}
                  >
                    Chậm hạn: {totalOverdueInScope}
                  </span>
                </div>
              </div>

              {/* 5 Thẻ trạng thái tương tác */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {bucketMetrics.map(b => {
                  const isSelected = dashboardStatusFilter === b.key
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() =>
                        setDashboardStatusFilter(isSelected ? "ALL" : b.key)
                      }
                      className={`text-left rounded-xl border border-t-[3px] p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        b.accentBorder
                      } ${
                        isSelected
                          ? "bg-[#F0FDFA]/80 border-[#003B3A] ring-1 ring-[#003B3A]/20 shadow-xs"
                          : "bg-[#F8FAFC]/70 border-[#E2E8F0] hover:bg-white hover:border-[#00A19A]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 leading-snug">
                          {b.title}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          {b.pct}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`text-2xl font-bold ${b.countCls}`}>
                          {b.count}
                        </span>
                        {b.overdueCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
                            {b.overdueCount} chậm
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">đầu việc</span>
                        )}
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${b.barColor}`}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Thanh phân bổ tỷ trọng 5 trạng thái */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100 border border-[#E2E8F0] overflow-hidden flex gap-0.5 p-0.5">
                  {bucketMetrics
                    .filter(b => b.count > 0)
                    .map(b => (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() =>
                          setDashboardStatusFilter(
                            dashboardStatusFilter === b.key ? "ALL" : b.key
                          )
                        }
                        style={{ width: `${Math.max(b.pct, 4)}%` }}
                        title={`${b.title}: ${b.count} đầu việc (${b.pct}%)`}
                        className={`h-full rounded-full transition-opacity cursor-pointer ${b.barColor} ${
                          dashboardStatusFilter === "ALL" ||
                          dashboardStatusFilter === b.key
                            ? "opacity-100"
                            : "opacity-35 hover:opacity-80"
                        }`}
                      />
                    ))}
                </div>
              </div>
            </div>

            {/* 2. BẢNG DANH SÁCH CÁC ĐẦU VIỆC (SKY-LINE ACADEMIC LEDGER TABLE) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#003B3A]">
                    Bảng danh sách các đầu việc ({tableTasks.length}/{totalCount})
                  </span>

                  {activeBucket && (
                    <button
                      type="button"
                      onClick={() => setDashboardStatusFilter("ALL")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors cursor-pointer"
                    >
                      Trạng thái: {activeBucket.title} ×
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDashboardOverdueOnly(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      dashboardOverdueOnly
                        ? "bg-[#E11D48] text-white border-[#E11D48]"
                        : "bg-white text-[#E11D48] border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Chỉ việc chậm hạn ({totalOverdueInScope})
                  </button>

                  {(dashboardStatusFilter !== "ALL" || dashboardOverdueOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDashboardStatusFilter("ALL")
                        setDashboardOverdueOnly(false)
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] hover:bg-slate-50 cursor-pointer"
                    >
                      Đặt lại lọc
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#003B3A] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#059669]" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse tabular-nums">
                  <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="py-3 px-3 text-white text-center w-12">STT</th>
                      <th className="py-3 px-3 text-white min-w-[280px]">Tên đầu việc</th>
                      <th className="py-3 px-3 text-teal-100 min-w-[140px]">Nhóm chuyên môn</th>
                      <th className="py-3 px-3 text-teal-100 min-w-[150px]">Người phụ trách</th>
                      <th className="py-3 px-3 text-[#5EEAD4] text-center min-w-[155px]">Trạng thái</th>
                      <th className="py-3 px-3 text-teal-100 text-center min-w-[135px]">Hạn bàn giao</th>
                      <th className="py-3 px-3 text-white text-right min-w-[105px]">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {tableTasks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-xs text-slate-500"
                        >
                          Không có đầu việc nào phù hợp với bộ lọc trạng thái hiện tại.
                        </td>
                      </tr>
                    ) : (
                      tableTasks.map((t: any, idx: number) => {
                        const rawSt = t.qaMeta?.workflowStatus || t.progress
                        const stMeta = getStatusMeta(rawSt)
                        const isOverdue = Boolean(t.deadlineInfo?.isOverdue)
                        const overdueLabel =
                          t.deadlineInfo?.code === "OVERDUE_REVIEW"
                            ? "Chậm duyệt"
                            : "Chậm thực hiện"

                        return (
                          <tr
                            key={t.id}
                            onClick={() => setDetailTask(t)}
                            className={`transition-colors align-middle cursor-pointer ${
                              isOverdue
                                ? "bg-rose-50/25 hover:bg-rose-50/50"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-[#003B3A] leading-snug">
                                {t.title}
                              </div>
                              {t.priority &&
                                (t.priority === "HIGH" || t.priority === "URGENT") && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                                    Ưu tiên {t.priority === "URGENT" ? "khẩn cấp" : "cao"}
                                  </span>
                                )}
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] text-[11px] font-medium">
                                {t.taskGroup?.name || t.category || "KT&ĐBCL"}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                              {t.assignedToUser?.fullName || t.assignedToRole || "Chưa phân công"}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stMeta.badgeCls}`}
                              >
                                {stMeta.title}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="font-semibold text-slate-700">
                                {t.endDate
                                  ? new Date(t.endDate).toLocaleDateString("vi-VN")
                                  : "—"}
                              </div>
                              {isOverdue ? (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
                                  {overdueLabel}
                                </span>
                              ) : rawSt === "COMPLETED" ? (
                                <span className="text-[10px] text-[#059669] font-medium">
                                  Đã nghiệm thu
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Đúng tiến độ</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  setDetailTask(t)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FDFA] hover:bg-teal-100 text-[#003B3A] border border-teal-200 transition-colors cursor-pointer"
                              >
                                Chi tiết
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
          </div>
        )
      })()}

      {/* =====================================================================
       * CHẾ ĐỘ 5: LỊCH CÔNG VIỆC & MỐC BÀN GIAO (CALENDAR VIEW)
       * ===================================================================== */}
      {viewMode === "calendar" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-800" />
                Lịch Điều hành & Mốc Bàn giao Nhiệm vụ — Tháng{" "}
                {calendarMonth.getMonth() + 1}/{calendarMonth.getFullYear()}
              </h3>
              <p className="text-xs text-slate-500">
                Hiển thị các nhiệm vụ theo hạn bàn giao trong tháng. Nhấn vào nhiệm vụ để xem chi tiết hoặc nghiệm thu.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Tháng hiện tại
              </button>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-500 uppercase pb-1 border-b border-slate-200">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
            <div>CN</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.date) {
                return (
                  <div
                    key={idx}
                    className="min-h-[104px] rounded-xl bg-slate-50/50 border border-slate-100"
                  />
                )
              }
              const isToday =
                cell.date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={idx}
                  className={`min-h-[104px] rounded-xl border p-2 flex flex-col justify-between ${
                    isToday
                      ? "border-teal-200 bg-teal-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center"
                          : "text-slate-700"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {cell.tasks.length > 0 && (
                      <span className="text-[10px] font-bold text-teal-800">
                        {cell.tasks.length} việc
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                    {cell.tasks.map((t: any) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDetailTask(t)}
                        className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-bold truncate cursor-pointer ${
                          (t.qaMeta?.workflowStatus || t.progress) === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-900"
                            : t.deadlineInfo?.isOverdue
                            ? "bg-rose-100 text-rose-900"
                            : "bg-teal-50 text-teal-800"
                        }`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
       * PANEL & MODALS ĐIỀU HÀNH CHUYÊN SÂU
       * ===================================================================== */}

      {/* 1. Panel Chi tiết Nhiệm vụ & Luồng Duyệt Nghiệm thu (Mục V) */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          allStaffUsers={allStaffUsers}
          initialTab={searchParams?.get("tab")}
          initialAction={searchParams?.get("action")}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={() => window.location.reload()}
        />
      )}

      {/* 2. Panel Hồ sơ Thành viên & Công việc cá nhân (Mục III) */}
      <MemberWorkspacePanel
        memberId={selectedMemberId}
        allStaffUsers={allStaffUsers}
        taskGroups={taskGroupsList}
        tasks={tasks}
        canManage={isAdmin}
        onClose={() => setSelectedMemberId(null)}
        onAssignToMember={handleQuickAssignMember}
        onSelectTask={t => {
          setSelectedMemberId(null)
          setDetailTask(t)
        }}
        onRequestUpdate={async taskId => {
          await handleRemind(taskId)
        }}
      />

      {/* 3. Modal Phát hành Phiếu Giao việc 4 Phương thức (Mục IV) */}
      <TaskAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onSuccess={res => {
          if (res?.isDraft) {
            setTaskToast({
              msg: "Đã lưu phiếu giao việc ở trạng thái Nháp (chưa gửi email).",
              type: "success",
            })
          } else {
            const mailNote =
              res?.emailsSentCount && res.emailsSentCount > 0
                ? ` và gửi ${res.emailsSentCount} email thông báo đến các thành viên liên quan`
                : ""
            setTaskToast({
              msg: `Đã phát hành phiếu giao việc thành công${mailNote}!`,
              type: "success",
            })
          }
          setTimeout(() => window.location.reload(), 900)
        }}
        editingTask={editingTaskForModal}
        presetDraft={presetAssignmentDraft}
        taskGroups={taskGroupsList}
        dbCategories={categoriesList}
        allStaffUsers={allStaffUsers}
        years={years}
        campuses={campuses}
        defaultDepartment={
          selectedDepartment !== "ALL" ? selectedDepartment : defaultDepartment
        }
        departments={roles}
        positionCatalog={positionCatalog}
      />

      {/* 4. Panel QA Assistant — Trợ lý Điều hành AI/NLP (Mục VI) */}
      <QaAssistantPanel
        isOpen={showAssistantPanel}
        initialPrompt={assistantInitialPrompt}
        tasks={tasks}
        taskGroups={taskGroupsList}
        allStaffUsers={allStaffUsers}
        years={years}
        onClose={() => setShowAssistantPanel(false)}
        onTaskCreated={() => window.location.reload()}
        onOpenDetailedDraft={draft => {
          setShowAssistantPanel(false)
          handleOpenNewAssignment(draft)
        }}
        onSelectTask={t => {
          setShowAssistantPanel(false)
          setDetailTask(t)
        }}
        onSelectMember={uid => {
          setShowAssistantPanel(false)
          setSelectedMemberId(uid)
        }}
      />

      {/* 5. Modal Báo cáo & Dữ liệu Đa chiều có mẫu số N (Mục IX) */}
      <QaAnalyticsReportModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        tasks={tasks}
        taskGroups={taskGroupsList}
        allStaffUsers={allStaffUsers}
        campuses={campuses}
        improvementActions={initialImprovementActions}
      />

      {/* 6. Modal Nhắc việc thông minh 6 kịch bản & Việc định kỳ (Mục VII) */}
      <QaSmartReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        recentReminders={recentReminders}
        onDispatched={logs => setRecentReminders(logs)}
      />

      {/* 7. Modal Hồ sơ Hành động Cải tiến Chất lượng CAPA 5 bước (Mục VIII) */}
      <QaCapaActionModal
        isOpen={showCapaModal}
        onClose={() => setShowCapaModal(false)}
        editingAction={editingCapaAction}
        allStaffUsers={allStaffUsers}
        years={years}
        campuses={campuses}
        taskGroups={taskGroupsList}
        onSaved={() => window.location.reload()}
      />

      {/* 8. Modal Sổ tay Vận hành & Hướng dẫn QA Workspace Ban KT&ĐBCL */}
      <QaGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* 9. Modal Quản lý Nhóm, Điều phối viên, Thành viên & Phân quyền (Mục III) */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 border-b bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Quản lý Nhóm Chuyên môn, Điều phối viên & Phân quyền (Ban KT&ĐBCL)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tạo/sửa nhóm, chỉ định người điều phối và thành viên (1 người có thể tham gia nhiều nhóm)
                  </p>
                </div>
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl flex-wrap">
                <button
                  onClick={() => setCatTab("groups")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "groups"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4 text-teal-800" /> 1. Nhóm & Điều phối viên ({taskGroupsList.length})
                </button>
                <button
                  onClick={() => setCatTab("categories")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "categories"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutList className="w-4 h-4 text-teal-600" /> 2. Danh mục Nghiệp vụ ({categoriesList.length})
                </button>
                <button
                  onClick={() => setCatTab("settings")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "settings"
                      ? "bg-white text-teal-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Settings className="w-4 h-4 text-teal-800" /> 3. Phân quyền Workspace
                </button>
              </div>
            </div>

            {/* TAB 1: QUẢN LÝ NHÓM, NGƯỜI ĐIỀU PHỐI & THÀNH VIÊN */}
            {catTab === "groups" && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Bộ lọc Tổ chuyên môn mặc định cho danh sách nhân sự */}
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-extrabold text-teal-800">
                    Lọc nhân sự theo Tổ chuyên môn (Mặc định: {defaultDepartment})
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={modalMemberDeptFilter}
                      onChange={e => setModalMemberDeptFilter(e.target.value)}
                      className="border border-teal-200 rounded-xl px-2.5 py-1.5 bg-white font-extrabold text-teal-800"
                    >
                      {(roles && roles.length > 0
                        ? roles
                        : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                      ).map((r: any) => (
                        <option key={r.code} value={r.code}>
                          {r.name} {r.code === defaultDepartment ? "(Mặc định)" : ""}
                        </option>
                      ))}
                      <option value="ALL">Tất cả Tổ chuyên môn</option>
                    </select>
                    {modalMemberDeptFilter !== "ALL" &&
                      modalMemberDeptFilter !== defaultDepartment && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSetDefaultDepartment(modalMemberDeptFilter)
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-teal-500 text-white font-extrabold cursor-pointer"
                        >
                          Đặt làm Tổ mặc định
                        </button>
                      )}
                  </div>
                </div>

                {/* Form Tạo / Sửa Nhóm: Bước 1 Chọn Tổ CM -> Bước 2 Chọn Điều phối viên & Thành viên */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase">
                    {groupEditId
                      ? "Cập nhật thông tin Nhóm chuyên môn"
                      : "Tạo Nhóm chuyên môn mới (Chọn Tổ CM → Chọn Điều phối viên & Thành viên)"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">
                        Tên nhóm *
                      </label>
                      <input
                        type="text"
                        value={groupNameInput}
                        onChange={e => setGroupNameInput(e.target.value)}
                        placeholder="VD: Khảo thí Phổ thông"
                        className="w-full border rounded-xl p-2 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-teal-800 mb-1">
                        1. Chọn Tổ CM *
                      </label>
                      <select
                        value={groupDeptInput}
                        onChange={e => {
                          setGroupDeptInput(e.target.value)
                          setModalMemberDeptFilter(e.target.value)
                        }}
                        className="w-full border border-teal-200 rounded-xl p-2 bg-teal-50 font-extrabold text-teal-800"
                      >
                        {(roles && roles.length > 0
                          ? roles
                          : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                        ).map((r: any) => (
                          <option key={r.code} value={r.code}>
                            {r.name} {r.code === defaultDepartment ? "(Mặc định)" : ""}
                          </option>
                        ))}
                        <option value="ALL">Tất cả Tổ chuyên môn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">
                        2. Người điều phối nhóm (thuộc Tổ CM)
                      </label>
                      <select
                        value={groupLeaderInput}
                        onChange={e => setGroupLeaderInput(e.target.value)}
                        className="w-full border rounded-xl p-2 bg-white font-semibold"
                      >
                        <option value="">-- Chọn điều phối viên --</option>
                        {allStaffUsers
                          .filter(
                            (u: any) =>
                              isUserInDepartment(u, groupDeptInput) ||
                              u.id === groupLeaderInput
                          )
                          .map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} ({u.teacher?.departmentRel?.name || u.role})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">
                        Mô tả chức năng nhóm
                      </label>
                      <input
                        type="text"
                        value={groupDescInput}
                        onChange={e => setGroupDescInput(e.target.value)}
                        placeholder="Mô tả ngắn..."
                        className="w-full border rounded-xl p-2 bg-white"
                      />
                    </div>
                  </div>

                  {/* Bước 3: Chọn thành viên nhóm từ Tổ CM vừa chọn */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="font-bold text-slate-700">
                        3. Chọn thành viên tham gia nhóm từ Tổ{" "}
                        <span className="text-teal-800 font-extrabold">
                          {groupDeptInput === "ALL" ? "Toàn trường" : groupDeptInput}
                        </span>{" "}
                        ({groupMemberIdsInput.length} thành viên đã chọn)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const deptUserIds = allStaffUsers
                              .filter((u: any) =>
                                isUserInDepartment(u, groupDeptInput)
                              )
                              .map((u: any) => u.id)
                            setGroupMemberIdsInput(prev =>
                              Array.from(new Set([...prev, ...deptUserIds]))
                            )
                          }}
                          className="text-[11px] font-bold text-teal-800 hover:underline cursor-pointer"
                        >
                          + Chọn tất cả nhân sự Tổ này
                        </button>
                        {groupMemberIdsInput.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setGroupMemberIdsInput([])}
                            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                          >
                            Bỏ chọn hết
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                      {allStaffUsers
                        .filter(
                          (u: any) =>
                            isUserInDepartment(u, groupDeptInput) ||
                            groupMemberIdsInput.includes(u.id)
                        )
                        .map((u: any) => {
                          const selected = groupMemberIdsInput.includes(u.id)
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() =>
                                setGroupMemberIdsInput(prev =>
                                  prev.includes(u.id)
                                    ? prev.filter(id => id !== u.id)
                                    : [...prev, u.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                selected
                                  ? "bg-teal-500 text-white shadow-2xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <span>{u.fullName}</span>
                              <span className="text-[10px] opacity-75">
                                ({u.teacher?.departmentRel?.name || u.role})
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {groupEditId && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupEditId(null)
                          setGroupNameInput("")
                          setGroupDescInput("")
                          setGroupLeaderInput("")
                          setGroupMemberIdsInput([])
                        }}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold"
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={savingGroup}
                      onClick={handleSaveTaskGroup}
                      className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-500 text-white text-xs font-extrabold cursor-pointer"
                    >
                      {groupEditId ? "Lưu cập nhật nhóm" : "+ Tạo nhóm mới"}
                    </button>
                  </div>
                </div>

                {/* Danh sách nhóm hiện có */}
                <div className="space-y-3">
                  {taskGroupsList.map((g: any) => {
                    let members: string[] = []
                    try {
                      members =
                        typeof g.memberUserIds === "string"
                          ? JSON.parse(g.memberUserIds)
                          : g.memberUserIds || []
                    } catch {
                      members = []
                    }
                    const assignedUsers = (allStaffUsers || []).filter((u: any) =>
                      members.includes(u.id)
                    )

                    return (
                      <div
                        key={g.id}
                        className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                              <span>{g.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                                Tổ CM: {g.department || defaultDepartment}
                              </span>
                            </div>
                            {g.description && (
                              <p className="text-xs text-slate-500">
                                {g.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setModalMemberDeptFilter(
                                  g.department || defaultDepartment
                                )
                                handleOpenAssignModal(g)
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                            >
                              Chọn Tổ CM & Gán thành viên ({members.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGroupEditId(g.id)
                                setGroupNameInput(g.name)
                                setGroupDescInput(g.description || "")
                                setGroupLeaderInput(g.leaderUserId || "")
                                setGroupDeptInput(
                                  g.department || defaultDepartment
                                )
                                setGroupMemberIdsInput(members)
                              }}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                              title="Chỉnh sửa nhóm & thành viên"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTaskGroup(g.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                          <span className="font-bold text-slate-600">
                            Tổ CM:
                          </span>
                          <select
                            value={modalMemberDeptFilter}
                            onChange={e =>
                              setModalMemberDeptFilter(e.target.value)
                            }
                            className="p-1.5 border border-teal-200 rounded-lg bg-teal-50 text-teal-800 font-extrabold"
                          >
                            {(roles && roles.length > 0
                              ? roles
                              : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                            ).map((r: any) => (
                              <option key={r.code} value={r.code}>
                                {r.name}
                              </option>
                            ))}
                            <option value="ALL">Tất cả Tổ CM</option>
                          </select>

                          <span className="font-bold text-slate-600 ml-1">
                            → Người điều phối nhóm:
                          </span>
                          <select
                            value={g.leaderUserId || ""}
                            onChange={e =>
                              handleSetGroupLeaderAction(g.id, e.target.value)
                            }
                            className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                          >
                            <option value="">-- Chưa chỉ định --</option>
                            {allStaffUsers
                              .filter(
                                (u: any) =>
                                  isUserInDepartment(u, modalMemberDeptFilter) ||
                                  u.id === g.leaderUserId
                              )
                              .map((u: any) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName} ({u.teacher?.departmentRel?.name || u.role})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {assignedUsers.map((u: any) => (
                            <span
                              key={u.id}
                              className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold"
                            >
                              {u.fullName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: DANH MỤC NGHIỆP VỤ */}
            {catTab === "categories" && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <input
                      type="text"
                      value={catName}
                      onChange={e => setCatName(e.target.value)}
                      placeholder="Tên danh mục nghiệp vụ..."
                      className="border rounded-xl p-2.5 bg-white font-bold"
                    />
                    <select
                      value={catGroupName}
                      onChange={e => setCatGroupName(e.target.value)}
                      className="border rounded-xl p-2.5 bg-white font-bold"
                    >
                      <option value="">-- Nhóm liên kết --</option>
                      {taskGroupsList.map((g: any) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveCategory}
                      className="bg-teal-500 text-white rounded-xl font-bold px-4 py-2"
                    >
                      {catEditId ? "Cập nhật" : "+ Thêm danh mục"}
                    </button>
                  </div>
                </div>
                <div className="divide-y border rounded-2xl">
                  {categoriesList.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PHÂN QUYỀN WORKSPACE */}
            {catTab === "settings" && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2.5">
                  <div className="font-extrabold text-teal-800">
                    Tổ chuyên môn mặc định của QA Workspace
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Khi mở Không gian công việc, Phòng điều hành 3D hoặc Phiếu giao việc, hệ thống sẽ tự động chọn Tổ chuyên môn mặc định này để hiển thị đúng nhân sự và nhóm công việc.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={deptSettings.defaultDepartment || defaultDepartment}
                      onChange={e =>
                        setDeptSettings({
                          ...deptSettings,
                          defaultDepartment: e.target.value,
                        })
                      }
                      className="border border-teal-200 rounded-xl px-3 py-2 bg-white font-extrabold text-teal-800"
                    >
                      {(roles && roles.length > 0
                        ? roles
                        : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                      ).map((r: any) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <div className="font-extrabold text-slate-800">
                    Quy tắc Duyệt & Phân quyền theo Nhóm / Vai trò
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deptSettings.requireLeaderApproval ?? true}
                      onChange={e =>
                        setDeptSettings({
                          ...deptSettings,
                          requireLeaderApproval: e.target.checked,
                        })
                      }
                    />
                    <span>
                      Yêu cầu Người điều phối / Người duyệt nghiệm thu kết quả trước khi đóng nhiệm vụ
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        deptSettings.permissions?.leader?.canManageBlockers ??
                        true
                      }
                      onChange={e =>
                        setDeptSettings({
                          ...deptSettings,
                          permissions: {
                            ...deptSettings.permissions,
                            leader: {
                              ...deptSettings.permissions?.leader,
                              canManageBlockers: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                    <span>
                      Người điều phối nhóm được quyền xử lý vướng mắc và duyệt công việc trong nhóm
                    </span>
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={handleSaveDepartmentSettings}
                    className="px-5 py-2.5 rounded-xl bg-teal-500 text-white font-extrabold cursor-pointer"
                  >
                    {savingSettings ? "Đang lưu..." : "Lưu Cấu hình Phân quyền"}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-modal chọn thành viên cho nhóm */}
            {selectedGroupForAssign && (
              <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-4 border">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Phân công Thành viên vào Nhóm
                      </h3>
                      <p className="text-xs text-teal-800 font-bold">
                        {selectedGroupForAssign.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedGroupForAssign(null)}
                      className="p-1"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                    <span className="font-bold text-teal-800">Tổ chuyên môn:</span>
                    <select
                      value={modalMemberDeptFilter}
                      onChange={e => setModalMemberDeptFilter(e.target.value)}
                      className="bg-white border border-teal-200 rounded-lg px-2 py-1 font-extrabold text-teal-800"
                    >
                      {(roles && roles.length > 0
                        ? roles
                        : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                      ).map((r: any) => (
                        <option key={r.code} value={r.code}>
                          {r.name} {r.code === defaultDepartment ? "(Mặc định)" : ""}
                        </option>
                      ))}
                      <option value="ALL">Tất cả Tổ chuyên môn</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm tài khoản nhân sự thực..."
                    className="w-full text-xs p-2.5 border rounded-xl"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1 divide-y">
                    {allStaffUsers
                      .filter(
                        (u: any) =>
                          (isUserInDepartment(u, modalMemberDeptFilter) ||
                            assignedMemberIds.includes(u.id)) &&
                          u.fullName
                            .toLowerCase()
                            .includes(memberSearchQuery.toLowerCase())
                      )
                      .map((u: any) => {
                        const isSelected = assignedMemberIds.includes(u.id)
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleToggleMember(u.id)}
                            className="p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800">
                                {u.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {u.teacher?.departmentRel?.name || u.email}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded text-teal-800"
                            />
                          </div>
                        )
                      })}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      onClick={() => setSelectedGroupForAssign(null)}
                      className="px-4 py-2 border rounded-xl text-xs font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveGroupAssignment}
                      disabled={savingGroup}
                      className="bg-teal-500 text-white px-5 py-2 rounded-xl text-xs font-bold"
                    >
                      {savingGroup
                        ? "Đang lưu..."
                        : `Lưu (${assignedMemberIds.length} thành viên)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
