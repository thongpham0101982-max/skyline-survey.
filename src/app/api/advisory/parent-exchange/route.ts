import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"
import {
  ensureTriPartyTables,
  appendAdvisoryAuditLog,
  listAdvisoryAuditLogs
} from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

/**
 * Resolves the current assigned CVHT / Homeroom Teacher for a student
 */
async function resolveAssignedAdvisor(student: any) {
  if (!student) return null
  const hrRaw = String(student.class?.homeroomTeacherId || "")
  const candidateIds = hrRaw.split(",").map(s => s.trim()).filter(Boolean)

  if (candidateIds.length > 0) {
    const teacher = await prisma.teacher
      .findFirst({
        where: {
          OR: [
            { id: { in: candidateIds } },
            { userId: { in: candidateIds } },
            { teacherCode: { in: candidateIds } }
          ]
        },
        select: { id: true, teacherName: true, email: true, phone: true }
      })
      .catch(() => null)
    if (teacher) return teacher
  }

  if (student.classId) {
    const tca = await prisma.teacherClassAssignment
      .findFirst({
        where: {
          classId: student.classId,
          OR: [
            { roleInClass: "HOMEROOM" },
            { roleInClass: "GVCN" },
            { roleInClass: { contains: "HOMEROOM" } }
          ]
        },
        include: {
          teacher: { select: { id: true, teacherName: true, email: true, phone: true } }
        }
      })
      .catch(() => null)
    if (tca?.teacher) return tca.teacher
  }

  return null
}

export async function GET(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    await ensureTriPartyTables()
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const classId = searchParams.get("classId")
    const academicYearId = searchParams.get("academicYearId") || ""
    const includeAudit = searchParams.get("includeAudit") === "true"

    let targetStudentIds: string[] = []

    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền truy cập" }, 403)
      }
      targetStudentIds = rel.allStudentIds
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ Giáo viên/CVHT hoặc Quản trị viên mới xem được theo lớp" }, 403)
      }
      const classStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: { id: true, studentCode: true }
        })
        .catch(() => [])
      targetStudentIds = classStudents.map(s => s.id)
    } else if (caller.actorRole === "STUDENT" && caller.studentId) {
      targetStudentIds = [caller.studentId]
    } else {
      return jsonResponse({ error: "Thiếu studentId hoặc classId" }, 400)
    }

    if (targetStudentIds.length === 0) {
      return jsonResponse({ exchanges: [], auditLogs: [] })
    }

    const placeholders = targetStudentIds.map(() => "?").join(",")
    const rows = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "ParentAdvisorExchange"
         WHERE "studentId" IN (${placeholders})
         ${academicYearId ? 'AND ("academicYearId" = ? OR "academicYearId" = \'\')' : ""}
         ORDER BY "createdAt" DESC`,
        ...(academicYearId ? [...targetStudentIds, academicYearId] : targetStudentIds)
      )
      .catch(() => [])) as any[]

    // Enrich student names for class-level teacher view
    const studentMap = new Map<string, any>()
    if (rows.length > 0) {
      const students = await prisma.student
        .findMany({
          where: { id: { in: targetStudentIds } },
          select: { id: true, studentName: true, studentCode: true, class: { select: { className: true } } }
        })
        .catch(() => [])
      for (const s of students) studentMap.set(s.id, s)
    }

    const exchanges = rows.map(r => {
      const st = studentMap.get(r.studentId)
      return {
        ...r,
        studentName: st?.studentName || "",
        studentCode: st?.studentCode || "",
        className: st?.class?.className || ""
      }
    })

    const auditLogs = includeAudit
      ? await listAdvisoryAuditLogs(targetStudentIds, caller.actorRole)
      : []

    return jsonResponse({
      exchanges,
      pendingCount: exchanges.filter(e => e.status === "PENDING").length,
      respondedCount: exchanges.filter(e => e.status === "RESPONDED").length,
      auditLogs
    })
  } catch (err: any) {
    console.error("GET /api/advisory/parent-exchange error:", err)
    return jsonResponse({ error: err.message || "Server error" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    const body = await req.json()
    const {
      studentId,
      academicYearId = "",
      topic = "PHOI_HOP_GIA_DINH",
      message,
      homeSupportSummary = "",
      preferredTime = ""
    } = body

    if (!studentId || !message?.trim()) {
      return jsonResponse({ error: "Vui lòng nhập đầy đủ nội dung trao đổi với CVHT" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên học sinh này" }, 403)
    }

    await ensureTriPartyTables()
    const assignedAdvisor = await resolveAssignedAdvisor(rel.student)
    const id = `pex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ParentAdvisorExchange" (
        "id", "studentId", "academicYearId", "parentId", "parentName",
        "teacherId", "teacherName", "topic", "message", "homeSupportSummary",
        "preferredTime", "status", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      rel.student.id,
      academicYearId || rel.student.academicYearId || "",
      caller.parentId || caller.userId,
      caller.actorName || "Phụ huynh",
      assignedAdvisor?.id || null,
      assignedAdvisor?.teacherName || "Cố vấn học tập",
      topic,
      message.trim(),
      homeSupportSummary ? homeSupportSummary.trim() : null,
      preferredTime ? preferredTime.trim() : null
    )

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "PARENT_EXCHANGE",
      entityId: id,
      action: "CREATE_EXCHANGE_REQUEST",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Phụ huynh gửi yêu cầu trao đổi với CVHT (${topic})`,
      changes: { topic, message: message.trim(), homeSupportSummary, preferredTime }
    })

    return jsonResponse({
      success: true,
      id,
      assignedAdvisor: assignedAdvisor?.teacherName || "GVCN / CVHT",
      message: "Đã gửi yêu cầu trao đổi và phản hồi hỗ trợ tại gia đình tới CVHT!"
    })
  } catch (err: any) {
    console.error("POST /api/advisory/parent-exchange error:", err)
    return jsonResponse({ error: err.message || "Server error" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
      return jsonResponse({ error: "Chỉ Giáo viên / CVHT mới có quyền phản hồi yêu cầu này" }, 403)
    }

    await ensureTriPartyTables()
    const body = await req.json()
    const { id, status = "RESPONDED", advisorResponse } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu mã yêu cầu trao đổi (id)" }, 400)
    }

    const existingRows = (await prisma
      .$queryRawUnsafe(`SELECT * FROM "ParentAdvisorExchange" WHERE "id" = ? LIMIT 1`, id)
      .catch(() => [])) as any[]

    if (!existingRows || existingRows.length === 0) {
      return jsonResponse({ error: "Không tìm thấy yêu cầu trao đổi" }, 404)
    }

    const record = existingRows[0]
    const rel = await verifyStudentRelationship(caller, record.studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền phản hồi học sinh này" }, 403)
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "ParentAdvisorExchange" SET
        "status" = ?,
        "advisorResponse" = COALESCE(?, "advisorResponse"),
        "teacherId" = COALESCE(?, "teacherId"),
        "teacherName" = COALESCE(?, "teacherName"),
        "respondedAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      status,
      advisorResponse ?? null,
      caller.teacherId || caller.userId,
      caller.actorName || "Cố vấn học tập",
      id
    )

    await appendAdvisoryAuditLog({
      studentId: record.studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "PARENT_EXCHANGE",
      entityId: id,
      action: "ADVISOR_RESPOND_EXCHANGE",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `CVHT phản hồi yêu cầu trao đổi của Phụ huynh (${status})`,
      changes: { status, advisorResponse }
    })

    return jsonResponse({
      success: true,
      message: "Đã gửi phản hồi của CVHT tới Phụ huynh thành công!"
    })
  } catch (err: any) {
    console.error("PATCH /api/advisory/parent-exchange error:", err)
    return jsonResponse({ error: err.message || "Server error" }, 500)
  }
}
