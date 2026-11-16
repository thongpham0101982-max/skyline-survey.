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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const authResult = await validateApiRequest(request, [
    "students:profile:read",
    "students:read",
  ])
  if (!authResult.ok) return authResult.errorResponse!

  const { context, requestId } = authResult
  const { id } = await params
  const studentIdentifier = id?.trim()

  if (!studentIdentifier) {
    return apiError("BAD_REQUEST", "Thiếu định danh học sinh (ID hoặc Mã học sinh)", 400, requestId)
  }

  const pAny = prisma as any

  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "api_snapshot_students" WHERE "studentId" = ? OR "studentCode" = ? LIMIT 1`,
      studentIdentifier,
      studentIdentifier
    )

    if (!rows || rows.length === 0) {
      return apiError("NOT_FOUND", `Không tìm thấy học sinh với định danh "${studentIdentifier}"`, 404, requestId)
    }

    const r = rows[0]
    const { allowedCampusIds, allowedClassIds } = context.application

    // Anti-IDOR Verification
    if (!isCampusInScope(allowedCampusIds, r.campusId)) {
      return apiError(
        "CAMPUS_SCOPE_EXCEEDED",
        `Học sinh thuộc cơ sở "${r.campusName || r.campusId}", ngoài phạm vi ủy quyền của API Key này`,
        403,
        requestId
      )
    }
    if (!isClassInScope(allowedClassIds, r.classId)) {
      return apiError(
        "CLASS_SCOPE_EXCEEDED",
        `Học sinh thuộc lớp "${r.className || r.classId}", ngoài phạm vi lớp được phép truy cập`,
        403,
        requestId
      )
    }

    const canReadSensitiveContact =
      hasPermission(context, "students:contact:read") ||
      hasPermission(context, "students:read") ||
      hasPermission(context, "students:write")

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

    let termGradesSummary: any = []
    if (r.termGradesSummaryJson) {
      try {
        termGradesSummary = JSON.parse(r.termGradesSummaryJson)
      } catch {}
    }

    let achievements: any = []
    if (r.achievementsJson) {
      try {
        achievements = JSON.parse(r.achievementsJson)
      } catch {}
    }

    let hollandOrientation: any = {}
    if (r.hollandOrientationJson) {
      try {
        hollandOrientation = JSON.parse(r.hollandOrientationJson)
      } catch {}
    }

    const payload = {
      studentId: r.studentId,
      studentCode: r.studentCode,
      fullName: r.studentName,
      studentName: r.studentName,
      englishName: r.englishName,
      gender: r.gender,
      dob: r.dateOfBirth,
      dateOfBirth: r.dateOfBirth,
      status: r.status,
      studentType: r.studentType,
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
      achievements,
      hollandOrientation,
      lastSyncedAt: r.lastSyncedAt,
      privacyPolicy: {
        isContactMasked: !canReadSensitiveContact,
        governingLaw: "Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân",
      },
    }

    const durationMs = Date.now() - startTime
    logApiAccess({
      apiKeyId: context.keyId,
      endpoint: `/api/v1/unified/students/${studentIdentifier}`,
      method: "GET",
      statusCode: 200,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      durationMs,
    }).catch(() => {})

    return apiSuccess(payload, requestId)
  } catch (error: any) {
    return apiError("INTERNAL_ERROR", error?.message || "Lỗi nạp chi tiết học sinh", 500, requestId)
  }
}
