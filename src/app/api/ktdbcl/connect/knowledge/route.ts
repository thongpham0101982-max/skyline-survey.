import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isKtdbclOfficer } from "@/lib/ktdbcl/connectService"

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

    const where: any = {}
    if (!isOfficer) {
      where.isPublished = true
    }
    if (category && category !== "ALL") {
      where.category = category
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { question: { contains: search } },
        { answer: { contains: search } },
        { keywords: { contains: search } }
      ]
    }

    const items = await p.ktdbclKnowledgeItem.findMany({
      where,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }]
    })

    return NextResponse.json({
      success: true,
      items,
      isOfficer
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect GET Knowledge Error]:", error)
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
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền quản lý Kho tri thức" }, { status: 403 })
    }

    const body = await req.json()
    const { title, category = "QUY_CHE_CHUNG", question, answer, keywords = "", attachments = [], isPublished = true } = body

    if (!title || !question || !answer) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ tiêu đề, câu hỏi và nội dung hướng dẫn" }, { status: 400 })
    }

    const p = prisma as any
    const item = await p.ktdbclKnowledgeItem.create({
      data: {
        title: title.trim(),
        category,
        question: question.trim(),
        answer: answer.trim(),
        keywords: keywords.trim(),
        attachments: JSON.stringify(attachments),
        isPublished: Boolean(isPublished),
        createdById: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      item,
      message: "Đã thêm bài viết vào Kho tri thức thành công"
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect POST Knowledge Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || "TEACHER"
    if (!isKtdbclOfficer(userRole)) {
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền cập nhật Kho tri thức" }, { status: 403 })
    }

    const body = await req.json()
    const { id, title, category, question, answer, keywords, attachments, isPublished } = body
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID bài viết" }, { status: 400 })
    }

    const p = prisma as any
    const updated = await p.ktdbclKnowledgeItem.update({
      where: { id },
      data: {
        title: title?.trim(),
        category,
        question: question?.trim(),
        answer: answer?.trim(),
        keywords: keywords?.trim(),
        attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      item: updated,
      message: "Cập nhật Kho tri thức thành công"
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect PUT Knowledge Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || "TEACHER"
    if (!isKtdbclOfficer(userRole)) {
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền xóa bài viết" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID bài viết" }, { status: 400 })
    }

    const p = prisma as any
    await p.ktdbclKnowledgeItem.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: "Đã xóa bài viết thành công"
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect DELETE Knowledge Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, type } = body
    if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 })

    const p = prisma as any
    if (type === "USEFUL") {
      await p.ktdbclKnowledgeItem.update({
        where: { id },
        data: { usefulCount: { increment: 1 } }
      })
    } else {
      await p.ktdbclKnowledgeItem.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
