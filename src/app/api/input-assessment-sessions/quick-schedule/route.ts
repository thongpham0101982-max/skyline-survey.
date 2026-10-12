import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as any
    const body = await req.json()

    const {
      // Existing student or new student info
      studentId,
      studentData, // { fullName, dateOfBirth, gender, grade, surveySystem, admissionCriteria, admissionCampus, registeredCampus, periodId, batchId }
      
      // Session info
      existingSessionId,
      sessionDate,
      startTime = "08:30",
      endTime = "10:30",
      room = "Phòng khảo sát",
      campusId,
      academicYearId,
      periodId,
      batchId,
      notes,
      examinerUserIds = []
    } = body

    let targetStudentId = studentId

    // 1. If new student needs to be created
    if (!targetStudentId && studentData) {
      if (!studentData.fullName || !periodId) {
        return NextResponse.json(
          { error: "Vui lòng cung cấp Họ tên học sinh và Kỳ khảo sát." },
          { status: 400 }
        )
      }

      // Generate student code
      const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
        select: { studentCode: true }
      })
      const nums = allStudents.map((s: any) => {
        const match = String(s.studentCode || "").match(/\d+$/)
        return match ? parseInt(match[0], 10) : 0
      }).filter((n: number) => !isNaN(n))
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0
      const nextCode = "HS" + (maxNum + 1).toString().padStart(3, "0")

      const newStudent = await (prisma as any).inputAssessmentStudent.create({
        data: {
          studentCode: nextCode,
          fullName: studentData.fullName.trim(),
          dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
          gender: studentData.gender || null,
          grade: studentData.grade || null,
          surveySystem: studentData.surveySystem || "CLC",
          admissionCriteria: studentData.admissionCriteria || null,
          admissionCampus: studentData.admissionCampus || campusId || null,
          registeredCampus: studentData.registeredCampus || campusId || null,
          periodId: periodId,
          batchId: batchId || null,
          surveyFormType: studentData.surveyFormType || "KHAO_SAT_DAU_VAO",
          createdAt: new Date(),
        }
      })
      targetStudentId = newStudent.id
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: "Không tìm thấy học sinh để xếp lịch." }, { status: 400 })
    }

    // 2. Either link to existing session or create an ad-hoc session
    let targetSessionId = existingSessionId

    if (!targetSessionId) {
      if (!sessionDate || !campusId || !academicYearId) {
        return NextResponse.json(
          { error: "Thiếu ngày khảo sát, cơ sở hoặc năm học để tạo phiên mới." },
          { status: 400 }
        )
      }

      const stObj = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: targetStudentId },
        select: { fullName: true }
      })

      const dateObj = new Date(sessionDate)
      const dateFormatted = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
      const dateCode = dateObj.toISOString().slice(0, 10).replace(/-/g, "")
      const randSuffix = Math.floor(100 + Math.random() * 900)
      const sessionCode = `KS-${dateCode}-${randSuffix}`
      const sessionName = `Khảo sát cá nhân - ${stObj?.fullName || "Học sinh"} (${dateFormatted})`

      const createdSession = await (prisma as any).inputAssessmentSession.create({
        data: {
          sessionCode,
          name: sessionName,
          sessionDate: dateObj,
          startTime,
          endTime,
          room,
          campusId,
          academicYearId,
          periodId: periodId || null,
          batchId: batchId || null,
          maxCapacity: 5,
          sessionType: "LE",
          status: "SCHEDULED",
          notes: notes || "Xếp lịch nhanh đột xuất",
          createdById: user?.id || null,
          examiners: {
            create: examinerUserIds.map((uId: string) => ({
              userId: uId,
              role: "EXAMINER"
            }))
          }
        }
      })
      targetSessionId = createdSession.id
    }

    // 3. Link student to session
    const studentSession = await (prisma as any).inputAssessmentStudentSession.upsert({
      where: {
        sessionId_studentId: {
          sessionId: targetSessionId,
          studentId: targetStudentId
        }
      },
      create: {
        sessionId: targetSessionId,
        studentId: targetStudentId,
        status: "ASSIGNED",
        note: notes || null
      },
      update: {
        note: notes || undefined
      }
    })

    const fullSession = await (prisma as any).inputAssessmentSession.findUnique({
      where: { id: targetSessionId },
      include: {
        campus: true,
        academicYear: true,
        period: true,
        batch: true,
        examiners: { include: { user: true } },
        studentSessions: {
          include: {
            student: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Đã xếp lịch khảo sát thành công trong 1 bước!",
      session: fullSession,
      studentSession
    })
  } catch (error: any) {
    console.error("POST /api/input-assessment-sessions/quick-schedule error:", error)
    return NextResponse.json({ error: error.message || "Lỗi xếp lịch nhanh." }, { status: 500 })
  }
}
