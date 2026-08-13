import { triggerFeatureBadgeUpdate } from "@/lib/badge-service"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId")

  try {
    if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

    const students = await prisma.student.findMany({
      where: { classId },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        advisoryStatuses: {
          where: academicYearId ? { academicYearId } : undefined
        }
      }
    })

    const result = students.map(s => ({
      studentId: s.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      statusColor: s.advisoryStatuses[0]?.statusColor || "GREEN",
      reasonCategory: s.advisoryStatuses[0]?.reasonCategory || null,
      reasonDetail: s.advisoryStatuses[0]?.reasonDetail || null
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET /api/advisory/status-warnings error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { studentId, academicYearId, statusColor, reasonCategory, reasonDetail } = body

    if (!studentId || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const updated = await prisma.studentAdvisoryStatus.upsert({
      where: {
        studentId_academicYearId: { studentId, academicYearId }
      },
      update: {
        statusColor: statusColor || "GREEN",
        reasonCategory,
        reasonDetail,
        updatedById: session.user.id
      },
      create: {
        studentId,
        academicYearId,
        statusColor: statusColor || "GREEN",
        reasonCategory,
        reasonDetail,
        updatedById: session.user.id
      }
    })

    return NextResponse.json({ success: true, status: updated })
  } catch (error: any) {
    console.error("POST /api/advisory/status-warnings error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
