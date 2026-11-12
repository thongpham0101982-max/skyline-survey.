"use client"

import React, { useMemo, useState } from "react"
import { TimetableShell, VERSION_STATUS_BADGE } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import {
  cancelTimetableSubstitutionAction,
  createTimetableSubstitutionAction,
  getTimetableAdjustmentsPageAction,
} from "../actions"
import type {
  ManageableScopeGroup,
  SubstitutionActionType,
  TimetableFilterParams,
} from "@/lib/timetable/types"

type AdjustmentsData = Extract<
  Awaited<ReturnType<typeof getTimetableAdjustmentsPageAction>>,
  { success: true }
>

const ACTION_TYPE_META: Record<
  SubstitutionActionType,
  { label: string; badgeClass: string; desc: string }
> = {
  SUBSTITUTE: {
    label: "Dạy thay",
    badgeClass: "bg-teal-50 text-[#00736E] border border-teal-200",
    desc: "Phân công giáo viên khác đứng lớp thay cho tiết học trong ngày",
  },
  LEAVE: {
    label: "Báo nghỉ tiết",
    badgeClass: "bg-rose-50 text-[#E11D48] border border-rose-200",
    desc: "Ghi nhận nghỉ tiết theo ngày mà không sửa thời khóa biểu tuần gốc",
  },
  SWAP_PERIOD: {
    label: "Đổi tiết / Đổi môn",
    badgeClass: "bg-amber-50 text-[#D97706] border border-amber-200",
    desc: "Đổi môn học và giáo viên giảng dạy tại tiết được chọn trong ngày",
  },
  CHANGE_ROOM: {
    label: "Đổi phòng học",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    desc: "Chuyển tiết học sang phòng chức năng / phòng học khác trong ngày",
  },
  MAKEUP: {
    label: "Dạy bù / Bổ sung",
    badgeClass: "bg-emerald-50 text-[#059669] border border-emerald-200",
    desc: "Xếp tiết dạy bù vào ô trống trong ngày cụ thể",
  },
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ Hai",
  TUESDAY: "Thứ Ba",
  WEDNESDAY: "Thứ Tư",
  THURSDAY: "Thứ Năm",
  FRIDAY: "Thứ Sáu",
  SATURDAY: "Thứ Bảy",
  SUNDAY: "Chủ Nhật",
}

function formatSnapshotSummary(snapshotJson: string | null): string {
  if (!snapshotJson) return "—"
  try {
    const obj = JSON.parse(snapshotJson)
    const parts: string[] = []
    if (obj.subjectName) parts.push(obj.subjectName)
    if (obj.teacherName) {
      parts.push(
        obj.teacherCode ? `${obj.teacherName} (${obj.teacherCode})` : obj.teacherName
      )
    }
    if (obj.roomName) parts.push(`Phòng ${obj.roomName}`)
    return parts.length > 0 ? parts.join(" • ") : "Trống / Nghỉ tiết"
  } catch {
    return snapshotJson
  }
}

export function SubstitutionClient({ initialData }: { initialData: AdjustmentsData }) {
  const [targetDate, setTargetDate] = useState<string>(initialData.targetDate)
  const [actionType, setActionType] = useState<SubstitutionActionType>("SUBSTITUTE")
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialData.filterContext.classes[0]?.id || ""
  )
  const [session, setSession] = useState<"MORNING" | "AFTERNOON">("MORNING")
  const [periodNumber, setPeriodNumber] = useState<number>(1)
  const [selectedSlotId, setSelectedSlotId] = useState<string>("")
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>("")
  const [newSubjectId, setNewSubjectId] = useState<string>("")
  const [newRoomId, setNewRoomId] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const customFetcher = React.useCallback(
    (params: TimetableFilterParams & { targetDate?: string }) =>
      getTimetableAdjustmentsPageAction({
        ...params,
        targetDate: params.targetDate ?? targetDate,
      }),
    [targetDate]
  )

  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<AdjustmentsData>(initialData, customFetcher)

  const {
    filterContext,
    dayOfWeek,
    baseVersion,
    dayBaseSlots,
    substitutions,
    teachers,
    subjects,
    rooms,
  } = data

  // Keep selectedClassId aligned with in-scope classes
  React.useEffect(() => {
    if (
      filterContext.classes.length > 0 &&
      !filterContext.classes.some((c) => c.id === selectedClassId)
    ) {
      setSelectedClassId(filterContext.classes[0].id)
    }
  }, [filterContext.classes, selectedClassId])

  const filteredDaySlots = useMemo(() => {
    if (!selectedClassId) return dayBaseSlots
    return dayBaseSlots.filter((s) => s.classId === selectedClassId)
  }, [dayBaseSlots, selectedClassId])

  const handlePickBaseSlot = (slot: (typeof dayBaseSlots)[number]) => {
    setSelectedClassId(slot.classId)
    setSession(slot.session === "AFTERNOON" ? "AFTERNOON" : "MORNING")
    setPeriodNumber(Number(slot.periodNumber))
    setSelectedSlotId(slot.id || "")
    setFeedback(null)
  }

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!selectedClassId) {
      setFeedback({ type: "err", text: "Vui lòng chọn lớp học cần điều chỉnh." })
      return
    }
    if (!reason.trim()) {
      setFeedback({ type: "err", text: "Vui lòng nhập lý do điều chỉnh / dạy thay." })
      return
    }
    if (actionType === "SUBSTITUTE" && !substituteTeacherId) {
      setFeedback({ type: "err", text: "Vui lòng chọn giáo viên dạy thay." })
      return
    }
    if (actionType === "CHANGE_ROOM" && !newRoomId) {
      setFeedback({ type: "err", text: "Vui lòng chọn phòng học thay thế." })
      return
    }

    setSubmitting(true)
    try {
      const scopeGroup =
        filterContext.selectedScopeGroup === "LIEN_CAP"
          ? "TRUNG_HOC"
          : (filterContext.selectedScopeGroup as ManageableScopeGroup)

      const res = await createTimetableSubstitutionAction({
        academicYearId: filterContext.selectedYearId,
        semester: filterContext.semester,
        campusId: filterContext.selectedCampusId,
        scopeGroup,
        versionId: baseVersion?.id || null,
        slotId: selectedSlotId || null,
        targetDate,
        actionType,
        classId: selectedClassId,
        session,
        periodNumber,
        substituteTeacherId: substituteTeacherId || null,
        newSubjectId: newSubjectId || null,
        newRoomId: newRoomId || null,
        reason: reason.trim(),
      })

      if (!res.success) {
        setFeedback({ type: "err", text: res.error })
        return
      }

      setFeedback({
        type: "ok",
        text: "Đã ghi nhận ngoại lệ lịch theo ngày thành công. Lịch tuần gốc được bảo toàn nguyên vẹn.",
      })
      setReason("")
      setSelectedSlotId("")
      await reloadWithPatch({ targetDate } as any)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSubstitution = async (id: string) => {
    const ok = window.confirm("Hủy bản ghi điều chỉnh / dạy thay này và khôi phục lịch tuần gốc?")
    if (!ok) return
    setSubmitting(true)
    try {
      const res = await cancelTimetableSubstitutionAction(id)
      if (!res.success) {
        setFeedback({ type: "err", text: res.error })
        return
      }
      setFeedback({ type: "ok", text: "Đã hủy bản ghi ngoại lệ và khôi phục tiết gốc." })
      await reloadWithPatch({ targetDate } as any)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TimetableShell
      title="Điều chỉnh & Dạy thay theo ngày"
      subtitle="Ghi nhận báo nghỉ, dạy thay, đổi tiết, đổi phòng và dạy bù dưới dạng ngoại lệ theo ngày — giữ nguyên thời khóa biểu tuần gốc"
      activeTabCode="ADJUST"
      hasUnsavedChanges={Boolean(reason.trim())}
    >
      <TimetableFilterBar
        context={filterContext}
        loading={loading}
        hasUnsavedChanges={Boolean(reason.trim())}
        showGradeAndClass={false}
        showVersion={false}
        onChange={(patch) => reloadWithPatch(patch)}
        extraSlot={
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ngày áp dụng ngoại lệ
              </label>
              <input
                type="date"
                value={targetDate}
                disabled={loading}
                onChange={(e) => {
                  const nextDate = e.target.value
                  setTargetDate(nextDate)
                  if (nextDate) reloadWithPatch({ targetDate: nextDate } as any)
                }}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
              />
            </div>

            <div className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-700 tabular-nums">
              Thứ trong tuần:{" "}
              <span className="font-semibold text-[#003B3A]">
                {dayOfWeek ? DAY_LABELS[dayOfWeek] || dayOfWeek : "Không xác định"}
              </span>
              {baseVersion && (
                <>
                  {" "}
                  • Lịch tuần gốc:{" "}
                  <span className="font-semibold text-[#00736E]">{baseVersion.name}</span> (
                  {VERSION_STATUS_BADGE[baseVersion.status]?.label || baseVersion.status})
                </>
              )}
            </div>
          </div>
        }
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-medium border ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-[#059669]"
              : "bg-rose-50 border-rose-200 text-[#E11D48]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Base Weekly Schedule on Selected Day for Quick Pick */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-[#003B3A]">
                Tiết học gốc ngày {targetDate} ({dayOfWeek ? DAY_LABELS[dayOfWeek] : ""})
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chọn lớp và bấm vào một tiết để điền nhanh vào biểu mẫu điều chỉnh
              </p>
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-semibold text-[#003B3A] tabular-nums"
            >
              {filterContext.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.className}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A] sticky top-0">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                    Buổi • Tiết
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                    Môn & Giáo viên gốc
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right">
                    Chọn
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredDaySlots.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-4 text-center text-slate-500">
                      Không có tiết gốc nào của lớp trong ngày đang chọn (hoặc ngày Chủ Nhật). Bạn
                      vẫn có thể tạo tiết Dạy bù ở khung bên phải.
                    </td>
                  </tr>
                ) : (
                  filteredDaySlots.map((slot) => {
                    const isPicked = selectedSlotId && selectedSlotId === slot.id
                    return (
                      <tr
                        key={slot.id || `${slot.session}_${slot.periodNumber}`}
                        onClick={() => handlePickBaseSlot(slot)}
                        className={`transition-colors align-middle cursor-pointer ${
                          isPicked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-3 px-3 align-middle font-semibold text-[#003B3A] whitespace-nowrap">
                          {slot.session === "MORNING" ? "Sáng" : "Chiều"} • Tiết{" "}
                          {slot.periodNumber}
                        </td>
                        <td className="py-3 px-3 align-middle">
                          <div className="font-semibold text-slate-900">
                            {slot.subjectName || "—"}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {slot.teacherName || "Chưa gán GV"}
                            {slot.teacherCode ? ` (${slot.teacherCode})` : ""}
                            {slot.roomName ? ` • Phòng ${slot.roomName}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-middle text-right">
                          <span className="text-[11px] font-semibold text-[#008B85]">
                            {isPicked ? "Đang chọn" : "Chọn tiết"}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Adjustment Form */}
        <form
          onSubmit={handleCreateAdjustment}
          className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4"
        >
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-xs font-bold text-[#003B3A]">
              Biểu mẫu ghi nhận điều chỉnh & dạy thay (Kiểm tra trùng lịch & thời gian di chuyển tự động)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ACTION_TYPE_META[actionType].desc}
            </p>
          </div>

          {/* Action Type Segmented Selector */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ACTION_TYPE_META) as SubstitutionActionType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActionType(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  actionType === key
                    ? "bg-[#003B3A] text-white"
                    : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:text-[#003B3A]"
                }`}
              >
                {ACTION_TYPE_META[key].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Lớp áp dụng
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value)
                  setSelectedSlotId("")
                }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
              >
                {filterContext.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className} (Khối {c.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Buổi học
              </label>
              <select
                value={session}
                onChange={(e) => {
                  setSession(e.target.value as "MORNING" | "AFTERNOON")
                  setSelectedSlotId("")
                }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
              >
                <option value="MORNING">Buổi sáng</option>
                <option value="AFTERNOON">Buổi chiều</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tiết thứ
              </label>
              <select
                value={periodNumber}
                onChange={(e) => {
                  setPeriodNumber(Number(e.target.value))
                  setSelectedSlotId("")
                }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    Tiết {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            {(actionType === "SUBSTITUTE" ||
              actionType === "SWAP_PERIOD" ||
              actionType === "MAKEUP") && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Giáo viên dạy thay / đứng lớp
                </label>
                <select
                  value={substituteTeacherId}
                  onChange={(e) => setSubstituteTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
                >
                  <option value="">— Chọn giáo viên (theo mã GV) —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.teacherCode}] {t.teacherName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(actionType === "SWAP_PERIOD" ||
              actionType === "MAKEUP" ||
              actionType === "SUBSTITUTE") && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Môn học thay thế (tùy chọn giữ môn gốc)
                </label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
                >
                  <option value="">— Giữ nguyên môn học gốc —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName} {s.subjectCode ? `(${s.subjectCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(actionType === "CHANGE_ROOM" ||
              actionType === "MAKEUP" ||
              actionType === "SUBSTITUTE") && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Phòng học mới {actionType === "CHANGE_ROOM" ? "(bắt buộc)" : "(tùy chọn)"}
                </label>
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
                >
                  <option value="">— Giữ nguyên phòng học —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.roomCode}] {r.roomName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Lý do điều chỉnh / công tác / nghỉ phép (bắt buộc lưu vết kiểm toán)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: GV Nguyễn Văn A đi coi thi học sinh giỏi cấp Thành phố, phân công GV Trần Thị B dạy thay..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Đang kiểm tra & lưu..." : "Ghi nhận điều chỉnh ngày"}
            </button>
          </div>
        </form>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#003B3A]">
            Sổ cái ngoại lệ điều chỉnh & dạy thay ({substitutions.length} bản ghi gần nhất)
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            Lưu đầy đủ trạng thái trước/sau, lý do và người thao tác
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Ngày áp dụng
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Lớp • Tiết
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Loại điều chỉnh
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Lịch trước điều chỉnh
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Lịch sau điều chỉnh
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Lý do & Người thao tác
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                Trạng thái
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {substitutions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                  Chưa có bản ghi điều chỉnh hoặc dạy thay nào tại cơ sở trong học kỳ này.
                </td>
              </tr>
            ) : (
              substitutions.map((sub) => {
                const meta = ACTION_TYPE_META[sub.actionType as SubstitutionActionType] || {
                  label: sub.actionType,
                  badgeClass: "bg-slate-100 text-slate-700",
                }
                return (
                  <tr
                    key={sub.id}
                    className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                      sub.status === "CANCELLED" ? "opacity-55" : ""
                    }`}
                  >
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900 whitespace-nowrap">
                      {sub.targetDate}
                      <div className="text-[11px] font-normal text-slate-500">
                        {DAY_LABELS[sub.dayOfWeek] || sub.dayOfWeek}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle font-semibold text-[#003B3A] whitespace-nowrap">
                      Lớp {sub.className}
                      <div className="text-[11px] font-normal text-slate-600">
                        {sub.session === "MORNING" ? "Sáng" : "Chiều"} • Tiết {sub.periodNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">
                      {formatSnapshotSummary(sub.beforeSnapshotJson)}
                    </td>
                    <td className="py-3 px-3 align-middle font-medium text-slate-900">
                      {formatSnapshotSummary(sub.afterSnapshotJson)}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-700 max-w-[260px]">
                      <div>{sub.reason}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Bởi: {sub.createdByName || "Hệ thống"} •{" "}
                        {new Date(sub.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      {sub.status === "ACTIVE" ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                          Có hiệu lực
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold">
                          Đã hủy
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      {sub.status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleCancelSubstitution(sub.id)}
                          className="text-[#E11D48] hover:underline font-semibold cursor-pointer"
                        >
                          Hủy ngoại lệ
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </TimetableShell>
  )
}
