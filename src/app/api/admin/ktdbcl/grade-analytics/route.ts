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

    // Helper: Normalize strings for fuzzy matching without accents & whitespace
    const cleanString = (str: string | null | undefined): string => {
      if (!str) return ""
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
    }

    // Helper: Parse committed subjects from entrance assessment
    const parseCommittedSubjects = (entranceInfo: any, className?: string, gradeStr?: string): string[] => {
      if (!entranceInfo) return []
      const rawNote = entranceInfo.directorNote || ""
      // Clean out approval history lines so teacher names like "Trần Thị Thanh" don't trigger "Tiếng Anh"
      const cleanNote = rawNote.split(/---\s*LỊCH SỬ/i)[0].trim()
      const result = entranceInfo.admissionResult || ""
      const criteria = entranceInfo.admissionCriteria || ""

      const textToScan = `${cleanNote} ${result}`.trim()
      if (!textToScan) return []

      const isPrimary = (className && /^[1-5][._\s]|lớp\s*[1-5]/i.test(className)) ||
                        (gradeStr && /^(khối\s*)?[1-5]$/i.test(gradeStr))

      let rawSubs: string[] = []
      // 1. Match "Môn cam kết: [...]" or "Cam kết: [...]" or "Môn cam kết [...]"
      const match = textToScan.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại)\s*[:：]?\s*\[?([^\]\r\n]+)\]?/i)
      if (match && match[1]) {
        rawSubs = match[1].split(/[,;+&]/).map((s: string) => s.trim()).filter(Boolean)
      }

      // 2. If no explicit "Môn cam kết: [...]", scan cleanNote for subject keywords
      if (rawSubs.length === 0) {
        if (/(?:môn\s+)?toán|\bmaths?\b/i.test(cleanNote)) rawSubs.push("Toán")
        if (/tiếng việt|\btv\b|ngôn ngữ/i.test(cleanNote)) rawSubs.push(isPrimary ? "Tiếng Việt" : "Ngữ Văn")
        else if (/ngữ văn|\bvăn\b|\bliterature\b/i.test(cleanNote)) rawSubs.push(isPrimary ? "Tiếng Việt" : "Ngữ Văn")
        if (/(?:tiếng\s+)?anh|\benglish\b|\besl\b|\btav\b|\bept\b/i.test(cleanNote)) rawSubs.push("Tiếng Anh")
        if (/tâm lý|tâm lí|tập trung chú ý/i.test(cleanNote)) rawSubs.push("Tâm lý")
      }

      const finalSubs: string[] = []
      rawSubs.forEach((s) => {
        const clean = s.trim().replace(/^môn\s+/i, "")
        const lower = clean.toLowerCase()
        if (lower.includes("anh") || lower.includes("english") || lower.includes("esl") || lower === "ept" || lower.includes("tav")) {
          if (!finalSubs.includes("Tiếng Anh")) finalSubs.push("Tiếng Anh")
        } else if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
          if (!finalSubs.includes("Toán")) finalSubs.push("Toán")
        } else if (lower.includes("tiếng việt") || lower.includes("tieng viet") || lower === "tv") {
          const subName = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
          if (!finalSubs.includes(subName)) finalSubs.push(subName)
        } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn" || lower.includes("văn")) {
          const subName = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
          if (!finalSubs.includes(subName)) finalSubs.push(subName)
        } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology") || lower.includes("tập trung")) {
          if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý")
        } else if (clean) {
          if (!finalSubs.includes(clean)) finalSubs.push(clean)
        }
      })

      // Secondary check: Additional subjects mentioned in cleanNote text
      if (/(?:cam kết|theo dõi|cải thiện|hỗ trợ)\s+(?:thêm\s+)?(?:tiếng\s+)?anh/i.test(cleanNote) && !finalSubs.includes("Tiếng Anh")) {
        finalSubs.push("Tiếng Anh")
      }
      if (/(?:cam kết|theo dõi|hỗ trợ)\s+(?:thêm\s+)?(?:tiếng việt|ngữ văn|văn)/i.test(cleanNote)) {
        const subName = isPrimary ? "Tiếng Việt" : "Ngữ Văn"
        if (!finalSubs.includes(subName)) finalSubs.push(subName)
      }
      if (/(?:cam kết|theo dõi|hỗ trợ)\s+(?:thêm\s+)?toán/i.test(cleanNote) && !finalSubs.includes("Toán")) {
        finalSubs.push("Toán")
      }
      if (/(?:cam kết|theo dõi|tư vấn|yc cam kết)\s+(?:tâm lý|tâm lí|mức độ tập trung|khả năng tập trung)/i.test(cleanNote) && !finalSubs.includes("Tâm lý")) {
        finalSubs.push("Tâm lý")
      }

      return finalSubs
    }

    // Helper: Check if a school survey subject matches committed subjects
    const isSubjectMatchingCommitment = (committedSubs: string[], sub: { id: string; name: string; code: string }): boolean => {
      if (!committedSubs || committedSubs.length === 0) return false
      const subName = (sub.name || "").toLowerCase().trim()
      const subCode = (sub.code || "").toLowerCase().trim()

      return committedSubs.some(raw => {
        const cleanRaw = raw.toLowerCase().trim()
        // 1. Tiếng Anh / English / Tiếng Anh (viết) / Tiếng Anh (vấn đáp) / ESL / EPT
        if (
          cleanRaw.includes("anh") ||
          cleanRaw.includes("english") ||
          cleanRaw.includes("esl") ||
          cleanRaw.includes("tav") ||
          cleanRaw === "ept"
        ) {
          return (
            subName.includes("tiếng anh") ||
            subName.includes("tổng điểm tiếng anh") ||
            subName.includes("anh") ||
            subName.includes("english") ||
            subName.includes("esl") ||
            subCode === "ta" ||
            subCode === "tav" ||
            subCode === "esl"
          )
        }

        // 2. Toán / Math / Maths
        if (cleanRaw.includes("toán") || cleanRaw.includes("toan") || cleanRaw.includes("math")) {
          return subName.includes("toán") || subCode === "toa" || subCode === "mat"
        }

        // 3. Tiếng Việt & Ngữ Văn (tương hỗ cho nhau giữa Cấp 1 và Cấp 2/3)
        if (cleanRaw.includes("tiếng việt") || cleanRaw.includes("tieng viet") || cleanRaw === "tv") {
          return subName.includes("tiếng việt") || subName.includes("ngữ văn") || subName.includes("văn") || subCode === "tvi" || subCode === "nva"
        }
        if (cleanRaw.includes("ngữ văn") || cleanRaw.includes("ngu van") || cleanRaw === "văn" || cleanRaw.includes("literature")) {
          return subName.includes("ngữ văn") || subName.includes("tiếng việt") || subName.includes("văn") || subCode === "nva" || subCode === "tvi"
        }

        // 4. Tâm lý
        if (cleanRaw.includes("tâm lý") || cleanRaw.includes("tam ly") || cleanRaw.includes("psychology")) {
          return subName.includes("tâm lý") || subCode === "tly"
        }

        return subName.includes(cleanRaw) || cleanRaw.includes(subName)
      })
    }

    // 3. Fetch ENTRANCE ASSESSMENT RECORDS (All committed/monitored students matching Support & Psychology tag)
    const entranceCodeMap = new Map<string, any>()
    const entranceNameMap = new Map<string, any>()
    const rawAllCommittedCandidates: any[] = []
    let allClasses: any[] = []
    let systemStudents: any[] = []
    const p = prisma as any

    try {
      // Query all active classes for this academic year to strictly resolve class & grade
      allClasses = await prisma.class.findMany({
        where: { academicYearId, status: "ACTIVE" },
        include: { campus: true }
      })

      // Find all input assessment periods of the current academic year if configured
      const periods = p.inputAssessmentPeriod?.findMany
        ? await p.inputAssessmentPeriod.findMany({
            where: academicYearId ? { academicYearId } : {},
            select: { id: true }
          })
        : []
      const periodIds = periods.map((item: any) => item.id)

      const preschoolPeriods = p.preschoolInputAssessmentPeriod?.findMany
        ? await p.preschoolInputAssessmentPeriod.findMany({
            where: academicYearId ? { academicYearId } : {},
            select: { id: true }
          })
        : []
      const preschoolPeriodIds = preschoolPeriods.map((item: any) => item.id)

      const inputCommitmentConditions = [
        { admissionResult: { contains: "cam kết" } },
        { admissionResult: { contains: "Cam kết" } },
        { admissionResult: { contains: "theo dõi" } },
        { admissionResult: { contains: "Theo dõi" } },
        { directorNote: { contains: "Môn cam kết" } },
        { directorNote: { contains: "Mon cam ket" } },
        { directorNote: { contains: "cam kết" } },
        { directorNote: { contains: "Cam kết" } },
        { directorNote: { contains: "theo dõi" } },
        { directorNote: { contains: "Theo dõi" } },
        { targetType: { contains: "cam kết" } },
        { targetType: { contains: "theo dõi" } },
        { admissionCriteria: { contains: "cam kết" } },
        { admissionCriteria: { contains: "theo dõi" } }
      ]

      const preschoolCommitmentConditions = [
        { admissionResult: { contains: "cam kết" } },
        { admissionResult: { contains: "Cam kết" } },
        { admissionResult: { contains: "theo dõi" } },
        { admissionResult: { contains: "Theo dõi" } },
        { directorNote: { contains: "Môn cam kết" } },
        { directorNote: { contains: "Mon cam ket" } },
        { directorNote: { contains: "cam kết" } },
        { directorNote: { contains: "Cam kết" } },
        { directorNote: { contains: "theo dõi" } },
        { directorNote: { contains: "Theo dõi" } },
        { admissionCriteria: { contains: "cam kết" } },
        { admissionCriteria: { contains: "theo dõi" } }
      ]

      // Query all admission candidates for the academic year to calculate enrolled counts and rates
      let allNewAdmissionStudents: any[] = []
      try {
        if (p.inputAssessmentStudent?.findMany) {
          const admWhere: any = periodIds.length > 0 ? { periodId: { in: periodIds } } : {}
          allNewAdmissionStudents = await p.inputAssessmentStudent.findMany({
            where: admWhere,
            select: {
              id: true,
              studentCode: true,
              enrollmentCode: true,
              fullName: true,
              className: true,
              enrollmentClassId: true,
              grade: true,
              targetType: true,
              admissionResult: true,
              admissionCriteria: true,
              directorNote: true,
              registeredCampus: true,
              admissionCampus: true,
              enrollmentClass: {
                select: {
                  id: true,
                  className: true,
                  grade: true,
                  level: true,
                  campusId: true,
                  campus: true
                }
              }
            }
          })
        }
      } catch (errAdm) {
        console.warn("Lỗi khi đọc allNewAdmissionStudents:", errAdm)
      }

      // Thống kê Tuyển mới đã nhập học (Toàn trường K1-12 và Tách riêng Khối 1)
      let totalNewEnrolled = 0
      let totalCommittedInEnrolled = 0
      let grade1NewEnrolled = 0
      let grade1CommittedInEnrolled = 0
      let otherGradesNewEnrolled = 0
      let otherGradesCommittedInEnrolled = 0

      // Thống kê theo bộ lọc hiện tại (Campus, Level, Grade, Class)
      let filteredNewEnrolled = 0
      let filteredCommittedCount = 0
      let filteredGrade1NewEnrolled = 0
      let filteredGrade1CommittedCount = 0
      let filteredOtherGradesNewEnrolled = 0
      let filteredOtherGradesCommittedCount = 0

      const byGradeStats: Record<number, { newEnrolled: number; committedCount: number; commitmentRate: number }> = {}
      for (let g = 1; g <= 12; g++) {
        byGradeStats[g] = { newEnrolled: 0, committedCount: 0, commitmentRate: 0 }
      }

      allNewAdmissionStudents.forEach((st: any) => {
        let cls = st.enrollmentClass || null
        if (!cls && st.enrollmentClassId) {
          cls = allClasses.find((c: any) => c.id === st.enrollmentClassId || c.classCode === st.enrollmentClassId) || null
        }
        if (!cls && st.className) {
          const cleanStClassName = st.className.trim().toLowerCase()
          if (cleanStClassName && cleanStClassName !== "chưa xếp lớp" && !cleanStClassName.includes("chưa xếp")) {
            cls = allClasses.find((c: any) => c.className?.toLowerCase() === cleanStClassName || c.classCode?.toLowerCase() === cleanStClassName) || null
          }
        }

        if (!cls) return
        const cName = (cls.className || st.className || "").trim().toLowerCase()
        if (!cName || cName === "chưa xếp lớp" || cName.includes("chưa xếp")) return

        const gradeStr = String(cls.grade || cls.className || st.grade || st.className || "").trim()
        const gradeNum = parseInt(gradeStr.match(/\d+/)?.[0] || "0", 10)
        if (gradeNum < 1 || gradeNum > 12) return // CHỈ LẤY KHỐI 1 ĐẾN 12

        const hasCommitment = Boolean(
          (st.admissionCriteria && /cam kết/i.test(st.admissionCriteria)) ||
          (st.admissionResult && /cam kết/i.test(st.admissionResult)) ||
          (st.targetType && /cam kết/i.test(st.targetType)) ||
          (st.directorNote && /cam kết/i.test(st.directorNote)) ||
          (st.directorNote && /môn cam kết/i.test(st.directorNote)) ||
          (st.admissionResult && /theo dõi/i.test(st.admissionResult)) ||
          (st.directorNote && /theo dõi/i.test(st.directorNote)) ||
          (st.targetType && /theo dõi/i.test(st.targetType))
        )

        // Tổng thể K1-12
        totalNewEnrolled++
        if (hasCommitment) totalCommittedInEnrolled++

        if (gradeNum === 1) {
          grade1NewEnrolled++
          if (hasCommitment) grade1CommittedInEnrolled++
        } else {
          otherGradesNewEnrolled++
          if (hasCommitment) otherGradesCommittedInEnrolled++
        }

        if (byGradeStats[gradeNum]) {
          byGradeStats[gradeNum].newEnrolled++
          if (hasCommitment) byGradeStats[gradeNum].committedCount++
        }

        // Kiểm tra bộ lọc hiện tại
        let matchesFilter = true
        if (campusId && campusId !== "ALL") {
          const matchCampus = cls.campusId === campusId || cls.campus?.id === campusId || cls.campus?.campusCode === campusId ||
            (cls.campus?.campusName && cls.campus.campusName.toLowerCase().includes(campusId.toLowerCase()))
          if (!matchCampus) matchesFilter = false
        }
        if (matchesFilter && levelFilter !== "ALL") {
          const cLevel = (cls.level || "").toLowerCase()
          if (levelFilter === "TieuHoc" && !(cLevel.includes("tiểu học") || (gradeNum >= 1 && gradeNum <= 5))) matchesFilter = false
          else if (levelFilter === "THCS" && !(cLevel.includes("thcs") || (gradeNum >= 6 && gradeNum <= 9))) matchesFilter = false
          else if (levelFilter === "THPT" && !(cLevel.includes("thpt") || (gradeNum >= 10 && gradeNum <= 12))) matchesFilter = false
          else if (levelFilter === "MamNon") matchesFilter = false
        }
        if (matchesFilter && gradeFilter !== "ALL") {
          const targetNum = gradeFilter.replace(/\D/g, "")
          if (targetNum && String(gradeNum) !== targetNum) matchesFilter = false
        }
        if (matchesFilter && classId && classId !== "ALL") {
          if (cls.id !== classId) matchesFilter = false
        }

        if (matchesFilter) {
          filteredNewEnrolled++
          if (hasCommitment) filteredCommittedCount++
          if (gradeNum === 1) {
            filteredGrade1NewEnrolled++
            if (hasCommitment) filteredGrade1CommittedCount++
          } else {
            filteredOtherGradesNewEnrolled++
            if (hasCommitment) filteredOtherGradesCommittedCount++
          }
        }
      })

      // Tính tỷ lệ % cho từng khối
      for (let g = 1; g <= 12; g++) {
        const item = byGradeStats[g]
        item.commitmentRate = item.newEnrolled > 0 ? Math.round((item.committedCount / item.newEnrolled) * 1000) / 10 : 0
      }

      let inputStudents: any[] = []
      try {
        if (p.inputAssessmentStudent?.findMany) {
          const includeOpts = {
            enrollmentClass: {
              include: { campus: true }
            },
            scores: {
              include: {
                subject: true
              }
            }
          }

          if (periodIds.length > 0) {
            inputStudents = await p.inputAssessmentStudent.findMany({
              where: {
                periodId: { in: periodIds },
                OR: inputCommitmentConditions
              },
              include: includeOpts
            })
          }
          if (inputStudents.length === 0) {
            inputStudents = await p.inputAssessmentStudent.findMany({
              where: {
                OR: inputCommitmentConditions
              },
              include: includeOpts
            })
          }
        }
      } catch (errInput) {
        console.warn("Lỗi khi đọc inputAssessmentStudent:", errInput)
      }

      let preschoolStudents: any[] = []
      try {
        if (p.preschoolInputAssessmentStudent?.findMany) {
          if (preschoolPeriodIds.length > 0) {
            preschoolStudents = await p.preschoolInputAssessmentStudent.findMany({
              where: {
                periodId: { in: preschoolPeriodIds },
                OR: preschoolCommitmentConditions
              },
              include: {
                enrollmentClass: {
                  include: { campus: true }
                }
              }
            })
          }
          if (preschoolStudents.length === 0) {
            preschoolStudents = await p.preschoolInputAssessmentStudent.findMany({
              where: {
                OR: preschoolCommitmentConditions
              },
              include: {
                enrollmentClass: {
                  include: { campus: true }
                }
              }
            })
          }
        }
      } catch (errPre) {
        console.warn("Lỗi khi đọc preschoolInputAssessmentStudent:", errPre)
      }

      const allStudentCodes = [
        ...inputStudents.map((s: any) => s.studentCode),
        ...inputStudents.map((s: any) => s.enrollmentCode),
        ...preschoolStudents.map((s: any) => s.studentCode),
        ...preschoolStudents.map((s: any) => s.enrollmentCode)
      ].filter(Boolean)

      const allFullNames = [
        ...inputStudents.map((s: any) => s.fullName),
        ...preschoolStudents.map((s: any) => s.fullName)
      ].filter(Boolean)

      try {
        systemStudents = await prisma.student.findMany({
          where: {
            OR: [
              { studentCode: { in: allStudentCodes } },
              { studentName: { in: allFullNames } }
            ],
            academicYearId
          },
          include: {
            class: {
              include: {
                campus: true
              }
            },
            campus: true
          }
        })
      } catch (errSys) {
        console.warn("Lỗi khi đọc systemStudents:", errSys)
      }

      const allEntranceRecords = [...inputStudents, ...preschoolStudents]

      allEntranceRecords.forEach((r: any) => {
        let mathScore = r.mathScore
        let literatureScore = r.literatureScore
        let writtenEnglishScore = r.writtenEnglishScore
        let oralEnglishScore = r.oralEnglishScore
        let psychologyScore = r.psychologyScore
        let vietScore: any = null
        let vanScore: any = null
        let eptScore: any = null

        if (r.scores && r.scores.length > 0) {
          r.scores.forEach((sc: any) => {
            const sName = (sc.subject?.name || sc.subjectName || "").toLowerCase()
            const sCode = (sc.subject?.code || "").toLowerCase()
            let val: any = null
            try {
              if (sc.scores) {
                const parsed = JSON.parse(sc.scores)
                const vArr = Array.isArray(parsed) ? parsed : [parsed]
                val = vArr.find((x: any) => x !== undefined && x !== "" && x !== null)
              }
            } catch {
              val = sc.scores
            }
            if (val !== null && val !== undefined && val !== "") {
              const numVal = parseFloat(val)
              const finalVal = isNaN(numVal) ? val : numVal
              if (sName.includes("toán") || sCode.includes("math") || sCode === "toa") {
                if (mathScore == null) mathScore = finalVal
              } else if (sName.includes("tiếng việt") || sCode === "tvi") {
                if (vietScore == null) vietScore = finalVal
              } else if (sName.includes("ngữ văn") || sCode === "nva" || (sName.includes("văn") && !sName.includes("tiếng việt"))) {
                if (vanScore == null) vanScore = finalVal
              } else if (sName.includes("ept") || sCode === "ept") {
                if (eptScore == null) eptScore = finalVal
              } else if (sName.includes("viết") || sCode === "tav") {
                if (writtenEnglishScore == null) writtenEnglishScore = finalVal
              } else if (sName.includes("vấn đáp") || sName.includes("nói") || sCode === "tavd") {
                if (oralEnglishScore == null) oralEnglishScore = finalVal
              } else if (sName.includes("tâm lý") || sCode === "tly") {
                if (psychologyScore == null) psychologyScore = finalVal
              }
            }
          })
        }

        if (literatureScore == null) {
          literatureScore = vietScore ?? vanScore ?? null
        }

        const isGrade1 = (() => {
          const gStr = String(r.grade || r.className || r.enrollmentClass?.className || r.enrollmentClass?.name || "").toLowerCase()
          const m = gStr.match(/\d+/)
          return m ? parseInt(m[0], 10) === 1 : false
        })()

        const wNum = (!isGrade1 && writtenEnglishScore != null) ? parseFloat(writtenEnglishScore) : NaN
        const oNum = (oralEnglishScore != null) ? parseFloat(oralEnglishScore) : NaN
        const eNum = (eptScore != null) ? parseFloat(eptScore) : NaN

        let totalEnglishScore: any = null
        let totalEnglishScale10: any = null

        if (isGrade1) {
          // Khối 1: Điểm Tiếng Anh vấn đáp là thang 30, không có Viết
          if (!isNaN(oNum)) {
            totalEnglishScale10 = Math.round((oNum / 30) * 10 * 10) / 10
            totalEnglishScore = Math.round((oNum / 30) * 100 * 10) / 10
          }
        } else {
          if (!isNaN(eNum) && eNum > 0) {
            totalEnglishScore = eNum
          } else if (!isNaN(wNum) && !isNaN(oNum)) {
            totalEnglishScore = Math.round((wNum + oNum) * 10) / 10
          } else if (!isNaN(wNum)) {
            totalEnglishScore = wNum
          } else if (!isNaN(oNum)) {
            totalEnglishScore = oNum
          }

          if (totalEnglishScore !== null) {
            if (totalEnglishScore > 10) {
              totalEnglishScale10 = Math.round((totalEnglishScore / 10) * 10) / 10
            } else {
              totalEnglishScale10 = totalEnglishScore
              totalEnglishScore = Math.round(totalEnglishScore * 10)
            }
          }
        }

        const entry = {
          ...r,
          isGrade1,
          mathScore,
          vietScore,
          vanScore,
          literatureScore,
          writtenEnglishScore,
          oralEnglishScore,
          eptScore,
          totalEnglishScore,
          totalEnglishScale10,
          psychologyScore
        }

        rawAllCommittedCandidates.push(entry)

        if (r.studentCode) {
          entranceCodeMap.set(r.studentCode.trim().toUpperCase(), entry)
        }
        if (r.enrollmentCode) {
          entranceCodeMap.set(r.enrollmentCode.trim().toUpperCase(), entry)
        }
        if (r.fullName) {
          const normName = cleanString(r.fullName)
          if (normName) {
            entranceNameMap.set(normName, entry)
          }
        }
      })
    } catch (e) {
      console.warn("Lỗi khi đọc dữ liệu khảo sát đầu vào:", e)
    }

    // Helper: Lookup entrance assessment record by code or full name
    const findEntranceInfo = (code: string | null | undefined, name: string | null | undefined): any => {
      if (code) {
        const clean = code.trim().toUpperCase()
        if (entranceCodeMap.has(clean)) return entranceCodeMap.get(clean)
      }
      if (name) {
        const norm = cleanString(name)
        if (entranceNameMap.has(norm)) return entranceNameMap.get(norm)
      }
      return null
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

      const entranceInfo = findEntranceInfo(st.studentCode, st.studentName)
      const learningCommitment = learningCommitmentMap.get(st.id) || null

      const hasEntranceCommitment = Boolean(
        entranceInfo && (
          (entranceInfo.admissionCriteria && entranceInfo.admissionCriteria.toLowerCase().includes("cam kết")) ||
          (entranceInfo.admissionResult && entranceInfo.admissionResult.toLowerCase().includes("cam kết")) ||
          (entranceInfo.targetType && entranceInfo.targetType.toLowerCase().includes("cam kết")) ||
          (entranceInfo.directorNote && entranceInfo.directorNote.toLowerCase().includes("cam kết"))
        )
      )

      const committedSubs = hasEntranceCommitment ? parseCommittedSubjects(entranceInfo, cls.className, cls.grade) : []

      // Check each relevant subject
      availableSubjectList.forEach(sub => {
        if (subjectId && subjectId !== "ALL" && sub.id !== subjectId) return

        const currentEntry = studentSubjectPeriodMap.get(st.id)?.get(sub.id)?.get(currentPeriod)
        const baselineEntry = studentSubjectPeriodMap.get(st.id)?.get(sub.id)?.get(baselinePeriod)

        const currentScore = currentEntry?.compositeScore !== null && currentEntry?.compositeScore !== undefined ? Number(currentEntry.compositeScore) : null
        const baselineScore = baselineEntry?.compositeScore !== null && baselineEntry?.compositeScore !== undefined ? Number(baselineEntry.compositeScore) : null

        const benchmark = resolveBenchmark(cls.level, cls.grade, sub.id, currentPeriod)

        const hasCurrentGrade = currentScore !== null && !isNaN(currentScore)
        const isBelowAverage = hasCurrentGrade && currentScore < 5.0
        const isBelowBenchmark = hasCurrentGrade && currentScore < benchmark
        const isAtRiskBaseline = baselineScore !== null && baselineScore < 6.5

        const isMatchingCommitment = hasEntranceCommitment && isSubjectMatchingCommitment(committedSubs, sub)

        // Chỉ đánh dấu hasAdmissionCommitment nếu học sinh có cam kết đầu vào, map đúng môn cam kết và CÓ kết quả khảo sát/định kỳ
        const hasAdmissionCommitment = Boolean(isMatchingCommitment && hasCurrentGrade)

        const hasActiveLearningCommitment = Boolean(learningCommitment && hasCurrentGrade)

        // Include student in tracking list if any flag applies
        if (isBelowAverage || isBelowBenchmark || hasAdmissionCommitment || hasActiveLearningCommitment || isAtRiskBaseline) {
          const delta = currentScore !== null && baselineScore !== null ? Math.round((currentScore - baselineScore) * 10) / 10 : null
          const benchmarkGap = currentScore !== null ? Math.round((currentScore - benchmark) * 10) / 10 : null

          const ta = taMap.get(`${cls.id}_${sub.id}`)
          const homeroom = cls.homeroomTeacherId ? homeroomMap.get(cls.homeroomTeacherId) : null
          const teacherName = ta?.teacher?.teacherName || homeroom?.teacherName || "Chưa phân công"

          // Riêng Tiếng Anh: hiển thị "Tổng điểm Tiếng Anh"
          const isEnglish = (sub.code || "").toUpperCase() === "TA" ||
            (sub.code || "").toUpperCase() === "TAV" ||
            (sub.name || "").toLowerCase().trim() === "tiếng anh"
          const displaySubjectName = isEnglish ? "Tổng điểm Tiếng Anh" : sub.name

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
            subjectName: displaySubjectName,
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

    // 7.1 BUILD KSĐV COMPARISON MATRIX (Đối sánh Ma trận KSĐV theo Lớp, Học sinh & Môn cam kết)
    // Đồng bộ hoàn toàn với danh sách diện Cam kết / Theo dõi ở tag Hỗ trợ học tập & Tâm lý
    const ksdvMatrixStudents: any[] = []
    const processedStudentKeys = new Set<string>()
    let ksdvMathCommittedTotal = 0
    let ksdvLitCommittedTotal = 0
    let ksdvEngCommittedTotal = 0
    let ksdvPsychologyCommittedTotal = 0
    let ksdvImprovedCount = 0

    // Helper to find subject in availableSubjectList
    const findSubject = (keywords: string[], codes: string[]) => {
      return availableSubjectList.find(s => {
        const sName = (s.name || "").toLowerCase()
        const sCode = (s.code || "").toUpperCase()
        return codes.includes(sCode) || keywords.some(kw => sName.includes(kw))
      })
    }

    // Helper to process and add student into ksdvMatrixStudents
    const processCandidateForMatrix = (cand: any, matchingSt: any, cls: any) => {
      if (!cls) return
      const cName = (cls.className || "").trim().toLowerCase()
      if (!cName || cName === "chưa xếp lớp" || cName.includes("chưa xếp") || cName === "null") {
        return
      }

      // CHỈ LẤY HỌC SINH TỪ KHỐI 1 ĐẾN KHỐI 12 (LOẠI BỎ MẦM NON, PRE, NHÀ TRẺ)
      const gradeStr = String(cls.grade || cls.className || cand.grade || "").trim()
      const gradeNum = parseInt(gradeStr.match(/\d+/)?.[0] || "0", 10)
      if (gradeNum < 1 || gradeNum > 12) {
        return
      }

      // Check campus filter
      if (campusId && campusId !== "ALL") {
        const isMatch = cls.campusId === campusId ||
          cls.campus?.id === campusId ||
          cls.campus?.campusCode === campusId ||
          (cls.campus?.campusCode && cls.campus.campusCode.toLowerCase() === campusId.toLowerCase()) ||
          (cls.campus?.campusName && cls.campus.campusName.toLowerCase().includes(campusId.toLowerCase())) ||
          (cls.className && cls.className.toLowerCase().includes(campusId.toLowerCase()))
        if (!isMatch) return
      }

      // Check level filter
      if (levelFilter !== "ALL") {
        const cLevel = (cls.level || "").toLowerCase()
        const cGrade = (cls.grade || "").toLowerCase()
        if (levelFilter === "TieuHoc") {
          const isMatch = cLevel.includes("tiểu học") || cLevel.includes("tieu hoc") ||
            ["1", "2", "3", "4", "5"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return
        } else if (levelFilter === "THCS") {
          const isMatch = cLevel.includes("thcs") ||
            ["6", "7", "8", "9"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return
        } else if (levelFilter === "THPT") {
          const isMatch = cLevel.includes("thpt") ||
            ["10", "11", "12"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return
        } else if (levelFilter === "MamNon") {
          const isMatch = cLevel.includes("mầm non") || cLevel.includes("mam non") || cLevel.includes("nhà trẻ")
          if (!isMatch) return
        }
      }

      // Check grade filter
      if (gradeFilter !== "ALL") {
        const targetNum = gradeFilter.replace(/\D/g, "")
        const cGrade = (cls.grade || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""
        const isMatch = cGrade === gradeFilter || (targetNum && (cGradeNum === targetNum || cNameNum === targetNum))
        if (!isMatch) return
      }

      // Check classId filter
      if (classId && classId !== "ALL" && cls.id !== classId) {
        return
      }

      const stKey = matchingSt?.id || cand.studentCode || cand.enrollmentCode || cleanString(cand.fullName)
      if (processedStudentKeys.has(stKey)) return
      processedStudentKeys.add(stKey)

      const committedSubs = parseCommittedSubjects(cand, cls.className, cls.grade)
      const homeroom = cls.homeroomTeacherId ? homeroomMap.get(cls.homeroomTeacherId) : null
      const homeroomTeacherName = homeroom?.teacherName || "Chưa phân công"

      const isPrimary = (cls.level || "").toLowerCase().includes("tiểu học") || (cls.level || "").toLowerCase().includes("tieu hoc") || ["1", "2", "3", "4", "5"].some(g => (cls.grade || "").includes(g))

      // Helper to find student score across multiple candidate subject codes
      const findStudentScoreForSubjectCodes = (studentId: string, codes: string[], names: string[]) => {
        if (!studentId || !studentSubjectPeriodMap.has(studentId)) return null
        const stPeriodMap = studentSubjectPeriodMap.get(studentId)!
        for (const [sId, pMap] of stPeriodMap.entries()) {
          const sObj = subjectMap.get(sId)
          if (sObj) {
            const code = (sObj.code || "").toUpperCase()
            const name = (sObj.name || "").toLowerCase()
            if (codes.includes(code) || names.some(n => name.includes(n))) {
              const entry = pMap.get(currentPeriod)
              if (entry && entry.compositeScore !== null && entry.compositeScore !== undefined) {
                return { score: Number(entry.compositeScore), subject: sObj }
              }
            }
          }
        }
        return null
      }

      // 1. Môn Toán
      const mathResolved = matchingSt ? findStudentScoreForSubjectCodes(matchingSt.id, ["TOA", "MAT"], ["toán", "math"]) : null
      const mathSub = mathResolved?.subject || findSubject(["toán", "math"], ["TOA", "MAT"])
      const isMathCommitted = isSubjectMatchingCommitment(committedSubs, { id: "", name: "Toán", code: "TOA" })
      if (isMathCommitted) ksdvMathCommittedTotal++

      const mathCurrentScore = mathResolved?.score ?? ((matchingSt && mathSub) ? (studentSubjectPeriodMap.get(matchingSt.id)?.get(mathSub.id)?.get(currentPeriod)?.compositeScore ? Number(studentSubjectPeriodMap.get(matchingSt.id)!.get(mathSub.id)!.get(currentPeriod)!.compositeScore) : null) : null)
      const mathEntranceScore = cand.mathScore !== null && cand.mathScore !== undefined ? Number(cand.mathScore) : null
      const mathDelta = (mathCurrentScore !== null && mathEntranceScore !== null) ? Math.round((mathCurrentScore - mathEntranceScore) * 10) / 10 : null
      const mathTa = mathSub ? taMap.get(`${cls.id}_${mathSub.id}`) : null
      const mathTeacher = mathTa?.teacher?.teacherName || homeroomTeacherName

      // 2. Môn Tiếng Việt / Ngữ Văn
      const litResolved = matchingSt ? findStudentScoreForSubjectCodes(matchingSt.id, ["TVI", "NVA"], ["tiếng việt", "ngữ văn", "văn"]) : null
      const litSub = litResolved?.subject || (isPrimary ? findSubject(["tiếng việt"], ["TVI"]) : findSubject(["ngữ văn", "văn"], ["NVA"]))
      const isLitCommitted = isSubjectMatchingCommitment(committedSubs, { id: "", name: isPrimary ? "Tiếng Việt" : "Ngữ Văn", code: isPrimary ? "TVI" : "NVA" })
      if (isLitCommitted) ksdvLitCommittedTotal++

      const litCurrentScore = litResolved?.score ?? ((matchingSt && litSub) ? (studentSubjectPeriodMap.get(matchingSt.id)?.get(litSub.id)?.get(currentPeriod)?.compositeScore ? Number(studentSubjectPeriodMap.get(matchingSt.id)!.get(litSub.id)!.get(currentPeriod)!.compositeScore) : null) : null)
      const litEntranceScore = isPrimary
        ? (cand.vietScore ?? cand.literatureScore ?? cand.vanScore ?? null)
        : (cand.vanScore ?? cand.literatureScore ?? cand.vietScore ?? null)
      const litDelta = (litCurrentScore !== null && litEntranceScore !== null) ? Math.round((litCurrentScore - litEntranceScore) * 10) / 10 : null
      const litTa = litSub ? taMap.get(`${cls.id}_${litSub.id}`) : null
      const litTeacher = litTa?.teacher?.teacherName || homeroomTeacherName

      // 3. Môn Tiếng Anh (Tổng điểm KSĐV Tiếng Anh)
      const engResolved = matchingSt ? findStudentScoreForSubjectCodes(matchingSt.id, ["TA", "TAV", "ESL", "ELA"], ["tiếng anh", "english", "esl", "ela"]) : null
      const engSub = engResolved?.subject || findSubject(["tiếng anh", "english", "esl"], ["TA", "TAV", "ESL"])
      const isEngCommitted = isSubjectMatchingCommitment(committedSubs, { id: "", name: "Tiếng Anh", code: "TA" })
      if (isEngCommitted) ksdvEngCommittedTotal++

      const engCurrentScore = engResolved?.score ?? ((matchingSt && engSub) ? (studentSubjectPeriodMap.get(matchingSt.id)?.get(engSub.id)?.get(currentPeriod)?.compositeScore ? Number(studentSubjectPeriodMap.get(matchingSt.id)!.get(engSub.id)!.get(currentPeriod)!.compositeScore) : null) : null)
      
      const isGrade1Student = Boolean(
        cand.isGrade1 || 
        (cls && String(cls.grade || cls.className || "").match(/\d+/)?.[0] === "1") ||
        (matchingSt && String(matchingSt.grade || "").match(/\d+/)?.[0] === "1")
      )

      let engEntranceTotal100: any = null
      let engEntranceScale10: any = null

      if (isGrade1Student) {
        // Khối 1: Điểm Vấn đáp là thang 30, không có Viết
        const oralNum = (cand.oralEnglishScore !== null && cand.oralEnglishScore !== undefined) ? parseFloat(cand.oralEnglishScore) : NaN
        if (!isNaN(oralNum)) {
          engEntranceScale10 = Math.round((oralNum / 30) * 10 * 10) / 10
          engEntranceTotal100 = Math.round((oralNum / 30) * 100 * 10) / 10
        } else if (cand.totalEnglishScale10 !== null && cand.totalEnglishScale10 !== undefined) {
          engEntranceScale10 = Number(cand.totalEnglishScale10)
          engEntranceTotal100 = Math.round(engEntranceScale10 * 10)
        }
      } else {
        engEntranceTotal100 = cand.totalEnglishScore !== null && cand.totalEnglishScore !== undefined 
          ? Number(cand.totalEnglishScore) 
          : (cand.totalEnglishScale10 !== null && cand.totalEnglishScale10 !== undefined ? Math.round(Number(cand.totalEnglishScale10) * 10) : null)
        engEntranceScale10 = cand.totalEnglishScale10 !== null && cand.totalEnglishScale10 !== undefined 
          ? Number(cand.totalEnglishScale10) 
          : (engEntranceTotal100 !== null ? (engEntranceTotal100 > 10 ? Math.round((engEntranceTotal100 / 10) * 10) / 10 : engEntranceTotal100) : null)
      }
      const engDelta = (engCurrentScore !== null && engEntranceScale10 !== null) ? Math.round((engCurrentScore - engEntranceScale10) * 10) / 10 : null
      const engTa = engSub ? taMap.get(`${cls.id}_${engSub.id}`) : null
      const engTeacher = engTa?.teacher?.teacherName || homeroomTeacherName

      // 4. CAM KẾT TÂM LÝ (THEO DÕI) - CHỈ ĐÁNH DẤU ĐỎ ĐÚNG ĐỐI TƯỢNG CÓ YÊU CẦU HOẶC NGUY CƠ CAO
      const cleanDirectorNote = (cand.directorNote || "").split(/---\s*LỊCH SỬ/i)[0].trim()
      const isPsychologyCommitted = Boolean(
        // 1. Có trong danh sách môn cam kết chính thức
        committedSubs.some(s => s.toLowerCase().includes("tâm") || s.toLowerCase().includes("lý") || s.toLowerCase().includes("psychology")) ||
        // 2. Ghi chú HĐTS yêu cầu cam kết hoặc theo dõi tâm lý / hành vi / mức độ tập trung
        /(?:cam kết|theo dõi|tư vấn|lưu ý|hỗ trợ|yc cam kết)\s+(?:tâm lý|tâm lí|hành vi|mức độ tập trung|tập trung chú ý)/i.test(cleanDirectorNote) ||
        /(?:theo dõi|quan sát)\s+(?:thêm\s+)?(?:tâm lý|tập trung)/i.test(cleanDirectorNote) ||
        // 3. Hoặc điểm khảo sát tâm lý thuộc mức nguy cơ cao (> 31)
        (cand.psychologyScore !== null && cand.psychologyScore !== undefined && Number(cand.psychologyScore) > 31)
      )
      if (isPsychologyCommitted) ksdvPsychologyCommittedTotal++

      // Check if student improved in at least one committed subject
      const hasMathImprovement = isMathCommitted && ((mathDelta !== null && mathDelta >= 0) || (mathCurrentScore !== null && mathCurrentScore >= 6.0))
      const hasLitImprovement = isLitCommitted && ((litDelta !== null && litDelta >= 0) || (litCurrentScore !== null && litCurrentScore >= 6.0))
      const hasEngImprovement = isEngCommitted && ((engDelta !== null && engDelta >= 0) || (engCurrentScore !== null && engCurrentScore >= 6.0))
      if (hasMathImprovement || hasLitImprovement || hasEngImprovement) {
        ksdvImprovedCount++
      }

      const displayStudentCode = matchingSt?.studentCode || cand.enrollmentCode || cand.studentCode || "-"
      const displayStudentName = matchingSt?.studentName || cand.fullName || "Học sinh"

      ksdvMatrixStudents.push({
        studentId: matchingSt?.id || cand.id,
        studentCode: displayStudentCode,
        studentName: displayStudentName,
        dateOfBirth: matchingSt?.dateOfBirth || cand.dateOfBirth || null,
        gender: matchingSt?.gender || cand.gender || null,
        classId: cls.id,
        className: cls.className,
        grade: cls.grade,
        gradeNum,
        level: cls.level,
        isGrade1: isGrade1Student || gradeNum === 1,
        campusId: cls.campusId,
        campusName: cls.campus?.campusName || cand.admissionCampus || cand.registeredCampus || "",
        campusCode: cls.campus?.campusCode || "",
        homeroomTeacher: homeroomTeacherName,
        admissionCriteria: cand.admissionCriteria || "",
        admissionResult: cand.admissionResult || "",
        directorNote: cand.directorNote || "",
        committedSubjects: committedSubs,
        math: {
          isCommitted: isMathCommitted,
          entranceScore: mathEntranceScore,
          currentScore: mathCurrentScore,
          delta: mathDelta,
          teacherName: mathTeacher,
          subjectName: mathSub?.name || "Toán học"
        },
        literature: {
          isCommitted: isLitCommitted,
          entranceScore: litEntranceScore,
          currentScore: litCurrentScore,
          delta: litDelta,
          teacherName: litTeacher,
          subjectName: litSub?.name || (isPrimary ? "Tiếng Việt" : "Ngữ Văn")
        },
        english: {
          isCommitted: isEngCommitted,
          isGrade1: isGrade1Student,
          entranceTotal100: engEntranceTotal100,
          entranceScale10: engEntranceScale10,
          oralScore: cand.oralEnglishScore,
          writtenScore: cand.writtenEnglishScore,
          eptScore: cand.eptScore,
          currentScore: engCurrentScore,
          delta: engDelta,
          teacherName: engTeacher,
          subjectName: "Tổng điểm Tiếng Anh"
        },
        // BỔ SUNG CAM KẾT TÂM LÝ - CẢNH BÁO MÀU ĐỎ NỔI BẬT
        psychology: {
          isCommitted: isPsychologyCommitted,
          entranceScore: cand.psychologyScore !== null && cand.psychologyScore !== undefined ? Number(cand.psychologyScore) : null,
          note: cand.directorNote || cand.admissionResult || "",
          isAlert: isPsychologyCommitted
        }
      })
    }

    // Step A: Process all candidate records from rawAllCommittedCandidates (sync from Support & Psychology tag)
    rawAllCommittedCandidates.forEach(cand => {
      // Find matching student in system
      let matchingSt = systemStudents.find((ss: any) => 
        (ss.studentCode && cand.studentCode && ss.studentCode.trim().toLowerCase() === cand.studentCode.trim().toLowerCase()) ||
        (ss.studentCode && cand.enrollmentCode && ss.studentCode.trim().toLowerCase() === cand.enrollmentCode.trim().toLowerCase())
      )

      if (!matchingSt) {
        matchingSt = systemStudents.find((ss: any) => {
          if (cleanString(ss.studentName) === cleanString(cand.fullName)) {
            if (!cand.grade) return true
            const ssGrade = ss.class?.grade || ss.class?.className?.match(/^(\d+)/)?.[1]
            const isCleanGrade = cand.grade.replace(/\D/g, "")
            if (!ssGrade || !isCleanGrade) return true
            return ssGrade.toString() === isCleanGrade.toString()
          }
          return false
        })
      }

      if (!matchingSt) {
        matchingSt = students.find((s: any) => 
          (cand.studentCode && s.studentCode && s.studentCode.trim().toUpperCase() === cand.studentCode.trim().toUpperCase()) ||
          (cand.enrollmentCode && s.studentCode && s.studentCode.trim().toUpperCase() === cand.enrollmentCode.trim().toUpperCase()) ||
          (cleanString(s.studentName) === cleanString(cand.fullName))
        )
      }

      let resolvedClass = matchingSt?.class || null

      if (!resolvedClass && cand.enrollmentClass) {
        resolvedClass = (allClasses.find((c: any) => c.id === cand.enrollmentClass.id)) || cand.enrollmentClass
      }

      if (!resolvedClass && cand.enrollmentClassId) {
        resolvedClass = allClasses.find((c: any) => c.id === cand.enrollmentClassId || c.classCode === cand.enrollmentClassId) || null
      }

      if (!resolvedClass && cand.className && cand.className !== "Chưa xếp lớp" && !cand.className.toLowerCase().includes("chưa xếp")) {
        resolvedClass = allClasses.find((c: any) => 
          c.className.toLowerCase() === cand.className.toLowerCase() ||
          c.classCode?.toLowerCase() === cand.className.toLowerCase()
        ) || (classes.find((c: any) => c.className.toLowerCase() === cand.className.toLowerCase())) || null
      }

      processCandidateForMatrix(cand, matchingSt, resolvedClass)
    })

    // Step B: Check any enrolled students in filteredClasses who have entrance commitment records but not yet in list
    students.forEach(st => {
      const cls = filteredClasses.find(c => c.id === st.classId)
      if (!cls) return

      const entranceInfo = findEntranceInfo(st.studentCode, st.studentName)
      if (!entranceInfo) return

      const hasEntranceCommitment = Boolean(
        (entranceInfo.admissionCriteria && entranceInfo.admissionCriteria.toLowerCase().includes("cam kết")) ||
        (entranceInfo.admissionResult && entranceInfo.admissionResult.toLowerCase().includes("cam kết")) ||
        (entranceInfo.targetType && entranceInfo.targetType.toLowerCase().includes("cam kết")) ||
        (entranceInfo.directorNote && entranceInfo.directorNote.toLowerCase().includes("cam kết")) ||
        (entranceInfo.admissionResult && /theo dõi/i.test(entranceInfo.admissionResult)) ||
        (entranceInfo.directorNote && /theo dõi/i.test(entranceInfo.directorNote)) ||
        (entranceInfo.targetType && /theo dõi/i.test(entranceInfo.targetType))
      )

      if (hasEntranceCommitment) {
        processCandidateForMatrix(entranceInfo, st, cls)
      }
    })

    // Tính toán số lượng CKĐV thực tế theo khối từ danh sách học sinh ma trận
    const matrixGrade1CommittedCount = ksdvMatrixStudents.filter(s => s.gradeNum === 1 || s.isGrade1).length
    const matrixOtherGradesCommittedCount = ksdvMatrixStudents.filter(s => s.gradeNum && s.gradeNum >= 2 && s.gradeNum <= 12).length

    // Mẫu số: Tổng Tuyển mới Nhập học
    // Nếu có bộ lọc áp dụng (filteredNewEnrolled > 0), cung cấp cả số liệu theo bộ lọc và toàn hệ thống
    const effectiveTotalNewEnrolled = filteredNewEnrolled > 0 ? filteredNewEnrolled : totalNewEnrolled
    const effectiveGrade1NewEnrolled = filteredGrade1NewEnrolled > 0 ? filteredGrade1NewEnrolled : grade1NewEnrolled
    const effectiveOtherNewEnrolled = filteredOtherGradesNewEnrolled > 0 ? filteredOtherGradesNewEnrolled : otherGradesNewEnrolled

    const totalCommitmentRate = effectiveTotalNewEnrolled > 0 
      ? Math.round((ksdvMatrixStudents.length / effectiveTotalNewEnrolled) * 1000) / 10 
      : 0
    const grade1CommitmentRate = effectiveGrade1NewEnrolled > 0 
      ? Math.round((matrixGrade1CommittedCount / effectiveGrade1NewEnrolled) * 1000) / 10 
      : 0
    const otherGradesCommitmentRate = effectiveOtherNewEnrolled > 0 
      ? Math.round((matrixOtherGradesCommittedCount / effectiveOtherNewEnrolled) * 1000) / 10 
      : 0

    const ksdvMatrix = {
      students: ksdvMatrixStudents,
      summary: {
        // 1. Toàn trường K1-12 (hoặc theo bộ lọc hiện tại)
        totalNewEnrolled: effectiveTotalNewEnrolled,
        totalCommittedStudents: ksdvMatrixStudents.length,
        totalCommitmentRate,

        // 2. Tách riêng Khối 1
        grade1NewEnrolled: effectiveGrade1NewEnrolled,
        grade1CommittedCount: matrixGrade1CommittedCount,
        grade1CommitmentRate,

        // 3. Khối 2 - 12
        otherGradesNewEnrolled: effectiveOtherNewEnrolled,
        otherGradesCommittedCount: matrixOtherGradesCommittedCount,
        otherGradesCommitmentRate,

        // 4. Số liệu toàn trường chuẩn (kể cả khi đang lọc)
        systemTotalNewEnrolled: totalNewEnrolled,
        systemTotalCommittedCount: totalCommittedInEnrolled,
        systemTotalCommitmentRate: totalNewEnrolled > 0 ? Math.round((totalCommittedInEnrolled / totalNewEnrolled) * 1000) / 10 : 0,
        systemGrade1NewEnrolled: grade1NewEnrolled,
        systemGrade1CommittedCount: grade1CommittedInEnrolled,
        systemGrade1CommitmentRate: grade1NewEnrolled > 0 ? Math.round((grade1CommittedInEnrolled / grade1NewEnrolled) * 1000) / 10 : 0,
        systemOtherGradesNewEnrolled: otherGradesNewEnrolled,
        systemOtherGradesCommittedCount: otherGradesCommittedInEnrolled,
        systemOtherGradesCommitmentRate: otherGradesNewEnrolled > 0 ? Math.round((otherGradesCommittedInEnrolled / otherGradesNewEnrolled) * 1000) / 10 : 0,

        // 5. Thống kê chi tiết theo khối 1 - 12
        byGradeStats,

        // 6. Thống kê theo môn & tiến bộ
        committedMathCount: ksdvMathCommittedTotal,
        committedLitCount: ksdvLitCommittedTotal,
        committedEngCount: ksdvEngCommittedTotal,
        committedPsychologyCount: ksdvPsychologyCommittedTotal,
        improvedCount: ksdvImprovedCount,
        improvedRate: ksdvMatrixStudents.length > 0 ? Math.round((ksdvImprovedCount / ksdvMatrixStudents.length) * 100) : 0
      }
    }

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
      totalAdmissionCommitment: Math.max(ksdvMatrixStudents.length, trackingStudents.filter(t => t.hasAdmissionCommitment).length),
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
      ksdvMatrix,
      benchmarks: benchmarkConfigs,
      subjects: availableSubjectList
    })

  } catch (error: any) {
    console.error("Lỗi phân tích kết quả và phổ điểm:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
