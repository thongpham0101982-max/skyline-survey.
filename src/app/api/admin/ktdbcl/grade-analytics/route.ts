// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)

    const academicYearId = searchParams.get("academicYearId") || ""
    const levelFilter = searchParams.get("levelFilter") || "ALL"
    const gradeFilter = searchParams.get("gradeFilter") || "ALL"
    const systemFilter = searchParams.get("systemFilter") || "ALL"
    const classId = searchParams.get("classId") || "ALL"
    const subjectId = searchParams.get("subjectId") || "ALL"
    const currentPeriod = searchParams.get("currentPeriod") || "GK1"
    const baselinePeriod = searchParams.get("baselinePeriod") || "KSĐN"

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin Năm học" }, { status: 400 })
    }

    // 1. Build class query filter
    const classWhere: any = {
      academicYearId,
      status: "ACTIVE"
    }
    if (classId && classId !== "ALL") {
      classWhere.id = classId
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      select: {
        id: true,
        className: true,
        grade: true,
        level: true,
        educationSystem: true
      },
      orderBy: { className: "asc" }
    })

    // Filter classes in-memory by level, grade, system if needed
    const filteredClasses = classes.filter(c => {
      if (levelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        if (levelFilter === "TieuHoc") {
          const isMatch = cLevel.includes("tiểu học") || cLevel.includes("tieu hoc") ||
            ["1", "2", "3", "4", "5"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (levelFilter === "THCS") {
          const isMatch = cLevel.includes("thcs") ||
            ["6", "7", "8", "9"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (levelFilter === "THPT") {
          const isMatch = cLevel.includes("thpt") ||
            ["10", "11", "12"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (levelFilter === "MamNon") {
          const isMatch = cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ") || cLevel.includes("mẫu giáo")
          if (!isMatch) return false
        }
      }

      if (gradeFilter !== "ALL") {
        const targetNum = gradeFilter.replace(/\D/g, "")
        const cGrade = (c.grade || "").trim()
        const cName = (c.className || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""

        const isMatch = cGrade === gradeFilter || (targetNum && (cGradeNum === targetNum || cNameNum === targetNum))
        if (!isMatch) return false
      }

      if (systemFilter !== "ALL") {
        const cSys = (c.educationSystem || "").trim().toLowerCase()
        const targetSys = systemFilter.trim().toLowerCase()
        if (cSys !== targetSys && !cSys.includes(targetSys)) return false
      }

      return true
    })

    const classIds = filteredClasses.map(c => c.id)
    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          totalStudents: 0,
          totalGraded: 0,
          totalWithBaseline: 0,
          totalWithBoth: 0,
          currentAverage: 0,
          baselineAverage: 0,
          averageDelta: 0,
          improvedCount: 0,
          improvedPercent: 0,
          atRiskBaselineCount: 0,
          atRiskResolvedCount: 0,
          regressedCount: 0
        },
        distribution: [],
        multiPeriodTrend: [],
        transitionMatrix: [],
        studentsTracking: [],
        subjects: []
      })
    }

    // 2. Fetch all active students in target classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE"
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        classId: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true
          }
        }
      },
      orderBy: { studentName: "asc" }
    })

    const studentCodes = students.map(s => s.studentCode).filter(Boolean)

    // 3. Fetch input entrance assessment (tuyển sinh) if exists
    let entranceAssessmentMap = new Map()
    if (studentCodes.length > 0) {
      const entranceRecords = await prisma.inputAssessmentStudent.findMany({
        where: {
          studentCode: { in: studentCodes }
        },
        select: {
          studentCode: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true
        }
      })
      entranceRecords.forEach(r => {
        entranceAssessmentMap.set(r.studentCode, r)
      })
    }

    // 4. Fetch grade entries
    const entryWhere: any = {
      academicYearId,
      classId: { in: classIds }
    }
    if (subjectId && subjectId !== "ALL") {
      entryWhere.subjectId = subjectId
    }

    const allEntries = await prisma.subjectGradeEntry.findMany({
      where: entryWhere,
      include: {
        subject: {
          select: {
            id: true,
            subjectCode: true,
            subjectName: true
          }
        }
      }
    })

    // Index entries by: studentId -> subjectId -> period -> entry
    const studentSubjectPeriodMap = new Map<string, Map<string, Map<string, any>>>()
    allEntries.forEach(entry => {
      if (!studentSubjectPeriodMap.has(entry.studentId)) {
        studentSubjectPeriodMap.set(entry.studentId, new Map())
      }
      const subMap = studentSubjectPeriodMap.get(entry.studentId)!
      if (!subMap.has(entry.subjectId)) {
        subMap.set(entry.subjectId, new Map())
      }
      subMap.get(entry.subjectId)!.set(entry.evaluationPeriod, entry)
    })

    // 5. Distinct subjects present in filtered data
    const subjectMap = new Map<string, { id: string; name: string; code: string }>()
    allEntries.forEach(e => {
      if (e.subject) {
        subjectMap.set(e.subject.id, {
          id: e.subject.id,
          name: e.subject.subjectName,
          code: e.subject.subjectCode
        })
      }
    })

    // If a subjectId was selected but not yet having entries, let's also query subject metadata
    if (subjectId && subjectId !== "ALL" && !subjectMap.has(subjectId)) {
      const sb = await prisma.subject.findUnique({ where: { id: subjectId } })
      if (sb) {
        subjectMap.set(sb.id, { id: sb.id, name: sb.subjectName, code: sb.subjectCode })
      }
    }

    // Helpers to classify bucket
    const getScoreBucket = (score: number | null): string => {
      if (score === null || score === undefined || isNaN(score)) return "CHUA_CO"
      if (score < 5.0) return "UNDER_5"
      if (score < 6.5) return "FROM_5_TO_65"
      if (score < 8.0) return "FROM_65_TO_8"
      return "FROM_8_TO_10"
    }

    const BUCKET_LABELS: Record<string, string> = {
      UNDER_5: "Dưới 5.0 (Cần bám sát)",
      FROM_5_TO_65: "5.0 - < 6.5 (Trung bình)",
      FROM_65_TO_8: "6.5 - < 8.0 (Khá)",
      FROM_8_TO_10: "8.0 - 10.0 (Giỏi/Xuất sắc)"
    }

    // 6. Build Student Tracking Data
    const studentsTracking: any[] = []
    const allPeriods = ["KSĐN", "GK1", "CK1", "GK2", "CK2"]
    
    // Period average collectors
    const periodScoresCollector: Record<string, number[]> = {
      KSĐN: [],
      GK1: [],
      CK1: [],
      GK2: [],
      CK2: []
    }
    const atRiskPeriodScoresCollector: Record<string, number[]> = {
      KSĐN: [],
      GK1: [],
      CK1: [],
      GK2: [],
      CK2: []
    }

    // Distribution collectors
    const baselineBuckets: Record<string, number> = { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 }
    const currentBuckets: Record<string, number> = { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 }

    // Transition Matrix: baselineBucket -> currentBucket -> count
    const transitionMatrixCounts: Record<string, Record<string, number>> = {
      UNDER_5: { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 },
      FROM_5_TO_65: { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 },
      FROM_65_TO_8: { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 },
      FROM_8_TO_10: { UNDER_5: 0, FROM_5_TO_65: 0, FROM_65_TO_8: 0, FROM_8_TO_10: 0 }
    }

    let totalStudentsGraded = 0
    let totalWithBaseline = 0
    let totalWithBoth = 0
    let sumCurrentScore = 0
    let sumBaselineScore = 0
    let improvedCount = 0
    let regressedCount = 0
    let atRiskBaselineCount = 0
    let atRiskResolvedCount = 0

    // Iterate over students and selected subject(s)
    const targetSubjects = subjectId && subjectId !== "ALL"
      ? [subjectMap.get(subjectId)].filter(Boolean)
      : Array.from(subjectMap.values())

    students.forEach(student => {
      const studentSubs = studentSubjectPeriodMap.get(student.id)
      const entranceInfo = entranceAssessmentMap.get(student.studentCode)

      targetSubjects.forEach(sub => {
        if (!sub) return
        const periodsData = studentSubs?.get(sub.id)

        const baselineEntry = periodsData?.get(baselinePeriod)
        const currentEntry = periodsData?.get(currentPeriod)

        const baselineScore = baselineEntry?.compositeScore !== null && baselineEntry?.compositeScore !== undefined
          ? Number(baselineEntry.compositeScore)
          : null

        const currentScore = currentEntry?.compositeScore !== null && currentEntry?.compositeScore !== undefined
          ? Number(currentEntry.compositeScore)
          : null

        // Check entrance assessment fallback if baseline period is KSĐN and no score yet
        let entranceFallback: number | null = null
        if (entranceInfo) {
          const sName = (sub.name || "").toLowerCase()
          if (sName.includes("toán") || sName.includes("math")) {
            entranceFallback = entranceInfo.mathScore
          } else if (sName.includes("văn") || sName.includes("tiếng việt") || sName.includes("literature")) {
            entranceFallback = entranceInfo.literatureScore
          } else if (sName.includes("anh") || sName.includes("english") || sName.includes("ace")) {
            entranceFallback = entranceInfo.writtenEnglishScore || entranceInfo.oralEnglishScore
          }
        }

        const effectiveBaselineScore = baselineScore !== null ? baselineScore : entranceFallback
        const isFromEntranceTest = baselineScore === null && entranceFallback !== null

        // Collect period scores for trend
        allPeriods.forEach(p => {
          const entry = periodsData?.get(p)
          if (entry?.compositeScore !== null && entry?.compositeScore !== undefined) {
            periodScoresCollector[p].push(Number(entry.compositeScore))
            if (effectiveBaselineScore !== null && effectiveBaselineScore < 6.5) {
              atRiskPeriodScoresCollector[p].push(Number(entry.compositeScore))
            }
          }
        })

        // Bucketing & Comparison
        const baseBucket = getScoreBucket(effectiveBaselineScore)
        const currBucket = getScoreBucket(currentScore)

        if (baseBucket !== "CHUA_CO") {
          baselineBuckets[baseBucket] = (baselineBuckets[baseBucket] || 0) + 1
          totalWithBaseline++
          sumBaselineScore += effectiveBaselineScore!
          if (effectiveBaselineScore! < 6.5) {
            atRiskBaselineCount++
          }
        }

        if (currBucket !== "CHUA_CO") {
          currentBuckets[currBucket] = (currentBuckets[currBucket] || 0) + 1
          totalStudentsGraded++
          sumCurrentScore += currentScore!
        }

        let delta: number | null = null
        let statusTag = "UNGRADED"
        let statusLabel = "Chưa đủ dữ liệu"
        let statusColor = "slate"

        if (effectiveBaselineScore !== null && currentScore !== null) {
          totalWithBoth++
          delta = Math.round((currentScore - effectiveBaselineScore) * 100) / 100

          if (baseBucket !== "CHUA_CO" && currBucket !== "CHUA_CO") {
            transitionMatrixCounts[baseBucket][currBucket] = (transitionMatrixCounts[baseBucket][currBucket] || 0) + 1
          }

          if (effectiveBaselineScore < 6.5 && currentScore >= 6.5) {
            atRiskResolvedCount++
          }

          if (delta >= 1.0) {
            improvedCount++
            statusTag = "PROGRESS_HIGH"
            statusLabel = "Tiến bộ vượt bậc"
            statusColor = "emerald"
          } else if (delta > 0) {
            improvedCount++
            statusTag = "PROGRESS"
            statusLabel = "Có tiến bộ"
            statusColor = "teal"
          } else if (delta === 0) {
            statusTag = "STABLE"
            statusLabel = "Duy trì ổn định"
            statusColor = "blue"
          } else if (delta > -1.0) {
            statusTag = "SLIGHT_DROP"
            statusLabel = "Giảm nhẹ"
            statusColor = "amber"
          } else {
            regressedCount++
            statusTag = "REGRESS"
            statusLabel = "Cảnh báo sa sút"
            statusColor = "rose"
          }

          // Special highlight for at-risk cases
          if (effectiveBaselineScore < 5.0 && currentScore < 5.0) {
            statusTag = "URGENT_INTERVENTION"
            statusLabel = "Cần phụ đạo khẩn cấp"
            statusColor = "rose"
          } else if (effectiveBaselineScore < 6.5 && statusTag !== "PROGRESS_HIGH" && statusTag !== "PROGRESS") {
            statusTag = "AT_RISK"
            statusLabel = "Đầu vào yếu - Cần bám sát"
            statusColor = "amber"
          }
        } else if (effectiveBaselineScore !== null && effectiveBaselineScore < 6.5) {
          statusTag = "AT_RISK_NO_CURRENT"
          statusLabel = "Đầu vào cần theo dõi"
          statusColor = "amber"
        }

        // Build history by period
        const periodHistory: Record<string, number | null> = {}
        allPeriods.forEach(p => {
          const pe = periodsData?.get(p)
          periodHistory[p] = pe?.compositeScore !== null && pe?.compositeScore !== undefined ? Number(pe.compositeScore) : null
        })

        studentsTracking.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          gender: student.gender,
          className: student.class?.className || "",
          grade: student.class?.grade || "",
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          baselineScore: effectiveBaselineScore,
          isFromEntranceTest,
          currentScore,
          delta,
          statusTag,
          statusLabel,
          statusColor,
          remark: currentEntry?.remark || baselineEntry?.remark || "",
          periodHistory
        })
      })
    })

    // 7. Format Distribution Data for Recharts Bar Chart
    const distribution = [
      {
        bucket: "UNDER_5",
        name: "< 5.0 (Cần bám sát)",
        rangeLabel: "< 5.0 đ",
        baselineCount: baselineBuckets.UNDER_5 || 0,
        currentCount: currentBuckets.UNDER_5 || 0,
        baselinePercent: totalWithBaseline > 0 ? Math.round(((baselineBuckets.UNDER_5 || 0) / totalWithBaseline) * 100) : 0,
        currentPercent: totalStudentsGraded > 0 ? Math.round(((currentBuckets.UNDER_5 || 0) / totalStudentsGraded) * 100) : 0
      },
      {
        bucket: "FROM_5_TO_65",
        name: "5.0 - < 6.5 (Trung bình)",
        rangeLabel: "5.0 - 6.4 đ",
        baselineCount: baselineBuckets.FROM_5_TO_65 || 0,
        currentCount: currentBuckets.FROM_5_TO_65 || 0,
        baselinePercent: totalWithBaseline > 0 ? Math.round(((baselineBuckets.FROM_5_TO_65 || 0) / totalWithBaseline) * 100) : 0,
        currentPercent: totalStudentsGraded > 0 ? Math.round(((currentBuckets.FROM_5_TO_65 || 0) / totalStudentsGraded) * 100) : 0
      },
      {
        bucket: "FROM_65_TO_8",
        name: "6.5 - < 8.0 (Khá)",
        rangeLabel: "6.5 - 7.9 đ",
        baselineCount: baselineBuckets.FROM_65_TO_8 || 0,
        currentCount: currentBuckets.FROM_65_TO_8 || 0,
        baselinePercent: totalWithBaseline > 0 ? Math.round(((baselineBuckets.FROM_65_TO_8 || 0) / totalWithBaseline) * 100) : 0,
        currentPercent: totalStudentsGraded > 0 ? Math.round(((currentBuckets.FROM_65_TO_8 || 0) / totalStudentsGraded) * 100) : 0
      },
      {
        bucket: "FROM_8_TO_10",
        name: "8.0 - 10.0 (Giỏi/XS)",
        rangeLabel: "8.0 - 10 đ",
        baselineCount: baselineBuckets.FROM_8_TO_10 || 0,
        currentCount: currentBuckets.FROM_8_TO_10 || 0,
        baselinePercent: totalWithBaseline > 0 ? Math.round(((baselineBuckets.FROM_8_TO_10 || 0) / totalWithBaseline) * 100) : 0,
        currentPercent: totalStudentsGraded > 0 ? Math.round(((currentBuckets.FROM_8_TO_10 || 0) / totalStudentsGraded) * 100) : 0
      }
    ]

    // 8. Format Multi-Period Trend Data for Line Chart
    const multiPeriodTrend = allPeriods.map(p => {
      const scores = periodScoresCollector[p] || []
      const atRiskScores = atRiskPeriodScoresCollector[p] || []
      const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null
      const atRiskAvg = atRiskScores.length > 0 ? Math.round((atRiskScores.reduce((a, b) => a + b, 0) / atRiskScores.length) * 100) / 100 : null

      const periodNames: Record<string, string> = {
        KSĐN: "Khảo sát đầu năm",
        GK1: "Giữa kỳ 1",
        CK1: "Cuối kỳ 1",
        GK2: "Giữa kỳ 2",
        CK2: "Cuối kỳ 2"
      }

      return {
        period: p,
        periodName: periodNames[p] || p,
        averageScore: avg,
        atRiskAverageScore: atRiskAvg,
        totalGraded: scores.length
      }
    })

    // 9. Format Transition Matrix
    const transitionMatrix = Object.entries(transitionMatrixCounts).map(([fromBucket, toBuckets]) => {
      return {
        fromBucket,
        fromLabel: BUCKET_LABELS[fromBucket] || fromBucket,
        toUnder5: toBuckets.UNDER_5 || 0,
        toFrom5To65: toBuckets.FROM_5_TO_65 || 0,
        toFrom65To8: toBuckets.FROM_65_TO_8 || 0,
        toFrom8To10: toBuckets.FROM_8_TO_10 || 0,
        total: Object.values(toBuckets).reduce((a, b) => a + b, 0)
      }
    })

    // 10. Summary KPIs
    const currentAverage = totalStudentsGraded > 0 ? Math.round((sumCurrentScore / totalStudentsGraded) * 100) / 100 : 0
    const baselineAverage = totalWithBaseline > 0 ? Math.round((sumBaselineScore / totalWithBaseline) * 100) / 100 : 0
    const averageDelta = totalWithBoth > 0 ? Math.round((currentAverage - baselineAverage) * 100) / 100 : 0
    const improvedPercent = totalWithBoth > 0 ? Math.round((improvedCount / totalWithBoth) * 1000) / 10 : 0

    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: students.length,
        totalGraded: totalStudentsGraded,
        totalWithBaseline,
        totalWithBoth,
        currentAverage,
        baselineAverage,
        averageDelta,
        improvedCount,
        improvedPercent,
        atRiskBaselineCount,
        atRiskResolvedCount,
        regressedCount
      },
      distribution,
      multiPeriodTrend,
      transitionMatrix,
      studentsTracking,
      subjects: Array.from(subjectMap.values())
    })
  } catch (error: any) {
    console.error("Lỗi API grade-analytics:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
