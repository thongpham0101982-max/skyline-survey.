import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getTeacherProfileByUserId } from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const { id } = await params
    const p = prisma as any

    const profile = await getTeacherProfileByUserId(session.user.id)

    // Upsert để tránh lỗi duplicate read
    await p.ktdbclAnnouncementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: session.user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        announcementId: id,
        userId: session.user.id,
        userName: profile?.teacherName || session.user.name || "Giáo viên",
        userRole: (session.user as any)?.role || "TEACHER",
        campusCode: profile?.campusCode || "CS1",
        readAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[KTDBCL Connect Mark Read Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
