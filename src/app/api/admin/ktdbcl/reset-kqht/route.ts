import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const academicYearName = body.academicYear || "2025-2026"

    // Find AcademicYear by name
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        OR: [
          { name: { contains: "2025-2026" } },
          { code: { contains: "2025-2026" } }
        ]
      }
    })

    let deletedScores = { count: 0 }
    let deletedSummaries = { count: 0 }

    if (academicYear) {
      // Find students in this academic year
      const students = await prisma.student.findMany({
        where: { academicYearId: academicYear.id },
        select: { id: true }
      })
      const studentIds = students.map(s => s.id)

      if (studentIds.length > 0) {
        deletedScores = await prisma.studentTermScore.deleteMany({
          where: { studentId: { in: studentIds } }
        })
        deletedSummaries = await prisma.studentTermSummary.deleteMany({
          where: { studentId: { in: studentIds } }
        })
      } else {
        deletedScores = await prisma.studentTermScore.deleteMany({})
        deletedSummaries = await prisma.studentTermSummary.deleteMany({})
      }
    } else {
      // Fallback: Delete all term scores and summaries
      deletedScores = await prisma.studentTermScore.deleteMany({})
      deletedSummaries = await prisma.studentTermSummary.deleteMany({})
    }

    return NextResponse.json({
      success: true,
      message: `Đã reset và xóa sạch dữ liệu Kết quả Học tập (MOET) năm học ${academicYearName}!`,
      deletedScoresCount: deletedScores.count,
      deletedSummariesCount: deletedSummaries.count
    })
  } catch (error: any) {
    console.error("Error resetting KQHT data:", error)
    return NextResponse.json({
      success: false,
      message: "Lỗi reset dữ liệu KQHT: " + error.message
    }, { status: 500 })
  }
}
