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

    const userId = (session?.user as any)?.id || ""
    const userRole = (session?.user as any)?.role || "TEACHER"
    const userEmail = session?.user?.email || ""

    // 1. Resolve Teacher
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: {
          departmentRel: true,
          departmentAssignments: { include: { department: true } },
          campus: true
        }
      }).catch(() => null)
    }

    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { teacherCode: userEmail },
            { teacherCode: userEmail.split("@")[0] }
          ]
        },
        include: {
          departmentRel: true,
          departmentAssignments: { include: { department: true } },
          campus: true
        }
      }).catch(() => null)
    }

    const isAdmin = ["SUPERADMIN", "ADMIN", "BGH", "KTDBCL"].includes(userRole.toUpperCase())

    if (!teacher && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: "Không tìm thấy hồ sơ Giáo viên liên kết với tài khoản này."
      }, { status: 403 })
    }

    // If admin previews without teacher record, find first active teacher
    if (!teacher && isAdmin) {
      teacher = await prisma.teacher.findFirst({
        where: { status: "ACTIVE" },
        include: {
          departmentRel: true,
          departmentAssignments: { include: { department: true } },
          campus: true
        }
      })
    }

    if (!teacher) {
      return NextResponse.json({ success: false, error: "Chưa có dữ liệu giáo viên trong hệ thống" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    let academicYearId = searchParams.get("academicYearId") || ""
    let subjectId = searchParams.get("subjectId") || ""
    let evaluationPeriod = searchParams.get("evaluationPeriod") || "GK1"
    let gradeFilter = searchParams.get("gradeFilter") || "ALL"

    // If academicYearId not specified, find active academic year
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" }
      })
      academicYearId = activeYear?.id || ""
    }

    // 2. Fetch all teaching assignments for this teacher in the chosen academic year
    const myAssignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        class: { include: { campus: true } },
        subject: true,
        academicYear: true
      },
      orderBy: [
        { semester: "asc" },
        { class: { className: "asc" } }
      ]
    })

    // Group assigned subjects
    const assignedSubjectMap = new Map<string, any>()
    myAssignments.forEach(a => {
      if (a.subject) {
        assignedSubjectMap.set(a.subject.id, {
          id: a.subject.id,
          name: a.subject.subjectName,
          code: a.subject.subjectCode,
          category: (a.subject as any).category || "MOET"
        })
      }
    })
    const assignedSubjects = Array.from(assignedSubjectMap.values())

    // If no assignments found
    if (assignedSubjects.length === 0) {
      return NextResponse.json({
        success: true,
        teacher: {
          id: teacher.id,
          name: teacher.teacherName,
          code: teacher.teacherCode,
          campusName: teacher.campus?.campusName || "",
          departmentName: teacher.departmentRel?.name || ""
        },
        assignedSubjects: [],
        summaryKpi: null,
        classAnalytics: [],
        campusGradeBenchmark: [],
        departmentBenchmark: null,
        trendMatrix: []
      })
    }

    // Choose active subject
    if (!subjectId || !assignedSubjectMap.has(subjectId)) {
      subjectId = assignedSubjects[0].id
    }
    const currentSubject = assignedSubjectMap.get(subjectId)

    // Filter assignments for chosen subject
    const subjectAssignments = myAssignments.filter(a => a.subjectId === subjectId)
    const assignedClassMap = new Map<string, any>()
    subjectAssignments.forEach(a => {
      if (a.class) {
        assignedClassMap.set(a.class.id, a.class)
      }
    })
    let myClasses = Array.from(assignedClassMap.values())

    // Grade filter if applied
    if (gradeFilter !== "ALL") {
      myClasses = myClasses.filter(c => {
        const cGrade = (c.grade || "").trim()
        const cName = (c.className || "").trim()
        const targetClean = gradeFilter.replace(/\D/g, "")
        return cGrade === gradeFilter || (targetClean && (cGrade.includes(targetClean) || cName.startsWith(targetClean)))
      })
    }

    const myClassIds = myClasses.map(c => c.id)

    // 3. Resolve Grades/Levels & Benchmarks
    const cleanLevel = (lvl?: string) => (lvl || "").toLowerCase()
    const isPrimaryLevel = myClasses.some(c => cleanLevel(c.level).includes("tiểu học") || cleanLevel(c.level).includes("tieu hoc"))
    const defaultBenchmark = isPrimaryLevel ? 7.0 : 6.0

    // Fetch Subject Quota for this subject & academicYear
    const subjectQuotas = await prisma.subjectQuota.findMany({
      where: {
        subjectId,
        academicYearId
      }
    }).catch(() => [])

    const quotaMap = new Map<string, number>()
    subjectQuotas.forEach(q => {
      quotaMap.set(q.studyProgram || "DEFAULT", q.quota || 85.0)
    })

    // Helper: 5 dải phổ điểm Sky-Line K12
    const evaluateSkyLineDistribution = (scores: number[], benchmark: number) => {
      const total = scores.length
      if (total === 0) {
        return {
          total: 0,
          avg: 0,
          median: 0,
          min: 0,
          max: 0,
          stdDev: 0,
          countPassed: 0,
          pctPassed: 0,
          countBelow: 0,
          pctBelow: 0,
          bands: {
            excellent: { count: 0, pct: 0, label: "Xuất sắc (9.0 - 10.0đ)" },
            good: { count: 0, pct: 0, label: "Giỏi (8.0 - 8.9đ)" },
            satisfactory: { count: 0, pct: 0, label: "Khá (7.0 - 7.9đ)" },
            average: { count: 0, pct: 0, label: "Trung bình (5.0 - 6.9đ)" },
            poor: { count: 0, pct: 0, label: "Chưa đạt (< 5.0đ)" }
          }
        }
      }

      const sum = scores.reduce((a, b) => a + b, 0)
      const avg = Math.round((sum / total) * 100) / 100
      const sorted = [...scores].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
      const min = Math.min(...scores)
      const max = Math.max(...scores)

      // Standard Deviation
      const variance = scores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / total
      const stdDev = Math.round(Math.sqrt(variance) * 100) / 100

      const cExc = scores.filter(s => s >= 9.0).length
      const cGood = scores.filter(s => s >= 8.0 && s < 9.0).length
      const cSat = scores.filter(s => s >= 7.0 && s < 8.0).length
      const cAvg = scores.filter(s => s >= 5.0 && s < 7.0).length
      const cPoor = scores.filter(s => s < 5.0).length

      const cPassed = scores.filter(s => s >= benchmark).length
      const cBelow = scores.filter(s => s < benchmark).length

      const calcPct = (cnt: number) => Math.round((cnt / total) * 1000) / 10

      return {
        total,
        avg,
        median,
        min,
        max,
        stdDev,
        countPassed: cPassed,
        pctPassed: calcPct(cPassed),
        countBelow: cBelow,
        pctBelow: calcPct(cBelow),
        bands: {
          excellent: { count: cExc, pct: calcPct(cExc), label: "Xuất sắc (9.0 - 10.0đ)" },
          good: { count: cGood, pct: calcPct(cGood), label: "Giỏi (8.0 - 8.9đ)" },
          satisfactory: { count: cSat, pct: calcPct(cSat), label: "Khá (7.0 - 7.9đ)" },
          average: { count: cAvg, pct: calcPct(cAvg), label: "Trung bình (5.0 - 6.9đ)" },
          poor: { count: cPoor, pct: calcPct(cPoor), label: "Chưa đạt (< 5.0đ)" }
        }
      }
    }

    // 4. Concurrently fetch students, grade entries, sibling classes & department peers
    const [allStudentsInMyClasses, allMyGradeEntries] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: { in: myClassIds },
          status: "ACTIVE"
        },
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          classId: true,
          gender: true
        }
      }),
      prisma.subjectGradeEntry.findMany({
        where: {
          classId: { in: myClassIds },
          subjectId,
          academicYearId
        }
      })
    ])

    // Fetch tracking commitments for students in my classes
    const studentIds = allStudentsInMyClasses.map(s => s.id)
    const studentCodes = allStudentsInMyClasses.map(s => s.studentCode).filter(Boolean)

    const [inputAssessments, learningCommitments] = await Promise.all([
      prisma.inputAssessmentStudent.findMany({
        where: { studentCode: { in: studentCodes } },
        select: {
          studentCode: true,
          admissionCriteria: true,
          targetType: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true
        }
      }).catch(() => []),
      prisma.studentLearningCommitment.findMany({
        where: {
          studentId: { in: studentIds },
          status: "ACTIVE",
          ...(academicYearId ? { academicYearId } : {})
        }
      }).catch(() => [])
    ])

    const inputMap = new Map<string, any>()
    inputAssessments.forEach(ia => {
      if (ia.studentCode) inputMap.set(ia.studentCode.trim().toUpperCase(), ia)
    })

    const commitmentMap = new Map<string, any[]>()
    learningCommitments.forEach(lc => {
      const arr = commitmentMap.get(lc.studentId) || []
      arr.push(lc)
      commitmentMap.set(lc.studentId, arr)
    })

    // 5. Build Class-by-Class Analytics for chosen evaluation period
    const entryMap = new Map<string, number>()
    allMyGradeEntries.forEach(ge => {
      if (ge.compositeScore !== null && ge.compositeScore !== undefined) {
        entryMap.set(`${ge.studentId}_${ge.evaluationPeriod}`, Number(ge.compositeScore))
      }
    })

    // Class Analytics
    const classAnalytics = myClasses.map(cls => {
      const classStudents = allStudentsInMyClasses.filter(s => s.classId === cls.id)
      const benchmark = defaultBenchmark
      const targetQuota = quotaMap.get(cls.educationSystem || "DEFAULT") || 85.0

      // Get scores for active evaluationPeriod
      const scores: number[] = []
      const trackingList: any[] = []

      classStudents.forEach(st => {
        const score = entryMap.get(`${st.id}_${evaluationPeriod}`)
        if (score !== undefined && !isNaN(score)) {
          scores.push(score)
        }

        // Check if student has commitment or is below benchmark
        const entrance = inputMap.get((st.studentCode || "").trim().toUpperCase())
        const commitments = commitmentMap.get(st.id) || []
        const isBelow = score !== undefined && score < benchmark
        const isPoor = score !== undefined && score < 5.0
        const hasCommitment = commitments.length > 0 || Boolean(entrance?.targetType || entrance?.admissionCriteria)

        if (isBelow || hasCommitment || isPoor) {
          trackingList.push({
            studentId: st.id,
            studentCode: st.studentCode,
            studentName: st.studentName,
            score: score !== undefined ? score : null,
            benchmark,
            isBelowBenchmark: isBelow,
            isPoor,
            entranceCommitment: entrance?.targetType || entrance?.admissionCriteria || null,
            commitmentsCount: commitments.length
          })
        }
      })

      const dist = evaluateSkyLineDistribution(scores, benchmark)

      return {
        classId: cls.id,
        className: cls.className,
        classCode: cls.classCode,
        grade: cls.grade,
        level: cls.level,
        educationSystem: cls.educationSystem || "Chuẩn",
        campusName: cls.campus?.campusName || "",
        totalStudents: classStudents.length,
        gradedCount: dist.total,
        missingCount: classStudents.length - dist.total,
        benchmark,
        targetQuota,
        isMeetingQuota: dist.pctPassed >= targetQuota,
        // Metrics
        avgScore: dist.avg,
        median: dist.median,
        minScore: dist.min,
        maxScore: dist.max,
        stdDev: dist.stdDev,
        countPassed: dist.countPassed,
        pctPassed: dist.pctPassed,
        countBelow: dist.countBelow,
        pctBelow: dist.pctBelow,
        bands: dist.bands,
        trackingStudents: trackingList
      }
    })

    // 6. Longitudinal Progress Matrix (KSĐN -> GK1 -> CK1 -> GK2 -> CK2)
    const PERIOD_ORDER = ["KSĐN", "GK1", "CK1", "GK2", "CK2"]
    const trendMatrix = myClasses.map(cls => {
      const classStudents = allStudentsInMyClasses.filter(s => s.classId === cls.id)
      const periodStats: Record<string, { avg: number; pctPassed: number; gradedCount: number }> = {}

      PERIOD_ORDER.forEach(pCode => {
        const scores: number[] = []
        classStudents.forEach(st => {
          const sc = entryMap.get(`${st.id}_${pCode}`)
          if (sc !== undefined && !isNaN(sc)) scores.push(sc)
        })
        const dist = evaluateSkyLineDistribution(scores, defaultBenchmark)
        periodStats[pCode] = {
          avg: dist.avg,
          pctPassed: dist.pctPassed,
          gradedCount: dist.total
        }
      })

      // Growth deltas
      const delta_gk1_ksdn = periodStats["GK1"].gradedCount > 0 && periodStats["KSĐN"].gradedCount > 0
        ? Math.round((periodStats["GK1"].avg - periodStats["KSĐN"].avg) * 10) / 10 : null
      const delta_ck1_gk1 = periodStats["CK1"].gradedCount > 0 && periodStats["GK1"].gradedCount > 0
        ? Math.round((periodStats["CK1"].avg - periodStats["GK1"].avg) * 10) / 10 : null
      const delta_gk2_ck1 = periodStats["GK2"].gradedCount > 0 && periodStats["CK1"].gradedCount > 0
        ? Math.round((periodStats["GK2"].avg - periodStats["CK1"].avg) * 10) / 10 : null
      const delta_ck2_gk2 = periodStats["CK2"].gradedCount > 0 && periodStats["GK2"].gradedCount > 0
        ? Math.round((periodStats["CK2"].avg - periodStats["GK2"].avg) * 10) / 10 : null

      return {
        classId: cls.id,
        className: cls.className,
        educationSystem: cls.educationSystem || "Chuẩn",
        totalStudents: classStudents.length,
        periodStats,
        deltas: {
          delta_gk1_ksdn,
          delta_ck1_gk1,
          delta_gk2_ck1,
          delta_ck2_gk2
        }
      }
    })

    // 7. Campus & Grade Benchmark (Đối sánh trong cùng cơ sở và khối)
    const myGrades = Array.from(new Set(myClasses.map(c => c.grade).filter(Boolean)))
    let campusGradeBenchmark: any[] = []

    if (myGrades.length > 0 && teacher.campusId) {
      const campusGradeClasses = await prisma.class.findMany({
        where: {
          campusId: teacher.campusId,
          academicYearId,
          grade: { in: myGrades }
        },
        include: {
          campus: true
        },
        orderBy: { className: "asc" }
      })

      const campusGradeClassIds = campusGradeClasses.map(c => c.id)

      const siblingEntries = await prisma.subjectGradeEntry.findMany({
        where: {
          classId: { in: campusGradeClassIds },
          subjectId,
          academicYearId,
          evaluationPeriod
        }
      })

      const siblingScoresByClass = new Map<string, number[]>()
      siblingEntries.forEach(se => {
        if (se.compositeScore !== null && se.compositeScore !== undefined) {
          const arr = siblingScoresByClass.get(se.classId) || []
          arr.push(Number(se.compositeScore))
          siblingScoresByClass.set(se.classId, arr)
        }
      })

      const siblingStudents = await prisma.student.findMany({
        where: { classId: { in: campusGradeClassIds }, status: "ACTIVE" },
        select: { id: true, classId: true }
      })
      const siblingStudentsByClass = new Map<string, number>()
      siblingStudents.forEach(st => {
        siblingStudentsByClass.set(st.classId, (siblingStudentsByClass.get(st.classId) || 0) + 1)
      })

      const siblingClassStats = campusGradeClasses.map(c => {
        const scores = siblingScoresByClass.get(c.id) || []
        const dist = evaluateSkyLineDistribution(scores, defaultBenchmark)
        const isMyClass = myClassIds.includes(c.id)

        return {
          classId: c.id,
          className: c.className,
          grade: c.grade,
          campusName: c.campus?.campusName || "",
          educationSystem: c.educationSystem || "Chuẩn",
          totalStudents: siblingStudentsByClass.get(c.id) || 0,
          gradedCount: dist.total,
          avgScore: dist.avg,
          pctPassed: dist.pctPassed,
          pctExcellent: dist.bands.excellent.pct + dist.bands.good.pct,
          isMyClass
        }
      })

      const gradeGroups = new Map<string, typeof siblingClassStats>()
      siblingClassStats.forEach(item => {
        const gKey = item.grade || "Khối"
        const arr = gradeGroups.get(gKey) || []
        arr.push(item)
        gradeGroups.set(gKey, arr)
      })

      gradeGroups.forEach((classesInGrade, gKey) => {
        const sorted = [...classesInGrade].sort((a, b) => b.avgScore - a.avgScore)
        const allScoresInGrade: number[] = []
        classesInGrade.forEach(c => {
          const sc = siblingScoresByClass.get(c.classId) || []
          allScoresInGrade.push(...sc)
        })
        const gradeOverallAvg = allScoresInGrade.length > 0
          ? Math.round((allScoresInGrade.reduce((a, b) => a + b, 0) / allScoresInGrade.length) * 100) / 100
          : 0

        sorted.forEach((item, index) => {
          campusGradeBenchmark.push({
            ...item,
            gradeGroup: gKey,
            rankInGrade: index + 1,
            totalClassesInGrade: sorted.length,
            campusGradeAvg: gradeOverallAvg,
            deltaVsCampusGradeAvg: Math.round((item.avgScore - gradeOverallAvg) * 10) / 10
          })
        })
      })
    }

    // 8. Department & System Benchmark (Đối sánh Tổ chuyên môn & Hệ thống)
    const assignedDeptIds = [
      teacher.departmentId,
      ...(teacher.departmentAssignments?.map((da: any) => da.departmentId) || [])
    ].filter(Boolean)

    let departmentBenchmark = null
    let peersInDepartment: any[] = []
    let departmentAvg = 0
    let systemAvg = 0

    const [deptTeachers, allSystemEntries] = await Promise.all([
      assignedDeptIds.length > 0
        ? prisma.teacher.findMany({
            where: {
              OR: [
                { departmentId: { in: assignedDeptIds } },
                { departmentAssignments: { some: { departmentId: { in: assignedDeptIds } } } }
              ],
              status: "ACTIVE"
            },
            include: {
              TeachingAssignment: {
                where: { subjectId, academicYearId },
                include: { class: true }
              }
            }
          })
        : Promise.resolve([]),
      prisma.subjectGradeEntry.findMany({
        where: {
          subjectId,
          academicYearId,
          evaluationPeriod
        },
        include: {
          class: true
        }
      })
    ])

    const systemScores = allSystemEntries.map(e => Number(e.compositeScore)).filter(s => !isNaN(s))
    systemAvg = systemScores.length > 0
      ? Math.round((systemScores.reduce((a, b) => a + b, 0) / systemScores.length) * 100) / 100
      : 0

    const systemByEduMap = new Map<string, number[]>()
    allSystemEntries.forEach(e => {
      const edu = e.class?.educationSystem || "Chất lượng cao"
      const sc = Number(e.compositeScore)
      if (!isNaN(sc)) {
        const arr = systemByEduMap.get(edu) || []
        arr.push(sc)
        systemByEduMap.set(edu, arr)
      }
    })
    const systemByEdu = Array.from(systemByEduMap.entries()).map(([eduName, scs]) => ({
      educationSystem: eduName,
      avgScore: Math.round((scs.reduce((a, b) => a + b, 0) / scs.length) * 100) / 100,
      count: scs.length
    }))

    const deptAllScores: number[] = []
    deptTeachers.forEach(t => {
      const assignedClassIds = Array.from(new Set(t.TeachingAssignment.map(a => a.classId)))
      if (assignedClassIds.length === 0) return

      const teacherClassEntries = allSystemEntries.filter(e => assignedClassIds.includes(e.classId))
      const scores = teacherClassEntries.map(e => Number(e.compositeScore)).filter(s => !isNaN(s))
      deptAllScores.push(...scores)

      const dist = evaluateSkyLineDistribution(scores, defaultBenchmark)
      const isCurrent = t.id === teacher.id

      peersInDepartment.push({
        teacherId: t.id,
        teacherName: t.teacherName,
        teacherCode: t.teacherCode,
        isCurrentTeacher: isCurrent,
        classesCount: assignedClassIds.length,
        gradedCount: dist.total,
        avgScore: dist.avg,
        pctPassed: dist.pctPassed,
        pctExcellent: dist.bands.excellent.pct + dist.bands.good.pct
      })
    })

    peersInDepartment.sort((a, b) => b.avgScore - a.avgScore)
    departmentAvg = deptAllScores.length > 0
      ? Math.round((deptAllScores.reduce((a, b) => a + b, 0) / deptAllScores.length) * 100) / 100
      : 0

    const allMyActiveScores: number[] = []
    allMyGradeEntries
      .filter(ge => ge.evaluationPeriod === evaluationPeriod)
      .forEach(ge => {
        const sc = Number(ge.compositeScore)
        if (!isNaN(sc)) allMyActiveScores.push(sc)
      })

    const myOverallDist = evaluateSkyLineDistribution(allMyActiveScores, defaultBenchmark)
    const myOverallAvg = myOverallDist.avg

    departmentBenchmark = {
      departmentName: teacher.departmentRel?.name || "Tổ Bộ môn",
      departmentAvg,
      systemAvg,
      systemByEdu,
      myOverallAvg,
      deltaVsDepartment: Math.round((myOverallAvg - departmentAvg) * 10) / 10,
      deltaVsSystem: Math.round((myOverallAvg - systemAvg) * 10) / 10,
      peers: peersInDepartment
    }

    // 9. Summary Top-Level KPI Cards
    const summaryKpi = {
      subjectName: currentSubject.name,
      totalClasses: myClasses.length,
      totalStudents: allStudentsInMyClasses.length,
      gradedCount: myOverallDist.total,
      missingCount: allStudentsInMyClasses.length - myOverallDist.total,
      teacherAvgScore: myOverallAvg,
      pctPassedBenchmark: myOverallDist.pctPassed,
      pctExcellent: myOverallDist.bands.excellent.pct + myOverallDist.bands.good.pct,
      classesMeetingQuota: classAnalytics.filter(c => c.isMeetingQuota).length,
      classesNeedingSupport: classAnalytics.filter(c => !c.isMeetingQuota).length,
      topPerformingClass: [...classAnalytics].sort((a, b) => b.avgScore - a.avgScore)[0] || null,
      focusSupportClass: [...classAnalytics].sort((a, b) => a.avgScore - b.avgScore)[0] || null
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.teacherName,
        code: teacher.teacherCode,
        campusName: teacher.campus?.campusName || "",
        departmentName: teacher.departmentRel?.name || ""
      },
      assignedSubjects,
      currentSubject,
      summaryKpi,
      classAnalytics,
      trendMatrix,
      campusGradeBenchmark,
      departmentBenchmark
    })
  } catch (error: any) {
    console.error("Lỗi API subject-analytics:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Lỗi xử lý phân tích môn học"
    }, { status: 500 })
  }
}
