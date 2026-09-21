// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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
        campus: {
          select: {
            id: true,
            campusName: true,
            campusCode: true
          }
        },
        homeroomTeacherId: true
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
        teacherDistributions: [],
        subjects: [],
        benchmarks: []
      })
    }

    // 2. Fetch all students in these classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: classIds },
        status: "ACTIVE"
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        dateOfBirth: true,
        gender: true,
        classId: true
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = students.map(s => s.id)
    const studentCodes = students.map(s => s.studentCode).filter(Boolean)

    // 3. Fetch Entrance Assessment records (InputAssessmentStudent) with commitment notes
    const entranceAssessmentMap = new Map<string, any>()
    const p = prisma as any
    if (studentCodes.length > 0 && p.inputAssessmentStudent?.findMany) {
      try {
        const entranceRecords = await p.inputAssessmentStudent.findMany({
          where: {
            studentCode: { in: studentCodes }
          },
          select: {
            studentCode: true,
            fullName: true,
            mathScore: true,
            literatureScore: true,
            writtenEnglishScore: true,
            oralEnglishScore: true,
            admissionCriteria: true,
            admissionResult: true,
            targetType: true,
            directorNote: true
          }
        })
        entranceRecords.forEach((r: any) => {
          const cleanCode = (r.studentCode || "").trim().toUpperCase()
          if (cleanCode) entranceAssessmentMap.set(cleanCode, r)
        })
      } catch (e) {
        console.warn("Lỗi khi đọc inputAssessmentStudent:", e)
      }
    }

    // 3.1 Fetch StudentLearningCommitment (Cam kết học tập hiện hành)
    const learningCommitmentMap = new Map<string, any>()
    if (studentIds.length > 0 && p.studentLearningCommitment?.findMany) {
      try {
        const commitments = await p.studentLearningCommitment.findMany({
          where: {
            studentId: { in: studentIds },
            ...(academicYearId ? { academicYearId } : {}),
            status: "ACTIVE"
          }
        })
        commitments.forEach((c: any) => {
          learningCommitmentMap.set(c.studentId, c)
        })
      } catch (e) {
        console.warn("Lỗi khi đọc studentLearningCommitment:", e)
      }
    }

    // 3.2 Fetch Teaching Assignments for teacher lookup
    const teachingAssignments = p.teachingAssignment?.findMany
      ? await p.teachingAssignment.findMany({
          where: {
            classId: { in: classIds },
            ...(academicYearId ? { academicYearId } : {})
          },
          include: {
            teacher: true,
            subject: true
          }
        })
      : []
    const taMap = new Map<string, any>()
    teachingAssignments.forEach((ta: any) => {
      taMap.set(`${ta.classId}_${ta.subjectId}`, ta)
    })

    // 3.3 Fetch homeroom teachers
    const homeroomIds = Array.from(new Set(filteredClasses.map(c => c.homeroomTeacherId).filter(Boolean)))
    const homeroomTeachers = (homeroomIds.length > 0 && p.teacher?.findMany)
      ? await p.teacher.findMany({
          where: { id: { in: homeroomIds } },
          select: { id: true, teacherName: true, teacherCode: true }
        })
      : []
    const homeroomMap = new Map<string, any>()
    homeroomTeachers.forEach((t: any) => homeroomMap.set(t.id, t))

    // 3.4 Fetch SubjectBenchmarkConfig for academicYearId
    const benchmarkConfigs = p.subjectBenchmarkConfig?.findMany
      ? await p.subjectBenchmarkConfig.findMany({
          where: {
            academicYearId
          }
        })
      : []

    // Benchmark resolver helper: Priority: (subject + grade + period) -> (subject + grade) -> level -> default (7.0 for Tiểu học, 6.0 for Trung học)
    const resolveBenchmark = (level: string, grade: string, subId: string, period: string): number => {
      const cleanLevel = (level || "").toLowerCase()
      const cleanGrade = (grade || "").toLowerCase()
      const isPrimary = cleanLevel.includes("tiểu học") || cleanLevel.includes("tieu hoc") || ["1", "2", "3", "4", "5"].some(g => cleanGrade === g || cleanGrade === `khối ${g}`)
      const defaultScore = isPrimary ? 7.0 : 6.0

      if (!benchmarkConfigs || benchmarkConfigs.length === 0) return defaultScore

      // Level code key
      const levelCode = isPrimary ? "TIEU_HOC" : (["6", "7", "8", "9"].some(g => cleanGrade === g || cleanGrade === `khối ${g}`) ? "THCS" : "THPT")

      // 1. Specific subject + grade + period
      const matchSubGradePeriod = benchmarkConfigs.find((b: any) => b.subjectId === subId && b.grade === grade && b.evaluationPeriod === period)
      if (matchSubGradePeriod) return matchSubGradePeriod.benchmarkScore

      // 2. Specific subject + grade + ALL period
      const matchSubGrade = benchmarkConfigs.find((b: any) => b.subjectId === subId && b.grade === grade && b.evaluationPeriod === "ALL")
      if (matchSubGrade) return matchSubGrade.benchmarkScore

      // 3. Specific subject + level
      const matchSubLevel = benchmarkConfigs.find((b: any) => b.subjectId === subId && b.level === levelCode)
      if (matchSubLevel) return matchSubLevel.benchmarkScore

      // 4. Level config
      const matchLevel = benchmarkConfigs.find((b: any) => b.level === levelCode && (b.subjectId === "ALL" || !b.subjectId) && (b.grade === "ALL" || !b.grade))
      if (matchLevel) return matchLevel.benchmarkScore

      return defaultScore
    }

    // 4. Fetch grade entries
    const entryWhere: any = {
      academicYearId,
      classId: { in: classIds }
    }
    if (subjectId && subjectId !== "ALL") {
      entryWhere.subjectId = subjectId
    }

    const allEntries = p.subjectGradeEntry?.findMany
      ? await p.subjectGradeEntry.findMany({
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
      : []

    // Index entries by: studentId -> subjectId -> period -> entry
    const studentSubjectPeriodMap = new Map<string, Map<string, Map<string, any>>>()
    allEntries.forEach((entry: any) => {
      if (!studentSubjectPeriodMap.has(entry.studentId)) {
        studentSubjectPeriodMap.set(entry.studentId, new Map())
      }
      const subMap = studentSubjectPeriodMap.get(entry.studentId)!
      if (!subMap.has(entry.subjectId)) {
        subMap.set(entry.subjectId, new Map())
      }
      subMap.get(entry.subjectId)!.set(entry.evaluationPeriod, entry)
    })

    // 5. Distinct subjects strictly belonging to the Survey Periods (currentPeriod & baselinePeriod)
    const surveyConfigs = p.subjectGradeConfig?.findMany
      ? await p.subjectGradeConfig.findMany({
          where: {
            academicYearId,
            evaluationPeriod: { in: [currentPeriod, baselinePeriod, "ALL"] }
          },
          include: { subject: true }
        })
      : []

    const subjectMap = new Map<string, { id: string; name: string; code: string }>()

    surveyConfigs.forEach(cfg => {
      if (cfg.subject) {
        if (gradeFilter === "ALL" || cfg.grade === gradeFilter || cfg.grade === "ALL") {
          subjectMap.set(cfg.subject.id, {
            id: cfg.subject.id,
            name: cfg.subject.subjectName,
            code: cfg.subject.subjectCode
          })
        }
      }
    })

    allEntries.forEach(e => {
      if (e.subject && (e.evaluationPeriod === currentPeriod || e.evaluationPeriod === baselinePeriod)) {
        subjectMap.set(e.subject.id, {
          id: e.subject.id,
          name: e.subject.subjectName,
          code: e.subject.subjectCode
        })
      }
    })

    if (subjectId && subjectId !== "ALL" && !subjectMap.has(subjectId)) {
      const sb = await prisma.subject.findUnique({ where: { id: subjectId } })
      if (sb) {
        subjectMap.set(sb.id, { id: sb.id, name: sb.subjectName, code: sb.subjectCode })
      }
    }

    const availableSubjectList = Array.from(subjectMap.values())

    // 6. BUILD TEACHER DISTRIBUTIONS (Bảng thống kê chất lượng học sinh theo Giáo viên)
    const teacherDistributions: any[] = []
    const classStudentMap = new Map<string, any[]>()
    students.forEach(st => {
      if (!classStudentMap.has(st.classId)) classStudentMap.set(st.classId, [])
      classStudentMap.get(st.classId)!.push(st)
    })

    filteredClasses.forEach(cls => {
      const classStudents = classStudentMap.get(cls.id) || []
      const totalStudents = classStudents.length
      const homeroom = cls.homeroomTeacherId ? homeroomMap.get(cls.homeroomTeacherId) : null

      // Determine subjects to calculate for this class
      let subjectsForClass = availableSubjectList
      if (subjectId && subjectId !== "ALL") {
        subjectsForClass = availableSubjectList.filter(s => s.id === subjectId)
      }

      subjectsForClass.forEach(sub => {
        const ta = taMap.get(`${cls.id}_${sub.id}`)
        const teacherName = ta?.teacher?.teacherName || homeroom?.teacherName || "Chưa phân công"
        const teacherCode = ta?.teacher?.teacherCode || homeroom?.teacherCode || ""
        const teacherId = ta?.teacher?.id || homeroom?.id || null

        // Collect scores for students in this class + subject + currentPeriod
        let count_0_5 = 0
        let count_5_65 = 0
        let count_65_8 = 0
        let count_8_10 = 0
        let count_5_10 = 0
        let totalScore = 0
        let gradedCount = 0

        const benchmark = resolveBenchmark(cls.level, cls.grade, sub.id, currentPeriod)
        let count_passed_benchmark = 0
        let count_below_benchmark = 0

        classStudents.forEach(st => {
          const entry = studentSubjectPeriodMap.get(st.id)?.get(sub.id)?.get(currentPeriod)
          if (entry && entry.compositeScore !== null && entry.compositeScore !== undefined && !isNaN(Number(entry.compositeScore))) {
            const sc = Number(entry.compositeScore)
            gradedCount++
            totalScore += sc

            if (sc < 5.0) {
              count_0_5++
            } else if (sc < 6.5) {
              count_5_65++
              count_5_10++
            } else if (sc < 8.0) {
              count_65_8++
              count_5_10++
            } else {
              count_8_10++
              count_5_10++
            }

            if (sc >= benchmark) {
              count_passed_benchmark++
            } else {
              count_below_benchmark++
            }
          }
        })

        // If no grades entered and user is filtering for specific subject, we still want to show row if it's assigned
        const hasAssignment = Boolean(ta)
        if (gradedCount > 0 || hasAssignment || (subjectId && subjectId !== "ALL")) {
          const avgScore = gradedCount > 0 ? Math.round((totalScore / gradedCount) * 100) / 100 : null
          const pct = (cnt: number) => gradedCount > 0 ? Math.round((cnt / gradedCount) * 100) : 0

          teacherDistributions.push({
            campusId: cls.campusId,
            campusName: cls.campus?.campusName || "",
            campusCode: cls.campus?.campusCode || "",
            classId: cls.id,
            className: cls.className,
            grade: cls.grade,
            level: cls.level,
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            teacherId,
            teacherName,
            teacherCode,
            totalStudents,
            gradedCount,
            avgScore,
            benchmark,
            // 5 dải phổ điểm
            count_0_5,
            pct_0_5: pct(count_0_5),
            count_5_65,
            pct_5_65: pct(count_5_65),
            count_65_8,
            pct_65_8: pct(count_65_8),
            count_8_10,
            pct_8_10: pct(count_8_10),
            count_5_10,
            pct_5_10: pct(count_5_10),
            // Đối soát chuẩn
            count_passed_benchmark,
            pct_passed_benchmark: pct(count_passed_benchmark),
            count_below_benchmark,
            pct_below_benchmark: pct(count_below_benchmark)
          })
        }
      })
    })

    // 7. BUILD TRACKING STUDENTS LIST (Học sinh Dưới chuẩn & Diện Cam kết đầu vào)
    const trackingStudents: any[] = []

    students.forEach(st => {
      const cls = filteredClasses.find(c => c.id === st.classId)
      if (!cls) return

      const cleanCode = (st.studentCode || "").trim().toUpperCase()
      const entranceInfo = entranceAssessmentMap.get(cleanCode) || null
      const learningCommitment = learningCommitmentMap.get(st.id) || null

      // Check each relevant subject
      availableSubjectList.forEach(sub => {
        if (subjectId && subjectId !== "ALL" && sub.id !== subjectId) return

        const currentEntry = studentSubjectPeriodMap.get(st.id)?.get(sub.id)?.get(currentPeriod)
        const baselineEntry = studentSubjectPeriodMap.get(st.id)?.get(sub.id)?.get(baselinePeriod)

        const currentScore = currentEntry?.compositeScore !== null && currentEntry?.compositeScore !== undefined ? Number(currentEntry.compositeScore) : null
        const baselineScore = baselineEntry?.compositeScore !== null && baselineEntry?.compositeScore !== undefined ? Number(baselineEntry.compositeScore) : null

        const benchmark = resolveBenchmark(cls.level, cls.grade, sub.id, currentPeriod)

        const isBelowAverage = currentScore !== null && currentScore < 5.0
        const isBelowBenchmark = currentScore !== null && currentScore < benchmark
        const isAtRiskBaseline = baselineScore !== null && baselineScore < 6.5

        // Determine if student has entrance commitment
        const hasAdmissionCommitment = Boolean(
          entranceInfo && (
            (entranceInfo.admissionCriteria && entranceInfo.admissionCriteria.toLowerCase().includes("cam kết")) ||
            (entranceInfo.admissionResult && entranceInfo.admissionResult.toLowerCase().includes("cam kết")) ||
            (entranceInfo.targetType && entranceInfo.targetType.toLowerCase().includes("cam kết")) ||
            entranceInfo.directorNote
          )
        )

        const hasActiveLearningCommitment = Boolean(learningCommitment)

        // Include student in tracking list if any flag applies
        if (isBelowAverage || isBelowBenchmark || hasAdmissionCommitment || hasActiveLearningCommitment || isAtRiskBaseline) {
          const delta = currentScore !== null && baselineScore !== null ? Math.round((currentScore - baselineScore) * 10) / 10 : null
          const benchmarkGap = currentScore !== null ? Math.round((currentScore - benchmark) * 10) / 10 : null

          const ta = taMap.get(`${cls.id}_${sub.id}`)
          const homeroom = cls.homeroomTeacherId ? homeroomMap.get(cls.homeroomTeacherId) : null
          const teacherName = ta?.teacher?.teacherName || homeroom?.teacherName || "Chưa phân công"

          trackingStudents.push({
            studentId: st.id,
            studentCode: st.studentCode,
            studentName: st.studentName,
            dateOfBirth: st.dateOfBirth,
            gender: st.gender,
            classId: cls.id,
            className: cls.className,
            grade: cls.grade,
            level: cls.level,
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            teacherName,
            currentScore,
            baselineScore,
            delta,
            benchmark,
            benchmarkGap,
            // Flags
            isBelowAverage,
            isBelowBenchmark,
            isAtRiskBaseline,
            hasAdmissionCommitment,
            hasActiveLearningCommitment,
            // Details
            entranceInfo,
            learningCommitment: learningCommitment ? {
              content: learningCommitment.content,
              teacherName: learningCommitment.teacherName,
              createdAt: learningCommitment.createdAt
            } : null
          })
        }
      })
    })

    // 8. Multi-period trends and overall distribution calculation
    const distCounts = {
      under_5: 0,
      from_5_to_65: 0,
      from_65_to_8: 0,
      from_8_to_10: 0
    }

    let totalGraded = 0
    let totalScoreSum = 0

    allEntries.forEach(e => {
      if (e.evaluationPeriod === currentPeriod && e.compositeScore !== null && e.compositeScore !== undefined) {
        const sc = Number(e.compositeScore)
        if (!isNaN(sc)) {
          totalGraded++
          totalScoreSum += sc
          if (sc < 5.0) distCounts.under_5++
          else if (sc < 6.5) distCounts.from_5_to_65++
          else if (sc < 8.0) distCounts.from_65_to_8++
          else distCounts.from_8_to_10++
        }
      }
    })

    const distribution = [
      { range: "0 - <5.0", label: "Yếu (<5.0)", count: distCounts.under_5, percent: totalGraded > 0 ? Math.round((distCounts.under_5 / totalGraded) * 100) : 0, color: "#f43f5e" },
      { range: "5.0 - <6.5", label: "Trung bình (5.0 - <6.5)", count: distCounts.from_5_to_65, percent: totalGraded > 0 ? Math.round((distCounts.from_5_to_65 / totalGraded) * 100) : 0, color: "#f59e0b" },
      { range: "6.5 - <8.0", label: "Khá (6.5 - <8.0)", count: distCounts.from_65_to_8, percent: totalGraded > 0 ? Math.round((distCounts.from_65_to_8 / totalGraded) * 100) : 0, color: "#0ea5e9" },
      { range: "8.0 - 10", label: "Giỏi (8.0 - 10)", count: distCounts.from_8_to_10, percent: totalGraded > 0 ? Math.round((distCounts.from_8_to_10 / totalGraded) * 100) : 0, color: "#10b981" }
    ]

    const totalExpected = students.length
    const overallAvg = totalGraded > 0 ? Math.round((totalScoreSum / totalGraded) * 100) / 100 : 0

    const summary = {
      totalStudents: totalExpected,
      totalGraded,
      currentAverage: overallAvg,
      totalBelowAverage: trackingStudents.filter(t => t.isBelowAverage).length,
      totalBelowBenchmark: trackingStudents.filter(t => t.isBelowBenchmark).length,
      totalAdmissionCommitment: trackingStudents.filter(t => t.hasAdmissionCommitment).length,
      totalLearningCommitment: trackingStudents.filter(t => t.hasActiveLearningCommitment).length
    }

    return NextResponse.json({
      success: true,
      currentPeriod,
      baselinePeriod,
      summary,
      distribution,
      teacherDistributions,
      trackingStudents,
      benchmarks: benchmarkConfigs,
      subjects: availableSubjectList
    })

  } catch (error: any) {
    console.error("Lỗi phân tích kết quả và phổ điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
