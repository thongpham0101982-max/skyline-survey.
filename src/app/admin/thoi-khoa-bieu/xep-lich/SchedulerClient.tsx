"use client"

import React, { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Lock, Unlock } from "lucide-react"
import { TimetableShell, VERSION_STATUS_BADGE } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { ValidationSummaryPanel } from "@/components/timetable/ValidationSummaryPanel"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import { DAY_LABELS, SHORT_DAY_LABELS } from "@/lib/timetable/scopeResolver"
import type {
  DayOfWeekCode,
  ManageableScopeGroup,
  SessionCode,
  SlotDiffItem,
  SlotRecord,
  UnscheduledActivity,
} from "@/lib/timetable/types"
import {
  clearDraftVersionSlotsAction,
  compareVersionWithBaselineAction,
  createTimetableVersionAction,
  downloadTimetableExcelTemplateAction,
  getTimetableSchedulerPageAction,
  previewTimetableExcelImportAction,
  runAutoScheduleDraftAction,
  saveDraftSlotsBatchAction,
} from "../actions"

type SchedulerPageData = Extract<
  Awaited<ReturnType<typeof getTimetableSchedulerPageAction>>,
  { success: true }
>

function makeCellKey(
  classId: string,
  dayOfWeek: string,
  session: string,
  periodNumber: number
) {
  return `${classId}::${dayOfWeek}::${session}::${periodNumber}`
}

export function SchedulerClient({ initialData }: { initialData: SchedulerPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<SchedulerPageData>(initialData, getTimetableSchedulerPageAction)

  const [slots, setSlots] = useState<SlotRecord[]>(data.slots)
  const [revision, setRevision] = useState<number>(data.selectedVersion?.revision || 1)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)

  // Drag & Drop state
  const [draggedCellKey, setDraggedCellKey] = useState<string | null>(null)

  // Modals & Drawers
  const [showCreateDraftModal, setShowCreateDraftModal] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [cloneSourceId, setCloneSourceId] = useState("")
  const [draftEffectiveFrom, setDraftEffectiveFrom] = useState("")

  const [editingCell, setEditingCell] = useState<{
    classId: string
    className: string
    grade: string
    level: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    slot: SlotRecord | null
  } | null>(null)

  const [showClearDraftModal, setShowClearDraftModal] = useState(false)
  const [confirmVersionCode, setConfirmVersionCode] = useState("")
  const [keepLockedOnClear, setKeepLockedOnClear] = useState(true)

  const [unscheduledList, setUnscheduledList] = useState<UnscheduledActivity[]>([])
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(false)

  const [diffResult, setDiffResult] = useState<{
    baselineName: string | null
    diffs: SlotDiffItem[]
  } | null>(null)

  const [excelPreview, setExcelPreview] = useState<
    Extract<Awaited<ReturnType<typeof previewTimetableExcelImportAction>>, { success: true }> | null
  >(null)

  // Reset local working state whenever server dataset changes (filter/version switch)
  useEffect(() => {
    setSlots(data.slots)
    setRevision(data.selectedVersion?.revision || 1)
    setDirty(false)
    setDiffResult(null)
    setExcelPreview(null)
  }, [data])

  // Browser tab close guard for unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const isEditableDraft = data.selectedVersion?.status === "DRAFT"

  const slotByCell = useMemo(() => {
    const map = new Map<string, SlotRecord>()
    for (const s of slots) {
      map.set(makeCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber), s)
    }
    return map
  }, [slots])

  const displayedClasses = useMemo(() => {
    if (data.filterContext.selectedClassId !== "ALL") {
      return data.filterContext.classes.filter(
        (c) => c.id === data.filterContext.selectedClassId
      )
    }
    return data.filterContext.classes
  }, [data.filterContext.classes, data.filterContext.selectedClassId])

  const periodRows = useMemo(() => {
    const rows: Array<{ dayOfWeek: DayOfWeekCode; session: SessionCode; periodNumber: number }> = []
    const days = data.config.workingDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    for (const d of days) {
      for (let p = 1; p <= (data.config.morningPeriods || 4); p++) {
        rows.push({ dayOfWeek: d, session: "MORNING", periodNumber: p })
      }
      for (let p = 1; p <= (data.config.afternoonPeriods ?? 4); p++) {
        rows.push({ dayOfWeek: d, session: "AFTERNOON", periodNumber: p })
      }
    }
    return rows
  }, [data.config])

  const pendingQuotaActivities = useMemo(() => {
    return data.quotaItems.filter(
      (q) => q.missingWeeklyPeriods > 0 || q.status === "MISSING_TEACHER"
    )
  }, [data.quotaItems])

  const handleSaveDraftBatch = async () => {
    if (!data.selectedVersion) {
      toast.error("Vui lòng khởi tạo bản nháp trước khi lưu.")
      return
    }
    setSaving(true)
    const res = await saveDraftSlotsBatchAction({
      versionId: data.selectedVersion.id,
      expectedRevision: revision,
      scopedClassIds: data.filterContext.classes.map((c) => c.id),
      slots,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setRevision(res.newRevision)
    setDirty(false)
    toast.success(`Đã lưu ${res.savedCount} tiết vào bản nháp (revision ${res.newRevision}).`)
    await reloadWithPatch({})
  }

  const handleSwapOrMoveCells = (sourceKey: string, targetKey: string) => {
    if (!isEditableDraft || sourceKey === targetKey) return
    const [srcClassId] = sourceKey.split("::")
    const [dstClassId, dstDay, dstSession, dstPeriodStr] = targetKey.split("::")
    if (srcClassId !== dstClassId) {
      toast.error("Chỉ hoán đổi / kéo thả tiết trong phạm vi cùng một lớp học.")
      return
    }

    const srcSlot = slotByCell.get(sourceKey)
    const dstSlot = slotByCell.get(targetKey)
    if (!srcSlot) return
    if (srcSlot.isLocked || dstSlot?.isLocked) {
      toast.error("Không thể kéo thả hoặc ghi đè lên ô tiết đang bị khóa.")
      return
    }

    const [, srcDay, srcSession, srcPeriodStr] = sourceKey.split("::")
    const nextSlots = slots.filter(
      (s) =>
        makeCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== sourceKey &&
        makeCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== targetKey
    )

    nextSlots.push({
      ...srcSlot,
      dayOfWeek: dstDay,
      session: dstSession,
      periodNumber: Number(dstPeriodStr),
    })

    if (dstSlot) {
      nextSlots.push({
        ...dstSlot,
        dayOfWeek: srcDay,
        session: srcSession,
        periodNumber: Number(srcPeriodStr),
      })
    }

    setSlots(nextSlots)
    setDirty(true)
  }

  const handleToggleLock = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditableDraft) return
    setSlots((prev) =>
      prev.map((s) =>
        makeCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) === cellKey
          ? { ...s, isLocked: !s.isLocked }
          : s
      )
    )
    setDirty(true)
  }

  const handleCreateDraft = async () => {
    if (!draftName.trim()) {
      toast.error("Vui lòng nhập tên bản nháp / phương án.")
      return
    }
    const res = await createTimetableVersionAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
      name: draftName.trim(),
      effectiveFrom: draftEffectiveFrom || null,
      cloneFromVersionId: cloneSourceId || null,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Đã tạo bản nháp "${res.version.name}".`)
    setShowCreateDraftModal(false)
    setDraftName("")
    await reloadWithPatch({ versionId: res.version.id })
  }

  const handleAutoSchedule = async () => {
    if (!data.selectedVersion || !isEditableDraft) {
      toast.error("Vui lòng chọn hoặc tạo một bản Nháp (DRAFT) để chạy chia lịch tự động.")
      return
    }
    if (dirty) {
      const saveFirst = await saveDraftSlotsBatchAction({
        versionId: data.selectedVersion.id,
        expectedRevision: revision,
        scopedClassIds: data.filterContext.classes.map((c) => c.id),
        slots,
      })
      if (!saveFirst.success) {
        toast.error(saveFirst.error)
        return
      }
      setRevision(saveFirst.newRevision)
    }

    setAutoRunning(true)
    const res = await runAutoScheduleDraftAction({
      versionId: data.selectedVersion.id,
      expectedRevision: dirty ? revision + 1 : revision,
      timeLimitMs: 7000,
    })
    setAutoRunning(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    const r = res.autoScheduleResult
    setUnscheduledList(r.unscheduledActivities)
    if (r.unscheduledActivities.length > 0) {
      setShowUnscheduledPanel(true)
    }
    toast.success(
      `${r.outcomeLabel}: xếp ${r.placedCount}/${r.requiredCount} tiết mới (${r.elapsedMs} ms, giữ ${r.lockedPreservedCount} tiết khóa).`
    )
    await reloadWithPatch({ versionId: data.selectedVersion.id })
  }

  const handleDownloadExcelTemplate = async () => {
    const res = await downloadTimetableExcelTemplateAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      scopeGroup: data.filterContext.selectedScopeGroup,
      campusId: data.filterContext.selectedCampusId,
    })
    if (!res.success) {
      toast.error(res.error)
      return
    }
    const byteChars = atob(res.base64)
    const bytes = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = res.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExcelUpload = async (file: File) => {
    if (!data.selectedVersion || !isEditableDraft) {
      toast.error("Chỉ nhập Excel vào bản Nháp (DRAFT).")
      return
    }
    const buf = await file.arrayBuffer()
    let binary = ""
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64Content = btoa(binary)

    const preview = await previewTimetableExcelImportAction({
      versionId: data.selectedVersion.id,
      base64Content,
    })
    if (!preview.success) {
      toast.error(preview.error)
      return
    }
    setExcelPreview(preview)
  }

  return (
    <TimetableShell
      title="Xếp thời khóa biểu"
      subtitle="Quản lý phương án nháp, kéo thả - khóa tiết, tự động chia lịch theo ràng buộc, nhập Excel có đối chiếu mã và so sánh lịch nền"
      activeTabCode="SCHEDULE"
      hasUnsavedChanges={dirty}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => setShowCreateDraftModal(true)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
          >
            Tạo phương án nháp
          </button>

          {isEditableDraft && (
            <>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
              >
                Tải mẫu Excel
              </button>

              <label className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer">
                Nhập Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleExcelUpload(f)
                    e.currentTarget.value = ""
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleAutoSchedule}
                disabled={autoRunning}
                className="px-3.5 py-2 rounded-xl bg-[#00A19A] text-white text-xs font-semibold hover:bg-[#008B85] disabled:opacity-50 cursor-pointer"
              >
                {autoRunning ? "Đang chia lịch..." : "Chia lịch tự động"}
              </button>

              <button
                type="button"
                onClick={handleSaveDraftBatch}
                disabled={saving || !dirty}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] disabled:opacity-45 cursor-pointer"
              >
                {saving ? "Đang lưu..." : dirty ? "Lưu thay đổi bản nháp" : "Đã lưu"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmVersionCode("")
                  setShowClearDraftModal(true)
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold hover:bg-rose-100 cursor-pointer"
              >
                Xóa dữ liệu bản nháp
              </button>
            </>
          )}

          {data.selectedVersion && (
            <button
              type="button"
              onClick={async () => {
                const res = await compareVersionWithBaselineAction({
                  versionId: data.selectedVersion!.id,
                })
                if (!res.success) {
                  toast.error(res.error)
                  return
                }
                setDiffResult({ baselineName: res.baselineName, diffs: res.diffs })
              }}
              className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
            >
              So sánh với lịch nền
            </button>
          )}
        </>
      }
    >
      <TimetableFilterBar
        context={data.filterContext}
        onChange={reloadWithPatch}
        hasUnsavedChanges={dirty}
        loading={loading}
        extraSlot={
          <button
            type="button"
            onClick={() => setShowUnscheduledPanel((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:border-[#00A19A] tabular-nums cursor-pointer"
          >
            Hoạt động chưa xếp ({pendingQuotaActivities.length + unscheduledList.length})
          </button>
        }
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {data.selectedVersion?.reviewComment && (
        <div className="bg-amber-50 border border-amber-200 text-[#D97706] rounded-2xl px-4 py-3 text-xs">
          <strong>Ý kiến phản hồi xét duyệt:</strong> {data.selectedVersion.reviewComment}
        </div>
      )}

      {!data.selectedVersion ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center space-y-3">
          <p className="text-sm font-bold text-[#003B3A]">
            Phạm vi này chưa có bản nháp hoặc phiên bản thời khóa biểu
          </p>
          <p className="text-xs text-slate-600">
            Khởi tạo một bản nháp mới (hoặc sao chép từ phiên bản nền) để bắt đầu xếp thời khóa biểu cho{" "}
            {data.filterContext.classes.length} lớp học trong phạm vi.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateDraftModal(true)}
            className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
          >
            Tạo phương án nháp đầu tiên
          </button>
        </div>
      ) : (
        <>
          {data.selectedVersion.status !== "DRAFT" && (
            <div className="bg-[#F0FDFA] border border-teal-200 text-[#003B3A] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                Phiên bản <strong>{data.selectedVersion.name}</strong> đang ở trạng thái{" "}
                <strong>
                  {VERSION_STATUS_BADGE[data.selectedVersion.status]?.label ||
                    data.selectedVersion.status}
                </strong>{" "}
                (chế độ chỉ xem để bảo toàn lịch sử). Để chỉnh sửa, hãy tạo bản nháp mới sao chép từ phiên bản này.
              </span>
              <button
                type="button"
                onClick={() => {
                  setCloneSourceId(data.selectedVersion!.id)
                  setDraftName(`${data.selectedVersion!.name} (Bản điều chỉnh)`)
                  setShowCreateDraftModal(true)
                }}
                className="px-3 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Tạo phiên bản nháp từ lịch này
              </button>
            </div>
          )}

          {/* Validation Summary */}
          <ValidationSummaryPanel report={data.validationReport} />

          {/* Unscheduled Activities Panel */}
          {showUnscheduledPanel && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#003B3A]">
                  Hoạt động chưa xếp đủ tiết và nguyên nhân chi tiết
                </h3>
                <button
                  type="button"
                  onClick={() => setShowUnscheduledPanel(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Môn học</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                      Giáo viên
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] text-right">
                      Số tiết thiếu
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                      Nguyên nhân chưa xếp được
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {unscheduledList.map((u, idx) => (
                    <tr key={`U_${idx}`} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{u.className}</td>
                      <td className="py-2.5 px-3 text-slate-800">{u.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.teacherName ? `${u.teacherName} (${u.teacherCode})` : "Chưa gán"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#E11D48]">
                        {u.missingPeriods}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{u.reasonDetail}</td>
                    </tr>
                  ))}
                  {unscheduledList.length === 0 &&
                    pendingQuotaActivities.map((q, idx) => (
                      <tr key={`Q_${idx}`} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{q.className}</td>
                        <td className="py-2.5 px-3 text-slate-800">{q.subjectName}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {q.primaryTeacherName
                            ? `${q.primaryTeacherName} (${q.primaryTeacherCode})`
                            : "Chưa gán"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#D97706]">
                          {q.missingWeeklyPeriods}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {q.status === "MISSING_TEACHER"
                            ? "Chưa có phân công giáo viên cho môn học này"
                            : "Chưa xếp vào ô tiết trên ma trận"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diff Comparison Panel */}
          {diffResult && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#003B3A] tabular-nums">
                  Đối chiếu thay đổi với lịch nền:{" "}
                  {diffResult.baselineName || "Chưa có lịch nền đã ban hành"} (
                  {diffResult.diffs.length} ô thay đổi)
                </h3>
                <button
                  type="button"
                  onClick={() => setDiffResult(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">Lớp</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">Ô tiết</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4]">Loại</th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100">
                      Lịch nền (Trước)
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                      Phương án hiện tại (Sau)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {diffResult.diffs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 text-center text-slate-500">
                        Không có sự khác biệt nào so với lịch nền.
                      </td>
                    </tr>
                  ) : (
                    diffResult.diffs.slice(0, 80).map((d) => (
                      <tr key={d.cellKey} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{d.className}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {SHORT_DAY_LABELS[d.dayOfWeek]} •{" "}
                          {d.session === "MORNING" ? "Sáng" : "Chiều"} T{d.periodNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-[#00736E] border border-teal-200">
                            {d.changeType === "ADDED"
                              ? "Thêm mới"
                              : d.changeType === "REMOVED"
                              ? "Xóa tiết"
                              : "Đổi nội dung"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{d.beforeSummary}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {d.afterSummary}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Excel Preview Modal / Panel */}
          {excelPreview && (
            <div className="bg-white rounded-2xl border-2 border-[#00A19A] p-4 shadow-sm space-y-3 tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#003B3A]">
                    Kết quả đối chiếu mã file Excel trước khi ghi
                  </h3>
                  <p className="text-xs text-slate-600">
                    Khớp hợp lệ: <strong className="text-[#059669]">{excelPreview.parsed.matchedCount}</strong> dòng • Lỗi mã không khớp:{" "}
                    <strong className="text-[#E11D48]">{excelPreview.parsed.errorCount}</strong> dòng
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExcelPreview(null)}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={excelPreview.parsed.matchedCount === 0 || excelPreview.parsed.errorCount > 0}
                    onClick={async () => {
                      if (!data.selectedVersion) return
                      const res = await saveDraftSlotsBatchAction({
                        versionId: data.selectedVersion.id,
                        expectedRevision: revision,
                        scopedClassIds: Array.from(
                          new Set(excelPreview.parsed.matchedSlots.map((s) => s.classId))
                        ),
                        slots: excelPreview.parsed.matchedSlots,
                      })
                      if (!res.success) {
                        toast.error(res.error)
                        return
                      }
                      toast.success(`Đã ghi ${res.savedCount} tiết từ Excel vào bản nháp.`)
                      setExcelPreview(null)
                      await reloadWithPatch({})
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Xác nhận ghi vào bản nháp
                  </button>
                </div>
              </div>

              {excelPreview.parsed.errorCount > 0 && (
                <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-xl p-3 bg-rose-50/40 text-xs text-[#E11D48] space-y-1">
                  {excelPreview.parsed.diagnostics
                    .filter((d) => d.status === "ERROR")
                    .map((d, i) => (
                      <div key={i}>
                        Dòng {d.rowNumber} ({d.className} - {d.dayLabel} {d.periodLabel}):{" "}
                        {d.errorMessage}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* FULL-SPACE STICKY SCHEDULING MATRIX */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-auto max-h-[72vh]">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                    <th className="sticky left-0 z-30 bg-[#003B3A] py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap border-r border-white/10 min-w-[115px]">
                      Thứ / Buổi / Tiết
                    </th>
                    {displayedClasses.map((cls) => (
                      <th
                        key={cls.id}
                        className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap border-r border-white/10 min-w-[155px]"
                      >
                        <div>Lớp {cls.className}</div>
                        <div className="text-[10px] font-normal text-teal-100">
                          Khối {cls.grade} • {cls.educationSystem || "Chuẩn"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                  {periodRows.map((pr, rowIdx) => {
                    const prev = periodRows[rowIdx - 1]
                    const isNewDay = !prev || prev.dayOfWeek !== pr.dayOfWeek
                    const isAfternoonStart =
                      pr.session === "AFTERNOON" && pr.periodNumber === 1

                    return (
                      <tr
                        key={`${pr.dayOfWeek}_${pr.session}_${pr.periodNumber}`}
                        className={`${isNewDay ? "border-t-2 border-t-[#003B3A]/25" : ""} ${
                          isAfternoonStart ? "border-t border-t-slate-300" : ""
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-[#F8FAFC] py-2 px-3 align-middle border-r border-[#E2E8F0] whitespace-nowrap">
                          <div className="font-bold text-[#003B3A] text-[11px]">
                            {SHORT_DAY_LABELS[pr.dayOfWeek]}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {pr.session === "MORNING" ? "Sáng" : "Chiều"} • Tiết {pr.periodNumber}
                          </div>
                        </td>

                        {displayedClasses.map((cls) => {
                          const cKey = makeCellKey(
                            cls.id,
                            pr.dayOfWeek,
                            pr.session,
                            pr.periodNumber
                          )
                          const slot = slotByCell.get(cKey) || null

                          return (
                            <td
                              key={cKey}
                              draggable={Boolean(isEditableDraft && slot && !slot.isLocked)}
                              onDragStart={() => setDraggedCellKey(cKey)}
                              onDragOver={(e) => {
                                if (isEditableDraft) e.preventDefault()
                              }}
                              onDrop={() => {
                                if (draggedCellKey) {
                                  handleSwapOrMoveCells(draggedCellKey, cKey)
                                  setDraggedCellKey(null)
                                }
                              }}
                              onClick={() => {
                                if (!isEditableDraft) return
                                setEditingCell({
                                  classId: cls.id,
                                  className: cls.className,
                                  grade: cls.grade,
                                  level: cls.level,
                                  dayOfWeek: pr.dayOfWeek,
                                  session: pr.session,
                                  periodNumber: pr.periodNumber,
                                  slot,
                                })
                              }}
                              className={`py-2 px-2.5 align-top border-r border-[#F1F5F9] transition-colors ${
                                isEditableDraft ? "cursor-pointer hover:bg-[#F0FDFA]/60" : ""
                              } ${slot?.isLocked ? "bg-slate-50" : ""}`}
                            >
                              {slot && (slot.subjectName || slot.subjectId) ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-semibold text-slate-900 leading-tight">
                                      {slot.subjectName}
                                    </span>
                                    {isEditableDraft && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleLock(cKey, e)}
                                        title={slot.isLocked ? "Mở khóa tiết" : "Khóa cố định tiết"}
                                        className="text-slate-400 hover:text-[#003B3A] p-0.5"
                                      >
                                        {slot.isLocked ? (
                                          <Lock className="w-3 h-3 text-[#003B3A]" />
                                        ) : (
                                          <Unlock className="w-3 h-3 opacity-40 hover:opacity-100" />
                                        )}
                                      </button>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-600 truncate">
                                    {slot.teacherName
                                      ? `${slot.teacherName}${slot.teacherCode ? ` (${slot.teacherCode})` : ""}`
                                      : "Chưa gán GV"}
                                  </div>

                                  {(slot.coTeacherName || slot.assistantTeacherName) && (
                                    <div className="text-[10px] text-[#00736E] truncate">
                                      + {slot.coTeacherName || slot.assistantTeacherName}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                    {slot.roomName && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                        {slot.roomCode || slot.roomName}
                                      </span>
                                    )}
                                    {slot.weekType && slot.weekType !== "ALL" && (
                                      <span className="px-1.5 py-0.2 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-semibold">
                                        {slot.weekType === "ODD" ? "Tuần lẻ" : "Tuần chẵn"}
                                      </span>
                                    )}
                                  </div>

                                  {slot.altSubjectName && (
                                    <div className="pt-1 mt-1 border-t border-dashed border-slate-200 text-[10px] text-slate-600">
                                      Luân phiên: <strong>{slot.altSubjectName}</strong>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-10 flex items-center justify-center text-[11px] text-slate-300">
                                  —
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Cell Editor Modal */}
      {editingCell && (
        <CellEditorModal
          cell={editingCell}
          subjects={data.subjects}
          teachers={data.teachers}
          rooms={data.rooms}
          onClose={() => setEditingCell(null)}
          onSave={(updated) => {
            const cKey = makeCellKey(
              editingCell.classId,
              editingCell.dayOfWeek,
              editingCell.session,
              editingCell.periodNumber
            )
            setSlots((prev) => {
              const filtered = prev.filter(
                (s) =>
                  makeCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== cKey
              )
              return updated ? [...filtered, updated] : filtered
            })
            setDirty(true)
            setEditingCell(null)
          }}
        />
      )}

      {/* Create Draft Modal */}
      {showCreateDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-[#003B3A]">Khởi tạo phương án / bản nháp mới</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên bản nháp / phương án
                </label>
                <input
                  type="text"
                  placeholder="VD: TKB Học kỳ 1 - Đợt 1"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sao chép dữ liệu nền từ phiên bản (tùy chọn)
                </label>
                <select
                  value={cloneSourceId}
                  onChange={(e) => setCloneSourceId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Bản nháp trống --</option>
                  {data.filterContext.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày dự kiến áp dụng
                </label>
                <input
                  type="date"
                  value={draftEffectiveFrom}
                  onChange={(e) => setDraftEffectiveFrom(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateDraftModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCreateDraft}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold cursor-pointer"
              >
                Khởi tạo bản nháp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Clear Draft Modal */}
      {showClearDraftModal && data.selectedVersion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-[#E11D48]">
              Xác nhận xóa dữ liệu bản nháp (Không ảnh hưởng lịch đã ban hành)
            </h3>
            <p className="text-xs text-slate-600">
              Thao tác này chỉ xóa các tiết trên bản nháp{" "}
              <strong className="text-slate-900">{data.selectedVersion.name}</strong>. Vui lòng nhập chính xác mã phiên bản{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-900">
                {data.selectedVersion.code}
              </code>{" "}
              để xác nhận:
            </p>
            <input
              type="text"
              value={confirmVersionCode}
              onChange={(e) => setConfirmVersionCode(e.target.value)}
              placeholder={data.selectedVersion.code}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={keepLockedOnClear}
                onChange={(e) => setKeepLockedOnClear(e.target.checked)}
              />
              <span>Giữ lại các tiết đang khóa cố định</span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearDraftModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await clearDraftVersionSlotsAction({
                    versionId: data.selectedVersion!.id,
                    expectedRevision: revision,
                    keepLockedSlots: keepLockedOnClear,
                    confirmVersionCode,
                  })
                  if (!res.success) {
                    toast.error(res.error)
                    return
                  }
                  toast.success(`Đã xóa ${res.deletedCount} tiết khỏi bản nháp.`)
                  setShowClearDraftModal(false)
                  await reloadWithPatch({})
                }}
                className="px-4 py-2 rounded-xl bg-[#E11D48] text-white text-xs font-semibold cursor-pointer"
              >
                Xóa dữ liệu bản nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </TimetableShell>
  )
}

function CellEditorModal({
  cell,
  subjects,
  teachers,
  rooms,
  onClose,
  onSave,
}: {
  cell: {
    classId: string
    className: string
    grade: string
    level: string
    dayOfWeek: DayOfWeekCode
    session: SessionCode
    periodNumber: number
    slot: SlotRecord | null
  }
  subjects: SchedulerPageData["subjects"]
  teachers: SchedulerPageData["teachers"]
  rooms: SchedulerPageData["rooms"]
  onClose: () => void
  onSave: (slot: SlotRecord | null) => void
}) {
  const [subjectId, setSubjectId] = useState(cell.slot?.subjectId || "")
  const [teacherId, setTeacherId] = useState(cell.slot?.teacherId || "")
  const [coTeacherId, setCoTeacherId] = useState(cell.slot?.coTeacherId || "")
  const [assistantTeacherId, setAssistantTeacherId] = useState(
    cell.slot?.assistantTeacherId || ""
  )
  const [roomId, setRoomId] = useState(cell.slot?.roomId || "")
  const [weekType, setWeekType] = useState(cell.slot?.weekType || "ALL")
  const [altSubjectId, setAltSubjectId] = useState(cell.slot?.altSubjectId || "")
  const [altTeacherId, setAltTeacherId] = useState(cell.slot?.altTeacherId || "")
  const [isLocked, setIsLocked] = useState(Boolean(cell.slot?.isLocked))

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-lg w-full p-5 space-y-4 shadow-lg text-xs">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#003B3A]">
              Cập nhật tiết học — Lớp {cell.className}
            </h3>
            <p className="text-slate-500 mt-0.5">
              {DAY_LABELS[cell.dayOfWeek]} • {cell.session === "MORNING" ? "Buổi sáng" : "Buổi chiều"} • Tiết {cell.periodNumber}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Môn học chính</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Trống --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Giáo viên chính (Mã GV)</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Chưa chọn --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">GV đồng giảng (tùy chọn)</label>
            <select
              value={coTeacherId}
              onChange={(e) => setCoTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Không --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Trợ giảng (tùy chọn)</label>
            <select
              value={assistantTeacherId}
              onChange={(e) => setAssistantTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Không --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phòng học / Chức năng</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="">-- Phòng lớp mặc định --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomName} ({r.roomCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chu kỳ tuần</label>
            <select
              value={weekType}
              onChange={(e) => setWeekType(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
            >
              <option value="ALL">Hàng tuần</option>
              <option value="ODD">Tuần lẻ (0.5 tiết/tuần)</option>
              <option value="EVEN">Tuần chẵn (0.5 tiết/tuần)</option>
            </select>
          </div>

          {weekType !== "ALL" && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Môn luân phiên tuần còn lại
                </label>
                <select
                  value={altSubjectId}
                  onChange={(e) => setAltSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Trống --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GV luân phiên</label>
                <select
                  value={altTeacherId}
                  onChange={(e) => setAltTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="">-- Không --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} ({t.teacherCode})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-slate-700">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
          />
          <span>Khóa cố định ô tiết này khi chạy chia lịch tự động</span>
        </label>

        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => onSave(null)}
            className="px-3 py-2 rounded-xl text-[#E11D48] hover:bg-rose-50 font-semibold cursor-pointer"
          >
            Làm trống ô này
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                if (!subjectId) {
                  onSave(null)
                  return
                }
                const sub = subjects.find((s) => s.id === subjectId)
                const tMain = teachers.find((t) => t.id === teacherId)
                const tCo = teachers.find((t) => t.id === coTeacherId)
                const tAss = teachers.find((t) => t.id === assistantTeacherId)
                const rm = rooms.find((r) => r.id === roomId)
                const altSub = subjects.find((s) => s.id === altSubjectId)
                const altT = teachers.find((t) => t.id === altTeacherId)

                onSave({
                  classId: cell.classId,
                  className: cell.className,
                  grade: cell.grade,
                  level: cell.level,
                  dayOfWeek: cell.dayOfWeek,
                  session: cell.session,
                  periodNumber: cell.periodNumber,
                  subjectId: sub?.id || null,
                  subjectCode: sub?.subjectCode || null,
                  subjectName: sub?.subjectName || null,
                  teacherId: tMain?.id || null,
                  teacherCode: tMain?.teacherCode || null,
                  teacherName: tMain?.teacherName || null,
                  coTeacherId: tCo?.id || null,
                  coTeacherCode: tCo?.teacherCode || null,
                  coTeacherName: tCo?.teacherName || null,
                  assistantTeacherId: tAss?.id || null,
                  assistantTeacherCode: tAss?.teacherCode || null,
                  assistantTeacherName: tAss?.teacherName || null,
                  roomId: rm?.id || null,
                  roomCode: rm?.roomCode || null,
                  roomName: rm?.roomName || null,
                  weekType,
                  altSubjectId: altSub?.id || null,
                  altSubjectName: altSub?.subjectName || null,
                  altTeacherId: altT?.id || null,
                  altTeacherCode: altT?.teacherCode || null,
                  altTeacherName: altT?.teacherName || null,
                  isLocked,
                })
              }}
              className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-semibold cursor-pointer"
            >
              Áp dụng vào ô tiết
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
