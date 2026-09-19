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

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const classId = searchParams.get("classId") || ""
    const subjectId = searchParams.get("subjectId") || ""

    if (!classId || !subjectId) {
      return NextResponse.json({ success: true, request: null })
    }

    const latestRequest = await prisma.gradebookUnlockRequest.findFirst({
      where: {
        academicYearId,
        evaluationPeriod,
        classId,
        subjectId,
        status: { not: "CANCELLED" }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      success: true,
      request: latestRequest || null
    })
  } catch (error: any) {
    console.error("Lỗi lấy thông tin yêu cầu mở sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để gửi yêu cầu" }, { status: 401 })
    }

    const body = await request.json()
    const { academicYearId, evaluationPeriod = "KSĐN", classId, subjectId, reason } = body

    if (!academicYearId || !classId || !subjectId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin phân công lớp/môn học" }, { status: 400 })
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập lý do yêu cầu mở sổ" }, { status: 400 })
    }

    const userId = (session.user as any)?.id
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } })
    }

    const teacherName = teacher?.teacherName || (session.user as any)?.name || "Giáo viên"
    const teacherEmail = teacher?.email || (session.user as any)?.email || null

    // Check if there is already a pending request
    const existingPending = await prisma.gradebookUnlockRequest.findFirst({
      where: {
        academicYearId,
        evaluationPeriod,
        classId,
        subjectId,
        status: "PENDING"
      }
    })

    if (existingPending) {
      return NextResponse.json({
        success: false,
        error: "Yêu cầu mở sổ cho môn này đang trong trạng thái chờ Ban Khảo thí duyệt. Vui lòng không gửi lặp lại."
      }, { status: 400 })
    }

    // Get class and subject details for notification
    const [cls, sub] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId }, select: { className: true } }),
      prisma.subject.findUnique({ where: { id: subjectId }, select: { subjectName: true } })
    ])

    const createdRequest = await prisma.gradebookUnlockRequest.create({
      data: {
        academicYearId,
        evaluationPeriod,
        classId,
        subjectId,
        teacherId: teacher?.id || null,
        teacherName,
        teacherEmail,
        reason: reason.trim(),
        status: "PENDING"
      }
    })

    // Notify admins / KT_DBCL
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL"] },
          status: "ACTIVE"
        },
        select: { id: true }
      })

      if (admins.length > 0) {
        const notifData = admins.map(admin => ({
          userId: admin.id,
          title: "Yêu cầu mở sổ điểm mới",
          message: `Giáo viên ${teacherName} gửi yêu cầu mở sổ môn ${sub?.subjectName || ''} - lớp ${cls?.className || ''} (${evaluationPeriod}): "${reason.trim().slice(0, 80)}..."`,
          link: "/admin/ktdbcl/diem-nhan-xet"
        }))
        await prisma.notification.createMany({ data: notifData })
      }
    } catch (notifErr) {
      console.error("Lỗi gửi thông báo cho Admin:", notifErr)
    }

    return NextResponse.json({
      success: true,
      request: createdRequest,
      message: "Gửi yêu cầu mở sổ điểm thành công! Vui lòng chờ Ban Khảo thí & ĐBCL xét duyệt."
    })
  } catch (error: any) {
    console.error("Lỗi tạo yêu cầu mở sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("requestId")

    if (!requestId) {
      return NextResponse.json({ success: false, error: "Thiếu ID yêu cầu" }, { status: 400 })
    }

    const reqRecord = await prisma.gradebookUnlockRequest.findUnique({
      where: { id: requestId }
    })

    if (!reqRecord) {
      return NextResponse.json({ success: false, error: "Không tìm thấy yêu cầu" }, { status: 404 })
    }

    if (reqRecord.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Chỉ có thể hủy yêu cầu đang ở trạng thái Chờ duyệt" }, { status: 400 })
    }

    await prisma.gradebookUnlockRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" }
    })

    return NextResponse.json({
      success: true,
      message: "Đã hủy yêu cầu mở sổ thành công."
    })
  } catch (error: any) {
    console.error("Lỗi hủy yêu cầu mở sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
