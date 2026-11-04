"use client"

import React, { useState } from "react"
import {
  X,
  UserCheck,
  Mail,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Plus,
  Bell,
  ExternalLink,
  Calendar,
  Layers,
  MessageSquareWarning,
  Link2,
} from "lucide-react"
import { WORKFLOW_STATUS_LABELS } from "@/lib/qa-workspace/types"

interface MemberWorkspacePanelProps {
  memberId: string | null
  allStaffUsers: any[]
  taskGroups: any[]
  tasks: any[]
  canManage: boolean
  onClose: () => void
  onAssignToMember: (userId: string, groupId?: string | null) => void
  onSelectTask: (task: any) => void
  onRequestUpdate: (taskId: string) => Promise<void>
}

export function MemberWorkspacePanel({
  memberId,
  allStaffUsers,
  taskGroups,
  tasks,
  canManage,
  onClose,
  onAssignToMember,
  onSelectTask,
  onRequestUpdate,
}: MemberWorkspacePanelProps) {
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "IN_PROGRESS" | "DUE_SOON" | "OVERDUE" | "PENDING_REVIEW"
  >("ALL")
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)

  if (!memberId) return null

  const member = allStaffUsers.find(u => u.id === memberId)
  if (!member) return null

  // Các nhóm mà thành viên này tham gia (1 người có thể tham gia nhiều nhóm)
  const memberGroups = taskGroups.filter(g => {
    if (g.leaderUserId === member.id) return true
    try {
      const ids: string[] = g.memberUserIds ? JSON.parse(g.memberUserIds) : []
      return ids.includes(member.id)
    } catch {
      return false
    }
  })

  // Các nhiệm vụ của thành viên (chịu trách nhiệm chính hoặc phối hợp)
  const memberTasks = tasks.filter(t => {
    if (t.assignedToUserId === member.id) return true
    if (
      Array.isArray(t.qaMeta?.collaboratorUserIds) &&
      t.qaMeta.collaboratorUserIds.includes(member.id)
    ) {
      return true
    }
    return false
  })

  const activeTasks = memberTasks.filter(t => {
    const st = t.qaMeta?.workflowStatus || t.progress
    return st === "IN_PROGRESS" || st === "ASSIGNED" || st === "NEEDS_REVISION"
  })
  const dueSoonTasks = memberTasks.filter(t => t.deadlineInfo?.isDueSoon)
  const overdueTasks = memberTasks.filter(t =>
    Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
  )
  const pendingReviewTasks = memberTasks.filter(
    t => t.qaMeta?.workflowStatus === "PENDING_REVIEW"
  )

  const filteredTasks = memberTasks.filter(t => {
    if (activeFilter === "IN_PROGRESS") return activeTasks.includes(t)
    if (activeFilter === "DUE_SOON") return dueSoonTasks.includes(t)
    if (activeFilter === "OVERDUE") return overdueTasks.includes(t)
    if (activeFilter === "PENDING_REVIEW") return pendingReviewTasks.includes(t)
    return true
  })

  // Tổng hợp sản phẩm, minh chứng và vướng mắc của thành viên
  const allEvidences: Array<{ taskId: string; taskTitle: string; link: string }> = []
  const allBlockers: Array<{ taskId: string; taskTitle: string; content: string; status: string }> = []

  for (const t of memberTasks) {
    const links: string[] = t.qaMeta?.evidenceLinks || []
    for (const lnk of links) {
      allEvidences.push({ taskId: t.id, taskTitle: t.title, link: lnk })
    }
    const comments: any[] = t.comments || []
    for (const c of comments) {
      if (c.commentType === "BLOCKER") {
        allBlockers.push({
          taskId: t.id,
          taskTitle: t.title,
          content: c.content,
          status: c.actionStatus || "OPEN",
        })
      }
    }
  }

  const handleTriggerRemind = async (taskId: string) => {
    setSendingReminderId(taskId)
    try {
      await onRequestUpdate(taskId)
    } finally {
      setSendingReminderId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header thông tin tài khoản thực */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-600 border-2 border-violet-300 text-white font-black text-xl flex items-center justify-center shrink-0">
              {String(member.fullName || "U")
                .trim()
                .split(" ")
                .pop()
                ?.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-white">{member.fullName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/30 text-violet-200 border border-violet-400/40">
                  {member.role}
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-violet-300" />
                  {member.email}
                </span>
                {member.teacher?.departmentRel?.name && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-teal-300" />
                    {member.teacher.departmentRel.name}
                  </span>
                )}
              </div>

              {/* Danh sách các nhóm tham gia */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {memberGroups.length === 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Chưa gán nhóm chuyên môn cố định
                  </span>
                ) : (
                  memberGroups.map(g => (
                    <span
                      key={g.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-white border border-white/15"
                    >
                      <Layers className="w-3 h-3 text-teal-300" />
                      {g.name}
                      {g.leaderUserId === member.id && (
                        <strong className="text-amber-300 ml-0.5">(Điều phối)</strong>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh nút hành động theo quyền */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-semibold text-slate-600">
            Tổng số nhiệm vụ liên quan:{" "}
            <strong className="text-slate-900">{memberTasks.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAssignToMember(member.id, memberGroups[0]?.id || null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Giao việc cho thành viên
            </button>
          </div>
        </div>

        {/* Nội dung cuộn */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 4 Thẻ thống kê trạng thái của thành viên */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() =>
                setActiveFilter(activeFilter === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")
              }
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === "IN_PROGRESS"
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-sky-300"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500">Đang thực hiện</div>
              <div className="text-2xl font-black text-sky-700 mt-0.5">
                {activeTasks.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveFilter(activeFilter === "DUE_SOON" ? "ALL" : "DUE_SOON")
              }
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === "DUE_SOON"
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-white hover:border-amber-300"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500">Sắp đến hạn</div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">
                {dueSoonTasks.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveFilter(activeFilter === "OVERDUE" ? "ALL" : "OVERDUE")
              }
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === "OVERDUE"
                  ? "border-rose-500 bg-rose-50"
                  : "border-slate-200 bg-white hover:border-rose-300"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500">Quá hạn</div>
              <div className="text-2xl font-black text-rose-600 mt-0.5">
                {overdueTasks.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveFilter(
                  activeFilter === "PENDING_REVIEW" ? "ALL" : "PENDING_REVIEW"
                )
              }
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeFilter === "PENDING_REVIEW"
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 bg-white hover:border-violet-300"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500">Chờ duyệt</div>
              <div className="text-2xl font-black text-violet-700 mt-0.5">
                {pendingReviewTasks.length}
              </div>
            </button>
          </div>

          {/* Danh sách Nhiệm vụ, Kế hoạch & Mốc bàn giao */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                Nhiệm vụ, Kế hoạch & Mốc bàn giao ({filteredTasks.length})
              </h3>
              {activeFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className="text-xs font-bold text-violet-600 hover:underline cursor-pointer"
                >
                  Hiển thị tất cả
                </button>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Không có nhiệm vụ nào trong bộ lọc hiện tại.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(t => {
                  const wfStatus = (t.qaMeta?.workflowStatus || "ASSIGNED") as keyof typeof WORKFLOW_STATUS_LABELS
                  const isOverdue = Boolean(t.deadlineInfo?.isOverdue || t.progress === "OVERDUE")
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 bg-white shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {t.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectTask(t)}
                            className="text-sm font-bold text-slate-900 hover:text-violet-700 text-left cursor-pointer"
                          >
                            {t.title}
                          </button>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                            wfStatus === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : wfStatus === "PENDING_REVIEW"
                              ? "bg-violet-50 text-violet-700 border border-violet-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {WORKFLOW_STATUS_LABELS[wfStatus] || wfStatus}
                        </span>
                      </div>

                      {/* Mốc bàn giao & Sản phẩm yêu cầu */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                        <div>
                          <span className="font-semibold text-slate-500">Hạn bàn giao: </span>
                          <strong className={isOverdue ? "text-rose-600" : "text-slate-800"}>
                            {new Date(t.endDate).toLocaleDateString("vi-VN")}
                          </strong>
                          {t.deadlineInfo?.label && (
                            <span className="ml-1.5 text-[11px] font-semibold text-rose-600">
                              ({t.deadlineInfo.label})
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500">Tiến độ checklist: </span>
                          <strong className="text-slate-800">
                            {t.checklistStats?.completedSteps || 0}/
                            {t.checklistStats?.totalSteps || 0} bước (
                            {t.checklistStats?.percent || 0}%)
                          </strong>
                        </div>
                        {t.qaMeta?.deliverables && (
                          <div className="sm:col-span-2">
                            <span className="font-semibold text-slate-500">Sản phẩm đầu ra: </span>
                            <span className="text-slate-800">{t.qaMeta.deliverables}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          Vai trò:{" "}
                          <strong>
                            {t.assignedToUserId === member.id
                              ? "Chịu trách nhiệm chính"
                              : "Người phối hợp"}
                          </strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {canManage && wfStatus !== "COMPLETED" && (
                            <button
                              type="button"
                              disabled={sendingReminderId === t.id}
                              onClick={() => handleTriggerRemind(t.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                            >
                              <Bell className="w-3 h-3" />
                              {sendingReminderId === t.id
                                ? "Đang gửi..."
                                : "Yêu cầu cập nhật"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectTask(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                          >
                            Xem nhiệm vụ
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sản phẩm, Minh chứng & Vướng mắc của thành viên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 mb-2.5">
                <Link2 className="w-4 h-4 text-teal-600" />
                Sản phẩm & Minh chứng đã nộp ({allEvidences.length})
              </h4>
              {allEvidences.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có liên kết minh chứng nào được đính kèm.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allEvidences.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="font-semibold text-slate-800 line-clamp-1">
                        {ev.taskTitle}
                      </div>
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-600 hover:underline inline-flex items-center gap-1 text-[11px] mt-0.5 break-all"
                      >
                        {ev.link} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-200/80">
              <h4 className="text-xs font-extrabold text-rose-950 flex items-center gap-1.5 mb-2.5">
                <MessageSquareWarning className="w-4 h-4 text-rose-600" />
                Vướng mắc & Đề xuất hỗ trợ ({allBlockers.length})
              </h4>
              {allBlockers.length === 0 ? (
                <p className="text-xs text-slate-500">Không có vướng mắc tồn đọng.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {allBlockers.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white border border-rose-200 text-xs"
                    >
                      <div className="font-bold text-rose-900 line-clamp-1">
                        {b.taskTitle}
                      </div>
                      <p className="text-slate-700 text-[11px] mt-0.5">{b.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
