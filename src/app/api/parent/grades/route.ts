import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentChildren } from "@/lib/parentData"
import {
  getLockedParentGradePeriods,
  getParentGradeVisibilityMap,
  isParentGradePeriodLocked,
  normalizeParentGradePeriod,
} from "@/lib/grading/parent-grade-visibility"
import {
  buildParentPeriodicSubjectRow,
  buildPeriodicGradeValue,
  resolveParentPeriodLookup,
  type ParentPeriodicSubjectRow,
  type RawSubjectGradeConfig,
  type RawSubjectGradeEntry,
  type RawSubjectRecord,
} from "@/lib/grading/parent-periodic-grades"
import { isPrimaryGrade } from "@/lib/grading/vnedu-config-types"

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

    const visibilityMap = await getParentGradeVisibilityMap(prisma, targetYearId || null)
    const lockedPeriods = getLockedParentGradePeriods(visibilityMap)
    const normalizedPeriod = normalizeParentGradePeriod(rawPeriod)
    const isPeriodLockedForParent = isParentGradePeriodLocked(visibilityMap, rawPeriod)

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

    if (!isAdmin && isPeriodLockedForParent) {
      const periodConfig = normalizedPeriod ? visibilityMap[normalizedPeriod] : null
      return NextResponse.json({
        success: true,
        isLockedForParent: true,
        lockReason:
          periodConfig?.reason ||
          `Điểm kỳ ${EVAL_PERIOD_LABELS[rawPeriod] || rawPeriod} hiện đang được nhà trường khóa hiển thị trên cổng Phụ huynh.`,
        lockedPeriods,
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
        subjects: [],
        hasGrades: false
      })
    }

    const lookup = resolveParentPeriodLookup(rawPeriod)
    const isPrimary = isPrimaryGrade(targetClass?.grade || targetClass?.className)

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

    const CTQT_SUBJECT_LABELS: Record<string, string> = {
      ENG: "English (CTQT)",
      SCI: "Science (CTQT)",
      MATH: "Mathematics (CTQT)",
      GLOBAL_STUDIES: "Global Studies (CTQT)",
      AE: "Academic English (CTQT)",
      IELTS: "IELTS Preparation (CTQT)",
      AR: "Accelerated Reader (CTQT)",
    }

    const [surveyConfigs, studentGradeEntries, consultationLogs, ctqtEntries, specialEntries] = await Promise.all([
      prisma.subjectGradeConfig.findMany({
        where: {
          academicYearId: targetYearId,
          evaluationPeriod: { in: lookup.configPeriods },
          subjectId: { not: null },
          isActive: true
        },
        include: { subject: true }
      }).catch(() => []),

      prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId: targetYearId,
          studentId: targetStudentId,
          evaluationPeriod: { in: lookup.entryPeriods }
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
      }).catch(() => []),

      lookup.displayMode !== "KSDN"
        ? prisma.ctqtGradeEntry.findMany({
            where: {
              academicYearId: targetYearId,
              studentId: targetStudentId,
              semester: lookup.semester
            }
          }).catch(() => [])
        : Promise.resolve([]),

      lookup.displayMode !== "KSDN"
        ? prisma.specialGradeEntry.findMany({
            where: {
              studentId: targetStudentId,
              assignment: { academicYearId: targetYearId }
            },
            include: {
              assignment: {
                include: { subject: true }
              }
            },
            orderBy: { updatedAt: "desc" }
          }).catch(() => [])
        : Promise.resolve([])
    ])

    const subjectsMap = new Map<string, RawSubjectRecord>()
    const subjectConfigMap = new Map<string, RawSubjectGradeConfig>()

    surveyConfigs.forEach((cfg) => {
      if (cfg.subject && cfg.subjectId !== "ALL" && isGradeMatching(cfg.grade, targetClass?.grade || targetClass?.className)) {
        subjectsMap.set(cfg.subject.id, cfg.subject as unknown as RawSubjectRecord)
        const existingCfg = subjectConfigMap.get(cfg.subject.id)
        const isExact = lookup.primaryPeriods.includes(String(cfg.evaluationPeriod || "").toUpperCase())
        const existingIsExact = existingCfg
          ? lookup.primaryPeriods.includes(String(existingCfg.evaluationPeriod || "").toUpperCase())
          : false
        if (!existingCfg || (isExact && !existingIsExact)) {
          subjectConfigMap.set(cfg.subject.id, cfg as unknown as RawSubjectGradeConfig)
        }
      }
    })

    studentGradeEntries.forEach((ge) => {
      if (ge.subject) {
        subjectsMap.set(ge.subject.id, ge.subject as unknown as RawSubjectRecord)
      }
    })

    const entriesBySubject = new Map<string, RawSubjectGradeEntry[]>()
    studentGradeEntries.forEach((ge) => {
      const list = entriesBySubject.get(ge.subjectId) || []
      list.push(ge as unknown as RawSubjectGradeEntry)
      entriesBySubject.set(ge.subjectId, list)
    })

    const sortedSubjects = Array.from(subjectsMap.values()).sort(
      (a, b) => (a.orderIndex || 99) - (b.orderIndex || 99)
    )

    const builtRows: ParentPeriodicSubjectRow[] = sortedSubjects.map((sub, idx) =>
      buildParentPeriodicSubjectRow({
        subject: sub,
        stt: idx + 1,
        grade: targetClass?.grade || targetClass?.className,
        lookup,
        entriesForSubject: entriesBySubject.get(sub.id) || [],
        configForSubject: subjectConfigMap.get(sub.id) || null,
      })
    )

    const existingCodes = new Set(builtRows.map(r => r.code.toUpperCase()).filter(Boolean))

    // Append CTQT periodic grades (midTermScore / endTermScore / gpaScore — NO progressScores)
    if (Array.isArray(ctqtEntries) && ctqtEntries.length > 0) {
      for (const ctqt of ctqtEntries) {
        const codeUpper = String(ctqt.subjectCode || "").toUpperCase()
        if (!codeUpper || existingCodes.has(codeUpper)) continue
        const ddgGk = buildPeriodicGradeValue(ctqt.midTermScore)
        const ddgCk = lookup.displayMode === "ENDTERM" ? buildPeriodicGradeValue(ctqt.endTermScore) : buildPeriodicGradeValue(null)
        const dtbMhk =
          lookup.displayMode === "ENDTERM" && ctqt.endTermScore !== null && ctqt.endTermScore !== undefined
            ? buildPeriodicGradeValue(ctqt.gpaScore ?? ctqt.endTermScore)
            : buildPeriodicGradeValue(null)
        const specialScore =
          lookup.displayMode === "ENDTERM"
            ? (dtbMhk.display !== null ? dtbMhk : ddgCk)
            : ddgGk
        const headline = specialScore.display !== null ? specialScore : ddgGk
        if (headline.display === null && ddgGk.display === null && ddgCk.display === null) continue

        existingCodes.add(codeUpper)
        builtRows.push({
          id: `ctqt_${ctqt.id}`,
          stt: builtRows.length + 1,
          name: CTQT_SUBJECT_LABELS[codeUpper] || codeUpper,
          code: codeUpper,
          subjectGroup: "SPECIAL",
          curriculumGroup: "BILINGUAL",
          isSpecialSubject: true,
          isCommentOnly: false,
          score: headline.numeric,
          scoreDisplay: headline.display,
          scoreBadge: headline.badge,
          ddgGk,
          ddgCk,
          dtbMhk,
          specialScore,
          remark: ctqt.commentVi || ctqt.commentEn || "",
          source: "CTQT",
        })
      }
    }

    // Append Special Subject module periodic assessments (FIN_EDU, CXXH, GDHN, GDGT)
    if (Array.isArray(specialEntries) && specialEntries.length > 0) {
      const groupedSpecial = new Map<string, typeof specialEntries>()
      for (const sp of specialEntries) {
        const spSub = sp.assignment?.subject
        if (!spSub) continue
        const list = groupedSpecial.get(spSub.id) || []
        list.push(sp)
        groupedSpecial.set(spSub.id, list)
      }

      for (const [, spList] of groupedSpecial.entries()) {
        const spSub = spList[0]?.assignment?.subject
        if (!spSub) continue
        const codeUpper = String(spSub.code || "").toUpperCase()
        if (codeUpper && existingCodes.has(codeUpper)) continue

        // Prefer SEMESTER/TERM/FINAL scope, else most recent entry with result
        const preferred =
          spList.find(item => ["SEMESTER", "TERM", "FINAL", "HK1", "HK2"].includes(String(item.evalScope || "").toUpperCase())) ||
          spList.find(item => item.numericScore !== null && item.numericScore !== undefined) ||
          spList.find(item => item.evalResult && String(item.evalResult).trim() !== "")

        if (!preferred) continue
        const rawVal =
          preferred.numericScore !== null && preferred.numericScore !== undefined
            ? preferred.numericScore
            : preferred.evalResult || null
        const val = buildPeriodicGradeValue(rawVal)
        if (val.display === null) continue

        const emptyVal = buildPeriodicGradeValue(null)
        if (codeUpper) existingCodes.add(codeUpper)
        builtRows.push({
          id: `special_${spSub.id}`,
          stt: builtRows.length + 1,
          name: spSub.name || codeUpper || "Môn đặc thù",
          code: codeUpper,
          subjectGroup: "SPECIAL",
          curriculumGroup: "SKL",
          isSpecialSubject: true,
          isCommentOnly: val.numeric === null,
          score: val.numeric,
          scoreDisplay: val.display,
          scoreBadge: val.badge,
          ddgGk: lookup.displayMode === "MIDTERM" ? val : emptyVal,
          ddgCk: lookup.displayMode === "ENDTERM" ? val : emptyVal,
          dtbMhk: lookup.displayMode === "ENDTERM" ? val : emptyVal,
          specialScore: val,
          remark: preferred.teacherFeedback || "",
          source: "SPECIAL_MODULE",
        })
      }
    }

    const moetSubjects = builtRows
      .filter(r => r.subjectGroup === "MOET")
      .map((r, idx) => ({ ...r, stt: idx + 1 }))

    const specialSubjects = builtRows
      .filter(r => r.subjectGroup === "SPECIAL")
      .map((r, idx) => ({ ...r, stt: idx + 1 }))

    const subjectGradesList = [...moetSubjects, ...specialSubjects].map((r, idx) => ({
      ...r,
      stt: idx + 1,
    }))

    const hasGrades = subjectGradesList.some(
      r =>
        r.scoreDisplay !== null ||
        r.ddgGk.display !== null ||
        r.ddgCk.display !== null ||
        r.dtbMhk.display !== null ||
        r.specialScore.display !== null
    )

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
      isLockedForParent: false,
      lockedPeriods,
      displayMode: lookup.displayMode,
      isPrimary,
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
      moetSubjects,
      specialSubjects,
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
