import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    const { id } = await params
    const pAny = prisma as any
    await pAny.assessmentConfig.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /categories/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}