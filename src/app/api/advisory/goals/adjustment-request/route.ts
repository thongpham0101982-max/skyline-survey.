import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getStudentSession } from "@/lib/student-session"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { createClient } from "@libsql/client/web"

export const dynamic = "force-dynamic"

let rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "").trim()
if (!rawUrl || (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://") && !rawUrl.startsWith("libsql://"))) {
  rawUrl = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
}
const TURSO_URL = rawUrl.replace(/^libsql:\/\//, 'https://')
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw").trim()

const libsqlClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

export async function ensureAdjustmentRequestTable() {
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
      await libsqlClient.execute(ddl)
    } catch (e) {
      console.error("DDL StudentGoalAdjustmentRequest error:", e)
    }
  }
}

// GET: Lấy yêu cầu theo studentId hoặc danh sách yêu cầu của cả lớp theo classId
export async function GET(req: Request) {
  try {
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
      const result = await libsqlClient.execute({
        sql: `SELECT * FROM "StudentGoalAdjustmentRequest" 
              WHERE "studentId" = ? 
              AND ("academicYearId" = ? OR ? = '')
              ORDER BY "createdAt" DESC LIMIT 1`,
        args: [studentId, academicYearId, academicYearId]
      })

      const request = result.rows.length > 0 ? result.rows[0] : null
      const isUnlocked = request && request.status === "APPROVED"

      return jsonResponse({
        request,
        isUnlocked: Boolean(isUnlocked)
      })
    }

    // 2. Trường hợp GVCN lấy danh sách cho cả lớp
    if (classId) {
      // Lấy danh sách học sinh thuộc lớp
      const students = await prisma.student.findMany({
        where: { classId, status: "ACTIVE" },
        select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } }
      })

      if (students.length === 0) {
        return jsonResponse({ requests: [] })
      }

      const studentIds = students.map(s => s.id)
      const placeholders = studentIds.map(() => "?").join(",")

      const result = await libsqlClient.execute({
        sql: `SELECT * FROM "StudentGoalAdjustmentRequest" 
              WHERE "studentId" IN (${placeholders})
              AND ("academicYearId" = ? OR ? = '')
              ORDER BY "createdAt" DESC`,
        args: [...studentIds, academicYearId, academicYearId]
      })

      const studentMap = new Map(students.map(s => [s.id, s]))
      
      // Nhóm theo studentId (chỉ lấy request mới nhất của mỗi học sinh)
      const latestRequestsMap = new Map<string, any>()
      for (const row of result.rows) {
        const sId = String(row.studentId)
        if (!latestRequestsMap.has(sId)) {
          const st = studentMap.get(sId)
          latestRequestsMap.set(sId, {
            ...row,
            studentName: st?.studentName || "",
            studentCode: st?.studentCode || "",
            className: (st as any)?.class?.className || ""
          })
        }
      }

      const requests = Array.from(latestRequestsMap.values())
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
    await ensureAdjustmentRequestTable()
    const studentSess = await getStudentSession()
    const session = await auth()

    const body = await req.json()
    const { studentId, academicYearId, reason, action } = body

    const targetStudentId = studentId || studentSess?.studentId
    if (!targetStudentId) {
      return jsonResponse({ error: "Không xác định được danh tính học sinh" }, 401)
    }

    let yearId = academicYearId
    if (!yearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      yearId = defaultAY?.id || ""
    }

    // Xử lý HỦY yêu cầu
    if (action === "CANCEL") {
      const requestId = body.requestId
      if (requestId) {
        await libsqlClient.execute({
          sql: `UPDATE "StudentGoalAdjustmentRequest" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "studentId" = ?`,
          args: [requestId, targetStudentId]
        })
      } else {
        await libsqlClient.execute({
          sql: `UPDATE "StudentGoalAdjustmentRequest" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP WHERE "studentId" = ? AND "status" = 'PENDING'`,
          args: [targetStudentId]
        })
      }
      return jsonResponse({ success: true, message: "Đã hủy yêu cầu mở phiếu thành công" })
    }

    // Tạo yêu cầu mới
    if (!reason || !reason.trim()) {
      return jsonResponse({ error: "Vui lòng nhập lý do xin mở phiếu điều chỉnh" }, 400)
    }

    // Kiểm tra xem đã có yêu cầu PENDING chưa
    const checkPending = await libsqlClient.execute({
      sql: `SELECT * FROM "StudentGoalAdjustmentRequest" WHERE "studentId" = ? AND "status" = 'PENDING' LIMIT 1`,
      args: [targetStudentId]
    })

    if (checkPending.rows.length > 0) {
      // Cập nhật lý do của yêu cầu hiện có
      const existingId = String(checkPending.rows[0].id)
      await libsqlClient.execute({
        sql: `UPDATE "StudentGoalAdjustmentRequest" SET "reason" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
        args: [reason.trim(), existingId]
      })
      return jsonResponse({
        success: true,
        message: "Đã cập nhật lý do cho yêu cầu mở phiếu đang chờ duyệt",
        requestId: existingId
      })
    }

    // Tạo mã id mới
    const newId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    await libsqlClient.execute({
      sql: `INSERT INTO "StudentGoalAdjustmentRequest" (
              "id", "studentId", "academicYearId", "reason", "status", "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [newId, targetStudentId, yearId, reason.trim()]
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
    await ensureAdjustmentRequestTable()
    const session = await auth()
    if (!session?.user) {
      return jsonResponse({ error: "Yêu cầu quyền truy cập giáo viên/quản trị" }, 401)
    }

    const reviewerName = session.user.name || session.user.email || "GVCN"
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
      const newId = `adj_force_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      await libsqlClient.execute({
        sql: `INSERT INTO "StudentGoalAdjustmentRequest" (
                "id", "studentId", "academicYearId", "reason", "status", "teacherResponse", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"
              ) VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          newId,
          studentId,
          yearId,
          "GVCN chủ động mở khóa phiếu cho học sinh điều chỉnh",
          teacherResponse || "Thầy/Cô đã mở khóa phiếu mục tiêu để em điều chỉnh và nộp lại.",
          reviewerName
        ]
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
      await libsqlClient.execute({
        sql: `UPDATE "StudentGoalAdjustmentRequest" 
              SET "status" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP 
              WHERE "studentId" = ? AND "status" = 'APPROVED'`,
        args: [studentId]
      })
      return jsonResponse({
        success: true,
        message: "Đã khóa lại phiếu mục tiêu thành công!"
      })
    }

    // Xét duyệt yêu cầu đã có theo ID
    if (!id) {
      return jsonResponse({ error: "Thiếu ID yêu cầu cần xét duyệt" }, 400)
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return jsonResponse({ error: "Trạng thái xét duyệt không hợp lệ (phải là APPROVED hoặc REJECTED)" }, 400)
    }

    await libsqlClient.execute({
      sql: `UPDATE "StudentGoalAdjustmentRequest" 
            SET "status" = ?, 
                "teacherResponse" = ?, 
                "reviewedBy" = ?, 
                "reviewedAt" = CURRENT_TIMESTAMP, 
                "updatedAt" = CURRENT_TIMESTAMP 
            WHERE "id" = ?`,
      args: [status, teacherResponse || null, reviewerName, id]
    })

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
