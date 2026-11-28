"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react"
import type { TeacherDevelopmentPlanItem } from "@/lib/teacher-quality/types"
import { coachingStatusLabelVi } from "@/lib/teacher-quality/recognitionEngine"

export type CoachingFilterKey =
  | "ALL"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DUE_SOON"
  | "OVERDUE"

interface TeacherCoachingListTabProps {
  items: TeacherDevelopmentPlanItem[]
  loading: boolean
  canAssignCoaching: boolean
  canProposeCoaching: boolean
  canUpdateOwnCoaching: boolean
  currentTeacherId: string | null
  activeFilter: CoachingFilterKey
  onChangeFilter: (v: CoachingFilterKey) => void
  onOpenAssignDirect: () => void
  onOpenTeacherProposal: () => void
  onEditPlan: (plan: TeacherDevelopmentPlanItem) => void
  onDeleted: () => void
}

function formatDateVi(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("vi-VN")
}

export function TeacherCoachingListTab({
  items,
  loading,
  canAssignCoaching,
  canProposeCoaching,
  canUpdateOwnCoaching,
  currentTeacherId,
  activeFilter,
  onChangeFilter,
  onOpenAssignDirect,
  onOpenTeacherProposal,
  onEditPlan,
  onDeleted,
}: TeacherCoachingListTabProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      ALL: items.length,
      NOT_STARTED: items.filter((i) => i.status === "NOT_STARTED").length,
      IN_PROGRESS: items.filter((i) => i.status === "IN_PROGRESS").length,
      COMPLETED: items.filter((i) => i.status === "COMPLETED").length,
      DUE_SOON: items.filter((i) => i.isDueSoon).length,
      OVERDUE: items.filter((i) => i.isOverdue).length,
    }),
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (activeFilter === "NOT_STARTED") return i.status === "NOT_STARTED"
      if (activeFilter === "IN_PROGRESS") return i.status === "IN_PROGRESS"
      if (activeFilter === "COMPLETED") return i.status === "COMPLETED"
      if (activeFilter === "DUE_SOON") return i.isDueSoon
      if (activeFilter === "OVERDUE") return i.isOverdue
      return true
    })
  }, [items, activeFilter])

  const handleDelete = async (plan: TeacherDevelopmentPlanItem) => {
    if (!window.confirm(`Xóa nội dung bồi dưỡng của giáo viên ${plan.teacherName}?`)) return
    setDeletingId(plan.id)
    try {
      const res = await fetch(`/api/admin/teacher-quality/development-plans/${plan.id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Không thể xóa")
      toast.success("Đã xóa nội dung bồi dưỡng")
      onDeleted()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xóa")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL" as const, label: `Tất cả (${counts.ALL})` },
            { key: "NOT_STARTED" as const, label: `Chưa thực hiện (${counts.NOT_STARTED})` },
            { key: "IN_PROGRESS" as const, label: `Đang thực hiện (${counts.IN_PROGRESS})` },
            { key: "COMPLETED" as const, label: `Hoàn thành (${counts.COMPLETED})` },
            { key: "DUE_SOON" as const, label: `Đến hạn (${counts.DUE_SOON})` },
            { key: "OVERDUE" as const, label: `Quá hạn (${counts.OVERDUE})` },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => onChangeFilter(pill.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors tabular-nums ${
                activeFilter === pill.key
                  ? pill.key === "OVERDUE"
                    ? "bg-rose-600 text-white"
                    : "bg-[#003B3A] text-white"
                  : pill.key === "OVERDUE" && counts.OVERDUE > 0
                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canProposeCoaching && !canAssignCoaching && (
            <button
              type="button"
              onClick={onOpenTeacherProposal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005250] transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5 text-[#5EEAD4]" />
              Đề xuất nhu cầu bồi dưỡng
            </button>
          )}
          {canAssignCoaching && (
            <>
              <button
                type="button"
                onClick={onOpenTeacherProposal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC] transition-colors"
              >
                <Lightbulb className="h-3.5 w-3.5 text-[#008B85]" />
                Ghi nhận nhu cầu
              </button>
              <button
                type="button"
                onClick={onOpenAssignDirect}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005250] transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#5EEAD4]" />
                Giao hoạt động bồi dưỡng
              </button>
            </>
          )}
        </div>
      </div>

      {/* Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                  Giáo viên · Nguồn nhu cầu
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Nhu cầu & Hoạt động bồi dưỡng
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                  Người hỗ trợ · Thời hạn
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4]">
                  Tiến độ & Ghi nhận việc áp dụng
                </th>
                <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00A19A] mx-auto mb-2" />
                    Đang tải danh sách bồi dưỡng chuyên môn...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <BookOpenCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">Chưa có nhiệm vụ bồi dưỡng nào phù hợp</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Bấm <strong>Giao hoạt động bồi dưỡng</strong>, <strong>Đề xuất nhu cầu</strong> hoặc tạo trực tiếp từ phiếu dự giờ đã duyệt ở tab <strong>Dự giờ theo tháng</strong>.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((plan) => {
                  const canEditRow =
                    canAssignCoaching ||
                    (canUpdateOwnCoaching && currentTeacherId && plan.teacherId === currentTeacherId)
                  const sourceTag =
                    plan.requestSource === "OBSERVATION"
                      ? "Từ phiếu dự giờ"
                      : plan.requestSource === "TEACHER_PROPOSAL"
                        ? "GV đề xuất"
                        : "TTCM / BGH giao"

                  return (
                    <tr key={plan.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      {/* GV + Nguồn */}
                      <td className="py-3 px-3 align-middle min-w-[200px]">
                        <div className="font-semibold text-slate-900">{plan.teacherName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {plan.teacherCode} · {plan.departmentName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="inline-flex rounded bg-[#F0FDFA] border border-[#CCFBF1] px-1.5 py-0.5 text-[10px] font-medium text-[#00736E]">
                            {sourceTag}
                          </span>
                          {plan.sourceObservation && (
                            <Link
                              href={plan.sourceObservation.sourceRoute}
                              target="_blank"
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#008B85] hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              Phiếu {plan.sourceObservation.actualDateVi}
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Nhu cầu & Hoạt động */}
                      <td className="py-3 px-3 align-middle min-w-[260px] max-w-[360px]">
                        {plan.activityType && (
                          <div className="text-[11px] font-semibold text-[#00736E] mb-1">
                            {plan.activityType}
                          </div>
                        )}
                        <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-lg px-2.5 py-1.5 mb-1.5">
                          <span className="font-semibold">Nhu cầu: </span>
                          <span className="whitespace-pre-line">{plan.improvementNeeds}</span>
                        </div>
                        <div className="text-slate-800 whitespace-pre-line">
                          <span className="font-semibold text-[#003B3A]">Hoạt động: </span>
                          {plan.developmentActivity}
                        </div>
                      </td>

                      {/* Người hỗ trợ & Thời hạn */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <UserCheck className="h-3.5 w-3.5 text-[#008B85]" />
                          <span>{plan.mentorName || "Chưa gán"}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Hạn: {formatDateVi(plan.dueDate)}</span>
                        </div>
                        {plan.isOverdue && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            Quá hạn
                          </span>
                        )}
                        {plan.isDueSoon && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3" />
                            Sắp đến hạn
                          </span>
                        )}
                      </td>

                      {/* Tiến độ & Ghi nhận áp dụng + Phiếu dự giờ tiếp theo */}
                      <td className="py-3 px-3 align-middle min-w-[230px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            plan.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : plan.status === "IN_PROGRESS"
                                ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {plan.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                          {coachingStatusLabelVi(plan.status)}
                        </span>

                        {plan.applicationNotes && (
                          <div className="mt-1.5 text-[11px] text-slate-700 whitespace-pre-line">
                            <span className="font-semibold text-emerald-700">Áp dụng: </span>
                            {plan.applicationNotes}
                          </div>
                        )}
                        {plan.nextSupportNeeds && (
                          <div className="mt-1 text-[11px] text-amber-800">
                            <span className="font-semibold">Hỗ trợ tiếp: </span>
                            {plan.nextSupportNeeds}
                          </div>
                        )}
                        {plan.followUpObservation && (
                          <div className="mt-1.5">
                            <Link
                              href={plan.followUpObservation.sourceRoute}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-md bg-[#F0FDFA] border border-[#99F6E4] px-2 py-0.5 text-[10px] font-semibold text-[#00736E] hover:bg-[#CCFBF1]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Phiếu dự giờ tiếp theo: {plan.followUpObservation.actualDateVi} (
                              {plan.followUpObservation.overallRating || "Đã dự"})
                            </Link>
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canEditRow && (
                            <button
                              type="button"
                              onClick={() => onEditPlan(plan)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:border-[#00A19A] hover:text-[#003B3A]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Cập nhật
                            </button>
                          )}
                          {canAssignCoaching && (
                            <button
                              type="button"
                              onClick={() => handleDelete(plan)}
                              disabled={deletingId === plan.id}
                              className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              title="Xóa"
                            >
                              {deletingId === plan.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
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
  )
}
