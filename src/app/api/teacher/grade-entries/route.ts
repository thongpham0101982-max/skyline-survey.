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
      } else {
        teachingAssignments = await prisma.teachingAssignment.findMany({
          where: academicYearId ? { academicYearId } : {},
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
      } else {
        availableClasses = await prisma.class.findMany({
          where: { status: "ACTIVE", ...(academicYearId ? { academicYearId } : {}) },
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

    const targetClass = await prisma.class.findUnique({ where: { id: classId } })
    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Lớp học không tồn tại" }, { status: 404 })
    }

    const classGrade = targetClass.grade || targetClass.className || "ALL"
    const targetAcademicYearId = academicYearId || targetClass.academicYearId

    let config = await prisma.subjectGradeConfig.findFirst({
      where: {
        academicYearId: targetAcademicYearId,
        OR: [{ grade: classGrade }, { grade: "ALL" }],
        OR: [{ subjectId }, { subjectId: null }],
        OR: [{ evaluationPeriod }, { evaluationPeriod: "ALL" }]
      },
      orderBy: { createdAt: "desc" }
    })

    if (!config) {
      config = {
        id: "default",
        academicYearId: targetAcademicYearId,
        grade: classGrade,
        subjectId,
        evaluationPeriod,
        columnCount: 3,
        columnNames: JSON.stringify(["Cột 1", "Cột 2", "Cột 3"]),
        hasCompositeColumn: true,
        hasRemarkColumn: true,
        formula: "AVERAGE",
        status: "ACTIVE"
      } as any
    }

    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" }
    })

    const entries = await prisma.subjectGradeEntry.findMany({
      where: {
        classId,
        subjectId,
        evaluationPeriod,
        academicYearId: targetAcademicYearId
      }
    })

    return NextResponse.json({
      success: true,
      classInfo: targetClass,
      config,
      students,
      entries
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const { classId, subjectId, evaluationPeriod, academicYearId, entries } = body

    if (!classId || !subjectId || !evaluationPeriod || !academicYearId || !Array.isArray(entries)) {
      return NextResponse.json({ success: false, error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 })
    }

    let teacherId = null
    if ((session?.user as any)?.id) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: (session.user as any).id } })
      if (teacher) teacherId = teacher.id
    }

    const savedResults = []
    for (const item of entries) {
      const { studentId, componentScores, compositeScore, remark } = item
      if (!studentId) continue

      const componentScoresStr = typeof componentScores === "object" ? JSON.stringify(componentScores) : componentScores

      const existing = await prisma.subjectGradeEntry.findFirst({
        where: {
          studentId,
          subjectId,
          evaluationPeriod,
          academicYearId
        }
      })

      let entryRecord
      if (existing) {
        entryRecord = await prisma.subjectGradeEntry.update({
          where: { id: existing.id },
          data: {
            classId,
            teacherId,
            componentScores: componentScoresStr,
            compositeScore: compositeScore !== undefined && compositeScore !== null && compositeScore !== "" ? Number(compositeScore) : null,
            remark: remark || null
          }
        })
      } else {
        entryRecord = await prisma.subjectGradeEntry.create({
          data: {
            studentId,
            subjectId,
            classId,
            academicYearId,
            evaluationPeriod,
            teacherId,
            componentScores: componentScoresStr,
            compositeScore: compositeScore !== undefined && compositeScore !== null && compositeScore !== "" ? Number(compositeScore) : null,
            remark: remark || null
          }
        })
      }
      savedResults.push(entryRecord)
    }

    return NextResponse.json({ success: true, count: savedResults.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
