"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOperationalScope } from "@/lib/session"
import {
  ensurePositionRaciSchema,
  getPositionRaciCatalogData,
  seedKtdbclPositionRaciCatalog,
} from "@/lib/qa-workspace/positionRaciSchema"
import { deriveReportCadences } from "@/lib/qa-workspace/positionRaciParser"

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
    ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KTDBCL", "KHAO_THI", "DBCL"].includes(role)

  return { authenticated: true, canConfigure, userId, userName }
}

export async function getPositionRaciCatalogAction() {
  try {
    const authCtx = await resolveAdminAuthority()
    if (!authCtx.authenticated) {
      return { success: false, error: "Chưa đăng nhập" }
    }
    const data = await getPositionRaciCatalogData()
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
