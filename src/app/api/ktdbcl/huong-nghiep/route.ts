import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || "getRecords"
  const academicYearId = searchParams.get("academicYearId")
  const classId = searchParams.get("classId")
  const campusId = searchParams.get("campusId")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  if (!academicYearId) {
    return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 })
  }

  try {
    const userRole = (session.user as any)?.role || ""
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

    const teacher = !isKTDBCL
      ? await prisma.teacher.findUnique({ where: { userId: session.user.id } })
      : null

    let allowedClassIds: string[] = []
    if (teacher) {
      const [assignments, homeroomClasses] = await Promise.all([
        prisma.teachingAssignment.findMany({
          where: { teacherId: teacher.id, academicYearId },
          select: { classId: true }
        }),
        prisma.class.findMany({
          where: {
            academicYearId,
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } }
            ]
          },
          select: { id: true }
        })
      ])
      allowedClassIds = Array.from(new Set([
        ...assignments.map(a => a.classId),
        ...homeroomClasses.map(c => c.id)
      ]))
    }

    if (action === "getAssignedClasses") {
      const classesWhere: any = { academicYearId, status: "ACTIVE" }
      if (teacher) {
        classesWhere.id = { in: allowedClassIds }
      } else if (campusId) {
        classesWhere.campusId = campusId
      }
      const classes = await prisma.class.findMany({
        where: classesWhere,
        orderBy: { className: "asc" }
      })
      return NextResponse.json(classes)
    }

    if (action === "getRecords" || action === "getLogbook") {
      const studentWhere: any = { academicYearId }

      if (classId) {
        studentWhere.classId = classId
      } else if (teacher && allowedClassIds.length > 0) {
        studentWhere.classId = { in: allowedClassIds }
      }

      if (campusId) {
        studentWhere.campusId = campusId
      }

      if (search) {
        studentWhere.OR = [
          { studentCode: { contains: search } },
          { studentName: { contains: search } }
        ]
      }

      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          class: {
            select: { id: true, className: true, classCode: true, homeroomTeacherId: true }
          },
          campus: {
            select: { id: true, campusName: true }
          },
          careerOrientations: {
            where: { academicYearId }
          }
        },
        orderBy: [
          { class: { className: "asc" } },
          { studentName: "asc" }
        ]
      })

      const allHomeroomIds = Array.from(new Set(students.map(s => s.class?.homeroomTeacherId).filter(Boolean))) as string[]
      const homeroomTeachers = allHomeroomIds.length > 0
        ? await prisma.teacher.findMany({
            where: { id: { in: allHomeroomIds } },
            select: { id: true, teacherName: true }
          })
        : []
      const hrMap = new Map(homeroomTeachers.map(t => [t.id, t.teacherName]))

      let records = students.map((s) => {
        const orientation = s.careerOrientations[0] || null
        const defaultCounselor = teacher?.teacherName || hrMap.get(s.class?.homeroomTeacherId || "") || "Ban Khảo thí & ĐBCL"

        return {
          id: orientation?.id || "draft-" + s.id,
          studentId: s.id,
          studentCode: s.studentCode,
          studentName: s.studentName,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth,
          classId: s.classId,
          className: s.class?.className || "N/A",
          campusName: s.campus?.campusName || "N/A",
          academicYearId,

          counselorId: orientation?.teacherId || teacher?.id || null,
          counselorName: orientation?.teacherName || defaultCounselor,
          counselorRole: orientation?.counselorRole || (teacher ? (allowedClassIds.includes(s.classId) ? "GVCN" : "GVBM") : "KTDBCL"),

          surveyResult: orientation?.surveyResult || orientation?.result || null,
          initialOrientation: orientation?.initialOrientation || null,
          gvcnRemark: orientation?.gvcnRemark || null,
          gvbmRemark: orientation?.gvbmRemark || null,
          counselingResult: orientation?.counselingResult || null,
          counselingDate: orientation?.counselingDate || orientation?.createdAt || new Date(),
          status: orientation?.status || "CHUA_TU_VAN",
          notes: orientation?.notes || null,
          isSaved: !!orientation
        }
      })

      if (status && status !== "ALL") {
        records = records.filter(r => r.status === status)
      }

      return NextResponse.json(records)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("Error in GET /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      studentId,
      academicYearId,
      counselorId,
      counselorName,
      counselorRole,
      surveyResult,
      initialOrientation,
      gvcnRemark,
      gvbmRemark,
      counselingResult,
      counselingDate,
      status,
      notes
    } = body

    if (!studentId || !academicYearId) {
      return NextResponse.json({ error: "Missing studentId or academicYearId" }, { status: 400 })
    }

    const currentTeacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })

    const finalCounselorName = counselorName || currentTeacher?.teacherName || session.user.name || "GV Tư vấn"
    const finalCounselorRole = counselorRole || (currentTeacher ? "GVCN" : "KTDBCL")

    const record = await prisma.studentCareerOrientation.upsert({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId
        }
      },
      create: {
        studentId,
        academicYearId,
        teacherId: counselorId || currentTeacher?.id || null,
        teacherName: finalCounselorName,
        counselorRole: finalCounselorRole,
        surveyResult: surveyResult || null,
        initialOrientation: initialOrientation || null,
        gvcnRemark: gvcnRemark || null,
        gvbmRemark: gvbmRemark || null,
        counselingResult: counselingResult || null,
        result: counselingResult || initialOrientation || null,
        counselingDate: counselingDate ? new Date(counselingDate) : new Date(),
        status: status || "DA_TU_VAN",
        notes: notes || null
      },
      update: {
        teacherId: counselorId || currentTeacher?.id || undefined,
        teacherName: finalCounselorName,
        counselorRole: finalCounselorRole,
        surveyResult: surveyResult !== undefined ? surveyResult : undefined,
        initialOrientation: initialOrientation !== undefined ? initialOrientation : undefined,
        gvcnRemark: gvcnRemark !== undefined ? gvcnRemark : undefined,
        gvbmRemark: gvbmRemark !== undefined ? gvbmRemark : undefined,
        counselingResult: counselingResult !== undefined ? counselingResult : undefined,
        result: counselingResult || initialOrientation || undefined,
        counselingDate: counselingDate ? new Date(counselingDate) : undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined
      }
    })

    return NextResponse.json(record)
  } catch (err: any) {
    console.error("Error in POST /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    await prisma.studentCareerOrientation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Error in DELETE /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}