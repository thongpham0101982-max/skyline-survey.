// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: "Chưa xác thực đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const academicYearId = searchParams.get("academicYearId") || ""
    const rawPeriod = searchParams.get("evaluationPeriod") || "KSĐN"
    const scope = searchParams.get("scope") || "campus" // "campus" (cùng cơ sở) hoặc "all" (toàn trường)

    if (!classId) {
      return NextResponse.json({ success: false, error: "Thiếu mã lớp học (classId)" }, { status: 400 })
    }

    // Normalize evaluation period variants
    let periodVariants = [rawPeriod, "ALL"]
    if (rawPeriod === "KSDN" || rawPeriod === "KSĐN") {
      periodVariants = ["KSĐN", "KSDN", "ALL"]
    } else if (rawPeriod === "GK1" || rawPeriod === "GIUA_KY_1") {
      periodVariants = ["GK1", "GIUA_KY_1", "ALL"]
    } else if (rawPeriod === "CK1" || rawPeriod === "CUOI_KY_1") {
      periodVariants = ["CK1", "CUOI_KY_1", "ALL"]
    } else if (rawPeriod === "GK2" || rawPeriod === "GIUA_KY_2") {
      periodVariants = ["GK2", "GIUA_KY_2", "ALL"]
    } else if (rawPeriod === "CK2" || rawPeriod === "CUOI_KY_2") {
      periodVariants = ["CK2", "CUOI_KY_2", "ALL"]
    }
    const targetPeriodFilter = periodVariants.filter(p => p !== "ALL")

    // 1. Get class details
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { campus: true, academicYear: true }
    })

    if (!targetClass) {
      return NextResponse.json({ success: false, error: "Không tìm thấy lớp học" }, { status: 404 })
    }

    let homeroomTeacher = null
    if (targetClass.homeroomTeacherId) {
      homeroomTeacher = await prisma.teacher.findUnique({
        where: { id: targetClass.homeroomTeacherId }
      }).catch(() => null)
    }

    const targetYearId = academicYearId || targetClass.academicYearId || ""

    // 2. Identify teacher & verify homeroom permission (allow ADMIN/BGH preview)
    const userId = (session?.user as any)?.id || ""
    const userRole = (session?.user as any)?.role || "TEACHER"
    const userEmail = session?.user?.email || ""

    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } }).catch(() => null)
    }
    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { teacherCode: userEmail },
            { teacherCode: userEmail.split("@")[0] }
          ]
        }
      }).catch(() => null)
    }

    const isAdmin = ["SUPERADMIN", "ADMIN", "BGH", "KTDBCL"].includes(userRole.toUpperCase())
    const isHomeroomTeacher = teacher && (
      targetClass.homeroomTeacherId === teacher.id ||
      (targetClass.homeroomTeacherId && targetClass.homeroomTeacherId.includes(teacher.id))
    )

    if (!isAdmin && !isHomeroomTeacher) {
      return NextResponse.json({
        success: false,
        error: "Bạn không có quyền truy cập bảng điểm lớp này. Tính năng chỉ dành cho Giáo viên chủ nhiệm."
      }, { status: 403 })
    }

    // 3. Normalize grade for matching
    let rawGrade = targetClass.grade || ""
    if (!rawGrade && targetClass.className) {
      const match = targetClass.className.match(/^(\d+)/)
      if (match) rawGrade = match[1]
    }
    const numMatch = rawGrade.match(/(\d+)/)
    const gradeNum = numMatch ? numMatch[1] : ""
    const candidateGrades = Array.from(new Set([
      rawGrade,
      `Khối ${gradeNum}`,
      `Khoi ${gradeNum}`,
      `Lớp ${gradeNum}`,
      gradeNum
    ].filter(Boolean)))

    const isGradeMatching = (configGrade?: string | null, targetG?: string | null): boolean => {
      if (!configGrade || !targetG) return false
      const c = configGrade.trim()
      const t = targetG.trim()
      if (c === "ALL" || t === "ALL" || c === "" || t === "") return true
      if (c.toLowerCase() === t.toLowerCase()) return true
      const d1 = c.replace(/\D/g, "")
      const d2 = t.replace(/\D/g, "")
      if (d1 && d2) return d1 === d2
      const clean1 = c.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
      const clean2 = t.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
      return clean1 === clean2
    }

    // Determine level (TIEU_HOC vs THCS vs THPT)
    const num = parseInt(gradeNum, 10)
    let levelCode = "THCS"
    if (num >= 1 && num <= 5) levelCode = "TIEU_HOC"
    else if (num >= 6 && num <= 9) levelCode = "THCS"
    else if (num >= 10 && num <= 12) levelCode = "THPT"

    // Sibling classes filter
    const gradeClassesWhere: any = {
      academicYearId: targetYearId,
      OR: [
        { grade: { in: candidateGrades } },
        { className: { startsWith: gradeNum + "." } },
        { className: { startsWith: gradeNum + "/" } },
        { className: { startsWith: gradeNum + "_" } }
      ]
    }
    if (scope === "campus" && targetClass.campusId) {
      gradeClassesWhere.campusId = targetClass.campusId
    }

    // 4-9. Concurrently fetch all independent homeroom datasets using Promise.all
    const [
      students,
      classGradeEntries,
      teachingAssignments,
      surveyConfigs,
      benchmarkConfigs,
      siblingClasses
    ] = await Promise.all([
      // 4. Get active students of the homeroom class
      prisma.student.findMany({
        where: {
          classId,
          status: "ACTIVE"
        },
        orderBy: { studentName: "asc" },
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          gender: true,
          dateOfBirth: true
        }
      }),
      // 5. Get all grade entries for this class in this evaluation period
      prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId: targetYearId,
          classId,
          evaluationPeriod: { in: targetPeriodFilter }
        },
        include: {
          subject: true
        }
      }),
      // 6. Get teaching assignments for this class to identify teacher per subject
      prisma.teachingAssignment.findMany({
        where: {
          academicYearId: targetYearId,
          classId
        },
        include: {
          subject: true,
          teacher: true
        }
      }),
      // 7. STRICTLY FETCH SUBJECTS CONFIGURED IN ADMIN TAB (SubjectGradeConfig) FOR THIS PERIOD & GRADE
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetYearId,
          evaluationPeriod: { in: periodVariants },
          subjectId: { not: null },
          status: "ACTIVE"
        },
        include: {
          subject: true
        }
      }),
      // 8. Load Benchmark configurations
      prisma.subjectBenchmarkConfig.findMany({
        where: {
          academicYearId: targetYearId,
          evaluationPeriod: { in: [...periodVariants, "ALL"] }
        }
      }),
      // 9. Fetch Grade-level (Khối) sibling classes
      prisma.class.findMany({
        where: gradeClassesWhere,
        select: { id: true, className: true, campusId: true }
      })
    ])

    // Sort students by Vietnamese alphabet
    const getVietnameseSortKey = (fullName: string) => {
      if (!fullName) return ""
      const parts = fullName.trim().split(/\s+/)
      const firstName = parts[parts.length - 1] || ""
      const rest = parts.slice(0, parts.length - 1).join(" ")
      return `${firstName.toLowerCase()} | ${rest.toLowerCase()}`
    }
    students.sort((a, b) => getVietnameseSortKey(a.studentName).localeCompare(getVietnameseSortKey(b.studentName), "vi-VN"))

    const subjectTeacherMap: Record<string, string> = {}
    teachingAssignments.forEach(ta => {
      if (ta.subjectId && ta.teacher) {
        subjectTeacherMap[ta.subjectId] = ta.teacher.teacherName
      }
    })

    const subjectsMap = new Map<string, any>()

    // Priority 1: Add subjects specifically configured in SubjectGradeConfig for this grade
    surveyConfigs.forEach(cfg => {
      if (cfg.subject && cfg.subjectId !== "ALL" && isGradeMatching(cfg.grade, targetClass.grade)) {
        subjectsMap.set(cfg.subject.id, cfg.subject)
      }
    })

    // Priority 2: Also include any subject that already has actual grade entries in this period for this class
    classGradeEntries.forEach(ge => {
      if (ge.subject) {
        subjectsMap.set(ge.subject.id, ge.subject)
      }
    })

    const subjectsList = Array.from(subjectsMap.values()).sort((a, b) => (a.orderIndex || 99) - (b.orderIndex || 99))

    const resolveBenchmark = (subId: string): number => {
      const defaultScore = levelCode === "TIEU_HOC" ? 7.0 : 6.0
      if (!benchmarkConfigs || benchmarkConfigs.length === 0) return defaultScore

      const matchPeriodSubGrade = benchmarkConfigs.find(b => 
        b.subjectId === subId && 
        isGradeMatching(b.grade, targetClass.grade) && 
        periodVariants.includes(b.evaluationPeriod)
      )
      if (matchPeriodSubGrade) return matchPeriodSubGrade.benchmarkScore

      const matchSubGrade = benchmarkConfigs.find(b => 
        b.subjectId === subId && 
        isGradeMatching(b.grade, targetClass.grade) && 
        b.evaluationPeriod === "ALL"
      )
      if (matchSubGrade) return matchSubGrade.benchmarkScore

      const matchSubLevel = benchmarkConfigs.find(b => 
        b.subjectId === subId && 
        b.level === levelCode
      )
      if (matchSubLevel) return matchSubLevel.benchmarkScore

      const matchLevel = benchmarkConfigs.find(b => 
        b.level === levelCode && 
        (!b.subjectId || b.subjectId === "ALL") && 
        (!b.grade || b.grade === "ALL")
      )
      if (matchLevel) return matchLevel.benchmarkScore

      return defaultScore
    }

    const siblingClassIds = siblingClasses.map(c => c.id)

    // Fetch all grade entries for the entire grade in this evaluation period
    const gradeWideEntries = await prisma.subjectGradeEntry.findMany({
      where: {
        academicYearId: targetYearId,
        evaluationPeriod: { in: targetPeriodFilter },
        classId: { in: siblingClassIds }
      },
      select: {
        classId: true,
        studentId: true,
        subjectId: true,
        compositeScore: true,
        componentScores: true
      }
    })

    // Calculate Grade-level (Khối) statistics per subject
    const gradeStatsBySubject: Record<string, {
      totalScores: number[]
      avgScore: number
      benchmark: number
      countPassed: number
      countBelow: number
      pctPassed: number
      count_0_5: number
      count_5_65: number
      count_65_8: number
      count_8_10: number
      count_5_10: number
    }> = {}

    subjectsList.forEach(sub => {
      const benchmark = resolveBenchmark(sub.id)
      const subEntries = gradeWideEntries.filter(e => e.subjectId === sub.id && e.compositeScore !== null && e.compositeScore !== undefined)
      const scores = subEntries.map(e => Number(e.compositeScore)).filter(s => !isNaN(s))

      const total = scores.length
      const avg = total > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / total) * 10) / 10 : 0
      const countPassed = scores.filter(s => s >= benchmark).length
      const countBelow = scores.filter(s => s < benchmark).length
      const pctPassed = total > 0 ? Math.round((countPassed / total) * 1000) / 10 : 0

      const count_0_5 = scores.filter(s => s < 5).length
      const count_5_65 = scores.filter(s => s >= 5 && s < 6.5).length
      const count_65_8 = scores.filter(s => s >= 6.5 && s < 8).length
      const count_8_10 = scores.filter(s => s >= 8 && s <= 10).length
      const count_5_10 = scores.filter(s => s >= 5 && s <= 10).length

      gradeStatsBySubject[sub.id] = {
        totalScores: scores,
        avgScore: avg,
        benchmark,
        countPassed,
        countBelow,
        pctPassed,
        count_0_5,
        count_5_65,
        count_65_8,
        count_8_10,
        count_5_10
      }
    })

    // 10. Process Class Statistics & Comparative Metrics per subject
    const classEntryMap: Record<string, any> = {}
    classGradeEntries.forEach(ge => {
      classEntryMap[`${ge.studentId}_${ge.subjectId}`] = ge
    })

    const subjectComparisons = subjectsList.map(sub => {
      const benchmark = resolveBenchmark(sub.id)
      const teacherName = subjectTeacherMap[sub.id] || "Chưa gán GV"

      // Class scores
      const classScores: number[] = []
      students.forEach(st => {
        const entry = classEntryMap[`${st.id}_${sub.id}`]
        if (entry && entry.compositeScore !== null && entry.compositeScore !== undefined) {
          const num = Number(entry.compositeScore)
          if (!isNaN(num)) classScores.push(num)
        }
      })

      const classTotal = classScores.length
      const classAvg = classTotal > 0 ? Math.round((classScores.reduce((a, b) => a + b, 0) / classTotal) * 10) / 10 : 0
      const classMin = classTotal > 0 ? Math.min(...classScores) : 0
      const classMax = classTotal > 0 ? Math.max(...classScores) : 0

      const classCount_0_5 = classScores.filter(s => s < 5).length
      const classCount_5_65 = classScores.filter(s => s >= 5 && s < 6.5).length
      const classCount_65_8 = classScores.filter(s => s >= 6.5 && s < 8).length
      const classCount_8_10 = classScores.filter(s => s >= 8 && s <= 10).length
      const classCount_5_10 = classScores.filter(s => s >= 5 && s <= 10).length

      const classCountPassed = classScores.filter(s => s >= benchmark).length
      const classCountBelow = classScores.filter(s => s < benchmark).length
      const classPctPassed = classTotal > 0 ? Math.round((classCountPassed / classTotal) * 1000) / 10 : 0

      // Grade comparison
      const gStat = gradeStatsBySubject[sub.id] || {
        avgScore: 0,
        pctPassed: 0,
        countPassed: 0,
        countBelow: 0,
        totalScores: []
      }

      const diffAvg = Math.round((classAvg - gStat.avgScore) * 10) / 10
      const diffPctPassed = Math.round((classPctPassed - gStat.pctPassed) * 10) / 10

      // Percentages for class distribution
      const pct = (cnt: number) => classTotal > 0 ? Math.round((cnt / classTotal) * 1000) / 10 : 0

      return {
        subjectId: sub.id,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        teacherName,
        benchmark,
        totalStudents: students.length,
        gradedCount: classTotal,
        classAvg,
        classMin,
        classMax,
        classCount_0_5,
        classCount_5_65,
        classCount_65_8,
        classCount_8_10,
        classCount_5_10,
        pct_0_5: pct(classCount_0_5),
        pct_5_65: pct(classCount_5_65),
        pct_65_8: pct(classCount_65_8),
        pct_8_10: pct(classCount_8_10),
        pct_5_10: pct(classCount_5_10),
        classCountPassed,
        classCountBelow,
        classPctPassed,
        // Grade metrics
        gradeAvg: gStat.avgScore,
        gradePctPassed: gStat.pctPassed,
        gradeTotalGraded: gStat.totalScores.length,
        diffAvg,
        diffPctPassed
      }
    })

    // 11. Query Commitments & Consultation Logs (Teacher Remarks & Parent Feedback)
    const studentCodes = students.map(s => s.studentCode).filter(Boolean)
    const studentIds = students.map(s => s.id)
    const periodTags = targetPeriodFilter.map(p => `[GradePeriod: ${p}]`)

    const [inputAssessments, learningCommitments, consultationLogs] = await Promise.all([
      prisma.inputAssessmentStudent.findMany({
        where: {
          studentCode: { in: studentCodes }
        },
        select: {
          studentCode: true,
          admissionCriteria: true,
          targetType: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          interviewEnglishScore: true,
          directorNote: true,
          admissionResult: true
        }
      }).catch(() => []),
      prisma.studentLearningCommitment.findMany({
        where: {
          studentId: { in: studentIds },
          status: "ACTIVE"
        },
        include: {
          subject: true
        }
      }).catch(() => []),
      prisma.academicConsultationLog.findMany({
        where: {
          studentId: { in: studentIds },
          academicYearId: targetYearId,
          OR: periodTags.map(tag => ({ notes: { contains: tag } }))
        },
        orderBy: { updatedAt: "desc" }
      }).catch(() => [])
    ])

    const inputMap = new Map<string, any>()
    inputAssessments.forEach(ia => {
      if (ia.studentCode) inputMap.set(ia.studentCode, ia)
    })

    const commitmentMap = new Map<string, any[]>()
    learningCommitments.forEach(lc => {
      const arr = commitmentMap.get(lc.studentId) || []
      arr.push(lc)
      commitmentMap.set(lc.studentId, arr)
    })

    const exchangeMap = new Map<string, any>()
    consultationLogs.forEach((log: any) => {
      if (!exchangeMap.has(log.studentId)) {
        let teacherRemark = ""
        let parentFeedback = ""
        if (log.content) {
          teacherRemark = log.content.replace(/^Ý KIẾN GVCN:\s*/i, "").trim()
        }
        if (log.difficulties) {
          parentFeedback = log.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim()
        }
        exchangeMap.set(log.studentId, {
          logId: log.id,
          teacherRemark,
          teacherRemarkDate: log.meetingDate || log.createdAt,
          parentFeedback,
          parentFeedbackDate: log.updatedAt || log.createdAt,
          notes: log.notes
        })
      }
    })

    // 12. Student Grade Matrix & Tracking List
    const studentMatrix = students.map(st => {
      const subjectGrades: Record<string, {
        score: number | null
        componentScores: any
        remark: string
        isBelowAverage: boolean
        isBelowBenchmark: boolean
        benchmark: number
        gap: number | null
      }> = {}

      let totalScoreSum = 0
      let scoreCount = 0
      let belowAverageCount = 0
      let belowBenchmarkCount = 0

      subjectsList.forEach(sub => {
        const benchmark = resolveBenchmark(sub.id)
        const entry = classEntryMap[`${st.id}_${sub.id}`]
        let score: number | null = null
        let compScores: any = {}
        let remark = ""

        if (entry) {
          remark = entry.remark || ""
          if (entry.componentScores) {
            try {
              compScores = typeof entry.componentScores === "string" ? JSON.parse(entry.componentScores) : entry.componentScores
            } catch (_) {}
          }
          if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
            const num = Number(entry.compositeScore)
            if (!isNaN(num)) {
              score = num
              totalScoreSum += num
              scoreCount++
              if (num < 5.0) belowAverageCount++
              if (num < benchmark) belowBenchmarkCount++
            }
          }
        }

        const isBelowAverage = score !== null && score < 5.0
        const isBelowBenchmark = score !== null && score < benchmark
        const gap = score !== null ? Math.round((score - benchmark) * 10) / 10 : null

        subjectGrades[sub.id] = {
          score,
          componentScores: compScores,
          remark,
          isBelowAverage,
          isBelowBenchmark,
          benchmark,
          gap
        }
      })

      const gpa = scoreCount > 0 ? Math.round((totalScoreSum / scoreCount) * 10) / 10 : null

      const inputInfo = inputMap.get(st.studentCode)
      const commitments = commitmentMap.get(st.id) || []

      const isEntranceCommitted = Boolean(
        inputInfo && (
          (inputInfo.admissionCriteria && inputInfo.admissionCriteria.toLowerCase().includes("cam kết")) ||
          (inputInfo.targetType && inputInfo.targetType.toLowerCase().includes("cam kết")) ||
          (inputInfo.admissionResult && inputInfo.admissionResult.toLowerCase().includes("cam kết")) ||
          inputInfo.directorNote
        )
      )

      return {
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender,
        dateOfBirth: st.dateOfBirth,
        subjectGrades,
        gpa,
        scoreCount,
        belowAverageCount,
        belowBenchmarkCount,
        isEntranceCommitted,
        inputAssessment: inputInfo || null,
        learningCommitments: commitments,
        teacherRemark: exchangeMap.get(st.id)?.teacherRemark || "",
        teacherRemarkDate: exchangeMap.get(st.id)?.teacherRemarkDate || null,
        parentFeedback: exchangeMap.get(st.id)?.parentFeedback || "",
        parentFeedbackDate: exchangeMap.get(st.id)?.parentFeedbackDate || null,
        exchangeLogId: exchangeMap.get(st.id)?.logId || null,
        defaultTeacherRemark: `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${st.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
      }
    })

    const trackingStudents = studentMatrix.filter(st => 
      st.belowAverageCount > 0 || 
      st.belowBenchmarkCount > 0 || 
      st.isEntranceCommitted || 
      st.learningCommitments.length > 0
    )

    return NextResponse.json({
      success: true,
      classInfo: {
        id: targetClass.id,
        className: targetClass.className,
        grade: targetClass.grade,
        campusName: targetClass.campus?.campusName || targetClass.campus?.name || "Cơ sở",
        campusCode: targetClass.campus?.campusCode || "",
        homeroomTeacherName: homeroomTeacher?.teacherName || teacher?.teacherName || "",
        totalStudents: students.length,
        academicYearName: targetClass.academicYear?.name || ""
      },
      evaluationPeriod: rawPeriod,
      scope,
      siblingClassesCount: siblingClasses.length,
      subjects: subjectsList.map(s => ({ id: s.id, name: s.subjectName, code: s.subjectCode })),
      subjectComparisons,
      studentMatrix,
      trackingStudents,
      summary: {
        totalStudents: students.length,
        totalSubjects: subjectsList.length,
        trackingStudentsCount: trackingStudents.length,
        entranceCommittedCount: studentMatrix.filter(s => s.isEntranceCommitted).length,
        learningCommittedCount: studentMatrix.filter(s => s.learningCommitments.length > 0).length
      }
    })

  } catch (error: any) {
    console.error("Lỗi lấy dữ liệu điểm lớp GVCN:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
