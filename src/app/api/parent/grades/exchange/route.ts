import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentChildren } from "@/lib/parentData"

export const dynamic = "force-dynamic"

interface StudentCheck {
  id: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ success: false, error: "Chưa xác thực đăng nhập" }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, academicYearId, evaluationPeriod, parentFeedback } = body as {
      studentId?: string
      academicYearId?: string
      evaluationPeriod?: string
      parentFeedback?: string
    }

    if (!studentId || !evaluationPeriod) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin học sinh hoặc kỳ khảo sát." }, { status: 400 })
    }

    const userRole = user?.role || "PARENT"
    const isAdmin = ["SUPERADMIN", "ADMIN", "BGH", "KTDBCL"].includes(userRole.toUpperCase())

    if (!isAdmin) {
      const allowedStudents = (await getParentChildren(userId, academicYearId || undefined)) as StudentCheck[]
      const hasPermission = allowedStudents.some((s) => s.id === studentId)
      if (!hasPermission) {
        return NextResponse.json({ success: false, error: "Bạn không có quyền gửi ý kiến cho học sinh này." }, { status: 403 })
      }
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            teachers: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh." }, { status: 404 })
    }

    const targetYearId = academicYearId || student.academicYearId || student.class?.academicYearId || ""
    const targetPeriodTag = `[GradePeriod: ${evaluationPeriod}]`

    let teacherId = student.class?.homeroomTeacherId
    if (!teacherId && student.class?.teachers && student.class.teachers.length > 0) {
      teacherId = student.class.teachers[0].teacherId
    }
    if (!teacherId) {
      const fallbackTeacher = await prisma.teacher.findFirst()
      teacherId = fallbackTeacher?.id || ""
    }

    const existingLog = await prisma.academicConsultationLog.findFirst({
      where: {
        studentId,
        academicYearId: targetYearId,
        notes: { contains: targetPeriodTag }
      }
    })

    const cleanFeedback = (parentFeedback || "").trim()

    if (existingLog) {
      const updated = await prisma.academicConsultationLog.update({
        where: { id: existingLog.id },
        data: {
          difficulties: cleanFeedback ? `Ý KIẾN PHHS: ${cleanFeedback}` : null,
          updatedAt: new Date()
        }
      })
      return NextResponse.json({
        success: true,
        message: "Đã cập nhật ý kiến trao đổi với GVCN thành công!",
        logId: updated.id,
        parentFeedback: cleanFeedback,
        updatedAt: updated.updatedAt
      })
    } else {
      const newLog = await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId: teacherId || "UNKNOWN",
          academicYearId: targetYearId,
          meetingDate: new Date(),
          content: `Ý KIẾN GVCN: Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName}. Đề nghị gia đình tiếp tục phối hợp, động viên con phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`,
          difficulties: cleanFeedback ? `Ý KIẾN PHHS: ${cleanFeedback}` : null,
          nextActions: "Tiếp tục đồng hành và theo dõi kết quả học tập",
          notes: `${targetPeriodTag} Trao đổi giữa GVCN và PHHS về kết quả khảo sát`,
          status: "COMPLETED"
        }
      })
      return NextResponse.json({
        success: true,
        message: "Đã gửi ý kiến trao đổi tới GVCN thành công!",
        logId: newLog.id,
        parentFeedback: cleanFeedback,
        updatedAt: newLog.updatedAt
      })
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi lưu trao đổi"
    console.error("POST /api/parent/grades/exchange error:", error)
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
