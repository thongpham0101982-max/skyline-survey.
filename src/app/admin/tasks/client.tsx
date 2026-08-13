"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { 
  ClipboardList, Plus, Bell, Edit, Trash2, AlertTriangle, User, Users, 
  MessageSquare, Send, X, CheckCircle2, LayoutList, Kanban, Calendar, 
  Search, ShieldCheck, XCircle, Clock, Filter, ArrowRight, Check, CheckSquare
} from "lucide-react"
import { 
  createTask, updateTask, deleteTask, remindTask, updateTaskProgress, 
  getUsersByRole, respondToTask, deleteTasks, createTaskCategory, 
  updateTaskCategory, deleteTaskCategory, confirmTaskAssignment, rejectTaskAssignment 
} from "./actions"
import { TaskDetailPanel } from "./TaskDetailPanel"

const PROGRESS_OPTIONS = [
  { value: "PENDING", label: "Chưa thực hiện", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "OVERDUE", label: "Trễ hạn", color: "bg-red-50 text-red-700 border-red-200" },
]

export function TasksClient({ initialTasks, years, roles, dbCategories, currentRole, currentUserId }: any) {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState(initialTasks || [])
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "timeline">("list")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [filterProgress, setFilterProgress] = useState("ALL")
  const [filterCategory, setFilterCategory] = useState("ALL")
  const [filterAcceptance, setFilterAcceptance] = useState("ALL")
  const [filterYear, setFilterYear] = useState("ALL")
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // Category Manager states
  const [categoriesList, setCategoriesList] = useState(dbCategories || [])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [catName, setCatName] = useState("")
  const [catRole, setCatRole] = useState(roles?.[0]?.code || "")
  const [catEditId, setCatEditId] = useState<string | null>(null)

  // Form fields (admin)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [assignedToRole, setAssignedToRole] = useState(roles?.[0]?.code || "")
  const [assignedToUserId, setAssignedToUserId] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [academicYearId, setAcademicYearId] = useState(() => getDefaultAcademicYearClient(years)?.id || "")
  const [roleUsers, setRoleUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [isImportant, setIsImportant] = useState(false)

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

  const isAdmin = currentRole === "ADMIN"

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

  // Fetch users by role
  useEffect(() => {
    if (!assignedToRole || !showForm) return
    setLoadingUsers(true)
    setAssignedToUserId("")
    getUsersByRole(assignedToRole).then(res => {
      setRoleUsers(res.users || [])
      setLoadingUsers(false)
    })
  }, [assignedToRole, showForm])

  // Auto assign role based on category select
  useEffect(() => {
    if (!category) return;
    const catObj = categoriesList.find((c: any) => c.name === category);
    if (catObj) {
      setAssignedToRole(catObj.assignedToRole);
    }
  }, [category, categoriesList]);

  const resetForm = () => {
    setEditId(null); setTitle(""); setCategory(""); setIsImportant(false)
    setAssignedToRole(roles?.[0]?.code || ""); setAssignedToUserId("")
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate(new Date().toISOString().slice(0, 10)); setRoleUsers([])
  }

  const handleSaveCategory = async () => {
    if (!catName.trim()) return alert("Vui lòng nhập tên danh mục!")
    const data = { name: catName.trim(), assignedToRole: catRole }
    const res = catEditId ? await updateTaskCategory(catEditId, data) : await createTaskCategory(data)
    if (res.success) {
      window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return
    const res = await deleteTaskCategory(id)
    if (res.success) {
      window.location.reload()
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Vui lòng nhập nội dung công việc!")
    if (!category.trim()) return alert("Vui lòng chọn danh mục công việc!")
    setSubmittingTask(true)
    const data = { title, category: category.trim(), assignedToRole, assignedToUserId: assignedToUserId || null, startDate, endDate, academicYearId, isImportant }
    const res: any = editId ? await updateTask(editId, data) : await createTask(data)
    setSubmittingTask(false)
    if (res.success) {
      if (!editId && (res.sent > 0 || res.emailSent > 0)) {
        const sentMsg = `${res.sent} thông báo`
        const emailMsg = res.emailSent > 0 ? ` và ${res.emailSent} email` : ''
        setTaskToast({ msg: `✅ Đã giao việc thành công! Gửi ${sentMsg}${emailMsg}`, type: 'success' })
        setTimeout(() => { setTaskToast(null); window.location.reload() }, 3000)
      } else {
        window.location.reload()
      }
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleEdit = (t: any) => {
    setEditId(t.id); setTitle(t.title); setCategory(t.category || "")
    setAssignedToRole(t.assignedToRole || roles?.[0]?.code || "")
    setAssignedToUserId(t.assignedToUserId || "")
    setStartDate(new Date(t.startDate).toISOString().slice(0, 10))
    setEndDate(new Date(t.endDate).toISOString().slice(0, 10))
    setAcademicYearId(t.academicYearId || years?.[0]?.id || "")
    setIsImportant(t.isImportant || false)
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

  const handleRejectTaskAction = async () => {
    if (!rejectingTaskId) return
    if (!rejectionReasonInput.trim()) return alert("Vui lòng nhập lý do từ chối / phản hồi!")
    setActionLoading(true)
    const res = await rejectTaskAssignment(rejectingTaskId, rejectionReasonInput.trim())
    setActionLoading(false)
    if (res.success) {
      setTasks(tasks.map((t: any) => t.id === rejectingTaskId ? { ...t, acceptanceStatus: "REJECTED", rejectionReason: rejectionReasonInput.trim() } : t))
      setRejectingTaskId(null)
      setRejectionReasonInput("")
      setTaskToast({ msg: "Đã gửi phản hồi đến người giao việc!", type: "success" })
      setTimeout(() => setTaskToast(null), 3000)
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  const handleProgressChange = async (id: string, progress: string) => {
    setTasks(tasks.map((t: any) => t.id === id ? { ...t, progress } : t))
    await updateTaskProgress(id, progress)
  }

  const handleStaffRespond = async () => {
    if (!respondingTaskId) return
    if (!respondNote.trim()) return alert("Vui lòng nhập nội dung trao đổi!")
    setSubmitting(true)
    const res = await respondToTask(respondingTaskId, { progress: respondProgress, staffNote: respondNote })
    if (res.success) {
      setTaskToast({ msg: "Đã cập nhật tiến độ công việc!", type: "success" })
      setTimeout(() => { setTaskToast(null); window.location.reload() }, 1500)
    } else {
      alert("Lỗi: " + res.error)
    }
    setSubmitting(false)
  }

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return
    if (!confirm(`Xóa ${selectedTaskIds.length} công việc đã chọn?`)) return
    const res = await deleteTasks(selectedTaskIds)
    if (res.success) {
      setTasks(tasks.filter((t: any) => !selectedTaskIds.includes(t.id)))
      setSelectedTaskIds([])
    } else {
      alert("Lỗi: " + res.error)
    }
  }

  // Filter tasks
  const displayedTasks = tasks.filter((t: any) => {
    const matchProgress = filterProgress === "ALL" || t.progress === filterProgress;
    const matchCategory = filterCategory === "ALL" || t.category === filterCategory;
    const matchAcceptance = filterAcceptance === "ALL" || (t.acceptanceStatus || "WAITING_CONFIRMATION") === filterAcceptance;
    const matchYear = filterYear === "ALL" || t.academicYearId === filterYear;
    
    const query = searchQuery.trim().toLowerCase()
    const matchQuery = !query || 
      t.title.toLowerCase().includes(query) || 
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.assignedToUser?.fullName && t.assignedToUser.fullName.toLowerCase().includes(query)) ||
      (t.assignedBy?.fullName && t.assignedBy.fullName.toLowerCase().includes(query)) ||
      (t.assignedToRole && t.assignedToRole.toLowerCase().includes(query))

    return matchProgress && matchCategory && matchAcceptance && matchYear && matchQuery;
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
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Toast Notification */}
      {taskToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-md animate-in slide-in-from-top-4 duration-300 ${
          taskToast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
        }`}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-white" />
          <div className="flex-1">
            <p className="font-bold text-sm">Thông báo</p>
            <p className="text-xs opacity-95">{taskToast.msg}</p>
          </div>
          <button onClick={() => setTaskToast(null)} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00A99D] shadow-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Điều hành Công việc
              <span className="text-xs px-2.5 py-1 bg-teal-100 text-[#00A99D] rounded-full font-bold">
                {stats.total} việc
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Quản lý danh mục công việc khoa học, cập nhật tiến độ & xác nhận giao việc tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switches */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "list" ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Danh sách
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "kanban" ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Kanban className="w-4 h-4" /> Bảng Thẻ
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === "timeline" ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" /> Tiến độ
            </button>
          </div>

          {isAdmin && (
            <>
              <button
                onClick={() => { setCatEditId(null); setCatName(""); setCatRole(roles?.[0]?.code || ""); setShowCategoryManager(true) }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200"
              >
                Quản lý Danh mục
              </button>
              <button
                onClick={() => { resetForm(); setShowForm(!showForm) }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#00A99D] to-[#007A72] text-white px-5 py-2 rounded-xl hover:opacity-95 transition-all shadow-md font-bold text-xs"
              >
                <Plus className="w-4 h-4" /> Giao việc mới
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Confirmation Alert Banner for Assignees */}
      {pendingConfirmationTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-5 shadow-lg border border-amber-400 animate-in fade-in duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white flex-shrink-0">
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
              className="bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              Xem ngay ({pendingConfirmationTasks.length}) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Chờ xác nhận", count: stats.waitingConfirmation, filter: "WAITING_CONFIRMATION", type: "acceptance", cls: "bg-amber-50 border-amber-200 text-amber-800", icon: Clock },
          { label: "Đang thực hiện", count: stats.inProgress, filter: "IN_PROGRESS", type: "progress", cls: "bg-blue-50 border-blue-200 text-blue-800", icon: Kanban },
          { label: "Hoàn thành", count: stats.completed, filter: "COMPLETED", type: "progress", cls: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: ShieldCheck },
          { label: "Trễ hạn", count: stats.overdue, filter: "OVERDUE", type: "progress", cls: "bg-red-50 border-red-200 text-red-800", icon: AlertTriangle },
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
                } else {
                  setFilterProgress(filterProgress === s.filter ? "ALL" : s.filter)
                  setFilterAcceptance("ALL")
                }
              }}
              className={`border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between ${s.cls} ${
                isActive ? "ring-2 ring-current ring-offset-2 scale-[1.02]" : ""
              }`}
            >
              <div>
                <div className="text-2xl font-black">{s.count}</div>
                <div className="text-xs font-bold mt-0.5 opacity-90">{s.label}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center opacity-80">
                <IconC className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, danh mục, người nhận, người giao..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#00A99D] bg-slate-50/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Academic Year Filter & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="bg-transparent text-slate-700 outline-none font-bold cursor-pointer"
              >
                <option value="ALL">Tất cả năm học</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            {selectedTaskIds.length > 0 && isAdmin && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-2xl hover:bg-red-700 transition-colors shadow-sm font-bold text-xs"
              >
                <Trash2 className="w-4 h-4" /> Xóa ({selectedTaskIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (Scientific display) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">Danh mục:</span>
          <button
            onClick={() => setFilterCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              filterCategory === "ALL"
                ? "bg-[#00A99D] border-[#00A99D] text-white shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          {filterCategoriesList.map(cat => {
            const count = tasks.filter((t: any) => t.category === cat).length
            const isActive = filterCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(isActive ? "ALL" : cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#00A99D] border-[#00A99D] text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Admin Task Assignment / Edit Form Modal */}
      {showForm && isAdmin && (
        <div className="bg-white border-2 border-[#00A99D] rounded-3xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00A99D]" />
              {editId ? "Cập nhật công việc" : "Giao công việc mới"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Danh mục công việc *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00A99D] bg-white font-bold text-slate-700"
              >
                <option value="">-- Chọn danh mục --</option>
                {categoriesList.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Tổ / Bộ phận tiếp nhận
              </label>
              <select
                value={assignedToRole}
                onChange={e => setAssignedToRole(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00A99D] bg-white font-bold text-slate-700"
              >
                {roles.map((r: any) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Chọn cá nhân cụ thể (Tùy chọn)
              </label>
              <select
                value={assignedToUserId}
                onChange={e => setAssignedToUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00A99D] disabled:bg-slate-50 font-bold text-slate-700"
              >
                <option value="">-- Giao cho cả nhóm ({roleUsers.length} người) --</option>
                {roleUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung công việc *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tên / tiêu đề công việc..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00A99D]"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="isImportant"
                checked={isImportant}
                onChange={e => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="isImportant" className="text-xs font-bold text-red-600 cursor-pointer flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Đánh dấu là công việc quan trọng / khẩn cấp
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Năm học</label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00A99D]"
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
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00A99D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Hạn chót</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00A99D]"
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
              className="bg-gradient-to-r from-[#00A99D] to-[#007A72] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:opacity-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {submittingTask ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang gửi email thông báo...</>
              ) : (
                <><Send className="w-4 h-4" /> {editId ? 'Cập nhật' : 'Giao việc & Gửi Email Thông Báo'}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Staff Response Modal */}
      {respondingTaskId && !isAdmin && (
        <div className="bg-white border-2 border-emerald-400 rounded-3xl shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Cập nhật Tiến độ & Phản hồi Công việc
            </h2>
            <button onClick={() => setRespondingTaskId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-2xl text-xs font-bold text-emerald-900 border border-emerald-100">
            📌 {tasks.find((t: any) => t.id === respondingTaskId)?.title}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Trạng thái tiến độ *</label>
            <select
              value={respondProgress}
              onChange={e => setRespondProgress(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Đã hoàn thành</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung báo cáo / Trao đổi *</label>
            <textarea
              value={respondNote}
              onChange={e => setRespondNote(e.target.value)}
              rows={4}
              placeholder="Ghi rõ nội dung đã làm, kết quả hoặc vấn đề cần trao đổi thêm..."
              className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setRespondingTaskId(null)} className="bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-200">
              Hủy
            </button>
            <button
              onClick={handleStaffRespond}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md"
            >
              <Send className="w-4 h-4" /> {submitting ? "Đang gửi..." : "Cập nhật tiến độ"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW */}
      {viewMode === "list" && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
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
                        className="w-4 h-4 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-3 text-center w-12 whitespace-nowrap">STT</th>
                  <th className="p-3 whitespace-nowrap w-36">Danh mục</th>
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
                            className="w-4 h-4 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 text-center text-slate-400 font-bold whitespace-nowrap">{i + 1}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="bg-teal-50 text-[#00A99D] border border-teal-100 font-bold px-2.5 py-1 rounded-full text-[11px]">
                          {t.category || "Công việc"}
                        </span>
                      </td>
                      <td className="p-3 whitespace-normal break-words min-w-[280px] max-w-xl">
                        <div className="flex items-start gap-2 flex-wrap">
                          {t.isImportant && (
                            <span className="bg-red-100 text-red-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-600" /> QUAN TRỌNG
                            </span>
                          )}
                          <span 
                            onClick={() => setDetailTask(t)}
                            className={`font-bold cursor-pointer hover:text-[#00A99D] transition-colors leading-relaxed break-words ${
                              isOverdue ? "text-red-900" : "text-slate-800"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                        {t.assignedBy?.fullName && (
                          <div className="text-[11px] text-slate-400 mt-1">Bởi: {t.assignedBy.fullName}</div>
                        )}
                        {t.staffNote && (
                          <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 break-words">
                            <span className="font-bold text-teal-700">Phản hồi:</span> {t.staffNote}
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
                            title="Xem & Bình luận"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg font-bold"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {isAdmin ? (
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
                          ) : (
                            <button
                              onClick={() => { setRespondingTaskId(t.id); setRespondProgress(t.progress === "PENDING" ? "IN_PROGRESS" : t.progress); setRespondNote(t.staffNote || ""); }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Báo tiến độ
                            </button>
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
            { key: "WAITING_CONFIRMATION", title: "Chờ xác nhận / Mới", color: "border-amber-300 bg-amber-50/30", badge: "bg-amber-500 text-white" },
            { key: "IN_PROGRESS", title: "Đang thực hiện", color: "border-blue-300 bg-blue-50/30", badge: "bg-blue-600 text-white" },
            { key: "COMPLETED", title: "Hoàn thành", color: "border-emerald-300 bg-emerald-50/30", badge: "bg-emerald-600 text-white" },
            { key: "OVERDUE", title: "Trễ hạn", color: "border-red-300 bg-red-50/30", badge: "bg-red-600 text-white" },
          ].map(col => {
            const colTasks = displayedTasks.filter((t: any) => {
              if (col.key === "WAITING_CONFIRMATION") {
                return (t.acceptanceStatus || "WAITING_CONFIRMATION") === "WAITING_CONFIRMATION" && t.progress !== "COMPLETED" && t.progress !== "OVERDUE"
              }
              if (col.key === "IN_PROGRESS") {
                return t.progress === "IN_PROGRESS" && t.acceptanceStatus !== "WAITING_CONFIRMATION"
              }
              return t.progress === col.key
            })

            return (
              <div key={col.key} className={`border-2 rounded-3xl p-4 flex flex-col space-y-3 min-h-[500px] ${col.color}`}>
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    {col.title}
                  </h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                      Không có công việc
                    </div>
                  )}
                  {colTasks.map((t: any) => (
                    <div 
                      key={t.id} 
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-teal-50 text-[#00A99D] font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {t.category || "Công việc"}
                        </span>
                        {t.isImportant && (
                          <span className="bg-red-100 text-red-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> QUAN TRỌNG
                          </span>
                        )}
                      </div>

                      <h4 
                        onClick={() => setDetailTask(t)}
                        className="font-bold text-xs text-slate-800 cursor-pointer hover:text-[#00A99D] leading-snug"
                      >
                        {t.title}
                      </h4>

                      <div className="text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Người nhận:</span>
                          <span className="font-bold text-indigo-700">{t.assignedToUser?.fullName || t.assignedToRole}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Hạn chót:</span>
                          <span className="font-bold text-red-600">{new Date(t.endDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t flex items-center justify-between">
                        {t.acceptanceStatus === "WAITING_CONFIRMATION" && (t.assignedToUserId === currentUserId || (!t.assignedToUserId && currentRole === t.assignedToRole)) ? (
                          <button
                            onClick={() => handleConfirmTaskAction(t.id)}
                            className="bg-emerald-600 text-white font-bold px-3 py-1 rounded-xl text-[11px] flex items-center gap-1 hover:bg-emerald-700 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Xác nhận nhận việc
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Giao bởi: {t.assignedBy?.fullName}</span>
                        )}

                        <button
                          onClick={() => setDetailTask(t)}
                          className="text-[#00A99D] hover:underline text-xs font-bold"
                        >
                          Chi tiết &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW MODE 3: TIMELINE / CALENDAR SCHEDULE VIEW */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00A99D]" /> Tiến độ & Thời gian thực hiện Công việc
          </h3>

          <div className="space-y-4">
            {displayedTasks.map((t: any) => {
              const start = new Date(t.startDate)
              const end = new Date(t.endDate)
              const now = new Date()
              const isOverdue = t.progress === "OVERDUE"
              const isCompleted = t.progress === "COMPLETED"

              return (
                <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-100 text-[#00A99D] font-bold text-xs px-2.5 py-0.5 rounded-full">
                        {t.category || "Công việc"}
                      </span>
                      <span onClick={() => setDetailTask(t)} className="font-bold text-xs text-slate-800 cursor-pointer hover:text-[#00A99D]">
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
                        isCompleted ? "bg-emerald-500" : isOverdue ? "bg-red-500" : "bg-[#00A99D]"
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

      {/* Task Detail Panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={() => window.location.reload()}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-base text-slate-800">Quản lý Danh mục Công việc</h3>
              <button onClick={() => setShowCategoryManager(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 bg-slate-50 border rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {catEditId ? "Cập nhật danh mục" : "Thêm danh mục mới"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tên danh mục</label>
                    <input
                      type="text"
                      value={catName}
                      onChange={e => setCatName(e.target.value)}
                      placeholder="Nhập tên..."
                      className="w-full border rounded-xl p-2 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#00A99D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tổ / Bộ phận</label>
                    <select
                      value={catRole}
                      onChange={e => setCatRole(e.target.value)}
                      className="w-full border rounded-xl p-2 text-xs outline-none bg-white font-bold focus:ring-2 focus:ring-[#00A99D]"
                    >
                      {roles.map((r: any) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  {catEditId && (
                    <button
                      onClick={() => { setCatEditId(null); setCatName(""); setCatRole(roles?.[0]?.code || "") }}
                      className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-200"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    onClick={handleSaveCategory}
                    className="bg-[#00A99D] text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-[#007A72]"
                  >
                    {catEditId ? "Cập nhật" : "Thêm mới"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách hiện tại</h4>
                <div className="border rounded-2xl divide-y divide-slate-100 max-h-[30vh] overflow-y-auto bg-white">
                  {categoriesList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Chưa có danh mục nào</div>
                  ) : (
                    categoriesList.map((c: any) => (
                      <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="font-bold text-xs text-slate-800">{c.name}</div>
                          <div className="text-[11px] text-slate-400">Tổ: {roles.find((r: any) => r.code === c.assignedToRole)?.name || c.assignedToRole}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setCatEditId(c.id); setCatName(c.name); setCatRole(c.assignedToRole) }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end bg-slate-50">
              <button
                onClick={() => setShowCategoryManager(false)}
                className="bg-white border text-slate-700 px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100"
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
