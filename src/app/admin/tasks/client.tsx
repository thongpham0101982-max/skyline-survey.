"use client"
import { useState, useEffect } from "react"
import { ClipboardList, Plus, Bell, Edit, Trash2, AlertTriangle, User, Users, MessageSquare, Send, X, CheckCircle2 } from "lucide-react"
import { createTask, updateTask, deleteTask, remindTask, updateTaskProgress, getUsersByRole, respondToTask } from "./actions"
import { TaskDetailPanel } from "./TaskDetailPanel"

const CATEGORIES = [
  { value: "KHAO_SAT", label: "Khảo Sát" },
  { value: "DAO_TAO", label: "Đào Tạo" },
  { value: "HE_THONG", label: "Hệ Thống" },
  { value: "NHAN_SU", label: "Nhân Sự" },
  { value: "KHAC", label: "Khác" },
]

const PROGRESS_OPTIONS = [
  { value: "PENDING", label: "Chưa thực hiện", color: "bg-slate-100 text-slate-600" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
  { value: "OVERDUE", label: "Trễ hạn", color: "bg-red-100 text-red-700" },
]

const STAFF_PROGRESS = [
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "COMPLETED", label: "Hoàn thành" },
]

export function TasksClient({ initialTasks, years, roles, currentRole, currentUserId }: any) {
  const [tasks, setTasks] = useState(initialTasks || [])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterProgress, setFilterProgress] = useState("ALL")

  // Form fields (admin)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("KHAO_SAT")
  const [assignedToRole, setAssignedToRole] = useState(roles?.[0]?.code || "")
  const [assignedToUserId, setAssignedToUserId] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [academicYearId, setAcademicYearId] = useState(years?.[0]?.id || "")
  const [roleUsers, setRoleUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Staff respond form
  const [respondingTaskId, setRespondingTaskId] = useState<string | null>(null)
  const [respondProgress, setRespondProgress] = useState("IN_PROGRESS")
  const [respondNote, setRespondNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [detailTask, setDetailTask] = useState<any>(null)

  const isAdmin = currentRole === "ADMIN"

  useEffect(() => {
    if (!assignedToRole || !showForm) return
    setLoadingUsers(true)
    setAssignedToUserId("")
    getUsersByRole(assignedToRole).then(res => {
      setRoleUsers(res.users || [])
      setLoadingUsers(false)
    })
  }, [assignedToRole, showForm])

  const resetForm = () => {
    setEditId(null); setTitle(""); setCategory("KHAO_SAT")
    setAssignedToRole(roles?.[0]?.code || ""); setAssignedToUserId("")
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate(new Date().toISOString().slice(0, 10)); setRoleUsers([])
  }

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Vui long nhap noi dung cong viec!")
    const data = { title, category, assignedToRole, assignedToUserId: assignedToUserId || null, startDate, endDate, academicYearId }
    const res = editId ? await updateTask(editId, data) : await createTask(data)
    if (res.success) window.location.reload()
    else alert("Loi: " + res.error)
  }

  const handleEdit = (t: any) => {
    setEditId(t.id); setTitle(t.title); setCategory(t.category || "KHAO_SAT")
    setAssignedToRole(t.assignedToRole || roles?.[0]?.code || "")
    setAssignedToUserId(t.assignedToUserId || "")
    setStartDate(new Date(t.startDate).toISOString().slice(0, 10))
    setEndDate(new Date(t.endDate).toISOString().slice(0, 10))
    setAcademicYearId(t.academicYearId || years?.[0]?.id || "")
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xoa cong viec nay?")) return
    const res = await deleteTask(id)
    if (res.success) setTasks(tasks.filter((t: any) => t.id !== id))
  }

  const handleRemind = async (id: string) => {
    const res: any = await remindTask(id)
    if (res.success) alert("Da gui " + (res.sent || 0) + " thong bao nhac viec!")
    else alert("Loi: " + res.error)
  }

  const handleProgressChange = async (id: string, progress: string) => {
    setTasks(tasks.map((t: any) => t.id === id ? { ...t, progress } : t))
    await updateTaskProgress(id, progress)
  }

  const handleStaffRespond = async () => {
    if (!respondingTaskId) return
    if (!respondNote.trim()) return alert("Vui long ghi noi dung trao doi!")
    setSubmitting(true)
    const res = await respondToTask(respondingTaskId, { progress: respondProgress, staffNote: respondNote })
    if (res.success) {
      alert("Da cap nhat trang thai cong viec!")
      window.location.reload()
    } else {
      alert("Loi: " + res.error)
    }
    setSubmitting(false)
  }

  const displayedTasks = filterProgress === "ALL" ? tasks : tasks.filter((t: any) => t.progress === filterProgress)

  const stats = {
    pending: tasks.filter((t: any) => t.progress === "PENDING").length,
    inProgress: tasks.filter((t: any) => t.progress === "IN_PROGRESS").length,
    completed: tasks.filter((t: any) => t.progress === "COMPLETED").length,
    overdue: tasks.filter((t: any) => t.progress === "OVERDUE").length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
          <ClipboardList className="w-7 h-7 text-indigo-600" />
          Điều hành Công việc
        </h1>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium">
            <Plus className="w-4 h-4" /> Giao việc mới
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Chưa thực hiện", count: stats.pending, filter: "PENDING", cls: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Đang thực hiện", count: stats.inProgress, filter: "IN_PROGRESS", cls: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Hoàn thành", count: stats.completed, filter: "COMPLETED", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Trễ hạn", count: stats.overdue, filter: "OVERDUE", cls: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.filter} onClick={() => setFilterProgress(filterProgress === s.filter ? "ALL" : s.filter)}
            className={"border rounded-xl p-4 text-center cursor-pointer hover:shadow-sm transition-all " + s.cls + (filterProgress === s.filter ? " ring-2 ring-current ring-offset-1" : "")}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs mt-1 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Admin Form */}
      {showForm && isAdmin && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-lg text-slate-700">{editId ? "Cập nhật cong viec" : "Giao cong viec moi"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Danh mục</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Nhóm quyền</label>
              <select value={assignedToRole} onChange={e => setAssignedToRole(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                {(roles || []).map((r: any) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Tai khoan (tuy chon)</label>
              <select value={assignedToUserId} onChange={e => setAssignedToUserId(e.target.value)} disabled={loadingUsers}
                className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50">
                <option value="">-- Ca nhom ({roleUsers.length} nguoi) --</option>
                {roleUsers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Noi dung cong viec</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Nhap noi dung..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Năm học</label>
              <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                {(years || []).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Bat dau</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hạn chót</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-medium">Luu</button>
            <button onClick={() => setShowForm(false)} className="bg-slate-100 px-6 py-2.5 rounded-xl hover:bg-slate-200 font-medium">Hủy</button>
          </div>
        </div>
      )}

      {/* Staff Respond Modal */}
      {respondingTaskId && !isAdmin && (
        <div className="bg-white border-2 border-emerald-300 rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Xac nhan & Trao doi cong viec
            </h2>
            <button onClick={() => setRespondingTaskId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="bg-slate-50 border rounded-lg p-3 text-sm text-slate-600">
            {tasks.find((t: any) => t.id === respondingTaskId)?.title}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Trang thai cong viec</label>
            <select value={respondProgress} onChange={e => setRespondProgress(e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
              {STAFF_PROGRESS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Noi dung trao doi / bao cao</label>
            <textarea value={respondNote} onChange={e => setRespondNote(e.target.value)}
              rows={4}
              className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              placeholder="Ghi ro noi dung da lam, van de can trao doi..." />
          </div>
          <div className="flex gap-3">
            <button onClick={handleStaffRespond} disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50">
              <Send className="w-4 h-4" /> {submitting ? "Đang gửi..." : "Gui xac nhan"}
            </button>
            <button onClick={() => setRespondingTaskId(null)} className="bg-slate-100 px-6 py-2.5 rounded-xl hover:bg-slate-200 font-medium">Hủy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase w-12">STT</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Danh mục</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Noi dung</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Nguoi nhan</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Hạn chót</th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Tiến độ</th>
              <th className="px-4 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Thao tac</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedTasks.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Chưa có công việc nao</td></tr>
            )}
            {displayedTasks.map((t: any, i: number) => {
              const isOverdue = t.progress === "OVERDUE"
              const progressOpt = PROGRESS_OPTIONS.find(p => p.value === t.progress) || PROGRESS_OPTIONS[0]
              const roleName = (roles || []).find((r: any) => r.code === t.assignedToRole)?.name || t.assignedToRole
              const assigneeName = t.assignedToUser?.fullName || null
              const hasStaffNote = t.staffNote && t.staffNote.trim()
              return (
                <tr key={t.id} className={"transition-colors " + (isOverdue ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50")}>
                  <td className="px-4 py-4 text-slate-400 text-center">{i + 1}</td>
                  <td className="px-4 py-4">
                    <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                      {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={"font-semibold cursor-pointer hover:text-indigo-600 transition-colors " + (isOverdue ? "text-red-800" : "text-slate-800")} onClick={() => setDetailTask(t)}>{t.title}</div>
                    {t.assignedBy?.fullName && <div className="text-xs text-slate-400 mt-0.5">Boi: {t.assignedBy.fullName}</div>}
                    {hasStaffNote && (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-0.5">
                          <MessageSquare className="w-3 h-3" /> Phan hoi tu nhan vien:
                        </div>
                        <div className="text-xs text-emerald-800">{t.staffNote}</div>
                        {t.staffUpdatedAt && <div className="text-xs text-emerald-500 mt-1">{new Date(t.staffUpdatedAt).toLocaleString("vi-VN")}</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {assigneeName ? (
                      <div>
                        <div className="flex items-center gap-1"><User className="w-3 h-3 text-indigo-500" /><span className="text-sm font-medium text-indigo-700">{assigneeName}</span></div>
                        <div className="text-xs text-slate-400 mt-0.5">{roleName}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1"><Users className="w-3 h-3 text-slate-500" /><span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">{roleName}</span></div>
                    )}
                  </td>
                  <td className={"px-4 py-4 " + (isOverdue ? "text-red-700 font-semibold" : "text-slate-600")}>
                    {isOverdue && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
                    {new Date(t.endDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-4">
                    {isAdmin ? (
                      <select value={t.progress} onChange={e => handleProgressChange(t.id, e.target.value)}
                        className={"text-xs rounded px-2 py-1 border cursor-pointer " + progressOpt.color}>
                        {PROGRESS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    ) : (
                      <span className={"text-xs px-2 py-1 rounded-full font-medium " + progressOpt.color}>{progressOpt.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {isAdmin ? (
                        <>
                          <button onClick={() => handleRemind(t.id)} title="Nhắc việc" className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Bell className="w-4 h-4" /></button>
                          <button onClick={() => handleEdit(t)} title="Sua" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(t.id)} title="Xoa" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setRespondingTaskId(t.id); setRespondProgress(t.progress === "PENDING" ? "IN_PROGRESS" : t.progress); setRespondNote(t.staffNote || ""); }}
                          className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xac nhan
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
      {/* Task Detail / Collaboration Panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  )
}
