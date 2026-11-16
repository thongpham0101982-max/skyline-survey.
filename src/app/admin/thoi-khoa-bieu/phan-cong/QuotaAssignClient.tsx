"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { BarChart3, RefreshCw } from "lucide-react"
import { TimetableShell } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { GradeWeeklyStatsTable } from "@/components/timetable/GradeWeeklyStatsTable"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import { WEEKLY_STANDARD_PERIODS } from "@/lib/timetable/gradeStatsHelper"
import {
  groupTeachersByDepartment,
  teacherMatchesDepartment,
  UNASSIGNED_DEPT_VALUE,
} from "@/lib/timetable/departmentHelper"
import type { ManageableScopeGroup, QuotaReconcileItem } from "@/lib/timetable/types"
import {
  assignTeacherToClassSubjectAction,
  getTimetableQuotaPageAction,
  saveClassSubjectDualAssignmentAction,
  syncScopeDraftsFromAssignmentsAction,
  updateSubjectGradeQuotaAction,
  updateSubjectGradeTeacherSplitAction,
} from "../actions"

type QuotaPageData = Extract<
  Awaited<ReturnType<typeof getTimetableQuotaPageAction>>,
  { success: true }
>

type TeacherOption = QuotaPageData["teachers"][number]

interface DualDraftState {
  gvvnTeacherId: string
  gvvnPeriods: string
  gvnnTeacherId: string
  gvnnPeriods: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OK: {
    label: "Đủ định mức & GV",
    className: "bg-emerald-50 text-[#059669] border border-emerald-200",
  },
  MISSING_TEACHER: {
    label: "Thiếu phân công GV",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
  UNDER_SCHEDULED: {
    label: "Chưa xếp đủ tiết",
    className: "bg-amber-50 text-[#D97706] border border-amber-200",
  },
  OVER_SCHEDULED: {
    label: "Vượt định mức",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
  NO_QUOTA_DEFINED: {
    label: "Chưa khai định mức",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
}

function deriveInitialDualDraft(row: QuotaReconcileItem): DualDraftState {
  const defaultHalf = Math.floor(row.weeklyQuota / 2)
  const fallbackGvvn =
    row.assignedGvvnPeriods !== null && row.assignedGvvnPeriods !== undefined
      ? row.assignedGvvnPeriods
      : row.quotaGvvnPeriods !== null && row.quotaGvvnPeriods !== undefined
        ? row.quotaGvvnPeriods
        : defaultHalf
  const fallbackGvnn =
    row.assignedGvnnPeriods !== null && row.assignedGvnnPeriods !== undefined
      ? row.assignedGvnnPeriods
      : row.quotaGvnnPeriods !== null && row.quotaGvnnPeriods !== undefined
        ? row.quotaGvnnPeriods
        : Math.max(0, Math.round((row.weeklyQuota - fallbackGvvn) * 100) / 100)

  return {
    gvvnTeacherId: row.gvvnTeacherId || "",
    gvvnPeriods: String(fallbackGvvn),
    gvnnTeacherId: row.gvnnTeacherId || "",
    gvnnPeriods: String(fallbackGvnn),
  }
}

export function QuotaAssignClient({ initialData }: { initialData: QuotaPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<QuotaPageData>(initialData, getTimetableQuotaPageAction)

  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [onlyDualFilter, setOnlyDualFilter] = useState<boolean>(false)
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [syncingFromAssignments, setSyncingFromAssignments] = useState(false)
  const [showGradeStats, setShowGradeStats] = useState<boolean>(true)
  const [manualDualKeys, setManualDualKeys] = useState<Record<string, boolean>>({})
  const [dualDrafts, setDualDrafts] = useState<Record<string, DualDraftState>>({})

  // Sync dual drafts whenever fresh server items arrive
  useEffect(() => {
    const next: Record<string, DualDraftState> = {}
    for (const row of data.items) {
      const rowKey = `${row.classId}_${row.subjectId}`
      if (row.isDualGvvnGvnn || manualDualKeys[rowKey]) {
        next[rowKey] = deriveInitialDualDraft(row)
      }
    }
    setDualDrafts(next)
  }, [data.items, manualDualKeys])

  const unassignedDeptCount = useMemo(
    () =>
      data.teachers.filter((t) => teacherMatchesDepartment(t, UNASSIGNED_DEPT_VALUE)).length,
    [data.teachers]
  )

  const deptFilteredTeachers = useMemo(
    () => data.teachers.filter((t) => teacherMatchesDepartment(t, selectedDeptId)),
    [data.teachers, selectedDeptId]
  )

  const gvvnTeachers = useMemo(
    () => deptFilteredTeachers.filter((t) => (t.teacherGroup || "GVVN") !== "GVNN"),
    [deptFilteredTeachers]
  )

  const gvnnTeachers = useMemo(
    () => deptFilteredTeachers.filter((t) => t.teacherGroup === "GVNN"),
    [deptFilteredTeachers]
  )

  const teacherGroupsBySubject = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof groupTeachersByDepartment>>()
    const uniqueSubjectIds = new Set(data.items.map((i) => i.subjectId))
    for (const subId of uniqueSubjectIds) {
      cache.set(subId, groupTeachersByDepartment(deptFilteredTeachers, subId))
    }
    cache.set("__DEFAULT__", groupTeachersByDepartment(deptFilteredTeachers))
    return cache
  }, [data.items, deptFilteredTeachers])

  const teacherById = useMemo(
    () => new Map(data.teachers.map((t) => [t.id, t])),
    [data.teachers]
  )

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      const rowKey = `${item.classId}_${item.subjectId}`
      const isDual = Boolean(item.isDualGvvnGvnn || manualDualKeys[rowKey])
      if (onlyDualFilter && !isDual) return false
      if (statusFilter === "OVER_SCHEDULED") {
        if (item.status !== "OVER_SCHEDULED" && item.overScheduledWeeklyPeriods <= 0) {
          return false
        }
      } else if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const hay = [
          item.className,
          item.subjectCode || "",
          item.subjectName,
          item.primaryTeacherName || "",
          item.primaryTeacherCode || "",
          item.coTeacherName || "",
          item.coTeacherCode || "",
          item.gvvnTeacherName || "",
          item.gvvnTeacherCode || "",
          item.gvnnTeacherName || "",
          item.gvnnTeacherCode || "",
        ]
          .join(" ")
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data.items, onlyDualFilter, manualDualKeys, statusFilter, searchTerm])

  const counts = useMemo(() => {
    return {
      total: data.items.length,
      dualCount: data.items.filter(
        (i) => i.isDualGvvnGvnn || manualDualKeys[`${i.classId}_${i.subjectId}`]
      ).length,
      missingTeacher: data.items.filter((i) => i.status === "MISSING_TEACHER").length,
      underScheduled: data.items.filter((i) => i.status === "UNDER_SCHEDULED").length,
      overScheduled: data.items.filter(
        (i) => i.status === "OVER_SCHEDULED" || i.overScheduledWeeklyPeriods > 0
      ).length,
      ok: data.items.filter((i) => i.status === "OK").length,
    }
  }, [data.items, manualDualKeys])

  // Summary Ledger statistics for ESL & dual GVVN/GVNN subjects in current view
  const dualSummary = useMemo(() => {
    const sourceRows = (onlyDualFilter ? filteredItems : data.items).filter(
      (i) => i.isDualGvvnGvnn || manualDualKeys[`${i.classId}_${i.subjectId}`]
    )
    let totalQuota = 0
    let assignedGvvn = 0
    let assignedGvnn = 0
    let scheduledGvvn = 0
    let scheduledGvnn = 0
    let missingGvvnCount = 0
    let missingGvnnCount = 0
    let mismatchPeriodCount = 0

    for (const r of sourceRows) {
      totalQuota += r.weeklyQuota
      const aVn = r.assignedGvvnPeriods ?? 0
      const aNn = r.assignedGvnnPeriods ?? 0
      assignedGvvn += aVn
      assignedGvnn += aNn
      scheduledGvvn += r.scheduledGvvnPeriods ?? 0
      scheduledGvnn += r.scheduledGvnnPeriods ?? 0

      const needVn = (r.quotaGvvnPeriods ?? aVn) > 0 || !r.gvnnTeacherId
      const needNn = (r.quotaGvnnPeriods ?? aNn) > 0 || !r.gvvnTeacherId
      if (needVn && !r.gvvnTeacherId) missingGvvnCount++
      if (needNn && !r.gvnnTeacherId) missingGvnnCount++

      if (
        (r.gvvnTeacherId || r.gvnnTeacherId) &&
        Math.abs(aVn + aNn - r.weeklyQuota) > 0.01
      ) {
        mismatchPeriodCount++
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100
    return {
      rowCount: sourceRows.length,
      totalQuota: round2(totalQuota),
      assignedGvvn: round2(assignedGvvn),
      assignedGvnn: round2(assignedGvnn),
      scheduledGvvn: round2(scheduledGvvn),
      scheduledGvnn: round2(scheduledGvnn),
      missingGvvnCount,
      missingGvnnCount,
      mismatchPeriodCount,
    }
  }, [data.items, filteredItems, onlyDualFilter, manualDualKeys])

  const handleQuotaBlur = async (
    subjectId: string,
    studyProgram: string,
    grade: string,
    currentVal: number,
    nextRaw: string
  ) => {
    const parsed = Number(nextRaw)
    if (Number.isNaN(parsed) || parsed < 0 || parsed === currentVal) return
    const key = `Q_${subjectId}_${studyProgram}_${grade}`
    setSavingKey(key)
    const res = await updateSubjectGradeQuotaAction({
      academicYearId: data.filterContext.selectedYearId,
      campusId: data.filterContext.selectedCampusId,
      subjectId,
      studyProgram,
      grade,
      weeklyQuota: parsed,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`Đã cập nhật định mức khối ${grade} (${studyProgram}): ${parsed} tiết/tuần.`)
    await reloadWithPatch({})
  }

  const handleTeacherChange = async (
    classId: string,
    subjectId: string,
    teacherId: string
  ) => {
    const key = `T_${classId}_${subjectId}`
    setSavingKey(key)
    const res = await assignTeacherToClassSubjectAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
      classId,
      subjectId,
      teacherId,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Đã cập nhật phân công giảng dạy đồng bộ hệ thống.")
    await reloadWithPatch({})
  }

  const updateDualDraftPatch = (
    row: QuotaReconcileItem,
    patch: Partial<DualDraftState>
  ) => {
    const rowKey = `${row.classId}_${row.subjectId}`
    setDualDrafts((prev) => {
      const cur = prev[rowKey] || deriveInitialDualDraft(row)
      return {
        ...prev,
        [rowKey]: { ...cur, ...patch },
      }
    })
  }

  const persistDualAssignment = async (
    row: QuotaReconcileItem,
    overrideDraft?: DualDraftState
  ) => {
    const rowKey = `${row.classId}_${row.subjectId}`
    const draft = overrideDraft || dualDrafts[rowKey] || deriveInitialDualDraft(row)
    const gvvnP = draft.gvvnPeriods === "" ? null : Math.max(0, Number(draft.gvvnPeriods || 0))
    const gvnnP = draft.gvnnPeriods === "" ? null : Math.max(0, Number(draft.gvnnPeriods || 0))

    setSavingKey(`DUAL_${rowKey}`)
    const res = await saveClassSubjectDualAssignmentAction({
      academicYearId: data.filterContext.selectedYearId,
      semester: data.filterContext.semester,
      campusId: data.filterContext.selectedCampusId,
      scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
      classId: row.classId,
      subjectId: row.subjectId,
      gvvnTeacherId: draft.gvvnTeacherId,
      gvvnPeriods: Number.isNaN(gvvnP as number) ? null : gvvnP,
      gvnnTeacherId: draft.gvnnTeacherId,
      gvnnPeriods: Number.isNaN(gvnnP as number) ? null : gvnnP,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(
      `Đã lưu phân công ${row.subjectName} (${row.className}): GVVN ${gvvnP ?? 0} tiết · GVNN ${gvnnP ?? 0} tiết.`
    )
    await reloadWithPatch({})
  }

  const handleApplyGradeDefaultSplit = async (row: QuotaReconcileItem) => {
    const rowKey = `${row.classId}_${row.subjectId}`
    const draft = dualDrafts[rowKey] || deriveInitialDualDraft(row)
    const gvvnP = Math.max(0, Number(draft.gvvnPeriods || 0))
    const gvnnP = Math.max(0, Number(draft.gvnnPeriods || 0))
    if (Number.isNaN(gvvnP) || Number.isNaN(gvnnP)) return

    setSavingKey(`SPLIT_${rowKey}`)
    const res = await updateSubjectGradeTeacherSplitAction({
      academicYearId: data.filterContext.selectedYearId,
      campusId: data.filterContext.selectedCampusId,
      subjectId: row.subjectId,
      studyProgram: row.studyProgram,
      grade: row.grade,
      className: row.className,
      gvvnPeriods: gvvnP,
      gvnnPeriods: gvnnP,
    })
    setSavingKey(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(
      `Đã áp chuẩn khối ${row.grade} (${row.studyProgram}) môn ${row.subjectName}: GVVN ${gvvnP} tiết + GVNN ${gvnnP} tiết.`
    )
    await reloadWithPatch({})
  }

  const renderRoleSortedOptions = (
    preferredRole: "GVVN" | "GVNN",
    currentTeacherId: string
  ) => {
    const preferredList: TeacherOption[] =
      preferredRole === "GVNN" ? gvnnTeachers : gvvnTeachers
    const secondaryList: TeacherOption[] =
      preferredRole === "GVNN" ? gvvnTeachers : gvnnTeachers
    const currentTeacher = currentTeacherId ? teacherById.get(currentTeacherId) : undefined
    const isCurrentInFiltered = currentTeacher
      ? deptFilteredTeachers.some((t) => t.id === currentTeacher.id)
      : true

    return (
      <>
        <option value="">
          {preferredRole === "GVNN"
            ? "-- Chọn Giáo viên Nước ngoài (GVNN) --"
            : "-- Chọn Giáo viên Việt Nam (GVVN) --"}
        </option>
        {currentTeacher && !isCurrentInFiltered && (
          <optgroup label="Đang phân công hiện tại">
            <option value={currentTeacher.id}>
              {currentTeacher.teacherName} ({currentTeacher.teacherCode})
            </option>
          </optgroup>
        )}
        {preferredList.length > 0 && (
          <optgroup
            label={
              preferredRole === "GVNN"
                ? `Giáo viên Nước ngoài — GVNN (${preferredList.length})`
                : `Giáo viên Việt Nam — GVVN (${preferredList.length})`
            }
          >
            {preferredList.map((t) => (
              <option key={`pref_${preferredRole}_${t.id}`} value={t.id}>
                {t.teacherName} ({t.teacherCode})
                {t.departmentName ? ` — ${t.departmentName}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {secondaryList.length > 0 && (
          <optgroup
            label={
              preferredRole === "GVNN"
                ? `Nhóm GVVN khác (${secondaryList.length})`
                : `Nhóm GVNN khác (${secondaryList.length})`
            }
          >
            {secondaryList.map((t) => (
              <option key={`sec_${preferredRole}_${t.id}`} value={t.id}>
                {t.teacherName} ({t.teacherCode})
                {t.departmentName ? ` — ${t.departmentName}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </>
    )
  }

  return (
    <TimetableShell
      title="Định mức & Phân công giảng dạy"
      subtitle="Đối chiếu định mức SubjectQuota, cơ cấu tiết GVVN / GVNN (ESL & Song ngữ) và số tiết thực xếp trên Thời khóa biểu"
      activeTabCode="QUOTA"
      headerActions={
        <>
          <button
            type="button"
            disabled={syncingFromAssignments}
            onClick={async () => {
              setSyncingFromAssignments(true)
              const res = await syncScopeDraftsFromAssignmentsAction({
                academicYearId: data.filterContext.selectedYearId,
                semester: data.filterContext.semester,
                campusId: data.filterContext.selectedCampusId,
                scopeGroup: data.filterContext.selectedScopeGroup as ManageableScopeGroup,
              })
              setSyncingFromAssignments(false)
              if (!res.success) {
                toast.error(res.error)
                return
              }
              await reloadWithPatch({})
              toast.success(
                res.updatedCount > 0
                  ? `Đã đồng bộ từ Phân công giảng dạy (${res.versionCount} bản nháp): cập nhật ${res.filledPrimaryCount} tiết chính và ${res.filledAltCount} tiết luân phiên.`
                  : "Đã làm mới đối chiếu từ Phân công giảng dạy — tất cả tiết nháp đều đã khớp."
              )
            }}
            title="Lấy dữ liệu mới nhất từ 7. Phân công giảng dạy & 1. Môn học đặc thù đồng bộ vào các phương án TKB nháp của Bộ TKB hiện tại"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#003B3A] text-xs font-semibold hover:bg-teal-100/70 disabled:opacity-50 transition-colors cursor-pointer tabular-nums"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#008B85] ${syncingFromAssignments ? "animate-spin" : ""}`}
            />
            <span>{syncingFromAssignments ? "Đang đồng bộ..." : "Đồng bộ từ Phân công"}</span>
          </button>
          <Link
            href={`/admin/thoi-khoa-bieu/xep-lich?academicYearId=${encodeURIComponent(
              data.filterContext.selectedYearId
            )}&semester=${encodeURIComponent(
              String(data.filterContext.semester)
            )}&scopeGroup=${encodeURIComponent(
              data.filterContext.selectedScopeGroup
            )}&campusId=${encodeURIComponent(
              data.filterContext.selectedCampusId
            )}${
              data.filterContext.selectedVersionId
                ? `&versionId=${encodeURIComponent(data.filterContext.selectedVersionId)}`
                : ""
            }`}
            className="px-3.5 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors"
          >
            Xếp TKB (Kéo & Thả)
          </Link>
          <Link
            href="/admin/subjects"
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC]"
          >
            Danh mục môn & khung CT
          </Link>
          <Link
            href="/admin/teaching-assignments"
            className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 text-xs font-semibold hover:bg-[#F8FAFC]"
          >
            Phân công toàn trường
          </Link>
        </>
      }
    >
      <TimetableFilterBar
        context={data.filterContext}
        onChange={reloadWithPatch}
        loading={loading}
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Unified Academic Ledger Strip for ESL & Dual GVVN / GVNN Tracking */}
      {dualSummary.rowCount > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-4 tabular-nums">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs font-bold text-[#003B3A]">
                Đối chiếu cơ cấu tiết GVVN & GVNN (ESL / Môn tách tiết)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Theo dõi trực tiếp số tiết giao cho Giáo viên Việt Nam và Giáo viên Nước ngoài so với thực xếp trên TKB
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <div className="pr-4 border-r border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Tổng định mức tuần</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {dualSummary.totalQuota} tiết{" "}
                <span className="font-normal text-slate-500">({dualSummary.rowCount} lớp-môn)</span>
              </div>
            </div>

            <div className="pr-4 border-r border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Bố trí cho GVVN</div>
              <div className="font-bold text-[#003B3A] mt-0.5">
                Giao {dualSummary.assignedGvvn} tiết{" "}
                <span className="text-[#008B85] font-semibold">
                  · TKB: {dualSummary.scheduledGvvn}/{dualSummary.assignedGvvn}
                </span>
                {dualSummary.missingGvvnCount > 0 && (
                  <span className="ml-1.5 text-[#E11D48] font-semibold">
                    (Thiếu GV: {dualSummary.missingGvvnCount})
                  </span>
                )}
              </div>
            </div>

            <div className="pr-4 border-r border-[#E2E8F0]">
              <div className="text-[11px] text-slate-500">Bố trí cho GVNN</div>
              <div className="font-bold text-[#059669] mt-0.5">
                Giao {dualSummary.assignedGvnn} tiết{" "}
                <span className="text-[#059669] font-semibold">
                  · TKB: {dualSummary.scheduledGvnn}/{dualSummary.assignedGvnn}
                </span>
                {dualSummary.missingGvnnCount > 0 && (
                  <span className="ml-1.5 text-[#E11D48] font-semibold">
                    (Thiếu GV: {dualSummary.missingGvnnCount})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500">Cân đối GVVN + GVNN</div>
              {dualSummary.mismatchPeriodCount === 0 ? (
                <div className="font-semibold text-[#059669] mt-0.5">Khớp định mức tuần</div>
              ) : (
                <div className="font-semibold text-[#D97706] mt-0.5">
                  {dualSummary.mismatchPeriodCount} lớp lệch tổng tiết
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { code: "ALL", label: `Tất cả (${counts.total})`, isDanger: false },
            {
              code: "OVER_SCHEDULED",
              label: `Vượt định mức (${counts.overScheduled})`,
              isDanger: counts.overScheduled > 0,
            },
            { code: "MISSING_TEACHER", label: `Thiếu phân công GV (${counts.missingTeacher})`, isDanger: false },
            { code: "UNDER_SCHEDULED", label: `Thiếu tiết (${counts.underScheduled})`, isDanger: false },
            { code: "OK", label: `Đạt chuẩn (${counts.ok})`, isDanger: false },
          ].map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => setStatusFilter(f.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === f.code
                  ? f.isDanger
                    ? "bg-[#E11D48] text-white"
                    : "bg-[#003B3A] text-white"
                  : f.isDanger
                  ? "bg-rose-50 text-[#E11D48] border border-rose-200 hover:bg-rose-100"
                  : "bg-[#F8FAFC] text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOnlyDualFilter((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              onlyDualFilter
                ? "bg-[#008B85] text-white border-[#008B85]"
                : "bg-[#F0FDFA] text-[#003B3A] border-teal-200 hover:bg-teal-100/60"
            }`}
          >
            ESL & Môn GVVN + GVNN ({counts.dualCount})
          </button>

          <button
            type="button"
            onClick={() => setShowGradeStats((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              showGradeStats
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-white text-[#003B3A] border-[#E2E8F0] hover:border-[#00A19A]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Thống kê môn theo khối ({WEEKLY_STANDARD_PERIODS} tiết)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            title="Lọc danh sách giáo viên trong ô chọn phân công theo Tổ chuyên môn"
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] focus:outline-none"
          >
            <option value="ALL">Tất cả Tổ chuyên môn ({data.teachers.length})</option>
            {(data.departments || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.teacherCount})
              </option>
            ))}
            {unassignedDeptCount > 0 && (
              <option value={UNASSIGNED_DEPT_VALUE}>
                Chưa phân Tổ chuyên môn ({unassignedDeptCount})
              </option>
            )}
          </select>

          <input
            type="text"
            placeholder="Tìm lớp, môn (ESL...), tên GVVN/GVNN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs w-64 focus:border-[#00A19A] focus:outline-none"
          />
        </div>
      </div>

      {showGradeStats && (
        <GradeWeeklyStatsTable
          classes={data.allScopeClasses || data.scopedClasses || []}
          quotaItems={data.items}
          slots={data.slots || []}
          subjects={data.subjects}
          subjectQuotas={data.subjectQuotas || []}
          defaultGrade={data.filterContext.selectedGrade}
          selectedStudyProgram={data.filterContext.selectedStudyProgram || "ALL"}
          onSelectStudyProgram={(sp) => {
            void reloadWithPatch({ studyProgram: sp, classId: "ALL" })
          }}
          cycleWeeks={data.cycleWeeks}
          targetWeeklyPeriods={WEEKLY_STANDARD_PERIODS}
          onClose={() => setShowGradeStats(false)}
          onUpdateQuota={async ({ subjectId, studyProgram, grade, weeklyQuota }) => {
            const res = await updateSubjectGradeQuotaAction({
              academicYearId: data.filterContext.selectedYearId,
              campusId: data.filterContext.selectedCampusId,
              subjectId,
              studyProgram,
              grade,
              weeklyQuota,
            })
            if (!res.success) {
              toast.error(res.error)
              return
            }
            toast.success(
              `Đã cập nhật định mức khối ${grade} (${studyProgram}): ${weeklyQuota} tiết/tuần.`
            )
            await reloadWithPatch({})
          }}
        />
      )}

      {/* Main Reconciliation Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Lớp học
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Hệ chương trình
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Môn học
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Định mức / tuần
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Chu kỳ ({data.cycleWeeks} tuần)
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                Đã xếp / Thiếu
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Phân công giảng dạy & Cơ cấu tiết (GVVN / GVNN)
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Đồng giảng / CTQT
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                Trạng thái đối chiếu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 px-4 text-center text-slate-500">
                  Không có dòng định mức - phân công nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredItems.map((row) => {
                const rowKey = `${row.classId}_${row.subjectId}`
                const isDualMode = Boolean(row.isDualGvvnGvnn || manualDualKeys[rowKey])
                const st = STATUS_BADGES[row.status] || STATUS_BADGES.OK
                const isSavingRow =
                  savingKey === `T_${rowKey}` ||
                  savingKey === `DUAL_${rowKey}` ||
                  savingKey === `SPLIT_${rowKey}` ||
                  savingKey === `Q_${row.subjectId}_${row.studyProgram}_${row.grade}`

                const draft = dualDrafts[rowKey] || deriveInitialDualDraft(row)
                const draftGvvnNum = Math.max(0, Number(draft.gvvnPeriods || 0) || 0)
                const draftGvnnNum = Math.max(0, Number(draft.gvnnPeriods || 0) || 0)
                const draftSum = Math.round((draftGvvnNum + draftGvnnNum) * 100) / 100
                const sumDiff = Math.round((draftSum - row.weeklyQuota) * 100) / 100
                const hasDualDraftChanges =
                  draft.gvvnTeacherId !== (row.gvvnTeacherId || "") ||
                  draft.gvnnTeacherId !== (row.gvnnTeacherId || "") ||
                  draftGvvnNum !== (row.assignedGvvnPeriods ?? 0) ||
                  draftGvnnNum !== (row.assignedGvnnPeriods ?? 0)

                const isOverQuota =
                  row.status === "OVER_SCHEDULED" || row.overScheduledWeeklyPeriods > 0

                return (
                  <tr
                    key={rowKey}
                    className={`transition-colors align-middle ${
                      isOverQuota
                        ? "bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-[#E11D48]"
                        : "hover:bg-[#F8FAFC]"
                    } ${isSavingRow ? "opacity-60" : ""}`}
                  >
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900 whitespace-nowrap">
                      {row.className}
                      <span className="ml-1.5 text-[11px] text-slate-500 font-normal">
                        ({row.grade})
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                      {row.studyProgram}
                    </td>
                    <td className="py-3 px-3 align-middle font-medium text-slate-800">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            isOverQuota
                              ? "font-bold text-[#E11D48]"
                              : "font-medium text-slate-800"
                          }
                        >
                          {row.subjectName}
                        </span>
                        {isOverQuota && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-[#E11D48] border border-rose-300 text-[10px] font-bold whitespace-nowrap">
                            Vượt +{row.overScheduledWeeklyPeriods} tiết
                          </span>
                        )}
                        {isDualMode && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[10px] font-semibold whitespace-nowrap">
                            GVVN + GVNN
                          </span>
                        )}
                      </div>
                      {row.quotaGvvnPeriods !== null &&
                        row.quotaGvvnPeriods !== undefined &&
                        row.quotaGvnnPeriods !== null &&
                        row.quotaGvnnPeriods !== undefined && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Khung khối: VN {row.quotaGvvnPeriods} · NN {row.quotaGvnnPeriods} tiết
                          </div>
                        )}
                    </td>
                    <td
                      className={`py-3 px-3 align-middle text-right ${
                        isOverQuota ? "bg-rose-100/50" : ""
                      }`}
                    >
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <input
                          key={`q_${row.classId}_${row.subjectId}_${row.weeklyQuota}`}
                          type="number"
                          step="0.5"
                          min={0}
                          max={20}
                          defaultValue={row.weeklyQuota}
                          onBlur={(e) =>
                            handleQuotaBlur(
                              row.subjectId,
                              row.studyProgram,
                              row.grade,
                              row.weeklyQuota,
                              e.target.value
                            )
                          }
                          title={`Sửa định mức môn ${row.subjectName} cho toàn khối ${row.grade} (${row.studyProgram})`}
                          className={`w-16 text-right rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                            isOverQuota
                              ? "border-rose-400 bg-rose-50 text-[#E11D48] ring-2 ring-rose-200 focus:border-[#E11D48]"
                              : "border-[#E2E8F0] bg-white text-slate-800 focus:border-[#00A19A]"
                          }`}
                        />
                        {isOverQuota && (
                          <span className="text-[10px] font-semibold text-[#E11D48] whitespace-nowrap">
                            Xếp {row.scheduledWeeklyEquivalent} (+{row.overScheduledWeeklyPeriods})
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`py-3 px-3 align-middle text-right whitespace-nowrap ${
                        isOverQuota ? "text-[#E11D48] font-semibold" : "text-slate-600"
                      }`}
                    >
                      {row.cycleQuota} tiết
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <div>
                        {isOverQuota ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100/90 border border-rose-200 text-[#E11D48] font-bold">
                            {row.scheduledWeeklyEquivalent} / {row.weeklyQuota} (+
                            {row.overScheduledWeeklyPeriods})
                          </span>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-800">
                              {row.scheduledWeeklyEquivalent} / {row.weeklyQuota}
                            </span>
                            {row.missingWeeklyPeriods > 0 && (
                              <span className="ml-1.5 text-[#D97706] font-semibold">
                                (-{row.missingWeeklyPeriods})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {isDualMode && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="text-[#003B3A] font-medium">
                            VN: {row.scheduledGvvnPeriods ?? 0}/{row.assignedGvvnPeriods ?? draftGvvnNum}
                          </span>
                          {" · "}
                          <span className="text-[#059669] font-medium">
                            NN: {row.scheduledGvnnPeriods ?? 0}/{row.assignedGvnnPeriods ?? draftGvnnNum}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle min-w-[390px]">
                      {isDualMode ? (
                        <div className="space-y-1.5">
                          {/* Row 1: GVVN */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-12 shrink-0 text-center px-1.5 py-1 rounded-md bg-[#F0FDFA] text-[#003B3A] border border-teal-200 text-[11px] font-semibold">
                              GVVN
                            </span>
                            <select
                              value={draft.gvvnTeacherId}
                              onChange={(e) => {
                                const nextDraft = {
                                  ...draft,
                                  gvvnTeacherId: e.target.value,
                                }
                                updateDualDraftPatch(row, { gvvnTeacherId: e.target.value })
                                void persistDualAssignment(row, nextDraft)
                              }}
                              className={`flex-1 min-w-[180px] rounded-lg border px-2 py-1 text-xs ${
                                !draft.gvvnTeacherId && draftGvvnNum > 0
                                  ? "border-rose-300 bg-rose-50/40 text-[#E11D48] font-semibold"
                                  : "border-[#E2E8F0] bg-white text-slate-800"
                              }`}
                            >
                              {renderRoleSortedOptions("GVVN", draft.gvvnTeacherId)}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                max={20}
                                value={draft.gvvnPeriods}
                                onChange={(e) => {
                                  const rawVal = e.target.value
                                  const numVal = Number(rawVal)
                                  if (
                                    rawVal !== "" &&
                                    !Number.isNaN(numVal) &&
                                    numVal >= 0 &&
                                    numVal <= row.weeklyQuota
                                  ) {
                                    const autoNn =
                                      Math.round((row.weeklyQuota - numVal) * 100) / 100
                                    updateDualDraftPatch(row, {
                                      gvvnPeriods: rawVal,
                                      gvnnPeriods: String(autoNn),
                                    })
                                  } else {
                                    updateDualDraftPatch(row, { gvvnPeriods: rawVal })
                                  }
                                }}
                                title="Số tiết/tuần bố trí cho Giáo viên Việt Nam (GVVN)"
                                className="w-14 text-right rounded-lg border border-[#E2E8F0] px-1.5 py-1 text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] focus:outline-none"
                              />
                              <span className="text-[11px] text-slate-500">tiết</span>
                            </div>
                          </div>

                          {/* Row 2: GVNN */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-12 shrink-0 text-center px-1.5 py-1 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                              GVNN
                            </span>
                            <select
                              value={draft.gvnnTeacherId}
                              onChange={(e) => {
                                const nextDraft = {
                                  ...draft,
                                  gvnnTeacherId: e.target.value,
                                }
                                updateDualDraftPatch(row, { gvnnTeacherId: e.target.value })
                                void persistDualAssignment(row, nextDraft)
                              }}
                              className={`flex-1 min-w-[180px] rounded-lg border px-2 py-1 text-xs ${
                                !draft.gvnnTeacherId && draftGvnnNum > 0
                                  ? "border-rose-300 bg-rose-50/40 text-[#E11D48] font-semibold"
                                  : "border-[#E2E8F0] bg-white text-slate-800"
                              }`}
                            >
                              {renderRoleSortedOptions("GVNN", draft.gvnnTeacherId)}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                max={20}
                                value={draft.gvnnPeriods}
                                onChange={(e) => {
                                  const rawVal = e.target.value
                                  const numVal = Number(rawVal)
                                  if (
                                    rawVal !== "" &&
                                    !Number.isNaN(numVal) &&
                                    numVal >= 0 &&
                                    numVal <= row.weeklyQuota
                                  ) {
                                    const autoVn =
                                      Math.round((row.weeklyQuota - numVal) * 100) / 100
                                    updateDualDraftPatch(row, {
                                      gvnnPeriods: rawVal,
                                      gvvnPeriods: String(autoVn),
                                    })
                                  } else {
                                    updateDualDraftPatch(row, { gvnnPeriods: rawVal })
                                  }
                                }}
                                title="Số tiết/tuần bố trí cho Giáo viên Nước ngoài (GVNN)"
                                className="w-14 text-right rounded-lg border border-[#E2E8F0] px-1.5 py-1 text-xs font-semibold text-[#059669] focus:border-[#00A19A] focus:outline-none"
                              />
                              <span className="text-[11px] text-slate-500">tiết</span>
                            </div>
                          </div>

                          {/* Sub-bar: Validation + Save Period Split + Apply to Grade */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
                            <div>
                              {Math.abs(sumDiff) > 0.01 ? (
                                <span className="text-[#D97706] font-semibold">
                                  Tổng giao {draftSum}/{row.weeklyQuota} tiết (lệch{" "}
                                  {sumDiff > 0 ? `+${sumDiff}` : sumDiff})
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  Cơ cấu lớp:{" "}
                                  <strong className="text-[#003B3A]">
                                    {draftGvvnNum} GVVN + {draftGvnnNum} GVNN
                                  </strong>{" "}
                                  = {row.weeklyQuota} tiết
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {hasDualDraftChanges && (
                                <button
                                  type="button"
                                  onClick={() => void persistDualAssignment(row)}
                                  className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white font-semibold hover:bg-[#005250] cursor-pointer"
                                >
                                  Lưu số tiết lớp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleApplyGradeDefaultSplit(row)}
                                title={`Áp dụng cơ cấu ${draftGvvnNum} GVVN + ${draftGvnnNum} GVNN làm định mức mặc định cho toàn khối ${row.grade} (${row.studyProgram})`}
                                className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-slate-600 hover:text-[#003B3A] hover:border-teal-300 font-medium cursor-pointer"
                              >
                                Áp chuẩn khối {row.grade}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={row.primaryTeacherId || ""}
                            onChange={(e) =>
                              handleTeacherChange(row.classId, row.subjectId, e.target.value)
                            }
                            className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                              !row.primaryTeacherId
                                ? "border-rose-300 bg-rose-50/40 text-[#E11D48] font-semibold"
                                : "border-[#E2E8F0] bg-white text-slate-800"
                            }`}
                          >
                            <option value="">-- Chưa phân công giáo viên --</option>
                            {row.primaryTeacherId &&
                              selectedDeptId !== "ALL" &&
                              teacherById.get(row.primaryTeacherId) &&
                              !teacherMatchesDepartment(
                                teacherById.get(row.primaryTeacherId)!,
                                selectedDeptId
                              ) && (
                                <optgroup label="Đang phân công hiện tại">
                                  <option value={row.primaryTeacherId}>
                                    {teacherById.get(row.primaryTeacherId)!.teacherName} (
                                    {teacherById.get(row.primaryTeacherId)!.teacherCode})
                                  </option>
                                </optgroup>
                              )}
                            {(
                              teacherGroupsBySubject.get(row.subjectId) ||
                              teacherGroupsBySubject.get("__DEFAULT__") ||
                              []
                            ).map((group) => (
                              <optgroup
                                key={group.key}
                                label={`${group.label} (${group.teachers.length})`}
                              >
                                {group.teachers.map((t) => (
                                  <option key={`${group.key}_${t.id}`} value={t.id}>
                                    {t.teacherName} ({t.teacherCode})
                                    {t.departmentName ? ` — ${t.departmentName}` : ""}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setManualDualKeys((prev) => ({ ...prev, [rowKey]: true }))
                            }
                            title="Tách cơ cấu phân công thành 2 giáo viên GVVN & GVNN cho môn học này"
                            className="shrink-0 px-2 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-medium text-slate-600 hover:text-[#003B3A] hover:border-teal-300 cursor-pointer whitespace-nowrap"
                          >
                            + GVVN/GVNN
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                      {isDualMode ? (
                        <div className="text-[11px] space-y-0.5">
                          <div>
                            <span className="text-slate-400">GVVN:</span>{" "}
                            <span className="font-medium text-slate-700">
                              {row.gvvnTeacherName || "Chưa gán"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">GVNN:</span>{" "}
                            <span className="font-medium text-[#059669]">
                              {row.gvnnTeacherName || "Chưa gán"}
                            </span>
                          </div>
                        </div>
                      ) : row.coTeacherName ? (
                        `${row.coTeacherName} (${row.coTeacherCode || ""})`
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${st.className}`}
                      >
                        {st.label}
                      </span>
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
