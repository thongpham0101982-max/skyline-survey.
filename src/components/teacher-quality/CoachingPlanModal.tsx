"use client"

import React, { useEffect, useState } from "react"
import toast from "react-hot-toast"
import {
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import type {
  CoachingStatus,
  FollowUpObservationOption,
  ObservationDetailItem,
  TeacherDevelopmentPlanItem,
} from "@/lib/teacher-quality/types"

export interface MentorOption {
  id: string
  teacherCode: string
  teacherName: string
  position: string
  departmentName: string
  campusName: string
}

export interface AssignableTeacherOption {
  id: string
  teacherCode: string
  teacherName: string
}

export type CoachingModalMode = "FROM_OBSERVATION" | "ASSIGN_DIRECT" | "TEACHER_PROPOSAL" | "EDIT"

interface CoachingPlanModalProps {
  open: boolean
  mode: CoachingModalMode
  onClose: () => void
  onSaved: () => void
  academicYearId?: string
  mentors: MentorOption[]
  assignableTeachers: AssignableTeacherOption[]
  currentTeacherId?: string | null
  isManager: boolean
  sourceObservation?: ObservationDetailItem | null
  editingPlan?: TeacherDevelopmentPlanItem | null
  followUpOptionsByTeacher: Record<string, FollowUpObservationOption[]>
}

const ACTIVITY_TYPES = [
  "Dự giờ mẫu & rút kinh nghiệm",
  "Coaching 1-1 cùng TTCM / GV cốt cán",
  "Sinh hoạt chuyên môn theo tổ / chuyên đề",
  "Tập huấn / Workshop chuyên môn",
  "Tự nghiên cứu & áp dụng thử nghiệm trên lớp",
  "Dự giờ chéo đồng nghiệp",
]

const STATUS_OPTIONS: Array<{ value: CoachingStatus; label: string }> = [
  { value: "NOT_STARTED", label: "Chưa thực hiện" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "COMPLETED", label: "Hoàn thành" },
]

export function CoachingPlanModal({
  open,
  mode,
  onClose,
  onSaved,
  academicYearId,
  mentors,
  assignableTeachers,
  currentTeacherId,
  isManager,
  sourceObservation,
  editingPlan,
  followUpOptionsByTeacher,
}: CoachingPlanModalProps) {
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [teacherSearch, setTeacherSearch] = useState("")
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [improvementNeeds, setImprovementNeeds] = useState("")
  const [developmentActivity, setDevelopmentActivity] = useState("")
  const [mentorTeacherId, setMentorTeacherId] = useState("")
  const [mentorNameCustom, setMentorNameCustom] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState<CoachingStatus>("NOT_STARTED")
  const [applicationNotes, setApplicationNotes] = useState("")
  const [nextSupportNeeds, setNextSupportNeeds] = useState("")
  const [followUpEvaluationId, setFollowUpEvaluationId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTeacherSearch("")

    if (mode === "EDIT" && editingPlan) {
      setSelectedTeacherIds([editingPlan.teacherId])
      setActivityType(editingPlan.activityType || ACTIVITY_TYPES[0])
      setImprovementNeeds(editingPlan.improvementNeeds || "")
      setDevelopmentActivity(editingPlan.developmentActivity || "")
      setMentorTeacherId(editingPlan.mentorTeacherId || "")
      setMentorNameCustom(editingPlan.mentorTeacherId ? "" : editingPlan.mentorName || "")
      setDueDate(editingPlan.dueDate ? editingPlan.dueDate.slice(0, 10) : "")
      setStatus(editingPlan.status || "NOT_STARTED")
      setApplicationNotes(editingPlan.applicationNotes || editingPlan.postCoachingNotes || "")
      setNextSupportNeeds(editingPlan.nextSupportNeeds || "")
      setFollowUpEvaluationId(editingPlan.followUpEvaluationId || "")
    } else if (mode === "FROM_OBSERVATION" && sourceObservation) {
      setSelectedTeacherIds([sourceObservation.hostTeacherId])
      setActivityType(ACTIVITY_TYPES[0])
      setImprovementNeeds(
        sourceObservation.improvements?.trim() || sourceObservation.generalComment?.trim() || ""
      )
      setDevelopmentActivity("")
      setMentorTeacherId("")
      setMentorNameCustom("")
      const d = new Date()
      d.setDate(d.getDate() + 14)
      setDueDate(d.toISOString().slice(0, 10))
      setStatus("NOT_STARTED")
      setApplicationNotes("")
      setNextSupportNeeds("")
      setFollowUpEvaluationId("")
    } else if (mode === "TEACHER_PROPOSAL") {
      setSelectedTeacherIds(currentTeacherId ? [currentTeacherId] : [])
      setActivityType(ACTIVITY_TYPES[2])
      setImprovementNeeds("")
      setDevelopmentActivity("")
      setMentorTeacherId("")
      setMentorNameCustom("")
      setDueDate("")
      setStatus("NOT_STARTED")
      setApplicationNotes("")
      setNextSupportNeeds("")
      setFollowUpEvaluationId("")
    } else {
      // ASSIGN_DIRECT (supports multi-teacher!)
      setSelectedTeacherIds([])
      setActivityType(ACTIVITY_TYPES[0])
      setImprovementNeeds("")
      setDevelopmentActivity("")
      setMentorTeacherId("")
      setMentorNameCustom("")
      const d = new Date()
      d.setDate(d.getDate() + 14)
      setDueDate(d.toISOString().slice(0, 10))
      setStatus("NOT_STARTED")
      setApplicationNotes("")
      setNextSupportNeeds("")
      setFollowUpEvaluationId("")
    }
  }, [open, mode, editingPlan, sourceObservation, currentTeacherId])

  if (!open) return null

  const isEdit = mode === "EDIT" && Boolean(editingPlan)
  const isProposal = mode === "TEACHER_PROPOSAL"
  const isMultiAssign = mode === "ASSIGN_DIRECT"

  const activeTeacherIdForFollowUp = isEdit
    ? editingPlan?.teacherId || ""
    : selectedTeacherIds.length === 1
      ? selectedTeacherIds[0]
      : ""
  const followUpOptions = activeTeacherIdForFollowUp
    ? followUpOptionsByTeacher[activeTeacherIdForFollowUp] || []
    : []

  const filteredTeachers = assignableTeachers.filter((t) => {
    const q = teacherSearch.trim().toLowerCase()
    if (!q) return true
    return `${t.teacherName} ${t.teacherCode}`.toLowerCase().includes(q)
  })

  const toggleTeacher = (tid: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isProposal && !developmentActivity.trim()) {
      toast.error("Vui lòng nhập nội dung hoạt động bồi dưỡng")
      return
    }
    if (isProposal && !improvementNeeds.trim()) {
      toast.error("Vui lòng nhập nhu cầu bồi dưỡng cần đề xuất")
      return
    }
    if (!isEdit && !isProposal && selectedTeacherIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một giáo viên")
      return
    }

    setSaving(true)
    try {
      const selectedMentor = mentors.find((m) => m.id === mentorTeacherId)
      const resolvedMentorName = selectedMentor
        ? selectedMentor.teacherName
        : mentorNameCustom.trim() || null

      if (isEdit && editingPlan) {
        const res = await fetch(`/api/admin/teacher-quality/development-plans/${editingPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityType,
            improvementNeeds: improvementNeeds.trim(),
            developmentActivity: developmentActivity.trim(),
            mentorTeacherId: mentorTeacherId || null,
            mentorName: resolvedMentorName,
            dueDate: dueDate || null,
            status,
            applicationNotes: applicationNotes.trim() || null,
            nextSupportNeeds: nextSupportNeeds.trim() || null,
            followUpEvaluationId: followUpEvaluationId || null,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Không thể cập nhật")
        toast.success("Đã cập nhật tiến độ & ghi nhận áp dụng")
      } else {
        const res = await fetch("/api/admin/teacher-quality/development-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherIds: selectedTeacherIds,
            academicYearId,
            requestSource: isProposal
              ? "TEACHER_PROPOSAL"
              : mode === "FROM_OBSERVATION"
                ? "OBSERVATION"
                : "DIRECT",
            observationSlotId: sourceObservation?.slotId || null,
            observationEvaluationId: sourceObservation?.evaluationId || null,
            sourceMonth: sourceObservation?.monthKey || null,
            activityType,
            improvementNeeds: improvementNeeds.trim(),
            developmentActivity: developmentActivity.trim(),
            mentorTeacherId: mentorTeacherId || null,
            mentorName: resolvedMentorName,
            dueDate: dueDate || null,
            status,
            applicationNotes: applicationNotes.trim() || null,
            nextSupportNeeds: nextSupportNeeds.trim() || null,
            followUpEvaluationId: followUpEvaluationId || null,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Không thể lưu")
        toast.success(json.message || "Đã lưu nội dung bồi dưỡng")
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi lưu")
    } finally {
      setSaving(false)
    }
  }

  const headerTitle = isEdit
    ? `Cập nhật bồi dưỡng · ${editingPlan?.teacherName}`
    : isProposal
      ? "Đề xuất nhu cầu bồi dưỡng chuyên môn"
      : mode === "FROM_OBSERVATION"
        ? `Tạo nội dung bồi dưỡng từ phiếu dự giờ · ${sourceObservation?.hostTeacherName}`
        : "Giao hoạt động bồi dưỡng (1 hoặc nhiều GV)"

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#003B3A] bg-[#003B3A] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpenCheck className="h-5 w-5 text-[#5EEAD4]" />
            <div>
              <h3 className="text-sm font-semibold">{headerTitle}</h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                {isMultiAssign
                  ? "Một hoạt động có thể giao đồng thời cho nhiều GV, mỗi GV được theo dõi tiến độ riêng."
                  : isProposal
                    ? "GV gửi nhu cầu bồi dưỡng để TTCM phân công hoạt động và người hỗ trợ."
                    : "Theo dõi tiến độ (Chưa thực hiện · Đang thực hiện · Hoàn thành) và kết quả áp dụng vào dạy học."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* Linked source observation card */}
          {(sourceObservation || editingPlan?.sourceObservation) && (
            <div className="rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-3.5">
              <div className="flex items-center gap-1.5 text-[#003B3A] font-semibold mb-1">
                <FileText className="h-3.5 w-3.5 text-[#008B85]" />
                <span>Phiếu dự giờ gốc đã duyệt</span>
              </div>
              {sourceObservation ? (
                <div className="text-slate-700 tabular-nums">
                  {sourceObservation.actualDateVi} · {sourceObservation.campusName} · Lớp{" "}
                  <strong>{sourceObservation.className}</strong> · {sourceObservation.subjectName} —{" "}
                  <strong>{sourceObservation.topic}</strong> (Dự: {sourceObservation.observerTeacherName}
                  {sourceObservation.overallRating ? ` · ${sourceObservation.overallRating}` : ""})
                </div>
              ) : editingPlan?.sourceObservation ? (
                <div className="text-slate-700 tabular-nums">
                  {editingPlan.sourceObservation.actualDateVi} · Lớp{" "}
                  <strong>{editingPlan.sourceObservation.className}</strong> ·{" "}
                  {editingPlan.sourceObservation.subjectName} —{" "}
                  <strong>{editingPlan.sourceObservation.topic}</strong>
                </div>
              ) : null}
            </div>
          )}

          {/* Multi-teacher picker for ASSIGN_DIRECT */}
          {isMultiAssign && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#008B85]" />
                  Chọn giáo viên tham gia ({selectedTeacherIds.length} đã chọn)
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Tìm tên / mã GV..."
                  className="w-48 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs focus:border-[#00A19A] focus:outline-none"
                />
              </div>
              <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                {filteredTeachers.map((t) => {
                  const checked = selectedTeacherIds.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors ${
                        checked
                          ? "border-[#00A19A] bg-[#F0FDFA] text-[#003B3A] font-medium"
                          : "border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacher(t.id)}
                        className="accent-[#003B3A]"
                      />
                      <span className="truncate">
                        {t.teacherName} <span className="text-slate-400">({t.teacherCode})</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 1: Nhu cầu bồi dưỡng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nhu cầu bồi dưỡng / Nội dung cần cải thiện {isProposal && <span className="text-rose-600">*</span>}
            </label>
            <textarea
              rows={2}
              disabled={isEdit && !isManager}
              value={improvementNeeds}
              onChange={(e) => setImprovementNeeds(e.target.value)}
              placeholder="Nội dung chuyên môn, kỹ năng sư phạm hoặc phương pháp cần cải thiện..."
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
            />
          </div>

          {/* Step 2: Hình thức & Hoạt động bồi dưỡng */}
          {!isProposal && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hình thức bồi dưỡng</label>
                  <select
                    disabled={isEdit && !isManager}
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trạng thái tiến độ
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CoachingStatus)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung hoạt động bồi dưỡng <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  disabled={isEdit && !isManager}
                  value={developmentActivity}
                  onChange={(e) => setDevelopmentActivity(e.target.value)}
                  placeholder="Mô tả cụ thể hoạt động thực hiện..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-[#008B85]" />
                      Người hỗ trợ
                    </span>
                  </label>
                  <select
                    disabled={isEdit && !isManager}
                    value={mentorTeacherId}
                    onChange={(e) => {
                      setMentorTeacherId(e.target.value)
                      if (e.target.value) setMentorNameCustom("")
                    }}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
                  >
                    <option value="">-- Chọn người hỗ trợ --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.teacherName} ({m.position} · {m.departmentName})
                      </option>
                    ))}
                  </select>
                  {!mentorTeacherId && isManager && (
                    <input
                      type="text"
                      value={mentorNameCustom}
                      onChange={(e) => setMentorNameCustom(e.target.value)}
                      placeholder="Hoặc nhập tên người hỗ trợ..."
                      className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs focus:border-[#00A19A] focus:bg-white focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-[#008B85]" />
                      Thời hạn hoàn thành
                    </span>
                  </label>
                  <input
                    type="date"
                    disabled={isEdit && !isManager}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs tabular-nums disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 4: Ghi nhận việc áp dụng & Liên kết phiếu dự giờ tiếp theo */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-3">
                <div className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Ghi nhận việc áp dụng vào dạy học
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Nội dung GV đã áp dụng vào dạy học
                  </label>
                  <textarea
                    rows={2}
                    value={applicationNotes}
                    onChange={(e) => setApplicationNotes(e.target.value)}
                    placeholder="Nhận xét ngắn về nội dung GV đã áp dụng thực tế trên lớp..."
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Việc cần hỗ trợ tiếp (nếu có)
                  </label>
                  <input
                    type="text"
                    value={nextSupportNeeds}
                    onChange={(e) => setNextSupportNeeds(e.target.value)}
                    placeholder="Nội dung cần đồng hành tiếp ở giai đoạn sau..."
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs focus:border-[#00A19A] focus:outline-none"
                  />
                </div>

                {activeTeacherIdForFollowUp && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5 text-[#008B85]" />
                        Liên kết phiếu dự giờ tiếp theo (nếu có)
                      </span>
                    </label>
                    <select
                      value={followUpEvaluationId}
                      onChange={(e) => setFollowUpEvaluationId(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs tabular-nums focus:border-[#00A19A] focus:outline-none"
                    >
                      <option value="">-- Chưa liên kết phiếu dự giờ tiếp theo --</option>
                      {followUpOptions.map((opt) => (
                        <option key={opt.evaluationId} value={opt.evaluationId}>
                          {opt.actualDateVi} · Lớp {opt.className} · {opt.subjectName} — {opt.topic} (
                          {opt.overallRating || "Đã dự"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005250] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit
                ? "Lưu cập nhật"
                : isProposal
                  ? "Gửi đề xuất bồi dưỡng"
                  : isMultiAssign && selectedTeacherIds.length > 1
                    ? `Giao cho ${selectedTeacherIds.length} giáo viên`
                    : "Lưu nội dung bồi dưỡng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
