"use client"

function getCategoryBadgeStyle(catName: string) {
  const name = catName?.toLowerCase() || ""
  if (name.includes("kỳ thi") || name.includes("đầu ra")) return "bg-teal-50 text-[#0284C7] border-teal-200"
  if (name.includes("mầm non") || name.includes("mn")) return "bg-amber-50 text-amber-700 border-amber-200"
  if (name.includes("phổ thông") || name.includes("pt")) return "bg-sky-50 text-sky-700 border-sky-200"
  if (name.includes("quốc tế")) return "bg-indigo-50 text-indigo-700 border-indigo-200"
  if (name.includes("định kì") || name.includes("kiểm tra")) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (name.includes("khảo sát")) return "bg-purple-50 text-purple-700 border-purple-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
}

import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { 
  ClipboardList, Plus, Bell, Edit, Trash2, AlertTriangle, User, Users, 
  MessageSquare, Send, X, CheckCircle2, LayoutList, Kanban, Calendar, 
  Search, ShieldCheck, XCircle, Clock, Filter, ArrowRight, Check, CheckSquare,
  Download, Settings, Flag, Sparkles, TrendingUp, BarChart3, Layers, FileSpreadsheet,
  Building2, Sliders, ChevronRight
} from "lucide-react"
import { 
  createTask, updateTask, deleteTask, remindTask, updateTaskProgress, 
  getUsersByRole, respondToTask, deleteTasks, createTaskCategory, 
  updateTaskCategory, deleteTaskCategory, confirmTaskAssignment, rejectTaskAssignment,
  getTaskGroups, createTaskGroup, updateTaskGroup, deleteTaskGroup, assignStaffToTaskGroup,
  setTaskGroupLeader, saveDepartmentSettings
} from "./actions"
import { TaskDetailPanel } from "./TaskDetailPanel"

const PROGRESS_OPTIONS = [
  { value: "PENDING", label: "Chưa thực hiện", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "OVERDUE", label: "Trễ hạn", color: "bg-red-50 text-red-700 border-red-200" },
]

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Thấp", color: "text-slate-500 bg-slate-100" },
  { value: "MEDIUM", label: "Bình thường", color: "text-blue-700 bg-blue-50" },
  { value: "HIGH", label: "Ưu tiên cao", color: "text-orange-700 bg-orange-100" },
  { value: "URGENT", label: "Khẩn cấp", color: "text-red-700 bg-red-100 animate-pulse" }
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
  initialDepartmentSettings
}: any) {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState(initialTasks || [])
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "timeline" | "cards" | "analytics">("list")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  // Quick Context & Team Filters
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("ALL")
  const [filterPriority, setFilterPriority] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterProgress, setFilterProgress] = useState("ALL")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [filterAcceptance, setFilterAcceptance] = useState("ALL")
  const [filterYear, setFilterYear] = useState("ALL")
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // Category & Group Manager states
  const [categoriesList, setCategoriesList] = useState(dbCategories || [])
  const [taskGroupsList, setTaskGroupsList] = useState<any[]>(initialTaskGroups || [])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [catTab, setCatTab] = useState<"categories" | "groups" | "settings">("categories")
  const [catName, setCatName] = useState("")
  const [catRole, setCatRole] = useState(roles?.[0]?.code || "")
  const [catGroupName, setCatGroupName] = useState("")
  const [catWeight, setCatWeight] = useState<number | string>(1.0)
  const [catEditId, setCatEditId] = useState<string | null>(null)

  // Task Group CRUD & Assignment states
  const [groupEditId, setGroupEditId] = useState<string | null>(null)
  const [groupNameInput, setGroupNameInput] = useState("")
  const [groupDeptInput, setGroupDeptInput] = useState(roles?.[0]?.code || "KT&ĐBCL")
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState<any>(null)
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [savingGroup, setSavingGroup] = useState(false)

  // Configurable Department Settings State (Tùy chỉnh không mặc định)
  const [deptSettings, setDeptSettings] = useState<any>(initialDepartmentSettings || {
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
        canExportReports: true
      },
      member: {
        canSelfAssign: false,
        canViewOtherTeams: false,
        canCreateActionItems: true
      }
    }
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Form fields (admin)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [taskGroupId, setTaskGroupId] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [assignedToRole, setAssignedToRole] = useState(roles?.[0]?.code || "")
  const [assignedToUserId, setAssignedToUserId] = useState("")
  const [description, setDescription] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [academicYearId, setAcademicYearId] = useState(() => getDefaultAcademicYearClient(years)?.id || "")
  const [roleUsers, setRoleUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Confirmation Modal / Quick Actions state
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null)
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Staff respond form
  const [respondingTaskId, setRespondingTaskId] = useState<string | null>(null)
  const [respondProgress, setRespondProgress] = useState("IN_PROGRESS")
  const [respondNote, setRespondNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submittingTask, setSubmittingTask] = useState(false)
  const [taskToast, setTaskToast] = useState<{msg: string, type: string} | null>(null)
  const [detailTask, setDetailTask] = useState<any>(null)

  const isSuperAdmin = operationalScope?.isSuperAdmin || false
  const isHeadOfAcademic = operationalScope?.isHeadOfAcademic || false
  const isTBP = operationalScope?.isTBP || false
  const isTTCM = operationalScope?.isTTCM || false
  const isManager = operationalScope?.isManager ?? (currentRole === "ADMIN" || isTBP || isTTCM)
  const isAdmin = isManager

  // Open modal if URL has taskId
  useEffect(() => {
    const taskId = searchParams?.get("taskId")
    const action = searchParams?.get("action")
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t: any) => t.id === taskId)
      if (task) {
        setDetailTask(task)
        if (action === "confirm" && task.acceptanceStatus === "WAITING_CONFIRMATION") {
          setConfirmingTaskId(task.id)
        }
      }
    }
  }, [searchParams, tasks])

  // Load role users on role change in form
  useEffect(() => {
    if (assignedToRole) {
      setLoadingUsers(true)
      getUsersByRole(assignedToRole).then(res => {
        if (res.success) setRoleUsers(res.users)
        setLoadingUsers(false)
      })
    }
  }, [assignedToRole])

  const handleOpenAddModal = () => {
    setEditId(null)
    setTitle("")
    setCategory(categoriesList[0]?.name || "")
    setTaskGroupId(taskGroupsList[0]?.id || "")
    setPriority("MEDIUM")
    setAssignedToRole(roles?.[0]?.code || "KT&ĐBCL")
    setAssignedToUserId("")
    setDescription("")
    setSelectedUserIds([])
    setCollaboratorIds([])
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate(new Date().toISOString().slice(0, 10))
    setAcademicYearId(getDefaultAcademicYearClient(years)?.id || "")
    setShowForm(true)
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) return alert("Vui lòng nhập tên danh mục")
    const weightNum = parseFloat(String(catWeight)) || 1.0
    if (catEditId) {
      const res = await updateTaskCategory(catEditId, { name: catName, assignedToRole: catRole, groupName: catGroupName || undefined, weight: weightNum })
      if (res.success) {
        setCategoriesList(categoriesList.map((c: any) => c.id === catEditId ? { ...c, name: catName, assignedToRole: catRole, groupName: catGroupName || null, weight: weightNum } : c))
        setCatEditId(null); setCatName(""); setCatGroupName(""); setCatWeight(1.0)
      } else alert("Lỗi: " + res.error)
    } else {
      const res: any = await createTaskCategory({ name: catName, assignedToRole: catRole, groupName: catGroupName || undefined, weight: weightNum })
      if (res.success) {
        setCategoriesList([...categoriesList, res.category])
        setCatName(""); setCatGroupName(""); setCatWeight(1.0)
      } else alert("Lỗi: " + res.error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return
    const res = await deleteTaskCategory(id)
    if (res.success) setCategoriesList(categoriesList.filter((c: any) => c.id !== id))
    else alert("Lỗi: " + res.error)
  }

  const handleSaveTaskGroup = async () => {
    if (!groupNameInput.trim()) return alert("Vui lòng nhập tên nhóm công việc")
    setSavingGroup(true)
    if (groupEditId) {
      const res = await updateTaskGroup(groupEditId, { name: groupNameInput.trim(), department: groupDeptInput })
      if (res.success) {
        setTaskGroupsList(taskGroupsList.map(g => g.id === groupEditId ? { ...g, name: groupNameInput.trim(), department: groupDeptInput } : g))
        setGroupEditId(null); setGroupNameInput("")
      } else alert("Lỗi: " + res.error)
    } else {
      const res = await createTaskGroup({ name: groupNameInput.trim(), department: groupDeptInput })
      if (res.success) {
        setTaskGroupsList([...taskGroupsList, res.group])
        setGroupNameInput("")
      } else alert("Lỗi: " + res.error)
    }
    setSavingGroup(false)
  }

  const handleDeleteTaskGroup = async (id: string) => {
    if (!confirm("Xóa nhóm công việc này?")) return
    const res = await deleteTaskGroup(id)
    if (res.success) setTaskGroupsList(taskGroupsList.filter(g => g.id !== id))
    else alert("Lỗi: " + res.error)
  }

  const handleSetGroupLeaderAction = async (groupId: string, leaderUserId: string) => {
    const res = await setTaskGroupLeader(groupId, leaderUserId || null)
    if (res.success) {
      setTaskGroupsList(prev => prev.map(g => g.id === groupId ? { ...g, leaderUserId: leaderUserId || null } : g))
      setTaskToast({ msg: "✅ Đã phân công Trưởng nhóm thành công!", type: "success" })
      setTimeout(() => setTaskToast(null), 2500)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSaveDepartmentSettings = async () => {
    setSavingSettings(true)
    const targetDept = roles?.[0]?.code || "KT&ĐBCL"
    const res = await saveDepartmentSettings(targetDept, deptSettings)
    setSavingSettings(false)
    if (res.success) {
      setTaskToast({ msg: "✅ Đã lưu cấu hình quản trị & phân quyền của Ban thành công!", type: "success" })
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
        members = typeof group.memberUserIds === "string" ? JSON.parse(group.memberUserIds) : group.memberUserIds
      } catch (e) {
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
    const res = await assignStaffToTaskGroup(selectedGroupForAssign.id, assignedMemberIds)
    setSavingGroup(false)
    if (res.success) {
      setTaskToast({ msg: `✅ Đã phân công ${assignedMemberIds.length} nhân sự cho nhóm ${selectedGroupForAssign.name}!`, type: "success" })
      setTimeout(() => { setTaskToast(null); window.location.reload() }, 1500)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Vui lòng nhập nội dung công việc!")
    if (!category.trim()) return alert("Vui lòng chọn danh mục công việc!")
    setSubmittingTask(true)

    const collaboratorStr = collaboratorIds.length > 0
      ? collaboratorIds.map(id => allStaffUsers.find((u: any) => u.id === id)?.fullName).filter(Boolean).join(", ")
      : null

    const data = { 
      title, 
      category: category.trim(), 
      taskGroupId: taskGroupId || null,
      priority,
      department: assignedToRole === "KT_DBCL" ? "KT&ĐBCL" : assignedToRole,
      assignedToRole, 
      assignedToUserId: assignedToUserId || null, 
      assignedToUserIds: selectedUserIds,
      collaborators: collaboratorStr,
      startDate, 
      endDate, 
      academicYearId, 
      isImportant: priority === "HIGH" || priority === "URGENT",
      description
    }

    const res: any = editId ? await updateTask(editId, data) : await createTask(data)
    setSubmittingTask(false)
    if (res.success) {
      setTaskToast({ msg: editId ? "✅ Đã cập nhật công việc thành công!" : "✅ Đã giao việc mới thành công!", type: "success" })
      setTimeout(() => { setTaskToast(null); window.location.reload() }, 2000)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleEdit = (t: any) => {
    setEditId(t.id)
    setTitle(t.title)
    setCategory(t.category || "")
    setTaskGroupId(t.taskGroupId || t.taskGroup?.id || "")
    setPriority(t.priority || (t.isImportant ? "HIGH" : "MEDIUM"))
    setAssignedToRole(t.assignedToRole || roles?.[0]?.code || "")
    setAssignedToUserId(t.assignedToUserId || "")
    setDescription(t.description || "")
    setStartDate(new Date(t.startDate).toISOString().slice(0, 10))
    setEndDate(new Date(t.endDate).toISOString().slice(0, 10))
    setAcademicYearId(t.academicYearId || years?.[0]?.id || "")
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa công việc này?")) return
    const res = await deleteTask(id)
    if (res.success) setTasks(tasks.filter((t: any) => t.id !== id))
  }

  const handleRemind = async (id: string) => {
    const res: any = await remindTask(id)
    if (res.success) {
      setTaskToast({ msg: `🔔 Đã gửi ${res.sent || 0} thông báo nhắc việc thành công!`, type: 'success' })
      setTimeout(() => setTaskToast(null), 3000)
    } else alert("Lỗi: " + res.error)
  }

  const handleConfirmTaskAction = async (taskId: string) => {
    setActionLoading(true)
    const res = await confirmTaskAssignment(taskId)
    setActionLoading(false)
    if (res.success) {
      setTasks(tasks.map((t: any) => t.id === taskId ? { ...t, acceptanceStatus: "ACCEPTED", acceptedAt: new Date().toISOString(), progress: t.progress === "PENDING" ? "IN_PROGRESS" : t.progress } : t))
      setConfirmingTaskId(null)
      setTaskToast({ msg: "✅ Đã xác nhận tiếp nhận công việc thành công!", type: "success" })
      setTimeout(() => setTaskToast(null), 3000)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleProgressChange = async (id: string, progress: string) => {
    setTasks(tasks.map((t: any) => t.id === id ? { ...t, progress } : t))
    await updateTaskProgress(id, progress)
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportRows = displayedTasks.map((t: any, index: number) => {
        const blockers = (t.comments || []).filter((c: any) => c.commentType === "BLOCKER")
        const unresolved = blockers.filter((b: any) => b.actionStatus !== "RESOLVED")
        return {
          "STT": index + 1,
          "Nhóm Chuyên Môn": t.taskGroup?.name || "Toàn Ban",
          "Danh Mục": t.category || "Công việc",
          "Tiêu Đề Công Việc": t.title,
          "Mức Độ Ưu Tiên": t.priority === "URGENT" ? "Khẩn cấp" : t.priority === "HIGH" ? "Ưu tiên cao" : "Bình thường",
          "Người Phụ Trách": t.assignedToUser?.fullName || t.assignedToRole,
          "Người Giao Việc": t.assignedBy?.fullName || "Ban Điều Hành",
          "Người Phối Hợp": t.collaborators || "",
          "Ngày Bắt Đầu": new Date(t.startDate).toLocaleDateString("vi-VN"),
          "Hạn Chót": new Date(t.endDate).toLocaleDateString("vi-VN"),
          "Tiến Độ": PROGRESS_OPTIONS.find(p => p.value === t.progress)?.label || t.progress,
          "Xác Nhận Nhận Việc": t.acceptanceStatus === "ACCEPTED" ? "Đã nhận việc" : t.acceptanceStatus === "REJECTED" ? "Từ chối" : "Chờ xác nhận",
          "Vướng Mắc Tồn Đọng": unresolved.length > 0 ? `${unresolved.length} vướng mắc đang xử lý` : "Không có"
        }
      })

      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "BaoCao_CongViec")
      XLSX.writeFile(wb, `BaoCao_CongViec_KTDBCL_${new Date().toISOString().slice(0, 10)}.xlsx`)
      setTaskToast({ msg: "✅ Đã xuất file Excel thành công!", type: "success" })
      setTimeout(() => setTaskToast(null), 3000)
    } catch (e: any) {
      alert("Lỗi xuất Excel: " + e.message)
    }
  }

  // Filter tasks with full Team, Priority, and Context awareness
  const displayedTasks = tasks.filter((t: any) => {
    // 1. Team Context Filter
    let matchTeam = true
    if (selectedTeamFilter === "MY_TASKS") {
      matchTeam = t.assignedToUserId === currentUserId || (t.collaborators && t.collaborators.includes(currentUserId))
    } else if (selectedTeamFilter === "BLOCKERS") {
      matchTeam = (t.comments || []).some((c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED")
    } else if (selectedTeamFilter !== "ALL") {
      matchTeam = t.taskGroupId === selectedTeamFilter || t.taskGroup?.id === selectedTeamFilter || t.taskGroup?.name === selectedTeamFilter
    }

    // 2. Priority Filter
    const matchPriority = filterPriority === "ALL" || (t.priority || "MEDIUM") === filterPriority

    // 3. Progress, Category, Acceptance, Academic Year
    const matchProgress = filterProgress === "ALL" || t.progress === filterProgress
    const matchCategory = filterCategory === "ALL" || t.category === filterCategory
    const matchAcceptance = filterAcceptance === "ALL" || (t.acceptanceStatus || "WAITING_CONFIRMATION") === filterAcceptance
    const matchYear = filterYear === "ALL" || t.academicYearId === filterYear
    
    // 4. Keyword Search
    const query = searchQuery.trim().toLowerCase()
    const matchQuery = !query || 
      t.title.toLowerCase().includes(query) || 
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.taskGroup?.name && t.taskGroup.name.toLowerCase().includes(query)) ||
      (t.assignedToUser?.fullName && t.assignedToUser.fullName.toLowerCase().includes(query)) ||
      (t.assignedBy?.fullName && t.assignedBy.fullName.toLowerCase().includes(query)) ||
      (t.assignedToRole && t.assignedToRole.toLowerCase().includes(query))

    return matchTeam && matchPriority && matchProgress && matchCategory && matchAcceptance && matchYear && matchQuery
  })

  // Pending Tasks requiring current user's confirmation
  const pendingConfirmationTasks = tasks.filter((t: any) => 
    (t.acceptanceStatus === "WAITING_CONFIRMATION" || !t.acceptanceStatus) &&
    (t.assignedToUserId === currentUserId || (!t.assignedToUserId && currentRole === t.assignedToRole))
  )

  const filterCategoriesList = categoriesList.map((c: any) => c.name)

  const stats = {
    total: tasks.length,
    waitingConfirmation: tasks.filter((t: any) => (t.acceptanceStatus || "WAITING_CONFIRMATION") === "WAITING_CONFIRMATION").length,
    inProgress: tasks.filter((t: any) => t.progress === "IN_PROGRESS").length,
    completed: tasks.filter((t: any) => t.progress === "COMPLETED").length,
    overdue: tasks.filter((t: any) => t.progress === "OVERDUE").length,
    blockers: tasks.filter((t: any) => (t.comments || []).some((c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED")).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.progress === "COMPLETED").length / tasks.length) * 100) : 0
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Toast Notification */}
      {taskToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-top-4 duration-300 ${
          taskToast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <div className="flex-1">
            <p className="font-bold text-sm">Thông báo</p>
            <p className="text-xs opacity-95">{taskToast.msg}</p>
          </div>
          <button onClick={() => setTaskToast(null)} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#48BFE3] shadow-xs shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
              Điều hành Công việc
              <span className="text-xs px-2.5 py-0.5 bg-teal-100 text-[#0284C7] rounded-full font-bold">
                {stats.total} việc
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                Hoàn thành: {stats.completionRate}%
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Quản trị công việc theo Ban – Nhóm – Cá nhân (Thí điểm: Ban KT&ĐBCL)
            </p>
          </div>
        </div>

        {/* View Switches & Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switches */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list" ? "bg-white text-[#0284C7] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Danh sách
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "kanban" ? "bg-white text-[#0284C7] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Kanban className="w-4 h-4" /> Bảng Thẻ
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "timeline" ? "bg-white text-[#0284C7] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" /> Tiến độ
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "analytics" ? "bg-white text-[#0284C7] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Báo cáo Nhóm
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleExportExcel}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
            title="Xuất dữ liệu ra Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Xuất Excel
          </button>

          {isAdmin && (
            <button
              onClick={() => { setShowCategoryManager(true); setCatTab("categories") }}
              className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Settings className="w-4 h-4 text-slate-500" /> Cấu hình Ban
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#48BFE3] to-[#00A19A] text-white px-4 py-2 rounded-2xl hover:opacity-95 transition-all shadow-xs font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Giao việc mới
            </button>
          )}
        </div>
      </div>

      {/* QUICK SCOPE & TEAM CONTEXT BAR (Interactive Pills) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#48BFE3]" /> Phạm vi:
        </span>
        <button
          onClick={() => setSelectedTeamFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedTeamFilter === "ALL" 
              ? "bg-[#00A19A] text-white shadow-2xs" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Toàn Ban KT&ĐBCL ({tasks.length})
        </button>

        {taskGroupsList.map((g: any) => {
          const groupTasksCount = tasks.filter((t: any) => t.taskGroupId === g.id || t.taskGroup?.id === g.id || t.taskGroup?.name === g.name).length
          const isSelected = selectedTeamFilter === g.id || selectedTeamFilter === g.name
          return (
            <button
              key={g.id}
              onClick={() => setSelectedTeamFilter(isSelected ? "ALL" : g.id)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected 
                  ? "bg-[#48BFE3] text-white shadow-2xs" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📁 {g.name} ({groupTasksCount})
            </button>
          )
        })}

        <button
          onClick={() => setSelectedTeamFilter(selectedTeamFilter === "MY_TASKS" ? "ALL" : "MY_TASKS")}
          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedTeamFilter === "MY_TASKS" 
              ? "bg-indigo-600 text-white shadow-2xs" 
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          }`}
        >
          <User className="w-3.5 h-3.5" /> Việc của tôi
        </button>

        {stats.blockers > 0 && (
          <button
            onClick={() => setSelectedTeamFilter(selectedTeamFilter === "BLOCKERS" ? "ALL" : "BLOCKERS")}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedTeamFilter === "BLOCKERS" 
                ? "bg-red-600 text-white shadow-2xs" 
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 animate-pulse"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Vướng mắc ({stats.blockers})
          </button>
        )}
      </div>

      {/* Pending Confirmation Alert Banner for Assignees */}
      {pendingConfirmationTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-4 sm:p-5 shadow-xs border border-amber-400 animate-in fade-in duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                ⚡ Bạn có {pendingConfirmationTasks.length} công việc mới cần xác nhận nhận việc!
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Vui lòng xác nhận tiếp nhận công việc để ban điều hành và người giao theo dõi tiến độ.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterAcceptance("WAITING_CONFIRMATION")
                setViewMode("list")
              }}
              className="bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              Xem ngay ({pendingConfirmationTasks.length}) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SMART KPI METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { 
            label: "Khối lượng & Tiến độ", 
            value: `${stats.completed}/${stats.total}`, 
            sub: `${stats.completionRate}% hoàn thành`,
            filter: "ALL", 
            type: "progress", 
            cls: "bg-emerald-50/80 border-emerald-200 text-emerald-900", 
            icon: CheckCircle2 
          },
          { 
            label: "Chờ xác nhận nhận việc", 
            value: stats.waitingConfirmation, 
            sub: stats.waitingConfirmation > 0 ? "Cần tiếp nhận ngay" : "Tất cả đã nhận việc",
            filter: "WAITING_CONFIRMATION", 
            type: "acceptance", 
            cls: "bg-amber-50/80 border-amber-200 text-amber-900", 
            icon: Clock 
          },
          { 
            label: "Đang thực hiện", 
            value: stats.inProgress, 
            sub: "Đang triển khai đúng kế hoạch",
            filter: "IN_PROGRESS", 
            type: "progress", 
            cls: "bg-blue-50/80 border-blue-200 text-blue-900", 
            icon: Kanban 
          },
          { 
            label: "Trễ hạn & Điểm nghẽn", 
            value: stats.overdue, 
            sub: stats.blockers > 0 ? `${stats.blockers} vướng mắc cần gỡ` : "Không có vướng mắc",
            filter: "OVERDUE", 
            type: "progress", 
            cls: stats.overdue > 0 || stats.blockers > 0 ? "bg-red-50/90 border-red-200 text-red-900" : "bg-slate-50 border-slate-200 text-slate-700", 
            icon: AlertTriangle 
          },
        ].map(s => {
          const IconC = s.icon
          const isActive = s.type === "acceptance" ? filterAcceptance === s.filter : filterProgress === s.filter
          return (
            <div 
              key={s.label} 
              onClick={() => {
                if (s.type === "acceptance") {
                  setFilterAcceptance(filterAcceptance === s.filter ? "ALL" : s.filter)
                  setFilterProgress("ALL")
                } else if (s.filter !== "ALL") {
                  setFilterProgress(filterProgress === s.filter ? "ALL" : s.filter)
                  setFilterAcceptance("ALL")
                }
              }}
              className={`border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between ${s.cls} ${
                isActive ? "ring-2 ring-current ring-offset-2 scale-[1.02]" : ""
              }`}
            >
              <div>
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-xs font-extrabold mt-0.5 opacity-90">{s.label}</div>
                <div className="text-[11px] font-semibold opacity-70 mt-0.5">{s.sub}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/70 flex items-center justify-center opacity-85 shrink-0 shadow-2xs">
                <IconC className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, danh mục, nhóm chuyên môn, người nhận..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-[#48BFE3] font-medium"
            />
          </div>

          {/* Academic Year Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:ring-2 focus:ring-[#48BFE3]"
            >
              <option value="ALL">Tất cả năm học</option>
              {(years || []).map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-slate-50 focus:ring-2 focus:ring-[#48BFE3]"
            >
              <option value="ALL">Tất cả mức độ ưu tiên</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Danh mục:</span>
          <button
            onClick={() => setFilterCategory("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
              filterCategory === "ALL" ? "bg-[#48BFE3] text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          {filterCategoriesList.map((catName: string) => {
            const count = tasks.filter((t: any) => t.category === catName).length
            return (
              <button
                key={catName}
                onClick={() => setFilterCategory(filterCategory === catName ? "ALL" : catName)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border ${
                  filterCategory === catName 
                    ? "bg-[#48BFE3] text-white border-[#48BFE3] shadow-2xs" 
                    : `${getCategoryBadgeStyle(catName)} hover:opacity-80`
                }`}
              >
                {catName} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* CREATE / EDIT TASK MODAL FORM */}
      {showForm && (
        <div className="bg-white border-2 border-teal-400 rounded-3xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#48BFE3]" />
              {editId ? 'Chỉnh sửa Công việc' : 'Giao Công Việc Mới (Hỗ trợ theo Ban – Nhóm – Cá nhân)'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nhóm chuyên môn */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nhóm Chuyên Môn Phụ Trách</label>
              <select
                value={taskGroupId}
                onChange={e => setTaskGroupId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
              >
                <option value="">-- Toàn Ban (Không gán nhóm riêng) --</option>
                {taskGroupsList.map((g: any) => (
                  <option key={g.id} value={g.id}>📁 {g.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Danh mục công việc *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
              >
                <option value="">-- Chọn danh mục --</option>
                {categoriesList.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Mức độ ưu tiên</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ban & Người nhận */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ban / Bộ phận *</label>
              <select
                value={assignedToRole}
                onChange={e => setAssignedToRole(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
              >
                {roles.map((r: any) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Người nhận công việc chính</label>
              <select
                value={assignedToUserId}
                onChange={e => setAssignedToUserId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
              >
                <option value="">-- Toàn bộ thành viên Ban/Nhóm --</option>
                {allStaffUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Người phối hợp */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Người phối hợp liên nhóm (Chọn nhiều người):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border rounded-xl">
              {allStaffUsers.map((u: any) => {
                const isChecked = collaboratorIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (isChecked) setCollaboratorIds(collaboratorIds.filter(id => id !== u.id))
                      else setCollaboratorIds([...collaboratorIds, u.id])
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
                      isChecked ? "bg-[#48BFE3] text-white border-[#48BFE3] shadow-xs" : "bg-white text-teal-900 border-teal-200 hover:bg-teal-100"
                    }`}
                  >
                    <span>{isChecked ? '🤝 ' : ''}{u.fullName}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề công việc *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tên / tiêu đề công việc..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3] bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Chi tiết công việc / Hướng dẫn xử lý</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Nhập mô tả chi tiết công việc, các bước thực hiện..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#48BFE3] resize-none leading-relaxed bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Năm học</label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3]"
              >
                {(years || []).filter((y: any) => !y.isOff).map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Hạn chót</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#48BFE3]"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button onClick={() => setShowForm(false)} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submittingTask}
              className="bg-gradient-to-r from-[#48BFE3] to-[#00A19A] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:opacity-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {submittingTask ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang lưu...</>
              ) : (
                <><Send className="w-4 h-4" /> {editId ? 'Cập nhật công việc' : 'Giao việc mới'}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW (TABLE) */}
      {viewMode === "list" && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  {isAdmin && (
                    <th className="p-3 text-center w-10 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={displayedTasks.length > 0 && displayedTasks.every((t: any) => selectedTaskIds.includes(t.id))}
                        onChange={e => {
                          if (e.target.checked) setSelectedTaskIds(displayedTasks.map((t: any) => t.id))
                          else setSelectedTaskIds([])
                        }}
                        className="w-4 h-4 rounded text-[#48BFE3] focus:ring-[#48BFE3] cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-3 text-center w-12 whitespace-nowrap">STT</th>
                  <th className="p-3 whitespace-nowrap w-44">Nhóm & Danh mục</th>
                  <th className="p-3 whitespace-normal min-w-[280px] max-w-xl">Nội dung công việc</th>
                  <th className="p-3 whitespace-nowrap w-44">Người nhận</th>
                  <th className="p-3 whitespace-nowrap w-28">Hạn chót</th>
                  <th className="p-3 whitespace-nowrap w-40">Xác nhận nhận việc</th>
                  <th className="p-3 whitespace-nowrap w-36">Tiến độ</th>
                  <th className="p-3 text-center whitespace-nowrap w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedTasks.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-slate-400">
                      <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="font-bold">Không tìm thấy công việc nào phù hợp</p>
                    </td>
                  </tr>
                )}
                {displayedTasks.map((t: any, i: number) => {
                  const isOverdue = t.progress === "OVERDUE"
                  const progressOpt = PROGRESS_OPTIONS.find(p => p.value === t.progress) || PROGRESS_OPTIONS[0]
                  const roleName = (roles || []).find((r: any) => r.code === t.assignedToRole)?.name || t.assignedToRole
                  const assigneeName = t.assignedToUser?.fullName || null
                  const acceptanceStatus = t.acceptanceStatus || "WAITING_CONFIRMATION"
                  const isSelected = selectedTaskIds.includes(t.id)

                  const blockers = (t.comments || []).filter((c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED")

                  return (
                    <tr 
                      key={t.id} 
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isOverdue ? "bg-red-50/50 hover:bg-red-50" : isSelected ? "bg-teal-50/40" : ""
                      }`}
                    >
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) setSelectedTaskIds([...selectedTaskIds, t.id])
                              else setSelectedTaskIds(selectedTaskIds.filter(id => id !== t.id))
                            }}
                            className="w-4 h-4 rounded text-[#48BFE3] focus:ring-[#48BFE3] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 text-center text-slate-400 font-bold whitespace-nowrap">{i + 1}</td>
                      <td className="p-3 space-y-1">
                        {t.taskGroup?.name && (
                          <div className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md w-fit">
                            📁 {t.taskGroup.name}
                          </div>
                        )}
                        <span className={`border font-extrabold px-2.5 py-0.5 rounded-full text-[10px] inline-block shadow-2xs whitespace-nowrap ${getCategoryBadgeStyle(t.category)}`}>
                          {t.category || "Công việc"}
                        </span>
                      </td>
                      <td className="p-3 whitespace-normal break-words min-w-[280px] max-w-xl">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          {t.priority === "URGENT" ? (
                            <span className="bg-red-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 mt-0.5">
                              🔴 Khẩn cấp
                            </span>
                          ) : t.priority === "HIGH" || t.isImportant ? (
                            <span className="bg-orange-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 mt-0.5">
                              🟠 Ưu tiên cao
                            </span>
                          ) : null}
                          <span 
                            onClick={() => setDetailTask(t)}
                            className={`font-bold cursor-pointer hover:text-[#48BFE3] transition-colors leading-relaxed break-words ${
                              isOverdue ? "text-red-900" : "text-slate-800"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                        {t.assignedBy?.fullName && (
                          <div className="text-[11px] text-slate-400 mt-0.5">Bởi: {t.assignedBy.fullName}</div>
                        )}
                        {blockers.length > 0 && (
                          <div className="mt-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> {blockers.length} vướng mắc đang chờ tháo gỡ
                          </div>
                        )}
                        {t.collaborators && (
                          <div className="text-[11px] text-teal-800 font-bold mt-1 flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-md w-fit">
                            <Users className="w-3 h-3 text-[#48BFE3]" /> Phối hợp: {t.collaborators}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {assigneeName ? (
                          <div>
                            <div className="font-bold text-indigo-700 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-indigo-500" /> {assigneeName}
                            </div>
                            <div className="text-[11px] text-slate-400">{roleName}</div>
                          </div>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            Tổ: {roleName}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        <span className={isOverdue ? "text-red-600 flex items-center gap-1" : "text-slate-600"}>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                          {new Date(t.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </td>
                      {/* Acceptance Status Badge */}
                      <td className="p-3">
                        {acceptanceStatus === "ACCEPTED" ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đã nhận việc
                          </span>
                        ) : acceptanceStatus === "REJECTED" ? (
                          <span className="bg-red-100 text-red-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit" title={t.rejectionReason}>
                            <XCircle className="w-3.5 h-3.5 text-red-600" /> Từ chối / Phản hồi
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ xác nhận
                            </span>
                            {(t.assignedToUserId === currentUserId || (!t.assignedToUserId && currentRole === t.assignedToRole)) && (
                              <button
                                onClick={() => handleConfirmTaskAction(t.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg text-[10px]"
                              >
                                Xác nhận
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {isAdmin ? (
                          <select
                            value={t.progress}
                            onChange={e => handleProgressChange(t.id, e.target.value)}
                            className={`text-xs font-bold rounded-xl px-2.5 py-1 border cursor-pointer outline-none ${progressOpt.color}`}
                          >
                            {PROGRESS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${progressOpt.color}`}>
                            {progressOpt.label}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDetailTask(t)}
                            title="Xem, Bình luận & Tháo gỡ"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-4 h-4 text-[#48BFE3]" />
                            <span className="text-[10px] text-slate-600 font-extrabold">{t.comments?.length || 0}</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button onClick={() => handleRemind(t.id)} title="Gửi nhắc việc" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg">
                                <Bell className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEdit(t)} title="Sửa" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(t.id)} title="Xóa" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { key: "PENDING", title: "Chưa thực hiện", color: "border-slate-300 bg-slate-50/50", badge: "bg-slate-600 text-white" },
            { key: "IN_PROGRESS", title: "Đang thực hiện", color: "border-blue-300 bg-blue-50/30", badge: "bg-blue-600 text-white" },
            { key: "COMPLETED", title: "Đã hoàn thành", color: "border-emerald-300 bg-emerald-50/30", badge: "bg-emerald-600 text-white" },
            { key: "OVERDUE", title: "Trễ hạn", color: "border-red-300 bg-red-50/30", badge: "bg-red-600 text-white" },
          ].map(col => {
            const colTasks = displayedTasks.filter((t: any) => t.progress === col.key)
            return (
              <div key={col.key} className={`border rounded-3xl p-4 flex flex-col space-y-3 ${col.color}`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    {col.title}
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                  {colTasks.map((t: any) => (
                    <div 
                      key={t.id} 
                      onClick={() => setDetailTask(t)}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryBadgeStyle(t.category)}`}>
                          {t.category}
                        </span>
                        {t.taskGroup?.name && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {t.taskGroup.name}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-800 group-hover:text-[#48BFE3] transition-colors leading-snug">
                        {t.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {t.assignedToUser?.fullName || t.assignedToRole}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" /> {new Date(t.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW MODE 3: TIMELINE VIEW */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
          <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#48BFE3]" /> Tiến độ & Thời gian thực hiện Công việc Ban KT&ĐBCL
          </h3>

          <div className="space-y-4">
            {displayedTasks.map((t: any) => {
              const start = new Date(t.startDate)
              const end = new Date(t.endDate)
              const isOverdue = t.progress === "OVERDUE"
              const isCompleted = t.progress === "COMPLETED"

              return (
                <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {t.taskGroup?.name && (
                        <span className="bg-indigo-100 text-indigo-800 font-bold text-xs px-2.5 py-0.5 rounded-full">
                          📁 {t.taskGroup.name}
                        </span>
                      )}
                      <span className="bg-teal-100 text-[#0284C7] font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {t.category || "Công việc"}
                      </span>
                      <span onClick={() => setDetailTask(t)} className="font-bold text-xs text-slate-800 cursor-pointer hover:text-[#48BFE3]">
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <span>{start.toLocaleDateString("vi-VN")} &rarr; {end.toLocaleDateString("vi-VN")}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${
                        isCompleted ? "bg-emerald-100 text-emerald-800" : isOverdue ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {isCompleted ? "Hoàn thành" : isOverdue ? "Trễ hạn" : "Đang thực hiện"}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${
                        isCompleted ? "bg-emerald-500" : isOverdue ? "bg-red-500" : "bg-[#48BFE3]"
                      }`} 
                      style={{ width: isCompleted ? '100%' : isOverdue ? '100%' : '60%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: CARDS VIEW (Cá Nhân) */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedTasks.map((t: any) => (
            <div 
              key={t.id}
              onClick={() => setDetailTask(t)}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                  {t.taskGroup?.name || "Toàn Ban"}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  t.progress === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                  t.progress === "OVERDUE" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {PROGRESS_OPTIONS.find(p => p.value === t.progress)?.label || t.progress}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{t.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{t.description || "Không có mô tả chi tiết"}</p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t.assignedToUser?.fullName || t.assignedToRole}</span>
                <span className="flex items-center gap-1 font-bold"><Clock className="w-3.5 h-3.5" /> {new Date(t.endDate).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 5: BÁO CÁO & GIÁM SÁT THEO NHÓM (ANALYTICS) */}
      {viewMode === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#48BFE3]" /> Báo Cáo Tổng Hợp & Giám Sát Theo 5 Nhóm Chuyên Môn
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thống kê kết quả hoàn thành, điểm nghẽn và kế hoạch phân bổ nhân sự
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/weekly-reports"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Đồng bộ sang Báo cáo Tuần SSM
                </Link>
                <button
                  onClick={handleExportExcel}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Tải Excel Báo Cáo
                </button>
              </div>
            </div>

            {/* Table Summary per Group */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Nhóm Chuyên Môn</th>
                    <th className="p-3">Trưởng Nhóm</th>
                    <th className="p-3 text-center">Tổng việc</th>
                    <th className="p-3 text-center">Hoàn thành</th>
                    <th className="p-3 text-center">Đang làm</th>
                    <th className="p-3 text-center">Trễ hạn</th>
                    <th className="p-3 text-center">Vướng mắc</th>
                    <th className="p-3 text-center">Tiến độ %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {taskGroupsList.map(g => {
                    const groupTasks = tasks.filter((t: any) => t.taskGroupId === g.id || t.taskGroup?.id === g.id || t.taskGroup?.name === g.name)
                    const completed = groupTasks.filter((t: any) => t.progress === "COMPLETED").length
                    const inProgress = groupTasks.filter((t: any) => t.progress === "IN_PROGRESS").length
                    const overdue = groupTasks.filter((t: any) => t.progress === "OVERDUE").length
                    const blockers = groupTasks.filter((t: any) => (t.comments || []).some((c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED")).length
                    const rate = groupTasks.length > 0 ? Math.round((completed / groupTasks.length) * 100) : 0
                    const leader = allStaffUsers.find((u: any) => u.id === g.leaderUserId)

                    return (
                      <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                          <span className="font-extrabold text-slate-800">{g.name}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {leader ? (
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                              👑 {leader.fullName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân công</span>
                          )}
                        </td>
                        <td className="p-3 text-center">{groupTasks.length}</td>
                        <td className="p-3 text-center text-emerald-600">{completed}</td>
                        <td className="p-3 text-center text-blue-600">{inProgress}</td>
                        <td className="p-3 text-center text-red-600">{overdue}</td>
                        <td className="p-3 text-center text-amber-600">{blockers}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px]">
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Panel Modal */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          allStaffUsers={allStaffUsers}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={() => window.location.reload()}
        />
      )}

      {/* Category, Task Group & Configurable Department Settings Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header with Navigation Tabs */}
            <div className="p-5 border-b bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">Cấu hình Quản trị & Phân quyền Tùy chỉnh (Ban KT&ĐBCL)</h3>
                  <p className="text-xs text-slate-500">Thiết lập cơ cấu Ban - Nhóm, Trưởng nhóm chuyên môn và tùy biến ma trận quyền hạn</p>
                </div>
                <button onClick={() => setShowCategoryManager(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl flex-wrap">
                <button
                  onClick={() => setCatTab("categories")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "categories" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutList className="w-4 h-4 text-[#48BFE3]" /> 1. Danh mục & KPI ({categoriesList.length})
                </button>
                <button
                  onClick={() => setCatTab("groups")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "groups" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600" /> 2. Nhóm & Trưởng nhóm ({taskGroupsList.length})
                </button>
                <button
                  onClick={() => setCatTab("settings")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    catTab === "settings" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Settings className="w-4 h-4 text-purple-600" /> 3. Phân quyền Tùy chỉnh
                </button>
              </div>
            </div>

            {/* TAB 1: DANH MỤC CÔNG VIỆC */}
            {catTab === "categories" && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    {catEditId ? "✏️ Cập nhật danh mục công việc" : "➕ Thêm danh mục công việc mới"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        placeholder="Nhập tên danh mục..."
                        className="w-full border rounded-xl p-2.5 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#48BFE3]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Hệ số Trọng số KPI
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={catWeight}
                        onChange={e => setCatWeight(e.target.value)}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#48BFE3]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Tổ / Ban</label>
                      <select
                        value={catRole}
                        onChange={e => setCatRole(e.target.value)}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#48BFE3]"
                      >
                        {roles.map((r: any) => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Gán Nhóm chuyên môn</label>
                      <select
                        value={catGroupName}
                        onChange={e => setCatGroupName(e.target.value)}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#48BFE3]"
                      >
                        <option value="">-- Chọn nhóm --</option>
                        {taskGroupsList.map((g: any) => (
                          <option key={g.name} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    {catEditId && (
                      <button
                        onClick={() => { setCatEditId(null); setCatName(""); setCatRole(roles?.[0]?.code || ""); setCatGroupName(""); setCatWeight(1.0) }}
                        className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-200 transition-all"
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      onClick={handleSaveCategory}
                      className="bg-[#48BFE3] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#00A19A] transition-all shadow-xs"
                    >
                      {catEditId ? "Cập nhật" : "Thêm mới"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh mục hiện có ({categoriesList.length})</h4>
                  <div className="border rounded-2xl divide-y divide-slate-100 max-h-[35vh] overflow-y-auto bg-white">
                    {categoriesList.map((c: any) => (
                      <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800">{c.name}</span>
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-extrabold">
                              ⚖️ Trọng số: x{c.weight ?? 1.0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.groupName && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold">
                                📁 Nhóm: {c.groupName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { 
                              setCatEditId(c.id); setCatName(c.name); setCatRole(c.assignedToRole); setCatGroupName(c.groupName || ""); setCatWeight(c.weight ?? 1.0) 
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NHÓM CHUYÊN MÔN & PHÂN CÔNG TRƯỞNG NHÓM */}
            {catTab === "groups" && (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* List of Groups */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Danh sách 5 Nhóm Chuyên Môn & Trưởng Nhóm Phụ Trách ({taskGroupsList.length})
                  </h4>
                  <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                    {taskGroupsList.map((g: any) => {
                      let members: string[] = []
                      if (g.memberUserIds) {
                        try {
                          members = typeof g.memberUserIds === "string" ? JSON.parse(g.memberUserIds) : g.memberUserIds
                        } catch (e) {
                          members = []
                        }
                      } else if (Array.isArray(g.memberUserIdsList)) {
                        members = g.memberUserIdsList
                      }

                      const assignedUsers = (allStaffUsers || []).filter((u: any) => members.includes(u.id))

                      return (
                        <div key={g.id} className="p-4 border rounded-2xl bg-white hover:border-teal-300 transition-all space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-black text-sm text-slate-800 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                              {g.name}
                              <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                {g.department || "KT&ĐBCL"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenAssignModal(g)}
                                className="flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-[#00A19A] border border-teal-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                              >
                                <Users className="w-3.5 h-3.5" /> Gán nhân sự ({members.length})
                              </button>
                            </div>
                          </div>

                          {/* Leader Selection Row */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                            <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                              👑 Trưởng nhóm chuyên môn:
                            </span>
                            <select
                              value={g.leaderUserId || ""}
                              onChange={e => handleSetGroupLeaderAction(g.id, e.target.value)}
                              className="text-xs p-1.5 border border-amber-300 rounded-xl bg-amber-50 font-bold text-slate-800 outline-none"
                            >
                              <option value="">-- Chưa chỉ định Trưởng nhóm --</option>
                              {allStaffUsers.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                              ))}
                            </select>
                          </div>

                          {/* Member chips */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] font-bold text-slate-400 mr-1">Thành viên:</span>
                            {assignedUsers.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">Chưa có thành viên nào</span>
                            ) : (
                              assignedUsers.map((u: any) => (
                                <span key={u.id} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                  {u.fullName}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CẤU HÌNH QUẢN TRỊ & PHÂN QUYỀN TÙY CHỈNH (DYNAMIC PERMISSIONS) */}
            {catTab === "settings" && (
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* 1. Topology Configuration */}
                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" /> 1. Cơ cấu Tổ chức & Cấp bậc Quản trị (Topology)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                      deptSettings.topology === "3_LEVEL" ? "bg-teal-50/70 border-teal-400 ring-2 ring-[#48BFE3]" : "bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="topology"
                        checked={deptSettings.topology === "3_LEVEL"}
                        onChange={() => setDeptSettings({ ...deptSettings, topology: "3_LEVEL", hasTeams: true })}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-extrabold text-slate-800">Mô hình 3 Cấp: Ban ➔ Nhóm ➔ Cá nhân</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Phù hợp Ban KT&ĐBCL có nhiều nhóm nghiệp vụ chuyên môn sâu.</p>
                      </div>
                    </label>

                    <label className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                      deptSettings.topology === "2_LEVEL" ? "bg-teal-50/70 border-teal-400 ring-2 ring-[#48BFE3]" : "bg-white"
                    }`}>
                      <input
                        type="radio"
                        name="topology"
                        checked={deptSettings.topology === "2_LEVEL"}
                        onChange={() => setDeptSettings({ ...deptSettings, topology: "2_LEVEL", hasTeams: false })}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-extrabold text-slate-800">Mô hình 2 Cấp: Ban ➔ Cá nhân</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Mô hình phẳng dành cho phòng ban tinh gọn, ít nhân sự.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 2. Ma trận Phân quyền Tùy biến (Checkboxes) */}
                <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" /> 2. Ma trận Phân quyền Tùy chỉnh theo Vai trò
                  </h4>
                  
                  <div className="space-y-2.5 text-xs">
                    <div className="font-bold text-slate-600 text-[11px] uppercase">Quyền của Trưởng Nhóm Chuyên Môn:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.permissions?.leader?.canViewOtherTeams ?? true}
                          onChange={e => setDeptSettings({
                            ...deptSettings,
                            permissions: {
                              ...deptSettings.permissions,
                              leader: { ...deptSettings.permissions?.leader, canViewOtherTeams: e.target.checked }
                            }
                          })}
                          className="rounded text-teal-600"
                        />
                        <span>Được xem việc của nhóm khác (Read-only)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.permissions?.leader?.canAssignAcrossTeams ?? false}
                          onChange={e => setDeptSettings({
                            ...deptSettings,
                            permissions: {
                              ...deptSettings.permissions,
                              leader: { ...deptSettings.permissions?.leader, canAssignAcrossTeams: e.target.checked }
                            }
                          })}
                          className="rounded text-teal-600"
                        />
                        <span>Được giao việc chéo sang nhóm khác</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.requireLeaderApproval ?? true}
                          onChange={e => setDeptSettings({ ...deptSettings, requireLeaderApproval: e.target.checked })}
                          className="rounded text-teal-600"
                        />
                        <span>Trưởng nhóm nghiệm thu tiến độ trước khi hoàn thành</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.permissions?.leader?.canManageBlockers ?? true}
                          onChange={e => setDeptSettings({
                            ...deptSettings,
                            permissions: {
                              ...deptSettings.permissions,
                              leader: { ...deptSettings.permissions?.leader, canManageBlockers: e.target.checked }
                            }
                          })}
                          className="rounded text-teal-600"
                        />
                        <span>Trưởng nhóm có quyền đóng & xác nhận giải quyết vướng mắc</span>
                      </label>
                    </div>

                    <div className="font-bold text-slate-600 text-[11px] uppercase pt-2">Quyền của Chuyên viên / Thành viên:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.requireAcceptance ?? true}
                          onChange={e => setDeptSettings({ ...deptSettings, requireAcceptance: e.target.checked })}
                          className="rounded text-teal-600"
                        />
                        <span>Bắt buộc bước "Xác nhận nhận việc"</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.enableActionItems ?? true}
                          onChange={e => setDeptSettings({ ...deptSettings, enableActionItems: e.target.checked })}
                          className="rounded text-teal-600"
                        />
                        <span>Cho phép nêu Vướng mắc & tạo Action Items</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptSettings.syncWeeklyReports ?? true}
                          onChange={e => setDeptSettings({ ...deptSettings, syncWeeklyReports: e.target.checked })}
                          className="rounded text-teal-600"
                        />
                        <span>Tự động liên thông số liệu sang Báo cáo Tuần SSM</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDepartmentSettings}
                    disabled={savingSettings}
                    className="bg-gradient-to-r from-[#48BFE3] to-[#00A19A] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-2"
                  >
                    {savingSettings ? "Đang lưu..." : "Lưu Cấu Hình Quản Trị Của Ban"}
                  </button>
                </div>
              </div>
            )}

            {/* Member Assign Sub-Modal */}
            {selectedGroupForAssign && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-100">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Phân công Nhân sự vào nhóm</h3>
                      <p className="text-xs text-teal-600 font-bold">{selectedGroupForAssign.name}</p>
                    </div>
                    <button onClick={() => setSelectedGroupForAssign(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm nhân sự..."
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#48BFE3]"
                  />

                  <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-50">
                    {allStaffUsers
                      .filter((u: any) => u.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                      .map((u: any) => {
                        const isSelected = assignedMemberIds.includes(u.id)
                        return (
                          <div 
                            key={u.id}
                            onClick={() => handleToggleMember(u.id)}
                            className="p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs"
                          >
                            <span className="font-bold text-slate-800">{u.fullName}</span>
                            <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded text-teal-600 pointer-events-none" />
                          </div>
                        )
                      })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button onClick={() => setSelectedGroupForAssign(null)} className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-100">Hủy</button>
                    <button onClick={handleSaveGroupAssignment} disabled={savingGroup} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold">
                      {savingGroup ? "Đang lưu..." : `Lưu (${assignedMemberIds.length})`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Close */}
            <div className="p-4 border-t flex justify-end bg-slate-50">
              <button
                onClick={() => setShowCategoryManager(false)}
                className="bg-white border text-slate-700 px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
