import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  validateApiRequest,
  apiSuccess,
  apiError,
  isCampusInScope,
  isClassInScope,
  maskSensitivePhone,
  maskSensitiveEmail,
  hasPermission,
  logApiAccess,
} from "@/lib/api-auth"

export async function GET(request: Request) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, [
    "students:profile:read",
    "students:read",
  ])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit

  const requestedCampusId = searchParams.get("campusId")?.trim()
  const requestedClassId = searchParams.get("classId")?.trim()
  const requestedGrade = searchParams.get("grade")?.trim()
  const requestedAcademicYearId = searchParams.get("academicYearId")?.trim()
  const status = searchParams.get("status")?.trim() || "ACTIVE"
  const search = searchParams.get("search")?.trim()

  const { allowedCampusIds, allowedClassIds } = context.application

  // Anti-IDOR Scope Check on Query
  if (requestedCampusId && !isCampusInScope(allowedCampusIds, requestedCampusId)) {
    return apiError(
      "CAMPUS_SCOPE_EXCEEDED",
      `Bạn không có quyền truy cập dữ liệu của cơ sở "${requestedCampusId}"`,
      403,
      requestId
    )
  }
  if (requestedClassId && !isClassInScope(allowedClassIds, requestedClassId)) {
    return apiError(
      "CLASS_SCOPE_EXCEEDED",
      `Bạn không có quyền truy cập dữ liệu của lớp "${requestedClassId}"`,
      403,
      requestId
    )
  }

  const pAny = prisma as any

  try {
    let whereClauses: string[] = ["1=1"]
    let args: any[] = []

    if (status !== "ALL") {
      whereClauses.push('"status" = ?')
      args.push(status)
    }

    // Enforce campus bounds
    if (requestedCampusId) {
      whereClauses.push('"campusId" = ?')
      args.push(requestedCampusId)
    } else if (!allowedCampusIds.includes("*") && allowedCampusIds.length > 0) {
      const placeholders = allowedCampusIds.map(() => "?").join(",")
      whereClauses.push(`"campusId" IN (${placeholders})`)
      args.push(...allowedCampusIds)
    }

    // Enforce class bounds
    if (requestedClassId) {
      whereClauses.push('"classId" = ?')
      args.push(requestedClassId)
    } else if (!allowedClassIds.includes("*") && allowedClassIds.length > 0) {
      const placeholders = allowedClassIds.map(() => "?").join(",")
      whereClauses.push(`"classId" IN (${placeholders})`)
      args.push(...allowedClassIds)
    }

    if (requestedGrade) {
      whereClauses.push('"grade" = ?')
      args.push(requestedGrade)
    }

    if (requestedAcademicYearId) {
      whereClauses.push('"academicYearId" = ?')
      args.push(requestedAcademicYearId)
    }

    if (search) {
      whereClauses.push('("studentCode" LIKE ? OR "studentName" LIKE ? OR "className" LIKE ?)')
      const pattern = `%${search}%`
      args.push(pattern, pattern, pattern)
    }

    const whereSql = whereClauses.join(" AND ")

    // Query count
    const countRows: any[] = await pAny.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "api_snapshot_students" WHERE ${whereSql}`,
      ...args
    )
    const total = Number(countRows[0]?.total || 0)

    // Query paginated records
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "api_snapshot_students" WHERE ${whereSql} ORDER BY "studentName" ASC LIMIT ? OFFSET ?`,
      ...args,
      limit,
      skip
    )

    const canReadSensitiveContact =
      hasPermission(context, "students:contact:read") ||
      hasPermission(context, "students:read") ||
      hasPermission(context, "students:write")

    const items = rows.map((r: any) => {
      let parentsContact: any = null
      if (r.parentsContactJson) {
        try {
          const parsed = JSON.parse(r.parentsContactJson)
          if (canReadSensitiveContact) {
            parentsContact = parsed
          } else {
            parentsContact = {
              fatherName: parsed.fatherName || null,
              fatherPhone: maskSensitivePhone(parsed.fatherPhone),
              motherName: parsed.motherName || null,
              motherPhone: maskSensitivePhone(parsed.motherPhone),
              email: maskSensitiveEmail(parsed.email),
              addressNote: parsed.address ? "[Đã ẩn địa chỉ chi tiết theo NĐ 13/2023/NĐ-CP]" : null,
            }
          }
        } catch {}
      }

      let termGradesSummary: any = {}
      if (r.termGradesSummaryJson) {
        try {
          termGradesSummary = JSON.parse(r.termGradesSummaryJson)
        } catch {}
      }

      let achievementsSummary: any = []
      if (r.achievementsJson) {
        try {
          achievementsSummary = JSON.parse(r.achievementsJson)
        } catch {}
      }

      return {
        studentId: r.studentId,
        studentCode: r.studentCode,
        fullName: r.studentName,
        studentName: r.studentName,
        englishName: r.englishName,
        gender: r.gender,
        dob: r.dateOfBirth,
        dateOfBirth: r.dateOfBirth,
        studentType: r.studentType,
        status: r.status,
        campus: {
          id: r.campusId,
          code: r.campusCode,
          name: r.campusName,
        },
        academicYear: {
          id: r.academicYearId,
          name: r.academicYearName,
        },
        class: {
          id: r.classId,
          name: r.className,
          grade: r.grade,
        },
        homeroomTeacher: r.homeroomTeacherName
          ? {
              name: r.homeroomTeacherName,
              email: r.homeroomTeacherEmail,
            }
          : null,
        parentsContact,
        termGradesSummary,
        achievementsCount: Array.isArray(achievementsSummary) ? achievementsSummary.length : 0,
        lastSyncedAt: r.lastSyncedAt,
      }
    })

    const durationMs = Date.now() - startTime
    logApiAccess({
      apiKeyId: context.keyId,
      endpoint: "/api/v1/unified/students",
      method: "GET",
      statusCode: 200,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      durationMs,
    }).catch(() => {})

    return apiSuccess(
      items,
      requestId,
      {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        filters: {
          campusId: requestedCampusId || null,
          classId: requestedClassId || null,
          grade: requestedGrade || null,
          status,
        },
        privacyMasking: {
          contactMasked: !canReadSensitiveContact,
          standard: "Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân)",
        },
        pretty: searchParams.get("pretty") === "true" || searchParams.has("pretty") || !request.headers.get("authorization"),
      }
    )
  } catch (error: any) {
    return apiError("INTERNAL_ERROR", error?.message || "Lỗi truy vấn danh sách học sinh", 500, requestId)
  }
}
