import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const grade = searchParams.get("grade") || ""
    const periodId = searchParams.get("periodId") || ""
    const educationSystemId = searchParams.get("educationSystemId") || ""
    const subjectId = searchParams.get("subjectId") || ""

    const where: any = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (grade && grade !== "ALL") where.grade = grade
    if (periodId && periodId !== "ALL") where.periodId = periodId
    if (educationSystemId && educationSystemId !== "ALL") where.educationSystemId = educationSystemId
    if (subjectId && subjectId !== "ALL") where.subjectId = subjectId

    const pAny = prisma as any
    const configs = await pAny.inputAssessmentGradeConfig.findMany({
      where,
      orderBy: { createdAt: "desc" }
    })

    // Lấy thông tin AssessmentSubject để ghép metadata môn
    const subjects = await pAny.assessmentSubject.findMany({
      select: { id: true, code: true, name: true, subjectType: true }
    })
    const subMap = new Map(subjects.map((s: any) => [s.id, s]))

    const populated = configs.map((c: any) => {
      const sub = subMap.get(c.subjectId)
      return {
        ...c,
        subject: sub || { id: c.subjectId, name: c.subjectId, code: c.subjectId }
      }
    })

    return NextResponse.json({ success: true, configs: populated })
  } catch (error: any) {
    console.error("GET input-assessment grade-configs error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI", "GDCS", "GIAO_VU", "GIAO_VU_CS"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden: Bạn không có quyền cấu hình file điểm khảo sát đầu vào" }, { status: 403 })
    }

    const body = await request.json()
    const {
      academicYearId,
      periodId = "ALL",
      educationSystemId = "ALL",
      grade = "ALL",
      subjectId = null,
      batchSubjectIds = null,
      columnCount = 1,
      columnNames = [],
      columnTypes = [],
      columnMaxScores = [],
      hasCompositeColumn = true,
      compositeColumnName = "Điểm tổng hợp",
      hasRemarkColumn = true,
      formula = "AVERAGE",
      formulaCustom = null,
      weights = null,
      roundingRule = "ROUND_1",
      passScore = null,
      commitmentThreshold = null
    } = body

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin Năm học" }, { status: 400 })
    }

    const columnNamesStr = typeof columnNames === "string" ? columnNames : JSON.stringify(columnNames)
    const columnTypesStr = typeof columnTypes === "string" ? columnTypes : JSON.stringify(columnTypes)
    const columnMaxScoresStr = typeof columnMaxScores === "string" ? columnMaxScores : JSON.stringify(columnMaxScores)
    const weightsStr = weights ? (typeof weights === "string" ? weights : JSON.stringify(weights)) : null

    const pAny = prisma as any

    // Chế độ gán hàng loạt nhiều môn (Batch Assign)
    if (batchSubjectIds && Array.isArray(batchSubjectIds) && batchSubjectIds.length > 0) {
      const results = []
      for (const targetSubId of batchSubjectIds) {
        if (!targetSubId) continue

        const existing = await pAny.inputAssessmentGradeConfig.findFirst({
          where: {
            academicYearId,
            periodId,
            educationSystemId,
            grade,
            subjectId: targetSubId
          }
        })

        if (existing) {
          const updated = await pAny.inputAssessmentGradeConfig.update({
            where: { id: existing.id },
            data: {
              columnCount: Number(columnCount),
              columnNames: columnNamesStr,
              columnTypes: columnTypesStr,
              columnMaxScores: columnMaxScoresStr,
              hasCompositeColumn: Boolean(hasCompositeColumn),
              compositeColumnName: compositeColumnName || "Điểm tổng hợp",
              hasRemarkColumn: Boolean(hasRemarkColumn),
              formula,
              formulaCustom: formulaCustom || null,
              weights: weightsStr,
              roundingRule: roundingRule || "ROUND_1",
              passScore: passScore != null ? parseFloat(passScore) : null,
              commitmentThreshold: commitmentThreshold != null ? parseFloat(commitmentThreshold) : null
            }
          })
          results.push(updated)
        } else {
          const created = await pAny.inputAssessmentGradeConfig.create({
            data: {
              academicYearId,
              periodId,
              educationSystemId,
              grade,
              subjectId: targetSubId,
              columnCount: Number(columnCount),
              columnNames: columnNamesStr,
              columnTypes: columnTypesStr,
              columnMaxScores: columnMaxScoresStr,
              hasCompositeColumn: Boolean(hasCompositeColumn),
              compositeColumnName: compositeColumnName || "Điểm tổng hợp",
              hasRemarkColumn: Boolean(hasRemarkColumn),
              formula,
              formulaCustom: formulaCustom || null,
              weights: weightsStr,
              roundingRule: roundingRule || "ROUND_1",
              passScore: passScore != null ? parseFloat(passScore) : null,
              commitmentThreshold: commitmentThreshold != null ? parseFloat(commitmentThreshold) : null
            }
          })
          results.push(created)
        }
      }
      return NextResponse.json({ success: true, count: results.length, configs: results })
    }

    // Chế độ lưu 1 môn
    if (!subjectId) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn môn khảo sát đầu vào" }, { status: 400 })
    }

    const existing = await pAny.inputAssessmentGradeConfig.findFirst({
      where: {
        academicYearId,
        periodId,
        educationSystemId,
        grade,
        subjectId
      }
    })

    let config
    if (existing) {
      config = await pAny.inputAssessmentGradeConfig.update({
        where: { id: existing.id },
        data: {
          columnCount: Number(columnCount),
          columnNames: columnNamesStr,
          columnTypes: columnTypesStr,
          columnMaxScores: columnMaxScoresStr,
          hasCompositeColumn: Boolean(hasCompositeColumn),
          compositeColumnName: compositeColumnName || "Điểm tổng hợp",
          hasRemarkColumn: Boolean(hasRemarkColumn),
          formula,
          formulaCustom: formulaCustom || null,
          weights: weightsStr,
          roundingRule: roundingRule || "ROUND_1",
          passScore: passScore != null ? parseFloat(passScore) : null,
          commitmentThreshold: commitmentThreshold != null ? parseFloat(commitmentThreshold) : null
        }
      })
    } else {
      config = await pAny.inputAssessmentGradeConfig.create({
        data: {
          academicYearId,
          periodId,
          educationSystemId,
          grade,
          subjectId,
          columnCount: Number(columnCount),
          columnNames: columnNamesStr,
          columnTypes: columnTypesStr,
          columnMaxScores: columnMaxScoresStr,
          hasCompositeColumn: Boolean(hasCompositeColumn),
          compositeColumnName: compositeColumnName || "Điểm tổng hợp",
          hasRemarkColumn: Boolean(hasRemarkColumn),
          formula,
          formulaCustom: formulaCustom || null,
          weights: weightsStr,
          roundingRule: roundingRule || "ROUND_1",
          passScore: passScore != null ? parseFloat(passScore) : null,
          commitmentThreshold: commitmentThreshold != null ? parseFloat(commitmentThreshold) : null
        }
      })
    }

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error("POST input-assessment grade-configs error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    const role = ((session.user as any)?.role || "").toUpperCase().trim()
    const isAllowed = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KHAO_THI"].includes(role)
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID cấu hình" }, { status: 400 })
    }

    const pAny = prisma as any
    await pAny.inputAssessmentGradeConfig.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Đã xóa cấu hình thành công" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
