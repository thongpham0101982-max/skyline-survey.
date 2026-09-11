import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const grade = searchParams.get("grade") || ""
    const evaluationPeriod = searchParams.get("evaluationPeriod") || ""

    const where: any = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (grade && grade !== "ALL") where.grade = grade
    if (evaluationPeriod && evaluationPeriod !== "ALL") where.evaluationPeriod = evaluationPeriod

    const configs = await prisma.subjectGradeConfig.findMany({
      where,
      include: {
        subject: true,
        academicYear: true
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ success: true, configs })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      academicYearId,
      grade = "ALL",
      subjectId = null,
      evaluationPeriod = "ALL",
      columnCount = 1,
      columnNames = [],
      columnTypes = [],
      columnMaxScores = [],
      hasCompositeColumn = true,
      compositeColumnName = "Điểm thành phần",
      hasRemarkColumn = true,
      formula = "AVERAGE",
      formulaCustom = null,
      weights = null,
      roundingRule = "ROUND_1"
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin Năm học" }, { status: 400 })
    }

    const columnNamesStr = JSON.stringify(columnNames)
    const columnTypesStr = typeof columnTypes === "string" ? columnTypes : JSON.stringify(columnTypes)
    const columnMaxScoresStr = typeof columnMaxScores === "string" ? columnMaxScores : JSON.stringify(columnMaxScores)
    const weightsStr = weights ? (typeof weights === "string" ? weights : JSON.stringify(weights)) : null
    const targetSubjectId = subjectId && subjectId !== "ALL" ? subjectId : null

    const existing = await prisma.subjectGradeConfig.findFirst({
      where: {
        academicYearId,
        grade,
        subjectId: targetSubjectId,
        evaluationPeriod
      }
    })

    let config
    if (existing) {
      config = await prisma.subjectGradeConfig.update({
        where: { id: existing.id },
        data: {
          columnCount: Number(columnCount),
          columnNames: columnNamesStr,
          columnTypes: columnTypesStr,
          columnMaxScores: columnMaxScoresStr,
          hasCompositeColumn: Boolean(hasCompositeColumn),
          compositeColumnName: compositeColumnName || "Điểm thành phần",
          hasRemarkColumn: Boolean(hasRemarkColumn),
          formula,
          formulaCustom: formulaCustom || null,
          weights: weightsStr,
          roundingRule: roundingRule || "ROUND_1"
        }
      })
    } else {
      config = await prisma.subjectGradeConfig.create({
        data: {
          academicYearId,
          grade,
          subjectId: targetSubjectId,
          evaluationPeriod,
          columnCount: Number(columnCount),
          columnNames: columnNamesStr,
          columnTypes: columnTypesStr,
          columnMaxScores: columnMaxScoresStr,
          hasCompositeColumn: Boolean(hasCompositeColumn),
          compositeColumnName: compositeColumnName || "Điểm thành phần",
          hasRemarkColumn: Boolean(hasRemarkColumn),
          formula,
          formulaCustom: formulaCustom || null,
          weights: weightsStr,
          roundingRule: roundingRule || "ROUND_1"
        }
      })
    }

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}


export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID cấu hình" }, { status: 400 })
    }
    await prisma.subjectGradeConfig.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
