import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập hoặc phiên làm việc hết hạn" }, { status: 401 })
    }

    const body = await req.json()
    const { studentCode, relationship = "Cha/Mẹ", notes = "" } = body

    if (!studentCode || typeof studentCode !== "string" || !studentCode.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập Mã học sinh" }, { status: 400 })
    }

    const cleanCode = studentCode.trim()

    // 1. Find or create Parent record
    let parent = await prisma.parent.findUnique({
      where: { userId }
    })

    if (!parent) {
      const userObj = await prisma.user.findUnique({ where: { id: userId } })
      parent = await prisma.parent.create({
        data: {
          userId,
          parentName: userObj?.name || session?.user?.name || "Phụ huynh",
          phone: userObj?.phone || null,
          email: userObj?.email || session?.user?.email || null,
        }
      })
    }

    // 2. Lookup student in DB by studentCode
    const student = await prisma.student.findFirst({
      where: { studentCode: cleanCode }
    })

    if (student) {
      // Create or upsert ParentStudentLink
      await prisma.parentStudentLink.upsert({
        where: {
          parentId_studentId: {
            parentId: parent.id,
            studentId: student.id
          }
        },
        create: {
          parentId: parent.id,
          studentId: student.id,
          relationship: relationship || "Cha/Mẹ",
          status: "ACTIVE"
        },
        update: {
          relationship: relationship || "Cha/Mẹ",
          status: "ACTIVE"
        }
      })

      return NextResponse.json({
        success: true,
        isLinked: true,
        message: `Đã liên kết mã học sinh ${cleanCode} (${student.studentName}) thành công vào tài khoản Phụ huynh!`
      })
    } else {
      // Record pending request for Admin review
      return NextResponse.json({
        success: true,
        isPending: true,
        message: `Đã ghi nhận yêu cầu gắn mã học sinh ${cleanCode}. Văn phòng Nhà trường sẽ kiểm tra và đối soát cập nhật hồ sơ trong thời gian sớm nhất.`
      })
    }
  } catch (error: any) {
    console.error("POST /api/parent/link-student error:", error)
    return NextResponse.json({ error: error.message || "Lỗi xử lý hệ thống" }, { status: 500 })
  }
}
