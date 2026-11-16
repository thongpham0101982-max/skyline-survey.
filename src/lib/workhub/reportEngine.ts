import { prisma } from "@/lib/db"
import { ensureWorkHubSchema, makeWorkHubId, safeJsonParse } from "./schemaInit"
import {
  canActorAccessTargetScope,
  recordWorkHubSystemAudit,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "./permissions"
import { listScopedWorkHubTasks, selectCanonicalStatisticalTasks } from "./taskEngine"
import { evaluateTargetWorkHubKpis } from "./kpiEngine"
import type {
  WorkHubActorScope,
  WorkHubReportPeriodType,
  WorkHubReportRecord,
  WorkHubReportScope,
  WorkHubReportSnapshotMetrics,
  WorkHubReportStatus,
} from "./types"

export function resolveReportPeriodWindow(params: {
  periodType: WorkHubReportPeriodType
  year: number
  month: number
  weekNumber?: number | null
}): {
  periodKey: string
  periodLabel: string
  periodStart: Date
  periodEnd: Date
} {
  const { periodType, year, month, weekNumber } = params
  if (periodType === "MONTHLY") {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
    return {
      periodKey: `${year}-M${String(month).padStart(2, "0")}`,
      periodLabel: `Tháng ${month}/${year}`,
      periodStart: start,
      periodEnd: end,
    }
  }

  const wk = Math.max(1, Math.min(5, Number(weekNumber || 1)))
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const startDay = Math.min(lastDayOfMonth, (wk - 1) * 7 + 1)
  const endDay = wk === 5 ? lastDayOfMonth : Math.min(lastDayOfMonth, startDay + 6)
  const start = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, endDay, 23, 59, 59))
  return {
    periodKey: `${year}-M${String(month).padStart(2, "0")}-W${wk}`,
    periodLabel: `Tuần ${wk} (${startDay}/${month} – ${endDay}/${month}/${year})`,
    periodStart: start,
    periodEnd: end,
  }
}

/**
 * Tổng hợp dữ liệu nguồn trung thực cho Báo cáo cá nhân hoặc Phòng ban/Cơ sở tại thời điểm chốt.
 * - Không cho phép người dùng ghi đè con số thống kê.
 * - Khử trùng 100% công việc có nhiều người phối hợp và công việc cha-con.
 * - Báo cáo đơn vị chỉ rõ danh sách cá nhân chưa gửi, không quy người chưa gửi về kết quả bằng 0.
 */
export async function buildLiveReportSnapshot(
  actor: WorkHubActorScope,
  params: {
    reportScope: WorkHubReportScope
    periodType: WorkHubReportPeriodType
    year: number
    month: number
    weekNumber?: number | null
    targetUserId?: string
    departmentId?: string | null
    campusId?: string | null
    academicYearId?: string | null
    cutoffNow?: Date
  }
): Promise<WorkHubReportSnapshotMetrics> {
  const cutoff = params.cutoffNow || new Date()
  const win = resolveReportPeriodWindow({
    periodType: params.periodType,
    year: params.year,
    month: params.month,
    weekNumber: params.weekNumber,
  })

  const targetEntityId =
    params.reportScope === "INDIVIDUAL"
      ? params.targetUserId || actor.userId
      : params.reportScope === "DEPARTMENT"
      ? params.departmentId || actor.primaryDepartmentId || ""
      : params.campusId || actor.primaryCampusId || ""

  if (!targetEntityId) {
    throw new WorkHubValidationError("Chưa xác định đối tượng lập báo cáo (Cá nhân / Phòng ban / Cơ sở).")
  }

  if (
    !canActorAccessTargetScope(actor, {
      targetScope: params.reportScope,
      targetId: targetEntityId,
      departmentId: params.departmentId,
      campusId: params.campusId,
    })
  ) {
    throw new WorkHubForbiddenError()
  }

  const taskFilter: any = {
    academicYearId: params.academicYearId,
    referenceNow: cutoff,
  }
  if (params.reportScope === "INDIVIDUAL") taskFilter.userId = targetEntityId
  if (params.reportScope === "DEPARTMENT") taskFilter.departmentId = targetEntityId
  if (params.reportScope === "CAMPUS") taskFilter.campusId = targetEntityId

  const rawTasks = await listScopedWorkHubTasks(actor, taskFilter)
  // Khử trùng nhiệm vụ đa thành viên phối hợp & cha-con
  const canonicalTasks = selectCanonicalStatisticalTasks(rawTasks)

  const pStartMs = win.periodStart.getTime()
  const pEndMs = win.periodEnd.getTime()

  // Tập công việc liên quan đến kỳ báo cáo: có ngày bắt đầu/hạn/hoàn thành giao với kỳ hoặc đang mở tại thời điểm chốt
  const periodTasks = canonicalTasks.filter((t) => {
    const startMs = new Date(t.startDate).getTime()
    const endMs = new Date(t.endDate).getTime()
    const compMs = t.completedAt ? new Date(t.completedAt).getTime() : null
    if (compMs !== null) {
      return compMs >= pStartMs && compMs <= pEndMs
    }
    return startMs <= pEndMs && endMs >= pStartMs - 90 * 86400000
  })

  const completedInPeriod = periodTasks.filter((t) => {
    if (t.workStatus !== "COMPLETED") return false
    if (!t.completedAt) return true
    const compMs = new Date(t.completedAt).getTime()
    return compMs >= pStartMs && compMs <= pEndMs
  })

  const inProgressAtCutoff = periodTasks.filter(
    (t) =>
      t.workStatus === "IN_PROGRESS" ||
      t.workStatus === "ASSIGNED" ||
      t.workStatus === "PENDING_REVIEW"
  )
  const pendingReview = periodTasks.filter((t) => t.workStatus === "PENDING_REVIEW")
  const overdue = periodTasks.filter((t) => t.isOverdue)
  const adhoc = periodTasks.filter((t) => t.isAdhoc)

  // Lấy KPI liên quan của đối tượng trong kỳ
  const kpiData = await evaluateTargetWorkHubKpis(actor, {
    targetScope: params.reportScope,
    targetEntityId,
    periodKey: win.periodKey,
    periodLabel: win.periodLabel,
    periodStart: win.periodStart.toISOString(),
    periodEnd: win.periodEnd.toISOString(),
    academicYearId: params.academicYearId || undefined,
  }).catch(() => ({ evaluations: [] }))

  // Nếu là báo cáo Phòng ban hoặc Cơ sở: chỉ rõ danh sách nhân sự đã gửi & CHƯA gửi báo cáo cá nhân kỳ này
  let submissionRollup: WorkHubReportSnapshotMetrics["submissionRollup"] = undefined
  if (params.reportScope === "DEPARTMENT" || params.reportScope === "CAMPUS") {
    const pAny = prisma as any
    const teacherWhere: any = { status: "ACTIVE" }
    if (params.reportScope === "DEPARTMENT") {
      teacherWhere.OR = [
        { departmentId: targetEntityId },
        { departmentAssignments: { some: { departmentId: targetEntityId } } },
      ]
    } else {
      teacherWhere.campusId = targetEntityId
    }

    const unitTeachers = await prisma.teacher.findMany({
      where: teacherWhere,
      select: {
        userId: true,
        teacherName: true,
        departmentRel: { select: { name: true } },
      },
      orderBy: { teacherName: "asc" },
    })

    const submittedRows: any[] =
      typeof pAny.$queryRawUnsafe === "function"
        ? await pAny
            .$queryRawUnsafe(
              `SELECT "ownerUserId", "ownerName", "status" FROM "workhub_reports"
               WHERE "reportScope" = 'INDIVIDUAL' AND "periodKey" = ? AND "status" != 'DRAFT'`,
              win.periodKey
            )
            .catch(() => [])
        : []

    const submittedByUser = new Map<string, { fullName: string; status: WorkHubReportStatus }>()
    for (const sr of submittedRows || []) {
      submittedByUser.set(String(sr.ownerUserId), {
        fullName: String(sr.ownerName || ""),
        status: sr.status as WorkHubReportStatus,
      })
    }

    const submittedUsers: Array<{ userId: string; fullName: string; status: WorkHubReportStatus }> = []
    const missingUsers: Array<{ userId: string; fullName: string; departmentName: string | null }> = []

    for (const ut of unitTeachers) {
      const found = submittedByUser.get(ut.userId)
      if (found) {
        submittedUsers.push({
          userId: ut.userId,
          fullName: ut.teacherName || found.fullName,
          status: found.status,
        })
      } else {
        missingUsers.push({
          userId: ut.userId,
          fullName: ut.teacherName,
          departmentName: ut.departmentRel?.name || null,
        })
      }
    }

    submissionRollup = {
      expectedUsersCount: unitTeachers.length,
      submittedUsersCount: submittedUsers.length,
      approvedUsersCount: submittedUsers.filter((s) => s.status === "APPROVED").length,
      submittedUsers,
      missingUsers,
    }
  }

  return {
    generatedAt: cutoff.toISOString(),
    periodStart: win.periodStart.toISOString(),
    periodEnd: win.periodEnd.toISOString(),
    totalCanonicalTasks: periodTasks.length,
    completedInPeriodCount: completedInPeriod.length,
    inProgressAtCutoffCount: inProgressAtCutoff.length,
    overdueCount: overdue.length,
    adhocCount: adhoc.length,
    pendingReviewCount: pendingReview.length,
    completedTaskIds: completedInPeriod.map((t) => t.id),
    inProgressTaskIds: inProgressAtCutoff.map((t) => t.id),
    overdueTaskIds: overdue.map((t) => t.id),
    adhocTaskIds: adhoc.map((t) => t.id),
    deliverablesSummary: periodTasks.slice(0, 30).map((t) => ({
      taskId: t.id,
      taskCode: t.taskCode,
      title: t.title,
      deliverables: t.deliverables,
      resultSummary: t.resultSummary,
      hasEvidence: t.attachmentsCount > 0 || t.evidenceLinks.length > 0,
      workStatus: t.workStatus,
    })),
    kpiSummary: kpiData.evaluations.map((k) => ({
      kpiId: k.kpiId,
      kpiCode: k.kpiCode,
      kpiName: k.kpiName,
      unit: k.unit,
      actualDisplay: k.actualDisplay,
      targetDisplay: `${k.targetValue}${k.unit === "%" ? "%" : ` ${k.unit}`}`,
      outcomeBand: k.outcomeBand,
    })),
    submissionRollup,
  }
}

export async function listScopedWorkHubReports(
  actor: WorkHubActorScope,
  filters?: {
    reportScope?: string
    periodType?: string
    year?: number
    month?: number
    departmentId?: string
    campusId?: string
    status?: string
  }
): Promise<WorkHubReportRecord[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []

  const [rows, departments, campuses] = await Promise.all([
    pAny.$queryRawUnsafe(`SELECT * FROM "workhub_reports" ORDER BY "updatedAt" DESC`),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.campus.findMany({ select: { id: true, campusName: true } }),
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d.name]))
  const campusMap = new Map(campuses.map((c) => [c.id, c.campusName]))

  const list: WorkHubReportRecord[] = []
  for (const r of rows || []) {
    const scope = (r.reportScope as WorkHubReportScope) || "INDIVIDUAL"
    const targetId =
      scope === "INDIVIDUAL"
        ? String(r.ownerUserId)
        : scope === "DEPARTMENT"
        ? String(r.departmentId || "")
        : String(r.campusId || "")

    const isReviewer = r.reviewerUserId && String(r.reviewerUserId) === actor.userId
    if (
      !isReviewer &&
      !canActorAccessTargetScope(actor, {
        targetScope: scope,
        targetId,
        departmentId: r.departmentId,
        campusId: r.campusId,
      })
    ) {
      continue
    }

    if (filters?.reportScope && filters.reportScope !== "ALL" && scope !== filters.reportScope) {
      continue
    }
    if (filters?.periodType && filters.periodType !== "ALL" && r.periodType !== filters.periodType) {
      continue
    }
    if (filters?.year && Number(r.year) !== Number(filters.year)) continue
    if (filters?.month && Number(r.month) !== Number(filters.month)) continue
    if (
      filters?.departmentId &&
      filters.departmentId !== "ALL" &&
      r.departmentId !== filters.departmentId
    ) {
      continue
    }
    if (filters?.campusId && filters.campusId !== "ALL" && r.campusId !== filters.campusId) {
      continue
    }
    if (filters?.status && filters.status !== "ALL" && r.status !== filters.status) continue

    list.push({
      id: String(r.id),
      reportCode: String(r.reportCode),
      reportScope: scope,
      periodType: (r.periodType as WorkHubReportPeriodType) || "WEEKLY",
      periodKey: String(r.periodKey),
      periodLabel: String(r.periodLabel),
      academicYearId: r.academicYearId ? String(r.academicYearId) : null,
      year: Number(r.year),
      month: Number(r.month),
      weekNumber: r.weekNumber !== null && r.weekNumber !== undefined ? Number(r.weekNumber) : null,
      periodStart: String(r.periodStart),
      periodEnd: String(r.periodEnd),
      ownerUserId: String(r.ownerUserId),
      ownerName: String(r.ownerName || ""),
      departmentId: r.departmentId ? String(r.departmentId) : null,
      departmentName: r.departmentId ? deptMap.get(String(r.departmentId)) || null : null,
      campusId: r.campusId ? String(r.campusId) : null,
      campusName: r.campusId ? campusMap.get(String(r.campusId)) || null : null,
      status: (r.status as WorkHubReportStatus) || "DRAFT",
      isLocked: Boolean(Number(r.isLocked ?? 0)),
      versionNumber: Number(r.versionNumber || 1),
      executiveCommentary: String(r.executiveCommentary || ""),
      blockersAndCauses: String(r.blockersAndCauses || ""),
      supportRequests: String(r.supportRequests || ""),
      nextPeriodPlan: String(r.nextPeriodPlan || ""),
      reviewerUserId: r.reviewerUserId ? String(r.reviewerUserId) : null,
      reviewerName: r.reviewerName ? String(r.reviewerName) : null,
      reviewFeedback: r.reviewFeedback ? String(r.reviewFeedback) : null,
      submittedSnapshotAt: r.submittedSnapshotAt ? String(r.submittedSnapshotAt) : null,
      approvedAt: r.approvedAt ? String(r.approvedAt) : null,
      snapshot: safeJsonParse<WorkHubReportSnapshotMetrics>(r.snapshotJson, {
        generatedAt: String(r.updatedAt),
        periodStart: String(r.periodStart),
        periodEnd: String(r.periodEnd),
        totalCanonicalTasks: 0,
        completedInPeriodCount: 0,
        inProgressAtCutoffCount: 0,
        overdueCount: 0,
        adhocCount: 0,
        pendingReviewCount: 0,
        completedTaskIds: [],
        inProgressTaskIds: [],
        overdueTaskIds: [],
        adhocTaskIds: [],
        deliverablesSummary: [],
        kpiSummary: [],
      }),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    })
  }

  return list
}

/**
 * Lưu bản nháp hoặc Gửi báo cáo (Khi gửi SUBMITTED -> tự động chụp & đóng băng ảnh chụp dữ liệu nguồn tại thời điểm chốt!)
 * Từ chối mọi nỗ lực sửa trực tiếp báo cáo đã duyệt (isLocked = 1) mà không tạo phiên bản điều chỉnh.
 */
export async function saveOrSubmitWorkHubReport(
  actor: WorkHubActorScope,
  input: {
    reportId?: string
    reportScope: WorkHubReportScope
    periodType: WorkHubReportPeriodType
    year: number
    month: number
    weekNumber?: number | null
    academicYearId?: string | null
    departmentId?: string | null
    campusId?: string | null
    executiveCommentary: string
    blockersAndCauses: string
    supportRequests: string
    nextPeriodPlan: string
    submitNow: boolean
  }
): Promise<{ reportId: string; status: WorkHubReportStatus; snapshot: WorkHubReportSnapshotMetrics }> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  if (input.reportScope !== "INDIVIDUAL" && !actor.canViewOrgTracking) {
    throw new WorkHubForbiddenError("Chỉ Trưởng bộ phận, Giám đốc Cơ sở hoặc Ban điều hành mới được lập báo cáo cấp đơn vị.")
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const win = resolveReportPeriodWindow({
    periodType: input.periodType,
    year: input.year,
    month: input.month,
    weekNumber: input.weekNumber,
  })

  // Luôn lấy số liệu nguồn trực tiếp từ hệ thống (người dùng KHÔNG thể truyền snapshot giả từ client)
  const freshSnapshot = await buildLiveReportSnapshot(actor, {
    reportScope: input.reportScope,
    periodType: input.periodType,
    year: input.year,
    month: input.month,
    weekNumber: input.weekNumber,
    targetUserId: actor.userId,
    departmentId: input.departmentId || actor.primaryDepartmentId,
    campusId: input.campusId || actor.primaryCampusId,
    academicYearId: input.academicYearId,
    cutoffNow: now,
  })

  const nextStatus: WorkHubReportStatus = input.submitNow ? "SUBMITTED" : "DRAFT"

  if (input.reportId) {
    const existingRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "workhub_reports" WHERE "id" = ? LIMIT 1`,
      input.reportId
    )
    const existing = existingRows?.[0]
    if (!existing) throw new WorkHubValidationError("Không tìm thấy báo cáo.")
    if (Boolean(Number(existing.isLocked)) || existing.status === "APPROVED") {
      throw new WorkHubValidationError(
        "Báo cáo này đã được phê duyệt và khóa dữ liệu. Để điều chỉnh, vui lòng tạo phiên bản điều chỉnh kèm lý do."
      )
    }
    if (existing.ownerUserId !== actor.userId && !actor.isExecutive) {
      throw new WorkHubForbiddenError("Chỉ người lập báo cáo mới được cập nhật nội dung báo cáo này.")
    }

    await pAny.$executeRawUnsafe(
      `UPDATE "workhub_reports"
       SET "status" = ?, "executiveCommentary" = ?, "blockersAndCauses" = ?,
           "supportRequests" = ?, "nextPeriodPlan" = ?, "snapshotJson" = ?,
           "submittedSnapshotAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      nextStatus,
      input.executiveCommentary || "",
      input.blockersAndCauses || "",
      input.supportRequests || "",
      input.nextPeriodPlan || "",
      JSON.stringify(freshSnapshot),
      input.submitNow ? nowIso : existing.submittedSnapshotAt,
      nowIso,
      input.reportId
    )

    await recordWorkHubSystemAudit({
      actor,
      action: input.submitNow ? "REPORT_SUBMITTED_SNAPSHOT" : "REPORT_DRAFT_SAVED",
      targetTable: "workhub_reports",
      targetId: input.reportId,
      newValues: { status: nextStatus, periodKey: win.periodKey, versionNumber: existing.versionNumber },
    })

    return { reportId: input.reportId, status: nextStatus, snapshot: freshSnapshot }
  }

  const reportId = makeWorkHubId("whrep")
  const prefix =
    input.reportScope === "INDIVIDUAL" ? "BCC" : input.reportScope === "DEPARTMENT" ? "BCPB" : "BCCS"
  const reportCode = `${prefix}-${input.year}${String(input.month).padStart(2, "0")}-${Date.now()
    .toString()
    .slice(-4)}`

  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_reports" (
      "id", "reportCode", "reportScope", "periodType", "periodKey", "periodLabel",
      "academicYearId", "year", "month", "weekNumber", "periodStart", "periodEnd",
      "ownerUserId", "ownerName", "departmentId", "campusId", "status", "isLocked",
      "versionNumber", "executiveCommentary", "blockersAndCauses", "supportRequests",
      "nextPeriodPlan", "submittedSnapshotAt", "snapshotJson", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    reportId,
    reportCode,
    input.reportScope,
    input.periodType,
    win.periodKey,
    win.periodLabel,
    input.academicYearId || null,
    input.year,
    input.month,
    input.weekNumber || null,
    win.periodStart.toISOString(),
    win.periodEnd.toISOString(),
    actor.userId,
    actor.userName,
    input.departmentId || actor.primaryDepartmentId || null,
    input.campusId || actor.primaryCampusId || null,
    nextStatus,
    input.executiveCommentary || "",
    input.blockersAndCauses || "",
    input.supportRequests || "",
    input.nextPeriodPlan || "",
    input.submitNow ? nowIso : null,
    JSON.stringify(freshSnapshot),
    nowIso,
    nowIso
  )

  await recordWorkHubSystemAudit({
    actor,
    action: input.submitNow ? "REPORT_CREATED_AND_SUBMITTED" : "REPORT_DRAFT_CREATED",
    targetTable: "workhub_reports",
    targetId: reportId,
    newValues: { reportCode, status: nextStatus, periodKey: win.periodKey },
  })

  return { reportId, status: nextStatus, snapshot: freshSnapshot }
}

/**
 * Duyệt báo cáo (khóa báo cáo), Yêu cầu bổ sung, hoặc Mở phiên bản điều chỉnh cho báo cáo đã khóa
 */
export async function reviewOrReviseWorkHubReport(
  actor: WorkHubActorScope,
  params: {
    reportId: string
    action: "APPROVE" | "REQUEST_REVISION" | "CREATE_NEW_VERSION"
    feedbackOrReason?: string
  }
): Promise<{ status: WorkHubReportStatus; versionNumber: number; isLocked: boolean }> {
  await ensureWorkHubSchema()
  const pAny = prisma as any

  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_reports" WHERE "id" = ? LIMIT 1`,
    params.reportId
  )
  const rep = rows?.[0]
  if (!rep) throw new WorkHubValidationError("Không tìm thấy báo cáo.")

  const nowIso = new Date().toISOString()
  const curVersion = Number(rep.versionNumber || 1)

  if (params.action === "CREATE_NEW_VERSION") {
    if (rep.ownerUserId !== actor.userId && !actor.isExecutive && !actor.isDepartmentHead && !actor.isCampusHead) {
      throw new WorkHubForbiddenError("Bạn không có quyền tạo phiên bản điều chỉnh cho báo cáo này.")
    }
    if (rep.status !== "APPROVED" && !Boolean(Number(rep.isLocked))) {
      throw new WorkHubValidationError("Chỉ cần tạo phiên bản mới khi báo cáo đã được duyệt và khóa.")
    }
    const reason = (params.feedbackOrReason || "").trim()
    if (!reason) {
      throw new WorkHubValidationError("Bắt buộc ghi rõ lý do điều chỉnh khi mở phiên bản mới từ báo cáo đã duyệt.")
    }

    await pAny.$executeRawUnsafe(
      `INSERT INTO "workhub_report_versions" (
        "id", "reportId", "versionNumber", "revisionReason",
        "snapshotJson", "commentarySnapshotJson", "createdByUserId", "createdByName", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      makeWorkHubId("whrv"),
      rep.id,
      curVersion,
      reason,
      String(rep.snapshotJson || "{}"),
      JSON.stringify({
        executiveCommentary: rep.executiveCommentary,
        blockersAndCauses: rep.blockersAndCauses,
        supportRequests: rep.supportRequests,
        nextPeriodPlan: rep.nextPeriodPlan,
        approvedAt: rep.approvedAt,
        reviewerName: rep.reviewerName,
      }),
      actor.userId,
      actor.userName,
      nowIso
    )

    const nextVersion = curVersion + 1
    await pAny.$executeRawUnsafe(
      `UPDATE "workhub_reports"
       SET "status" = 'DRAFT', "isLocked" = 0, "versionNumber" = ?, "reviewFeedback" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      nextVersion,
      `[Phiên bản v${nextVersion} - Lý do điều chỉnh]: ${reason}`,
      nowIso,
      rep.id
    )

    await recordWorkHubSystemAudit({
      actor,
      action: "REPORT_NEW_VERSION_CREATED",
      targetTable: "workhub_reports",
      targetId: rep.id,
      oldValues: { status: rep.status, versionNumber: curVersion, isLocked: true },
      newValues: { status: "DRAFT", versionNumber: nextVersion, isLocked: false, reason },
    })

    return { status: "DRAFT", versionNumber: nextVersion, isLocked: false }
  }

  // APPROVE or REQUEST_REVISION -> requires leadership authority & cannot self-approve if non-executive
  if (!actor.isExecutive && !actor.isDepartmentHead && !actor.isCampusHead) {
    throw new WorkHubForbiddenError("Chỉ Trưởng bộ phận, Giám đốc Cơ sở hoặc Ban điều hành mới có quyền duyệt báo cáo.")
  }
  if (rep.ownerUserId === actor.userId && !actor.isExecutive) {
    throw new WorkHubForbiddenError("Người lập báo cáo không thể tự phê duyệt báo cáo của chính mình.")
  }
  if (rep.status !== "SUBMITTED") {
    throw new WorkHubValidationError("Chỉ có thể xét duyệt đối với báo cáo đã gửi (SUBMITTED).")
  }

  if (params.action === "REQUEST_REVISION") {
    const fb = (params.feedbackOrReason || "").trim()
    if (!fb) {
      throw new WorkHubValidationError("Vui lòng nhập nội dung yêu cầu bổ sung cho báo cáo.")
    }
    await pAny.$executeRawUnsafe(
      `UPDATE "workhub_reports"
       SET "status" = 'NEEDS_REVISION', "isLocked" = 0, "reviewerUserId" = ?, "reviewerName" = ?,
           "reviewFeedback" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
      actor.userId,
      actor.userName,
      fb,
      nowIso,
      rep.id
    )

    await prisma.notification
      .create({
        data: {
          userId: String(rep.ownerUserId),
          title: `[WorkHub] Yêu cầu bổ sung báo cáo: ${rep.reportCode}`,
          message: `${actor.userName} yêu cầu bổ sung báo cáo ${rep.periodLabel}: "${fb.slice(0, 100)}"`,
          link: `/admin/workhub/reports?reportId=${rep.id}`,
          category: "WORKHUB",
          sourceModule: "WORKHUB",
          sourceId: String(rep.id),
        },
      })
      .catch(() => {})

    await recordWorkHubSystemAudit({
      actor,
      action: "REPORT_REVISION_REQUESTED",
      targetTable: "workhub_reports",
      targetId: rep.id,
      newValues: { status: "NEEDS_REVISION", feedback: fb },
    })

    return { status: "NEEDS_REVISION", versionNumber: curVersion, isLocked: false }
  }

  // APPROVE -> Lock report!
  const approveNote = (params.feedbackOrReason || "").trim() || "Đã phê duyệt và chốt số liệu báo cáo."
  await pAny.$executeRawUnsafe(
    `UPDATE "workhub_reports"
     SET "status" = 'APPROVED', "isLocked" = 1, "reviewerUserId" = ?, "reviewerName" = ?,
         "reviewFeedback" = ?, "approvedAt" = ?, "updatedAt" = ?
     WHERE "id" = ?`,
    actor.userId,
    actor.userName,
    approveNote,
    nowIso,
    nowIso,
    rep.id
  )

  await prisma.notification
    .create({
      data: {
        userId: String(rep.ownerUserId),
        title: `[WorkHub] Báo cáo đã được phê duyệt: ${rep.reportCode}`,
        message: `${actor.userName} đã phê duyệt và khóa chốt báo cáo ${rep.periodLabel}.`,
        link: `/admin/workhub/reports?reportId=${rep.id}`,
        category: "WORKHUB",
        sourceModule: "WORKHUB",
        sourceId: String(rep.id),
      },
    })
    .catch(() => {})

  await recordWorkHubSystemAudit({
    actor,
    action: "REPORT_APPROVED_AND_LOCKED",
    targetTable: "workhub_reports",
    targetId: rep.id,
    newValues: { status: "APPROVED", isLocked: true, versionNumber: curVersion },
  })

  return { status: "APPROVED", versionNumber: curVersion, isLocked: true }
}

export async function getWorkHubReportVersions(
  actor: WorkHubActorScope,
  reportId: string
): Promise<any[]> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  const reports = await listScopedWorkHubReports(actor)
  if (!reports.some((r) => r.id === reportId)) {
    throw new WorkHubForbiddenError()
  }
  const rows: any[] = await pAny.$queryRawUnsafe(
    `SELECT * FROM "workhub_report_versions" WHERE "reportId" = ? ORDER BY "versionNumber" DESC`,
    reportId
  )
  return rows || []
}
