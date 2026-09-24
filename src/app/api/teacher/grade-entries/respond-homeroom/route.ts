// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để thực hiện thao tác này." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      studentId,
      classId,
      subjectId,
      subjectName,
      evaluationPeriod,
      academicYearId,
      status = "STUDENT_GUIDED",
      statusText = "Đã kèm cặp & hướng dẫn riêng cho học sinh",
      responseContent
    } = body

    if (!studentId || !evaluationPeriod || !responseContent?.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ nội dung phản hồi kết quả hỗ trợ." },
        { status: 400 }
      )
    }

    const userId = (session.user as any)?.id
    const userEmail = session.user?.email || ""

    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } }).catch(() => null)
    }
    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { teacherCode: userEmail },
            { teacherCode: userEmail.split("@")[0] }
          ]
        }
      }).catch(() => null)
    }

    const teacherName = teacher?.teacherName || session.user?.name || "Giáo viên bộ môn"
    const teacherId = teacher?.id || "UNKNOWN"

    // Normalize period variants
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

    // Find student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true
      }
    })

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy học sinh." },
        { status: 404 }
      )
    }

    const targetYearId = academicYearId || student.academicYearId || student.class?.academicYearId || ""
    const targetPeriodTag = `[GradePeriod: ${evaluationPeriod}]`

    // Find existing log
    let existingLog = await prisma.academicConsultationLog.findFirst({
      where: {
        studentId,
        academicYearId: targetYearId,
        OR: periodVariants.map(p => ({ notes: { contains: `[GradePeriod: ${p}]` } }))
      },
      orderBy: { updatedAt: "desc" }
    })

    const now = new Date()

    const responseData = {
      status,
      statusText,
      responseContent: responseContent.trim(),
      respondedAt: now.toISOString(),
      teacherId,
      teacherName,
      subjectId: subjectId || "",
      subjectName: subjectName || "Môn học"
    }

    const responseTag = `[GVBM_RESPONSE:${JSON.stringify(responseData)}]`

    if (existingLog) {
      let nextActions = existingLog.nextActions || ""
      // Remove any existing response tags
      nextActions = nextActions.replace(/\[GVBM_RESPONSE:.*?\]/g, "").trim()
      if (!nextActions.includes("[GVBM_RESPONDED]")) {
        nextActions = `${nextActions} [GVBM_RESPONDED]`.trim()
      }
      nextActions = `${nextActions} ${responseTag}`.trim()

      await prisma.academicConsultationLog.update({
        where: { id: existingLog.id },
        data: {
          nextActions,
          status: "COMPLETED",
          updatedAt: now
        }
      })
    } else {
      // Fallback create
      const homeroomTeacherId = student.class?.homeroomTeacherId || teacherId
      await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId: homeroomTeacherId,
          academicYearId: targetYearId,
          meetingDate: now,
          content: `Ý KIẾN GVCN: Giáo viên chủ nhiệm theo dõi kết quả khảo sát của học sinh ${student.studentName}.`,
          difficulties: null,
          nextActions: `[ACKNOWLEDGED] [GVBM_RESPONDED] ${responseTag}`,
          notes: `${targetPeriodTag} Trao đổi kết quả hỗ trợ giữa GVBM và GVCN`,
          status: "COMPLETED"
        }
      })
    }

    // Notify Homeroom Teacher (GVCN)
    const targetClassId = classId || student.classId
    if (targetClassId) {
      const cls = await prisma.class.findUnique({
        where: { id: targetClassId },
        select: { homeroomTeacherId: true, className: true }
      })

      if (cls?.homeroomTeacherId) {
        const hrTeacher = await prisma.teacher.findUnique({
          where: { id: cls.homeroomTeacherId },
          select: { userId: true, teacherName: true }
        })

        if (hrTeacher?.userId) {
          await prisma.notification.create({
            data: {
              userId: hrTeacher.userId,
              title: `[Phản hồi GVBM] ${teacherName} đã phản hồi kết quả hỗ trợ HS ${student.studentName} (${subjectName || "Môn học"})`,
              message: `GVBM ${teacherName} đã phản hồi kết quả hỗ trợ cho HS ${student.studentName} (Lớp ${cls.className}): "${responseContent.trim().slice(0, 120)}..."`,
              link: `/teacher/diem-lop-chu-nhiem`
            }
          }).catch((err) => console.error("Lỗi gửi Notification cho GVCN:", err))
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu và gửi kết quả phản hồi đến GVCN thành công!`,
      gvbmResponse: responseData
    })

  } catch (error: any) {
    console.error("POST /api/teacher/grade-entries/respond-homeroom error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi xử lý phản hồi GVCN" },
      { status: 500 }
    )
  }
}
