import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || "getRecords"
  const rawAcademicYearId = searchParams.get("academicYearId") || ""
  const classId = searchParams.get("classId")
  const search = searchParams.get("search")

  try {
    let academicYearId = rawAcademicYearId
    if (rawAcademicYearId && rawAcademicYearId !== "all") {
      const yearObj = await prisma.academicYear.findFirst({
        where: {
          OR: [
            { id: rawAcademicYearId },
            { name: rawAcademicYearId }
          ]
        }
      })
      if (yearObj) {
        academicYearId = yearObj.id
      }
    } else {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
      if (activeYear) academicYearId = activeYear.id
    }

    const userRole = (session.user as any)?.role || ""
    const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL", "ADMINISTRATOR"].includes(userRole)

    const teacher = !isKTDBCL
      ? await prisma.teacher.findUnique({ where: { userId: session.user.id } })
      : null

    let allowedClassIds: string[] = []
    let isHuongNghiepTeacher = false
    let isHomeroomTeacher = false

    if (teacher) {
      // Find classes where teacher is GVCN in this academic year
      const homeroomClasses = await prisma.class.findMany({
        where: {
          status: "ACTIVE",
          ...(academicYearId ? { academicYearId } : {}),
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ]
        },
        select: { id: true }
      })

      if (homeroomClasses.length > 0) {
        isHomeroomTeacher = true
      }

      // Find teaching assignments specifically for Hướng nghiệp / Hoạt động trải nghiệm, hướng nghiệp
      const huongNghiepAssignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId: teacher.id,
          ...(academicYearId ? { academicYearId } : {}),
          subject: {
            OR: [
              { subjectCode: { contains: "HNG" } },
              { subjectName: { contains: "Hướng nghiệp" } },
              { subjectName: { contains: "Huong nghiep" } },
              { subjectName: { contains: "Trải nghiệm" } }
            ]
          }
        },
        select: { classId: true }
      })

      if (huongNghiepAssignments.length > 0) {
        isHuongNghiepTeacher = true
      }

      allowedClassIds = Array.from(new Set([
        ...homeroomClasses.map(c => c.id),
        ...huongNghiepAssignments.map(a => a.classId)
      ]))
    }

    if (action === "getAssignedClasses") {
      if (teacher && !isKTDBCL && !isHomeroomTeacher && !isHuongNghiepTeacher) {
        // Teacher is neither GVCN nor assigned to Hướng nghiệp -> Return empty list strictly
        return NextResponse.json([])
      }

      const classWhere: any = {
        status: "ACTIVE",
        ...(academicYearId ? { academicYearId } : {})
      }

      if (teacher && !isKTDBCL) {
        classWhere.id = { in: allowedClassIds }
      }

      const classes = await prisma.class.findMany({
        where: classWhere,
        orderBy: { className: "asc" }
      })
      
      return NextResponse.json(classes)
    }

    if (action === "getRecords" || action === "getLogbook") {
      let students: any[] = []

      if (classId) {
        const targetClass = await prisma.class.findUnique({ where: { id: classId } })
        if (targetClass) {
          const strictWhere: any = { 
            classId: targetClass.id,
            status: "ACTIVE"
          }
          if (search) {
            strictWhere.OR = [
              { studentCode: { contains: search } },
              { studentName: { contains: search } }
            ]
          }
          students = await prisma.student.findMany({
            where: strictWhere,
            include: {
              class: { select: { id: true, className: true, classCode: true, homeroomTeacherId: true, academicYearId: true } },
              campus: { select: { id: true, campusName: true } },
              careerOrientations: {
                where: academicYearId ? { academicYearId } : {}
              }
            },
            orderBy: { studentName: "asc" }
          })
        }
      } else {
        if (teacher && !isKTDBCL && allowedClassIds.length === 0) {
          return NextResponse.json([])
        }

        const studentWhere: any = { status: "ACTIVE" }
        if (teacher && !isKTDBCL) {
          studentWhere.classId = { in: allowedClassIds }
        } else if (academicYearId) {
          studentWhere.class = { academicYearId }
        }

        if (search) {
          studentWhere.OR = [
            { studentCode: { contains: search } },
            { studentName: { contains: search } }
          ]
        }

        students = await prisma.student.findMany({
          where: studentWhere,
          include: {
            class: { select: { id: true, className: true, classCode: true, homeroomTeacherId: true, academicYearId: true } },
            campus: { select: { id: true, campusName: true } },
            careerOrientations: {
              where: academicYearId ? { academicYearId } : {}
            }
          },
          orderBy: { studentName: "asc" },
          take: 200
        })
      }

      return NextResponse.json(students)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("Error in GET /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { studentId, academicYearId, surveyResult, initialOrientation, gvcnRemark, gvbmRemark, counselingResult, status, notes } = body

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 })
    }

    let yearId = academicYearId
    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
      yearId = activeYear?.id || ""
    }

    const existing = await prisma.careerOrientation.findFirst({
      where: {
        studentId,
        academicYearId: yearId
      }
    })

    let record
    if (existing) {
      record = await prisma.careerOrientation.update({
        where: { id: existing.id },
        data: {
          surveyResult: surveyResult !== undefined ? surveyResult : existing.surveyResult,
          initialOrientation: initialOrientation !== undefined ? initialOrientation : existing.initialOrientation,
          gvcnRemark: gvcnRemark !== undefined ? gvcnRemark : existing.gvcnRemark,
          gvbmRemark: gvbmRemark !== undefined ? gvbmRemark : existing.gvbmRemark,
          counselingResult: counselingResult !== undefined ? counselingResult : existing.counselingResult,
          status: status !== undefined ? status : existing.status,
          notes: notes !== undefined ? notes : existing.notes
        }
      })
    } else {
      record = await prisma.careerOrientation.create({
        data: {
          studentId,
          academicYearId: yearId,
          surveyResult: surveyResult || "",
          initialOrientation: initialOrientation || "",
          gvcnRemark: gvcnRemark || "",
          gvbmRemark: gvbmRemark || "",
          counselingResult: counselingResult || "",
          status: status || "CHUA_TU_VAN",
          notes: notes || ""
        }
      })
    }

    return NextResponse.json({ success: true, record })
  } catch (err: any) {
    console.error("Error in POST /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await prisma.careerOrientation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Error in DELETE /api/ktdbcl/huong-nghiep:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
