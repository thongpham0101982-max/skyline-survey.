import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAdminOrLeadershipSession, writeSecurityAuditLog } from "@/lib/security-guard"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { name, code, type, sortOrder, status } = body
    const pAny = prisma as any
    const category = await pAny.assessmentConfig.update({
      where: { id },
      data: { name, code, categoryType: type, sortOrder: sortOrder ?? 0, status }
    })
    return NextResponse.json({ category })
  } catch (error: any) {
    console.error("PUT /categories/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminOrLeadershipSession()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const pAny = prisma as any
    await pAny.assessmentConfig.delete({ where: { id } })
    await writeSecurityAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "DELETE_ASSESSMENT_CONFIG",
      targetTable: "AssessmentConfig",
      targetId: String(id)
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /categories/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}