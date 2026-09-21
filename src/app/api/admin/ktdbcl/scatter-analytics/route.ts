// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  calculateMean,
  calculateMedian,
  calculateStdDev,
  calculateCV,
  calculatePearsonCorrelation,
  calculateLinearRegression,
  detectOutliers,
  classifyQuadrant,
  getGDPT2018Classification,
  SKYLINE_QUADRANTS
} from "@/lib/grading/statistical-engine"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get("academicYearId") || ""
    const campusId = searchParams.get("campusId") || "ALL"
    const levelFilter = searchParams.get("levelFilter") || "ALL"
    const gradeFilter = searchParams.get("gradeFilter") || "ALL"
    const classId = searchParams.get("classId") || "ALL"
    const subjectId = searchParams.get("subjectId") || ""
    const semester = searchParams.get("semester") || "ALL"
    const mode = searchParams.get("mode") || "GROWTH" // "GROWTH" | "FORMATIVE_SUMMATIVE" | "CROSS_SUBJECT" | "ADMISSION_PERFORMANCE"
    const periodX = searchParams.get("periodX") || "KSĐN"
    const periodY = searchParams.get("periodY") || "GK1"
    const compareSubjectId = searchParams.get("compareSubjectId") || ""

    if (!academicYearId) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin Năm học" }, { status: 400 })
    }

    // 1. Lọc danh sách Lớp học theo Năm học & Cơ sở
    const classWhere: any = {
      academicYearId,
      status: "ACTIVE"
    }
    if (classId && classId !== "ALL") {
      classWhere.id = classId
    }
    if (campusId && campusId !== "ALL") {
      classWhere.campusId = campusId
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      select: {
        id: true,
        className: true,
        grade: true,
        level: true,
        educationSystem: true,
        campusId: true,
        homeroomTeacherId: true,
        campus: {
          select: {
            id: true,
            campusName: true,
            campusCode: true
          }
        }
      },
      orderBy: { className: "asc" }
    })

    // Lọc theo Cấp học & Khối
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

      return true
    })

    const classIds = filteredClasses.map(c => c.id)
    if (classIds.length === 0) {
      return NextResponse.json({
        success: true,
        points: [],
        metrics: null,
        quadrants: {
          q1: { count: 0, percent: 0, definition: SKYLINE_QUADRANTS.Q1 },
          q2: { count: 0, percent: 0, definition: SKYLINE_QUADRANTS.Q2 },
          q3: { count: 0, percent: 0, definition: SKYLINE_QUADRANTS.Q3 },
          q4: { count: 0, percent: 0, definition: SKYLINE_QUADRANTS.Q4 }
        },
        classesAggregated: [],
        meta: { mode, labelX: "Trục X", labelY: "Trục Y" }
      })
    }

    // 2. Lấy thông tin Môn học
    const subjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, subjectName: true, subjectCode: true }
    })

    const activeSubject = subjects.find(s => s.id === subjectId) || subjects[0]
    const secondarySubject = compareSubjectId ? subjects.find(s => s.id === compareSubjectId) : null

    // 3. Lấy cấu hình Điểm Chuẩn Sky-Line (SubjectBenchmarkConfig)
    const p = prisma as any
    const benchmarkConfigs = p.subjectBenchmarkConfig?.findMany
      ? await p.subjectBenchmarkConfig.findMany({ where: { academicYearId } })
      : []

    const resolveBenchmark = (level: string, grade: string, subId: string, period: string): number => {
      const cleanLevel = (level || "").toLowerCase()
      const cleanGrade = (grade || "").toLowerCase()
      const isPrimary = cleanLevel.includes("tiểu học") || cleanLevel.includes("tieu hoc") || ["1", "2", "3", "4", "5"].some(g => cleanGrade === g || cleanGrade === `khối ${g}`)
      const defaultScore = isPrimary ? 7.0 : 6.0

      if (!benchmarkConfigs || benchmarkConfigs.length === 0) return defaultScore

      const levelCode = isPrimary ? "TIEU_HOC" : (["6", "7", "8", "9"].some(g => cleanGrade === g || cleanGrade === `khối ${g}`) ? "THCS" : "THPT")
      const match = benchmarkConfigs.find((b: any) =>
        b.subjectId === subId &&
        (b.grade === grade || b.grade === "ALL") &&
        (b.evaluationPeriod === period || b.evaluationPeriod === "ALL")
      )
      if (match) return match.benchmarkScore

      const matchLevel = benchmarkConfigs.find((b: any) => b.level === levelCode && (b.subjectId === "ALL" || !b.subjectId))
      if (matchLevel) return matchLevel.benchmarkScore

      return defaultScore
    }

    // 4. Lấy danh sách Học sinh
    const students = await prisma.student.findMany({
      where: { classId: { in: classIds }, status: "ACTIVE" },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        dateOfBirth: true,
        classId: true
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = students.map(s => s.id)
    const studentCodes = students.map(s => s.studentCode).filter(Boolean)

    // 5. Lấy Phân công giảng dạy (TeachingAssignment)
    const teachingAssignments = await prisma.teachingAssignment.findMany({
      where: {
        classId: { in: classIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        teacher: { select: { id: true, teacherName: true, teacherCode: true } }
      }
    })
    const taMap = new Map<string, any>()
    teachingAssignments.forEach((ta: any) => {
      taMap.set(`${ta.classId}_${ta.subjectId}`, ta)
    })

    // 6. Lấy Hồ sơ ĐGNL Tuyển sinh (InputAssessmentStudent) & Cam kết Học tập (StudentLearningCommitment)
    const entranceMap = new Map<string, any>()
    if (studentCodes.length > 0 && p.inputAssessmentStudent?.findMany) {
      try {
        const records = await p.inputAssessmentStudent.findMany({
          where: { studentCode: { in: studentCodes } }
        })
        records.forEach((r: any) => {
          if (r.studentCode) entranceMap.set(r.studentCode.trim().toUpperCase(), r)
        })
      } catch (e) {
        console.warn("Lỗi đọc inputAssessmentStudent:", e)
      }
    }

    const commitmentMap = new Map<string, any>()
    if (studentIds.length > 0 && p.studentLearningCommitment?.findMany) {
      try {
        const comms = await p.studentLearningCommitment.findMany({
          where: { studentId: { in: studentIds } }
        })
        comms.forEach((c: any) => commitmentMap.set(c.studentId, c))
      } catch (e) {
        console.warn("Lỗi đọc studentLearningCommitment:", e)
      }
    }

    // 7. Truy vấn Điểm số (SubjectGradeEntry)
    const targetSubjectIds = [activeSubject.id]
    if (mode === "CROSS_SUBJECT" && secondarySubject) {
      targetSubjectIds.push(secondarySubject.id)
    }

    const targetPeriods = Array.from(new Set([periodX, periodY]))

    const entries = await p.subjectGradeEntry.findMany({
      where: {
        academicYearId,
        classId: { in: classIds },
        subjectId: { in: targetSubjectIds }
      }
    })

    // Index entries: studentId -> subjectId -> period -> entry
    const entryMap = new Map<string, Map<string, Map<string, any>>>()
    entries.forEach((e: any) => {
      if (!entryMap.has(e.studentId)) entryMap.set(e.studentId, new Map())
      const subMap = entryMap.get(e.studentId)!
      if (!subMap.has(e.subjectId)) subMap.set(e.subjectId, new Map())
      subMap.get(e.subjectId)!.set(e.evaluationPeriod, e)
    })

    // 8. Dựng Danh sách Điểm Tọa độ (Points) theo 4 Chế độ
    let labelX = ""
    let labelY = ""
    let defaultBenchX = 6.0
    let defaultBenchY = 6.0

    const rawPoints: any[] = []

    students.forEach(st => {
      const cls = filteredClasses.find(c => c.id === st.classId)
      if (!cls) return

      const cleanCode = (st.studentCode || "").trim().toUpperCase()
      const entranceInfo = entranceMap.get(cleanCode) || null
      const learningCommitment = commitmentMap.get(st.id) || null
      const ta = taMap.get(`${cls.id}_${activeSubject.id}`)
      const teacherName = ta?.teacher?.teacherName || "Chưa phân công"
      const teacherCode = ta?.teacher?.teacherCode || ""

      const subEntries = entryMap.get(st.id)?.get(activeSubject.id)
      const currentEntry = subEntries?.get(periodY)

      let valX: number | null = null
      let valY: number | null = null

      if (mode === "GROWTH") {
        labelX = `Kỳ trước: ${periodX}`
        labelY = `Kỳ này: ${periodY}`
        defaultBenchX = resolveBenchmark(cls.level, cls.grade, activeSubject.id, periodX)
        defaultBenchY = resolveBenchmark(cls.level, cls.grade, activeSubject.id, periodY)

        const entryX = subEntries?.get(periodX)
        const entryY = subEntries?.get(periodY)
        if (entryX?.compositeScore !== null && entryX?.compositeScore !== undefined) valX = Number(entryX.compositeScore)
        if (entryY?.compositeScore !== null && entryY?.compositeScore !== undefined) valY = Number(entryY.compositeScore)
      } else if (mode === "FORMATIVE_SUMMATIVE") {
        labelX = `ĐGTX Thường xuyên (${periodY})`
        labelY = `ĐGĐK Định kỳ (${periodY})`
        defaultBenchX = resolveBenchmark(cls.level, cls.grade, activeSubject.id, periodY)
        defaultBenchY = defaultBenchX

        if (currentEntry) {
          // Trích xuất điểm ĐGTX từ componentScores JSON
          if (currentEntry.componentScores) {
            try {
              const comp = typeof currentEntry.componentScores === "string"
                ? JSON.parse(currentEntry.componentScores)
                : currentEntry.componentScores

              const txScores: number[] = []
              Object.keys(comp).forEach(k => {
                const lk = k.toLowerCase()
                if ((lk.includes("tx") || lk.includes("thường xuyên") || lk.includes("ddgtx")) && comp[k] !== null && comp[k] !== undefined) {
                  const num = Number(comp[k])
                  if (!isNaN(num)) txScores.push(num)
                }
              })
              if (txScores.length > 0) {
                valX = calculateMean(txScores)
              }
            } catch (e) {}
          }

          // Trích xuất điểm ĐGĐK từ componentScores hoặc fallback compositeScore
          if (currentEntry.componentScores) {
            try {
              const comp = typeof currentEntry.componentScores === "string"
                ? JSON.parse(currentEntry.componentScores)
                : currentEntry.componentScores

              Object.keys(comp).forEach(k => {
                const lk = k.toLowerCase()
                if ((lk.includes("gk") || lk.includes("ck") || lk.includes("định kỳ") || lk.includes("ddg")) && comp[k] !== null && comp[k] !== undefined) {
                  const num = Number(comp[k])
                  if (!isNaN(num) && valY === null) valY = num
                }
              })
            } catch (e) {}
          }
          if (valY === null && currentEntry.compositeScore !== null && currentEntry.compositeScore !== undefined) {
            valY = Number(currentEntry.compositeScore)
          }
          if (valX === null && currentEntry.compositeScore !== null) {
            valX = Number(currentEntry.compositeScore) // fallback nếu chưa có chi tiết TX
          }
        }
      } else if (mode === "CROSS_SUBJECT") {
        const subAName = activeSubject.subjectName
        const subBName = secondarySubject?.subjectName || "Môn so sánh"
        labelX = `${subAName} (${periodY})`
        labelY = `${subBName} (${periodY})`
        defaultBenchX = resolveBenchmark(cls.level, cls.grade, activeSubject.id, periodY)
        defaultBenchY = secondarySubject ? resolveBenchmark(cls.level, cls.grade, secondarySubject.id, periodY) : defaultBenchX

        const entryA = subEntries?.get(periodY)
        const entryB = secondarySubject ? entryMap.get(st.id)?.get(secondarySubject.id)?.get(periodY) : null

        if (entryA?.compositeScore !== null && entryA?.compositeScore !== undefined) valX = Number(entryA.compositeScore)
        if (entryB?.compositeScore !== null && entryB?.compositeScore !== undefined) valY = Number(entryB.compositeScore)
      } else if (mode === "ADMISSION_PERFORMANCE") {
        labelX = "Điểm ĐGNL Đầu vào Tuyển sinh"
        labelY = `Điểm Khảo sát ${activeSubject.subjectName} (${periodY})`
        defaultBenchX = 6.0
        defaultBenchY = resolveBenchmark(cls.level, cls.grade, activeSubject.id, periodY)

        if (entranceInfo) {
          const sName = (activeSubject.subjectName || "").toLowerCase()
          if (sName.includes("toán") && entranceInfo.mathScore !== null && entranceInfo.mathScore !== undefined) {
            valX = Number(entranceInfo.mathScore)
          } else if ((sName.includes("văn") || sName.includes("ngữ văn")) && entranceInfo.literatureScore !== null) {
            valX = Number(entranceInfo.literatureScore)
          } else if (sName.includes("anh") && entranceInfo.writtenEnglishScore !== null) {
            valX = Number(entranceInfo.writtenEnglishScore)
          } else {
            // Điểm trung bình các môn thi đầu vào
            const scores = [entranceInfo.mathScore, entranceInfo.literatureScore, entranceInfo.writtenEnglishScore].filter(sc => sc !== null && sc !== undefined).map(Number)
            if (scores.length > 0) valX = calculateMean(scores)
          }
        }

        if (currentEntry?.compositeScore !== null && currentEntry?.compositeScore !== undefined) {
          valY = Number(currentEntry.compositeScore)
        }
      }

      // Chỉ giữ lại những học sinh có đủ cả 2 tọa độ X và Y
      if (valX !== null && !isNaN(valX) && valY !== null && !isNaN(valY)) {
        valX = Math.round(valX * 10) / 10
        valY = Math.round(valY * 10) / 10
        const delta = Math.round((valY - valX) * 10) / 10
        const quadrant = classifyQuadrant(valX, valY, defaultBenchX, defaultBenchY)
        const classification = getGDPT2018Classification(valY)

        const hasAdmissionCommitment = Boolean(
          entranceInfo && (
            (entranceInfo.admissionCriteria && entranceInfo.admissionCriteria.toLowerCase().includes("cam kết")) ||
            (entranceInfo.admissionResult && entranceInfo.admissionResult.toLowerCase().includes("cam kết")) ||
            (entranceInfo.targetType && entranceInfo.targetType.toLowerCase().includes("cam kết")) ||
            entranceInfo.directorNote
          )
        )

        rawPoints.push({
          id: `${st.id}_${activeSubject.id}`,
          studentId: st.id,
          studentCode: st.studentCode,
          studentName: st.studentName,
          gender: st.gender,
          dateOfBirth: st.dateOfBirth,
          classId: cls.id,
          className: cls.className,
          grade: cls.grade,
          level: cls.level,
          campusId: cls.campusId,
          campusName: cls.campus?.campusName || "",
          teacherName,
          teacherCode,
          subjectId: activeSubject.id,
          subjectName: activeSubject.subjectName,
          x: valX,
          y: valY,
          delta,
          quadrant,
          classification,
          hasAdmissionCommitment,
          hasLearningCommitment: Boolean(learningCommitment),
          isBelowBenchmark: valY < defaultBenchY,
          isAtRisk: valY < 5.0,
          remark: currentEntry?.remark || null,
          componentScores: currentEntry?.componentScores || null,
          entranceInfo: entranceInfo ? {
            mathScore: entranceInfo.mathScore,
            literatureScore: entranceInfo.literatureScore,
            writtenEnglishScore: entranceInfo.writtenEnglishScore,
            admissionCriteria: entranceInfo.admissionCriteria,
            directorNote: entranceInfo.directorNote
          } : null,
          learningCommitment: learningCommitment ? {
            content: learningCommitment.content,
            teacherName: learningCommitment.teacherName,
            status: learningCommitment.status
          } : null
        })
      }
    })

    // 9. Nhận diện Điểm Ngoại lai (Outliers)
    const outlierSet = detectOutliers(rawPoints)
    const points = rawPoints.map(p => ({
      ...p,
      isOutlier: outlierSet.has(p.id)
    }))

    // 10. Tính toán Chỉ số Thống kê Tổng quan (Metrics)
    let metrics: any = null
    if (points.length > 0) {
      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)

      const meanX = calculateMean(xs)
      const meanY = calculateMean(ys)
      const medianX = calculateMedian(xs)
      const medianY = calculateMedian(ys)
      const stdDevX = calculateStdDev(xs)
      const stdDevY = calculateStdDev(ys)
      const cvX = calculateCV(meanX, stdDevX)
      const cvY = calculateCV(meanY, stdDevY)
      const pearsonR = calculatePearsonCorrelation(points)
      const regression = calculateLinearRegression(points)

      const passRateX = Math.round((points.filter(p => p.x >= defaultBenchX).length / points.length) * 1000) / 10
      const passRateY = Math.round((points.filter(p => p.y >= defaultBenchY).length / points.length) * 1000) / 10
      const atRiskCount = points.filter(p => p.y < 5.0).length

      metrics = {
        n: points.length,
        meanX,
        meanY,
        medianX,
        medianY,
        stdDevX,
        stdDevY,
        cvX,
        cvY,
        pearsonR,
        rSquared: regression.rSquared,
        regressionEquation: regression.equation,
        regressionSlope: regression.slope,
        regressionIntercept: regression.intercept,
        passRateX,
        passRateY,
        atRiskCount,
        outlierCount: outlierSet.size,
        benchmarkX: defaultBenchX,
        benchmarkY: defaultBenchY
      }
    }

    // 11. Thống kê 4 Góc phần tư (Quadrant Counts & Percentages)
    const totalPoints = points.length
    const q1Points = points.filter(p => p.quadrant === "Q1")
    const q2Points = points.filter(p => p.quadrant === "Q2")
    const q3Points = points.filter(p => p.quadrant === "Q3")
    const q4Points = points.filter(p => p.quadrant === "Q4")

    const pct = (cnt: number) => totalPoints > 0 ? Math.round((cnt / totalPoints) * 1000) / 10 : 0

    const quadrants = {
      q1: { count: q1Points.length, percent: pct(q1Points.length), definition: SKYLINE_QUADRANTS.Q1 },
      q2: { count: q2Points.length, percent: pct(q2Points.length), definition: SKYLINE_QUADRANTS.Q2 },
      q3: { count: q3Points.length, percent: pct(q3Points.length), definition: SKYLINE_QUADRANTS.Q3 },
      q4: { count: q4Points.length, percent: pct(q4Points.length), definition: SKYLINE_QUADRANTS.Q4 }
    }

    // 12. Tổng hợp theo Cấp độ Lớp học & Giáo viên (Classes Aggregated)
    const classMap = new Map<string, any[]>()
    points.forEach(p => {
      if (!classMap.has(p.classId)) classMap.set(p.classId, [])
      classMap.get(p.classId)!.push(p)
    })

    const classesAggregated = Array.from(classMap.entries()).map(([cId, cPoints]) => {
      const first = cPoints[0]
      const xs = cPoints.map(p => p.x)
      const ys = cPoints.map(p => p.y)
      const meanX = calculateMean(xs)
      const meanY = calculateMean(ys)
      const stdDevY = calculateStdDev(ys)
      const passedCount = cPoints.filter(p => p.y >= defaultBenchY).length
      const atRiskCount = cPoints.filter(p => p.y < 5.0).length

      return {
        classId: cId,
        className: first.className,
        campusName: first.campusName,
        teacherName: first.teacherName,
        teacherCode: first.teacherCode,
        count: cPoints.length,
        meanX,
        meanY,
        stdDevY,
        cvY: calculateCV(meanY, stdDevY),
        passedCount,
        passRate: Math.round((passedCount / cPoints.length) * 1000) / 10,
        atRiskCount
      }
    }).sort((a, b) => b.meanY - a.meanY)

    return NextResponse.json({
      success: true,
      points,
      metrics,
      quadrants,
      classesAggregated,
      benchmarks: {
        benchX: defaultBenchX,
        benchY: defaultBenchY
      },
      meta: {
        mode,
        labelX,
        labelY,
        subjectId: activeSubject.id,
        subjectName: activeSubject.subjectName,
        compareSubjectId: secondarySubject?.id || null,
        compareSubjectName: secondarySubject?.subjectName || null,
        periodX,
        periodY
      }
    })
  } catch (error: any) {
    console.error("Lỗi API scatter-analytics:", error)
    return NextResponse.json({ success: false, error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
