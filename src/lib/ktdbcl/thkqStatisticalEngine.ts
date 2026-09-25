// @ts-nocheck
import { prisma } from "@/lib/db"

export interface ThkqFilterParams {
  academicYearId: string
  evaluationPeriod?: string // KSĐN, GK1, CK1, GK2, CK2, HK1, HK2, ALL
  level?: string // TIEU_HOC, THCS, THPT, ALL
  grade?: string // K1..K12, ALL
  subjectId?: string // subject id hoặc ALL
  campusId?: string // campus id hoặc ALL
  scoreRange?: string // ALL, UNDER_5, UNDER_BENCHMARK, 8_TO_10, PERFECT_10
  targetType?: string // ALL, BELOW_SKYLINE, BELOW_MOET, COMMITMENT, PSYCHOLOGICAL, PERFECT_10
  searchKeyword?: string
}

// Hàm chuẩn hóa Bậc học từ chuỗi class.level hoặc grade
export function normalizeLevel(levelStr?: string, gradeStr?: string): "TIEU_HOC" | "THCS" | "THPT" {
  const g = String(gradeStr || "").toUpperCase().replace(/[^0-9]/g, "")
  const gNum = parseInt(g, 10)
  if (!isNaN(gNum)) {
    if (gNum >= 1 && gNum <= 5) return "TIEU_HOC"
    if (gNum >= 6 && gNum <= 9) return "THCS"
    if (gNum >= 10 && gNum <= 12) return "THPT"
  }

  const lvl = String(levelStr || "").toLowerCase()
  if (lvl.includes("tiểu") || lvl.includes("tieu") || lvl.includes("primary")) return "TIEU_HOC"
  if (lvl.includes("thcs") || lvl.includes("trung học cơ sở") || lvl.includes("secondary")) return "THCS"
  if (lvl.includes("thpt") || lvl.includes("trung học phổ thông") || lvl.includes("high")) return "THPT"
  return "THCS"
}

// Chuẩn hóa tên khối dạng hiển thị (VD: K6 -> Khối 6)
export function formatGradeLabel(gradeStr: string): string {
  const num = String(gradeStr || "").replace(/[^0-9]/g, "")
  return num ? `Khối ${num}` : gradeStr
}

// Tính độ lệch chuẩn mẫu (Sample Standard Deviation)
export function calculateSampleStdDev(numbers: number[], mean: number): number {
  if (numbers.length <= 1) return 0
  const variance = numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numbers.length - 1)
  return Math.round(Math.sqrt(variance) * 100) / 100
}

export async function getThkqAnalyticsData(filters: ThkqFilterParams) {
  const {
    academicYearId,
    evaluationPeriod = "ALL",
    level = "ALL",
    grade = "ALL",
    subjectId = "ALL",
    campusId = "ALL",
    scoreRange = "ALL",
    targetType = "ALL",
    searchKeyword = ""
  } = filters

  if (!academicYearId) {
    throw new Error("academicYearId is required")
  }

  // 1. Lấy danh sách Cơ sở & Cấu hình Điểm chuẩn (Benchmark)
  const [campuses, benchmarkConfigs] = await Promise.all([
    prisma.campus.findMany({
      orderBy: { campusName: "asc" },
      select: { id: true, campusName: true, campusCode: true }
    }),
    prisma.subjectBenchmarkConfig.findMany({
      where: {
        academicYearId,
        ...(evaluationPeriod !== "ALL" ? { evaluationPeriod: { in: [evaluationPeriod, "ALL"] } } : {})
      }
    })
  ])

  // Helper tìm điểm chuẩn Sky-Line theo Level, Grade, Subject
  const getSkylineBenchmark = (lvl: string, grd: string, subId: string): number => {
    // 1. Config riêng cho subject + grade
    const specific = benchmarkConfigs.find(
      c => c.subjectId === subId && (c.grade === grd || c.grade === "ALL") && (c.level === lvl || c.level === "ALL")
    )
    if (specific && specific.benchmarkScore) return specific.benchmarkScore

    // 2. Config theo Level
    const levelConfig = benchmarkConfigs.find(
      c => (c.level === lvl || c.level === "ALL") && (c.grade === grd || c.grade === "ALL")
    )
    if (levelConfig && levelConfig.benchmarkScore) return levelConfig.benchmarkScore

    // 3. Mặc định: Tiểu học 7.0, THCS/THPT 6.0
    return lvl === "TIEU_HOC" ? 7.0 : 6.0
  }

  const MOET_BENCHMARK = 5.0

  // 2. Lấy danh sách Học sinh thuộc diện Cam kết đầu vào & Tâm lý
  const [supportTargets, learningCommitments] = await Promise.all([
    prisma.learningSupportTarget.findMany({
      where: {
        academicYearId,
        status: "ACTIVE"
      },
      select: {
        studentId: true,
        supportType: true,
        sourceType: true,
        reason: true
      }
    }),
    prisma.studentLearningCommitment.findMany({
      where: {
        academicYearId,
        status: "ACTIVE"
      },
      select: {
        studentId: true,
        content: true
      }
    })
  ])

  const commitmentStudentIds = new Set<string>()
  const psychologicalStudentIds = new Set<string>()

  learningCommitments.forEach(c => commitmentStudentIds.add(c.studentId))
  supportTargets.forEach(t => {
    const isCommitment =
      t.sourceType === "ADMISSION" ||
      (t.reason && (t.reason.toLowerCase().includes("cam kết") || t.reason.toLowerCase().includes("đầu vào")))
    if (isCommitment) commitmentStudentIds.add(t.studentId)

    const isPsych =
      t.supportType === "PSYCHOLOGICAL" ||
      t.sourceType === "TAM_LY" ||
      (t.reason && t.reason.toLowerCase().includes("tâm lý"))
    if (isPsych) psychologicalStudentIds.add(t.studentId)
  })

  // 3. Query bảng điểm SubjectGradeEntry
  const gradeEntryWhere: any = {
    academicYearId,
    ...(evaluationPeriod !== "ALL" ? { evaluationPeriod } : {}),
    ...(subjectId !== "ALL" ? { subjectId } : {})
  }

  // Điều kiện lọc theo Lớp/Khối/Cơ sở
  if (campusId !== "ALL" || grade !== "ALL") {
    const classWhere: any = {}
    if (campusId !== "ALL") classWhere.campusId = campusId
    if (grade !== "ALL") classWhere.grade = grade
    gradeEntryWhere.class = classWhere
  }

  const rawEntries = await prisma.subjectGradeEntry.findMany({
    where: gradeEntryWhere,
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          studentName: true
        }
      },
      subject: {
        select: {
          id: true,
          subjectCode: true,
          subjectName: true
        }
      },
      class: {
        select: {
          id: true,
          classCode: true,
          className: true,
          level: true,
          grade: true,
          campusId: true,
          campus: {
            select: { id: true, campusName: true, campusCode: true }
          },
          teachers: {
            where: { roleInClass: "GVCN" },
            include: { teacher: { select: { teacherName: true } } }
          }
        }
      }
    }
  })

  // Nếu không có dữ liệu trong SubjectGradeEntry hoặc kỳ là HK1/HK2 mà trống,
  // ta kiểm tra bổ sung từ StudentTermScore
  let processedEntries = rawEntries.map(e => ({
    id: e.id,
    studentId: e.studentId,
    studentCode: e.student?.studentCode || "",
    studentName: e.student?.studentName || "",
    subjectId: e.subjectId,
    subjectName: e.subject?.subjectName || "",
    classId: e.classId,
    className: e.class?.className || "",
    classCode: e.class?.classCode || "",
    level: normalizeLevel(e.class?.level, e.class?.grade),
    grade: e.class?.grade || "",
    campusId: e.class?.campusId || "",
    campusName: e.class?.campus?.campusName || "Cơ sở",
    homeroomTeacher: e.class?.teachers?.[0]?.teacher?.teacherName || "",
    score: e.compositeScore ?? null,
    evaluationPeriod: e.evaluationPeriod
  })).filter(e => e.score !== null && !isNaN(e.score))

  // Fallback nếu rỗng và evaluationPeriod là HK1 hoặc HK2
  if (processedEntries.length === 0 && (evaluationPeriod === "HK1" || evaluationPeriod === "HK2" || evaluationPeriod === "ALL")) {
    const termScores = await prisma.studentTermScore.findMany({
      where: {
        student: { academicYearId },
        ...(evaluationPeriod !== "ALL" ? { semester: evaluationPeriod } : {}),
        ...(subjectId !== "ALL" ? { subjectId } : {}),
        score: { not: null }
      },
      include: {
        student: {
          include: {
            class: {
              include: {
                campus: true,
                teachers: {
                  where: { roleInClass: "GVCN" },
                  include: { teacher: { select: { teacherName: true } } }
                }
              }
            }
          }
        },
        subject: true
      }
    })

    processedEntries = termScores.map(ts => ({
      id: ts.id,
      studentId: ts.studentId,
      studentCode: ts.student?.studentCode || "",
      studentName: ts.student?.studentName || "",
      subjectId: ts.subjectId,
      subjectName: ts.subject?.subjectName || "",
      classId: ts.student?.classId || "",
      className: ts.student?.class?.className || "",
      classCode: ts.student?.class?.classCode || "",
      level: normalizeLevel(ts.student?.class?.level, ts.student?.class?.grade),
      grade: ts.student?.class?.grade || "",
      campusId: ts.student?.class?.campusId || "",
      campusName: ts.student?.class?.campus?.campusName || "Cơ sở",
      homeroomTeacher: ts.student?.class?.teachers?.[0]?.teacher?.teacherName || "",
      score: ts.score ?? null,
      evaluationPeriod: ts.semester
    })).filter(e => e.score !== null && !isNaN(e.score))
  }

  // Lọc thêm theo Level nếu filters.level !== "ALL"
  if (level !== "ALL") {
    processedEntries = processedEntries.filter(e => e.level === level)
  }

  // 4. Tính toán Điểm trung bình Hệ thống & Cơ sở & Khối theo Môn học
  // Map key: [subjectId] -> { scores: [] }
  // Map key: [subjectId_campusId] -> { scores: [] }
  // Map key: [subjectId_grade] -> { scores: [] }
  // Map key: [subjectId_classId] -> { scores: [] }
  const subjectSystemScores = new Map<string, number[]>()
  const subjectCampusScores = new Map<string, number[]>()
  const subjectGradeScores = new Map<string, number[]>()
  const subjectClassScores = new Map<string, { scores: number[]; info: any }>()

  processedEntries.forEach(item => {
    const sId = item.subjectId
    const sScore = item.score

    // System
    if (!subjectSystemScores.has(sId)) subjectSystemScores.set(sId, [])
    subjectSystemScores.get(sId)!.push(sScore)

    // Campus
    const campusKey = `${sId}_${item.campusId}`
    if (!subjectCampusScores.has(campusKey)) subjectCampusScores.set(campusKey, [])
    subjectCampusScores.get(campusKey)!.push(sScore)

    // Grade
    const gradeKey = `${sId}_${item.grade}`
    if (!subjectGradeScores.has(gradeKey)) subjectGradeScores.set(gradeKey, [])
    subjectGradeScores.get(gradeKey)!.push(sScore)

    // Class
    const classKey = `${sId}_${item.classId}`
    if (!subjectClassScores.has(classKey)) {
      subjectClassScores.set(classKey, { scores: [], info: item })
    }
    subjectClassScores.get(classKey)!.scores.push(sScore)
  })

  const calcAvg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0)

  // 5. Thống kê theo Lớp (Class Analytics)
  const classStats: any[] = []
  subjectClassScores.forEach(({ scores, info }) => {
    const avgScore = calcAvg(scores)
    const stdDev = calculateSampleStdDev(scores, avgScore)

    const gradeScores = subjectGradeScores.get(`${info.subjectId}_${info.grade}`) || []
    const gradeAvgScore = calcAvg(gradeScores)

    const campusScores = subjectCampusScores.get(`${info.subjectId}_${info.campusId}`) || []
    const campusAvgScore = calcAvg(campusScores)

    const systemScores = subjectSystemScores.get(info.subjectId) || []
    const systemAvgScore = calcAvg(systemScores)

    const skylineBenchmark = getSkylineBenchmark(info.level, info.grade, info.subjectId)

    const below5Count = scores.filter(s => s < MOET_BENCHMARK).length
    const belowSkylineCount = scores.filter(s => s < skylineBenchmark).length
    const perfect10Count = scores.filter(s => s >= 10.0).length

    classStats.push({
      classId: info.classId,
      className: info.className,
      classCode: info.classCode,
      campusId: info.campusId,
      campusName: info.campusName,
      level: info.level,
      grade: info.grade,
      gradeLabel: formatGradeLabel(info.grade),
      subjectId: info.subjectId,
      subjectName: info.subjectName,
      homeroomTeacher: info.homeroomTeacher,
      studentCount: scores.length,
      avgScore,
      gradeAvgScore,
      campusAvgScore,
      systemAvgScore,
      stdDev,
      deltaCampus: Math.round((avgScore - campusAvgScore) * 100) / 100,
      deltaGrade: Math.round((avgScore - gradeAvgScore) * 100) / 100,
      below5Count,
      below5Rate: scores.length ? Math.round((below5Count / scores.length) * 1000) / 10 : 0,
      belowSkylineCount,
      belowSkylineRate: scores.length ? Math.round((belowSkylineCount / scores.length) * 1000) / 10 : 0,
      perfect10Count
    })
  })

  // Sắp xếp Lớp theo Khối -> Tên lớp
  classStats.sort((a, b) => (a.grade === b.grade ? a.className.localeCompare(b.className) : a.grade.localeCompare(b.grade)))

  // 6. Xây dựng Bản đồ nhiệt (Heatmap Matrix) - Phân tích điểm < 5 các môn theo Khối & Cơ sở
  // Cột: Tập hợp các khối có trong dữ liệu (sắp xếp K1..K12), nhóm theo Cơ sở và Toàn hệ thống
  const allGradesSet = new Set<string>()
  const allSubjectsMap = new Map<string, string>()

  processedEntries.forEach(e => {
    if (e.grade) allGradesSet.add(e.grade)
    if (e.subjectId && e.subjectName) allSubjectsMap.set(e.subjectId, e.subjectName)
  })

  const sortedGrades = Array.from(allGradesSet).sort((a, b) => {
    const na = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0
    const nb = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0
    return na - nb
  })

  // Cấu trúc cột Heatmap: Mỗi Campus có các Grade, và cột Toàn hệ thống có các Grade
  const heatmapColumns: any[] = []
  campuses.forEach(cp => {
    sortedGrades.forEach(grd => {
      heatmapColumns.push({
        key: `${cp.id}_${grd}`,
        campusId: cp.id,
        campusName: cp.campusName,
        grade: grd,
        gradeLabel: formatGradeLabel(grd),
        label: `${cp.campusName} - ${formatGradeLabel(grd)}`
      })
    })
  })

  // Cột Toàn hệ thống
  sortedGrades.forEach(grd => {
    heatmapColumns.push({
      key: `SYSTEM_${grd}`,
      campusId: "SYSTEM",
      campusName: "Toàn Hệ Thống",
      grade: grd,
      gradeLabel: formatGradeLabel(grd),
      label: `Hệ thống - ${formatGradeLabel(grd)}`
    })
  })

  // Tạo các hàng môn học cho Heatmap
  const heatmapRows: any[] = []
  allSubjectsMap.forEach((subName, subId) => {
    const rowCells: Record<string, any> = {}

    heatmapColumns.forEach(col => {
      let matchingEntries: any[] = []
      if (col.campusId === "SYSTEM") {
        matchingEntries = processedEntries.filter(e => e.subjectId === subId && e.grade === col.grade)
      } else {
        matchingEntries = processedEntries.filter(
          e => e.subjectId === subId && e.grade === col.grade && e.campusId === col.campusId
        )
      }

      const below5Entries = matchingEntries.filter(e => e.score < MOET_BENCHMARK)
      const below5 = below5Entries.length
      const rate = total > 0 ? Math.round((below5 / total) * 1000) / 10 : 0

      rowCells[col.key] = {
        total,
        below5,
        rate,
        subjectId: subId,
        subjectName: subName,
        campusId: col.campusId,
        campusName: col.campusName,
        grade: col.grade,
        gradeLabel: col.gradeLabel,
        students: below5Entries.map(e => {
          const benchmark = getSkylineBenchmark(e.level, e.grade, e.subjectId)
          return {
            id: e.id,
            studentId: e.studentId,
            studentCode: e.studentCode,
            studentName: e.studentName,
            className: e.className,
            campusId: e.campusId,
            campusName: e.campusName,
            subjectId: e.subjectId,
            subjectName: e.subjectName,
            score: e.score,
            skylineBenchmark: benchmark,
            deltaSkyline: Math.round((e.score - benchmark) * 100) / 100,
            isCommitment: commitmentStudentIds.has(e.studentId),
            isPsychological: psychologicalStudentIds.has(e.studentId),
            homeroomTeacher: e.homeroomTeacher
          }
        })
      }
    })

    heatmapRows.push({
      subjectId: subId,
      subjectName: subName,
      cells: rowCells
    })
  })

  // Sắp xếp môn học theo tên
  heatmapRows.sort((a, b) => a.subjectName.localeCompare(b.subjectName))

  // 7. Thống kê KPI Tổng hợp (Metrics Cards)
  const kpiTotalScores = processedEntries.length
  const kpiBelow5 = processedEntries.filter(e => e.score < MOET_BENCHMARK).length
  let kpiBelowSkyline = 0
  let kpiAboveSkyline = 0
  const kpi8To10 = processedEntries.filter(e => e.score >= 8.0 && e.score <= 10.0).length
  const kpiPerfect10 = processedEntries.filter(e => e.score >= 10.0).length

  processedEntries.forEach(e => {
    const benchmark = getSkylineBenchmark(e.level, e.grade, e.subjectId)
    if (e.score < benchmark) {
      kpiBelowSkyline++
    } else {
      kpiAboveSkyline++
    }
  })

  const kpi = {
    totalEvaluations: kpiTotalScores,
    below5Count: kpiBelow5,
    below5Rate: kpiTotalScores ? Math.round((kpiBelow5 / kpiTotalScores) * 1000) / 10 : 0,
    belowSkylineCount: kpiBelowSkyline,
    belowSkylineRate: kpiTotalScores ? Math.round((kpiBelowSkyline / kpiTotalScores) * 1000) / 10 : 0,
    aboveSkylineCount: kpiAboveSkyline,
    aboveSkylineRate: kpiTotalScores ? Math.round((kpiAboveSkyline / kpiTotalScores) * 1000) / 10 : 0,
    score8To10Count: kpi8To10,
    score8To10Rate: kpiTotalScores ? Math.round((kpi8To10 / kpiTotalScores) * 1000) / 10 : 0,
    perfect10Count: kpiPerfect10,
    perfect10Rate: kpiTotalScores ? Math.round((kpiPerfect10 / kpiTotalScores) * 1000) / 10 : 0
  }

  // 8. Dữ liệu Biểu đồ So sánh (Recharts Data)
  // Biểu đồ A: So sánh chất lượng các môn theo Khối giữa từng Cơ sở & Hệ thống
  const chartByCampusGrade: any[] = sortedGrades.map(grd => {
    const row: any = {
      grade: grd,
      gradeLabel: formatGradeLabel(grd)
    }

    campuses.forEach(cp => {
      const items = processedEntries.filter(e => e.grade === grd && e.campusId === cp.id)
      const avg = calcAvg(items.map(i => i.score))
      row[cp.campusName] = avg
    })

    const sysItems = processedEntries.filter(e => e.grade === grd)
    row["Hệ thống"] = calcAvg(sysItems.map(i => i.score))
    return row
  })

  // Biểu đồ B: So sánh chất lượng môn học của Cơ sở được chọn với Mặt bằng Hệ thống
  const chartSubjectSystem: any[] = []
  allSubjectsMap.forEach((subName, subId) => {
    const sysItems = processedEntries.filter(e => e.subjectId === subId)
    const sysAvg = calcAvg(sysItems.map(i => i.score))

    let campusAvg = sysAvg
    let campusDisplayName = "Toàn hệ thống"
    if (campusId !== "ALL") {
      const cItems = processedEntries.filter(e => e.subjectId === subId && e.campusId === campusId)
      campusAvg = calcAvg(cItems.map(i => i.score))
      const foundCampus = campuses.find(c => c.id === campusId)
      campusDisplayName = foundCampus ? foundCampus.campusName : "Cơ sở"
    }

    chartSubjectSystem.push({
      subjectId: subId,
      subjectName: subName,
      campusDisplayName,
      campusAvg,
      systemAvg: sysAvg,
      delta: Math.round((campusAvg - sysAvg) * 100) / 100
    })
  })

  // Biểu đồ C: Phân bổ phổ điểm (Distribution)
  const distribution = [
    { range: "< 5.0 (Chưa đạt)", count: 0, color: "#EF4444" },
    { range: "5.0 - 6.4 (Trung bình)", count: 0, color: "#F59E0B" },
    { range: "6.5 - 7.9 (Khá)", count: 0, color: "#3B82F6" },
    { range: "8.0 - 8.9 (Giỏi)", count: 0, color: "#10B981" },
    { range: "9.0 - 10.0 (Xuất sắc)", count: 0, color: "#8B5CF6" }
  ]
  processedEntries.forEach(e => {
    const s = e.score
    if (s < 5.0) distribution[0].count++
    else if (s < 6.5) distribution[1].count++
    else if (s < 8.0) distribution[2].count++
    else if (s < 9.0) distribution[3].count++
    else distribution[4].count++
  })

  // 9. Danh sách Học sinh Trọng tâm (Target Focus Students)
  let targetStudents: any[] = processedEntries.map(e => {
    const skylineBenchmark = getSkylineBenchmark(e.level, e.grade, e.subjectId)
    const isBelowSkyline = e.score < skylineBenchmark
    const isBelowMoet = e.score < MOET_BENCHMARK
    const isCommitment = commitmentStudentIds.has(e.studentId)
    const isPsychological = psychologicalStudentIds.has(e.studentId)
    const isPerfect10 = e.score >= 10.0
    const isScore8To10 = e.score >= 8.0 && e.score <= 10.0

    return {
      id: e.id,
      studentId: e.studentId,
      studentCode: e.studentCode,
      studentName: e.studentName,
      classId: e.classId,
      className: e.className,
      campusId: e.campusId,
      campusName: e.campusName,
      level: e.level,
      grade: e.grade,
      gradeLabel: formatGradeLabel(e.grade),
      subjectId: e.subjectId,
      subjectName: e.subjectName,
      score: e.score,
      skylineBenchmark,
      moetBenchmark: MOET_BENCHMARK,
      deltaSkyline: Math.round((e.score - skylineBenchmark) * 100) / 100,
      deltaMoet: Math.round((e.score - MOET_BENCHMARK) * 100) / 100,
      isBelowSkyline,
      isBelowMoet,
      isCommitment,
      isPsychological,
      isPerfect10,
      isScore8To10,
      homeroomTeacher: e.homeroomTeacher
    }
  })

  // Lọc theo searchKeyword (Mã HS hoặc Tên HS hoặc Lớp)
  if (searchKeyword.trim()) {
    const kw = searchKeyword.toLowerCase().trim()
    targetStudents = targetStudents.filter(
      s =>
        s.studentName.toLowerCase().includes(kw) ||
        s.studentCode.toLowerCase().includes(kw) ||
        s.className.toLowerCase().includes(kw)
    )
  }

  // Lọc theo scoreRange
  if (scoreRange === "UNDER_5") {
    targetStudents = targetStudents.filter(s => s.isBelowMoet)
  } else if (scoreRange === "UNDER_BENCHMARK") {
    targetStudents = targetStudents.filter(s => s.isBelowSkyline)
  } else if (scoreRange === "8_TO_10") {
    targetStudents = targetStudents.filter(s => s.isScore8To10)
  } else if (scoreRange === "PERFECT_10") {
    targetStudents = targetStudents.filter(s => s.isPerfect10)
  }

  // Lọc theo targetType
  if (targetType === "BELOW_SKYLINE") {
    targetStudents = targetStudents.filter(s => s.isBelowSkyline)
  } else if (targetType === "BELOW_MOET") {
    targetStudents = targetStudents.filter(s => s.isBelowMoet)
  } else if (targetType === "COMMITMENT") {
    targetStudents = targetStudents.filter(s => s.isCommitment)
  } else if (targetType === "PSYCHOLOGICAL") {
    targetStudents = targetStudents.filter(s => s.isPsychological)
  } else if (targetType === "PERFECT_10") {
    targetStudents = targetStudents.filter(s => s.isPerfect10)
  }

  return {
    kpi,
    benchmarks: {
      defaultTieuHoc: 7.0,
      defaultThcs: 6.0,
      defaultThpt: 6.0,
      moet: 5.0
    },
    heatmap: {
      columns: heatmapColumns,
      rows: heatmapRows
    },
    classStats,
    charts: {
      byCampusGrade: chartByCampusGrade,
      bySubjectSystem: chartSubjectSystem,
      distribution
    },
    targetStudents: targetStudents.slice(0, 500), // Giới hạn 500 HS để tối ưu render ban đầu
    totalTargetStudentsCount: targetStudents.length,
    countsByTargetGroup: {
      belowSkyline: targetStudents.filter(s => s.isBelowSkyline).length,
      belowMoet: targetStudents.filter(s => s.isBelowMoet).length,
      commitment: targetStudents.filter(s => s.isCommitment).length,
      psychological: targetStudents.filter(s => s.isPsychological).length,
      perfect10: targetStudents.filter(s => s.isPerfect10).length
    }
  }
}
