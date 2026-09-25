// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const allowedRoles = [
      "ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", 
      "KT_DBCL", "KHAO_THI", "TB_DHCM", "GDCS", 
      "BAN_GIAM_HIEU", "BGH", "HIEU_TRUONG", "PHO_HIEU_TRUONG",
      "CM", "TO_TRUONG"
    ]
    const isAllowed = allowedRoles.includes(role) || (role && role !== "TEACHER" && role !== "STUDENT" && role !== "PARENT")
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền xuất dữ liệu điểm diện rộng" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const campusId = searchParams.get("campusId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSDN"
    const gradeFilter = searchParams.get("grade") || "ALL"
    const subjectIdsParam = searchParams.get("subjectIds") || ""

    // 1. Identify Academic Year
    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      })
      targetYearId = activeYear?.id || ""
    }

    const currentYear = await prisma.academicYear.findUnique({
      where: { id: targetYearId }
    })

    // 2. Identify Campus
    let targetCampus: any = null
    if (campusId && campusId !== "ALL") {
      targetCampus = await prisma.campus.findUnique({
        where: { id: campusId }
      })
    }

    // 3. Build Evaluation Period Variants
    let periodVariants = [evaluationPeriod]
    if (evaluationPeriod === "KSĐN" || evaluationPeriod === "KSDN") {
      periodVariants = ["KSĐN", "KSDN"]
    } else if (evaluationPeriod === "GK1" || evaluationPeriod === "GIUA_KY_1") {
      periodVariants = ["GK1", "GIUA_KY_1"]
    } else if (evaluationPeriod === "CK1" || evaluationPeriod === "CUOI_KY_1") {
      periodVariants = ["CK1", "CUOI_KY_1"]
    } else if (evaluationPeriod === "GK2" || evaluationPeriod === "GIUA_KY_2") {
      periodVariants = ["GK2", "GIUA_KY_2"]
    } else if (evaluationPeriod === "CK2" || evaluationPeriod === "CUOI_KY_2") {
      periodVariants = ["CK2", "CUOI_KY_2"]
    }

    // 4. Fetch Classes for Campus
    const classWhere: any = {
      status: "ACTIVE"
    }
    if (targetYearId) classWhere.academicYearId = targetYearId
    if (campusId && campusId !== "ALL") classWhere.campusId = campusId
    if (gradeFilter && gradeFilter !== "ALL") {
      const cleanGrade = gradeFilter.replace("Khối ", "").trim()
      classWhere.OR = [
        { grade: gradeFilter },
        { grade: cleanGrade },
        { className: { startsWith: cleanGrade + "." } },
        { className: { startsWith: cleanGrade + "/" } }
      ]
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      orderBy: [
        { grade: "asc" },
        { className: "asc" }
      ],
      select: {
        id: true,
        classCode: true,
        className: true,
        grade: true,
        level: true,
        campusId: true,
        homeroomTeacherId: true
      }
    })

    const classIds = classes.map(c => c.id)

    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Không tìm thấy lớp học nào thỏa điều kiện lọc",
        academicYear: currentYear,
        campus: targetCampus,
        evaluationPeriod,
        classes: [],
        students: [],
        subjects: [],
        configs: [],
        entries: [],
        teachers: []
      })
    }

    // 5. Fetch Active Students in these Classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE"
      },
      orderBy: [
        { classId: "asc" },
        { studentName: "asc" }
      ],
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        dateOfBirth: true,
        classId: true
      }
    })

    const studentIds = students.map(s => s.id)

    // 6. Fetch Subjects
    const subjectWhere: any = { status: "ACTIVE" }
    if (subjectIdsParam) {
      const ids = subjectIdsParam.split(",").map(id => id.trim()).filter(Boolean)
      if (ids.length > 0) {
        subjectWhere.id = { in: ids }
      }
    }

    const subjects = await prisma.subject.findMany({
      where: subjectWhere,
      orderBy: { subjectCode: "asc" },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true,
        category: true,
        level: true
      }
    })

    // 7. Fetch Grade Configs
    const configs = await prisma.subjectGradeConfig.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: { in: [...periodVariants, "ALL"] }
      }
    })

    // 8. Fetch Grade Entries
    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: { in: periodVariants },
        OR: [
          { classId: { in: classIds } },
          { studentId: { in: studentIds } }
        ]
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        classId: true,
        evaluationPeriod: true,
        componentScores: true,
        compositeScore: true,
        remark: true
      }
    })

    // 9. Fetch Teaching Assignments (to display assigned teachers per subject/class)
    const teachingAssignments = await prisma.teachingAssignment.findMany({
      where: {
        academicYearId: targetYearId,
        classId: { in: classIds }
      },
      select: {
        classId: true,
        subjectId: true,
        teacher: {
          select: {
            id: true,
            teacherName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      academicYear: currentYear,
      campus: targetCampus,
      evaluationPeriod,
      classes,
      students,
      subjects,
      configs,
      entries,
      teachingAssignments
    })

  } catch (error: any) {
    console.error("Error in /api/admin/ktdbcl/export-grades-bulk:", error)
    return NextResponse.json({
      success: false,
      error: error?.message || "Lỗi máy chủ khi lấy dữ liệu xuất điểm"
    }, { status: 500 })
  }
}
