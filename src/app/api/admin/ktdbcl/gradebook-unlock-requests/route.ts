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

    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI", "TB_DHCM", "GDCS"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền truy cập trang này" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "ALL"
    const status = searchParams.get("status") || "ALL"
    const search = (searchParams.get("search") || "").toLowerCase().trim()

    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      })
      targetYearId = activeYear?.id || ""
    }

    const whereClause: any = {}
    if (targetYearId) {
      whereClause.academicYearId = targetYearId
    }
    if (evaluationPeriod && evaluationPeriod !== "ALL") {
      whereClause.evaluationPeriod = evaluationPeriod
    }
    if (status && status !== "ALL") {
      whereClause.status = status
    }

    // Query requests and pending count
    const [allRequests, pendingCount] = await Promise.all([
      prisma.gradebookUnlockRequest.findMany({
        where: whereClause,
        orderBy: { requestedAt: "desc" }
      }),
      prisma.gradebookUnlockRequest.count({
        where: {
          ...(targetYearId ? { academicYearId: targetYearId } : {}),
          status: "PENDING"
        }
      })
    ])

    // Load classes and subjects for enrichment
    const classIds = Array.from(new Set(allRequests.map(r => r.classId)))
    const subjectIds = Array.from(new Set(allRequests.map(r => r.subjectId)))

    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({
        where: { id: { in: classIds } },
        include: { campus: { select: { id: true, campusName: true, campusCode: true } } }
      }),
      prisma.subject.findMany({
        where: { id: { in: subjectIds } }
      })
    ])

    const classMap = new Map(classes.map(c => [c.id, c]))
    const subjectMap = new Map(subjects.map(s => [s.id, s]))

    // Enrich requests
    const enriched = allRequests.map(r => {
      const cls = classMap.get(r.classId)
      const sub = subjectMap.get(r.subjectId)
      return {
        ...r,
        className: cls?.className || "Không xác định",
        grade: cls?.grade || "",
        campusName: cls?.campus?.campusName || "",
        campusCode: cls?.campus?.campusCode || "",
        subjectName: sub?.subjectName || "Không xác định",
        subjectCode: sub?.subjectCode || ""
      }
    })

    // Filter by search query if present
    const filtered = search
      ? enriched.filter(r =>
          r.teacherName?.toLowerCase().includes(search) ||
          r.className?.toLowerCase().includes(search) ||
          r.subjectName?.toLowerCase().includes(search) ||
          r.reason?.toLowerCase().includes(search)
        )
      : enriched

    return NextResponse.json({
      success: true,
      requests: filtered,
      pendingCount,
      totalCount: enriched.length
    })
  } catch (error: any) {
    console.error("Lỗi lấy danh sách yêu cầu mở sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập" }, { status: 401 })
    }

    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI", "TB_DHCM", "GDCS"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền duyệt yêu cầu mở sổ điểm" }, { status: 403 })
    }

    const userName = (session.user as any)?.name || (session.user as any)?.fullName || "Ban Khảo thí & ĐBCL"

    const body = await request.json()
    const { requestId, action, note = "" } = body

    if (!requestId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ success: false, error: "Dữ liệu thao tác không hợp lệ" }, { status: 400 })
    }

    const reqRecord = await prisma.gradebookUnlockRequest.findUnique({
      where: { id: requestId }
    })

    if (!reqRecord) {
      return NextResponse.json({ success: false, error: "Không tìm thấy yêu cầu mở sổ này" }, { status: 404 })
    }

    const now = new Date()

    // Get class and subject details for clear notification
    const [cls, sub] = await Promise.all([
      prisma.class.findUnique({ where: { id: reqRecord.classId }, select: { className: true } }),
      prisma.subject.findUnique({ where: { id: reqRecord.subjectId }, select: { subjectName: true } })
    ])
    const clsName = cls?.className || "Lớp"
    const subName = sub?.subjectName || "Môn học"

    let teacherUserId = null
    if (reqRecord.teacherId) {
      const t = await prisma.teacher.findUnique({ where: { id: reqRecord.teacherId }, select: { userId: true } })
      teacherUserId = t?.userId
    }
    if (!teacherUserId && reqRecord.teacherEmail) {
      const u = await prisma.user.findUnique({ where: { email: reqRecord.teacherEmail }, select: { id: true } })
      teacherUserId = u?.id
    }

    if (action === "APPROVE") {
      // 1. Update request record
      const updated = await prisma.gradebookUnlockRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          resolvedAt: now,
          resolvedBy: userName,
          resolvedNote: note || "Đã duyệt yêu cầu mở sổ"
        }
      })

      // 2. Unlock the gradebook in GradebookLock
      await prisma.gradebookLock.upsert({
        where: {
          academicYearId_evaluationPeriod_classId_subjectId: {
            academicYearId: reqRecord.academicYearId,
            evaluationPeriod: reqRecord.evaluationPeriod,
            classId: reqRecord.classId,
            subjectId: reqRecord.subjectId
          }
        },
        update: {
          isLocked: false,
          lockedBy: userName,
          lockedAt: null,
          lockReason: `Mở khóa theo yêu cầu của GV ${reqRecord.teacherName || ""}${note ? `: ${note}` : ""}`
        },
        create: {
          academicYearId: reqRecord.academicYearId,
          evaluationPeriod: reqRecord.evaluationPeriod,
          classId: reqRecord.classId,
          subjectId: reqRecord.subjectId,
          isLocked: false,
          lockedBy: userName,
          lockedAt: null,
          lockReason: `Mở khóa theo yêu cầu của GV ${reqRecord.teacherName || ""}${note ? `: ${note}` : ""}`
        }
      })

      // 3. Notify teacher
      if (teacherUserId) {
        try {
          await prisma.notification.create({
            data: {
              userId: teacherUserId,
              title: "Yêu cầu mở sổ điểm ĐÃ ĐƯỢC DUYỆT ✅",
              message: `Ban Khảo thí & ĐBCL (${userName}) đã duyệt mở sổ điểm môn ${subName} - lớp ${clsName} (Kỳ ${reqRecord.evaluationPeriod}). Bạn có thể vào nhập/chỉnh sửa điểm ngay bây giờ.${note ? ` Ghi chú: ${note}` : ""}`,
              link: `/teacher/so-diem-nhan-xet`
            }
          })
        } catch (notifErr) {
          console.error("Lỗi gửi thông báo duyệt cho GV:", notifErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã duyệt và mở khóa sổ điểm môn ${subName} - ${clsName} thành công!`,
        request: updated
      })
    } else {
      // REJECT
      const updated = await prisma.gradebookUnlockRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          resolvedAt: now,
          resolvedBy: userName,
          resolvedNote: note || "Yêu cầu mở sổ chưa được duyệt"
        }
      })

      // Notify teacher
      if (teacherUserId) {
        try {
          await prisma.notification.create({
            data: {
              userId: teacherUserId,
              title: "Yêu cầu mở sổ điểm KHÔNG ĐƯỢC DUYỆT ❌",
              message: `Ban Khảo thí & ĐBCL (${userName}) đã từ chối yêu cầu mở sổ điểm môn ${subName} - lớp ${clsName} (Kỳ ${reqRecord.evaluationPeriod}).${note ? ` Lý do: ${note}` : ""}`,
              link: `/teacher/so-diem-nhan-xet`
            }
          })
        } catch (notifErr) {
          console.error("Lỗi gửi thông báo từ chối cho GV:", notifErr)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã từ chối yêu cầu mở sổ điểm môn ${subName} - ${clsName}.`,
        request: updated
      })
    }

  } catch (error: any) {
    console.error("Lỗi xử lý yêu cầu mở sổ:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
