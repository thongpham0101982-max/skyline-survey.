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
      academicYearId,
      evaluationPeriod,
      teacherRemark,
      parentFeedback,
      nextActions
    } = body as {
      studentId?: string
      academicYearId?: string
      evaluationPeriod?: string
      teacherRemark?: string
      parentFeedback?: string
      nextActions?: string
    }

    if (!studentId || !evaluationPeriod) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin học sinh hoặc kỳ khảo sát." },
        { status: 400 }
      )
    }

    const userId = (session?.user as any)?.id || ""
    const userRole = (session?.user as any)?.role || "TEACHER"
    const userEmail = session?.user?.email || ""

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
      return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 })
    }

    const targetYearId = academicYearId || student.academicYearId || student.class?.academicYearId || ""
    const targetPeriodTag = `[GradePeriod: ${evaluationPeriod}]`

    // Determine teacherId to attribute
    let teacherId = teacher?.id || student.class?.homeroomTeacherId
    if (!teacherId && student.class?.teachers && student.class.teachers.length > 0) {
      teacherId = student.class.teachers[0].teacherId
    }
    if (!teacherId) {
      const fallbackTeacher = await prisma.teacher.findFirst()
      teacherId = fallbackTeacher?.id || ""
    }

    // Check for existing consultation log for this student & period
    // Also support normalized period variants (e.g. KSĐN / KSDN)
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

    const existingLog = await prisma.academicConsultationLog.findFirst({
      where: {
        studentId,
        academicYearId: targetYearId,
        OR: periodVariants.map(p => ({ notes: { contains: `[GradePeriod: ${p}]` } }))
      },
      orderBy: { updatedAt: "desc" }
    })

    const cleanTeacherRemark = (teacherRemark || "").trim()
    const cleanParentFeedback = parentFeedback !== undefined ? parentFeedback.trim() : null

    if (existingLog) {
      const updateData: any = {
        updatedAt: new Date()
      }

      if (teacherRemark !== undefined) {
        updateData.content = cleanTeacherRemark ? `Ý KIẾN GVCN: ${cleanTeacherRemark}` : ""
        updateData.meetingDate = new Date()
      }

      if (cleanParentFeedback !== null) {
        updateData.difficulties = cleanParentFeedback ? `Ý KIẾN PHHS: ${cleanParentFeedback}` : null
      }

      if (nextActions !== undefined) {
        updateData.nextActions = nextActions.trim()
      }

      const updated = await prisma.academicConsultationLog.update({
        where: { id: existingLog.id },
        data: updateData
      })

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật nhận xét GVCN và trao đổi với PHHS thành công!",
        logId: updated.id,
        teacherRemark: cleanTeacherRemark,
        teacherRemarkDate: updated.meetingDate || updated.updatedAt,
        parentFeedback: cleanParentFeedback !== null ? cleanParentFeedback : (existingLog.difficulties ? existingLog.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim() : ""),
        parentFeedbackDate: updated.updatedAt
      })
    } else {
      const newLog = await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId: teacherId || "UNKNOWN",
          academicYearId: targetYearId,
          meetingDate: new Date(),
          content: cleanTeacherRemark ? `Ý KIẾN GVCN: ${cleanTeacherRemark}` : `Ý KIẾN GVCN: Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`,
          difficulties: cleanParentFeedback ? `Ý KIẾN PHHS: ${cleanParentFeedback}` : null,
          nextActions: nextActions || "Tiếp tục đồng hành và theo dõi kết quả học tập",
          notes: `${targetPeriodTag} Trao đổi giữa GVCN và PHHS về kết quả khảo sát`,
          status: "COMPLETED"
        }
      })

      return NextResponse.json({
        success: true,
        message: "Đã lưu nhận xét GVCN vào hệ thống thành công!",
        logId: newLog.id,
        teacherRemark: cleanTeacherRemark || `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`,
        teacherRemarkDate: newLog.meetingDate,
        parentFeedback: cleanParentFeedback || "",
        parentFeedbackDate: newLog.updatedAt
      })
    }
  } catch (error: any) {
    console.error("POST /api/teacher/homeroom-grades/exchange error:", error)
    return NextResponse.json({ success: false, error: error.message || "Lỗi lưu nhận xét và trao đổi" }, { status: 500 })
  }
}
