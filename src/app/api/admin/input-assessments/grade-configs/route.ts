import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const checkIsEnglish = (sub: any) => {
  if (!sub) return false
  const c = (sub.code || "").toLowerCase()
  const n = (sub.name || "").toLowerCase()
  return (
    c === "tav" ||
    c === "tavd" ||
    c === "ept" ||
    c.includes("eng") ||
    c.includes("esl") ||
    n.includes("tiếng anh") ||
    n.includes("english")
  )
}

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
    if (subjectId && subjectId !== "ALL") where.subjectId = subjectId

    const pAny = prisma as any
    const [configs, subjects, eduSystems, periods] = await Promise.all([
      pAny.inputAssessmentGradeConfig.findMany({
        where,
        orderBy: { createdAt: "desc" }
      }),
      pAny.assessmentSubject
        ? pAny.assessmentSubject.findMany({
            select: { id: true, code: true, name: true, subjectType: true }
          }).catch(() => [])
        : [],
      pAny.educationSystem
        ? pAny.educationSystem.findMany({
            select: { id: true, code: true, name: true, academicYearId: true }
          }).catch(() => [])
        : [],
      pAny.inputAssessmentPeriod
        ? pAny.inputAssessmentPeriod.findMany({
            select: { id: true, code: true, name: true, academicYearId: true }
          }).catch(() => [])
        : []
    ])

    const subMap = new Map((subjects || []).map((s: any) => [s.id, s]))
    const sysById = new Map((eduSystems || []).map((s: any) => [s.id, s]))
    const sysByCode = new Map((eduSystems || []).map((s: any) => [String(s.code || "").toUpperCase(), s]))
    const periodById = new Map((periods || []).map((p: any) => [p.id, p]))

    let populated = (configs || []).map((c: any) => {
      const sub = subMap.get(c.subjectId)
      const rawSys = c.educationSystemId || "ALL"
      const resolvedSys: any =
        rawSys === "ALL"
          ? null
          : sysById.get(rawSys) || sysByCode.get(String(rawSys).toUpperCase()) || null
      const rawPeriod = c.periodId || "ALL"
      const resolvedPeriod: any = rawPeriod === "ALL" ? null : periodById.get(rawPeriod) || null

      return {
        ...c,
        periodId: rawPeriod,
        educationSystemId: rawSys,
        educationSystemCode: resolvedSys?.code || (rawSys === "ALL" ? "ALL" : rawSys),
        educationSystemName: resolvedSys?.name || null,
        periodName: resolvedPeriod?.name || null,
        periodCode: resolvedPeriod?.code || null,
        subject: sub || { id: c.subjectId, name: c.subjectId, code: c.subjectId }
      }
    })

    if (educationSystemId && educationSystemId !== "ALL") {
      const targetUpper = educationSystemId.toUpperCase()
      const targetSysObj: any = sysById.get(educationSystemId) || sysByCode.get(targetUpper)
      populated = populated.filter((c: any) => {
        const cSys = String(c.educationSystemId || "ALL")
        const cCode = String(c.educationSystemCode || "ALL")
        if (cSys === educationSystemId || cCode.toUpperCase() === targetUpper) return true
        if (targetSysObj && (cSys === targetSysObj.id || cSys.toUpperCase() === String(targetSysObj.code).toUpperCase())) {
          return true
        }
        return false
      })
    }

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
    const isAllowed = [
      "ADMIN",
      "ADMINISTRATOR",
      "SUPER_ADMIN",
      "SUPERADMIN",
      "KT_DBCL",
      "KHAO_THI",
      "GDCS",
      "GIAO_VU",
      "GIAO_VU_CS"
    ].includes(role)
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Bạn không có quyền cấu hình file điểm khảo sát đầu vào" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      academicYearId,
      periodId = "ALL",
      periodIds = null,
      educationSystemId = "ALL",
      educationSystemIds = null,
      grade = "ALL",
      grades = null,
      subjectId = null,
      batchSubjectIds = null,
      items = null,
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

    const pAny = prisma as any
    const [allSubjects, allEduSystems] = await Promise.all([
      pAny.assessmentSubject
        ? pAny.assessmentSubject.findMany({ select: { id: true, code: true, name: true } }).catch(() => [])
        : [],
      pAny.educationSystem
        ? pAny.educationSystem.findMany({ select: { id: true, code: true, name: true, academicYearId: true } }).catch(() => [])
        : []
    ])

    const subMap = new Map((allSubjects || []).map((s: any) => [s.id, s]))

    const resolveSystemVariants = (sysInput: string): { canonical: string; variants: string[] } => {
      const clean = (sysInput || "ALL").trim() || "ALL"
      if (clean === "ALL") return { canonical: "ALL", variants: ["ALL"] }
      const matched = (allEduSystems || []).filter(
        (s: any) => s.id === clean || String(s.code || "").toUpperCase() === clean.toUpperCase()
      )
      if (matched.length === 0) {
        return { canonical: clean, variants: [clean] }
      }
      const canonicalCode = String(matched[0].code || clean).trim()
      const variantSet = new Set<string>([canonicalCode, clean])
      matched.forEach((m: any) => {
        if (m.id) variantSet.add(m.id)
        if (m.code) variantSet.add(m.code)
      })
      return { canonical: canonicalCode, variants: Array.from(variantSet) }
    }

    const upsertSingleTarget = async (item: {
      periodId: string
      educationSystemId: string
      grade: string
      subjectId: string
      columnCount: number
      columnNames: any
      columnTypes: any
      columnMaxScores: any
      hasCompositeColumn: boolean
      compositeColumnName: string
      hasRemarkColumn: boolean
      formula: string
      formulaCustom: string | null
      weights: any
      roundingRule: string
      passScore: any
      commitmentThreshold: any
    }) => {
      const targetSub = subMap.get(item.subjectId)
      const isSubEnglish = checkIsEnglish(targetSub)
      const parsedPass =
        item.passScore !== null && item.passScore !== undefined && item.passScore !== ""
          ? parseFloat(String(item.passScore))
          : null
      const parsedCommitment = isSubEnglish
        ? null
        : item.commitmentThreshold !== null && item.commitmentThreshold !== undefined && item.commitmentThreshold !== ""
          ? parseFloat(String(item.commitmentThreshold))
          : null

      const columnNamesStr = typeof item.columnNames === "string" ? item.columnNames : JSON.stringify(item.columnNames || [])
      const columnTypesStr = typeof item.columnTypes === "string" ? item.columnTypes : JSON.stringify(item.columnTypes || [])
      const columnMaxScoresStr =
        typeof item.columnMaxScores === "string" ? item.columnMaxScores : JSON.stringify(item.columnMaxScores || [])
      const weightsStr = item.weights
        ? typeof item.weights === "string"
          ? item.weights
          : JSON.stringify(item.weights)
        : null

      const effPeriod = (item.periodId || "ALL").trim() || "ALL"
      const effGrade = (item.grade || "ALL").trim() || "ALL"
      const { canonical: canonicalSys, variants: sysVariants } = resolveSystemVariants(item.educationSystemId)

      const existingList = await pAny.inputAssessmentGradeConfig.findMany({
        where: {
          academicYearId,
          periodId: effPeriod,
          educationSystemId: { in: sysVariants },
          grade: effGrade,
          subjectId: item.subjectId
        },
        orderBy: { updatedAt: "desc" }
      })

      const dataPayload = {
        periodId: effPeriod,
        educationSystemId: canonicalSys,
        grade: effGrade,
        columnCount: Number(item.columnCount || 1),
        columnNames: columnNamesStr,
        columnTypes: columnTypesStr,
        columnMaxScores: columnMaxScoresStr,
        hasCompositeColumn: Boolean(item.hasCompositeColumn),
        compositeColumnName: item.compositeColumnName || "Điểm tổng hợp",
        hasRemarkColumn: Boolean(item.hasRemarkColumn),
        formula: item.formula || "AVERAGE",
        formulaCustom: item.formulaCustom || null,
        weights: weightsStr,
        roundingRule: item.roundingRule || "ROUND_1",
        passScore: parsedPass != null && !isNaN(parsedPass) ? parsedPass : null,
        commitmentThreshold: parsedCommitment != null && !isNaN(parsedCommitment) ? parsedCommitment : null
      }

      if (existingList && existingList.length > 0) {
        const primary = existingList.find((x: any) => x.educationSystemId === canonicalSys) || existingList[0]
        // Nếu có bản ghi trùng lặp cũ theo id hệ học và code hệ học, dọn bản dư thừa trước khi chuẩn hóa mã hệ
        if (existingList.length > 1) {
          const duplicateIds = existingList.filter((x: any) => x.id !== primary.id).map((x: any) => x.id)
          if (duplicateIds.length > 0) {
            await pAny.inputAssessmentGradeConfig.deleteMany({
              where: { id: { in: duplicateIds } }
            })
          }
        }
        return await pAny.inputAssessmentGradeConfig.update({
          where: { id: primary.id },
          data: dataPayload
        })
      }

      return await pAny.inputAssessmentGradeConfig.create({
        data: {
          academicYearId,
          subjectId: item.subjectId,
          ...dataPayload
        }
      })
    }

    // Chế độ 1: Gửi danh sách cấu hình tường minh (items) — hỗ trợ đa khối + đa môn với cấu hình chuyên biệt từng khối/môn
    if (Array.isArray(items) && items.length > 0) {
      const results = []
      for (const it of items) {
        if (!it?.subjectId) continue
        const saved = await upsertSingleTarget({
          periodId: it.periodId || periodId || "ALL",
          educationSystemId: it.educationSystemId || educationSystemId || "ALL",
          grade: it.grade || grade || "ALL",
          subjectId: it.subjectId,
          columnCount: it.columnCount ?? columnCount,
          columnNames: it.columnNames ?? columnNames,
          columnTypes: it.columnTypes ?? columnTypes,
          columnMaxScores: it.columnMaxScores ?? columnMaxScores,
          hasCompositeColumn: it.hasCompositeColumn ?? hasCompositeColumn,
          compositeColumnName: it.compositeColumnName ?? compositeColumnName,
          hasRemarkColumn: it.hasRemarkColumn ?? hasRemarkColumn,
          formula: it.formula ?? formula,
          formulaCustom: it.formulaCustom ?? formulaCustom,
          weights: it.weights ?? weights,
          roundingRule: it.roundingRule ?? roundingRule,
          passScore: it.passScore !== undefined ? it.passScore : passScore,
          commitmentThreshold: it.commitmentThreshold !== undefined ? it.commitmentThreshold : commitmentThreshold
        })
        results.push(saved)
      }
      return NextResponse.json({
        success: true,
        count: results.length,
        config: results[0] || null,
        configs: results
      })
    }

    // Chế độ 2: Gán tổ hợp (1 hoặc nhiều kỳ x 1 hoặc nhiều hệ học x 1 hoặc nhiều khối lớp x 1 hoặc nhiều môn)
    const targetPeriods: string[] =
      Array.isArray(periodIds) && periodIds.length > 0 ? periodIds : [periodId || "ALL"]
    const targetSystems: string[] =
      Array.isArray(educationSystemIds) && educationSystemIds.length > 0
        ? educationSystemIds
        : [educationSystemId || "ALL"]
    const targetGrades: string[] =
      Array.isArray(grades) && grades.length > 0 ? grades : [grade || "ALL"]
    const targetSubjects: string[] =
      Array.isArray(batchSubjectIds) && batchSubjectIds.length > 0
        ? batchSubjectIds
        : subjectId
          ? [subjectId]
          : []

    if (targetSubjects.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất một môn khảo sát đầu vào" }, { status: 400 })
    }

    const results = []
    for (const pId of targetPeriods) {
      for (const sysId of targetSystems) {
        for (const g of targetGrades) {
          for (const subId of targetSubjects) {
            if (!subId) continue
            const saved = await upsertSingleTarget({
              periodId: pId,
              educationSystemId: sysId,
              grade: g,
              subjectId: subId,
              columnCount,
              columnNames,
              columnTypes,
              columnMaxScores,
              hasCompositeColumn,
              compositeColumnName,
              hasRemarkColumn,
              formula,
              formulaCustom,
              weights,
              roundingRule,
              passScore,
              commitmentThreshold
            })
            results.push(saved)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      config: results[0] || null,
      configs: results
    })
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
    const idsParam = searchParams.get("ids")

    const pAny = prisma as any

    if (idsParam) {
      const idList = idsParam.split(",").map(s => s.trim()).filter(Boolean)
      if (idList.length === 0) {
        return NextResponse.json({ success: false, error: "Thiếu danh sách ID cấu hình" }, { status: 400 })
      }
      const deleted = await pAny.inputAssessmentGradeConfig.deleteMany({
        where: { id: { in: idList } }
      })
      return NextResponse.json({ success: true, count: deleted.count, message: `Đã xóa ${deleted.count} cấu hình` })
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID cấu hình" }, { status: 400 })
    }

    await pAny.inputAssessmentGradeConfig.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Đã xóa cấu hình thành công" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
