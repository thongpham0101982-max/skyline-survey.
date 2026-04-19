import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const periods = await (prisma as any).inputAssessmentPeriod.findMany({
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json({ periods })
  } catch (error: any) {
    console.error("GET /api/admin/input-assessment-periods error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, academicYearId, campusId, assignedUserId, startDate, endDate, description, status } = body

    if (!code || !name || !academicYearId) {
      return NextResponse.json({ error: "Mã, Tên và Năm học là bắt buộc." }, { status: 400 })
    }

    const period = await (prisma as any).inputAssessmentPeriod.create({
      data: {
        code,
        name,
        academicYearId,
        campusId: campusId || null,
        assignedUserId: assignedUserId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        status: status || "DRAFT",
      }
    })
    return NextResponse.json({ period }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/admin/input-assessment-periods error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Mã kỳ khảo sát đã tồn tại." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
