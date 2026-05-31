import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, academicYearId, campusId, assignedUserId, startDate, endDate, description, status } = body
    const period = await (prisma as any).inputAssessmentPeriod.update({
      where: { id },
      data: {
        code, name, academicYearId,
        campusId: campusId || null,
        assignedUserId: assignedUserId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        status
      }
    })
    return NextResponse.json({ period })
  } catch (error: any) {
    console.error("PUT /input-assessment-periods/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const period = await (prisma as any).inputAssessmentPeriod.update({
      where: { id },
      data: body
    })
    return NextResponse.json({ period })
  } catch (error: any) {
    console.error("PATCH /input-assessment-periods/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await (prisma as any).inputAssessmentPeriod.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /input-assessment-periods/[id] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}