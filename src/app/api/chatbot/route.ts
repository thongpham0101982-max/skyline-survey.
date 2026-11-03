import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { answerTeacherTaskAssistantQuery } from "@/services/taskEngine/taskAssistantEngine"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const message = String(body.message || body.question || "").trim()

    const reply = await answerTeacherTaskAssistantQuery(session.user.id, message, {
      fallbackToGeneral: true,
    })
    return NextResponse.json({
      reply: reply.markdown,
      markdown: reply.markdown,
      updatedAt: reply.updatedAt,
      actions: reply.deepLinks,
      deepLinks: reply.deepLinks,
      metrics: reply.metrics,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
