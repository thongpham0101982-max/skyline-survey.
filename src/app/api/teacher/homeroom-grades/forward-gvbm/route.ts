// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: "Chưa xác thực đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const {
      studentId,
      classId,
      academicYearId,
      evaluationPeriod,
      action, // "ACKNOWLEDGE" | "FORWARD_GVBM"
      subjectId,
      subjectName,
      teacherId,
      teacherName,
      message
    } = body as {
      studentId?: string
      classId?: string
      academicYearId?: string
      evaluationPeriod?: string
      action?: "ACKNOWLEDGE" | "FORWARD_GVBM"
      subjectId?: string
      subjectName?: string
      teacherId?: string
      teacherName?: string
      message?: string
    }

    if (!studentId || !evaluationPeriod) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin học sinh hoặc kỳ khảo sát." },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            campus: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 })
    }

    const targetYearId = academicYearId || student.academicYearId || student.class?.academicYearId || ""
    const targetPeriodTag = `[GradePeriod: ${evaluationPeriod}]`

    // Support normalized period variants
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

    let existingLog = await prisma.academicConsultationLog.findFirst({
      where: {
        studentId,
        academicYearId: targetYearId,
        OR: periodVariants.map(p => ({ notes: { contains: `[GradePeriod: ${p}]` } }))
      },
      orderBy: { updatedAt: "desc" }
    })

    let homeroomTeacherId = student.class?.homeroomTeacherId || ""
    if (!homeroomTeacherId) {
      const fallbackTeacher = await prisma.teacher.findFirst()
      homeroomTeacherId = fallbackTeacher?.id || "UNKNOWN"
    }

    let parentFeedbackText = ""
    if (existingLog?.difficulties) {
      parentFeedbackText = existingLog.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim()
    }

    const now = new Date()

    if (action === "ACKNOWLEDGE") {
      if (existingLog) {
        let nextActions = existingLog.nextActions || ""
        if (!nextActions.includes("[ACKNOWLEDGED]")) {
          nextActions = `[ACKNOWLEDGED] ${nextActions}`.trim()
        }

        const updated = await prisma.academicConsultationLog.update({
          where: { id: existingLog.id },
          data: {
            nextActions,
            updatedAt: now
          }
        })

        return NextResponse.json({
          success: true,
          message: "Đã tiếp nhận ý kiến của PHHS thành công!",
          logId: updated.id,
          isAcknowledged: true,
          acknowledgedAt: now.toISOString()
        })
      } else {
        const newLog = await prisma.academicConsultationLog.create({
          data: {
            studentId,
            teacherId: homeroomTeacherId,
            academicYearId: targetYearId,
            meetingDate: now,
            content: `Ý KIẾN GVCN: Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName}.`,
            difficulties: null,
            nextActions: "[ACKNOWLEDGED] Đã tiếp nhận ý kiến PHHS",
            notes: `${targetPeriodTag} Trao đổi giữa GVCN và PHHS về kết quả khảo sát`,
            status: "COMPLETED"
          }
        })

        return NextResponse.json({
          success: true,
          message: "Đã tiếp nhận ý kiến của PHHS thành công!",
          logId: newLog.id,
          isAcknowledged: true,
          acknowledgedAt: now.toISOString()
        })
      }
    }

    if (action === "FORWARD_GVBM") {
      if (!teacherId || !subjectName) {
        return NextResponse.json(
          { success: false, error: "Vui lòng chọn môn học và Giáo viên bộ môn cần chuyển tiếp." },
          { status: 400 }
        )
      }

      const forwardData = {
        subjectId: subjectId || "",
        subjectName,
        teacherId,
        teacherName: teacherName || "GVBM",
        message: (message || "").trim(),
        forwardedAt: now.toISOString()
      }

      const forwardTag = `[GVBM_FORWARD:${JSON.stringify(forwardData)}]`

      if (existingLog) {
        let nextActions = existingLog.nextActions || ""
        // Remove previous forward tags if any, then append new one
        nextActions = nextActions.replace(/\[GVBM_FORWARD:.*?\]/g, "").trim()
        if (!nextActions.includes("[ACKNOWLEDGED]")) {
          nextActions = `[ACKNOWLEDGED] ${nextActions}`.trim()
        }
        nextActions = `${nextActions} ${forwardTag}`.trim()

        const updated = await prisma.academicConsultationLog.update({
          where: { id: existingLog.id },
          data: {
            nextActions,
            status: "COMPLETED",
            updatedAt: now
          }
        })

        // Notify GVBM
        const gvbm = await prisma.teacher.findUnique({
          where: { id: teacherId },
          select: { userId: true, teacherName: true }
        })

        if (gvbm?.userId) {
          const homeroomName = session?.user?.name || "GVCN"
          const className = student.class?.className || "Lớp"
          const cleanSnippet = parentFeedbackText ? `"${parentFeedbackText.slice(0, 100)}..."` : "Ý kiến cần phối hợp"

          await prisma.notification.create({
            data: {
              userId: gvbm.userId,
              title: `[Ý kiến PHHS] Phối hợp hỗ trợ HS ${student.studentName} - Lớp ${className} (${subjectName})`,
              message: `GVCN ${homeroomName} đã chuyển tiếp ý kiến PHHS: ${cleanSnippet}. Lời nhắn: "${message || 'Nhờ Thầy/Cô hỗ trợ và quan sát học sinh trong tiết học'}"`,
              link: `/teacher/diem-lop-chu-nhiem`
            }
          }).catch((err) => console.error("Lỗi gửi Notification cho GVBM:", err))
        }

        return NextResponse.json({
          success: true,
          message: `Đã chuyển thông tin tới GVBM ${teacherName || ""} (${subjectName}) và gửi thông báo thành công!`,
          logId: updated.id,
          isAcknowledged: true,
          forwardedGvbm: forwardData
        })
      } else {
        const forwardTag = `[GVBM_FORWARD:${JSON.stringify(forwardData)}]`
        const newLog = await prisma.academicConsultationLog.create({
          data: {
            studentId,
            teacherId: homeroomTeacherId,
            academicYearId: targetYearId,
            meetingDate: now,
            content: `Ý KIẾN GVCN: Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName}.`,
            difficulties: null,
            nextActions: `[ACKNOWLEDGED] ${forwardTag}`,
            notes: `${targetPeriodTag} Trao đổi giữa GVCN và PHHS về kết quả khảo sát`,
            status: "COMPLETED"
          }
        })

        // Notify GVBM
        const gvbm = await prisma.teacher.findUnique({
          where: { id: teacherId },
          select: { userId: true, teacherName: true }
        })

        if (gvbm?.userId) {
          const homeroomName = session?.user?.name || "GVCN"
          const className = student.class?.className || "Lớp"

          await prisma.notification.create({
            data: {
              userId: gvbm.userId,
              title: `[Ý kiến PHHS] Phối hợp hỗ trợ HS ${student.studentName} - Lớp ${className} (${subjectName})`,
              message: `GVCN ${homeroomName} đã chuyển tiếp thông tin hỗ trợ bộ môn ${subjectName}. Lời nhắn: "${message || 'Nhờ Thầy/Cô hỗ trợ và quan sát học sinh trong tiết học'}"`,
              link: `/teacher/diem-lop-chu-nhiem`
            }
          }).catch((err) => console.error("Lỗi gửi Notification cho GVBM:", err))
        }

        return NextResponse.json({
          success: true,
          message: `Đã chuyển thông tin tới GVBM ${teacherName || ""} (${subjectName}) và gửi thông báo thành công!`,
          logId: newLog.id,
          isAcknowledged: true,
          forwardedGvbm: forwardData
        })
      }
    }

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ." }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/teacher/homeroom-grades/forward-gvbm error:", error)
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý chuyển thông tin GVBM" }, { status: 500 })
  }
}
