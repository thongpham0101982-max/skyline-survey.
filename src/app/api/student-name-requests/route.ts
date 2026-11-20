import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { logActivity } from "@/lib/audit"
import { ensureStudentNameChangeSchema } from "@/lib/student-name-requests/schemaInit"
import {
  canUserAccessNameChange,
  validateNameChangeInput,
} from "@/lib/student-name-requests/helpers"

export const dynamic = "force-dynamic"

function mapRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    academicYearId: String(r.academicYearId),
    academicYearName: r.academicYearName ? String(r.academicYearName) : "",
    campusId: String(r.campusId),
    campusCode: r.campusCode ? String(r.campusCode) : "",
    campusName: r.campusName ? String(r.campusName) : "",
    grade: String(r.grade || ""),
    classId: String(r.classId),
    className: r.className ? String(r.className) : "",
    studentId: String(r.studentId),
    studentCode: String(r.studentCode || ""),
    vnEduCode: r.vnEduCode ? String(r.vnEduCode) : null,
    oldName: String(r.oldName || ""),
    newName: String(r.newName || ""),
    reason: String(r.reason || ""),
    status: String(r.status || "PENDING") as "PENDING" | "APPROVED" | "REJECTED",
    requestedById: r.requestedById ? String(r.requestedById) : null,
    requestedByName: String(r.requestedByName || ""),
    updatedById: r.updatedById ? String(r.updatedById) : null,
    updatedByName: String(r.updatedByName || ""),
    approvedById: r.approvedById ? String(r.approvedById) : null,
    approvedByName: r.approvedByName ? String(r.approvedByName) : null,
    approvedAt: r.approvedAt ? String(r.approvedAt) : null,
    rejectReason: r.rejectReason ? String(r.rejectReason) : null,
    createdAt: r.createdAt ? String(r.createdAt) : "",
    updatedAt: r.updatedAt ? String(r.updatedAt) : "",
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    const hasAccess = await canUserAccessNameChange(role)
    if (!hasAccess) {
      return NextResponse.json({ error: "Không có quyền truy cập chức năng này." }, { status: 403 })
    }

    await ensureStudentNameChangeSchema()

    const sp = req.nextUrl.searchParams
    const academicYearIdParam = sp.get("academicYearId")
    const grade = (sp.get("grade") || "").trim()
    const classId = (sp.get("classId") || "").trim()
    const status = (sp.get("status") || "ALL").trim().toUpperCase()
    const search = (sp.get("search") || "").trim()
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1)
    const pageSize = Math.min(100, Math.max(5, parseInt(sp.get("pageSize") || "25", 10) || 25))

    let cookieYearId: string | undefined
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieYearId = cookieStore.get("selectedAcademicYear")?.value
    } catch {}

    const activeYearId = academicYearIdParam || cookieYearId
    let activeYear: { id: string; name: string } | null = null
    if (activeYearId && activeYearId !== "all") {
      activeYear = await prisma.academicYear.findUnique({
        where: { id: activeYearId },
        select: { id: true, name: true },
      })
    }
    if (!activeYear) {
      const defYear = await getDefaultAcademicYear(prisma)
      if (defYear) {
        activeYear = { id: defYear.id, name: defYear.name }
      }
    }

    const baseConditions: string[] = []
    const baseArgs: unknown[] = []

    if (activeYear?.id) {
      baseConditions.push(`r."academicYearId" = ?`)
      baseArgs.push(activeYear.id)
    }

    // Campus scope for non-system-admin users
    const roleUpper = (role || "").toUpperCase().trim()
    const isSystemAdmin = roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN" || roleUpper === "SUPERADMIN"
    if (!isSystemAdmin && session.user.id) {
      const assignments = await prisma.userCampusAssignment.findMany({
        where: { userId: session.user.id },
        select: { campusId: true },
      })
      if (assignments.length > 0) {
        const placeholders = assignments.map(() => "?").join(", ")
        baseConditions.push(`r."campusId" IN (${placeholders})`)
        baseArgs.push(...assignments.map((a) => a.campusId))
      }
    }

    if (grade && grade !== "ALL") {
      baseConditions.push(`r."grade" = ?`)
      baseArgs.push(grade)
    }
    if (classId && classId !== "ALL") {
      baseConditions.push(`r."classId" = ?`)
      baseArgs.push(classId)
    }
    if (search) {
      const like = `%${search.toLowerCase()}%`
      baseConditions.push(
        `(LOWER(r."studentCode") LIKE ? OR LOWER(COALESCE(r."vnEduCode", '')) LIKE ? OR LOWER(r."oldName") LIKE ? OR LOWER(r."newName") LIKE ? OR LOWER(r."updatedByName") LIKE ? OR LOWER(COALESCE(r."approvedByName", '')) LIKE ? OR LOWER(r."reason") LIKE ? OR LOWER(COALESCE(c."className", '')) LIKE ?)`
      )
      baseArgs.push(like, like, like, like, like, like, like, like)
    }

    // Summary counts (before status filter so the ledger strip shows accurate breakdown)
    const summaryWhere = baseConditions.length > 0 ? `WHERE ${baseConditions.join(" AND ")}` : ""
    const summaryRows = (await prisma.$queryRawUnsafe(
      `SELECT
        COUNT(*) as "total",
        SUM(CASE WHEN r."status" = 'PENDING' THEN 1 ELSE 0 END) as "pending",
        SUM(CASE WHEN r."status" = 'APPROVED' THEN 1 ELSE 0 END) as "approved",
        SUM(CASE WHEN r."status" = 'REJECTED' THEN 1 ELSE 0 END) as "rejected"
       FROM "StudentNameChangeRequest" r
       LEFT JOIN "Class" c ON c."id" = r."classId"
       ${summaryWhere}`,
      ...baseArgs
    )) as Array<Record<string, unknown>>

    const summary = {
      total: Number(summaryRows?.[0]?.total || 0),
      pending: Number(summaryRows?.[0]?.pending || 0),
      approved: Number(summaryRows?.[0]?.approved || 0),
      rejected: Number(summaryRows?.[0]?.rejected || 0),
    }

    const filterConditions = [...baseConditions]
    const filterArgs = [...baseArgs]
    if (status && status !== "ALL") {
      filterConditions.push(`r."status" = ?`)
      filterArgs.push(status)
    }

    const filterWhere = filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : ""

    const countRows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as "cnt"
       FROM "StudentNameChangeRequest" r
       LEFT JOIN "Class" c ON c."id" = r."classId"
       ${filterWhere}`,
      ...filterArgs
    )) as Array<Record<string, unknown>>
    const totalFiltered = Number(countRows?.[0]?.cnt || 0)
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * pageSize

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT
        r.*,
        c."className" as "className",
        cp."campusCode" as "campusCode",
        cp."campusName" as "campusName",
        ay."name" as "academicYearName"
       FROM "StudentNameChangeRequest" r
       LEFT JOIN "Class" c ON c."id" = r."classId"
       LEFT JOIN "Campus" cp ON cp."id" = r."campusId"
       LEFT JOIN "AcademicYear" ay ON ay."id" = r."academicYearId"
       ${filterWhere}
       ORDER BY r."updatedAt" DESC, r."createdAt" DESC
       LIMIT ? OFFSET ?`,
      ...filterArgs,
      pageSize,
      offset
    )) as Array<Record<string, unknown>>

    return NextResponse.json({
      academicYear: activeYear,
      items: rows.map(mapRow),
      summary,
      pagination: {
        page: safePage,
        pageSize,
        total: totalFiltered,
        totalPages,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải danh sách yêu cầu đổi tên."
    console.error("[GET /api/student-name-requests] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    const hasAccess = await canUserAccessNameChange(role)
    if (!hasAccess) {
      return NextResponse.json({ error: "Không có quyền tạo yêu cầu đổi tên." }, { status: 403 })
    }

    await ensureStudentNameChangeSchema()

    const body = await req.json()
    const studentId = String(body?.studentId || "").trim()
    const newName = String(body?.newName || "")
    const reason = String(body?.reason || "")

    if (!studentId) {
      return NextResponse.json({ error: "Vui lòng chọn học sinh cần đổi tên." }, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { id: true, className: true, grade: true, level: true } },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh đã chọn." }, { status: 404 })
    }

    const validation = validateNameChangeInput({
      oldName: student.studentName,
      newName,
      reason,
    })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check if there is already a PENDING request for this student
    const existingPending = (await prisma.$queryRawUnsafe(
      `SELECT "id" FROM "StudentNameChangeRequest" WHERE "studentId" = ? AND "status" = 'PENDING' LIMIT 1`,
      student.id
    )) as Array<Record<string, unknown>>

    if (existingPending.length > 0) {
      return NextResponse.json(
        {
          error: `Học sinh "${student.studentName}" đang có một yêu cầu đổi tên chờ duyệt. Vui lòng chỉnh sửa yêu cầu hiện tại hoặc chờ duyệt xong.`,
        },
        { status: 409 }
      )
    }

    const userId = session.user.id || null
    const userName = session.user.name || session.user.email || "Hệ thống"
    const nowIso = new Date().toISOString()
    const id = `snc_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
    const gradeVal = student.class?.grade || student.class?.level || ""

    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentNameChangeRequest" (
        "id", "academicYearId", "campusId", "grade", "classId",
        "studentId", "studentCode", "vnEduCode", "oldName", "newName",
        "reason", "status", "requestedById", "requestedByName",
        "updatedById", "updatedByName", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      id,
      student.academicYearId,
      student.campusId,
      gradeVal,
      student.classId,
      student.id,
      student.studentCode,
      student.vnEduCode || null,
      student.studentName,
      validation.cleanedNewName!,
      validation.cleanedReason!,
      userId,
      userName,
      userId,
      userName,
      nowIso,
      nowIso
    )

    await logActivity(
      userId || "SYSTEM",
      session.user.email || userName,
      "CREATE_STUDENT_NAME_CHANGE_REQUEST",
      "StudentNameChangeRequest",
      id,
      { studentCode: student.studentCode, oldName: student.studentName },
      { studentCode: student.studentCode, newName: validation.cleanedNewName, reason: validation.cleanedReason }
    )

    return NextResponse.json({
      success: true,
      id,
      message: "Đã tạo yêu cầu đổi tên học sinh thành công.",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tạo yêu cầu đổi tên."
    console.error("[POST /api/student-name-requests] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
