"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  Users,
  UserCheck,
  UsersRound,
  Repeat,
  Plus,
  Trash2,
  CheckSquare,
  Calendar,
  FileCheck2,
  Link2,
  Layers,
  AlertCircle,
} from "lucide-react"
import type {
  AssignmentMode,
  ChecklistStepItem,
  WorkspaceCardKey,
} from "@/lib/qa-workspace/types"
import { DEFAULT_WORKSPACE_CARDS } from "@/lib/qa-workspace/workflowEngine"
import { createQaWorkspaceTask, updateQaWorkspaceTask } from "../qa_workspace_actions"

interface TaskAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingTask?: any | null
  presetDraft?: {
    title?: string
    description?: string
    category?: string
    taskGroupId?: string | null
    workspaceCardKey?: WorkspaceCardKey | null
    assignmentMode?: AssignmentMode
    assignedToUserId?: string | null
    assignedToUserIds?: string[]
    collaboratorUserIds?: string[]
    reviewerUserId?: string | null
    startDate?: string
    endDate?: string
    reviewDueDate?: string | null
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
    deliverables?: string
    completionCriteria?: string
    requiredEvidences?: string
    checklistSteps?: ChecklistStepItem[]
    scopeSubject?: string | null
    scopeGradeLevel?: string | null
    sourceModule?: string | null
    sourceRecordId?: string | null
    sourceUrl?: string | null
  } | null
  taskGroups: any[]
  dbCategories: any[]
  allStaffUsers: any[]
  years: any[]
  campuses: any[]
  defaultDepartment?: string
  departments?: any[]
}

export function TaskAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  editingTask,
  presetDraft,
  taskGroups,
  dbCategories,
  allStaffUsers,
  years,
  campuses,
  defaultDepartment = "KT&ĐBCL",
  departments = [],
}: TaskAssignmentModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const nextWeekStr = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)

  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("INDIVIDUAL")
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(defaultDepartment || "KT&ĐBCL")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Khảo thí & Kiểm tra định kỳ")
  const [workspaceCardKey, setWorkspaceCardKey] = useState<WorkspaceCardKey>("KHAO_THI")
  const [taskGroupId, setTaskGroupId] = useState<string>("")

  const [assignedToUserId, setAssignedToUserId] = useState<string>("")
  const [multiAssigneeIds, setMultiAssigneeIds] = useState<string[]>([])
  const [collaboratorUserIds, setCollaboratorUserIds] = useState<string[]>([])
  const [reviewerUserId, setReviewerUserId] = useState<string>("")

  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(nextWeekStr)
  const [reviewDueDate, setReviewDueDate] = useState("")
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM")
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [saveAsDraft, setSaveAsDraft] = useState(false)

  const [deliverables, setDeliverables] = useState("")
  const [completionCriteria, setCompletionCriteria] = useState("")
  const [requiredEvidences, setRequiredEvidences] = useState("")

  // Checklist steps & step dependency
  const [checklistSteps, setChecklistSteps] = useState<ChecklistStepItem[]>([])
  const [newStepTitle, setNewStepTitle] = useState("")
  const [newStepDependsOn, setNewStepDependsOn] = useState("")

  // Recurrence config
  const [recurrenceFreq, setRecurrenceFreq] = useState<"WEEKLY" | "MONTHLY">("WEEKLY")
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number>(1) // Thứ Hai
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1)

  // Scope fields
  const [academicYearId, setAcademicYearId] = useState<string>(years[0]?.id || "")
  const [scopeCampusId, setScopeCampusId] = useState<string>("")
  const [scopeGradeLevel, setScopeGradeLevel] = useState<string>("")
  const [scopeClassId, setScopeClassId] = useState<string>("")
  const [scopeSubject, setScopeSubject] = useState<string>("")
  const [scopeSurveyPeriod, setScopeSurveyPeriod] = useState<string>("")
  const [sourceModule, setSourceModule] = useState<string>("")
  const [sourceRecordId, setSourceRecordId] = useState<string>("")
  const [sourceUrl, setSourceUrl] = useState<string>("")

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setErrorMsg(null)

    if (editingTask) {
      const meta = editingTask.qaMeta || {}
      setAssignmentMode(meta.assignmentMode || "INDIVIDUAL")
      setTitle(editingTask.title || "")
      setDescription(editingTask.description || "")
      setCategory(editingTask.category || "Khảo thí")
      setWorkspaceCardKey(meta.workspaceCardKey || "KHAO_THI")
      setTaskGroupId(editingTask.taskGroupId || "")
      setAssignedToUserId(editingTask.assignedToUserId || "")
      setCollaboratorUserIds(meta.collaboratorUserIds || [])
      setReviewerUserId(meta.reviewerUserId || "")
      setStartDate(
        editingTask.startDate
          ? new Date(editingTask.startDate).toISOString().slice(0, 10)
          : todayStr
      )
      setEndDate(
        editingTask.endDate
          ? new Date(editingTask.endDate).toISOString().slice(0, 10)
          : nextWeekStr
      )
      setReviewDueDate(
        meta.reviewDueDate ? String(meta.reviewDueDate).slice(0, 10) : ""
      )
      setPriority((editingTask.priority as any) || "MEDIUM")
      setRequiresApproval(meta.requiresApproval !== false)
      setDeliverables(meta.deliverables || "")
      setCompletionCriteria(meta.completionCriteria || "")
      setRequiredEvidences(meta.requiredEvidences || "")
      setChecklistSteps(meta.checklistJson || [])
      setAcademicYearId(editingTask.academicYearId || years[0]?.id || "")
      setScopeCampusId(meta.scopeCampusId || "")
      setScopeGradeLevel(meta.scopeGradeLevel || "")
      setScopeClassId(meta.scopeClassId || "")
      setScopeSubject(meta.scopeSubject || "")
      setScopeSurveyPeriod(meta.scopeSurveyPeriod || "")
      setSourceModule(meta.sourceModule || "")
      setSourceRecordId(meta.sourceRecordId || "")
      setSourceUrl(meta.sourceUrl || "")
    } else if (presetDraft) {
      setAssignmentMode(presetDraft.assignmentMode || "INDIVIDUAL")
      setTitle(presetDraft.title || "")
      setDescription(presetDraft.description || "")
      setCategory(presetDraft.category || dbCategories[0]?.name || "Khảo thí")
      setWorkspaceCardKey(presetDraft.workspaceCardKey || "KHAO_THI")
      setTaskGroupId(presetDraft.taskGroupId || "")
      setAssignedToUserId(presetDraft.assignedToUserId || "")
      setMultiAssigneeIds(presetDraft.assignedToUserIds || [])
      setCollaboratorUserIds(presetDraft.collaboratorUserIds || [])
      setReviewerUserId(presetDraft.reviewerUserId || "")
      setStartDate(presetDraft.startDate ? presetDraft.startDate.slice(0, 10) : todayStr)
      setEndDate(presetDraft.endDate ? presetDraft.endDate.slice(0, 10) : nextWeekStr)
      setReviewDueDate(presetDraft.reviewDueDate ? presetDraft.reviewDueDate.slice(0, 10) : "")
      setPriority(presetDraft.priority || "MEDIUM")
      setDeliverables(presetDraft.deliverables || "")
      setCompletionCriteria(presetDraft.completionCriteria || "")
      setRequiredEvidences(presetDraft.requiredEvidences || "")
      setChecklistSteps(presetDraft.checklistSteps || [])
      setScopeGradeLevel(presetDraft.scopeGradeLevel || "")
      setScopeSubject(presetDraft.scopeSubject || "")
      setSourceModule(presetDraft.sourceModule || "")
      setSourceRecordId(presetDraft.sourceRecordId || "")
      setSourceUrl(presetDraft.sourceUrl || "")
    } else {
      setAssignmentMode("INDIVIDUAL")
      setTitle("")
      setDescription("")
      setCategory(dbCategories[0]?.name || "Khảo thí")
      setWorkspaceCardKey("KHAO_THI")
      setTaskGroupId(taskGroups[0]?.id || "")
      setAssignedToUserId("")
      setMultiAssigneeIds([])
      setCollaboratorUserIds([])
      setReviewerUserId("")
      setStartDate(todayStr)
      setEndDate(nextWeekStr)
      setReviewDueDate("")
      setPriority("MEDIUM")
      setRequiresApproval(true)
      setSaveAsDraft(false)
      setDeliverables("")
      setCompletionCriteria("")
      setRequiredEvidences("")
      setChecklistSteps([])
    }
  }, [isOpen, editingTask, presetDraft, dbCategories, taskGroups, years, todayStr, nextWeekStr])

  // Auto-select group coordinator when mode = GROUP and group changes
  useEffect(() => {
    if (assignmentMode === "GROUP" && taskGroupId) {
      const grp = taskGroups.find(g => g.id === taskGroupId)
      if (grp?.leaderUserId && !assignedToUserId) {
        setAssignedToUserId(grp.leaderUserId)
      }
    }
  }, [assignmentMode, taskGroupId, taskGroups, assignedToUserId])

  if (!isOpen) return null

  const handleAddChecklistStep = () => {
    if (!newStepTitle.trim()) return
    const nextStep: ChecklistStepItem = {
      id: `step_${Date.now()}_${checklistSteps.length + 1}`,
      title: newStepTitle.trim(),
      completed: false,
      dependsOnStepId: newStepDependsOn || null,
    }
    setChecklistSteps(prev => [...prev, nextStep])
    setNewStepTitle("")
    setNewStepDependsOn("")
  }

  const handleRemoveChecklistStep = (stepId: string) => {
    setChecklistSteps(prev =>
      prev
        .filter(s => s.id !== stepId)
        .map(s => (s.dependsOnStepId === stepId ? { ...s, dependsOnStepId: null } : s))
    )
  }

  const toggleMultiAssignee = (uid: string) => {
    setMultiAssigneeIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const toggleCollaborator = (uid: string) => {
    setCollaboratorUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tên công việc.")
      return
    }

    if (assignmentMode === "MULTI_INDIVIDUAL") {
      if (multiAssigneeIds.length === 0) {
        setErrorMsg("Vui lòng chọn ít nhất 1 cá nhân trong danh sách giao việc đồng loạt.")
        return
      }
    } else if (assignmentMode === "GROUP") {
      const grp = taskGroups.find(g => g.id === taskGroupId)
      if (!assignedToUserId && !grp?.leaderUserId) {
        setErrorMsg(
          "Mỗi nhiệm vụ phải có một người chịu trách nhiệm chính (Người điều phối nhóm)."
        )
        return
      }
    } else {
      if (!assignedToUserId) {
        setErrorMsg("Mỗi nhiệm vụ luôn phải có một người chịu trách nhiệm chính.")
        return
      }
    }

    setSubmitting(true)
    try {
      if (editingTask?.id) {
        const res = await updateQaWorkspaceTask(editingTask.id, {
          title,
          description,
          category,
          taskGroupId: taskGroupId || null,
          workspaceCardKey,
          assignedToUserId: assignedToUserId || undefined,
          collaboratorUserIds,
          reviewerUserId: reviewerUserId || null,
          startDate,
          endDate,
          reviewDueDate: reviewDueDate || null,
          priority,
          deliverables,
          completionCriteria,
          requiredEvidences,
          checklistSteps,
          requiresApproval,
          scopeCampusId: scopeCampusId || null,
          scopeGradeLevel: scopeGradeLevel || null,
          scopeClassId: scopeClassId || null,
          scopeSubject: scopeSubject || null,
          scopeSurveyPeriod: scopeSurveyPeriod || null,
          expectedVersion: editingTask.qaMeta?.version,
        })
        if (!res.success) {
          setErrorMsg(res.error || "Không thể cập nhật nhiệm vụ.")
          return
        }
      } else {
        const res = await createQaWorkspaceTask({
          title,
          description,
          category,
          taskGroupId: taskGroupId || null,
          workspaceCardKey,
          assignmentMode,
          assignedToUserId: assignedToUserId || null,
          assignedToUserIds:
            assignmentMode === "MULTI_INDIVIDUAL" ? multiAssigneeIds : undefined,
          collaboratorUserIds,
          reviewerUserId: reviewerUserId || null,
          startDate,
          endDate,
          reviewDueDate: reviewDueDate || null,
          priority,
          deliverables,
          completionCriteria,
          requiredEvidences,
          checklistSteps,
          requiresApproval,
          isDraft: saveAsDraft,
          recurrenceRule:
            assignmentMode === "RECURRING"
              ? {
                  frequency: recurrenceFreq,
                  interval: 1,
                  dayOfWeek: recurrenceFreq === "WEEKLY" ? recurrenceDayOfWeek : undefined,
                  dayOfMonth:
                    recurrenceFreq === "MONTHLY" ? recurrenceDayOfMonth : undefined,
                  approvedForAutoRelease: true,
                }
              : null,
          academicYearId: academicYearId || null,
          scopeCampusId: scopeCampusId || null,
          scopeGradeLevel: scopeGradeLevel || null,
          scopeClassId: scopeClassId || null,
          scopeSubject: scopeSubject || null,
          scopeSurveyPeriod: scopeSurveyPeriod || null,
          sourceModule: (sourceModule as any) || null,
          sourceRecordId: sourceRecordId || null,
          sourceUrl: sourceUrl || null,
        })
        if (!res.success) {
          setErrorMsg(res.error || "Lỗi phát hành phiếu giao việc.")
          return
        }
      }

      onSuccess()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-violet-800 via-violet-700 to-indigo-800 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200">
              PHIẾU GIAO VIỆC CHUẨN HÓA — QA WORKSPACE KT&ĐBCL
            </span>
            <h2 className="text-lg font-extrabold text-white">
              {editingTask ? "Cập nhật Phiếu Giao việc" : "Phát hành Phiếu Giao việc Mới"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4 Phương thức giao việc (Mục IV) */}
          {!editingTask && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                1. Phương thức giao việc (Mỗi nhiệm vụ luôn có 1 người chịu trách nhiệm chính)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    mode: "GROUP" as AssignmentMode,
                    title: "Giao cho Nhóm",
                    desc: "Người điều phối chịu trách nhiệm & chia việc",
                    icon: Users,
                  },
                  {
                    mode: "INDIVIDUAL" as AssignmentMode,
                    title: "Giao Cá nhân",
                    desc: "1 người phụ trách chính + người phối hợp",
                    icon: UserCheck,
                  },
                  {
                    mode: "MULTI_INDIVIDUAL" as AssignmentMode,
                    title: "Nhiều Cá nhân",
                    desc: "Tạo nhiệm vụ độc lập cho từng người cùng đợt",
                    icon: UsersRound,
                  },
                  {
                    mode: "RECURRING" as AssignmentMode,
                    title: "Việc Định kỳ",
                    desc: "Theo tuần/tháng, chống sinh trùng tự động",
                    icon: Repeat,
                  },
                ].map(item => {
                  const Icon = item.icon
                  const active = assignmentMode === item.mode
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setAssignmentMode(item.mode)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "border-violet-600 bg-violet-50/70 ring-2 ring-violet-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 ${
                            active ? "text-violet-700" : "text-slate-500"
                          }`}
                        />
                        <span className="text-xs font-extrabold text-slate-900">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tên việc, nội dung & nhóm nghiệp vụ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên công việc / Nhiệm vụ <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Rà soát ma trận đề kiểm tra giữa kỳ khối 6 và nộp bảng tổng hợp điều chỉnh"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-violet-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:border-violet-600 focus:outline-none"
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Bình thường</option>
                <option value="HIGH">Ưu tiên cao</option>
                <option value="URGENT">Khẩn cấp / Quan trọng</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thẻ không gian chức năng
              </label>
              <select
                value={workspaceCardKey}
                onChange={e => setWorkspaceCardKey(e.target.value as WorkspaceCardKey)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {DEFAULT_WORKSPACE_CARDS.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhóm nhân sự chuyên môn
              </label>
              <select
                value={taskGroupId}
                onChange={e => setTaskGroupId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Toàn Ban KT&ĐBCL --</option>
                {taskGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Danh mục nghiệp vụ
              </label>
              <input
                type="text"
                list="qa-task-categories-list"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <datalist id="qa-task-categories-list">
                {dbCategories.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung hướng dẫn & bối cảnh thực hiện
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả rõ yêu cầu chuyên môn, phạm vi áp dụng, quy định tham chiếu..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:border-violet-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Người chịu trách nhiệm chính, Người phối hợp & Người duyệt (Lọc theo Tổ chuyên môn mặc định) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="text-xs font-extrabold text-slate-800">
                Phân công nhân sự thực hiện & nghiệm thu
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">
                  Tổ chuyên môn:
                </label>
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-violet-300 bg-violet-50 text-violet-900 text-xs font-extrabold"
                >
                  {(departments.length > 0
                    ? departments
                    : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]
                  ).map((d: any) => (
                    <option key={d.code} value={d.code}>
                      {d.name} {d.code === defaultDepartment ? "(Mặc định)" : ""}
                    </option>
                  ))}
                  <option value="ALL">Tất cả Tổ chuyên môn ({allStaffUsers.length} nhân sự)</option>
                </select>
              </div>
            </div>

            {(() => {
              const filteredStaff = allStaffUsers.filter(u => {
                if (!selectedDeptFilter || selectedDeptFilter === "ALL") return true
                if (
                  u.id === assignedToUserId ||
                  u.id === reviewerUserId ||
                  multiAssigneeIds.includes(u.id) ||
                  collaboratorUserIds.includes(u.id)
                ) {
                  return true
                }
                const dRel = u?.teacher?.departmentRel
                const uName = dRel?.name || ""
                const uCode = dRel?.code || ""
                const uDiv = dRel?.divisionCode || ""
                if (
                  selectedDeptFilter === "KT&ĐBCL" ||
                  selectedDeptFilter === "KT-ĐBCL" ||
                  selectedDeptFilter === "KT_DBCL"
                ) {
                  return (
                    uName === "KT&ĐBCL" ||
                    uCode === "KT-ĐBCL" ||
                    uCode === "KT&ĐBCL" ||
                    uDiv === "BAN_KT_DBCL"
                  )
                }
                return uName === selectedDeptFilter || uCode === selectedDeptFilter || uDiv === selectedDeptFilter
              })
              const staffPool = filteredStaff.length > 0 ? filteredStaff : allStaffUsers

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignmentMode === "MULTI_INDIVIDUAL" ? (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Chọn danh sách cá nhân nhận nhiệm vụ độc lập trong cùng đợt ({multiAssigneeIds.length} người đã chọn) <span className="text-rose-600">*</span>
                        </label>
                        <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                          {staffPool.map(u => {
                            const checked = multiAssigneeIds.includes(u.id)
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                                  checked ? "bg-violet-50 text-violet-900 font-bold" : "hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleMultiAssignee(u.id)}
                                  className="rounded text-violet-600"
                                />
                                <span className="truncate">{u.fullName}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          {assignmentMode === "GROUP"
                            ? "Người điều phối nhóm (Chịu trách nhiệm chính) *"
                            : "Người chịu trách nhiệm chính *"}
                        </label>
                        <select
                          required
                          value={assignedToUserId}
                          onChange={e => setAssignedToUserId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                        >
                          <option value="">-- Chọn người chịu trách nhiệm chính --</option>
                          {staffPool.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.fullName} ({u.teacher?.departmentRel?.name || u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Người duyệt kết quả (Nghiệm thu)
                      </label>
                      <select
                        value={reviewerUserId}
                        onChange={e => setReviewerUserId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option value="">-- Mặc định Người giao việc / Trưởng ban duyệt --</option>
                        {staffPool.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.teacher?.departmentRel?.name || u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Người phối hợp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Người phối hợp thực hiện ({collaboratorUserIds.length} người)
                    </label>
                    <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                      {staffPool.map(u => {
                        const selected = collaboratorUserIds.includes(u.id)
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleCollaborator(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              selected
                                ? "bg-violet-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {u.fullName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Cấu hình lịch định kỳ nếu chọn RECURRING */}
            {assignmentMode === "RECURRING" && (
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chu kỳ lặp lại
                  </label>
                  <select
                    value={recurrenceFreq}
                    onChange={e => setRecurrenceFreq(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="WEEKLY">Hàng tuần</option>
                    <option value="MONTHLY">Hàng tháng</option>
                  </select>
                </div>
                {recurrenceFreq === "WEEKLY" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thứ phát hành trong tuần
                    </label>
                    <select
                      value={recurrenceDayOfWeek}
                      onChange={e => setRecurrenceDayOfWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value={1}>Thứ Hai</option>
                      <option value={2}>Thứ Ba</option>
                      <option value={3}>Thứ Tư</option>
                      <option value={4}>Thứ Năm</option>
                      <option value={5}>Thứ Sáu</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày phát hành trong tháng
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={recurrenceDayOfMonth}
                      onChange={e => setRecurrenceDayOfMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-semibold">
                    Tự động gắn khoá chống sinh trùng (recurrenceInstanceKey) theo kỳ.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thời hạn thực hiện & Thời hạn duyệt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày bắt đầu <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạn thực hiện (Bàn giao) <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạn duyệt kết quả (Tách chậm duyệt)
              </label>
              <input
                type="date"
                value={reviewDueDate}
                onChange={e => setReviewDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Sản phẩm đầu ra, Tiêu chí hoàn thành & Minh chứng cần nộp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sản phẩm đầu ra yêu cầu
              </label>
              <textarea
                rows={2}
                value={deliverables}
                onChange={e => setDeliverables(e.target.value)}
                placeholder="VD: Bảng tổng hợp điều chỉnh ma trận đề khối 6"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu chí hoàn thành (Nghiệm thu)
              </label>
              <textarea
                rows={2}
                value={completionCriteria}
                onChange={e => setCompletionCriteria(e.target.value)}
                placeholder="VD: Đủ 100% môn học, đúng cấu trúc chuẩn đầu ra"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minh chứng cần nộp
              </label>
              <textarea
                rows={2}
                value={requiredEvidences}
                onChange={e => setRequiredEvidences(e.target.value)}
                placeholder="VD: File PDF/Excel biên bản rà soát hoặc link Google Drive"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Công việc con, Checklist & Phụ thuộc giữa các bước */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-violet-600" />
                Lộ trình thực hiện / Checklist công việc con & Phụ thuộc bước ({checklistSteps.length})
              </label>
              <span className="text-[11px] text-slate-500">
                Tiến độ checklist được tách độc lập với đánh giá chất lượng của người duyệt
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newStepTitle}
                onChange={e => setNewStepTitle(e.target.value)}
                placeholder="Nhập tên bước thực hiện / công việc con..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
              <select
                value={newStepDependsOn}
                onChange={e => setNewStepDependsOn(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white sm:w-56"
              >
                <option value="">-- Không phụ thuộc bước trước --</option>
                {checklistSteps.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Phụ thuộc Bước {idx + 1}: {s.title.slice(0, 28)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddChecklistStep}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bước
              </button>
            </div>

            {checklistSteps.length > 0 && (
              <div className="space-y-1.5">
                {checklistSteps.map((step, index) => {
                  const depIdx = checklistSteps.findIndex(
                    s => s.id === step.dependsOnStepId
                  )
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold text-[11px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{step.title}</span>
                        {depIdx >= 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Cần hoàn thành Bước {depIdx + 1} trước
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistStep(step.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Phạm vi áp dụng: Cơ sở / Năm học / Khối / Lớp / Môn / Đợt & Liên kết nguồn */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Năm học
              </label>
              <select
                value={academicYearId}
                onChange={e => setAcademicYearId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">Tất cả</option>
                {years.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cơ sở
              </label>
              <select
                value={scopeCampusId}
                onChange={e => setScopeCampusId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">Toàn hệ thống</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Khối lớp
              </label>
              <input
                type="text"
                value={scopeGradeLevel}
                onChange={e => setScopeGradeLevel(e.target.value)}
                placeholder="VD: Khối 6"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Lớp
              </label>
              <input
                type="text"
                value={scopeClassId}
                onChange={e => setScopeClassId(e.target.value)}
                placeholder="VD: 6A1"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Môn học
              </label>
              <input
                type="text"
                value={scopeSubject}
                onChange={e => setScopeSubject(e.target.value)}
                placeholder="VD: Toán, Tiếng Anh"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Đợt / Kỳ khảo sát
              </label>
              <input
                type="text"
                value={scopeSurveyPeriod}
                onChange={e => setScopeSurveyPeriod(e.target.value)}
                placeholder="VD: Giữa HK1"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Quy tắc duyệt & Lưu nháp */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={e => setRequiresApproval(e.target.checked)}
                  className="rounded text-violet-600"
                />
                <span>Yêu cầu người duyệt nghiệm thu trước khi Hoàn thành</span>
              </label>

              {!editingTask && (
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsDraft}
                    onChange={e => setSaveAsDraft(e.target.checked)}
                    className="rounded text-violet-600"
                  />
                  <span>Lưu ở trạng thái Nháp (Chưa phát hành thông báo)</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm cursor-pointer"
              >
                {submitting
                  ? "Đang xử lý..."
                  : editingTask
                  ? "Lưu cập nhật phiếu"
                  : saveAsDraft
                  ? "Lưu bản nháp"
                  : "Xác nhận Giao việc"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
