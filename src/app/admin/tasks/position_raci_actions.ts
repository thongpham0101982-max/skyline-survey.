"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOperationalScope } from "@/lib/session"
import {
  buildTemplateSnapshot,
  ensurePositionRaciSchema,
  getPositionRaciCatalogData,
  seedKtdbclPositionRaciCatalog,
} from "@/lib/qa-workspace/positionRaciSchema"
import { deriveReportCadences, KTDBCL_MANAGED_POSITION_SET } from "@/lib/qa-workspace/positionRaciParser"
import { createQaWorkspaceTask } from "./qa_workspace_actions"

async function resolveAdminAuthority() {
  const session = await auth()
  if (!session?.user?.id) {
    return { authenticated: false, canConfigure: false, userId: "", userName: "" }
  }
  const userId = String(session.user.id)
  const userName = String(
    (session.user as any).fullName || (session.user as any).name || session.user.email || "Quản trị"
  )
  const role = String((session.user as any).role || "").toUpperCase()
  const opScope = await getOperationalScope()
  const canConfigure =
    opScope.isSuperAdmin ||
    opScope.isHeadOfAcademic ||
    opScope.isDirectTBP ||
    ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role)

  return { authenticated: true, canConfigure, userId, userName }
}

export async function getPositionRaciCatalogAction() {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated) {
      return { success: false, error: "Chưa đăng nhập" }
    }
    const data = await getPositionRaciCatalogData()
    if (!authCtx.canConfigure) {
      const myMappings = data.staffMappings.filter((m) => m.userId === authCtx.userId)
      const myPosCodes = new Set(myMappings.map((m) => m.positionCode))
      const myPositions = data.positions.filter((p: any) => myPosCodes.has(p.positionCode))
      const myTemplates = data.templates.filter((t) =>
        t.raciLinks.some((l) => myPosCodes.has(l.positionCode))
      )
      return {
        success: true,
        data: {
          positions: myPositions,
          staffMappings: myMappings,
          templates: myTemplates,
        },
      }
    }
    return { success: true, data }
  } catch (err: any) {
    console.error("[getPositionRaciCatalogAction] Error:", err)
    return { success: false, error: err?.message || "Không tải được danh mục nhiệm vụ theo vị trí" }
  }
}

export async function reseedPositionRaciAction(forceUpdateExisting = false) {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated || !authCtx.canConfigure) {
      return {
        success: false,
        error: "Bạn không có quyền đồng bộ / khởi tạo mẫu nhiệm vụ theo ma trận RACI.",
      }
    }

    const res = await seedKtdbclPositionRaciCatalog({
      forceUpdateExisting,
      actorName: authCtx.userName,
    })
    const catalog = await getPositionRaciCatalogData()
    revalidatePath("/admin/tasks")
    return { success: true, stats: res, data: catalog }
  } catch (err: any) {
    console.error("[reseedPositionRaciAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi đồng bộ dữ liệu RACI" }
  }
}

export async function savePositionStaffAssignmentsAction(params: {
  positionCode: string
  userIds: string[]
  primaryUserId?: string | null
}) {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated || !authCtx.canConfigure) {
      return {
        success: false,
        error: "Bạn không có quyền phân công nhân sự giữ vị trí.",
      }
    }

    await ensurePositionRaciSchema()
    const pAny = prisma as any
    const posCode = String(params.positionCode || "").trim().toUpperCase()
    if (!posCode) {
      return { success: false, error: "Thiếu mã vị trí." }
    }

    const cleanIds = Array.from(new Set((params.userIds || []).filter(Boolean)))
    const primaryId =
      params.primaryUserId && cleanIds.includes(params.primaryUserId)
        ? params.primaryUserId
        : cleanIds[0] || null
    const nowIso = new Date().toISOString()

    await pAny.$executeRawUnsafe(
      `DELETE FROM "qa_position_staff_assignments" WHERE "positionCode" = ?`,
      posCode
    )

    for (const uid of cleanIds) {
      const id = `pos_staff_${posCode}_${uid}`
      await pAny.$executeRawUnsafe(
        `INSERT INTO "qa_position_staff_assignments"
          ("id", "positionCode", "userId", "isPrimary", "assignedByName", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        posCode,
        uid,
        uid === primaryId ? 1 : 0,
        authCtx.userName,
        nowIso
      )
    }

    const catalog = await getPositionRaciCatalogData()
    revalidatePath("/admin/tasks")
    return { success: true, data: catalog }
  } catch (err: any) {
    console.error("[savePositionStaffAssignmentsAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi cập nhật nhân sự theo vị trí" }
  }
}

export async function updatePositionTaskTemplateAction(params: {
  templateId: string
  title?: string
  detailTask?: string
  frequency?: string
  deliverables?: string
  kpiTarget?: string
  completionCriteria?: string
  adminNote?: string | null
  isActive?: boolean
}) {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated || !authCtx.canConfigure) {
      return {
        success: false,
        error: "Bạn không có quyền cập nhật hoặc ngừng áp dụng mẫu nhiệm vụ.",
      }
    }

    await ensurePositionRaciSchema()
    const pAny = prisma as any

    const existingRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_position_task_templates" WHERE "id" = ? LIMIT 1`,
      params.templateId
    )
    const existing = existingRows?.[0]
    if (!existing) {
      return { success: false, error: "Không tìm thấy mẫu nhiệm vụ." }
    }

    const nextTitle = params.title !== undefined ? params.title.trim() : String(existing.title)
    const nextDetail =
      params.detailTask !== undefined ? params.detailTask.trim() : String(existing.detailTask)
    const nextFreq =
      params.frequency !== undefined ? params.frequency.trim() : String(existing.frequency)
    const nextDeliv =
      params.deliverables !== undefined ? params.deliverables.trim() : String(existing.deliverables)
    const nextKpi =
      params.kpiTarget !== undefined ? params.kpiTarget.trim() : String(existing.kpiTarget)
    const nextCriteria =
      params.completionCriteria !== undefined
        ? params.completionCriteria.trim()
        : String(existing.completionCriteria)
    const nextAdminNote =
      params.adminNote !== undefined
        ? params.adminNote && params.adminNote.trim()
          ? params.adminNote.trim()
          : null
        : existing.adminNote
    const nextActive =
      params.isActive !== undefined ? (params.isActive ? 1 : 0) : Number(existing.isActive ?? 1)
    const nextVersion = Number(existing.version || 1) + 1
    const nextCadences = deriveReportCadences(nextFreq)
    const nowIso = new Date().toISOString()

    await pAny.$executeRawUnsafe(
      `UPDATE "qa_position_task_templates"
       SET "title" = ?,
           "detailTask" = ?,
           "frequency" = ?,
           "reportCadencesJson" = ?,
           "deliverables" = ?,
           "kpiTarget" = ?,
           "completionCriteria" = ?,
           "adminNote" = ?,
           "isActive" = ?,
           "version" = ?,
           "updatedByName" = ?,
           "updatedAt" = ?
       WHERE "id" = ?`,
      nextTitle,
      nextDetail,
      nextFreq,
      JSON.stringify(nextCadences),
      nextDeliv,
      nextKpi,
      nextCriteria,
      nextAdminNote,
      nextActive,
      nextVersion,
      authCtx.userName,
      nowIso,
      params.templateId
    )

    const catalog = await getPositionRaciCatalogData()
    revalidatePath("/admin/tasks")
    return { success: true, version: nextVersion, data: catalog }
  } catch (err: any) {
    console.error("[updatePositionTaskTemplateAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi cập nhật mẫu nhiệm vụ" }
  }
}

/**
 * Gán danh sách mẫu nhiệm vụ (vai trò R, C hoặc I) cho một vị trí cụ thể
 */
export async function assignTemplatesToPositionAction(params: {
  positionCode: string
  templateIds: string[]
  raciRole?: "R" | "C" | "I"
}) {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated || !authCtx.canConfigure) {
      return {
        success: false,
        error: "Bạn không có quyền gán nhiệm vụ cho vị trí.",
      }
    }

    await ensurePositionRaciSchema()
    const pAny = prisma as any
    const posCode = String(params.positionCode || "").trim().toUpperCase()
    const role = (params.raciRole || "R").toUpperCase() as "R" | "C" | "I"

    if (!KTDBCL_MANAGED_POSITION_SET.has(posCode)) {
      return { success: false, error: `Mã vị trí ${posCode} không nằm trong 07 vị trí Ban KT&ĐBCL.` }
    }

    const desiredIds = new Set((params.templateIds || []).filter(Boolean))

    // Remove this role from templates no longer selected for this position
    const existingRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT "templateId" FROM "qa_position_template_raci" WHERE "positionCode" = ? AND "raciRole" = ?`,
      posCode,
      role
    )
    for (const r of existingRows || []) {
      const tid = String(r.templateId)
      if (!desiredIds.has(tid)) {
        await pAny.$executeRawUnsafe(
          `DELETE FROM "qa_position_template_raci" WHERE "templateId" = ? AND "positionCode" = ? AND "raciRole" = ?`,
          tid,
          posCode,
          role
        )
      }
    }

    // Upsert selected templates with this role for this position
    for (const tid of desiredIds) {
      const linkId = `raci_${tid}_${posCode}`
      await pAny.$executeRawUnsafe(
        `INSERT INTO "qa_position_template_raci" ("id", "templateId", "positionCode", "raciRole")
         VALUES (?, ?, ?, ?)
         ON CONFLICT("templateId", "positionCode") DO UPDATE SET "raciRole" = excluded."raciRole"`,
        linkId,
        tid,
        posCode,
        role
      )
    }

    const catalog = await getPositionRaciCatalogData()
    revalidatePath("/admin/tasks")
    return { success: true, assignedCount: desiredIds.size, data: catalog }
  } catch (err: any) {
    console.error("[assignTemplatesToPositionAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi gán mẫu nhiệm vụ cho vị trí" }
  }
}

/**
 * Giao việc hàng loạt cho nhân sự giữ vị trí từ các mẫu nhiệm vụ RACI đã chọn
 * (Lưu snapshot phiên bản mẫu bất biến tại thời điểm giao để phục vụ báo cáo Tuần/Tháng/Kỳ học & KPI)
 */
export async function batchCreateTasksFromPositionTemplatesAction(params: {
  positionCode: string
  templateIds: string[]
  assignedToUserId: string
  collaboratorUserIds?: string[]
  startDate: string
  endDate: string
  academicYearId?: string | null
  scopeCampusId?: string | null
  scopeSurveyPeriod?: string | null
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  sendEmailNotification?: boolean
}) {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated || !authCtx.canConfigure) {
      return {
        success: false,
        error: "Bạn không có quyền giao việc hàng loạt theo vị trí.",
      }
    }

    if (!params.assignedToUserId) {
      return { success: false, error: "Vui lòng chọn nhân sự chịu trách nhiệm chính." }
    }
    if (!params.templateIds || params.templateIds.length === 0) {
      return { success: false, error: "Vui lòng chọn ít nhất 01 mẫu nhiệm vụ để giao." }
    }

    const catalog = await getPositionRaciCatalogData()
    const posDef = catalog.positions.find((p: any) => p.positionCode === params.positionCode)
    const selectedTemplates = catalog.templates.filter(
      (t) => params.templateIds.includes(t.id) && t.isActive
    )

    if (selectedTemplates.length === 0) {
      return { success: false, error: "Không tìm thấy mẫu nhiệm vụ hợp lệ đang áp dụng." }
    }

    // Resolve matching taskGroupId if exists
    let matchedGroupId: string | null = null
    if (posDef?.taskGroupName) {
      const grp = await prisma.taskGroup
        .findFirst({
          where: { name: posDef.taskGroupName },
          select: { id: true },
        })
        .catch(() => null)
      matchedGroupId = grp?.id || null
    }

    let createdCount = 0
    let emailsSentCount = 0
    const errors: string[] = []

    for (const tpl of selectedTemplates) {
      const snapshot = buildTemplateSnapshot(tpl, params.positionCode)
      const descParts = [
        `Nhiệm vụ chính: ${tpl.mainTask}`,
        `Nhiệm vụ chi tiết: ${tpl.detailTask}`,
        tpl.kpiTarget ? `KPI cụ thể: ${tpl.kpiTarget}` : "",
        tpl.adminNote ? `Lưu ý quản trị: ${tpl.adminNote}` : "",
      ].filter(Boolean)

      const res: any = await createQaWorkspaceTask({
        title: tpl.title,
        description: descParts.join("\n"),
        category: posDef?.taskGroupName || "KT&ĐBCL",
        taskGroupId: matchedGroupId,
        workspaceCardKey: params.positionCode.startsWith("VT28") || params.positionCode === "VT295"
          ? "DBCL"
          : "KHAO_THI",
        assignmentMode: "INDIVIDUAL",
        assignedToUserId: params.assignedToUserId,
        collaboratorUserIds: params.collaboratorUserIds || [],
        startDate: params.startDate,
        endDate: params.endDate,
        priority: params.priority || "MEDIUM",
        requiresApproval: true,
        sendEmailNotification: params.sendEmailNotification !== false,
        deliverables: tpl.deliverables,
        completionCriteria: tpl.completionCriteria,
        academicYearId: params.academicYearId || null,
        scopeCampusId: params.scopeCampusId || null,
        scopeSurveyPeriod: params.scopeSurveyPeriod || null,
        positionCodes: tpl.rPositions.length > 0 ? tpl.rPositions : [params.positionCode],
        templateSnapshot: snapshot,
      })

      if (res?.success) {
        createdCount += res.createdCount || 1
        emailsSentCount += res.emailsSentCount || 0
      } else {
        errors.push(`${tpl.itemCode}: ${res?.error || "Lỗi tạo nhiệm vụ"}`)
      }
    }

    revalidatePath("/admin/tasks")
    return {
      success: createdCount > 0,
      createdCount,
      emailsSentCount,
      errors,
    }
  } catch (err: any) {
    console.error("[batchCreateTasksFromPositionTemplatesAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi giao việc hàng loạt theo vị trí" }
  }
}
