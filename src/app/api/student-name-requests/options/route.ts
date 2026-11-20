import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { sortVietnameseStudents } from "@/lib/vietnameseSort"
import {
  canUserAccessNameChange,
  canUserApproveNameChange,
  sortGradeValues,
} from "@/lib/student-name-requests/helpers"

export const dynamic = "force-dynamic"

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

    const sp = req.nextUrl.searchParams
    const academicYearIdParam = sp.get("academicYearId")
    const classIdParam = sp.get("classId")

    let cookieYearId: string | undefined
    try {
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieYearId = cookieStore.get("selectedAcademicYear")?.value
    } catch {}

    let activeYearId = academicYearIdParam || cookieYearId
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
        activeYearId = defYear.id
      }
    }

    // Fetch classes for the active academic year
    const classWhere: Record<string, unknown> = { status: "ACTIVE" }
    if (activeYear?.id) {
      classWhere.academicYearId = activeYear.id
    }

    // Scope by campus if user has explicit campus assignments and is not ADMIN/SUPER_ADMIN
    const roleUpper = (role || "").toUpperCase().trim()
    const isSystemAdmin = roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN" || roleUpper === "SUPERADMIN"
    if (!isSystemAdmin && session.user.id) {
      const assignments = await prisma.userCampusAssignment.findMany({
        where: { userId: session.user.id },
        select: { campusId: true },
      })
      if (assignments.length > 0) {
        classWhere.campusId = { in: assignments.map((a) => a.campusId) }
      }
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      select: {
        id: true,
        classCode: true,
        className: true,
        grade: true,
        level: true,
        campusId: true,
        campus: {
          select: {
            campusCode: true,
            campusName: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }],
    })

    const grades = sortGradeValues(classes.map((c) => c.grade || c.level || ""))

    let students: Array<{
      id: string
      studentCode: string
      vnEduCode: string | null
      studentName: string
      gender: string | null
      dateOfBirth: Date | null
      status: string
      classId: string
    }> = []
    if (classIdParam) {
      const rawStudents = await prisma.student.findMany({
        where: {
          classId: classIdParam,
          status: { not: "TRANSFERRED_OUT" },
        },
        select: {
          id: true,
          studentCode: true,
          vnEduCode: true,
          studentName: true,
          gender: true,
          dateOfBirth: true,
          status: true,
          classId: true,
        },
      })
      students = sortVietnameseStudents(rawStudents)
    }

    const canApprove = await canUserApproveNameChange(role)

    return NextResponse.json({
      academicYear: activeYear,
      grades,
      classes: classes.map((c) => ({
        id: c.id,
        classCode: c.classCode,
        className: c.className,
        grade: c.grade || c.level || "",
        level: c.level,
        campusId: c.campusId,
        campusCode: c.campus?.campusCode || "",
        campusName: c.campus?.campusName || "",
      })),
      students,
      permissions: {
        canApprove,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải danh mục lớp học."
    console.error("[GET /api/student-name-requests/options] Error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
