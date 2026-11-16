"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import {
  AlertCircle,
  CheckCircle2,
  Columns,
  FileUp,
  History,
  Link2,
  List,
  MessageSquare,
  PauseCircle,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Send,
  X,
  XCircle,
} from "lucide-react"
import type { WorkHubTaskRecord, WorkHubTaskStatus } from "@/lib/workhub/types"

interface WorkHubTasksViewProps {
  defaultViewMode: "MY_TASKS" | "ASSIGNED_BY_ME"
  pageTitle: string
  pageSubtitle: string
}

const STATUS_META: Record<
  WorkHubTaskStatus,
  { label: string; cls: string }
> = {
  DRAFT: { label: "Nháp", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  ASSIGNED: { label: "Đã giao", cls: "bg-[#F0FDFA] text-[#00736E] border-teal-200" },
  IN_PROGRESS: { label: "Đang thực hiện", cls: "bg-amber-50 text-[#D97706] border-amber-200" },
  PENDING_REVIEW: { label: "Chờ nghiệm thu", cls: "bg-teal-50 text-[#003B3A] border-[#00A19A]" },
  COMPLETED: { label: "Hoàn thành", cls: "bg-emerald-50 text-[#059669] border-emerald-200" },
  PAUSED: { label: "Tạm dừng", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  CANCELLED: { label: "Đã hủy", cls: "bg-rose-50 text-[#E11D48] border-rose-200" },
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URGENT: { label: "Khẩn cấp", cls: "bg-rose-50 text-[#E11D48] border-rose-200" },
  HIGH: { label: "Cao", cls: "bg-amber-50 text-[#D97706] border-amber-200" },
  MEDIUM: { label: "Trung bình", cls: "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]" },
  LOW: { label: "Thấp", cls: "bg-slate-50 text-slate-500 border-slate-200" },
}

const KANBAN_COLUMNS: WorkHubTaskStatus[] = [
  "DRAFT",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "COMPLETED",
  "PAUSED",
]

export function WorkHubTasksView({
  defaultViewMode,
  pageTitle,
  pageSubtitle,
}: WorkHubTasksViewProps) {
  const searchParams = useSearchParams()
  const initialTaskId = searchParams?.get("taskId") || null

  const [displayLayout, setDisplayLayout] = useState<"TABLE" | "KANBAN">("TABLE")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [planFilter, setPlanFilter] = useState<string>("ALL")

  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [payload, setPayload] = useState<any | null>(null)

  // Modals & Detail Drawer
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState<boolean>(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId)
  const [detailData, setDetailData] = useState<any | null>(null)
  const [detailTab, setDetailTab] = useState<"EXECUTION" | "COLLAB" | "HISTORY">("EXECUTION")
  const [detailLoading, setDetailLoading] = useState<boolean>(false)

  // Create Task Form
  const todayYmd = new Date().toISOString().slice(0, 10)
  const nextWeekYmd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newCategory, setNewCategory] = useState("Chuyên môn")
  const [newPlanId, setNewPlanId] = useState("")
  const [newParentTaskId, setNewParentTaskId] = useState("")
  const [newDeptId, setNewDeptId] = useState("")
  const [newCampusId, setNewCampusId] = useState("")
  const [newAssigneeId, setNewAssigneeId] = useState("")
  const [newCollabIds, setNewCollabIds] = useState<string[]>([])
  const [newReviewerId, setNewReviewerId] = useState("")
  const [newStartDate, setNewStartDate] = useState(todayYmd)
  const [newEndDate, setNewEndDate] = useState(nextWeekYmd)
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM")
  const [newCriteria, setNewCriteria] = useState("")
  const [newDeliverables, setNewDeliverables] = useState("")
  const [newLinkedKpiId, setNewLinkedKpiId] = useState("")
  const [newInitialStatus, setNewInitialStatus] = useState<"ASSIGNED" | "DRAFT">("ASSIGNED")
  const [submittingForm, setSubmittingForm] = useState(false)

  // Recurrence Form
  const [recTitle, setRecTitle] = useState("")
  const [recCategory, setRecCategory] = useState("Định kỳ")
  const [recFreq, setRecFreq] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [recOffsetDays, setRecOffsetDays] = useState(4)
  const [recAssigneeId, setRecAssigneeId] = useState("")
  const [recDeliverables, setRecDeliverables] = useState("")

  // Detail Execution / Review Form States
  const [execProgress, setExecProgress] = useState<number>(0)
  const [execSummary, setExecSummary] = useState<string>("")
  const [newEvLabel, setNewEvLabel] = useState<string>("")
  const [newEvUrl, setNewEvUrl] = useState<string>("")
  const [reviewNote, setReviewNote] = useState<string>("")
  const [metCriteria, setMetCriteria] = useState<boolean>(true)
  const [lifecycleReason, setLifecycleReason] = useState<string>("")
  const [newDeadlineInput, setNewDeadlineInput] = useState<string>("")
  const [reassignUserId, setReassignUserId] = useState<string>("")
  const [commentInput, setCommentInput] = useState<string>("")
  const [commentTypeInput, setCommentTypeInput] = useState<"GENERAL" | "BLOCKER">("GENERAL")

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const qs = new URLSearchParams({
        resource: "tasks",
        viewMode: defaultViewMode,
        status: statusFilter,
        planId: planFilter,
        search: searchQuery,
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (!json.success) {
        setErrorMsg(json.error || "Không tải được danh sách công việc.")
      } else {
        setPayload(json)
        if (!newAssigneeId && json.actor?.userId) {
          setNewAssigneeId(json.actor.userId)
          setRecAssigneeId(json.actor.userId)
          setNewReviewerId(json.actor.userId)
          setNewDeptId(json.actor.primaryDepartmentId || "")
          setNewCampusId(json.actor.primaryCampusId || "")
        }
      }
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ khi tải công việc.")
    } finally {
      setLoading(false)
    }
  }, [defaultViewMode, statusFilter, planFilter, searchQuery, newAssigneeId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const loadTaskDetail = useCallback(async (taskId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/workhub?resource=task-detail&taskId=${taskId}`)
      const json = await res.json()
      if (json.success) {
        setDetailData(json)
        setExecProgress(json.task.progressPercent || 0)
        setExecSummary(json.task.resultSummary || "")
        setNewDeadlineInput(json.task.endDate?.slice(0, 10) || "")
        setReassignUserId(json.task.assignedToUserId || "")
      } else {
        toast.error(json.error || "Không mở được chi tiết công việc")
        setSelectedTaskId(null)
      }
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId)
    } else {
      setDetailData(null)
    }
  }, [selectedTaskId, loadTaskDetail])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingForm(true)
    try {
      const res = await fetch("/api/workhub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TASK",
          payload: {
            title: newTitle,
            description: newDesc,
            category: newCategory,
            planId: newPlanId || null,
            isAdhoc: !newPlanId,
            parentTaskId: newParentTaskId || null,
            departmentId: newDeptId || null,
            campusId: newCampusId || null,
            academicYearId: payload?.academicYears?.[0]?.id || null,
            assignedToUserId: newAssigneeId,
            collaboratorIds: newCollabIds,
            reviewerUserId: newReviewerId || null,
            startDate: newStartDate,
            endDate: newEndDate,
            priority: newPriority,
            acceptanceCriteria: newCriteria,
            deliverables: newDeliverables,
            linkedKpiId: newLinkedKpiId || null,
            initialStatus: newInitialStatus,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã tạo công việc ${json.taskCode}`)
        setShowCreateModal(false)
        setNewTitle("")
        setNewDesc("")
        setNewParentTaskId("")
        await loadTasks()
      } else {
        toast.error(json.error || "Không tạo được công việc")
      }
    } finally {
      setSubmittingForm(false)
    }
  }

  const handleCreateRecurrence = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingForm(true)
    try {
      const res = await fetch("/api/workhub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_RECURRENCE_TEMPLATE",
          payload: {
            title: recTitle,
            category: recCategory,
            frequency: recFreq,
            dueOffsetDays: recOffsetDays,
            assignedToUserId: recAssigneeId,
            deliverables: recDeliverables,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Đã thiết lập công việc định kỳ & khởi tạo kỳ hiện tại")
        setShowRecurrenceModal(false)
        setRecTitle("")
        await loadTasks()
      } else {
        toast.error(json.error || "Lỗi tạo mẫu lặp lại")
      }
    } finally {
      setSubmittingForm(false)
    }
  }

  const runTransition = async (transitionPayload: Record<string, any>) => {
    if (!selectedTaskId) return
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TRANSITION_TASK",
        payload: {
          taskId: selectedTaskId,
          ...transitionPayload,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success("Đã cập nhật trạng thái công việc")
      setLifecycleReason("")
      setReviewNote("")
      await Promise.all([loadTaskDetail(selectedTaskId), loadTasks()])
    } else {
      toast.error(json.error || "Không thể thực hiện thao tác")
    }
  }

  const handleAddEvidenceLink = async () => {
    if (!detailData?.task || !newEvUrl.trim()) return
    const currentLinks = detailData.task.evidenceLinks || []
    await runTransition({
      action: "UPDATE_PROGRESS",
      progressPercent: execProgress,
      resultSummary: execSummary,
      evidenceLinks: [
        ...currentLinks,
        { label: newEvLabel.trim() || newEvUrl.trim(), url: newEvUrl.trim() },
      ],
    })
    setNewEvLabel("")
    setNewEvUrl("")
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTaskId) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Kích thước tệp đính kèm tối đa 4MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = String(reader.result || "")
      const res = await fetch("/api/workhub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_TASK_ATTACHMENT",
          payload: {
            taskId: selectedTaskId,
            fileName: file.name,
            fileData: base64,
            fileSize: file.size,
            contentType: file.type,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã đính kèm tệp "${file.name}"`)
        await Promise.all([loadTaskDetail(selectedTaskId), loadTasks()])
      } else {
        toast.error(json.error || "Không tải lên được tệp")
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePostComment = async () => {
    if (!selectedTaskId || !commentInput.trim()) return
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_TASK_COMMENT",
        payload: {
          taskId: selectedTaskId,
          content: commentInput,
          commentType: commentTypeInput,
        },
      }),
    })
    const json = await res.json()
    if (json.success) {
      setCommentInput("")
      await Promise.all([loadTaskDetail(selectedTaskId), loadTasks()])
    } else {
      toast.error(json.error || "Lỗi gửi bình luận")
    }
  }

  const tasks: WorkHubTaskRecord[] = payload?.tasks || []
  const actor = payload?.actor

  return (
    <div className="space-y-4">
      {/* Thanh công cụ & Bộ lọc */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">{pageTitle}</h2>
          <p className="text-xs text-slate-500">{pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã CV, tên công việc..."
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-slate-800 w-48 focus:outline-none focus:border-[#00A19A]"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="DRAFT">Nháp</option>
            <option value="ASSIGNED">Đã giao</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="PENDING_REVIEW">Chờ nghiệm thu</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700 max-w-[180px]"
          >
            <option value="ALL">Mọi kế hoạch / Phát sinh</option>
            <option value="ADHOC">Chỉ công việc phát sinh</option>
            {(payload?.plans || []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.planCode} • {p.title}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setDisplayLayout("TABLE")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
                displayLayout === "TABLE" ? "bg-[#003B3A] text-white" : "text-slate-600"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Bảng
            </button>
            <button
              type="button"
              onClick={() => setDisplayLayout("KANBAN")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold ${
                displayLayout === "KANBAN" ? "bg-[#003B3A] text-white" : "text-slate-600"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Trạng thái
            </button>
          </div>

          {actor?.canAssignTasks && (
            <button
              type="button"
              onClick={() => setShowRecurrenceModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100"
            >
              <Repeat className="w-3.5 h-3.5" />
              Việc lặp lại
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
          >
            <Plus className="w-3.5 h-3.5" />
            {actor?.canAssignTasks ? "Giao việc mới" : "Tạo công việc"}
          </button>
        </div>
      </div>

      {/* Trạng thái tải / lỗi / trống */}
      {loading && !payload ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A] mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Đang tải danh sách công việc...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-[#E11D48] mx-auto" />
          <p className="text-xs font-semibold text-[#E11D48]">{errorMsg}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
          <p className="text-sm font-bold text-[#003B3A]">Chưa có công việc nào trong danh sách</p>
          <p className="text-xs text-slate-500">
            Bạn có thể tạo công việc mới hoặc điều chỉnh bộ lọc trạng thái / kế hoạch ở trên.
          </p>
        </div>
      ) : displayLayout === "TABLE" ? (
        /* Chế độ 1: Bảng Sổ cái Học thuật Sky-Line */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Mã CV
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Tên & Nội dung công việc
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Kế hoạch / Nhóm
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Phụ trách & Nghiệm thu
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Ưu tiên & Hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tiến độ & Trạng thái
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {tasks.map((t) => {
                  const stMeta = STATUS_META[t.workStatus] || STATUS_META.ASSIGNED
                  const prMeta = PRIORITY_META[t.priority] || PRIORITY_META.MEDIUM
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="transition-colors align-middle hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="font-bold text-[#003B3A]">{t.taskCode}</div>
                        {t.parentTaskCode && (
                          <div className="text-[10px] text-slate-500">
                            Việc con của {t.parentTaskCode}
                          </div>
                        )}
                        {t.childCount > 0 && (
                          <div className="text-[10px] text-[#00736E] font-medium">
                            {t.childCount} việc con
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle min-w-[240px] max-w-[340px]">
                        <div className="font-semibold text-slate-900">{t.title}</div>
                        {t.deliverables && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            Đầu ra: {t.deliverables}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        {t.planTitle ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-medium">
                            {t.planTitle}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-medium">
                            Phát sinh
                          </span>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1">
                          {t.departmentName || t.category}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          Chủ trì: {t.assignedToName || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nghiệm thu: {t.reviewerName || "—"}
                        </div>
                        {t.collaboratorNames.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            +{t.collaboratorNames.length} phối hợp
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap space-y-1">
                        <div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${prMeta.cls}`}
                          >
                            {prMeta.label}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] ${
                            t.isOverdue ? "text-[#E11D48] font-bold" : "text-slate-600"
                          }`}
                        >
                          {new Date(t.endDate).toLocaleDateString("vi-VN")}
                          {t.isOverdue ? " (Quá hạn)" : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-center min-w-[140px]">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${stMeta.cls}`}
                        >
                          {stMeta.label}
                        </span>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#00A19A]"
                              style={{ width: `${t.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {t.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTaskId(t.id)
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A]"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Chế độ 2: Bảng trạng thái Kanban */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 tabular-nums">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colTasks = tasks.filter((t) => t.workStatus === colStatus)
            const stMeta = STATUS_META[colStatus]
            return (
              <div
                key={colStatus}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-3 flex flex-col max-h-[650px]"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#F1F5F9]">
                  <span className="text-xs font-bold text-[#003B3A]">{stMeta.label}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0]">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="rounded-xl border border-[#E2E8F0] hover:border-[#00A19A] bg-[#F8FAFC]/60 p-3 space-y-1.5 cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-[#00736E]">{t.taskCode}</span>
                        {t.isOverdue && (
                          <span className="text-[10px] font-bold text-[#E11D48]">Quá hạn</span>
                        )}
                      </div>
                      <div className="font-semibold text-[#003B3A] line-clamp-2">{t.title}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{t.assignedToName || "—"}</span>
                        <span>{t.progressPercent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Danh sách mẫu công việc lặp lại (nếu có) */}
      {(payload?.recurrenceTemplates || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-[#00A19A]" />
            Mẫu công việc lặp lại định kỳ ({payload.recurrenceTemplates.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs tabular-nums">
            {payload.recurrenceTemplates.map((tpl: any) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-[#003B3A]">{tpl.title}</div>
                  <div className="text-[11px] text-slate-500">
                    Chu kỳ: {tpl.frequency === "MONTHLY" ? "Hằng tháng" : "Hằng tuần"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/workhub", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "GENERATE_RECURRENCE_PERIOD",
                        payload: { templateId: tpl.id },
                      }),
                    })
                    const json = await res.json()
                    if (json.success) {
                      if (json.duplicateSkipped) {
                        toast("Kỳ hiện tại đã được tạo trước đó (đã chặn tạo trùng).")
                      } else {
                        toast.success("Đã phát sinh công việc cho kỳ hiện tại")
                        await loadTasks()
                      }
                    } else {
                      toast.error(json.error || "Lỗi phát sinh kỳ")
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#00736E] hover:border-[#00A19A] shrink-0"
                >
                  Phát sinh kỳ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tạo Công việc Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateTask}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full p-5 space-y-3.5 text-xs my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Thiết lập & giao công việc mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên công việc *
                </label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
                  placeholder="Nhập tên công việc cụ thể..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thuộc Kế hoạch công tác (để trống nếu là việc phát sinh)
                </label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="">-- Công việc phát sinh ngoài kế hoạch --</option>
                  {(payload?.plans || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.planCode} • {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Là công việc con của (tùy chọn)
                </label>
                <select
                  value={newParentTaskId}
                  onChange={(e) => setNewParentTaskId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="">-- Công việc độc lập / Cấp cha --</option>
                  {tasks
                    .filter((t) => !t.parentTaskId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.taskCode} • {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Người chịu trách nhiệm chính (duy nhất 1 người) *
                </label>
                <select
                  required
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  {(payload?.users || []).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Người nghiệm thu kết quả *
                </label>
                <select
                  value={newReviewerId}
                  onChange={(e) => setNewReviewerId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  {(payload?.users || []).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phòng ban / Tổ chuyên môn
                </label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="">-- Chọn phòng ban --</option>
                  {(payload?.departments || []).map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cơ sở</label>
                <select
                  value={newCampusId}
                  onChange={(e) => setNewCampusId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="">-- Toàn hệ thống / Mặc định --</option>
                  {(payload?.campuses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu *</label>
                <input
                  required
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hạn hoàn thành *</label>
                <input
                  required
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức ưu tiên</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chỉ số KPI liên quan (tùy chọn)
                </label>
                <select
                  value={newLinkedKpiId}
                  onChange={(e) => setNewLinkedKpiId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="">-- Không gắn KPI cụ thể --</option>
                  {(payload?.kpis || []).map((k: any) => (
                    <option key={k.id} value={k.id}>
                      {k.kpiCode} • {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Sản phẩm đầu ra & Tiêu chí nghiệm thu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newDeliverables}
                    onChange={(e) => setNewDeliverables(e.target.value)}
                    placeholder="Sản phẩm đầu ra (VD: Báo cáo PDF, bộ đề...)"
                    className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                  />
                  <input
                    type="text"
                    value={newCriteria}
                    onChange={(e) => setNewCriteria(e.target.value)}
                    placeholder="Tiêu chí nghiệm thu (VD: Đủ chữ ký, không sai sót)"
                    className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung hướng dẫn chi tiết
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trạng thái khởi tạo
                </label>
                <select
                  value={newInitialStatus}
                  onChange={(e) => setNewInitialStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-slate-800"
                >
                  <option value="ASSIGNED">Giao việc ngay (Đã giao)</option>
                  <option value="DRAFT">Lưu bản nháp (Nháp)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 border border-[#E2E8F0]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingForm}
                className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250] disabled:opacity-50"
              >
                {submittingForm ? "Đang lưu..." : "Lưu công việc"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Tạo Mẫu Công việc Lặp lại */}
      {showRecurrenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRecurrence}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Thiết lập công việc lặp lại theo Tuần / Tháng
              </h3>
              <button
                type="button"
                onClick={() => setShowRecurrenceModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên công việc định kỳ *</label>
              <input
                required
                type="text"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                placeholder="VD: Kiểm tra an toàn phòng thí nghiệm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tần suất lặp lại</label>
                <select
                  value={recFreq}
                  onChange={(e) => setRecFreq(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="WEEKLY">Hằng tuần (tạo từng kỳ tuần riêng)</option>
                  <option value="MONTHLY">Hằng tháng (tạo từng kỳ tháng riêng)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số ngày thực hiện mỗi kỳ</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={recOffsetDays}
                  onChange={(e) => setRecOffsetDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Người phụ trách chính</label>
              <select
                value={recAssigneeId}
                onChange={(e) => setRecAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
              >
                {(payload?.users || []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sản phẩm bàn giao mỗi kỳ</label>
              <input
                type="text"
                value={recDeliverables}
                onChange={(e) => setRecDeliverables(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRecurrenceModal(false)}
                className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 border border-[#E2E8F0]"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={submittingForm}
                className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
              >
                Lưu & Tạo kỳ đầu tiên
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ngăn Chi tiết Công việc, Thực hiện, Nghiệm thu & Lịch sử */}
      {selectedTaskId && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col text-xs">
            {detailLoading || !detailData?.task ? (
              <div className="p-10 text-center text-slate-500">Đang tải chi tiết công việc...</div>
            ) : (
              <>
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-3">
                  <div className="border-l-4 border-[#003B3A] pl-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 tabular-nums">
                      <span className="font-bold text-[#00736E]">{detailData.task.taskCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          STATUS_META[detailData.task.workStatus as WorkHubTaskStatus]?.cls
                        }`}
                      >
                        {STATUS_META[detailData.task.workStatus as WorkHubTaskStatus]?.label}
                      </span>
                      {detailData.task.isOverdue && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-[#E11D48] border border-rose-200">
                          Quá hạn (tự động xác định từ hệ thống)
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#003B3A]">{detailData.task.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-5 pt-3 border-b border-[#F1F5F9] flex gap-2">
                  {[
                    { key: "EXECUTION", label: "Thực hiện & Nghiệm thu" },
                    {
                      key: "COLLAB",
                      label: `Minh chứng & Bình luận (${
                        (detailData.attachments?.length || 0) + (detailData.comments?.length || 0)
                      })`,
                    },
                    { key: "HISTORY", label: `Lịch sử (${detailData.history?.length || 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setDetailTab(tab.key as any)}
                      className={`pb-2.5 px-2 font-semibold border-b-2 transition-colors ${
                        detailTab === tab.key
                          ? "border-[#003B3A] text-[#003B3A]"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  {detailTab === "EXECUTION" && (
                    <>
                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 tabular-nums">
                        <div>
                          <span className="text-slate-500">Chịu trách nhiệm chính:</span>
                          <div className="font-semibold text-[#003B3A]">
                            {detailData.task.assignedToName || "—"}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Người nghiệm thu:</span>
                          <div className="font-semibold text-[#003B3A]">
                            {detailData.task.reviewerName || "—"}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Hạn hoàn thành:</span>
                          <div className="font-semibold text-slate-800">
                            {new Date(detailData.task.endDate).toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Tiêu chí nghiệm thu & Đầu ra:</span>
                          <div className="font-medium text-slate-700">
                            {detailData.task.acceptanceCriteria || detailData.task.deliverables || "Theo mô tả"}
                          </div>
                        </div>
                      </div>

                      {detailData.task.reviewComment && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-slate-800">
                          <strong className="text-[#D97706]">Nhận xét nghiệm thu:</strong>{" "}
                          {detailData.task.reviewComment}
                        </div>
                      )}

                      {/* Phần dành cho Người thực hiện cập nhật tiến độ & gửi nghiệm thu */}
                      {detailData.task.workStatus !== "COMPLETED" &&
                        detailData.task.workStatus !== "CANCELLED" && (
                          <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                            <div className="font-bold text-[#003B3A]">
                              1. Cập nhật tiến độ & Kết quả thực hiện
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Lưu ý: Đạt tiến độ 100% chưa đồng nghĩa hoàn thành. Sau khi cập nhật kết quả và minh chứng, hãy nhấn &quot;Gửi nghiệm thu&quot;.
                            </p>

                            {detailData.task.workStatus === "DRAFT" && (
                              <button
                                type="button"
                                onClick={() => runTransition({ action: "PUBLISH_DRAFT" })}
                                className="px-3.5 py-2 rounded-xl font-semibold bg-[#00A19A] text-white"
                              >
                                Phát hành giao việc chính thức
                              </button>
                            )}

                            <div className="flex items-center gap-3 tabular-nums">
                              <span className="font-semibold text-slate-700 w-24">
                                Tiến độ: {execProgress}%
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={execProgress}
                                onChange={(e) => setExecProgress(Number(e.target.value))}
                                className="flex-1 accent-[#00A19A]"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">
                                Tóm tắt kết quả & sản phẩm đạt được
                              </label>
                              <textarea
                                rows={3}
                                value={execSummary}
                                onChange={(e) => setExecSummary(e.target.value)}
                                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                                placeholder="Mô tả kết quả thực hiện..."
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  runTransition({
                                    action: "UPDATE_PROGRESS",
                                    progressPercent: execProgress,
                                    resultSummary: execSummary,
                                  })
                                }
                                className="px-3.5 py-2 rounded-xl font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A]"
                              >
                                Lưu tiến độ ({execProgress}%)
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  runTransition({
                                    action: "SUBMIT_FOR_REVIEW",
                                    resultSummary: execSummary,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Gửi nghiệm thu
                              </button>
                            </div>
                          </div>
                        )}

                      {/* Phần dành cho Người nghiệm thu */}
                      {detailData.task.workStatus === "PENDING_REVIEW" && (
                        <div className="rounded-xl border-2 border-[#00A19A] bg-[#F0FDFA]/50 p-4 space-y-3">
                          <div className="font-bold text-[#003B3A]">
                            2. Xét duyệt nghiệm thu (Chỉ dành cho Người nghiệm thu / Quản lý)
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={metCriteria}
                              onChange={(e) => setMetCriteria(e.target.checked)}
                              className="rounded text-[#00A19A]"
                            />
                            <span className="font-medium text-slate-800">
                              Sản phẩm đầu ra đáp ứng đầy đủ tiêu chí nghiệm thu
                            </span>
                          </label>

                          <textarea
                            rows={2}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Nhập nhận xét nghiệm thu hoặc nội dung yêu cầu bổ sung (bắt buộc nếu trả lại)..."
                            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({
                                  action: "APPROVE_COMPLETE",
                                  reviewComment: reviewNote,
                                  productMetCriteria: metCriteria,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold bg-[#059669] text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Xác nhận Hoàn thành
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                runTransition({
                                  action: "REQUEST_REVISION",
                                  reviewComment: reviewNote,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Yêu cầu bổ sung (Trả về Đang thực hiện)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Phần quản lý vòng đời: Đổi hạn, Giao lại, Tạm dừng, Hủy (Bắt buộc lý do) */}
                      <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                        <div className="font-bold text-slate-700">
                          Điều chỉnh quản lý (Đổi hạn / Giao lại / Tạm dừng / Hủy — Bắt buộc ghi lý do)
                        </div>
                        <input
                          type="text"
                          value={lifecycleReason}
                          onChange={(e) => setLifecycleReason(e.target.value)}
                          placeholder="Nhập lý do điều chỉnh, tạm dừng hoặc hủy..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex gap-1.5">
                            <input
                              type="date"
                              value={newDeadlineInput}
                              onChange={(e) => setNewDeadlineInput(e.target.value)}
                              className="flex-1 rounded-xl border border-[#E2E8F0] px-2.5 py-1.5 tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({
                                  action: "CHANGE_DEADLINE",
                                  newEndDate: newDeadlineInput,
                                  reason: lifecycleReason,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700"
                            >
                              Đổi hạn
                            </button>
                          </div>

                          <div className="flex gap-1.5">
                            <select
                              value={reassignUserId}
                              onChange={(e) => setReassignUserId(e.target.value)}
                              className="flex-1 rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                            >
                              {(payload?.users || []).map((u: any) => (
                                <option key={u.id} value={u.id}>
                                  {u.fullName}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({
                                  action: "REASSIGN",
                                  newAssignedToUserId: reassignUserId,
                                  reason: lifecycleReason,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700"
                            >
                              Giao lại
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {detailData.task.workStatus === "PAUSED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({ action: "RESUME", reason: lifecycleReason })
                              }
                              className="px-3 py-1.5 rounded-xl font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200"
                            >
                              Tiếp tục công việc
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({ action: "PAUSE", reason: lifecycleReason })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-700 border border-slate-300"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              Tạm dừng
                            </button>
                          )}

                          {detailData.task.workStatus !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() =>
                                runTransition({ action: "CANCEL", reason: lifecycleReason })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold bg-rose-50 text-[#E11D48] border border-rose-200"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Hủy công việc
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {detailTab === "COLLAB" && (
                    <div className="space-y-4">
                      {/* Minh chứng tệp & liên kết */}
                      <div className="rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#003B3A]">Tệp & Liên kết minh chứng</span>
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 font-semibold cursor-pointer">
                            <FileUp className="w-3.5 h-3.5" />
                            Tải tệp lên
                            <input type="file" className="hidden" onChange={handleUploadFile} />
                          </label>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newEvLabel}
                            onChange={(e) => setNewEvLabel(e.target.value)}
                            placeholder="Tên minh chứng"
                            className="w-1/3 rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                          />
                          <input
                            type="url"
                            value={newEvUrl}
                            onChange={(e) => setNewEvUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={handleAddEvidenceLink}
                            className="px-3 py-1.5 rounded-xl font-semibold bg-[#003B3A] text-white"
                          >
                            Thêm link
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {(detailData.task.evidenceLinks || []).map((ev: any, i: number) => (
                            <a
                              key={i}
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-[#00736E] hover:underline font-medium"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              {ev.label}
                            </a>
                          ))}
                          {(detailData.attachments || []).map((att: any) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-slate-700 tabular-nums"
                            >
                              <span>{att.fileName}</span>
                              <span className="text-[11px] text-slate-400">
                                {Math.round((att.fileSize || 0) / 1024)} KB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bình luận & Báo vướng mắc */}
                      <div className="rounded-xl border border-[#E2E8F0] p-3.5 space-y-2.5">
                        <div className="font-bold text-[#003B3A]">Trao đổi & Ghi nhận vướng mắc</div>
                        <div className="flex gap-2">
                          <select
                            value={commentTypeInput}
                            onChange={(e) => setCommentTypeInput(e.target.value as any)}
                            className="rounded-xl border border-[#E2E8F0] px-2.5 py-1.5"
                          >
                            <option value="GENERAL">Trao đổi</option>
                            <option value="BLOCKER">Báo vướng mắc</option>
                          </select>
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Nhập nội dung bình luận..."
                            className="flex-1 rounded-xl border border-[#E2E8F0] px-3 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={handlePostComment}
                            className="px-3.5 py-1.5 rounded-xl font-semibold bg-[#003B3A] text-white"
                          >
                            Gửi
                          </button>
                        </div>

                        <div className="space-y-2 pt-2">
                          {(detailData.comments || []).map((c: any) => (
                            <div
                              key={c.id}
                              className={`rounded-xl p-2.5 border ${
                                c.commentType === "BLOCKER"
                                  ? "bg-rose-50/70 border-rose-200"
                                  : "bg-[#F8FAFC] border-[#E2E8F0]"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <strong className="text-slate-800">
                                  {c.user?.fullName || "Nhân sự"}
                                </strong>
                                <span>{new Date(c.createdAt).toLocaleString("vi-VN")}</span>
                              </div>
                              <p className="mt-1 text-slate-700">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTab === "HISTORY" && (
                    <div className="space-y-2.5 tabular-nums">
                      {(detailData.history || []).map((h: any) => (
                        <div
                          key={h.id}
                          className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#003B3A]">{h.eventType}</span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(h.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Thực hiện bởi: <strong>{h.actorName}</strong>
                            {h.fromValue || h.toValue
                              ? ` (${h.fromValue || "—"} → ${h.toValue || "—"})`
                              : ""}
                          </div>
                          {h.reason && (
                            <div className="text-slate-700">Lý do / Ghi chú: {h.reason}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
