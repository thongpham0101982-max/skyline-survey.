import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isKtdbclOfficer, generateAiDraftResponse } from "@/lib/ktdbcl/connectService"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role || "TEACHER"
    if (!isKtdbclOfficer(userRole)) {
      return NextResponse.json({ error: "Chỉ Ban KT&ĐBCL mới có quyền sử dụng tính năng AI Gợi ý phản hồi" }, { status: 403 })
    }

    const body = await req.json()
    const { requestId } = body
    if (!requestId) {
      return NextResponse.json({ error: "Thiếu requestId" }, { status: 400 })
    }

    const draftText = await generateAiDraftResponse(requestId)

    return NextResponse.json({
      success: true,
      draft: draftText
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect AI Suggest Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
