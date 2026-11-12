"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { ensureTimetableSchema } from "@/lib/timetable/schemaInit"
import {
  assertCampusAllowed,
  requireTimetablePermission,
  TimetableAccessError,
  verifyClassesBelongToScope,
  verifyEditableVersion,
} from "@/lib/timetable/rbac"
import {
  auditLegacyUnversionedSlots,
  loadScopedWorkspaceContext,
  mapDbSlotToRecord,
} from "@/lib/timetable/dataLoader"
import {
  dateIsoToDayOfWeek,
  doDateRangesOverlap,
  extractGradeNumber,
  formatCampusDisplayName,
  resolveWeekParity,
  SHORT_DAY_LABELS,
  timeStringToMinutes,
} from "@/lib/timetable/scopeResolver"
import { reconcileQuotasAndAssignments } from "@/lib/timetable/quotaReconciler"
import { validateTimetable } from "@/lib/timetable/validator"
import { runAutoScheduler } from "@/lib/timetable/autoScheduler"
import {
  buildTimetableImportTemplateBase64,
  exportLookupScheduleToExcelBase64,
  parseAndReconcileTimetableExcel,
} from "@/lib/timetable/excelService"
import {
  getEffectiveClassWeekSchedule,
  getEffectiveTeacherWeekSchedule,
} from "@/lib/timetable/effectiveScheduleService"
import type {
  BlockRule,
  DayOfWeekCode,
  FixedSlotRule,
  LimitsAndPriorities,
  ManageableScopeGroup,
  PeriodTimeDef,
  SlotDiffItem,
  SlotRecord,
  SubstitutionActionType,
  TimetableFilterParams,
} from "@/lib/timetable/types"

function formatActionError(err: unknown): { success: false; error: string; errorCode?: string } {
  if (err instanceof TimetableAccessError) {
    return { success: false, error: err.message, errorCode: err.code }
  }
  console.error("[TimetableActions] Unexpected error:", err)
  const message = err instanceof Error ? err.message : "Đã xảy ra lỗi xử lý thời khóa biểu."
  return { success: false, error: message }
}

async function appendAuditLog(params: {
  versionId?: string | null
  campusId?: string | null
  actorId: string
  actorName: string
  actorRole: string
  action: string
  summary: string
  beforeJson?: unknown
  afterJson?: unknown
}) {
  try {
    await prisma.timetableAuditLog.create({
      data: {
        versionId: params.versionId || null,
        campusId: params.campusId || null,
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        summary: params.summary,
        beforeJson: params.beforeJson ? JSON.stringify(params.beforeJson) : null,
        afterJson: params.afterJson ? JSON.stringify(params.afterJson) : null,
      },
    })
  } catch (e) {
    console.error("[TimetableAudit] Failed to record audit log:", e)
  }
}

function serializeFilterContext(ws: Awaited<ReturnType<typeof loadScopedWorkspaceContext>>) {
  return {
    academicYears: ws.academicYears.map((y) => ({
      id: y.id,
      name: y.name,
      status: y.status,
    })),
    selectedYearId: ws.selectedYearId,
    semester: ws.semester,
    validScopes: ws.catalog.validScopes,
    selectedScopeGroup: ws.selectedScopeGroup,
    campusesForScope: (ws.catalog.campusesByScope[ws.selectedScopeGroup] || []).map((c) => ({
      id: c.id,
      campusCode: c.campusCode || c.campusName || "",
      displayName: formatCampusDisplayName(c),
    })),
    permittedCampuses: ws.catalog.permittedCampuses.map((c) => ({
      id: c.id,
      campusCode: c.campusCode || c.campusName || "",
      displayName: formatCampusDisplayName(c),
    })),
    selectedCampusId: ws.selectedCampusId,
    levelOptions: ws.levelOptions,
    selectedLevelCode: ws.selectedLevelCode,
    availableGrades: ws.availableGrades,
    selectedGrade: ws.selectedGrade,
    classes: ws.inScopeClasses.map((c) => ({
      id: c.id,
      className: c.className,
      grade: c.grade,
      level: c.level,
      educationSystem: c.educationSystem || "",
      homeroomTeacherId: c.homeroomTeacherId || "",
      campusId: c.campusId,
    })),
    selectedClassId: ws.selectedClassId,
    versions: ws.versions.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      scopeGroup: v.scopeGroup,
      campusId: v.campusId,
      levelCode: v.levelCode,
      versionNumber: v.versionNumber,
      status: v.status,
      effectiveFrom: v.effectiveFrom,
      effectiveTo: v.effectiveTo,
      revision: v.revision,
      reviewComment: v.reviewComment,
      publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
      updatedAt: v.updatedAt.toISOString(),
    })),
    selectedVersionId: ws.selectedVersion?.id || "",
  }
}

function revalidateTimetablePaths() {
  revalidatePath("/admin/thoi-khoa-bieu")
  revalidatePath("/admin/thoi-khoa-bieu/cau-hinh")
  revalidatePath("/admin/thoi-khoa-bieu/phan-cong")
  revalidatePath("/admin/thoi-khoa-bieu/xep-lich")
  revalidatePath("/admin/thoi-khoa-bieu/tra-cuu")
  revalidatePath("/admin/thoi-khoa-bieu/dieu-chinh")
  revalidatePath("/admin/thoi-khoa-bieu/ban-hanh")
  revalidatePath("/teacher/thoi-khoa-bieu")
  revalidatePath("/parent/thoi-khoa-bieu")
  revalidatePath("/hocsinh/portal/thoi-khoa-bieu")
}

// ============================================================================
// 1. TỔNG QUAN (/admin/thoi-khoa-bieu)
// ============================================================================
export async function getTimetableOverviewAction(filters: TimetableFilterParams = {}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_OVERVIEW",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
      allowLienCap: true,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      includeLienCapLookup: false,
      loadExternalActiveSlots: true,
    })

    const inScopeClassIds = ws.inScopeClasses.map((c) => c.id)

    const [
      allPermittedVersions,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      versionSlotsRaw,
      legacyAudit,
      recentSubstitutions,
    ] = await Promise.all([
      prisma.timetableVersion.findMany({
        where: {
          academicYearId: ws.selectedYearId,
          semester: ws.semester,
          ...(authCtx.isFullAccess
            ? {}
            : { campusId: { in: authCtx.allowedCampusIds } }),
        },
        orderBy: [{ updatedAt: "desc" }],
      }),
      prisma.subjectQuota.findMany({
        where: { academicYearId: ws.selectedYearId },
      }),
      inScopeClassIds.length > 0
        ? prisma.teachingAssignment.findMany({
            where: {
              academicYearId: ws.selectedYearId,
              semester: ws.semester,
              classId: { in: inScopeClassIds },
            },
          })
        : Promise.resolve([]),
      inScopeClassIds.length > 0
        ? prisma.ctqtTeachingAssignment
            .findMany({
              where: {
                academicYearId: ws.selectedYearId,
                semester: ws.semester,
                classId: { in: inScopeClassIds },
                status: "ACTIVE",
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      ws.selectedVersion
        ? prisma.timetableSlot.findMany({
            where: {
              versionId: ws.selectedVersion.id,
              ...(inScopeClassIds.length > 0 ? { classId: { in: inScopeClassIds } } : {}),
              status: "ACTIVE",
            },
          })
        : Promise.resolve([]),
      auditLegacyUnversionedSlots({
        allowedCampusIds: authCtx.allowedCampusIds,
        isFullAccess: authCtx.isFullAccess,
      }),
      ws.selectedCampusId
        ? prisma.timetableSubstitution.findMany({
            where: {
              academicYearId: ws.selectedYearId,
              semester: ws.semester,
              campusId: ws.selectedCampusId,
              status: "ACTIVE",
            },
            orderBy: { targetDate: "desc" },
            take: 15,
          })
        : Promise.resolve([]),
    ])

    const mappedSlots = versionSlotsRaw.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    const quotaItems = reconcileQuotasAndAssignments({
      classes: ws.inScopeClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      scheduledSlots: mappedSlots,
      cycleWeeks: ws.config.cycleWeeks,
    })

    const teachersById = new Map(ws.teachers.map((t) => [t.id, t]))
    const validationReport = validateTimetable({
      slots: mappedSlots,
      config: ws.config,
      campusId: ws.selectedCampusId,
      campusName: formatCampusDisplayName(ws.selectedCampusObj),
      classes: ws.inScopeClasses,
      teachersById,
      quotaItems,
      rooms: ws.rooms,
      busySlots: ws.busySlots,
      travelRules: ws.travelRules,
      externalActiveSlots: ws.externalActiveSlots,
    })

    const requiredWeeklyTotal =
      Math.round(quotaItems.reduce((sum, q) => sum + q.weeklyQuota, 0) * 100) / 100
    const scheduledWeeklyTotal =
      Math.round(quotaItems.reduce((sum, q) => sum + q.scheduledWeeklyEquivalent, 0) * 100) / 100
    const missingWeeklyTotal =
      Math.round(quotaItems.reduce((sum, q) => sum + q.missingWeeklyPeriods, 0) * 100) / 100

    const missingTeacherList = quotaItems.filter((q) => q.status === "MISSING_TEACHER")
    const underScheduledList = quotaItems.filter((q) => q.missingWeeklyPeriods > 0)

    const campusNameMap = new Map(
      ws.allCampuses.map((c) => [c.id, formatCampusDisplayName(c)])
    )

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      metrics: {
        publishedCount: allPermittedVersions.filter((v) => v.status === "PUBLISHED").length,
        draftCount: allPermittedVersions.filter((v) => v.status === "DRAFT").length,
        pendingApprovalCount: allPermittedVersions.filter((v) => v.status === "PENDING_APPROVAL")
          .length,
        requiredWeeklyTotal,
        scheduledWeeklyTotal,
        missingWeeklyTotal,
        conflictCount: validationReport.allIssues.filter((i) => i.severity === "ERROR").length,
        missingAssignmentCount: missingTeacherList.length,
        legacyAnomalyCount: legacyAudit.anomalies.reduce((acc, a) => acc + a.count, 0),
      },
      versionSummaries: allPermittedVersions.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        scopeGroup: v.scopeGroup,
        campusId: v.campusId,
        campusName: campusNameMap.get(v.campusId) || v.campusId,
        status: v.status,
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo,
        versionNumber: v.versionNumber,
        updatedAt: v.updatedAt.toISOString(),
      })),
      drilldowns: {
        missingAssignments: missingTeacherList,
        underScheduled: underScheduledList,
        conflicts: validationReport.allIssues,
        legacyAnomalies: legacyAudit.anomalies,
        totalLegacyUnversionedRows: legacyAudit.totalLegacyRows,
        recentSubstitutions: recentSubstitutions.map((s) => ({
          id: s.id,
          targetDate: s.targetDate,
          actionType: s.actionType,
          className: s.className,
          session: s.session,
          periodNumber: s.periodNumber,
          originalTeacherName: s.originalTeacherName,
          substituteTeacherName: s.substituteTeacherName,
          reason: s.reason,
        })),
      },
      validationReport,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// 2. CẤU HÌNH THỜI KHÓA BIỂU (/admin/thoi-khoa-bieu/cau-hinh)
// ============================================================================
export async function getTimetableConfigPageAction(filters: TimetableFilterParams = {}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_CONFIG",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      includeLienCapLookup: false,
    })

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      config: ws.config,
      subjects: ws.subjects.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName,
      })),
      teachers: ws.teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        campusId: t.campusId || "",
      })),
      rooms: ws.rawRooms.map((r) => ({
        id: r.id,
        campusId: r.campusId,
        roomCode: r.roomCode,
        roomName: r.roomName,
        roomType: r.roomType,
        capacity: r.capacity,
        allowedSubjectIds: (() => {
          try {
            return JSON.parse(r.allowedSubjectIdsJson || "[]") as string[]
          } catch {
            return []
          }
        })(),
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        notes: r.notes,
      })),
      busySlots: ws.rawBusySlots
        .filter((b) => !b.campusId || b.campusId === ws.selectedCampusId)
        .map((b) => ({
          id: b.id,
          targetType: b.targetType,
          targetId: b.targetId,
          campusId: b.campusId,
          dayOfWeek: b.dayOfWeek,
          session: b.session,
          periodNumber: b.periodNumber,
          weekType: b.weekType,
          reason: b.reason,
          effectiveFrom: b.effectiveFrom,
          effectiveTo: b.effectiveTo,
        })),
      travelRules: ws.rawTravelRules.map((tr) => ({
        id: tr.id,
        fromCampusId: tr.fromCampusId,
        toCampusId: tr.toCampusId,
        minTravelMinutes: tr.minTravelMinutes,
        allowSameSession: tr.allowSameSession,
        allowSameDay: tr.allowSameDay,
        effectiveFrom: tr.effectiveFrom,
        effectiveTo: tr.effectiveTo,
        notes: tr.notes,
      })),
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function saveTimetableConfigAction(payload: {
  academicYearId: string
  semester: number
  campusId: string
  scopeGroup: ManageableScopeGroup
  workingDays: DayOfWeekCode[]
  morningPeriods: number
  afternoonPeriods: number
  periodTimes: PeriodTimeDef[]
  cycleWeeks: number
  cycleAnchorDate?: string | null
  fixedSlots: FixedSlotRule[]
  blockRules: BlockRule[]
  limitsAndPriorities: LimitsAndPriorities
  effectiveFrom?: string | null
  effectiveTo?: string | null
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_CONFIG",
      campusIds: [payload.campusId],
      scopeGroup: payload.scopeGroup,
    })

    await ensureTimetableSchema()

    const morningPeriods = Math.max(1, Math.min(6, Number(payload.morningPeriods || 4)))
    const afternoonPeriods = Math.max(0, Math.min(6, Number(payload.afternoonPeriods ?? 4)))

    for (const pt of payload.periodTimes || []) {
      const sm = timeStringToMinutes(pt.startTime)
      const em = timeStringToMinutes(pt.endTime)
      if (sm === null || em === null || em <= sm) {
        return {
          success: false as const,
          error: `Khung giờ không hợp lệ tại ${pt.label} (${pt.startTime} - ${pt.endTime}): giờ kết thúc phải sau giờ bắt đầu.`,
        }
      }
    }

    const saved = await prisma.timetableConfig.upsert({
      where: {
        academicYearId_semester_campusId_scopeGroup_levelCode: {
          academicYearId: payload.academicYearId,
          semester: payload.semester,
          campusId: payload.campusId,
          scopeGroup: payload.scopeGroup,
          levelCode: "ALL",
        },
      },
      update: {
        workingDaysJson: JSON.stringify(payload.workingDays),
        morningPeriods,
        afternoonPeriods,
        periodTimesJson: JSON.stringify(payload.periodTimes),
        cycleWeeks: payload.cycleWeeks || 2,
        cycleAnchorDate: payload.cycleAnchorDate || null,
        fixedSlotsJson: JSON.stringify(payload.fixedSlots || []),
        blockRulesJson: JSON.stringify(payload.blockRules || []),
        limitsAndPrioritiesJson: JSON.stringify(payload.limitsAndPriorities || {}),
        effectiveFrom: payload.effectiveFrom || null,
        effectiveTo: payload.effectiveTo || null,
        updatedById: authCtx.actorId,
        updatedByName: authCtx.actorName,
      },
      create: {
        academicYearId: payload.academicYearId,
        semester: payload.semester,
        campusId: payload.campusId,
        scopeGroup: payload.scopeGroup,
        levelCode: "ALL",
        workingDaysJson: JSON.stringify(payload.workingDays),
        morningPeriods,
        afternoonPeriods,
        periodTimesJson: JSON.stringify(payload.periodTimes),
        cycleWeeks: payload.cycleWeeks || 2,
        cycleAnchorDate: payload.cycleAnchorDate || null,
        fixedSlotsJson: JSON.stringify(payload.fixedSlots || []),
        blockRulesJson: JSON.stringify(payload.blockRules || []),
        limitsAndPrioritiesJson: JSON.stringify(payload.limitsAndPriorities || {}),
        effectiveFrom: payload.effectiveFrom || null,
        effectiveTo: payload.effectiveTo || null,
        updatedById: authCtx.actorId,
        updatedByName: authCtx.actorName,
      },
    })

    await appendAuditLog({
      campusId: payload.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: "SAVE_CONFIG",
      summary: `Cập nhật cấu hình TKB (${payload.scopeGroup}: ${morningPeriods} tiết sáng, ${afternoonPeriods} tiết chiều, chu kỳ ${payload.cycleWeeks} tuần)`,
      afterJson: saved,
    })

    revalidateTimetablePaths()
    return { success: true as const, configId: saved.id }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function saveTimetableRoomAction(payload: {
  id?: string
  campusId: string
  roomCode: string
  roomName: string
  roomType: string
  capacity: number
  allowedSubjectIds: string[]
  effectiveFrom?: string | null
  effectiveTo?: string | null
  notes?: string | null
}) {
  try {
    await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_CONFIG",
      campusIds: [payload.campusId],
    })
    await ensureTimetableSchema()

    const code = payload.roomCode.trim().toUpperCase()
    if (!code || !payload.roomName.trim()) {
      return { success: false as const, error: "Mã phòng và tên phòng không được để trống." }
    }

    const room = payload.id
      ? await prisma.timetableRoom.update({
          where: { id: payload.id },
          data: {
            roomCode: code,
            roomName: payload.roomName.trim(),
            roomType: payload.roomType || "CLASSROOM",
            capacity: Number(payload.capacity || 35),
            allowedSubjectIdsJson: JSON.stringify(payload.allowedSubjectIds || []),
            effectiveFrom: payload.effectiveFrom || null,
            effectiveTo: payload.effectiveTo || null,
            notes: payload.notes || null,
          },
        })
      : await prisma.timetableRoom.upsert({
          where: {
            campusId_roomCode: {
              campusId: payload.campusId,
              roomCode: code,
            },
          },
          update: {
            roomName: payload.roomName.trim(),
            roomType: payload.roomType || "CLASSROOM",
            capacity: Number(payload.capacity || 35),
            allowedSubjectIdsJson: JSON.stringify(payload.allowedSubjectIds || []),
            effectiveFrom: payload.effectiveFrom || null,
            effectiveTo: payload.effectiveTo || null,
            notes: payload.notes || null,
            status: "ACTIVE",
          },
          create: {
            campusId: payload.campusId,
            roomCode: code,
            roomName: payload.roomName.trim(),
            roomType: payload.roomType || "CLASSROOM",
            capacity: Number(payload.capacity || 35),
            allowedSubjectIdsJson: JSON.stringify(payload.allowedSubjectIds || []),
            effectiveFrom: payload.effectiveFrom || null,
            effectiveTo: payload.effectiveTo || null,
            notes: payload.notes || null,
            status: "ACTIVE",
          },
        })

    revalidateTimetablePaths()
    return { success: true as const, room }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function deleteTimetableRoomAction(roomId: string) {
  try {
    const authCtx = await requireTimetablePermission("canDelete", {
      subModuleCode: "TIMETABLE_CONFIG",
    })
    await ensureTimetableSchema()
    const room = await prisma.timetableRoom.findUnique({ where: { id: roomId } })
    if (!room) return { success: false as const, error: "Không tìm thấy phòng học." }
    assertCampusAllowed(authCtx, room.campusId)

    await prisma.timetableRoom.update({
      where: { id: roomId },
      data: { status: "INACTIVE" },
    })
    revalidateTimetablePaths()
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function saveTimetableBusySlotAction(payload: {
  academicYearId: string
  semester: number
  campusId: string
  targetType: "TEACHER" | "ROOM" | "CLASS"
  targetId: string
  dayOfWeek: DayOfWeekCode
  session: "MORNING" | "AFTERNOON"
  periodNumber: number
  weekType?: "ALL" | "EVEN" | "ODD"
  reason?: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_CONFIG",
      campusIds: [payload.campusId],
    })
    await ensureTimetableSchema()

    const created = await prisma.timetableBusySlot.create({
      data: {
        academicYearId: payload.academicYearId,
        semester: payload.semester,
        campusId: payload.campusId,
        targetType: payload.targetType,
        targetId: payload.targetId,
        dayOfWeek: payload.dayOfWeek,
        session: payload.session,
        periodNumber: Number(payload.periodNumber),
        weekType: payload.weekType || "ALL",
        reason: payload.reason || null,
        effectiveFrom: payload.effectiveFrom || null,
        effectiveTo: payload.effectiveTo || null,
        createdById: authCtx.actorId,
      },
    })
    revalidateTimetablePaths()
    return { success: true as const, busySlot: created }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function deleteTimetableBusySlotAction(busySlotId: string) {
  try {
    const authCtx = await requireTimetablePermission("canDelete", {
      subModuleCode: "TIMETABLE_CONFIG",
    })
    await ensureTimetableSchema()
    const row = await prisma.timetableBusySlot.findUnique({ where: { id: busySlotId } })
    if (!row) return { success: false as const, error: "Không tìm thấy lịch bận." }
    if (row.campusId) assertCampusAllowed(authCtx, row.campusId)

    await prisma.timetableBusySlot.delete({ where: { id: busySlotId } })
    revalidateTimetablePaths()
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function saveTimetableTravelRuleAction(payload: {
  academicYearId: string
  fromCampusId: string
  toCampusId: string
  minTravelMinutes: number
  allowSameSession: boolean
  allowSameDay: boolean
  notes?: string
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_CONFIG",
      campusIds: [payload.fromCampusId],
    })
    await ensureTimetableSchema()

    if (payload.fromCampusId === payload.toCampusId) {
      return { success: false as const, error: "Cơ sở đi và cơ sở đến phải khác nhau." }
    }

    const rule = await prisma.timetableTravelRule.upsert({
      where: {
        academicYearId_fromCampusId_toCampusId: {
          academicYearId: payload.academicYearId,
          fromCampusId: payload.fromCampusId,
          toCampusId: payload.toCampusId,
        },
      },
      update: {
        minTravelMinutes: Math.max(0, Number(payload.minTravelMinutes || 40)),
        allowSameSession: Boolean(payload.allowSameSession),
        allowSameDay: Boolean(payload.allowSameDay),
        notes: payload.notes || null,
        updatedById: authCtx.actorId,
      },
      create: {
        academicYearId: payload.academicYearId,
        fromCampusId: payload.fromCampusId,
        toCampusId: payload.toCampusId,
        minTravelMinutes: Math.max(0, Number(payload.minTravelMinutes || 40)),
        allowSameSession: Boolean(payload.allowSameSession),
        allowSameDay: Boolean(payload.allowSameDay),
        notes: payload.notes || null,
        updatedById: authCtx.actorId,
      },
    })

    revalidateTimetablePaths()
    return { success: true as const, rule }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function deleteTimetableTravelRuleAction(ruleId: string) {
  try {
    const authCtx = await requireTimetablePermission("canDelete", {
      subModuleCode: "TIMETABLE_CONFIG",
    })
    await ensureTimetableSchema()
    const row = await prisma.timetableTravelRule.findUnique({ where: { id: ruleId } })
    if (!row) return { success: false as const, error: "Không tìm thấy quy tắc di chuyển." }
    assertCampusAllowed(authCtx, row.fromCampusId)

    await prisma.timetableTravelRule.delete({ where: { id: ruleId } })
    revalidateTimetablePaths()
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// 3. ĐỊNH MỨC & PHÂN CÔNG (/admin/thoi-khoa-bieu/phan-cong)
// ============================================================================
export async function getTimetableQuotaPageAction(filters: TimetableFilterParams = {}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_QUOTA",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      includeLienCapLookup: false,
    })

    const targetClasses =
      ws.selectedClassId !== "ALL"
        ? ws.inScopeClasses.filter((c) => c.id === ws.selectedClassId)
        : ws.inScopeClasses

    const classIds = targetClasses.map((c) => c.id)

    const [subjectQuotas, teachingAssignments, ctqtAssignments, versionSlots] = await Promise.all([
      prisma.subjectQuota.findMany({
        where: { academicYearId: ws.selectedYearId },
      }),
      classIds.length > 0
        ? prisma.teachingAssignment.findMany({
            where: {
              academicYearId: ws.selectedYearId,
              semester: ws.semester,
              classId: { in: classIds },
            },
          })
        : Promise.resolve([]),
      classIds.length > 0
        ? prisma.ctqtTeachingAssignment
            .findMany({
              where: {
                academicYearId: ws.selectedYearId,
                semester: ws.semester,
                classId: { in: classIds },
                status: "ACTIVE",
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      ws.selectedVersion && classIds.length > 0
        ? prisma.timetableSlot.findMany({
            where: {
              versionId: ws.selectedVersion.id,
              classId: { in: classIds },
              status: "ACTIVE",
            },
          })
        : Promise.resolve([]),
    ])

    const mappedSlots = versionSlots.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    const items = reconcileQuotasAndAssignments({
      classes: targetClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      scheduledSlots: mappedSlots,
      cycleWeeks: ws.config.cycleWeeks,
    })

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      cycleWeeks: ws.config.cycleWeeks,
      items,
      subjects: ws.subjects.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName,
      })),
      teachers: ws.teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        departmentName: t.departmentRel?.name || "",
      })),
    }
  } catch (err) {
    return formatActionError(err)
  }
}

/**
 * Saves grade-accurate weekly quota directly into SubjectQuota (`quotaG1`..`quotaG12`)
 * under the real studyProgram ("Hệ S", "Hệ S Quốc tế", "Hệ Song Bằng", "DEFAULT").
 */
export async function updateSubjectGradeQuotaAction(payload: {
  academicYearId: string
  campusId: string
  subjectId: string
  studyProgram: string
  grade: string
  weeklyQuota: number
}) {
  try {
    await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_QUOTA",
      campusIds: [payload.campusId],
    })

    const gradeNum = extractGradeNumber(payload.grade)
    if (!gradeNum || gradeNum < 1 || gradeNum > 12) {
      return { success: false as const, error: `Mã khối "${payload.grade}" không hợp lệ (K1–K12).` }
    }

    const qVal = Math.max(0, Number(payload.weeklyQuota || 0))
    const gradeField = `quotaG${gradeNum}`
    const studyProgram = payload.studyProgram || "DEFAULT"

    await prisma.subjectQuota.upsert({
      where: {
        subjectId_academicYearId_studyProgram: {
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          studyProgram,
        },
      },
      update: {
        [gradeField]: qVal,
      },
      create: {
        subjectId: payload.subjectId,
        academicYearId: payload.academicYearId,
        studyProgram,
        [gradeField]: qVal,
      },
    })

    revalidateTimetablePaths()
    revalidatePath("/admin/subjects")
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

/**
 * Updates or creates a TeachingAssignment directly in the single canonical `TeachingAssignment` table,
 * strictly scoped to `(academicYearId, semester)` and verified against class scope.
 */
export async function assignTeacherToClassSubjectAction(payload: {
  academicYearId: string
  semester: number
  campusId: string
  scopeGroup: ManageableScopeGroup
  classId: string
  subjectId: string
  teacherId: string
}) {
  try {
    await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_QUOTA",
      campusIds: [payload.campusId],
      scopeGroup: payload.scopeGroup,
    })

    await verifyClassesBelongToScope({
      classIds: [payload.classId],
      academicYearId: payload.academicYearId,
      campusId: payload.campusId,
      scopeGroup: payload.scopeGroup,
    })

    const semester = payload.semester === 2 ? 2 : 1

    await prisma.$transaction(async (tx) => {
      const existing = await tx.teachingAssignment.findMany({
        where: {
          classId: payload.classId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          semester,
        },
        orderBy: { id: "asc" },
      })

      if (!payload.teacherId) {
        if (existing.length > 0) {
          await tx.teachingAssignment.delete({ where: { id: existing[0].id } })
        }
        return
      }

      if (existing.length > 0) {
        await tx.teachingAssignment.update({
          where: { id: existing[0].id },
          data: { teacherId: payload.teacherId },
        })
      } else {
        await tx.teachingAssignment.create({
          data: {
            classId: payload.classId,
            subjectId: payload.subjectId,
            teacherId: payload.teacherId,
            academicYearId: payload.academicYearId,
            semester,
          },
        })
      }
    })

    revalidateTimetablePaths()
    revalidatePath("/admin/teaching-assignments")
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// 4. XẾP THỜI KHÓA BIỂU (/admin/thoi-khoa-bieu/xep-lich)
// ============================================================================
export async function getTimetableSchedulerPageAction(filters: TimetableFilterParams = {}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_SCHEDULE",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      includeLienCapLookup: false,
      loadExternalActiveSlots: true,
    })

    const classIds = ws.inScopeClasses.map((c) => c.id)

    const [subjectQuotas, teachingAssignments, ctqtAssignments, versionSlotsRaw] = await Promise.all([
      prisma.subjectQuota.findMany({ where: { academicYearId: ws.selectedYearId } }),
      classIds.length > 0
        ? prisma.teachingAssignment.findMany({
            where: {
              academicYearId: ws.selectedYearId,
              semester: ws.semester,
              classId: { in: classIds },
            },
          })
        : Promise.resolve([]),
      classIds.length > 0
        ? prisma.ctqtTeachingAssignment
            .findMany({
              where: {
                academicYearId: ws.selectedYearId,
                semester: ws.semester,
                classId: { in: classIds },
                status: "ACTIVE",
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      ws.selectedVersion && classIds.length > 0
        ? prisma.timetableSlot.findMany({
            where: {
              versionId: ws.selectedVersion.id,
              classId: { in: classIds },
              status: "ACTIVE",
            },
          })
        : Promise.resolve([]),
    ])

    const slots = versionSlotsRaw.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    const quotaItems = reconcileQuotasAndAssignments({
      classes: ws.inScopeClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      scheduledSlots: slots,
      cycleWeeks: ws.config.cycleWeeks,
    })

    const teachersById = new Map(ws.teachers.map((t) => [t.id, t]))
    const validationReport = validateTimetable({
      slots,
      config: ws.config,
      campusId: ws.selectedCampusId,
      campusName: formatCampusDisplayName(ws.selectedCampusObj),
      classes: ws.inScopeClasses,
      teachersById,
      quotaItems,
      rooms: ws.rooms,
      busySlots: ws.busySlots,
      travelRules: ws.travelRules,
      externalActiveSlots: ws.externalActiveSlots,
    })

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      config: ws.config,
      selectedVersion: ws.selectedVersion
        ? {
            id: ws.selectedVersion.id,
            code: ws.selectedVersion.code,
            name: ws.selectedVersion.name,
            status: ws.selectedVersion.status,
            revision: ws.selectedVersion.revision,
            baseVersionId: ws.selectedVersion.baseVersionId,
            effectiveFrom: ws.selectedVersion.effectiveFrom,
            effectiveTo: ws.selectedVersion.effectiveTo,
            reviewComment: ws.selectedVersion.reviewComment,
          }
        : null,
      slots,
      quotaItems,
      validationReport,
      subjects: ws.subjects.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName,
      })),
      teachers: ws.teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
      })),
      rooms: ws.rooms,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function createTimetableVersionAction(payload: {
  academicYearId: string
  semester: number
  campusId: string
  scopeGroup: ManageableScopeGroup
  name: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  cloneFromVersionId?: string | null
  notes?: string | null
}) {
  try {
    const authCtx = await requireTimetablePermission("canCreate", {
      subModuleCode: "TIMETABLE_SCHEDULE",
      campusIds: [payload.campusId],
      scopeGroup: payload.scopeGroup,
    })
    await ensureTimetableSchema()

    if (!payload.name.trim()) {
      return { success: false as const, error: "Tên phiên bản / phương án không được để trống." }
    }

    const existingVersions = await prisma.timetableVersion.findMany({
      where: {
        academicYearId: payload.academicYearId,
        semester: payload.semester,
        campusId: payload.campusId,
        scopeGroup: payload.scopeGroup,
      },
      orderBy: { versionNumber: "desc" },
    })

    const nextVerNum = (existingVersions[0]?.versionNumber || 0) + 1
    const campus = await prisma.campus.findUnique({ where: { id: payload.campusId } })
    const campusTag = (campus?.campusCode || campus?.campusName || "CS").replace(/\s+/g, "")
    const code = `TKB-${campusTag}-${payload.scopeGroup}-HK${payload.semester}-V${nextVerNum}-${Date.now()
      .toString(36)
      .slice(-4)
      .toUpperCase()}`

    const created = await prisma.$transaction(async (tx) => {
      const ver = await tx.timetableVersion.create({
        data: {
          code,
          name: payload.name.trim(),
          academicYearId: payload.academicYearId,
          semester: payload.semester,
          scopeGroup: payload.scopeGroup,
          campusId: payload.campusId,
          levelCode: "ALL",
          versionNumber: nextVerNum,
          status: "DRAFT",
          effectiveFrom: payload.effectiveFrom || null,
          effectiveTo: payload.effectiveTo || null,
          baseVersionId: payload.cloneFromVersionId || null,
          notes: payload.notes || null,
          createdById: authCtx.actorId,
          createdByName: authCtx.actorName,
        },
      })

      if (payload.cloneFromVersionId) {
        const sourceVer = await tx.timetableVersion.findUnique({
          where: { id: payload.cloneFromVersionId },
        })
        if (sourceVer && sourceVer.campusId === payload.campusId) {
          const sourceSlots = await tx.timetableSlot.findMany({
            where: { versionId: sourceVer.id, status: "ACTIVE" },
          })
          if (sourceSlots.length > 0) {
            await tx.timetableSlot.createMany({
              data: sourceSlots.map((s) => ({
                versionId: ver.id,
                academicYearId: ver.academicYearId,
                semester: ver.semester,
                campusId: ver.campusId,
                level: s.level,
                grade: s.grade,
                classId: s.classId,
                className: s.className,
                dayOfWeek: s.dayOfWeek,
                session: s.session,
                periodNumber: s.periodNumber,
                subjectId: s.subjectId,
                subjectName: s.subjectName,
                teacherId: s.teacherId,
                teacherName: s.teacherName,
                roomId: s.roomId,
                roomCode: s.roomCode,
                roomName: s.roomName,
                coTeacherId: s.coTeacherId,
                coTeacherCode: s.coTeacherCode,
                coTeacherName: s.coTeacherName,
                assistantTeacherId: s.assistantTeacherId,
                assistantTeacherCode: s.assistantTeacherCode,
                assistantTeacherName: s.assistantTeacherName,
                weekType: s.weekType,
                altSubjectId: s.altSubjectId,
                altSubjectName: s.altSubjectName,
                altTeacherId: s.altTeacherId,
                altTeacherCode: s.altTeacherCode,
                altTeacherName: s.altTeacherName,
                altRoomId: s.altRoomId,
                altRoomName: s.altRoomName,
                isLocked: s.isLocked,
                blockGroupId: s.blockGroupId,
                colorCode: s.colorCode,
                notes: s.notes,
                updatedById: authCtx.actorId,
              })),
            })
          }
        }
      }

      return ver
    })

    await appendAuditLog({
      versionId: created.id,
      campusId: payload.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: "CREATE_DRAFT",
      summary: `Tạo bản nháp "${created.name}" (${created.code})${payload.cloneFromVersionId ? " sao chép từ phiên bản nền" : ""}`,
    })

    revalidateTimetablePaths()
    return { success: true as const, version: created }
  } catch (err) {
    return formatActionError(err)
  }
}

/**
 * Atomic batch save of slots for a DRAFT version with:
 * - Server-side class scope verification (blocks cross-campus/cross-scope writes)
 * - Optimistic concurrency check on `expectedRevision` (prevents 2 users overwriting each other)
 * - Prefetch ID/code normalization + batch insert inside `prisma.$transaction`
 */
export async function saveDraftSlotsBatchAction(payload: {
  versionId: string
  expectedRevision: number
  scopedClassIds: string[]
  slots: SlotRecord[]
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_SCHEDULE",
    })
    await ensureTimetableSchema()

    const version = await verifyEditableVersion(authCtx, payload.versionId, payload.expectedRevision)
    const scopeGroup = version.scopeGroup as ManageableScopeGroup

    const allTargetClassIds = Array.from(
      new Set([...payload.scopedClassIds, ...payload.slots.map((s) => s.classId)].filter(Boolean))
    )

    const verifiedClassesMap = await verifyClassesBelongToScope({
      classIds: allTargetClassIds,
      academicYearId: version.academicYearId,
      campusId: version.campusId,
      scopeGroup,
    })

    // Prefetch subjects, teachers, rooms once (0 N+1 queries)
    const [subjects, teachers, rooms] = await Promise.all([
      prisma.subject.findMany({ select: { id: true, subjectCode: true, subjectName: true } }),
      prisma.teacher.findMany({ select: { id: true, teacherCode: true, teacherName: true } }),
      prisma.timetableRoom.findMany({
        where: { campusId: version.campusId, status: "ACTIVE" },
        select: { id: true, roomCode: true, roomName: true },
      }),
    ])

    const subjectById = new Map(subjects.map((s) => [s.id, s]))
    const teacherById = new Map(teachers.map((t) => [t.id, t]))
    const roomById = new Map(rooms.map((r) => [r.id, r]))

    const normalizedRows = payload.slots
      .filter((s) => s.classId && (s.subjectId || s.subjectName || s.teacherId))
      .map((s) => {
        const cls = verifiedClassesMap.get(s.classId)!
        const sub = s.subjectId ? subjectById.get(s.subjectId) : undefined
        const tPrimary = s.teacherId ? teacherById.get(s.teacherId) : undefined
        const tCo = s.coTeacherId ? teacherById.get(s.coTeacherId) : undefined
        const tAss = s.assistantTeacherId ? teacherById.get(s.assistantTeacherId) : undefined
        const tAlt = s.altTeacherId ? teacherById.get(s.altTeacherId) : undefined
        const rm = s.roomId ? roomById.get(s.roomId) : undefined

        return {
          versionId: version.id,
          academicYearId: version.academicYearId,
          semester: version.semester,
          campusId: version.campusId,
          level: cls.level,
          grade: cls.grade,
          classId: cls.id,
          className: cls.className,
          dayOfWeek: s.dayOfWeek,
          session: s.session || "MORNING",
          periodNumber: Number(s.periodNumber || 1),
          subjectId: sub?.id || s.subjectId || null,
          subjectName: sub?.subjectName || s.subjectName || null,
          teacherId: tPrimary?.id || s.teacherId || null,
          teacherName: tPrimary?.teacherName || s.teacherName || null,
          roomId: rm?.id || s.roomId || null,
          roomCode: rm?.roomCode || s.roomCode || null,
          roomName: rm?.roomName || s.roomName || null,
          coTeacherId: tCo?.id || s.coTeacherId || null,
          coTeacherCode: tCo?.teacherCode || s.coTeacherCode || null,
          coTeacherName: tCo?.teacherName || s.coTeacherName || null,
          assistantTeacherId: tAss?.id || s.assistantTeacherId || null,
          assistantTeacherCode: tAss?.teacherCode || s.assistantTeacherCode || null,
          assistantTeacherName: tAss?.teacherName || s.assistantTeacherName || null,
          weekType: s.weekType || "ALL",
          altSubjectId: s.altSubjectId || null,
          altSubjectName: s.altSubjectName || null,
          altTeacherId: tAlt?.id || s.altTeacherId || null,
          altTeacherCode: tAlt?.teacherCode || s.altTeacherCode || null,
          altTeacherName: tAlt?.teacherName || s.altTeacherName || null,
          altRoomId: s.altRoomId || null,
          altRoomName: s.altRoomName || null,
          isLocked: Boolean(s.isLocked),
          blockGroupId: s.blockGroupId || null,
          colorCode: s.colorCode || "#F0FDFA",
          notes: s.notes || null,
          updatedById: authCtx.actorId,
        }
      })

    const txResult = await prisma.$transaction(async (tx) => {
      const bumped = await tx.timetableVersion.updateMany({
        where: {
          id: version.id,
          status: "DRAFT",
          revision: payload.expectedRevision,
        },
        data: {
          revision: { increment: 1 },
          updatedAt: new Date(),
        },
      })

      if (bumped.count === 0) {
        throw new TimetableAccessError(
          "Dữ liệu bản nháp vừa được cập nhật bởi người dùng khác. Vui lòng tải lại để tránh ghi đè.",
          "CONFLICT"
        )
      }

      if (allTargetClassIds.length > 0) {
        await tx.timetableSlot.deleteMany({
          where: {
            versionId: version.id,
            classId: { in: allTargetClassIds },
          },
        })
      }

      if (normalizedRows.length > 0) {
        await tx.timetableSlot.createMany({
          data: normalizedRows,
        })
      }

      const updatedVer = await tx.timetableVersion.findUnique({ where: { id: version.id } })
      return { newRevision: updatedVer?.revision || payload.expectedRevision + 1 }
    })

    await appendAuditLog({
      versionId: version.id,
      campusId: version.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: "BATCH_SAVE_SLOTS",
      summary: `Lưu ${normalizedRows.length} tiết trên ${allTargetClassIds.length} lớp (revision -> ${txResult.newRevision})`,
    })

    revalidateTimetablePaths()
    return {
      success: true as const,
      savedCount: normalizedRows.length,
      newRevision: txResult.newRevision,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

/**
 * Safe "Xóa dữ liệu bản nháp" — replaces destructive global Reset.
 * Strictly blocked on APPROVED / PUBLISHED / PENDING_APPROVAL versions.
 */
export async function clearDraftVersionSlotsAction(payload: {
  versionId: string
  expectedRevision: number
  keepLockedSlots: boolean
  scopedClassIds?: string[]
  confirmVersionCode: string
}) {
  try {
    const authCtx = await requireTimetablePermission("canDelete", {
      subModuleCode: "TIMETABLE_SCHEDULE",
    })
    await ensureTimetableSchema()

    const version = await verifyEditableVersion(authCtx, payload.versionId, payload.expectedRevision)

    if (payload.confirmVersionCode.trim() !== version.code) {
      return {
        success: false as const,
        error: `Mã xác nhận không khớp với mã bản nháp "${version.code}".`,
      }
    }

    if (payload.scopedClassIds && payload.scopedClassIds.length > 0) {
      await verifyClassesBelongToScope({
        classIds: payload.scopedClassIds,
        academicYearId: version.academicYearId,
        campusId: version.campusId,
        scopeGroup: version.scopeGroup as ManageableScopeGroup,
      })
    }

    const res = await prisma.$transaction(async (tx) => {
      const bumped = await tx.timetableVersion.updateMany({
        where: {
          id: version.id,
          status: "DRAFT",
          revision: payload.expectedRevision,
        },
        data: { revision: { increment: 1 }, updatedAt: new Date() },
      })
      if (bumped.count === 0) {
        throw new TimetableAccessError(
          "Bản nháp đã thay đổi phiên bản sửa đổi. Vui lòng tải lại trang.",
          "CONFLICT"
        )
      }

      const del = await tx.timetableSlot.deleteMany({
        where: {
          versionId: version.id,
          ...(payload.keepLockedSlots ? { isLocked: false } : {}),
          ...(payload.scopedClassIds && payload.scopedClassIds.length > 0
            ? { classId: { in: payload.scopedClassIds } }
            : {}),
        },
      })
      const updated = await tx.timetableVersion.findUnique({ where: { id: version.id } })
      return { deletedCount: del.count, newRevision: updated?.revision || version.revision + 1 }
    })

    await appendAuditLog({
      versionId: version.id,
      campusId: version.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: "CLEAR_DRAFT_SLOTS",
      summary: `Xóa ${res.deletedCount} tiết dữ liệu bản nháp ${version.code} (giữ tiết khóa: ${payload.keepLockedSlots ? "Có" : "Không"})`,
    })

    revalidateTimetablePaths()
    return {
      success: true as const,
      deletedCount: res.deletedCount,
      newRevision: res.newRevision,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function runAutoScheduleDraftAction(payload: {
  versionId: string
  expectedRevision: number
  timeLimitMs?: number
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_SCHEDULE",
    })
    await ensureTimetableSchema()

    const version = await verifyEditableVersion(authCtx, payload.versionId, payload.expectedRevision)

    const ws = await loadScopedWorkspaceContext(
      {
        academicYearId: version.academicYearId,
        semester: version.semester,
        scopeGroup: version.scopeGroup as ManageableScopeGroup,
        campusId: version.campusId,
        versionId: version.id,
      },
      authCtx,
      { loadExternalActiveSlots: true }
    )

    const classIds = ws.inScopeClasses.map((c) => c.id)
    const [subjectQuotas, teachingAssignments, ctqtAssignments, currentSlotsRaw] = await Promise.all([
      prisma.subjectQuota.findMany({ where: { academicYearId: version.academicYearId } }),
      prisma.teachingAssignment.findMany({
        where: {
          academicYearId: version.academicYearId,
          semester: version.semester,
          classId: { in: classIds },
        },
      }),
      prisma.ctqtTeachingAssignment
        .findMany({
          where: {
            academicYearId: version.academicYearId,
            semester: version.semester,
            classId: { in: classIds },
            status: "ACTIVE",
          },
        })
        .catch(() => []),
      prisma.timetableSlot.findMany({
        where: { versionId: version.id, status: "ACTIVE" },
      }),
    ])

    const existingSlots = currentSlotsRaw.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    // Reconcile quotas without unlocked slots so auto-scheduler fills exact required quotas
    const lockedOnly = existingSlots.filter((s) => s.isLocked)
    const quotaItems = reconcileQuotasAndAssignments({
      classes: ws.inScopeClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      scheduledSlots: lockedOnly,
      cycleWeeks: ws.config.cycleWeeks,
    })

    const result = runAutoScheduler({
      campusId: version.campusId,
      campusName: formatCampusDisplayName(ws.selectedCampusObj),
      academicYearId: version.academicYearId,
      semester: version.semester,
      versionId: version.id,
      config: ws.config,
      classes: ws.inScopeClasses,
      teachers: ws.teachers,
      quotaItems,
      existingSlots,
      rooms: ws.rooms,
      busySlots: ws.busySlots,
      travelRules: ws.travelRules,
      externalActiveSlots: ws.externalActiveSlots,
      timeLimitMs: payload.timeLimitMs ?? 6000,
    })

    const saveRes = await saveDraftSlotsBatchAction({
      versionId: version.id,
      expectedRevision: payload.expectedRevision,
      scopedClassIds: classIds,
      slots: result.generatedSlots,
    })

    if (!saveRes.success) return saveRes

    return {
      success: true as const,
      newRevision: saveRes.newRevision,
      autoScheduleResult: result,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function downloadTimetableExcelTemplateAction(filters: TimetableFilterParams) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_SCHEDULE",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })
    const ws = await loadScopedWorkspaceContext(filters, authCtx)

    const base64 = buildTimetableImportTemplateBase64({
      config: ws.config,
      classes: ws.inScopeClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      rooms: ws.rooms,
    })

    return {
      success: true as const,
      base64,
      fileName: `Mau_Nhap_TKB_${ws.selectedScopeGroup}_${ws.activeYear?.name || "SSM"}.xlsx`,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function previewTimetableExcelImportAction(payload: {
  versionId: string
  base64Content: string
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_SCHEDULE",
    })
    const version = await verifyEditableVersion(authCtx, payload.versionId)

    const ws = await loadScopedWorkspaceContext(
      {
        academicYearId: version.academicYearId,
        semester: version.semester,
        scopeGroup: version.scopeGroup as ManageableScopeGroup,
        campusId: version.campusId,
        versionId: version.id,
      },
      authCtx,
      { loadExternalActiveSlots: true }
    )

    const classesByName = new Map(
      ws.inScopeClasses.map((c) => [c.className.trim().toUpperCase(), c])
    )
    const subjectsByCodeOrName = new Map<
      string,
      { id: string; subjectCode?: string | null; subjectName: string }
    >()
    for (const s of ws.subjects) {
      if (s.subjectCode) subjectsByCodeOrName.set(s.subjectCode.trim().toUpperCase(), s)
      subjectsByCodeOrName.set(s.subjectName.trim().toUpperCase(), s)
    }
    const teachersByCode = new Map(
      ws.teachers
        .filter((t) => t.teacherCode)
        .map((t) => [t.teacherCode.trim().toUpperCase(), t])
    )
    const roomsByCode = new Map(
      ws.rooms.map((r) => [r.roomCode.trim().toUpperCase(), r])
    )

    const parsed = parseAndReconcileTimetableExcel({
      base64Content: payload.base64Content,
      campusId: version.campusId,
      academicYearId: version.academicYearId,
      semester: version.semester,
      versionId: version.id,
      refs: {
        classesByName,
        subjectsByCodeOrName,
        teachersByCode,
        roomsByCode,
      },
    })

    const teachersById = new Map(ws.teachers.map((t) => [t.id, t]))
    const validationReport = validateTimetable({
      slots: parsed.matchedSlots,
      config: ws.config,
      campusId: version.campusId,
      campusName: formatCampusDisplayName(ws.selectedCampusObj),
      classes: ws.inScopeClasses,
      teachersById,
      rooms: ws.rooms,
      busySlots: ws.busySlots,
      travelRules: ws.travelRules,
      externalActiveSlots: ws.externalActiveSlots,
    })

    return {
      success: true as const,
      parsed,
      validationReport,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function compareVersionWithBaselineAction(payload: {
  versionId: string
  baselineVersionId?: string | null
}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_SCHEDULE",
    })
    await ensureTimetableSchema()

    const version = await prisma.timetableVersion.findUnique({ where: { id: payload.versionId } })
    if (!version) return { success: false as const, error: "Không tìm thấy phiên bản hiện tại." }
    assertCampusAllowed(authCtx, version.campusId)

    let baseId = payload.baselineVersionId || version.baseVersionId || null
    if (!baseId) {
      const latestPublished = await prisma.timetableVersion.findFirst({
        where: {
          academicYearId: version.academicYearId,
          semester: version.semester,
          campusId: version.campusId,
          scopeGroup: version.scopeGroup,
          status: "PUBLISHED",
          id: { not: version.id },
        },
        orderBy: { versionNumber: "desc" },
      })
      baseId = latestPublished?.id || null
    }

    if (!baseId) {
      return {
        success: true as const,
        baselineName: null,
        diffs: [] as SlotDiffItem[],
      }
    }

    const [baseVer, curSlots, baseSlots] = await Promise.all([
      prisma.timetableVersion.findUnique({ where: { id: baseId } }),
      prisma.timetableSlot.findMany({ where: { versionId: version.id, status: "ACTIVE" } }),
      prisma.timetableSlot.findMany({ where: { versionId: baseId, status: "ACTIVE" } }),
    ])

    const summarize = (s: any) =>
      `${s.subjectName || "—"} (${s.teacherName || "Chưa gán GV"}${s.roomName ? ` • ${s.roomName}` : ""}${s.weekType && s.weekType !== "ALL" ? ` • ${s.weekType}` : ""})`

    const curMap = new Map<string, any>()
    for (const s of curSlots) {
      curMap.set(`${s.classId}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`, s)
    }
    const baseMap = new Map<string, any>()
    for (const s of baseSlots) {
      baseMap.set(`${s.classId}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`, s)
    }

    const allKeys = new Set([...curMap.keys(), ...baseMap.keys()])
    const diffs: SlotDiffItem[] = []

    for (const key of allKeys) {
      const c = curMap.get(key)
      const b = baseMap.get(key)
      if (c && !b) {
        diffs.push({
          cellKey: key,
          classId: c.classId || "",
          className: c.className,
          dayOfWeek: c.dayOfWeek,
          session: c.session,
          periodNumber: c.periodNumber,
          changeType: "ADDED",
          beforeSummary: "Trống",
          afterSummary: summarize(c),
        })
      } else if (!c && b) {
        diffs.push({
          cellKey: key,
          classId: b.classId || "",
          className: b.className,
          dayOfWeek: b.dayOfWeek,
          session: b.session,
          periodNumber: b.periodNumber,
          changeType: "REMOVED",
          beforeSummary: summarize(b),
          afterSummary: "Trống",
        })
      } else if (c && b) {
        const changed =
          c.subjectId !== b.subjectId ||
          c.teacherId !== b.teacherId ||
          c.roomId !== b.roomId ||
          c.weekType !== b.weekType ||
          c.coTeacherId !== b.coTeacherId
        if (changed) {
          diffs.push({
            cellKey: key,
            classId: c.classId || "",
            className: c.className,
            dayOfWeek: c.dayOfWeek,
            session: c.session,
            periodNumber: c.periodNumber,
            changeType: "MODIFIED",
            beforeSummary: summarize(b),
            afterSummary: summarize(c),
          })
        }
      }
    }

    return {
      success: true as const,
      baselineName: baseVer ? `${baseVer.name} (${baseVer.code})` : baseId,
      diffs,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// 5. TRA CỨU THỜI KHÓA BIỂU (/admin/thoi-khoa-bieu/tra-cuu)
// ============================================================================
export async function getTimetableLookupAction(
  filters: TimetableFilterParams & {
    lookupTab?: "BY_CLASS" | "BY_TEACHER" | "BY_ROOM" | "MATRIX"
    teacherId?: string
    roomId?: string
  } = {}
) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_LOOKUP",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
      allowLienCap: true,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      includeLienCapLookup: true,
    })

    const refDate = (filters.viewedWeekDate || new Date().toISOString()).slice(0, 10)
    const parity = resolveWeekParity(refDate, ws.config.cycleAnchorDate, ws.config.cycleWeeks)

    const classIds = ws.inScopeClasses.map((c) => c.id)

    let targetVersionIds: string[] = []
    if (ws.selectedScopeGroup === "LIEN_CAP") {
      // Aggregate all PUBLISHED versions (or selected status) across scopes on this campus
      const campusPubVersions = ws.versions.filter((v) => v.status === "PUBLISHED")
      targetVersionIds =
        campusPubVersions.length > 0
          ? campusPubVersions.map((v) => v.id)
          : ws.versions.map((v) => v.id)
    } else if (ws.selectedVersion) {
      targetVersionIds = [ws.selectedVersion.id]
    }

    const slotsRaw =
      targetVersionIds.length > 0 && classIds.length > 0
        ? await prisma.timetableSlot.findMany({
            where: {
              versionId: { in: targetVersionIds },
              classId: { in: classIds },
              status: "ACTIVE",
              ...(filters.classId && filters.classId !== "ALL"
                ? { classId: filters.classId }
                : {}),
              ...(filters.teacherId && filters.teacherId !== "ALL"
                ? {
                    OR: [
                      { teacherId: filters.teacherId },
                      { coTeacherId: filters.teacherId },
                      { assistantTeacherId: filters.teacherId },
                      { altTeacherId: filters.teacherId },
                    ],
                  }
                : {}),
              ...(filters.roomId && filters.roomId !== "ALL"
                ? { roomId: filters.roomId }
                : {}),
            },
          })
        : []

    const slots = slotsRaw.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    // If looking up a specific teacher, also fetch their cross-campus effective schedule
    let crossCampusTeacherSchedule: Awaited<ReturnType<typeof getEffectiveTeacherWeekSchedule>> | null =
      null
    if (filters.lookupTab === "BY_TEACHER" && filters.teacherId && filters.teacherId !== "ALL") {
      crossCampusTeacherSchedule = await getEffectiveTeacherWeekSchedule({
        teacherId: filters.teacherId,
        referenceDateIso: refDate,
        academicYearId: ws.selectedYearId,
        semester: ws.semester,
      })
    }

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      config: ws.config,
      viewedWeekDate: refDate,
      weekParity: parity,
      slots,
      crossCampusTeacherSchedule,
      teachers: ws.teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
      })),
      rooms: ws.rooms,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function exportTimetableLookupExcelAction(
  filters: TimetableFilterParams & {
    lookupTab?: "BY_CLASS" | "BY_TEACHER" | "BY_ROOM" | "MATRIX"
    teacherId?: string
    roomId?: string
  }
) {
  const res = await getTimetableLookupAction(filters)
  if (!res.success) return res

  const rows = res.slots.map((s) => ({
    Lớp: s.className,
    Khối: s.grade,
    Thứ: SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek,
    Buổi: s.session === "MORNING" ? "Sáng" : "Chiều",
    Tiết: s.periodNumber,
    "Môn học": s.subjectName || "",
    "Mã GV chính": s.teacherCode || "",
    "Giáo viên chính": s.teacherName || "",
    "Đồng giảng": s.coTeacherName || "",
    "Trợ giảng": s.assistantTeacherName || "",
    Phòng: s.roomName || s.roomCode || "",
    Tuần: s.weekType === "EVEN" ? "Tuần chẵn" : s.weekType === "ODD" ? "Tuần lẻ" : "Hàng tuần",
  }))

  const base64 = exportLookupScheduleToExcelBase64({
    title: "TraCuu_TKB",
    rows,
  })

  return {
    success: true as const,
    base64,
    fileName: `Tra_Cuu_TKB_${res.viewedWeekDate}.xlsx`,
  }
}

// ============================================================================
// 6. ĐIỀU CHỈNH & DẠY THAY (/admin/thoi-khoa-bieu/dieu-chinh)
// ============================================================================
export async function getTimetableAdjustmentsPageAction(
  filters: TimetableFilterParams & { targetDate?: string } = {}
) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_ADJUST",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx)
    const targetDate = (filters.targetDate || new Date().toISOString()).slice(0, 10)
    const dayCode = dateIsoToDayOfWeek(targetDate)

    const publishedVer =
      ws.versions.find((v) => v.status === "PUBLISHED") || ws.selectedVersion || null

    const classIds = ws.inScopeClasses.map((c) => c.id)

    const [dayBaseSlotsRaw, substitutions] = await Promise.all([
      publishedVer && dayCode && dayCode !== "SUNDAY" && classIds.length > 0
        ? prisma.timetableSlot.findMany({
            where: {
              versionId: publishedVer.id,
              classId: { in: classIds },
              dayOfWeek: dayCode,
              status: "ACTIVE",
            },
            orderBy: [{ className: "asc" }, { session: "asc" }, { periodNumber: "asc" }],
          })
        : Promise.resolve([]),
      ws.selectedCampusId
        ? prisma.timetableSubstitution.findMany({
            where: {
              academicYearId: ws.selectedYearId,
              semester: ws.semester,
              campusId: ws.selectedCampusId,
              ...(classIds.length > 0 ? { classId: { in: classIds } } : {}),
            },
            orderBy: [{ targetDate: "desc" }, { createdAt: "desc" }],
            take: 100,
          })
        : Promise.resolve([]),
    ])

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      targetDate,
      dayOfWeek: dayCode,
      baseVersion: publishedVer
        ? { id: publishedVer.id, code: publishedVer.code, name: publishedVer.name, status: publishedVer.status }
        : null,
      dayBaseSlots: dayBaseSlotsRaw.map((s) =>
        mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
      ),
      substitutions: substitutions.map((sub) => ({
        id: sub.id,
        targetDate: sub.targetDate,
        actionType: sub.actionType,
        classId: sub.classId,
        className: sub.className,
        dayOfWeek: sub.dayOfWeek,
        session: sub.session,
        periodNumber: sub.periodNumber,
        originalSubjectName: sub.originalSubjectName,
        originalTeacherCode: sub.originalTeacherCode,
        originalTeacherName: sub.originalTeacherName,
        originalRoomName: sub.originalRoomName,
        newSubjectName: sub.newSubjectName,
        substituteTeacherCode: sub.substituteTeacherCode,
        substituteTeacherName: sub.substituteTeacherName,
        newRoomName: sub.newRoomName,
        beforeSnapshotJson: sub.beforeSnapshotJson,
        afterSnapshotJson: sub.afterSnapshotJson,
        reason: sub.reason,
        status: sub.status,
        createdByName: sub.createdByName,
        createdAt: sub.createdAt.toISOString(),
      })),
      teachers: ws.teachers.map((t) => ({
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
      })),
      subjects: ws.subjects.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode || "",
        subjectName: s.subjectName,
      })),
      rooms: ws.rooms,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function createTimetableSubstitutionAction(payload: {
  academicYearId: string
  semester: number
  campusId: string
  scopeGroup: ManageableScopeGroup
  versionId?: string | null
  slotId?: string | null
  targetDate: string
  actionType: SubstitutionActionType
  classId: string
  session: "MORNING" | "AFTERNOON"
  periodNumber: number
  substituteTeacherId?: string | null
  newSubjectId?: string | null
  newRoomId?: string | null
  reason: string
}) {
  try {
    const authCtx = await requireTimetablePermission("canCreate", {
      subModuleCode: "TIMETABLE_ADJUST",
      campusIds: [payload.campusId],
      scopeGroup: payload.scopeGroup,
    })
    await ensureTimetableSchema()

    if (!payload.reason || !payload.reason.trim()) {
      return { success: false as const, error: "Vui lòng nhập lý do điều chỉnh / dạy thay." }
    }

    const verifiedClasses = await verifyClassesBelongToScope({
      classIds: [payload.classId],
      academicYearId: payload.academicYearId,
      campusId: payload.campusId,
      scopeGroup: payload.scopeGroup,
    })
    const cls = verifiedClasses.get(payload.classId)!

    const targetDate = payload.targetDate.slice(0, 10)
    const dayCode = dateIsoToDayOfWeek(targetDate)
    if (!dayCode || dayCode === "SUNDAY") {
      return { success: false as const, error: "Ngày áp dụng rơi vào Chủ Nhật hoặc không hợp lệ." }
    }

    const baseSlot = payload.slotId
      ? await prisma.timetableSlot.findUnique({ where: { id: payload.slotId } })
      : await prisma.timetableSlot.findFirst({
          where: {
            ...(payload.versionId ? { versionId: payload.versionId } : {}),
            classId: payload.classId,
            dayOfWeek: dayCode,
            session: payload.session,
            periodNumber: payload.periodNumber,
            status: "ACTIVE",
          },
        })

    const [origTeacher, subTeacher, newSubject, newRoom] = await Promise.all([
      baseSlot?.teacherId
        ? prisma.teacher.findUnique({ where: { id: baseSlot.teacherId } })
        : Promise.resolve(null),
      payload.substituteTeacherId
        ? prisma.teacher.findUnique({ where: { id: payload.substituteTeacherId } })
        : Promise.resolve(null),
      payload.newSubjectId
        ? prisma.subject.findUnique({ where: { id: payload.newSubjectId } })
        : Promise.resolve(null),
      payload.newRoomId
        ? prisma.timetableRoom.findUnique({ where: { id: payload.newRoomId } })
        : Promise.resolve(null),
    ])

    // Check substitute teacher schedule & inter-campus travel on exact targetDate!
    if (subTeacher && (payload.actionType === "SUBSTITUTE" || payload.actionType === "MAKEUP")) {
      const subEffective = await getEffectiveTeacherWeekSchedule({
        teacherId: subTeacher.id,
        referenceDateIso: targetDate,
        academicYearId: payload.academicYearId,
        semester: payload.semester,
      })

      const sameDayItems = subEffective.items.filter(
        (i) => i.date === targetDate && !i.isCancelledByLeave
      )

      const directHit = sameDayItems.find(
        (i) => i.session === payload.session && Number(i.periodNumber) === Number(payload.periodNumber)
      )
      if (directHit) {
        return {
          success: false as const,
          error: `GV thay thế ${subTeacher.teacherName} (${subTeacher.teacherCode}) đang có tiết dạy Lớp ${directHit.className} (${directHit.campusName}) tại ${payload.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${payload.periodNumber} ngày ${targetDate}.`,
        }
      }

      const crossCampusSameSession = sameDayItems.find(
        (i) => i.campusId !== payload.campusId && i.session === payload.session
      )
      if (crossCampusSameSession) {
        return {
          success: false as const,
          error: `GV thay thế ${subTeacher.teacherName} (${subTeacher.teacherCode}) đang dạy tại cơ sở khác (${crossCampusSameSession.campusName}) trong cùng buổi ${payload.session === "MORNING" ? "Sáng" : "Chiều"} ngày ${targetDate} — không đủ thời gian di chuyển.`,
        }
      }
    }

    const beforeSnapshot = {
      subjectName: baseSlot?.subjectName || null,
      teacherCode: origTeacher?.teacherCode || null,
      teacherName: baseSlot?.teacherName || origTeacher?.teacherName || null,
      roomName: baseSlot?.roomName || null,
    }

    const afterSnapshot = {
      actionType: payload.actionType,
      subjectName:
        payload.actionType === "LEAVE"
          ? "Nghỉ tiết"
          : newSubject?.subjectName || baseSlot?.subjectName || null,
      teacherCode: subTeacher?.teacherCode || origTeacher?.teacherCode || null,
      teacherName:
        payload.actionType === "LEAVE"
          ? null
          : subTeacher?.teacherName || baseSlot?.teacherName || null,
      roomName: newRoom?.roomName || baseSlot?.roomName || null,
    }

    const created = await prisma.timetableSubstitution.create({
      data: {
        academicYearId: payload.academicYearId,
        semester: payload.semester,
        campusId: payload.campusId,
        versionId: payload.versionId || baseSlot?.versionId || null,
        slotId: baseSlot?.id || null,
        targetDate,
        actionType: payload.actionType,
        classId: cls.id,
        className: cls.className,
        dayOfWeek: dayCode,
        session: payload.session,
        periodNumber: Number(payload.periodNumber),
        originalSubjectId: baseSlot?.subjectId || null,
        originalSubjectName: baseSlot?.subjectName || null,
        originalTeacherId: baseSlot?.teacherId || null,
        originalTeacherCode: origTeacher?.teacherCode || null,
        originalTeacherName: baseSlot?.teacherName || origTeacher?.teacherName || null,
        originalRoomId: baseSlot?.roomId || null,
        originalRoomName: baseSlot?.roomName || null,
        newSubjectId: newSubject?.id || null,
        newSubjectName: newSubject?.subjectName || null,
        substituteTeacherId: subTeacher?.id || null,
        substituteTeacherCode: subTeacher?.teacherCode || null,
        substituteTeacherName: subTeacher?.teacherName || null,
        newRoomId: newRoom?.id || null,
        newRoomName: newRoom?.roomName || null,
        beforeSnapshotJson: JSON.stringify(beforeSnapshot),
        afterSnapshotJson: JSON.stringify(afterSnapshot),
        reason: payload.reason.trim(),
        status: "ACTIVE",
        createdById: authCtx.actorId,
        createdByName: authCtx.actorName,
      },
    })

    await appendAuditLog({
      versionId: created.versionId,
      campusId: payload.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: `SUBSTITUTION_${payload.actionType}`,
      summary: `Ghi nhận ${payload.actionType} ngày ${targetDate} cho Lớp ${cls.className} (${payload.session} T${payload.periodNumber})`,
      beforeJson: beforeSnapshot,
      afterJson: afterSnapshot,
    })

    revalidateTimetablePaths()
    return { success: true as const, substitution: created }
  } catch (err) {
    return formatActionError(err)
  }
}

export async function cancelTimetableSubstitutionAction(substitutionId: string) {
  try {
    const authCtx = await requireTimetablePermission("canDelete", {
      subModuleCode: "TIMETABLE_ADJUST",
    })
    await ensureTimetableSchema()

    const row = await prisma.timetableSubstitution.findUnique({ where: { id: substitutionId } })
    if (!row) return { success: false as const, error: "Không tìm thấy bản ghi điều chỉnh." }
    assertCampusAllowed(authCtx, row.campusId)

    await prisma.timetableSubstitution.update({
      where: { id: substitutionId },
      data: {
        status: "CANCELLED",
        cancelledById: authCtx.actorId,
        cancelledAt: new Date(),
      },
    })

    revalidateTimetablePaths()
    return { success: true as const }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// 7. DUYỆT & BAN HÀNH (/admin/thoi-khoa-bieu/ban-hanh)
// ============================================================================
export async function getTimetablePublishPageAction(filters: TimetableFilterParams = {}) {
  try {
    const authCtx = await requireTimetablePermission("canRead", {
      subModuleCode: "TIMETABLE_PUBLISH",
      campusIds: filters.campusId ? [filters.campusId] : undefined,
      scopeGroup: filters.scopeGroup,
    })

    const ws = await loadScopedWorkspaceContext(filters, authCtx, {
      loadExternalActiveSlots: true,
    })

    const classIds = ws.inScopeClasses.map((c) => c.id)

    const [subjectQuotas, teachingAssignments, ctqtAssignments, versionSlotsRaw, auditLogs] =
      await Promise.all([
        prisma.subjectQuota.findMany({ where: { academicYearId: ws.selectedYearId } }),
        classIds.length > 0
          ? prisma.teachingAssignment.findMany({
              where: {
                academicYearId: ws.selectedYearId,
                semester: ws.semester,
                classId: { in: classIds },
              },
            })
          : Promise.resolve([]),
        classIds.length > 0
          ? prisma.ctqtTeachingAssignment
              .findMany({
                where: {
                  academicYearId: ws.selectedYearId,
                  semester: ws.semester,
                  classId: { in: classIds },
                  status: "ACTIVE",
                },
              })
              .catch(() => [])
          : Promise.resolve([]),
        ws.selectedVersion
          ? prisma.timetableSlot.findMany({
              where: { versionId: ws.selectedVersion.id, status: "ACTIVE" },
            })
          : Promise.resolve([]),
        ws.selectedCampusId
          ? prisma.timetableAuditLog.findMany({
              where: {
                campusId: ws.selectedCampusId,
                ...(ws.selectedVersion ? { versionId: ws.selectedVersion.id } : {}),
              },
              orderBy: { createdAt: "desc" },
              take: 30,
            })
          : Promise.resolve([]),
      ])

    const slots = versionSlotsRaw.map((s) =>
      mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
    )

    const quotaItems = reconcileQuotasAndAssignments({
      classes: ws.inScopeClasses,
      subjects: ws.subjects,
      teachers: ws.teachers,
      subjectQuotas,
      teachingAssignments,
      ctqtAssignments,
      scheduledSlots: slots,
      cycleWeeks: ws.config.cycleWeeks,
    })

    const teachersById = new Map(ws.teachers.map((t) => [t.id, t]))
    const validationReport = validateTimetable({
      slots,
      config: ws.config,
      campusId: ws.selectedCampusId,
      campusName: formatCampusDisplayName(ws.selectedCampusObj),
      classes: ws.inScopeClasses,
      teachersById,
      quotaItems,
      rooms: ws.rooms,
      busySlots: ws.busySlots,
      travelRules: ws.travelRules,
      externalActiveSlots: ws.externalActiveSlots,
    })

    return {
      success: true as const,
      filterContext: serializeFilterContext(ws),
      allVersionsInScope: ws.versions.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        versionNumber: v.versionNumber,
        status: v.status,
        effectiveFrom: v.effectiveFrom,
        effectiveTo: v.effectiveTo,
        revision: v.revision,
        reviewComment: v.reviewComment,
        submittedByName: v.submittedByName,
        submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
        approvedByName: v.approvedByName,
        approvedAt: v.approvedAt ? v.approvedAt.toISOString() : null,
        publishedByName: v.publishedByName,
        publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
        returnedByName: v.returnedByName,
        returnedAt: v.returnedAt ? v.returnedAt.toISOString() : null,
      })),
      selectedVersion: ws.selectedVersion
        ? {
            id: ws.selectedVersion.id,
            code: ws.selectedVersion.code,
            name: ws.selectedVersion.name,
            status: ws.selectedVersion.status,
            revision: ws.selectedVersion.revision,
            effectiveFrom: ws.selectedVersion.effectiveFrom,
            effectiveTo: ws.selectedVersion.effectiveTo,
            reviewComment: ws.selectedVersion.reviewComment,
          }
        : null,
      validationReport,
      quotaSummary: {
        totalItems: quotaItems.length,
        missingTeacherCount: quotaItems.filter((q) => q.status === "MISSING_TEACHER").length,
        underScheduledCount: quotaItems.filter((q) => q.missingWeeklyPeriods > 0).length,
      },
      auditLogs: auditLogs.map((l) => ({
        id: l.id,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        summary: l.summary,
        createdAt: l.createdAt.toISOString(),
      })),
    }
  } catch (err) {
    return formatActionError(err)
  }
}

/**
 * Transitions a TimetableVersion across workflow states:
 * DRAFT -> PENDING_APPROVAL -> APPROVED -> PUBLISHED -> EXPIRED, or RETURN_DRAFT.
 * Re-validates against the freshest DB data before APPROVE / PUBLISH, prevents overlapping
 * effective date windows, and uses optimistic concurrency (`expectedRevision`) in a transaction.
 */
export async function transitionTimetableVersionStatusAction(payload: {
  versionId: string
  expectedRevision: number
  transition: "SUBMIT_APPROVAL" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "EXPIRE"
  effectiveFrom?: string | null
  effectiveTo?: string | null
  comment?: string | null
}) {
  try {
    const authCtx = await requireTimetablePermission("canUpdate", {
      subModuleCode: "TIMETABLE_PUBLISH",
    })
    await ensureTimetableSchema()

    const version = await prisma.timetableVersion.findUnique({
      where: { id: payload.versionId },
    })
    if (!version) {
      return { success: false as const, error: "Không tìm thấy phiên bản thời khóa biểu." }
    }
    assertCampusAllowed(authCtx, version.campusId)

    if (version.revision !== payload.expectedRevision) {
      throw new TimetableAccessError(
        "Trạng thái phiên bản vừa được người khác cập nhật. Vui lòng tải lại trước khi thao tác.",
        "CONFLICT"
      )
    }

    const effFrom =
      payload.effectiveFrom !== undefined ? payload.effectiveFrom : version.effectiveFrom
    const effTo = payload.effectiveTo !== undefined ? payload.effectiveTo : version.effectiveTo

    if (payload.transition === "RETURN_DRAFT") {
      if (!payload.comment || !payload.comment.trim()) {
        return {
          success: false as const,
          error: "Vui lòng nhập ý kiến phản hồi khi trả lại bản nháp.",
        }
      }
      if (version.status !== "PENDING_APPROVAL" && version.status !== "APPROVED") {
        return {
          success: false as const,
          error: `Không thể trả lại bản nháp từ trạng thái ${version.status}.`,
        }
      }
    }

    // Re-validate against latest live DB data before SUBMIT_APPROVAL, APPROVE, or PUBLISH
    if (
      payload.transition === "SUBMIT_APPROVAL" ||
      payload.transition === "APPROVE" ||
      payload.transition === "PUBLISH"
    ) {
      const ws = await loadScopedWorkspaceContext(
        {
          academicYearId: version.academicYearId,
          semester: version.semester,
          scopeGroup: version.scopeGroup as ManageableScopeGroup,
          campusId: version.campusId,
          versionId: version.id,
        },
        authCtx,
        { loadExternalActiveSlots: true }
      )

      const classIds = ws.inScopeClasses.map((c) => c.id)
      const [subjectQuotas, teachingAssignments, ctqtAssignments, slotsRaw] = await Promise.all([
        prisma.subjectQuota.findMany({ where: { academicYearId: version.academicYearId } }),
        prisma.teachingAssignment.findMany({
          where: {
            academicYearId: version.academicYearId,
            semester: version.semester,
            classId: { in: classIds },
          },
        }),
        prisma.ctqtTeachingAssignment
          .findMany({
            where: {
              academicYearId: version.academicYearId,
              semester: version.semester,
              classId: { in: classIds },
              status: "ACTIVE",
            },
          })
          .catch(() => []),
        prisma.timetableSlot.findMany({
          where: { versionId: version.id, status: "ACTIVE" },
        }),
      ])

      const slots = slotsRaw.map((s) =>
        mapDbSlotToRecord(s, ws.teacherCodeById, ws.subjectCodeById)
      )

      const quotaItems = reconcileQuotasAndAssignments({
        classes: ws.inScopeClasses,
        subjects: ws.subjects,
        teachers: ws.teachers,
        subjectQuotas,
        teachingAssignments,
        ctqtAssignments,
        scheduledSlots: slots,
        cycleWeeks: ws.config.cycleWeeks,
      })

      const teachersById = new Map(ws.teachers.map((t) => [t.id, t]))
      const liveReport = validateTimetable({
        slots,
        config: ws.config,
        campusId: version.campusId,
        campusName: formatCampusDisplayName(ws.selectedCampusObj),
        classes: ws.inScopeClasses,
        teachersById,
        quotaItems,
        rooms: ws.rooms,
        busySlots: ws.busySlots,
        travelRules: ws.travelRules,
        externalActiveSlots: ws.externalActiveSlots,
      })

      if (payload.transition === "APPROVE" || payload.transition === "PUBLISH") {
        if (!liveReport.canPublish) {
          return {
            success: false as const,
            error:
              "Không thể duyệt / ban hành khi phiên bản còn thiếu tiết định mức, thiếu phân công giáo viên hoặc còn vi phạm quy tắc bắt buộc.",
            validationReport: liveReport,
          }
        }
      }

      if (payload.transition === "PUBLISH" && !effFrom) {
        return {
          success: false as const,
          error: "Vui lòng chọn ngày bắt đầu hiệu lực (effectiveFrom) trước khi ban hành.",
        }
      }
      if (effFrom && effTo && effTo < effFrom) {
        return {
          success: false as const,
          error: "Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu hiệu lực.",
        }
      }
    }

    const updatedVersion = await prisma.$transaction(async (tx) => {
      if (payload.transition === "PUBLISH") {
        // Prevent overlapping PUBLISHED versions for the exact same scope
        const otherPublished = await tx.timetableVersion.findMany({
          where: {
            academicYearId: version.academicYearId,
            semester: version.semester,
            campusId: version.campusId,
            scopeGroup: version.scopeGroup,
            status: "PUBLISHED",
            id: { not: version.id },
          },
        })

        for (const op of otherPublished) {
          if (doDateRangesOverlap(effFrom, effTo, op.effectiveFrom, op.effectiveTo)) {
            throw new TimetableAccessError(
              `Trùng khoảng thời gian hiệu lực với phiên bản đang ban hành "${op.name}" (${op.effectiveFrom || "đầu kỳ"} → ${op.effectiveTo || "cuối kỳ"}). Vui lòng kết thúc hiệu lực phiên bản cũ hoặc chọn ngày áp dụng không chồng lấn.`,
              "CONFLICT"
            )
          }
        }
      }

      let nextStatus = version.status
      const extraData: Record<string, any> = {
        effectiveFrom: effFrom || null,
        effectiveTo: effTo || null,
        reviewComment: payload.comment ?? version.reviewComment,
      }

      if (payload.transition === "SUBMIT_APPROVAL") {
        if (version.status !== "DRAFT") {
          throw new TimetableAccessError("Chỉ bản Nháp (DRAFT) mới có thể gửi duyệt.", "CONFLICT")
        }
        nextStatus = "PENDING_APPROVAL"
        extraData.submittedById = authCtx.actorId
        extraData.submittedByName = authCtx.actorName
        extraData.submittedAt = new Date()
      } else if (payload.transition === "RETURN_DRAFT") {
        nextStatus = "DRAFT"
        extraData.returnedById = authCtx.actorId
        extraData.returnedByName = authCtx.actorName
        extraData.returnedAt = new Date()
      } else if (payload.transition === "APPROVE") {
        if (version.status !== "PENDING_APPROVAL" && version.status !== "DRAFT") {
          throw new TimetableAccessError("Trạng thái hiện tại không hợp lệ để phê duyệt.", "CONFLICT")
        }
        nextStatus = "APPROVED"
        extraData.approvedById = authCtx.actorId
        extraData.approvedByName = authCtx.actorName
        extraData.approvedAt = new Date()
      } else if (payload.transition === "PUBLISH") {
        if (version.status !== "APPROVED" && version.status !== "PENDING_APPROVAL") {
          throw new TimetableAccessError(
            "Phiên bản cần ở trạng thái Chờ duyệt hoặc Đã duyệt trước khi ban hành.",
            "CONFLICT"
          )
        }
        nextStatus = "PUBLISHED"
        extraData.publishedById = authCtx.actorId
        extraData.publishedByName = authCtx.actorName
        extraData.publishedAt = new Date()
        if (!version.approvedAt) {
          extraData.approvedById = authCtx.actorId
          extraData.approvedByName = authCtx.actorName
          extraData.approvedAt = new Date()
        }
      } else if (payload.transition === "EXPIRE") {
        if (version.status !== "PUBLISHED") {
          throw new TimetableAccessError("Chỉ lịch Đã ban hành mới có thể chuyển sang Hết hiệu lực.", "CONFLICT")
        }
        nextStatus = "EXPIRED"
        extraData.expiredAt = new Date()
        if (effTo) extraData.effectiveTo = effTo
      }

      const bumped = await tx.timetableVersion.updateMany({
        where: { id: version.id, revision: payload.expectedRevision },
        data: {
          status: nextStatus,
          revision: { increment: 1 },
          updatedAt: new Date(),
          ...extraData,
        },
      })

      if (bumped.count === 0) {
        throw new TimetableAccessError(
          "Phiên bản vừa được cập nhật đồng thời bởi người dùng khác. Vui lòng tải lại.",
          "CONFLICT"
        )
      }

      return tx.timetableVersion.findUnique({ where: { id: version.id } })
    })

    await appendAuditLog({
      versionId: version.id,
      campusId: version.campusId,
      actorId: authCtx.actorId,
      actorName: authCtx.actorName,
      actorRole: authCtx.actorRole,
      action: `WORKFLOW_${payload.transition}`,
      summary: `Chuyển trạng thái phiên bản ${version.code} sang ${updatedVersion?.status}${payload.comment ? ` — Ý kiến: ${payload.comment}` : ""}`,
    })

    revalidateTimetablePaths()
    return {
      success: true as const,
      version: updatedVersion,
    }
  } catch (err) {
    return formatActionError(err)
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORT FOR LEGACY CALLERS
// ============================================================================
export async function getTimetableMatrixData(campusId?: string, level: string = "TIEU_HOC") {
  const scopeGroup =
    level === "TRUNG_HOC" ? "TRUNG_HOC" : level === "HILL" ? "HILL" : "TIEU_HOC"
  const res = await getTimetableSchedulerPageAction({
    campusId,
    scopeGroup,
  })
  if (!res.success) {
    return {
      success: false,
      error: res.error,
      campuses: [],
      selectedCampusId: "",
      classes: [],
      subjects: [],
      teachers: [],
      timetableSlots: [],
    }
  }
  return {
    success: true,
    campuses: res.filterContext.campusesForScope,
    selectedCampusId: res.filterContext.selectedCampusId,
    classes: res.filterContext.classes,
    subjects: res.subjects,
    teachers: res.teachers,
    timetableSlots: res.slots,
  }
}

export { getEffectiveClassWeekSchedule, getEffectiveTeacherWeekSchedule }
