import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const reflections = await prisma.studentReflection.findMany({
      where: {
        studentId,
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(reflections)
  } catch (error: any) {
    console.error("GET /api/advisory/reflections error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { studentId, academicYearId, period, feeling, reflectionText, selfRating, difficulties, helpNeededText } = body

    if (!studentId || !reflectionText) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung tự đánh giá" }, { status: 400 })
    }

    const reflection = await prisma.studentReflection.create({
      data: {
        studentId,
        academicYearId: academicYearId || "",
        period: period || "TUAN_NAY",
        feeling: feeling || "HAPPY",
        reflectionText,
        selfRating: selfRating || 5,
        difficulties: difficulties || null,
        helpNeededText: helpNeededText || null
      }
    })

    return NextResponse.json({ success: true, reflection })
  } catch (error: any) {
    console.error("POST /api/advisory/reflections error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
