// @ts-nocheck
import { prisma } from "@/lib/db"
import { unstable_cache } from "next/cache"

export interface AdminDashboardFilterOptions {
  level?: string
  grade?: string
  timeRange?: string
}

async function _getAdminMetrics(
  academicYearId?: string,
  allowedCampusIds: string[] = [],
  filterOptions: AdminDashboardFilterOptions = {}
) {
  const isFullAccess = allowedCampusIds.length === 0
  const filterLevel = filterOptions.level && filterOptions.level !== "ALL" ? filterOptions.level : undefined
  const filterGrade = filterOptions.grade && filterOptions.grade !== "ALL" ? filterOptions.grade : undefined
  const filterTimeRange = filterOptions.timeRange || "FULL_YEAR"

  let targetYearId = academicYearId
  if (!targetYearId) {
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    targetYearId = activeYear?.id || ""
  }

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: targetYearId }
  })
  const academicYearName = academicYear?.name || ""

  // Compute time range date bounds if a specific range is selected
  let dateStartBound: Date | undefined = undefined
  let dateEndBound: Date | undefined = undefined
  const now = new Date()

  if (academicYear && filterTimeRange !== "FULL_YEAR") {
    const ayStartYear = new Date(academicYear.startDate).getFullYear()
    const ayEndYear = new Date(academicYear.endDate).getFullYear()
    if (filterTimeRange === "HK1") {
      dateStartBound = new Date(ayStartYear, 7, 1) // Aug 1
      dateEndBound = new Date(ayStartYear, 11, 31, 23, 59, 59) // Dec 31
    } else if (filterTimeRange === "HK2") {
      dateStartBound = new Date(ayEndYear, 0, 1) // Jan 1
      dateEndBound = new Date(ayEndYear, 4, 31, 23, 59, 59) // May 31
    } else if (filterTimeRange === "LAST_6_MONTHS") {
      dateStartBound = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    } else if (filterTimeRange === "LAST_3_MONTHS") {
      dateStartBound = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else if (filterTimeRange === "CURRENT_MONTH") {
      dateStartBound = new Date(now.getFullYear(), now.getMonth(), 1)
      dateEndBound = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }
  }

  // Class & Student filters
  const classWhere: any = {
    status: "ACTIVE",
    ...(targetYearId ? { academicYearId: targetYearId } : {})
  }
  if (filterLevel) {
    classWhere.level = filterLevel
  }
  if (filterGrade) {
    classWhere.OR = [
      { grade: filterGrade },
      { grade: `Khối ${filterGrade}` }
    ]
  }

  const studentWhere: any = {
    status: "ACTIVE",
    class: {
      ...classWhere
    }
  }

  const transferWhere: any = {}
  const assessmentWhere: any = {}
  const summaryWhere: any = {}

  if (targetYearId) {
    transferWhere.student = { class: { ...classWhere } }
    assessmentWhere.period = { academicYearId: targetYearId }
    summaryWhere.class = { ...classWhere }
  }
  if (dateStartBound || dateEndBound) {
    transferWhere.transferDate = {
      ...(dateStartBound ? { gte: dateStartBound } : {}),
      ...(dateEndBound ? { lte: dateEndBound } : {})
    }
  }

  if (!isFullAccess) {
    studentWhere.campusId = { in: allowedCampusIds }
    classWhere.campusId = { in: allowedCampusIds }
    transferWhere.student = {
      ...(transferWhere.student || {}),
      campusId: { in: allowedCampusIds }
    }
    assessmentWhere.batch = { campusId: { in: allowedCampusIds } }
    summaryWhere.class = {
      ...(summaryWhere.class || {}),
      campusId: { in: allowedCampusIds }
    }
  }

  const [
    allAcademicYears,
    allCampuses,
    totalStudents,
    totalClasses,
    generalClasses,
    preschoolClasses,
    transferCount,
    changeClassCount,
    assessmentGroup,
    admissionGroup,
    classSummaries
  ] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true, isOff: true }
    }),
    prisma.campus.findMany({
      select: { id: true, campusCode: true, campusName: true }
    }),
    prisma.student.count({ where: studentWhere }),
    prisma.class.count({ where: classWhere }),
    prisma.class.count({
      where: {
        ...classWhere,
        level: filterLevel ? (["Tiểu học", "THCS", "THPT"].includes(filterLevel) ? filterLevel : "__NONE__") : { in: ["Tiểu học", "THCS", "THPT"] }
      }
    }),
    prisma.class.count({
      where: {
        ...classWhere,
        level: filterLevel ? (filterLevel === "Mầm non" ? "Mầm non" : "__NONE__") : "Mầm non"
      }
    }),
    prisma.studentTransfer.count({ where: { ...transferWhere, type: "OUT" } }),
    prisma.studentTransfer.count({ where: { ...transferWhere, type: "CHANGE_CLASS" } }),
    prisma.inputAssessmentStudent.groupBy({
      by: ["grade"],
      _count: true,
      where: assessmentWhere
    }),
    prisma.inputAssessmentStudent.groupBy({
      by: ["admissionResult"],
      _count: true,
      where: assessmentWhere
    }),
    prisma.summaryByClass.findMany({
      where: summaryWhere,
      include: { class: true }
    })
  ])

  // Get new enrollments (type === 'IN')
  const inTransfers = await prisma.studentTransfer.findMany({
    where: {
      ...transferWhere,
      type: "IN"
    },
    include: {
      student: {
        select: { studentCode: true }
      }
    }
  })

  const studentCodes = inTransfers.map((t) => t.student?.studentCode).filter(Boolean)

  const [generalCandidates, preschoolCandidates] = await Promise.all([
    studentCodes.length > 0
      ? prisma.inputAssessmentStudent.findMany({
          where: { studentCode: { in: studentCodes } },
          select: { studentCode: true, cityName: true, countryName: true, oldSchoolType: true, oldSchoolName: true }
        })
      : Promise.resolve([]),
    studentCodes.length > 0
      ? prisma.preschoolInputAssessmentStudent.findMany({
          where: { studentCode: { in: studentCodes } },
          select: { studentCode: true, cityName: true, countryName: true, oldSchoolType: true, oldSchoolName: true }
        })
      : Promise.resolve([])
  ])

  const candidateMap = new Map()
  generalCandidates.forEach((c) => candidateMap.set(c.studentCode, c))
  preschoolCandidates.forEach((c) => candidateMap.set(c.studentCode, c))

  const newEnrollmentStats = {
    total: 0,
    inProvince: 0,
    outProvince: 0,
    abroad: 0,
    inProvincePrivate: 0
  }

  for (const t of inTransfers) {
    newEnrollmentStats.total++
    const code = t.student?.studentCode
    const cand = code ? candidateMap.get(code) : null

    const country = cand?.countryName || "Việt Nam"
    const city = cand?.cityName || "TP Đà Nẵng"
    const oldSchoolType = cand?.oldSchoolType || ""

    const isAbroad = country.toLowerCase() !== "việt nam" && country.toLowerCase() !== "vietnam"
    const isInProvince = city.includes("Đà Nẵng") || city.includes("Da Nang")

    if (isAbroad) {
      newEnrollmentStats.abroad++
    } else if (isInProvince) {
      newEnrollmentStats.inProvince++
      const isPrivate =
        oldSchoolType.toLowerCase() === "tư thục" ||
        oldSchoolType.toLowerCase() === "private" ||
        oldSchoolType.includes("Tư thục") ||
        oldSchoolType.includes("Tư Thục")
      if (isPrivate) {
        newEnrollmentStats.inProvincePrivate++
      }
    } else {
      newEnrollmentStats.outProvince++
    }
  }

  // Get transfer out stats (type === 'OUT')
  const outTransfers = await prisma.studentTransfer.findMany({
    where: {
      ...transferWhere,
      type: "OUT"
    }
  })

  const transferOutStats = {
    total: 0,
    inProvince: 0,
    outProvince: 0,
    abroad: 0,
    inProvincePrivate: 0
  }

  for (const t of outTransfers) {
    transferOutStats.total++
    const category = t.transferCategory || "DOMESTIC"
    const country = t.destinationCountry || ""
    const province = t.destinationProvince || "Đà Nẵng"
    const destType = t.destinationType || ""

    const isAbroad =
      category === "ABROAD" ||
      (country !== "" && country.toLowerCase() !== "việt nam" && country.toLowerCase() !== "vietnam")
    const isInProvince = province.includes("Đà Nẵng") || province.includes("Da Nang")

    if (isAbroad) {
      transferOutStats.abroad++
    } else if (isInProvince) {
      transferOutStats.inProvince++
      const isPrivate =
        destType === "PRIVATE" ||
        destType.toLowerCase() === "tư thục" ||
        destType.includes("Tư thục") ||
        destType.includes("Tư Thục")
      if (isPrivate) {
        transferOutStats.inProvincePrivate++
      }
    } else {
      transferOutStats.outProvince++
    }
  }

  // Helper for Preschool Grade Normalization
  const normalizePreschoolGradeName = (gradeValue: string) => {
    if (!gradeValue) return "Khác"
    const val = gradeValue.trim()
    if (val === "Nhà trẻ 12-18 tháng" || val.includes("12-18") || val.includes("12 đến 18")) return "Nhà trẻ 12-18 tháng"
    if (val === "Nhà trẻ 18-24 tháng" || val.includes("18-24") || val.includes("18 đến 24")) return "Nhà trẻ 18-24 tháng"
    if (
      val === "Nhà trẻ 24-36 tháng" ||
      val.includes("24-36") ||
      val.includes("24 đến 36") ||
      val.toLowerCase().includes("nhà trẻ") ||
      val.includes("18-36") ||
      val.includes("12-36")
    )
      return "Nhà trẻ 24-36 tháng"
    if (val === "Mẫu giáo bé" || val === "3 đến 4 tuổi" || val === "3-4 tuổi") return "Mẫu giáo bé"
    if (val === "Mẫu giáo nhỡ" || val === "4 đến 5 tuổi" || val === "4-5 tuổi") return "Mẫu giáo nhỡ"
    if (val === "Mẫu giáo lớn" || val === "5 đến 6 tuổi" || val === "5-6 tuổi") return "Mẫu giáo lớn"
    return val
  }

  // Reconstruct monthly headcount trend split by General vs Preschool
  let monthlyHeadcount: any[] = []
  if (academicYear) {
    const start = new Date(academicYear.startDate)
    const end = new Date(academicYear.endDate)

    const months: { year: number; month: number }[] = []
    const curr = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)

    let limit = 0
    while (curr <= last && limit < 24) {
      months.push({
        year: curr.getFullYear(),
        month: curr.getMonth()
      })
      curr.setMonth(curr.getMonth() + 1)
      limit++
    }

    const targetCampusId = isFullAccess ? "ALL" : allowedCampusIds.length === 1 ? allowedCampusIds[0] : "ALL"
    let snapshots: any[] = []
    try {
      snapshots = await prisma.monthlyEnrollmentSnapshot.findMany({
        where: {
          academicYearId: targetYearId,
          campusId: targetCampusId
        },
        orderBy: [{ year: "asc" }, { month: "asc" }]
      })
    } catch (e) {
      console.error("Error loading monthly enrollment snapshots:", e)
    }

    const snapshotMap = new Map()
    snapshots.forEach((s: any) => {
      snapshotMap.set(`${s.month}/${s.year}`, s)
    })

    const currentYearMonth = now.getFullYear() * 12 + now.getMonth()

    let lastKnownClosing = totalStudents || 2341
    let lastKnownGeneral = 1904
    let lastKnownPreschool = 437

    const allMonthsData = months.map((m) => {
      const key = m.month + 1 + "/" + m.year
      const snap = snapshotMap.get(key)
      const monthIndex = m.year * 12 + m.month

      if (snap) {
        lastKnownClosing = snap.closingCount
        lastKnownPreschool = snap.preschoolCount
        lastKnownGeneral = snap.closingCount - snap.preschoolCount

        return {
          month: key,
          monthNum: m.month + 1,
          yearNum: m.year,
          generalCount: lastKnownGeneral,
          preschoolCount: lastKnownPreschool,
          count: lastKnownClosing,
          isActual: true,
          increase: snap.increaseCount || 0,
          decrease: snap.decreaseCount || 0,
          status: snap.status
        }
      }

      if (monthIndex > currentYearMonth) {
        return {
          month: key,
          monthNum: m.month + 1,
          yearNum: m.year,
          generalCount: lastKnownGeneral,
          preschoolCount: lastKnownPreschool,
          count: lastKnownClosing,
          increase: 0,
          decrease: 0,
          isActual: false,
          isForecast: true
        }
      }

      return {
        month: key,
        monthNum: m.month + 1,
        yearNum: m.year,
        generalCount: lastKnownGeneral,
        preschoolCount: lastKnownPreschool,
        count: lastKnownClosing,
        increase: 0,
        decrease: 0,
        isActual: true
      }
    })

    // Filter monthlyHeadcount if timeRange is set
    if (filterTimeRange === "HK1") {
      monthlyHeadcount = allMonthsData.filter((m) => m.monthNum >= 8 && m.monthNum <= 12)
    } else if (filterTimeRange === "HK2") {
      monthlyHeadcount = allMonthsData.filter((m) => m.monthNum >= 1 && m.monthNum <= 5)
    } else if (filterTimeRange === "LAST_6_MONTHS") {
      monthlyHeadcount = allMonthsData.slice(0, 6)
    } else if (filterTimeRange === "LAST_3_MONTHS") {
      monthlyHeadcount = allMonthsData.slice(0, 3)
    } else if (filterTimeRange === "CURRENT_MONTH") {
      const curM = now.getMonth() + 1
      const filtered = allMonthsData.filter((m) => m.monthNum === curM)
      monthlyHeadcount = filtered.length > 0 ? filtered : allMonthsData.slice(0, 2)
    } else {
      monthlyHeadcount = allMonthsData
    }
  }

  let surveyed = 0
  let notSurveyed = 0
  let totalPromoter = 0
  let totalDetractor = 0
  let totalPassive = 0
  let totalWeightedSatisfaction = 0
  let totalSurveyedWithScore = 0

  classSummaries.forEach((s) => {
    surveyed += s.surveyedStudents
    notSurveyed += s.notSurveyedStudents
    totalPromoter += s.promoterCount
    totalDetractor += s.detractorCount
    totalPassive += s.passiveCount
    if (s.averageSatisfactionScore && s.averageSatisfactionScore > 0 && s.surveyedStudents > 0) {
      totalWeightedSatisfaction += s.averageSatisfactionScore * s.surveyedStudents
      totalSurveyedWithScore += s.surveyedStudents
    }
  })

  const completionRate = totalStudents > 0 ? Number(((surveyed / totalStudents) * 100).toFixed(1)) : 0
  const avgSatisfaction =
    totalSurveyedWithScore > 0 ? Number((totalWeightedSatisfaction / totalSurveyedWithScore).toFixed(2)) : 0
  const totalResponses = totalPromoter + totalDetractor + totalPassive
  const systemNps =
    totalResponses > 0
      ? Number(((totalPromoter / totalResponses) * 100 - (totalDetractor / totalResponses) * 100).toFixed(1))
      : 0

  // Aggregations for grade, campus, level distributions and entry level statistics
  const activeStudentsForStats = await prisma.student.findMany({
    where: studentWhere,
    include: {
      class: { select: { className: true, grade: true, level: true } },
      campus: { select: { id: true, campusCode: true, campusName: true } },
      surveyForms: { select: { id: true } },
      studentTransfers: { select: { id: true, type: true } }
    }
  })

  const gradeCountMap: Record<string, number> = {}
  const campusCountMap: Record<
    string,
    { campusId: string; campusCode: string; campusName: string; count: number; generalCount: number; preschoolCount: number }
  > = {}
  const levelCountMap: Record<string, number> = { "Mầm non": 0, "Tiểu học": 0, "THCS": 0, "THPT": 0 }

  let totalGeneralStudents = 0
  let totalPreschoolStudents = 0

  activeStudentsForStats.forEach((s) => {
    const isPreschool =
      s.class?.level === "Mầm non" ||
      ["mầm non", "nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn"].includes(
        (s.class?.level || "").toLowerCase()
      )

    let g = ""
    if (isPreschool) {
      g = normalizePreschoolGradeName(s.class?.grade || "")
      totalPreschoolStudents++
    } else {
      g = String(s.class?.grade || "").replace("Khối ", "").trim() || "Khác"
      totalGeneralStudents++
    }
    gradeCountMap[g] = (gradeCountMap[g] || 0) + 1

    const cName = s.campus?.campusName || "Khác"
    const cCode = s.campus?.campusCode || "OTHER"
    const cId = s.campus?.id || "other"
    if (!campusCountMap[cName]) {
      campusCountMap[cName] = {
        campusId: cId,
        campusCode: cCode,
        campusName: cName,
        count: 0,
        generalCount: 0,
        preschoolCount: 0
      }
    }
    campusCountMap[cName].count++
    if (isPreschool) {
      campusCountMap[cName].preschoolCount++
    } else {
      campusCountMap[cName].generalCount++
    }

    const lvl = isPreschool ? "Mầm non" : s.class?.level || "Khác"
    if (levelCountMap[lvl] !== undefined) {
      levelCountMap[lvl]++
    } else {
      levelCountMap[lvl] = (levelCountMap[lvl] || 0) + 1
    }
  })

  const orderedGrades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const k12GradeDistribution = orderedGrades.map((gNum) => ({
    grade: gNum,
    label: "Khối " + gNum,
    count: gradeCountMap[gNum] || 0,
    level: Number(gNum) <= 5 ? "Tiểu học" : Number(gNum) <= 9 ? "THCS" : "THPT"
  }))

  const orderedPreschoolGrades = [
    "Nhà trẻ 12-18 tháng",
    "Nhà trẻ 18-24 tháng",
    "Nhà trẻ 24-36 tháng",
    "Mẫu giáo bé",
    "Mẫu giáo nhỡ",
    "Mẫu giáo lớn"
  ]
  const preschoolGradeDistribution: any[] = []
  orderedPreschoolGrades.forEach((pKey) => {
    if (gradeCountMap[pKey] !== undefined) {
      preschoolGradeDistribution.push({
        grade: pKey,
        label: pKey,
        count: gradeCountMap[pKey] || 0,
        level: "Mầm non"
      })
    }
  })

  const gradeDistribution = [...k12GradeDistribution, ...preschoolGradeDistribution]
  const campusDistribution = Object.values(campusCountMap).sort((a, b) => a.campusCode.localeCompare(b.campusCode))

  const levelDistribution = Object.entries(levelCountMap).map(([level, count]) => ({
    level,
    count,
    percentage: totalStudents > 0 ? Number(((count / totalStudents) * 100).toFixed(1)) : 0
  }))

  // Entry Level Students (Khối 1, Khối 6, Khối 10)
  const inputAssessmentWhere: any = targetYearId ? { batch: { period: { academicYearId: targetYearId } } } : {}
  if (!isFullAccess) {
    inputAssessmentWhere.batch = {
      ...(inputAssessmentWhere.batch || {}),
      campusId: { in: allowedCampusIds }
    }
  }

  const [generalInputs, preschoolInputs] = await Promise.all([
    prisma.inputAssessmentStudent.findMany({
      where: inputAssessmentWhere,
      select: { studentCode: true, fullName: true, grade: true, admissionResult: true, enrollmentCode: true }
    }),
    prisma.preschoolInputAssessmentStudent.findMany({
      where: inputAssessmentWhere,
      select: { studentCode: true, fullName: true, grade: true, admissionResult: true, enrollmentCode: true }
    })
  ])

  const genCodeSet = new Set<string>()
  const genNameSet = new Set<string>()
  generalInputs.forEach((g) => {
    if (g.studentCode) genCodeSet.add(g.studentCode)
    if (g.enrollmentCode) genCodeSet.add(g.enrollmentCode)
    if (g.fullName) genNameSet.add(g.fullName.trim().toLowerCase())
  })

  const preCodeSet = new Set<string>()
  const preNameSet = new Set<string>()
  preschoolInputs.forEach((p) => {
    if (p.studentCode) preCodeSet.add(p.studentCode)
    if (p.enrollmentCode) preCodeSet.add(p.enrollmentCode)
    if (p.fullName && (p.grade === "5 đến 6 tuổi" || p.grade === "Mẫu giáo lớn"))
      preNameSet.add(p.fullName.trim().toLowerCase())
  })

  const entryStudentsList: any[] = []
  const entryLevelStats = {
    total: 0,
    grade1: { total: 0, surveyCount: 0, preschoolCount: 0, otherCount: 0 },
    grade6: { total: 0, surveyCount: 0, otherCount: 0 },
    grade10: { total: 0, surveyCount: 0, otherCount: 0 },
    students: entryStudentsList
  }

  activeStudentsForStats.forEach((s) => {
    const rawGrade = String(s.class?.grade || "").replace("Khối ", "").trim()
    if (["1", "6", "10"].includes(rawGrade)) {
      const code = s.studentCode
      const nameKey = s.studentName ? s.studentName.trim().toLowerCase() : ""

      const hasSurveyForm = s.surveyForms && s.surveyForms.length > 0
      const hasTransferIn = s.studentTransfers && s.studentTransfers.some((t: any) => t.type === "IN")
      const isFromSurvey =
        genCodeSet.has(code) ||
        genNameSet.has(nameKey) ||
        hasSurveyForm ||
        hasTransferIn ||
        s.enrollmentType === "KS" ||
        s.isSurveyStudent
      const isFromPreschool = (preCodeSet.has(code) || preNameSet.has(nameKey)) && !isFromSurvey

      let source: "KHAO_SAT" | "MAU_GIAO_LON" | "KHAC" = "KHAC"
      let sourceLabel = "Trực tiếp / Khác"

      if (rawGrade === "1") {
        if (isFromPreschool) {
          source = "MAU_GIAO_LON"
          sourceLabel = "Chuyển từ Mẫu giáo lớn"
          entryLevelStats.grade1.preschoolCount++
        } else if (isFromSurvey) {
          source = "KHAO_SAT"
          sourceLabel = "Nhập học qua Khảo sát"
          entryLevelStats.grade1.surveyCount++
        } else {
          entryLevelStats.grade1.otherCount++
        }
        entryLevelStats.grade1.total++
      } else if (rawGrade === "6") {
        if (isFromSurvey) {
          source = "KHAO_SAT"
          sourceLabel = "Nhập học qua Khảo sát"
          entryLevelStats.grade6.surveyCount++
        } else {
          entryLevelStats.grade6.otherCount++
        }
        entryLevelStats.grade6.total++
      } else if (rawGrade === "10") {
        if (isFromSurvey) {
          source = "KHAO_SAT"
          sourceLabel = "Nhập học qua Khảo sát"
          entryLevelStats.grade10.surveyCount++
        } else {
          entryLevelStats.grade10.otherCount++
        }
        entryLevelStats.grade10.total++
      }

      entryLevelStats.total++

      entryStudentsList.push({
        id: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        grade: "Khối " + rawGrade,
        rawGrade,
        className: s.class?.className || "---",
        campusName: s.campus?.campusName || "---",
        level: s.class?.level || "---",
        source,
        sourceLabel
      })
    }
  })

  // ============================================================================
  // NEW EXTENDED ANALYTICS: KHẢO THÍ, CHẤT LƯỢNG HỌC TẬP, CVHT, DỰ GIỜ, CÔNG VIỆC
  // ============================================================================
  let testingAnalytics: any = null
  let academicQualityAnalytics: any = null
  let advisoryAnalytics: any = null
  let observationAnalytics: any = null
  let taskAnalytics: any = null
  let smartAlerts: any[] = []

  try {
    // 1. KHẢO THÍ & TUYỂN SINH ĐẦU VÀO
    let k12Passed = 0,
      k12Committed = 0,
      k12Exchange = 0,
      k12Retest = 0,
      k12Failed = 0,
      k12Pending = 0
    generalInputs.forEach((g) => {
      const res = (g.admissionResult || "").trim()
      if (res === "Đạt") k12Passed++
      else if (res === "Đạt cam kết") k12Committed++
      else if (res === "Đạt - Giao lưu") k12Exchange++
      else if (res.includes("Kiểm tra lại")) k12Retest++
      else if (res === "Không đạt") k12Failed++
      else k12Pending++
    })

    let prePassed = 0,
      preTrial = 0,
      preFailed = 0,
      prePending = 0
    preschoolInputs.forEach((p) => {
      const res = (p.admissionResult || "").trim()
      if (res === "Đạt" || res === "Đạt - Miễn Học Thử" || res === "Đạt - Sau học thử") prePassed++
      else if (res === "Đạt - Học Thử" || res === "Ý kiến khác") preTrial++
      else if (res === "Không đạt") preFailed++
      else prePending++
    })

    const [examsList, achievementsCount, studentAchievementsCount, assessmentScoresCount] = await Promise.all([
      prisma.exam.findMany({
        where: targetYearId ? { OR: [{ academicYearId: targetYearId }, { academicYearId: null }] } : {},
        include: {
          category: { select: { name: true } },
          _count: { select: { students: true, achievements: true } }
        }
      }).catch(() => []),
      prisma.achievement.count({
        where: targetYearId ? { academicYearId: targetYearId } : {}
      }).catch(() => 0),
      prisma.studentAchievement.count({
        where: !isFullAccess ? { student: { campusId: { in: allowedCampusIds } } } : {}
      }).catch(() => 0),
      prisma.studentAssessmentScore.count().catch(() => 0)
    ])

    const examCategoryMap: Record<string, { category: string; examCount: number; studentCount: number }> = {}
    let totalExamParticipants = 0
    examsList.forEach((ex: any) => {
      const cat = ex.category?.name || "Khác"
      if (!examCategoryMap[cat]) {
        examCategoryMap[cat] = { category: cat, examCount: 0, studentCount: 0 }
      }
      examCategoryMap[cat].examCount++
      examCategoryMap[cat].studentCount += ex._count?.students || 0
      totalExamParticipants += ex._count?.students || 0
    })

    const totalInputCandidates = generalInputs.length + preschoolInputs.length
    const totalInputAdmitted = k12Passed + k12Committed + k12Exchange + prePassed + preTrial
    const inputPassRate =
      totalInputCandidates > 0 ? Number(((totalInputAdmitted / totalInputCandidates) * 100).toFixed(1)) : 0

    testingAnalytics = {
      totalCandidates: totalInputCandidates,
      totalAdmitted: totalInputAdmitted,
      inputPassRate,
      assessmentScoresCount,
      k12Input: {
        total: generalInputs.length,
        passed: k12Passed,
        committed: k12Committed,
        exchange: k12Exchange,
        retest: k12Retest,
        failed: k12Failed,
        pending: k12Pending
      },
      preschoolInput: {
        total: preschoolInputs.length,
        passed: prePassed,
        trial: preTrial,
        failed: preFailed,
        pending: prePending
      },
      inputDistribution: [
        {
          label: "Đạt chuẩn",
          k12: k12Passed + k12Exchange,
          preschool: prePassed,
          total: k12Passed + k12Exchange + prePassed,
          color: "#00A19A"
        },
        {
          label: "Đạt cam kết / Học thử",
          k12: k12Committed,
          preschool: preTrial,
          total: k12Committed + preTrial,
          color: "#6C5CE7"
        },
        {
          label: "Chờ duyệt KQ",
          k12: k12Pending + k12Retest,
          preschool: prePending,
          total: k12Pending + k12Retest + prePending,
          color: "#D97706"
        },
        {
          label: "Không đạt",
          k12: k12Failed,
          preschool: preFailed,
          total: k12Failed + preFailed,
          color: "#E11D48"
        }
      ],
      examsSummary: {
        totalExams: examsList.length,
        totalParticipants: totalExamParticipants,
        totalAchievements: achievementsCount,
        totalStudentAwards: studentAchievementsCount,
        byCategory: Object.values(examCategoryMap)
      }
    }

    // 2. CHẤT LƯỢNG HỌC TẬP, NĂNG LỰC & HỖ TRỢ HỌC SINH
    const gradeEntriesWhere: any = {
      compositeScore: { not: null },
      ...(targetYearId ? { academicYearId: targetYearId } : {})
    }
    if (!isFullAccess || filterLevel || filterGrade) {
      gradeEntriesWhere.class = {
        ...(!isFullAccess ? { campusId: { in: allowedCampusIds } } : {}),
        ...(filterLevel ? { level: filterLevel } : {}),
        ...(filterGrade ? { OR: [{ grade: filterGrade }, { grade: `Khối ${filterGrade}` }] } : {})
      }
    }

    const [gradeEntries, supportTargets, competencySummaryAgg] = await Promise.all([
      prisma.subjectGradeEntry.findMany({
        where: gradeEntriesWhere,
        select: {
          compositeScore: true,
          evaluationPeriod: true,
          subject: { select: { subjectName: true } }
        }
      }).catch(() => []),
      prisma.learningSupportTarget.findMany({
        where: {
          ...(targetYearId ? { academicYearId: targetYearId } : {}),
          ...(!isFullAccess ? { student: { campusId: { in: allowedCampusIds } } } : {})
        },
        select: { supportType: true, status: true, terminationStatus: true }
      }).catch(() => []),
      prisma.studentSubjectCompetencySummary.aggregate({
        _count: { id: true },
        _avg: { subjectScore: true }
      }).catch(() => ({ _count: { id: 0 }, _avg: { subjectScore: 0 } }))
    ])

    let scoreSum = 0
    let bandExcellent = 0, // >= 8.0
      bandGood = 0, // 6.5 - < 8.0
      bandAverage = 0, // 5.0 - < 6.5
      bandBelow = 0 // < 5.0

    const subjMap: Record<
      string,
      { subjectName: string; count: number; sum: number; passCount: number; belowCount: number }
    > = {}

    gradeEntries.forEach((ge: any) => {
      const sc = Number(ge.compositeScore)
      if (isNaN(sc)) return
      scoreSum += sc
      if (sc >= 8.0) bandExcellent++
      else if (sc >= 6.5) bandGood++
      else if (sc >= 5.0) bandAverage++
      else bandBelow++

      const sName = ge.subject?.subjectName || "Khác"
      if (!subjMap[sName]) {
        subjMap[sName] = { subjectName: sName, count: 0, sum: 0, passCount: 0, belowCount: 0 }
      }
      subjMap[sName].count++
      subjMap[sName].sum += sc
      if (sc >= 5.0) subjMap[sName].passCount++
      else subjMap[sName].belowCount++
    })

    const totalValidScores = bandExcellent + bandGood + bandAverage + bandBelow
    const overallAvgScore = totalValidScores > 0 ? Number((scoreSum / totalValidScores).toFixed(2)) : 0
    const overallPassRate =
      totalValidScores > 0
        ? Number((((bandExcellent + bandGood + bandAverage) / totalValidScores) * 100).toFixed(1))
        : 0
    const highAchieverRate =
      totalValidScores > 0 ? Number(((bandExcellent / totalValidScores) * 100).toFixed(1)) : 0

    const subjectPerformance = Object.values(subjMap)
      .map((s) => ({
        subjectName: s.subjectName,
        count: s.count,
        avgScore: s.count > 0 ? Number((s.sum / s.count).toFixed(2)) : 0,
        passRate: s.count > 0 ? Number(((s.passCount / s.count) * 100).toFixed(1)) : 0,
        belowCount: s.belowCount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    let activeAcademicSupport = 0,
      activePsychSupport = 0,
      completedSupport = 0
    supportTargets.forEach((st: any) => {
      if (st.terminationStatus === "TERMINATED") {
        completedSupport++
      } else if (st.supportType === "ACADEMIC") {
        activeAcademicSupport++
      } else {
        activePsychSupport++
      }
    })

    academicQualityAnalytics = {
      totalGradeEntries: totalValidScores,
      averageScore: overallAvgScore,
      passRate: overallPassRate,
      highAchieverRate,
      scoreDistribution: [
        {
          band: "Giỏi / Xuất sắc (≥ 8.0)",
          shortLabel: "≥ 8.0",
          count: bandExcellent,
          percent: totalValidScores > 0 ? Number(((bandExcellent / totalValidScores) * 100).toFixed(1)) : 0,
          color: "#00A19A"
        },
        {
          band: "Khá (6.5 - 7.9)",
          shortLabel: "6.5 - 7.9",
          count: bandGood,
          percent: totalValidScores > 0 ? Number(((bandGood / totalValidScores) * 100).toFixed(1)) : 0,
          color: "#48BFE3"
        },
        {
          band: "Đạt / TB (5.0 - 6.4)",
          shortLabel: "5.0 - 6.4",
          count: bandAverage,
          percent: totalValidScores > 0 ? Number(((bandAverage / totalValidScores) * 100).toFixed(1)) : 0,
          color: "#D97706"
        },
        {
          band: "Cần cố gắng (< 5.0)",
          shortLabel: "< 5.0",
          count: bandBelow,
          percent: totalValidScores > 0 ? Number(((bandBelow / totalValidScores) * 100).toFixed(1)) : 0,
          color: "#E11D48"
        }
      ],
      subjectPerformance,
      competencySummary: {
        totalSummaries: competencySummaryAgg?._count?.id || 0,
        avgCompetencyPercent: competencySummaryAgg?._avg?.subjectScore
          ? Number(competencySummaryAgg._avg.subjectScore.toFixed(1))
          : 0
      },
      supportSummary: {
        totalActive: activeAcademicSupport + activePsychSupport,
        academicActive: activeAcademicSupport,
        psychActive: activePsychSupport,
        completed: completedSupport,
        totalRecords: supportTargets.length
      }
    }

    // 3. CỐ VẤN HỌC TẬP & MỤC TIÊU HỌC SINH (CVHT)
    const goalWhere: any = targetYearId ? { academicYearId: targetYearId } : {}
    const consultWhere: any = targetYearId ? { academicYearId: targetYearId } : {}
    if (!isFullAccess || filterLevel || filterGrade) {
      const studentRelFilter = {
        ...(!isFullAccess ? { campusId: { in: allowedCampusIds } } : {}),
        ...(filterLevel || filterGrade ? { class: classWhere } : {})
      }
      goalWhere.student = studentRelFilter
      consultWhere.student = studentRelFilter
    }
    if (dateStartBound || dateEndBound) {
      consultWhere.meetingDate = {
        ...(dateStartBound ? { gte: dateStartBound } : {}),
        ...(dateEndBound ? { lte: dateEndBound } : {})
      }
    }

    const [studentGoals, consultationLogs, pendingUnlockRequests] = await Promise.all([
      prisma.studentGoal.findMany({
        where: goalWhere,
        select: {
          studentId: true,
          category: true,
          status: true,
          achievementLevel: true,
          signedByTeacher: true,
          signedByParent: true,
          teacherComment: true,
          parentMessage: true
        }
      }).catch(() => []),
      prisma.academicConsultationLog.findMany({
        where: consultWhere,
        select: {
          studentId: true,
          status: true,
          meetingDate: true
        }
      }).catch(() => []),
      prisma.studentGoalUnlock.count({
        where: {
          ...(targetYearId ? { academicYearId: targetYearId } : {}),
          status: "PENDING"
        }
      }).catch(() => 0)
    ])

    const goalStudentSet = new Set<string>()
    const parentSignedStudentSet = new Set<string>()
    const teacherReviewedStudentSet = new Set<string>()
    const goalCategoryMap: Record<string, { key: string; label: string; count: number; color: string }> = {
      HOC_TAP: { key: "HOC_TAP", label: "Học tập", count: 0, color: "#00A19A" },
      THOI_QUEN: { key: "THOI_QUEN", label: "Thói quen & Kỷ luật", count: 0, color: "#48BFE3" },
      KY_NANG_CAM_XUC: { key: "KY_NANG_CAM_XUC", label: "Kỹ năng & Cảm xúc", count: 0, color: "#6C5CE7" },
      DINH_HUONG: { key: "DINH_HUONG", label: "Định hướng tương lai", count: 0, color: "#D97706" },
      KHAC: { key: "KHAC", label: "Sức khỏe & Phẩm chất", count: 0, color: "#10B981" }
    }

    studentGoals.forEach((g: any) => {
      goalStudentSet.add(g.studentId)
      if (g.signedByParent || (g.parentMessage && g.parentMessage.trim())) {
        parentSignedStudentSet.add(g.studentId)
      }
      if (g.signedByTeacher || (g.teacherComment && g.teacherComment.trim())) {
        teacherReviewedStudentSet.add(g.studentId)
      }
      const cat = g.category || "KHAC"
      if (goalCategoryMap[cat]) {
        goalCategoryMap[cat].count++
      } else {
        goalCategoryMap.KHAC.count++
      }
    })

    const consultedStudentSet = new Set<string>()
    consultationLogs.forEach((c: any) => {
      if (c.studentId) consultedStudentSet.add(c.studentId)
    })

    const k12TotalForAdvisory = totalGeneralStudents || 1
    const consultationCoverageRate =
      totalGeneralStudents > 0
        ? Number(((consultedStudentSet.size / k12TotalForAdvisory) * 100).toFixed(1))
        : 0
    const goalCoverageRate =
      totalGeneralStudents > 0
        ? Number(((goalStudentSet.size / k12TotalForAdvisory) * 100).toFixed(1))
        : 0

    advisoryAnalytics = {
      totalGoals: studentGoals.length,
      studentsWithGoals: goalStudentSet.size,
      goalCoverageRate,
      parentSignedStudents: parentSignedStudentSet.size,
      teacherReviewedStudents: teacherReviewedStudentSet.size,
      pendingUnlockRequests,
      totalConsultations: consultationLogs.length,
      consultedStudents: consultedStudentSet.size,
      consultationCoverageRate,
      goalsByCategory: Object.values(goalCategoryMap).filter((c) => c.count > 0)
    }

    // 4. DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN
    const obsSlotWhere: any = targetYearId ? { academicYearId: targetYearId } : {}
    if (!isFullAccess) {
      obsSlotWhere.campusId = { in: allowedCampusIds }
    }
    if (filterLevel) {
      obsSlotWhere.level = filterLevel
    }
    if (filterGrade) {
      obsSlotWhere.OR = [{ grade: filterGrade }, { grade: `Khối ${filterGrade}` }]
    }
    if (dateStartBound || dateEndBound) {
      obsSlotWhere.date = {
        ...(dateStartBound ? { gte: dateStartBound } : {}),
        ...(dateEndBound ? { lte: dateEndBound } : {})
      }
    }

    const [obsSlots, teacherTargetsCount] = await Promise.all([
      prisma.observationSlot.findMany({
        where: obsSlotWhere,
        select: {
          id: true,
          level: true,
          status: true,
          registrations: {
            select: {
              id: true,
              evaluation: {
                select: {
                  id: true,
                  overallRating: true,
                  totalScore: true
                }
              }
            }
          }
        }
      }).catch(() => []),
      prisma.teacherAcademicYearTarget.count({
        where: targetYearId ? { academicYearId: targetYearId } : {}
      }).catch(() => 0)
    ])

    let totalObsRegs = 0
    let totalObsEvals = 0
    let completedSlots = 0
    let activeSlots = 0
    let expiredSlots = 0

    const obsByLevelMap: Record<
      string,
      { level: string; slots: number; registrations: number; evaluations: number; completionRate: number }
    > = {}

    let ratingExcellent = 0, // Giỏi / Strong Practice (Exemplary)
      ratingGood = 0, // Tốt / Strong Practice / Proficient
      ratingFair = 0, // Khá / Effective Practice
      ratingPass = 0, // Đạt / Trung bình
      ratingUnrated = 0

    obsSlots.forEach((slot: any) => {
      const lvl = slot.level || "Khác"
      if (!obsByLevelMap[lvl]) {
        obsByLevelMap[lvl] = { level: lvl, slots: 0, registrations: 0, evaluations: 0, completionRate: 0 }
      }
      obsByLevelMap[lvl].slots++

      if (slot.status === "COMPLETED") completedSlots++
      else if (slot.status === "ACTIVE") activeSlots++
      else if (slot.status === "EXPIRED") expiredSlots++

      const regs = slot.registrations || []
      totalObsRegs += regs.length
      obsByLevelMap[lvl].registrations += regs.length

      regs.forEach((r: any) => {
        if (r.evaluation) {
          totalObsEvals++
          obsByLevelMap[lvl].evaluations++
          const rt = (r.evaluation.overallRating || "").trim()
          if (rt === "Giỏi" || rt.includes("Exemplary")) ratingExcellent++
          else if (rt === "Tốt" || rt.includes("Strong Practice")) ratingGood++
          else if (rt === "Khá" || rt.includes("Effective")) ratingFair++
          else if (rt === "Đạt" || rt === "Trung bình") ratingPass++
          else ratingUnrated++
        }
      })
    })

    const obsByLevel = Object.values(obsByLevelMap)
      .map((item) => ({
        ...item,
        completionRate:
          item.registrations > 0 ? Number(((item.evaluations / item.registrations) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.slots - a.slots)

    const evalCompletionRate =
      totalObsRegs > 0 ? Number(((totalObsEvals / totalObsRegs) * 100).toFixed(1)) : 0

    observationAnalytics = {
      totalSlots: obsSlots.length,
      completedSlots,
      activeSlots,
      expiredSlots,
      totalRegistrations: totalObsRegs,
      totalEvaluations: totalObsEvals,
      evalCompletionRate,
      teacherTargetsCount,
      byLevel: obsByLevel,
      ratingDistribution: [
        { label: "Giỏi / Xuất sắc", count: ratingExcellent, color: "#00A19A" },
        { label: "Tốt / Strong Practice", count: ratingGood, color: "#48BFE3" },
        { label: "Khá / Effective", count: ratingFair, color: "#6C5CE7" },
        { label: "Đạt / Trung bình", count: ratingPass, color: "#D97706" },
        { label: "Chưa xếp loại", count: ratingUnrated, color: "#94A3B8" }
      ].filter((r) => r.count > 0)
    }

    // 5. ĐIỀU HÀNH CÔNG VIỆC (WORK TASKS)
    const workTasks = await prisma.workTask
      .findMany({
        where: targetYearId ? { OR: [{ academicYearId: targetYearId }, { academicYearId: null }] } : {},
        include: {
          assignedToUser: { select: { fullName: true } },
          taskGroup: { select: { name: true } }
        },
        orderBy: [{ isImportant: "desc" }, { endDate: "asc" }]
      })
      .catch(() => [])

    let taskCompleted = 0,
      taskInProgress = 0,
      taskPending = 0,
      taskOverdue = 0

    workTasks.forEach((wt: any) => {
      const isPastDue = wt.endDate && new Date(wt.endDate) < now && wt.progress !== "COMPLETED"
      if (wt.progress === "COMPLETED") taskCompleted++
      else if (wt.progress === "OVERDUE" || isPastDue) taskOverdue++
      else if (wt.progress === "IN_PROGRESS") taskInProgress++
      else taskPending++
    })

    const taskCompletionRate =
      workTasks.length > 0 ? Number(((taskCompleted / workTasks.length) * 100).toFixed(1)) : 0

    taskAnalytics = {
      totalTasks: workTasks.length,
      completedTasks: taskCompleted,
      inProgressTasks: taskInProgress,
      pendingTasks: taskPending,
      overdueTasks: taskOverdue,
      completionRate: taskCompletionRate,
      statusDistribution: [
        { status: "Hoàn thành", count: taskCompleted, color: "#059669" },
        { status: "Đang thực hiện", count: taskInProgress, color: "#0284C7" },
        { status: "Chờ xử lý", count: taskPending, color: "#D97706" },
        { status: "Quá hạn", count: taskOverdue, color: "#E11D48" }
      ],
      recentTasks: workTasks.slice(0, 6).map((wt: any) => ({
        id: wt.id,
        title: wt.title,
        category: wt.category,
        department: wt.department || wt.assignedToRole || "KT&ĐBCL",
        groupName: wt.taskGroup?.name || wt.category,
        assigneeName: wt.assignedToUser?.fullName || wt.assignedToRole || "Bộ phận",
        progress:
          wt.progress === "COMPLETED"
            ? "COMPLETED"
            : wt.progress === "OVERDUE" || (wt.endDate && new Date(wt.endDate) < now)
            ? "OVERDUE"
            : wt.progress,
        priority: wt.priority || "MEDIUM",
        isImportant: Boolean(wt.isImportant),
        endDate: wt.endDate
      }))
    }

    // 6. TRUNG TÂM CẢNH BÁO THÔNG MINH (SMART ALERTS TỪ DỮ LIỆU THỰC)
    if (taskOverdue > 0) {
      smartAlerts.push({
        id: "alert-overdue-tasks",
        title: `${taskOverdue} nhiệm vụ điều hành đang quá hạn hoàn thành`,
        description: `Có ${taskOverdue}/${workTasks.length} công việc trên hệ thống đã quá mốc thời hạn (Deadline) cần kiểm tra và đôn đốc xử lý ngay.`,
        severity: "CRITICAL",
        category: "OVERDUE_TASK",
        categoryLabel: "Công việc quá hạn",
        metricBadge: `${taskOverdue} việc quá hạn`,
        scopeText: "Ban KT&ĐBCL & Chuyên môn",
        href: "/admin/tasks",
        actionLabel: "Mở Điều hành Công việc"
      })
    }

    const totalPendingAdmissions = k12Pending + k12Retest + prePending
    if (totalPendingAdmissions > 0) {
      smartAlerts.push({
        id: "alert-pending-admissions",
        title: `${totalPendingAdmissions} hồ sơ khảo sát đầu vào chờ xét duyệt kết quả`,
        description: `Gồm ${k12Pending + k12Retest} hồ sơ Phổ thông K-12 và ${prePending} hồ sơ Mầm non đã khảo sát nhưng chưa chốt trạng thái phê duyệt.`,
        severity: "WARNING",
        category: "DATA_ANOMALY",
        categoryLabel: "Dữ liệu chờ duyệt",
        metricBadge: `${totalPendingAdmissions} hồ sơ`,
        scopeText: `Phổ thông (${k12Pending + k12Retest}) • Mầm non (${prePending})`,
        href: "/admin/xet-duyet-ket-qua",
        actionLabel: "Xét duyệt kết quả"
      })
    }

    if (bandBelow > 0) {
      const lowSubjects = subjectPerformance.filter((s) => s.passRate < 75).map((s) => s.subjectName)
      smartAlerts.push({
        id: "alert-below-avg-scores",
        title: `Phát hiện ${bandBelow} lượt điểm khảo sát/định kỳ dưới chuẩn (< 5.0)`,
        description:
          lowSubjects.length > 0
            ? `Các môn có tỷ lệ đạt cần lưu ý: ${lowSubjects.slice(0, 3).join(", ")}. Cần đối soát phổ điểm và tổ chức phụ đạo kịp thời.`
            : `Chiếm ${((bandBelow / (totalValidScores || 1)) * 100).toFixed(1)}% tổng số bài đánh giá đã nhập điểm trên hệ thống.`,
        severity: bandBelow > 200 ? "CRITICAL" : "WARNING",
        category: "DATA_ANOMALY",
        categoryLabel: "Chất lượng học tập",
        metricBadge: `${bandBelow} bài < 5.0`,
        scopeText: `Năm học ${academicYearName}`,
        href: "/admin/ktdbcl/phan-tich-thkq",
        actionLabel: "Phân tích phổ điểm"
      })
    }

    const activeSupportCount = activeAcademicSupport + activePsychSupport
    if (activeSupportCount > 0) {
      smartAlerts.push({
        id: "alert-active-support",
        title: `${activeSupportCount} học sinh đang trong diện theo dõi hỗ trợ chuyên biệt`,
        description: `Bao gồm ${activeAcademicSupport} học sinh bồi dưỡng học tập và ${activePsychSupport} học sinh theo dõi hỗ trợ tâm lý học đường.`,
        severity: "WARNING",
        category: "STUDENT_SUPPORT",
        categoryLabel: "Hỗ trợ học sinh",
        metricBadge: `${activeSupportCount} hồ sơ ACTIVE`,
        scopeText: `Học tập (${activeAcademicSupport}) • Tâm lý (${activePsychSupport})`,
        href: "/admin/ktdbcl/support",
        actionLabel: "Theo dõi hỗ trợ"
      })
    }

    const unsubmittedObsEvals = Math.max(0, totalObsRegs - totalObsEvals)
    if (unsubmittedObsEvals > 0) {
      smartAlerts.push({
        id: "alert-obs-pending-evals",
        title: `${unsubmittedObsEvals} lượt đăng ký dự giờ chưa hoàn tất phiếu đánh giá`,
        description: `Đã hoàn thành ${totalObsEvals}/${totalObsRegs} phiếu đánh giá tiết dạy (${evalCompletionRate}%). Cần đôn đốc giáo viên nộp phiếu nhận xét sau dự giờ.`,
        severity: evalCompletionRate < 70 ? "WARNING" : "INFO",
        category: "PROGRESS_GAP",
        categoryLabel: "Tiến độ dự giờ",
        metricBadge: `Đạt ${evalCompletionRate}%`,
        scopeText: `${obsSlots.length} tiết đăng ký`,
        href: "/admin/tong-hop-du-gio",
        actionLabel: "Tổng hợp dự giờ"
      })
    }

    if (k12Committed > 0) {
      smartAlerts.push({
        id: "alert-committed-students",
        title: `${k12Committed} học sinh diện "Đạt cam kết" đầu vào cần theo dõi lộ trình`,
        description: `Cần phối hợp giữa GVCN, GVBM và Cố vấn học tập để đánh giá sự tiến bộ định kỳ của nhóm học sinh cam kết đầu năm.`,
        severity: "INFO",
        category: "PROGRESS_GAP",
        categoryLabel: "Theo dõi cam kết",
        metricBadge: `${k12Committed} HS cam kết`,
        scopeText: "Khối Phổ thông K-12",
        href: "/admin/co-van-hoc-tap?tab=consultations",
        actionLabel: "Sổ cố vấn học tập"
      })
    }
  } catch (extErr) {
    console.error("Error computing extended admin analytics:", extErr)
  }

  return {
    academicYearId: targetYearId,
    academicYearName,
    allAcademicYears,
    allCampuses,
    totalStudents,
    totalGeneralStudents,
    totalPreschoolStudents,
    totalClasses,
    generalClasses,
    preschoolClasses,
    transferCount,
    newEnrollmentsCount: newEnrollmentStats.total,
    changeClassCount,
    assessmentGroup,
    admissionGroup,
    surveyedStudents: surveyed,
    notSurveyedStudents: notSurveyed,
    completionRate,
    systemAverageSatisfactionScore: avgSatisfaction,
    systemNps,
    monthlyHeadcount,
    newEnrollmentStats,
    transferOutStats,
    gradeDistribution,
    k12GradeDistribution,
    preschoolGradeDistribution,
    campusDistribution,
    levelDistribution,
    entryLevelStats,
    // New comprehensive analytics blocks
    testingAnalytics,
    academicQualityAnalytics,
    advisoryAnalytics,
    observationAnalytics,
    taskAnalytics,
    smartAlerts
  }
}

export async function getTeacherMetrics(userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher)
    return {
      totalStudents: 0,
      surveyedStudents: 0,
      notSurveyedStudents: 0,
      completionRate: 0,
      averageSatisfactionScore: 0,
      nps: 0
    }

  const classes = await prisma.class.findMany({
    where: {
      OR: [{ homeroomTeacherId: teacher.id }, { teachers: { some: { teacherId: teacher.id } } }]
    }
  })

  const classIds = classes.map((c) => c.id)

  const summaries = await prisma.summaryByClass.findMany({
    where: { classId: { in: classIds } }
  })

  let totalStudents = 0,
    surveyed = 0,
    notSurveyed = 0,
    promoter = 0,
    detractor = 0,
    passive = 0,
    totalSatisfaction = 0,
    hasSatisfaction = 0

  summaries.forEach((s) => {
    totalStudents += s.totalStudents
    surveyed += s.surveyedStudents
    notSurveyed += s.notSurveyedStudents
    promoter += s.promoterCount
    detractor += s.detractorCount
    passive += s.passiveCount
    if (s.averageSatisfactionScore) {
      totalSatisfaction += s.averageSatisfactionScore
      hasSatisfaction++
    }
  })

  const completionRate = totalStudents > 0 ? (surveyed / totalStudents) * 100 : 0
  const avgSatisfaction = hasSatisfaction > 0 ? totalSatisfaction / hasSatisfaction : 0
  const totalResponses = promoter + detractor + passive
  const nps = totalResponses > 0 ? (promoter / totalResponses) * 100 - (detractor / totalResponses) * 100 : 0

  return {
    totalStudents,
    surveyedStudents: surveyed,
    notSurveyedStudents: notSurveyed,
    completionRate,
    averageSatisfactionScore: avgSatisfaction,
    nps
  }
}

export async function getParentChildren(userId: string) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: { students: { include: { student: { include: { class: true, campus: true } } } } }
  })
  return parent?.students.map((s) => s.student) || []
}

export const getAdminMetrics = async (
  academicYearId?: string,
  allowedCampusIds: string[] = [],
  filterOptions: AdminDashboardFilterOptions = {}
) => {
  const yearKey = academicYearId || "current"
  const campusKey = allowedCampusIds.length > 0 ? allowedCampusIds.sort().join(",") : "all"
  const levelKey = filterOptions.level || "ALL"
  const gradeKey = filterOptions.grade || "ALL"
  const timeKey = filterOptions.timeRange || "FULL_YEAR"

  const getCached = unstable_cache(
    async () => {
      return await _getAdminMetrics(academicYearId, allowedCampusIds, filterOptions)
    },
    ["admin-metrics-v2", yearKey, campusKey, levelKey, gradeKey, timeKey],
    { revalidate: 15 }
  )

  try {
    return await getCached()
  } catch (err: any) {
    if (err?.message?.includes("incrementalCache missing")) {
      return await _getAdminMetrics(academicYearId, allowedCampusIds, filterOptions)
    }
    throw err
  }
}
