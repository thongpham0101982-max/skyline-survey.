// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { hasModulePermission } from "@/lib/permissions"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"

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
      periodVariants = ["CK1", "CUOI_KY_1", "HK1", "ALL"]
    } else if (rawPeriod === "HK1" || rawPeriod === "HOC_KY_1") {
      periodVariants = ["HK1", "CK1", "CUOI_KY_1", "ALL"]
    } else if (rawPeriod === "GK2" || rawPeriod === "GIUA_KY_2") {
      periodVariants = ["GK2", "GIUA_KY_2", "ALL"]
    } else if (rawPeriod === "CK2" || rawPeriod === "CUOI_KY_2") {
      periodVariants = ["CK2", "CUOI_KY_2", "HK2", "ALL"]
    } else if (rawPeriod === "HK2" || rawPeriod === "HOC_KY_2") {
      periodVariants = ["HK2", "CK2", "CUOI_KY_2", "ALL"]
    } else if (rawPeriod === "CN" || rawPeriod === "CA_NAM") {
      periodVariants = ["CN", "CK2", "HK2", "ALL"]
    }
    const targetPeriodFilter = periodVariants.filter(p => p !== "ALL")
    const mappedSemester =
      rawPeriod === "HK1" || rawPeriod === "CK1" || rawPeriod === "GK1"
        ? "HK1"
        : rawPeriod === "CN"
          ? "CN"
          : "HK2"

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

    const upperRole = String(userRole || "").toUpperCase().trim()
    const isAdminRole = [
      "SUPERADMIN",
      "SUPER_ADMIN",
      "ADMIN",
      "ADMINISTRATOR",
      "BGH",
      "KTDBCL",
      "KT_DBCL",
      "KHAO_THI",
      "TB_DHCM",
      "BAN_DHCM",
      "GDCS",
      "GĐCS",
      "GIAO_VU",
      "GIAO_VU_CS",
      "TTCM",
      "TBP",
    ].includes(upperRole)
    const [hasReportPerm, subjectScope] = await Promise.all([
      hasModulePermission(userRole, [
        "KTDBCL_XUAT_BANG_DIEM",
        "KTDBCL_GRADE_REMARKS",
        "KTDBCL_THONG_KE_BAO_CAO",
        "KTDBCL_PHAN_TICH_THKQ",
      ]).catch(() => false),
      resolveAccountGradebookScope(userId, userRole, targetYearId || undefined).catch(() => null),
    ])
    const isAdmin = isAdminRole || hasReportPerm || Boolean(subjectScope?.isSubjectScoped) || Boolean(subjectScope?.isFullAccess)
    const isHomeroomTeacher = teacher && (
      targetClass.homeroomTeacherId === teacher.id ||
      (targetClass.homeroomTeacherId && targetClass.homeroomTeacherId.includes(teacher.id))
    )

    if (!isAdmin && !isHomeroomTeacher) {
      return NextResponse.json({
        success: false,
        error: "Bạn không có quyền truy cập bảng điểm lớp này. Tính năng chỉ dành cho Giáo viên chủ nhiệm hoặc Quản trị viên được phân quyền."
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
    const effectiveSigTeacherId = homeroomTeacher?.id || teacher?.id || ""
    const [
      students,
      classGradeEntries,
      teachingAssignments,
      surveyConfigs,
      benchmarkConfigs,
      siblingClasses,
      homeroomSignatureProfile
    ] = await Promise.all([
      // 4. Get active students of the homeroom class
      prisma.student.findMany({
        where: {
          classId,
          status: { not: "INACTIVE" }
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
          isActive: true
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
      }),
      effectiveSigTeacherId
        ? (prisma as any).teacherSignatureProfile?.findUnique({
            where: { teacherId: effectiveSigTeacherId }
          }).catch(() => null)
        : Promise.resolve(null)
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

    // Also resolve teacher names from SubjectGradeEntry.teacherId if not in teachingAssignments
    const entryTeacherIds = Array.from(
      new Set(classGradeEntries.map((ge: any) => ge.teacherId).filter(Boolean))
    ) as string[]
    if (entryTeacherIds.length > 0) {
      const entryTeachers = await prisma.teacher
        .findMany({
          where: { id: { in: entryTeacherIds } },
          select: { id: true, teacherName: true },
        })
        .catch(() => [])
      const entryTeacherById = new Map(entryTeachers.map((t) => [t.id, t.teacherName]))
      classGradeEntries.forEach((ge: any) => {
        if (ge.subjectId && ge.teacherId && !subjectTeacherMap[ge.subjectId]) {
          const tName = entryTeacherById.get(ge.teacherId)
          if (tName) subjectTeacherMap[ge.subjectId] = tName
        }
      })
    }

    const subjectsMap = new Map<string, any>()
    const subjectConfigMap = new Map<string, any>()

    const effectiveClassGrade = rawGrade || targetClass.grade || targetClass.className || ""

    // Priority 1: Add subjects specifically configured in SubjectGradeConfig for this grade
    surveyConfigs.forEach(cfg => {
      if (cfg.subject && cfg.subjectId !== "ALL" && isGradeMatching(cfg.grade, effectiveClassGrade)) {
        subjectsMap.set(cfg.subject.id, cfg.subject)
        const existingCfg = subjectConfigMap.get(cfg.subject.id)
        // Prefer exact period match over "ALL"
        if (!existingCfg || (existingCfg.evaluationPeriod === "ALL" && cfg.evaluationPeriod !== "ALL")) {
          subjectConfigMap.set(cfg.subject.id, cfg)
        }
      }
    })

    // Priority 2: Also include any subject that already has actual grade entries in this period for this class
    classGradeEntries.forEach(ge => {
      if (ge.subject) {
        subjectsMap.set(ge.subject.id, ge.subject)
      }
    })

    // Priority 3: Include subjects assigned via TeachingAssignment for this class (especially useful for HK1/HK2/CN)
    teachingAssignments.forEach(ta => {
      if (ta.subject && !subjectsMap.has(ta.subject.id)) {
        subjectsMap.set(ta.subject.id, ta.subject)
      }
    })

    // Priority 4: Fallback to standard active MOET subjects for the level/grade if no subjects were found yet
    if (subjectsMap.size === 0) {
      const allActiveSubjects = await prisma.subject
        .findMany({
          where: { status: "ACTIVE" },
          orderBy: { subjectName: "asc" },
        })
        .catch(() => [])
      const primaryCodes =
        num >= 4
          ? ["TVI", "TOA", "SCI", "LSU", "TA", "TAV", "ICT", "TIN_HOC", "STE", "GTC", "ANA", "MTU", "HDTNHN", "GCD"]
          : ["TVI", "TOA", "TN-XH", "TA", "TAV", "ICT", "TIN_HOC", "GTC", "ANA", "MTU", "HDTNHN", "GCD"]
      allActiveSubjects.forEach((sub: any) => {
        const codeUpper = String(sub.subjectCode || "").toUpperCase()
        if (levelCode === "TIEU_HOC") {
          if (primaryCodes.includes(codeUpper) || String(sub.category || "").toUpperCase() === "MOET") {
            subjectsMap.set(sub.id, sub)
          }
        } else if (String(sub.category || "MOET").toUpperCase() === "MOET") {
          subjectsMap.set(sub.id, sub)
        }
      })
    }

    let subjectsList = Array.from(subjectsMap.values()).sort((a, b) => (a.orderIndex || 99) - (b.orderIndex || 99))
    if (
      !isHomeroomTeacher &&
      subjectScope?.isSubjectScoped &&
      (subjectScope.allowedSubjectIds.length > 0 || subjectScope.allowedSubjectCodes.length > 0)
    ) {
      const allowedIdSet = new Set(subjectScope.allowedSubjectIds)
      const allowedCodeSet = new Set(subjectScope.allowedSubjectCodes.map((c: string) => String(c || "").toUpperCase()))
      subjectsList = subjectsList.filter(
        (sub: any) =>
          allowedIdSet.has(sub.id) ||
          allowedCodeSet.has(String(sub.subjectCode || "").toUpperCase())
      )
    }

    const homeroomDefaultTeacherName = homeroomTeacher?.teacherName || teacher?.teacherName || "GVCN"

    const buildSubjectConfigMeta = (sub: any) => {
      const rawCfg = subjectConfigMap.get(sub.id)
      const subNameLower = String(sub.subjectName || "").toLowerCase()
      const subCodeUpper = String(sub.subjectCode || "").toUpperCase()
      const isCommentOnlySubj =
        String(sub.evaluationType || "").toUpperCase() === "REMARK" ||
        ["GTC", "ANA", "AM_NHAC", "MTU", "MY_THUAT", "HDTNHN", "HDTN", "NDGDCDP", "GCD"].includes(subCodeUpper) ||
        subNameLower.includes("thể chất") ||
        subNameLower.includes("âm nhạc") ||
        subNameLower.includes("mĩ thuật") ||
        subNameLower.includes("mỹ thuật") ||
        subNameLower.includes("trải nghiệm") ||
        subNameLower.includes("địa phương") ||
        (levelCode === "TIEU_HOC" && (subNameLower.includes("đạo đức") || subNameLower.includes("tự nhiên và xã hội")))

      let colNames: string[] = []
      let colTypes: string[] = []
      let colMaxScores: number[] = []
      let columnsDef: any[] = []

      if (rawCfg) {
        try {
          colNames = typeof rawCfg.columnNames === "string" ? JSON.parse(rawCfg.columnNames) : rawCfg.columnNames || []
        } catch {}
        try {
          colTypes = typeof rawCfg.columnTypes === "string" ? JSON.parse(rawCfg.columnTypes) : rawCfg.columnTypes || []
        } catch {}
        try {
          colMaxScores =
            typeof rawCfg.columnMaxScores === "string" ? JSON.parse(rawCfg.columnMaxScores) : rawCfg.columnMaxScores || []
        } catch {}
        try {
          columnsDef =
            typeof rawCfg.columnsJson === "string" ? JSON.parse(rawCfg.columnsJson) : rawCfg.columnsJson || []
        } catch {}
      }

      const configType = rawCfg?.configType || "VNEDU"
      const hasCompositeColumn = rawCfg ? rawCfg.hasCompositeColumn !== false : !isCommentOnlySubj
      const compositeColumnName =
        rawCfg?.compositeColumnName ||
        (levelCode === "TIEU_HOC" ? "Điểm KTĐK" : rawPeriod === "KSĐN" ? "Điểm KS" : "ĐTBmhk")
      const hasRatingColumn = rawCfg
        ? Boolean(rawCfg.hasRatingColumn) || levelCode === "TIEU_HOC" || isCommentOnlySubj
        : levelCode === "TIEU_HOC" || isCommentOnlySubj
      const ratingColumnName =
        rawCfg?.ratingColumnName || (levelCode === "TIEU_HOC" ? "Mức đạt (T/H/C)" : "Mức đạt (Đ/CĐ)")
      const hasRemarkColumn = rawCfg ? rawCfg.hasRemarkColumn !== false : true

      let evaluationMode: "SCORE_AND_RATING" | "SCORE" | "RATING_ONLY" = "SCORE"
      let evaluationModeLabel = "Đánh giá bằng điểm số & nhận xét"
      if (isCommentOnlySubj && (!rawCfg || !rawCfg.hasCompositeColumn)) {
        evaluationMode = "RATING_ONLY"
        evaluationModeLabel =
          levelCode === "TIEU_HOC" ? "Đánh giá bằng nhận xét (T / H / C)" : "Đánh giá bằng nhận xét (Đ / CĐ)"
      } else if (levelCode === "TIEU_HOC" || (hasCompositeColumn && hasRatingColumn)) {
        evaluationMode = "SCORE_AND_RATING"
        evaluationModeLabel =
          levelCode === "TIEU_HOC"
            ? "Mức đạt (T/H/C) & Điểm KTĐK (TT27)"
            : "Điểm số kết hợp Xếp loại & Nhận xét"
      } else if (configType === "INTERNAL") {
        evaluationModeLabel = `Đánh giá nội bộ Sky-Line (${colNames.length || 1} cột)`
      } else {
        evaluationModeLabel = "Điểm số & Nhận xét (TT22)"
      }

      // Resolve GVBM name for this subject
      let resolvedTeacher = subjectTeacherMap[sub.id] || ""
      if (!resolvedTeacher && levelCode === "TIEU_HOC") {
        const isPrimaryHomeroomSubj =
          ["TVI", "TOA", "SCI", "LSU", "TN-XH", "GCD", "HDTNHN"].includes(subCodeUpper) ||
          subNameLower.includes("tiếng việt") ||
          subNameLower.includes("toán") ||
          subNameLower.includes("khoa học") ||
          subNameLower.includes("lịch sử") ||
          subNameLower.includes("tự nhiên") ||
          subNameLower.includes("đạo đức") ||
          subNameLower.includes("trải nghiệm")
        if (isPrimaryHomeroomSubj) {
          resolvedTeacher = `${homeroomDefaultTeacherName} (GVCN)`
        }
      }

      return {
        configId: rawCfg?.id || null,
        configType,
        evaluationMode,
        evaluationModeLabel,
        columnNames: colNames,
        columnTypes: colTypes,
        columnMaxScores: colMaxScores,
        columnsDef,
        hasCompositeColumn,
        compositeColumnName,
        hasRatingColumn,
        ratingColumnName,
        hasRemarkColumn,
        teacherName: resolvedTeacher || "Chưa phân công",
      }
    }

    const subjectMetaMap = new Map<string, ReturnType<typeof buildSubjectConfigMeta>>()
    subjectsList.forEach(sub => {
      subjectMetaMap.set(sub.id, buildSubjectConfigMeta(sub))
    })

    const resolveBenchmark = (subId: string): number => {
      const defaultScore = levelCode === "TIEU_HOC" ? 7.0 : 6.0
      if (!benchmarkConfigs || benchmarkConfigs.length === 0) return defaultScore

      const matchPeriodSubGrade = benchmarkConfigs.find(b =>
        b.subjectId === subId &&
        isGradeMatching(b.grade, effectiveClassGrade) &&
        periodVariants.includes(b.evaluationPeriod)
      )
      if (matchPeriodSubGrade) return matchPeriodSubGrade.benchmarkScore

      const matchSubGrade = benchmarkConfigs.find(b =>
        b.subjectId === subId &&
        isGradeMatching(b.grade, effectiveClassGrade) &&
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

    const [inputAssessments, learningCommitments, consultationLogs, psychologicalTargets, termScores, termSummaries] = await Promise.all([
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
      }).catch(() => []),
      prisma.learningSupportTarget.findMany({
        where: {
          studentId: { in: studentIds },
          academicYearId: targetYearId,
          supportType: "PSYCHOLOGICAL"
        },
        include: {
          assignments: {
            include: {
              teacher: { select: { id: true, teacherName: true } }
            }
          },
          evaluations: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          createdBy: { select: { id: true, teacherName: true } }
        }
      }).catch(() => []),
      prisma.studentTermScore.findMany({
        where: {
          studentId: { in: studentIds },
          semester: mappedSemester
        },
        include: { subject: true }
      }).catch(() => []),
      prisma.studentTermSummary.findMany({
        where: {
          studentId: { in: studentIds },
          semester: mappedSemester
        }
      }).catch(() => [])
    ])

    const termScoreMap = new Map<string, any>()
    termScores.forEach((ts: any) => {
      termScoreMap.set(`${ts.studentId}_${ts.subjectId}`, ts)
    })

    const termSummaryMap = new Map<string, any>()
    termSummaries.forEach((tsum: any) => {
      termSummaryMap.set(tsum.studentId, tsum)
    })

    const psychologyMap = new Map<string, any>()
    psychologicalTargets.forEach((pt: any) => {
      const counselorNames = (pt.assignments || []).map((a: any) => a.teacher?.teacherName).filter(Boolean)
      const counselorDisplay = counselorNames.length > 0
        ? counselorNames.join(", ")
        : (pt.createdBy?.teacherName || "Chuyên viên tham vấn")

      psychologyMap.set(pt.studentId, {
        id: pt.id,
        reason: pt.reason || pt.notes || "Hỗ trợ Tâm lý học đường",
        counselorName: counselorDisplay,
        status: pt.status || "Đang theo dõi",
        terminationStatus: pt.terminationStatus || "ACTIVE",
        latestEvaluation: pt.evaluations?.[0] || null
      })
    })

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

        let isAcknowledged = false
        let acknowledgedAt: string | null = null
        let forwardedGvbm: any = null

        if (log.nextActions) {
          if (log.nextActions.includes("[ACKNOWLEDGED]")) {
            isAcknowledged = true
          }
          const forwardMatch = log.nextActions.match(/\[GVBM_FORWARD:(.*?)\]/)
          if (forwardMatch) {
            try {
              forwardedGvbm = JSON.parse(forwardMatch[1])
              isAcknowledged = true
            } catch (_) { }
          }
        }

        exchangeMap.set(log.studentId, {
          logId: log.id,
          teacherRemark,
          teacherRemarkDate: log.meetingDate || log.createdAt,
          parentFeedback,
          parentFeedbackDate: log.updatedAt || log.createdAt,
          isAcknowledged,
          acknowledgedAt,
          forwardedGvbm,
          notes: log.notes
        })
      }
    })

    // 12. Student Grade Matrix & Tracking List
    const studentMatrix = students.map(st => {
      const subjectGrades: Record<string, {
        score: number | null
        ratingValue: string | null
        componentScores: any
        formattedComponents: Array<{ key: string; label: string; value: string }>
        remark: string
        teacherName: string
        evaluationMode: string
        evaluationModeLabel: string
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
        const meta = subjectMetaMap.get(sub.id)
        const entry = classEntryMap[`${st.id}_${sub.id}`]
        const tScore = termScoreMap.get(`${st.id}_${sub.id}`)
        let score: number | null = null
        let ratingValue: string | null = null
        let compScores: any = {}
        let remark = ""

        if (entry) {
          remark = entry.remark || ""
          ratingValue = entry.ratingValue || null
          if (entry.componentScores) {
            try {
              compScores = typeof entry.componentScores === "string" ? JSON.parse(entry.componentScores) : entry.componentScores
            } catch (_) { }
          }
          if (!ratingValue && compScores && typeof compScores === "object") {
            ratingValue = compScores.xl || compScores.rating || compScores.mucDat || null
          }
          if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
            const num = Number(entry.compositeScore)
            if (!isNaN(num)) {
              score = num
            }
          }
        }

        // Supplement from StudentTermScore if score or ratingValue is missing (for HK1/HK2/CN/CK1/CK2)
        if (tScore) {
          if (score === null && tScore.score !== null && tScore.score !== undefined) {
            const num = Number(tScore.score)
            if (!isNaN(num)) score = num
          }
          if (!ratingValue && tScore.evaluationGrade) {
            ratingValue = tScore.evaluationGrade
          }
        }

        if (score !== null) {
          totalScoreSum += score
          scoreCount++
          if (score < 5.0) belowAverageCount++
          if (score < benchmark) belowBenchmarkCount++
        }

        // Build formatted component scores array based on subject's specific configuration
        const formattedComponents: Array<{ key: string; label: string; value: string }> = []
        if (compScores && typeof compScores === "object") {
          const colNames = meta?.columnNames || []
          const colsDef = meta?.columnsDef || []
          const usedKeys = new Set<string>()

          if (colsDef.length > 0) {
            colsDef.forEach((cDef: any, idx: number) => {
              const key = cDef.key || `col${idx}`
              const val = compScores[key] ?? compScores[`col${idx}`]
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                usedKeys.add(key)
                usedKeys.add(`col${idx}`)
                formattedComponents.push({
                  key,
                  label: cDef.label || colNames[idx] || key,
                  value: String(val),
                })
              }
            })
          } else if (colNames.length > 0) {
            colNames.forEach((cName: string, idx: number) => {
              const key = `col${idx}`
              const val = compScores[key]
              if (val !== undefined && val !== null && String(val).trim() !== "") {
                usedKeys.add(key)
                formattedComponents.push({
                  key,
                  label: cName,
                  value: String(val),
                })
              }
            })
          }

          // Also include standard VnEdu keys (tx1..tx4, gk, ck, kt) if present and not yet added
          const standardKeyLabels: Record<string, string> = {
            tx1: "ĐĐGtx 1",
            tx2: "ĐĐGtx 2",
            tx3: "ĐĐGtx 3",
            tx4: "ĐĐGtx 4",
            gk: "ĐĐGgk",
            ck: "ĐĐGck",
            kt: "Điểm KTĐK",
          }
          Object.entries(compScores).forEach(([k, v]) => {
            if (usedKeys.has(k) || k === "xl" || k === "rating" || k === "mucDat") return
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              formattedComponents.push({
                key: k,
                label: standardKeyLabels[k] || k,
                value: String(v),
              })
            }
          })
        }

        const isBelowAverage = score !== null && score < 5.0
        const isBelowBenchmark = score !== null && score < benchmark
        const gap = score !== null ? Math.round((score - benchmark) * 10) / 10 : null

        subjectGrades[sub.id] = {
          score,
          ratingValue,
          componentScores: compScores,
          formattedComponents,
          remark,
          teacherName: meta?.teacherName || subjectTeacherMap[sub.id] || "Chưa phân công",
          evaluationMode: meta?.evaluationMode || "SCORE",
          evaluationModeLabel: meta?.evaluationModeLabel || "Điểm số & Nhận xét",
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

      const rawSum = termSummaryMap.get(st.id)
      let parsedCompetencies: Record<string, string> = {}
      let parsedQualities: Record<string, string> = {}
      if (rawSum?.competencies) {
        try {
          parsedCompetencies = typeof rawSum.competencies === "string" ? JSON.parse(rawSum.competencies) : rawSum.competencies
        } catch {}
      }
      if (rawSum?.qualities) {
        try {
          parsedQualities = typeof rawSum.qualities === "string" ? JSON.parse(rawSum.qualities) : rawSum.qualities
        } catch {}
      }

      return {
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender,
        dateOfBirth: st.dateOfBirth,
        subjectGrades,
        gpa,
        avgScore: gpa,
        scoreCount,
        belowAverageCount,
        belowBenchmarkCount,
        isEntranceCommitted,
        inputAssessment: inputInfo || null,
        learningCommitments: commitments,
        isPsychologySupport: psychologyMap.has(st.id),
        psychologySupport: psychologyMap.get(st.id) || null,
        teacherRemark: exchangeMap.get(st.id)?.teacherRemark || rawSum?.notes || "",
        teacherRemarkDate: exchangeMap.get(st.id)?.teacherRemarkDate || null,
        parentFeedback: exchangeMap.get(st.id)?.parentFeedback || "",
        parentFeedbackDate: exchangeMap.get(st.id)?.parentFeedbackDate || null,
        isAcknowledged: Boolean(exchangeMap.get(st.id)?.isAcknowledged),
        acknowledgedAt: exchangeMap.get(st.id)?.acknowledgedAt || null,
        forwardedGvbm: exchangeMap.get(st.id)?.forwardedGvbm || null,
        gvbmResponse: exchangeMap.get(st.id)?.gvbmResponse || null,
        exchangeLogId: exchangeMap.get(st.id)?.logId || null,
        termSummary: rawSum
          ? {
              academicRating: rawSum.academicRating || "",
              conductRating: rawSum.conductRating || "",
              absencesPermitted: rawSum.absencesPermitted || 0,
              absencesUnpermitted: rawSum.absencesUnpermitted || 0,
              absencesTotal: (rawSum.absencesPermitted || 0) + (rawSum.absencesUnpermitted || 0),
              reward: rawSum.reward || "",
              notes: rawSum.notes || "",
              promoted: rawSum.promoted !== false,
              competencies: parsedCompetencies,
              qualities: parsedQualities,
            }
          : null,
        defaultTeacherRemark: `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả học tập của học sinh ${st.studentName}. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
      }
    })

    const trackingStudents = studentMatrix.filter(st =>
      st.belowAverageCount > 0 ||
      st.belowBenchmarkCount > 0 ||
      st.isEntranceCommitted ||
      st.learningCommitments.length > 0 ||
      st.isPsychologySupport
    )

    return NextResponse.json({
      success: true,
      classInfo: {
        id: targetClass.id,
        className: targetClass.className,
        grade: targetClass.grade,
        levelCode,
        campusName: targetClass.campus?.campusName || targetClass.campus?.name || "Cơ sở",
        campusCode: targetClass.campus?.campusCode || "",
        homeroomTeacherName: homeroomTeacher?.teacherName || teacher?.teacherName || "",
        homeroomTeacherCode: homeroomTeacher?.teacherCode || teacher?.teacherCode || "",
        totalStudents: students.length,
        academicYearName: targetClass.academicYear?.name || ""
      },
      homeroomSignatureProfile: homeroomSignatureProfile || null,
      evaluationPeriod: rawPeriod,
      scope,
      siblingClassesCount: siblingClasses.length,
      subjects: subjectsList.map(s => {
        const meta = subjectMetaMap.get(s.id)
        return {
          id: s.id,
          name: s.subjectName,
          subjectName: s.subjectName,
          code: s.subjectCode,
          subjectCode: s.subjectCode,
          category: s.category || "MOET",
          teacherName: meta?.teacherName || subjectTeacherMap[s.id] || "Chưa phân công",
          config: meta || null
        }
      }),
      subjectComparisons,
      studentMatrix,
      trackingStudents,
      teachingAssignments: teachingAssignments.map(ta => ({
        subjectId: ta.subjectId,
        subjectName: ta.subject?.subjectName || "",
        subjectCode: ta.subject?.subjectCode || "",
        teacherId: ta.teacherId,
        teacherName: ta.teacher?.teacherName || "",
        userId: ta.teacher?.userId || ""
      })),
      summary: {
        totalStudents: students.length,
        totalSubjects: subjectsList.length,
        trackingStudentsCount: trackingStudents.length,
        entranceCommittedCount: studentMatrix.filter(s => s.isEntranceCommitted).length,
        learningCommittedCount: studentMatrix.filter(s => s.learningCommitments.length > 0).length,
        psychologySupportCount: studentMatrix.filter(s => s.isPsychologySupport).length,
        parentFeedbackSummary: {
          totalFeedbackCount: studentMatrix.filter(s => Boolean(s.parentFeedback)).length,
          acknowledgedCount: studentMatrix.filter(s => Boolean(s.parentFeedback) && s.isAcknowledged).length,
          forwardedCount: studentMatrix.filter(s => Boolean(s.parentFeedback) && Boolean(s.forwardedGvbm)).length,
          respondedCount: studentMatrix.filter(s => Boolean(s.gvbmResponse)).length
        }
      }
    })

  } catch (error: any) {
    console.error("Lỗi lấy dữ liệu điểm lớp GVCN:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
