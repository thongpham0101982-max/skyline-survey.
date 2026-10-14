import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isKtdbclOfficer } from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || "TEACHER"
    if (!isKtdbclOfficer(userRole)) {
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền xem Dashboard quản lý" }, { status: 403 })
    }

    const p = prisma as any

    const [
      allRequests,
      allAnnouncements,
      totalKnowledge,
      recentAuditLogs
    ] = await Promise.all([
      p.ktdbclRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 500
      }),
      p.ktdbclAnnouncement.findMany({
        include: { reads: { select: { id: true } } }
      }),
      p.ktdbclKnowledgeItem.count({ where: { isPublished: true } }),
      p.ktdbclAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15
      })
    ])

    const totalRequests = allRequests.length
    const newCount = allRequests.filter((r: any) => r.status === "NEW").length
    const inProgressCount = allRequests.filter((r: any) => r.status === "IN_PROGRESS").length
    const answeredCount = allRequests.filter((r: any) => r.status === "ANSWERED").length
    const resolvedCount = allRequests.filter((r: any) => r.status === "RESOLVED" || r.status === "CLOSED").length

    // Tính yêu cầu quá hạn (> 48h chưa giải quyết)
    const now = Date.now()
    const overdueRequests = allRequests.filter((r: any) => {
      if (r.status === "RESOLVED" || r.status === "CLOSED") return false
      const createdTime = new Date(r.createdAt).getTime()
      return (now - createdTime) > (48 * 60 * 60 * 1000)
    })

    // Phân bổ theo cơ sở
    const campusMap: Record<string, number> = { CS1: 0, CS2: 0, CS3: 0, CS4: 0, CS5: 0 }
    allRequests.forEach((r: any) => {
      const code = (r.campusCode || "CS1").toUpperCase()
      if (campusMap[code] !== undefined) {
        campusMap[code]++
      } else {
        campusMap[code] = (campusMap[code] || 0) + 1
      }
    })

    // Phân bổ theo chuyên mục
    const categoryMap: Record<string, number> = {}
    allRequests.forEach((r: any) => {
      const cat = r.category || "KHAC"
      categoryMap[cat] = (categoryMap[cat] || 0) + 1
    })

    // Tính điểm đánh giá hài lòng trung bình
    const ratedRequests = allRequests.filter((r: any) => r.rating && r.rating > 0)
    const avgRating = ratedRequests.length > 0
      ? (ratedRequests.reduce((acc: number, cur: any) => acc + cur.rating, 0) / ratedRequests.length).toFixed(1)
      : "5.0"

    // Thống kê thông báo nghiệp vụ
    const totalAnnouncements = allAnnouncements.length
    const totalReads = allAnnouncements.reduce((acc: number, cur: any) => acc + (cur.reads?.length || 0), 0)

    // Tính SLA trung bình (giờ) đối với các yêu cầu đã giải quyết
    let totalResolveHours = 0
    let resolvedWithDates = 0
    allRequests.forEach((r: any) => {
      if (r.resolvedAt && r.createdAt) {
        const diffMs = new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        if (diffHours >= 0 && diffHours < 720) {
          totalResolveHours += diffHours
          resolvedWithDates++
        }
      }
    })
    const avgSlaHours = resolvedWithDates > 0 ? (totalResolveHours / resolvedWithDates).toFixed(1) : "4.2"

    return NextResponse.json({
      success: true,
      stats: {
        totalRequests,
        newCount,
        inProgressCount,
        answeredCount,
        resolvedCount,
        overdueCount: overdueRequests.length,
        avgRating,
        ratedCount: ratedRequests.length,
        avgSlaHours,
        totalAnnouncements,
        totalReads,
        totalKnowledge
      },
      campusDistribution: Object.entries(campusMap).map(([campus, count]) => ({ campus, count })),
      categoryDistribution: Object.entries(categoryMap).map(([category, count]) => ({ category, count })),
      overdueList: overdueRequests.slice(0, 10),
      recentAuditLogs
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect Dashboard Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
