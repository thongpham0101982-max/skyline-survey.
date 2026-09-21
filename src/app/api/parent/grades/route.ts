import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentChildren } from "@/lib/parentData"

export const dynamic = "force-dynamic"

const EVAL_PERIOD_LABELS: Record<string, string> = {
  "KSĐN": "Khảo sát đầu năm (KSĐN)",
  "KSDN": "Khảo sát đầu năm (KSĐN)",
  "GK1": "Giữa kỳ 1 (GK1)",
  "GIUA_KY_1": "Giữa kỳ 1 (GK1)",
  "CK1": "Cuối kỳ 1 (CK1)",
  "CUOI_KY_1": "Cuối kỳ 1 (CK1)",
  "GK2": "Giữa kỳ 2 (GK2)",
  "GIUA_KY_2": "Giữa kỳ 2 (GK2)",
  "CK2": "Cuối kỳ 2 (CK2)",
  "CUOI_KY_2": "Cuối kỳ 2 (CK2)"
}

interface StudentRecord {
  id: string
  studentCode?: string | null
  studentName?: string | null
  gender?: string | null
  dateOfBirth?: Date | string | null
  academicYearId?: string | null
  class?: {
    id: string
    className?: string | null
    grade?: string | null
    academicYearId?: string | null
    homeroomTeacherId?: string | null
    campus?: {
      campusCode?: string | null
      campusName?: string | null
      name?: string | null
    } | null
    academicYear?: {
      name?: string | null
    } | null
    teachers?: Array<{
      roleInClass?: string | null
      teacher?: {
        teacherName?: string | null
      } | null
    }>
  } | null
  academicYear?: {
    name?: string | null
  } | null
}

interface SubjectItem {
  id: string
  subjectName?: string | null
  subjectCode?: string | null
  name?: string | null
  code?: string | null
  orderIndex?: number | null
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ success: false, error: "Chưa xác thực đăng nhập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedStudentId = searchParams.get("studentId")
    const academicYearId = searchParams.get("academicYearId") || ""
    const rawPeriod = searchParams.get("evaluationPeriod") || "KSĐN"

    const userRole = user?.role || "PARENT"
    const isAdmin = ["SUPERADMIN", "ADMIN", "BGH", "KTDBCL"].includes(userRole.toUpperCase())

    let allowedStudents: StudentRecord[] = []
    if (!isAdmin) {
      allowedStudents = (await getParentChildren(userId, academicYearId || undefined)) as StudentRecord[]
      if (!allowedStudents || allowedStudents.length === 0) {
        return NextResponse.json({ success: false, error: "Tài khoản chưa liên kết với hồ sơ học sinh nào." }, { status: 403 })
      }
    }

    let targetStudentId = requestedStudentId
    if (!targetStudentId) {
      targetStudentId = allowedStudents[0]?.id
    }

    if (!isAdmin) {
      const hasPermission = allowedStudents.some((s) => s.id === targetStudentId)
      if (!hasPermission) {
        return NextResponse.json({ success: false, error: "Bạn không có quyền truy cập thông tin học sinh này." }, { status: 403 })
      }
    }

    const student = (await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: {
        class: {
          include: {
            campus: true,
            academicYear: true,
            teachers: {
              include: { teacher: true }
            }
          }
        },
        academicYear: true
      }
    })) as StudentRecord | null

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy hồ sơ học sinh." }, { status: 404 })
    }

    const targetClass = student.class
    const targetYearId = academicYearId || student.academicYearId || targetClass?.academicYearId || ""

    let homeroomTeacherName = "Giáo viên chủ nhiệm"
    if (targetClass?.homeroomTeacherId) {
      const t = await prisma.teacher.findFirst({
        where: {
          OR: [
            { id: targetClass.homeroomTeacherId },
            { teacherCode: targetClass.homeroomTeacherId },
            { userId: targetClass.homeroomTeacherId }
          ]
        },
        select: { teacherName: true }
      }).catch(() => null)
      if (t?.teacherName) homeroomTeacherName = t.teacherName
    }
    if (homeroomTeacherName === "Giáo viên chủ nhiệm" && targetClass?.teachers && targetClass.teachers.length > 0) {
      const hrAss = targetClass.teachers.find((ta) => ta.roleInClass === 'HOMEROOM' || ta.roleInClass === 'GVCN') || targetClass.teachers[0]
      if (hrAss?.teacher?.teacherName) homeroomTeacherName = hrAss.teacher.teacherName
    }

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

    const [surveyConfigs, studentGradeEntries, consultationLogs] = await Promise.all([
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetYearId,
          evaluationPeriod: { in: periodVariants },
          subjectId: { not: null },
          status: "ACTIVE"
        },
        include: { subject: true }
      }).catch(() => []),

      prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId: targetYearId,
          studentId: targetStudentId,
          evaluationPeriod: { in: targetPeriodFilter }
        },
        include: { subject: true }
      }).catch(() => []),

      prisma.academicConsultationLog.findMany({
        where: {
          studentId: targetStudentId,
          academicYearId: targetYearId,
          notes: { contains: `[GradePeriod: ${rawPeriod}]` }
        },
        orderBy: { createdAt: "desc" }
      }).catch(() => [])
    ])

    const subjectsMap = new Map<string, SubjectItem>()

    surveyConfigs.forEach((cfg) => {
      if (cfg.subject && cfg.subjectId !== "ALL" && isGradeMatching(cfg.grade, targetClass?.grade)) {
        subjectsMap.set(cfg.subject.id, cfg.subject)
      }
    })

    studentGradeEntries.forEach((ge) => {
      if (ge.subject) {
        subjectsMap.set(ge.subject.id, ge.subject)
      }
    })

    const sortedSubjects = Array.from(subjectsMap.values()).sort((a, b) => (a.orderIndex || 99) - (b.orderIndex || 99))

    const entryMap: Record<string, typeof studentGradeEntries[0]> = {}
    studentGradeEntries.forEach((ge) => {
      entryMap[ge.subjectId] = ge
    })

    let hasGrades = false
    const subjectGradesList = sortedSubjects.map((sub, idx: number) => {
      const entry = entryMap[sub.id]
      const rawScore = entry?.compositeScore
      const score = rawScore !== null && rawScore !== undefined && !isNaN(Number(rawScore))
        ? Number(rawScore)
        : null

      if (score !== null) hasGrades = true

      let scoreBadge = "empty"
      if (score !== null) {
        if (score >= 8.0) scoreBadge = "good"
        else if (score >= 6.5) scoreBadge = "fair"
        else if (score >= 5.0) scoreBadge = "avg"
        else scoreBadge = "weak"
      }

      return {
        id: sub.id,
        stt: idx + 1,
        name: sub.subjectName || sub.name || "Môn học",
        code: sub.subjectCode || sub.code || "",
        score,
        remark: entry?.remark || "",
        scoreBadge
      }
    })

    const latestExchangeLog = consultationLogs[0] || null
    let teacherRemark = ""
    let teacherRemarkDate: Date | null = null
    let parentFeedback = ""
    let parentFeedbackDate: Date | null = null

    if (latestExchangeLog) {
      if (latestExchangeLog.content) {
        teacherRemark = latestExchangeLog.content.replace(/^Ý KIẾN GVCN:\s*/i, "").trim()
      }
      if (latestExchangeLog.difficulties) {
        parentFeedback = latestExchangeLog.difficulties.replace(/^Ý KIẾN PHHS:\s*/i, "").trim()
      }
      teacherRemarkDate = latestExchangeLog.meetingDate || latestExchangeLog.createdAt
      parentFeedbackDate = latestExchangeLog.updatedAt || latestExchangeLog.createdAt
    }

    if (!teacherRemark) {
      teacherRemark = `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh ${student.studentName || ""}. Đề nghị gia đình tiếp tục phối hợp, động viên con phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode || "",
        studentName: student.studentName || "",
        gender: student.gender || "",
        dateOfBirth: student.dateOfBirth || null
      },
      classInfo: {
        id: targetClass?.id || "",
        className: targetClass?.className || "Chưa xếp lớp",
        grade: targetClass?.grade || "",
        campusName: targetClass?.campus?.campusName || targetClass?.campus?.name || "Hệ thống Sky-Line",
        campusCode: targetClass?.campus?.campusCode || "",
        homeroomTeacherName,
        academicYearName: student.academicYear?.name || targetClass?.academicYear?.name || ""
      },
      evaluationPeriod: rawPeriod,
      periodLabel: EVAL_PERIOD_LABELS[rawPeriod] || rawPeriod,
      subjects: subjectGradesList,
      hasGrades,
      exchange: {
        teacherRemark,
        teacherRemarkDate,
        teacherName: homeroomTeacherName,
        parentFeedback,
        parentFeedbackDate,
        logId: latestExchangeLog?.id || null
      }
    })

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Lỗi máy chủ nội bộ"
    console.error("GET /api/parent/grades error:", error)
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
