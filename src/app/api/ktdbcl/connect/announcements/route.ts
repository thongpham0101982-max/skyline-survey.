import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  isKtdbclOfficer,
  getTeacherProfileByUserId,
  generateAnnouncementCode,
  sendInAppNotifications
} from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")?.trim() || ""

    const p = prisma as any
    const userRole = (session.user as any)?.role || "TEACHER"
    const isOfficer = isKtdbclOfficer(userRole)

    const where: any = { isPublished: true }

    if (category && category !== "ALL") {
      where.category = category
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { code: { contains: search } }
      ]
    }

    const teacherProfile = await getTeacherProfileByUserId(session.user.id)
    const userCampusCode = teacherProfile?.campusCode || "CS1"

    const announcements = await p.ktdbclAnnouncement.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      include: {
        reads: {
          select: {
            id: true,
            userId: true,
            userName: true,
            campusCode: true,
            readAt: true
          }
        }
      }
    })

    // Xử lý dữ liệu trả về cho từng vai trò
    const formatted = announcements
      .filter((a: any) => {
        if (isOfficer) return true
        // Lọc theo cơ sở
        if (a.targetCampusIds) {
          try {
            const list = JSON.parse(a.targetCampusIds)
            if (Array.isArray(list) && !list.includes("ALL") && !list.includes(userCampusCode)) {
              return false
            }
          } catch {}
        }
        return true
      })
      .map((a: any) => {
        const isRead = a.reads.some((r: any) => r.userId === session.user.id)
        const readCount = a.reads.length
        return {
          id: a.id,
          code: a.code,
          title: a.title,
          content: a.content,
          category: a.category,
          priority: a.priority,
          targetScope: a.targetScope,
          targetCampusIds: a.targetCampusIds,
          targetLevels: a.targetLevels,
          attachments: a.attachments ? (typeof a.attachments === "string" ? JSON.parse(a.attachments) : a.attachments) : [],
          pinned: a.pinned,
          publishedAt: a.publishedAt,
          creatorName: a.creatorName,
          isRead,
          readCount,
          readers: isOfficer ? a.reads : undefined
        }
      })

    const unreadCount = formatted.filter((a: any) => !a.isRead).length

    return NextResponse.json({
      success: true,
      announcements: formatted,
      unreadCount,
      isOfficer
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect GET Announcements Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || "TEACHER"
    if (!isKtdbclOfficer(userRole)) {
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền đăng thông báo nghiệp vụ" }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      content,
      category = "THONG_BAO_CHUNG",
      priority = "NORMAL",
      targetScope = "ALL",
      targetCampusIds = ["ALL"],
      targetDeptIds = ["ALL"],
      targetLevels = ["ALL"],
      attachments = [],
      pinned = false
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Vui lòng nhập tiêu đề và nội dung thông báo" }, { status: 400 })
    }

    const p = prisma as any
    const code = await generateAnnouncementCode()

    const newAnnouncement = await p.ktdbclAnnouncement.create({
      data: {
        code,
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        targetScope,
        targetCampusIds: JSON.stringify(targetCampusIds),
        targetDeptIds: JSON.stringify(targetDeptIds),
        targetLevels: JSON.stringify(targetLevels),
        attachments: JSON.stringify(attachments),
        pinned: Boolean(pinned),
        isPublished: true,
        publishedAt: new Date(),
        createdById: session.user.id,
        creatorName: session.user.name || "Ban KT&ĐBCL Sky-Line"
      }
    })

    // Gửi thông báo đến giáo viên hệ thống
    const teacherUsers = await p.user.findMany({
      where: {
        status: "ACTIVE",
        role: { in: ["TEACHER", "GV_MN", "GVNN", "GDCS", "BGH_MN"] }
      },
      select: { id: true }
    })

    const targetUserIds = teacherUsers.map((u: any) => u.id)
    await sendInAppNotifications({
      userIds: targetUserIds,
      title: `[KT&ĐBCL Sky-Line] ${title.slice(0, 100)}`,
      message: `${code}: ${content.slice(0, 120)}`,
      link: `/teacher/ktdbcl-connect?tab=announcements&announcementId=${newAnnouncement.id}`
    })

    return NextResponse.json({
      success: true,
      announcement: newAnnouncement,
      message: `Đã phát hành thông báo ${code} thành công`
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect POST Announcement Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
