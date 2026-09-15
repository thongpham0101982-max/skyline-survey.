// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || "ALL"

    let targetYearId = academicYearId
    if (!targetYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        where: { name: { contains: "2026" } }
      })
      targetYearId = activeYear?.id || ""
    }

    const configs = await prisma.subjectBenchmarkConfig.findMany({
      where: {
        academicYearId: targetYearId,
        ...(evaluationPeriod !== "ALL" ? { evaluationPeriod: { in: [evaluationPeriod, "ALL"] } } : {})
      },
      orderBy: [{ level: "asc" }, { grade: "asc" }]
    })

    return NextResponse.json({
      success: true,
      academicYearId: targetYearId,
      evaluationPeriod,
      configs,
      defaultBenchmarks: {
        TIEU_HOC: 7.0,
        THCS: 6.0,
        THPT: 6.0
      }
    })
  } catch (error: any) {
    console.error("Lỗi lấy cấu hình điểm chuẩn:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const {
      academicYearId,
      configs = [] // Array<{ evaluationPeriod?, level?, grade?, subjectId?, benchmarkScore }>
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin năm học" }, { status: 400 })
    }

    if (!Array.isArray(configs) || configs.length === 0) {
      return NextResponse.json({ success: false, error: "Danh sách cấu hình trống" }, { status: 400 })
    }

    const saved = []
    for (const item of configs) {
      const evaluationPeriod = item.evaluationPeriod || "ALL"
      const level = item.level || "ALL"
      const grade = item.grade || "ALL"
      const subjectId = item.subjectId || "ALL"
      const benchmarkScore = typeof item.benchmarkScore === "number" ? item.benchmarkScore : parseFloat(item.benchmarkScore) || 6.0

      const record = await prisma.subjectBenchmarkConfig.upsert({
        where: {
          academicYearId_evaluationPeriod_level_grade_subjectId: {
            academicYearId,
            evaluationPeriod,
            level,
            grade,
            subjectId
          }
        },
        update: {
          benchmarkScore,
          updatedAt: new Date()
        },
        create: {
          academicYearId,
          evaluationPeriod,
          level,
          grade,
          subjectId,
          benchmarkScore,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      saved.push(record)
    }

    return NextResponse.json({
      success: true,
      count: saved.length,
      configs: saved
    })
  } catch (error: any) {
    console.error("Lỗi lưu cấu hình điểm chuẩn:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
