import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { isPrivilegedGradebookRole } from "@/lib/security-guard"
import {
  PARENT_GRADE_PERIODS,
  PARENT_GRADE_VISIBILITY_CATEGORY,
  getLockedParentGradePeriods,
  getParentGradeVisibilityMap,
  normalizeParentGradePeriod,
  type ParentGradePeriodCode,
} from "@/lib/grading/parent-grade-visibility"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "TB_DHCM",
  "GDCS",
  "GD_CS",
  "BGH",
]

async function resolveAcademicYearId(rawYearId?: string | null): Promise<string | null> {
  if (rawYearId && rawYearId !== "ALL" && rawYearId !== "all") {
    return rawYearId
  }
  const activeYear = await getDefaultAcademicYear(prisma)
  return activeYear?.id || null
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Chưa xác thực đăng nhập" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = await resolveAcademicYearId(searchParams.get("academicYearId"))

    const visibilityMap = await getParentGradeVisibilityMap(prisma, academicYearId)
    const periods = PARENT_GRADE_PERIODS.map((p) => visibilityMap[p.code])
    const lockedPeriods = getLockedParentGradePeriods(visibilityMap)

    return NextResponse.json({
      success: true,
      academicYearId,
      periods,
      lockedPeriods,
      visibilityMap,
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi hệ thống"
    console.error("Lỗi lấy cấu hình khóa xem điểm PHHS:", error)
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      )
    }

    const user = session.user as { role?: string; roles?: string[]; name?: string; fullName?: string }
    const role = (user.role || "").toUpperCase().trim()
    const userRoles = Array.isArray(user.roles) ? user.roles : []

    const isAllowed =
      isPrivilegedGradebookRole(role, userRoles) || ALLOWED_ROLES.includes(role)

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Bạn không có quyền cấu hình hiển thị điểm PHHS" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const academicYearId = await resolveAcademicYearId(body?.academicYearId)
    const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
    const updatedBy = user.name || user.fullName || "Quản trị viên Khảo thí"
    const updatedAt = new Date().toISOString()

    // Support both single-period toggle and batch update
    const updates: Array<{ period: ParentGradePeriodCode; isLocked: boolean }> = []

    if (body?.periods && typeof body.periods === "object") {
      for (const [rawKey, rawVal] of Object.entries(body.periods)) {
        const period = normalizeParentGradePeriod(rawKey)
        if (period && typeof rawVal === "boolean") {
          updates.push({ period, isLocked: rawVal })
        }
      }
    } else if (body?.period !== undefined && typeof body?.isLocked === "boolean") {
      const period = normalizeParentGradePeriod(body.period)
      if (!period) {
        return NextResponse.json(
          { success: false, error: "Kỳ đánh giá không hợp lệ" },
          { status: 400 }
        )
      }
      updates.push({ period, isLocked: Boolean(body.isLocked) })
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Thiếu dữ liệu kỳ đánh giá cần cập nhật" },
        { status: 400 }
      )
    }

    for (const item of updates) {
      const payload = JSON.stringify({
        isLocked: item.isLocked,
        updatedBy,
        updatedAt,
        reason:
          reason ||
          (item.isLocked
            ? `Khóa xem điểm kỳ ${item.period} trên giao diện PHHS`
            : `Mở xem điểm kỳ ${item.period} trên giao diện PHHS`),
      })

      const existing = await prisma.assessmentConfig.findFirst({
        where: {
          categoryType: PARENT_GRADE_VISIBILITY_CATEGORY,
          code: item.period,
          academicYearId: academicYearId ?? null,
        },
        select: { id: true },
      })

      if (existing) {
        await prisma.assessmentConfig.update({
          where: { id: existing.id },
          data: { name: payload, status: "ACTIVE" },
        })
      } else {
        await prisma.assessmentConfig.create({
          data: {
            categoryType: PARENT_GRADE_VISIBILITY_CATEGORY,
            code: item.period,
            name: payload,
            status: "ACTIVE",
            sortOrder: PARENT_GRADE_PERIODS.findIndex((p) => p.code === item.period),
            academicYearId: academicYearId ?? null,
          },
        })
      }
    }

    const visibilityMap = await getParentGradeVisibilityMap(prisma, academicYearId)
    const periods = PARENT_GRADE_PERIODS.map((p) => visibilityMap[p.code])
    const lockedPeriods = getLockedParentGradePeriods(visibilityMap)

    return NextResponse.json({
      success: true,
      academicYearId,
      periods,
      lockedPeriods,
      visibilityMap,
      message:
        updates.length === 1
          ? updates[0].isLocked
            ? `Đã khóa xem điểm kỳ ${updates[0].period} trên cổng PHHS.`
            : `Đã mở xem điểm kỳ ${updates[0].period} trên cổng PHHS.`
          : `Đã cập nhật trạng thái hiển thị điểm PHHS cho ${updates.length} kỳ đánh giá.`,
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi hệ thống"
    console.error("Lỗi cập nhật cấu hình khóa xem điểm PHHS:", error)
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    )
  }
}
