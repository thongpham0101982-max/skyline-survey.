import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { resolveAdvisoryCaller, verifyStudentRelationship } from "@/lib/advisory/rbac-guard"
import { appendAdvisoryAuditLog, ensureTriPartyTables } from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function ensureAdjustmentRequestTable() {
  await ensureTriPartyTables()
  const ddlList = [
    `CREATE TABLE IF NOT EXISTS "StudentGoalAdjustmentRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "teacherResponse" TEXT,
      "reviewedBy" TEXT,
      "reviewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_goal_adj_student" ON "StudentGoalAdjustmentRequest" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_goal_adj_status" ON "StudentGoalAdjustmentRequest" ("status");`
  ]
  for (const ddl of ddlList) {
    try {
      await prisma.$executeRawUnsafe(ddl)
    } catch (e) {
      // Ignore if already exists
    }
  }
}

// GET: Lấy yêu cầu theo studentId hoặc danh sách yêu cầu của cả lớp theo classId
export async function GET(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    await ensureAdjustmentRequestTable()
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const classId = searchParams.get("classId")
    let academicYearId = searchParams.get("academicYearId")

    if (!academicYearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      academicYearId = defaultAY?.id || ""
    }

    // 1. Trường hợp truy vấn cho 1 học sinh cụ thể
    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền xem yêu cầu điều chỉnh mục tiêu" }, 403)
      }

      const rows = (await prisma
        .$queryRawUnsafe(
          `SELECT * FROM "StudentGoalAdjustmentRequest"
           WHERE "studentId" = ?
           AND ("academicYearId" = ? OR ? = '')
           ORDER BY "createdAt" DESC LIMIT 1`,
          rel.student.id,
          academicYearId,
          academicYearId
        )
        .catch(() => [])) as any[]

      const request = rows.length > 0 ? rows[0] : null
      const isUnlocked = request && request.status === "APPROVED"

      return jsonResponse({
        request,
        isUnlocked: Boolean(isUnlocked)
      })
    }

    // 2. Trường hợp GVCN lấy danh sách cho cả lớp
    if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Forbidden" }, 403)
      }

      const students = await prisma.student.findMany({
        where: { classId, status: "ACTIVE" },
        select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } }
      })

      if (students.length === 0) {
        return jsonResponse({ requests: [] })
      }

      const studentIds = students.map(s => s.id)
      const placeholders = studentIds.map(() => "?").join(",")

      const rows = (await prisma
        .$queryRawUnsafe(
          `SELECT * FROM "StudentGoalAdjustmentRequest"
           WHERE "studentId" IN (${placeholders})
           AND ("academicYearId" = ? OR ? = '')
           ORDER BY "createdAt" DESC`,
          ...studentIds,
          academicYearId,
          academicYearId
        )
        .catch(() => [])) as any[]

      const studentMap = new Map(students.map(s => [s.id, s]))

      const latestRequestsMap = new Map<string, any>()
      for (const row of rows) {
        const sId = String(row.studentId)
        if (!latestRequestsMap.has(sId)) {
          const st = studentMap.get(sId)
          latestRequestsMap.set(sId, {
            ...row,
            studentName: st?.studentName || "",
            studentCode: st?.studentCode || "",
            className: st?.class?.className || ""
          })
        }
      }

      const requests = Array.from(latestRequestsMap.values())
      return jsonResponse({ requests })
    }

    // 3. Trường hợp Admin / Giáo viên lấy danh sách toàn trường / theo campusId / academicYearId
    if (caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN") {
      const campusId = searchParams.get("campusId")
      const statusFilter = searchParams.get("status")

      const whereStudent: any = { status: "ACTIVE" }
      if (campusId) {
        whereStudent.class = { campusId }
      }

      let querySql = `SELECT * FROM "StudentGoalAdjustmentRequest" WHERE ("academicYearId" = ? OR ? = '')`
      const args: any[] = [academicYearId, academicYearId]
      if (statusFilter && statusFilter !== "ALL") {
        querySql += ` AND "status" = ?`
        args.push(statusFilter)
      }
      querySql += ` ORDER BY "createdAt" DESC LIMIT 300`

      const rows = (await prisma.$queryRawUnsafe(querySql, ...args).catch(() => [])) as any[]
      if (rows.length === 0) {
        return jsonResponse({ requests: [] })
      }

      const reqStudentIds = Array.from(new Set(rows.map(r => String(r.studentId))))
      const students = await prisma.student.findMany({
        where: { id: { in: reqStudentIds }, ...whereStudent },
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          class: { select: { className: true, campus: { select: { campusName: true } } } }
        }
      })
      const studentMap = new Map(students.map(s => [s.id, s]))

      const requests: any[] = []
      for (const row of rows) {
        const st = studentMap.get(String(row.studentId))
        if (st) {
          requests.push({
            ...row,
            studentName: st.studentName || "",
            studentCode: st.studentCode || "",
            className: st.class?.className || "",
            campusName: st.class?.campus?.campusName || ""
          })
        }
      }
      return jsonResponse({ requests })
    }

    return jsonResponse({ error: "Vui lòng cung cấp studentId hoặc classId" }, 400)
  } catch (error: any) {
    console.error("GET /api/advisory/goals/adjustment-request error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ" }, 500)
  }
}

// POST: Học sinh gửi yêu cầu mở phiếu điều chỉnh (hoặc hủy)
export async function POST(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập hệ thống" }, 401)
    }

    await ensureAdjustmentRequestTable()
    const body = await req.json()
    const { studentId, academicYearId, reason, action } = body

    const targetStudentId = studentId || caller.studentId
    if (!targetStudentId) {
      return jsonResponse({ error: "Không xác định được danh tính học sinh" }, 401)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên học sinh này" }, 403)
    }

    let yearId = academicYearId || rel.student.academicYearId || ""
    if (!yearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      yearId = defaultAY?.id || ""
    }

    // Xử lý HỦY yêu cầu
    if (action === "CANCEL") {
      const requestId = body.requestId
      if (requestId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentGoalAdjustmentRequest" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "studentId" = ?`,
          requestId,
          rel.student.id
        )
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE "StudentGoalAdjustmentRequest" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP WHERE "studentId" = ? AND "status" = 'PENDING'`,
          rel.student.id
        )
      }
      return jsonResponse({ success: true, message: "Đã hủy yêu cầu mở phiếu thành công" })
    }

    if (!reason || !reason.trim()) {
      return jsonResponse({ error: "Vui lòng nhập lý do xin mở phiếu điều chỉnh" }, 400)
    }

    const checkPending = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "StudentGoalAdjustmentRequest" WHERE "studentId" = ? AND "status" = 'PENDING' LIMIT 1`,
        rel.student.id
      )
      .catch(() => [])) as any[]

    if (checkPending.length > 0) {
      const existingId = String(checkPending[0].id)
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentGoalAdjustmentRequest" SET "reason" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
        reason.trim(),
        existingId
      )
      return jsonResponse({
        success: true,
        message: "Đã cập nhật lý do cho yêu cầu mở phiếu đang chờ duyệt",
        requestId: existingId
      })
    }

    const newId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentGoalAdjustmentRequest" (
        "id", "studentId", "academicYearId", "reason", "status", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      newId,
      rel.student.id,
      yearId,
      reason.trim()
    )

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "GOAL_ADJUSTMENT_REQUEST",
      entityId: newId,
      action: "REQUEST_GOAL_UNLOCK",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Học sinh gửi yêu cầu mở lại phiếu mục tiêu để điều chỉnh: "${reason.trim()}"`
    })

    return jsonResponse({
      success: true,
      message: "Đã gửi yêu cầu mở phiếu điều chỉnh tới GVCN thành công!",
      requestId: newId
    })
  } catch (error: any) {
    console.error("POST /api/advisory/goals/adjustment-request error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi tạo yêu cầu" }, 500)
  }
}

// PATCH: GVCN phê duyệt / từ chối / chủ động mở khóa phiếu
export async function PATCH(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
      return jsonResponse({ error: "Yêu cầu quyền truy cập giáo viên/quản trị" }, 401)
    }

    await ensureAdjustmentRequestTable()
    const reviewerName = caller.actorName || "GVCN"
    const body = await req.json()
    const { id, studentId, academicYearId, status, teacherResponse, action } = body

    let yearId = academicYearId
    if (!yearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      yearId = defaultAY?.id || ""
    }

    // GVCN chủ động mở khóa (FORCE_UNLOCK)
    if (action === "FORCE_UNLOCK") {
      if (!studentId) {
        return jsonResponse({ error: "Thiếu thông tin studentId" }, 400)
      }
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Không có quyền thao tác học sinh này" }, 403)
      }
      const newId = `adj_force_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "StudentGoalAdjustmentRequest" (
          "id", "studentId", "academicYearId", "reason", "status", "teacherResponse", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        newId,
        rel.student.id,
        yearId,
        "GVCN chủ động mở khóa phiếu cho học sinh điều chỉnh",
        teacherResponse || "Thầy/Cô đã mở khóa phiếu mục tiêu để em điều chỉnh và nộp lại.",
        reviewerName
      )

      await appendAdvisoryAuditLog({
        studentId: rel.student.id,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: reviewerName,
        entityType: "GOAL_ADJUSTMENT_REQUEST",
        entityId: newId,
        action: "FORCE_UNLOCK_GOALS",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `CVHT (${reviewerName}) chủ động mở khóa phiếu mục tiêu để học sinh điều chỉnh`
      })

      return jsonResponse({
        success: true,
        message: "Đã mở khóa phiếu thành công cho học sinh!",
        requestId: newId
      })
    }

    // GVCN khóa lại phiếu (LOCK)
    if (action === "LOCK") {
      if (!studentId) {
        return jsonResponse({ error: "Thiếu thông tin studentId" }, 400)
      }
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentGoalAdjustmentRequest"
         SET "status" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "status" = 'APPROVED'`,
        studentId
      )
      return jsonResponse({
        success: true,
        message: "Đã khóa lại phiếu mục tiêu thành công!"
      })
    }

    if (!id) {
      return jsonResponse({ error: "Thiếu ID yêu cầu cần xét duyệt" }, 400)
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return jsonResponse({ error: "Trạng thái xét duyệt không hợp lệ (phải là APPROVED hoặc REJECTED)" }, 400)
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "StudentGoalAdjustmentRequest"
       SET "status" = ?,
           "teacherResponse" = ?,
           "reviewedBy" = ?,
           "reviewedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      status,
      teacherResponse || null,
      reviewerName,
      id
    )

    return jsonResponse({
      success: true,
      message: status === "APPROVED"
        ? "Đã phê duyệt mở lại phiếu cho học sinh thành công!"
        : "Đã từ chối yêu cầu mở phiếu."
    })
  } catch (error: any) {
    console.error("PATCH /api/advisory/goals/adjustment-request error:", error)
    return jsonResponse({ error: error.message || "Lỗi máy chủ khi cập nhật yêu cầu" }, 500)
  }
}
