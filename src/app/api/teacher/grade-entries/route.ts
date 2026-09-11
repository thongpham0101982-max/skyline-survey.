// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const academicYearId = searchParams.get("academicYearId") || ""
    const classId = searchParams.get("classId") || ""
    const subjectId = searchParams.get("subjectId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"

    let teacher = null
    let userId = (session?.user as any)?.id
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
    }

    const isManage = searchParams.get("isManage") === "true" || searchParams.get("role") === "admin"
    const userRole = ((session?.user as any)?.role || "").toUpperCase().trim()
    const isPrivileged = isManage || ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "BAN_GIAM_HIEU", "BGH", "CM", "TO_TRUONG"].includes(userRole) || (userRole && userRole !== "TEACHER")

    // Action 1: Get list of assigned classes & subjects for teacher
    if (action === "getAssignments") {
      let teachingAssignments: any[] = []
      let availableClasses: any[] = []
      let availableSubjects: any[] = []

      if (teacher) {
        teachingAssignments = await prisma.teachingAssignment.findMany({
          where: academicYearId ? { teacherId: teacher.id, academicYearId } : { teacherId: teacher.id },
          include: { class: true, subject: true }
        })
      }

      if (teachingAssignments.length > 0) {
        const classMap = new Map()
        const subjectMap = new Map()
        teachingAssignments.forEach(ta => {
          if (ta.class) classMap.set(ta.class.id, ta.class)
          if (ta.subject) subjectMap.set(ta.subject.id, ta.subject)
        })
        availableClasses = Array.from(classMap.values())
        availableSubjects = Array.from(subjectMap.values())
      }

      // If privileged user has no personal teaching assignments, load all active classes and subjects
      if (isPrivileged && availableClasses.length === 0) {
        availableClasses = await prisma.class.findMany({
          where: academicYearId ? { academicYearId, status: "ACTIVE" } : { status: "ACTIVE" },
          orderBy: { className: "asc" }
        })
        availableSubjects = await prisma.subject.findMany({
          where: { status: "ACTIVE" },
          orderBy: { subjectName: "asc" }
        })
      }

      return NextResponse.json({
        success: true,
        assignments: teachingAssignments,
        classes: availableClasses,
        subjects: availableSubjects
      })
    }

    // Action 2: Get grade entries for specific classId + subjectId + evaluationPeriod
    if (!classId || !subjectId) {
      return NextResponse.json({ success: true, students: [], config: null, entries: [] })
    }

    // Verify teacher assignment for this class & subject ONLY IF user is strictly a regular teacher and NOT in management mode
    if (teacher && !isPrivileged && userRole === "TEACHER") {
      const isAssigned = await prisma.teachingAssignment.findFirst({
        where: {
          teacherId: teacher.id,
          classId,
          subjectId,
          ...(academicYearId ? { academicYearId } : {})
        }
      })
      if (!isAssigned) {
        return NextResponse.json({ success: true, students: [], config: null, entries: [], unassigned: true })
      }
    }

    const targetClass = await prisma.class.findUnique({ where: { id: classId } })
    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Lớp học không tồn tại" }, { status: 404 })
    }

    const classGrade = targetClass.grade || targetClass.className || "ALL"
    const targetAcademicYearId = academicYearId || targetClass.academicYearId

    // Extract normalized grade numbers for accurate matching
    let rawGrade = (targetClass.grade || "").trim()
    if (!rawGrade && targetClass.className) {
      const match = targetClass.className.match(/^(\d+)/)
      if (match) rawGrade = match[1]
    }
    const numMatch = rawGrade.match(/(\d+)/)
    const gradeNum = numMatch ? numMatch[1] : ""
    const candidateGrades = Array.from(new Set([
      rawGrade,
      `Khối ${gradeNum}`,
      `Khoi ${gradeNum}`,
      gradeNum,
      "ALL"
    ].filter(Boolean)))

    // Fetch evaluation column configuration
    const configs = await prisma.subjectGradeConfig.findMany({
      where: {
        academicYearId: targetAcademicYearId,
        evaluationPeriod: { in: [evaluationPeriod, "ALL"] },
        subjectId,
        grade: { in: candidateGrades }
      }
    })

    let config = configs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === evaluationPeriod)
      || configs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === "ALL")
      || configs.find(c => c.grade === "ALL" && c.evaluationPeriod === evaluationPeriod)
      || configs.find(c => c.grade === "ALL" && c.evaluationPeriod === "ALL")
      || configs[0] || null

    if (!config) {
      const generalConfigs = await prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetAcademicYearId,
          evaluationPeriod: { in: [evaluationPeriod, "ALL"] },
          subjectId: null,
          grade: { in: candidateGrades }
        }
      })
      config = generalConfigs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === evaluationPeriod)
        || generalConfigs.find(c => (c.grade === rawGrade || c.grade === `Khối ${gradeNum}`) && c.evaluationPeriod === "ALL")
        || generalConfigs.find(c => c.grade === "ALL" && c.evaluationPeriod === evaluationPeriod)
        || generalConfigs.find(c => c.grade === "ALL" && c.evaluationPeriod === "ALL")
        || generalConfigs[0] || null
    }

    // Get students in this class
    const students = await prisma.student.findMany({
      where: {
        classId,
        OR: [
          { status: "ACTIVE" },
          { status: "active" },
          { status: null }
        ]
      },
      orderBy: { studentName: "asc" },
      select: { id: true, studentCode: true, studentName: true, gender: true }
    })

    // Get existing grade entries
    const entries = await prisma.gradeEntry.findMany({
      where: {
        academicYearId: targetAcademicYearId,
        classId,
        subjectId,
        evaluationPeriod
      }
    })

    return NextResponse.json({
      success: true,
      config,
      students,
      entries
    })

  } catch (error: any) {
    console.error("Lỗi lấy sổ điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const { academicYearId, classId, subjectId, evaluationPeriod, entries } = body

    if (!classId || !subjectId || !evaluationPeriod || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: "Thiếu dữ liệu sổ điểm" }, { status: 400 })
    }

    let teacherId = null
    const userId = (session?.user as any)?.id
    if (userId) {
      const teacher = await prisma.teacher.findUnique({ where: { userId } })
      if (teacher) teacherId = teacher.id
    }

    // Save or update each grade entry
    for (const entry of entries) {
      const { studentId, componentScores, compositeScore, remark } = entry
      if (!studentId) continue

      const parsedComposite = compositeScore !== "" && compositeScore !== null && compositeScore !== undefined ? parseFloat(compositeScore) : null

      const existing = await prisma.gradeEntry.findFirst({
        where: {
          academicYearId,
          classId,
          subjectId,
          evaluationPeriod,
          studentId
        }
      })

      if (existing) {
        await prisma.gradeEntry.update({
          where: { id: existing.id },
          data: {
            componentScores: JSON.stringify(componentScores || {}),
            compositeScore: isNaN(parsedComposite as any) ? null : parsedComposite,
            remark: remark || "",
            teacherId: teacherId || existing.teacherId
          }
        })
      } else {
        await prisma.gradeEntry.create({
          data: {
            academicYearId,
            classId,
            subjectId,
            evaluationPeriod,
            studentId,
            teacherId,
            componentScores: JSON.stringify(componentScores || {}),
            compositeScore: isNaN(parsedComposite as any) ? null : parsedComposite,
            remark: remark || ""
          }
        })
      }
    }

    return NextResponse.json({ success: true, message: "Lưu sổ điểm thành công" })

  } catch (error: any) {
    console.error("Lỗi lưu sổ điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
