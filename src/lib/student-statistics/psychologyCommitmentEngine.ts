/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db"
import { ACADEMIC_MONTHS } from "@/app/teacher/ho-tro-hoc-tap/academic-calendar"
import { extractGradeNumber } from "@/lib/grading/vnedu-config-types"
import {
  cleanNormalizedString,
  isExplicitNonCommitmentRecord,
} from "@/lib/ktdbcl/entranceCommitmentReportEngine"
import { parseEvaluationCommentSafe } from "@/lib/support/exportTrackingBookExcel"
import {
  buildPsychHierarchy,
  isK12Class,
  loadEnrolledTransferInLookup,
} from "./standardEvaluator"
import {
  PSYCH_TEACHER_STATUS_LABELS,
  PSYCH_WEEK_STATUS_LABELS,
  PsychCampusSummaryRow,
  PsychCommitmentDetailRow,
  PsychEvaluationSlotDetail,
  PsychMonthSummaryRow,
  PsychologyCommitmentFilterInput,
  PsychologyCommitmentReportPayload,
  PsychTeacherEvalStatusCode,
  PsychWeekCell,
  PsychWeekStatusCode,
  PsychWeekSummaryRow,
  ReconciliationItem,
  StudentStatisticsAccessScope,
} from "./types"

const PSYCH_CATEGORY_LABEL = "Tâm lý cam kết đầu vào" as const

/**
 * Xác định hồ sơ Khảo sát đầu vào có thuộc đúng diện "Tâm lý cam kết đầu vào" hay không.
 * Loại trừ các hồ sơ có ghi chú "Không cần cam kết".
 */
export function isConfirmedPsychEntranceAssessment(record: {
  admissionResult?: string | null
  directorNote?: string | null
  psychologyTarget?: boolean | null
}): boolean {
  if (!record) return false
  if (isExplicitNonCommitmentRecord(record.admissionResult, record.directorNote)) {
    return false
  }
  if (record.psychologyTarget === true) return true

  const combined = `${record.admissionResult || ""} ${record.directorNote || ""}`.trim()
  if (!combined) return false
  const hasPsychKeyword = /tâm\s*lý|tam\s*ly|tâm\s*lí|tam\s*li|psychology/i.test(combined)
  const hasCommitmentKeyword = /cam\s*kết|cam\s*ket|theo\s*dõi|yêu\s*cầu|lưu\s*ý/i.test(combined)
  return hasPsychKeyword && hasCommitmentKeyword
}

/**
 * Xác định một LearningSupportTarget có thuộc đúng diện "Tâm lý cam kết đầu vào" hay không.
 * Chỉ chấp nhận hồ sơ có sourceType === "ADMISSION" (hoặc đã xác nhận từ KSĐV) và thuộc loại PSYCHOLOGICAL.
 * Hồ sơ tâm lý đề xuất từ GVCN, GVBM, TAM_LY thường xuyên KHÔNG thuộc diện này.
 */
export function isConfirmedPsychEntranceTarget(target: {
  supportType?: string | null
  sourceType?: string | null
  reason?: string | null
  notes?: string | null
}): boolean {
  if (!target) return false
  const sType = String(target.supportType || "").toUpperCase().trim()
  const srcType = String(target.sourceType || "").toUpperCase().trim()
  if (sType !== "PSYCHOLOGICAL") return false
  if (srcType === "ADMISSION" || srcType === "KHAO_SAT_DAU_VAO") return true

  // Không tự động gộp hồ sơ GVCN / GVBM / TAM_LY thường xuyên trừ khi ghi rõ là Tâm lý cam kết đầu vào
  const text = `${target.reason || ""} ${target.notes || ""}`
  if (/tâm\s*lý\s*cam\s*kết\s*đầu\s*vào|cam\s*kết\s*đầu\s*vào.*tâm\s*lý/i.test(text)) {
    return true
  }
  return false
}

export function buildAcademicYearMonthsMeta(academicYear?: {
  name?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}): Array<{ value: string; label: string; monthNumber: number; calendarYear: number }> {
  let startYear = new Date().getFullYear()
  let endYear = startYear + 1

  if (academicYear) {
    if (academicYear.startDate) {
      const d = new Date(academicYear.startDate)
      if (!Number.isNaN(d.getTime())) startYear = d.getFullYear()
    }
    if (academicYear.endDate) {
      const d = new Date(academicYear.endDate)
      if (!Number.isNaN(d.getTime())) endYear = d.getFullYear()
    }
    const match = String(academicYear.name || "").match(/(\d{4})\s*[-–/]\s*(\d{4})/)
    if (match) {
      startYear = parseInt(match[1], 10)
      endYear = parseInt(match[2], 10)
    }
  }

  return ACADEMIC_MONTHS.map((mLabel) => {
    const mNum = parseInt(mLabel.replace(/\D/g, ""), 10)
    const calYear = mNum >= 8 ? startYear : endYear
    return {
      value: mLabel,
      label: `${mLabel}/${calYear}`,
      monthNumber: mNum,
      calendarYear: calYear,
    }
  })
}

export function getMonthWeekWindows(calendarYear: number, monthNumber: number): Array<{
  weekNumber: number
  weekLabel: string
  startDate: Date
  endDate: Date
}> {
  const daysInMonth = new Date(calendarYear, monthNumber, 0).getDate()
  return [
    {
      weekNumber: 1,
      weekLabel: "Tuần 1",
      startDate: new Date(calendarYear, monthNumber - 1, 1, 0, 0, 0, 0),
      endDate: new Date(calendarYear, monthNumber - 1, 7, 23, 59, 59, 999),
    },
    {
      weekNumber: 2,
      weekLabel: "Tuần 2",
      startDate: new Date(calendarYear, monthNumber - 1, 8, 0, 0, 0, 0),
      endDate: new Date(calendarYear, monthNumber - 1, 14, 23, 59, 59, 999),
    },
    {
      weekNumber: 3,
      weekLabel: "Tuần 3",
      startDate: new Date(calendarYear, monthNumber - 1, 15, 0, 0, 0, 0),
      endDate: new Date(calendarYear, monthNumber - 1, 21, 23, 59, 59, 999),
    },
    {
      weekNumber: 4,
      weekLabel: "Tuần 4",
      startDate: new Date(calendarYear, monthNumber - 1, 22, 0, 0, 0, 0),
      endDate: new Date(calendarYear, monthNumber - 1, daysInMonth, 23, 59, 59, 999),
    },
  ]
}

function formatDateVi(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const dateObj = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dateObj.getTime())) return null
  const dd = String(dateObj.getDate()).padStart(2, "0")
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0")
  const yyyy = dateObj.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function extractNextSupportDirection(rawComment: string, updatedStatus?: string | null): {
  shortComment: string
  nextDirection: string
} {
  const parsed = parseEvaluationCommentSafe(rawComment || "")
  let main = parsed.mainComment || ""
  let nextDirection = ""

  const dirMatch = main.match(
    /(?:Hướng hỗ trợ(?:\s*tiếp theo)?|Đề xuất(?:\s*hỗ trợ)?|Kế hoạch tiếp theo)\s*:\s*([\s\S]+)$/i
  )
  if (dirMatch) {
    nextDirection = dirMatch[1].trim()
    main = main.replace(dirMatch[0], "").trim()
  }

  if (!nextDirection && parsed.gvcnFeedback) {
    nextDirection = parsed.gvcnFeedback
  }
  if (!nextDirection && updatedStatus) {
    nextDirection = String(updatedStatus).trim()
  }

  return {
    shortComment: main || rawComment || "",
    nextDirection,
  }
}

export function matchWeekEvaluationsForMonth(
  evals: any[],
  weekNumber: number,
  monthLabel: string,
  monthNumber: number,
  calendarYear: number,
  asOfDate: Date
): any[] {
  if (!evals || evals.length === 0) return []

  return evals.filter((e) => {
    if (e.createdAt && new Date(e.createdAt).getTime() > asOfDate.getTime()) {
      return false
    }
    const pType = String(e.periodType || "").toUpperCase()
    const pName = String(e.periodName || "").trim()

    if (pType === "MONTH") return false

    // 1. Khớp trực tiếp Tuần X + Tháng Y (hỗ trợ cả nhiều lượt trong tuần như "Tuần 1 - Tháng 10 (Lượt 2)")
    const weekRegex = new RegExp(`tuần\\s*${weekNumber}\\b`, "i")
    const monthRegex = new RegExp(`tháng\\s*0?${monthNumber}\\b`, "i")

    if (weekRegex.test(pName) && (pName.includes(monthLabel) || monthRegex.test(pName))) {
      return true
    }

    // Tuần 5 trong cùng tháng (nếu có) gộp vào Tuần 4 để không mất dữ liệu
    if (
      weekNumber === 4 &&
      /tuần\s*5\b/i.test(pName) &&
      (pName.includes(monthLabel) || monthRegex.test(pName))
    ) {
      return true
    }

    // 2. Fallback theo ngày tạo trong tháng đó nếu periodType === "WEEK" và không ghi rõ tháng khác
    if (pType === "WEEK" && !/tháng\s*\d+/i.test(pName) && e.createdAt) {
      const d = new Date(e.createdAt)
      if (
        !Number.isNaN(d.getTime()) &&
        d.getMonth() + 1 === monthNumber &&
        d.getFullYear() === calendarYear
      ) {
        if (weekRegex.test(pName)) return true
        const wOfDate = Math.min(Math.ceil(d.getDate() / 7), 4)
        return wOfDate === weekNumber
      }
    }

    return false
  })
}

export function findMonthSummaryEvaluation(
  evals: any[],
  monthLabel: string,
  monthNumber: number,
  asOfDate: Date
): any | null {
  if (!evals || evals.length === 0) return null
  const monthRegex = new RegExp(`tháng\\s*0?${monthNumber}\\b`, "i")

  const matches = evals.filter((e) => {
    if (e.createdAt && new Date(e.createdAt).getTime() > asOfDate.getTime()) {
      return false
    }
    const pType = String(e.periodType || "").toUpperCase()
    const pName = String(e.periodName || "").trim()
    const isMonthRecord =
      pType === "MONTH" ||
      (/tổng\s*kết/i.test(pName) && !/tuần\s*\d+/i.test(pName)) ||
      (pName === monthLabel && !/tuần/i.test(pName))

    if (!isMonthRecord) return false
    return pName === monthLabel || pName.includes(monthLabel) || monthRegex.test(pName)
  })

  if (matches.length === 0) return null
  matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return matches[0]
}

/**
 * Đánh giá trạng thái Tuần 1–4, Tổng kết tháng và Tình trạng GV ĐG cho 1 học sinh trong 1 tháng cụ thể.
 * Hàm thuần túy để phục vụ cả engine chính lẫn kiểm thử đơn vị (unit tests).
 */
export function evaluatePsychMonthTracking(params: {
  monthLabel: string
  monthNumber: number
  calendarYear: number
  asOfDate: Date
  isUnassigned: boolean
  trackingStartDate?: Date | string | null
  trackingEndDate?: Date | string | null
  terminationStatus?: string | null
  scheduledSessionsPerWeek?: Partial<Record<1 | 2 | 3 | 4, number>>
  evaluations: Array<{
    id: string
    periodType: string
    periodName: string
    trackingLevel: string
    comment: string
    updatedStatus?: string | null
    evaluatorName?: string | null
    createdAt: Date | string
  }>
  canViewComments: boolean
}): {
  weeks: [PsychWeekCell, PsychWeekCell, PsychWeekCell, PsychWeekCell]
  monthSummaryResult: string
  hasMonthSummary: boolean
  teacherEvalStatus: PsychTeacherEvalStatusCode
  teacherEvalStatusLabel: string
  latestEvaluationDate: string | null
  latestCommentShort: string | null
  nextSupportDirection: string | null
} {
  const {
    monthLabel,
    monthNumber,
    calendarYear,
    asOfDate,
    isUnassigned,
    trackingStartDate,
    trackingEndDate,
    terminationStatus,
    scheduledSessionsPerWeek,
    evaluations,
    canViewComments,
  } = params

  const startMs = trackingStartDate ? new Date(trackingStartDate).getTime() : null
  const isTerminated = String(terminationStatus || "").toUpperCase() === "TERMINATED"
  const endMs =
    isTerminated && trackingEndDate ? new Date(trackingEndDate).getTime() : null

  const windows = getMonthWeekWindows(calendarYear, monthNumber)

  const weekCells = windows.map((w): PsychWeekCell => {
    const matchedEvals = matchWeekEvaluationsForMonth(
      evaluations,
      w.weekNumber,
      monthLabel,
      monthNumber,
      calendarYear,
      asOfDate
    )

    // Xác định số lượt được lên lịch cho tuần
    const explicitScheduled =
      scheduledSessionsPerWeek?.[w.weekNumber as 1 | 2 | 3 | 4]

    let hasSchedule = true
    if (explicitScheduled !== undefined) {
      hasSchedule = explicitScheduled > 0
    } else {
      if (startMs !== null && !Number.isNaN(startMs) && startMs > w.endDate.getTime()) {
        hasSchedule = false
      }
      if (endMs !== null && !Number.isNaN(endMs) && endMs < w.startDate.getTime()) {
        hasSchedule = false
      }
    }

    // Nếu thực tế đã có phiếu đánh giá trong tuần thì tuần đó luôn có lịch
    if (matchedEvals.length > 0) {
      hasSchedule = true
    }

    const totalScheduled = !hasSchedule
      ? 0
      : Math.max(explicitScheduled ?? 1, matchedEvals.length)
    const completed = matchedEvals.length

    let status: PsychWeekStatusCode
    if (!hasSchedule || totalScheduled === 0) {
      status = "KHONG_CO_LICH"
    } else if (completed >= totalScheduled) {
      status = "DA_DANH_GIA"
    } else {
      const asOfMs = asOfDate.getTime()
      if (asOfMs > w.endDate.getTime()) {
        status = "QUA_HAN"
      } else if (asOfMs >= w.startDate.getTime()) {
        status = "DEN_HAN"
      } else {
        status = "CHUA_DEN_HAN"
      }
    }

    const evalDetails: PsychEvaluationSlotDetail[] = canViewComments
      ? matchedEvals.map((ev) => {
          const extracted = extractNextSupportDirection(ev.comment, ev.updatedStatus)
          return {
            id: ev.id,
            periodType: ev.periodType,
            periodName: ev.periodName,
            trackingLevel: ev.trackingLevel || "Đã đánh giá",
            comment: extracted.shortComment,
            nextSupportDirection: extracted.nextDirection,
            evaluatorName: ev.evaluatorName || "GV / Chuyên viên",
            createdAt: formatDateVi(ev.createdAt) || "",
          }
        })
      : []

    return {
      weekNumber: w.weekNumber,
      weekLabel: w.weekLabel,
      status,
      statusLabel: PSYCH_WEEK_STATUS_LABELS[status],
      completedSessions: completed,
      totalScheduledSessions: totalScheduled,
      dueDate: hasSchedule ? formatDateVi(w.endDate) : null,
      evaluations: evalDetails,
    }
  }) as [PsychWeekCell, PsychWeekCell, PsychWeekCell, PsychWeekCell]

  // Tổng kết tháng
  const monthEval = findMonthSummaryEvaluation(evaluations, monthLabel, monthNumber, asOfDate)
  const hasMonthSummary = Boolean(monthEval)
  const monthSummaryResult = monthEval
    ? String(monthEval.trackingLevel || monthEval.updatedStatus || "Đã tổng kết").trim()
    : "Chưa tổng kết"

  // Tình trạng GV ĐG theo đúng thứ tự ưu tiên:
  // Chưa phân công -> Có đánh giá quá hạn -> Còn lượt đến hạn -> Đã cập nhật đủ các lượt đến hạn -> Chưa đến hạn / Không có lịch
  let teacherEvalStatus: PsychTeacherEvalStatusCode
  if (isUnassigned) {
    teacherEvalStatus = "CHUA_PHAN_CONG"
  } else if (weekCells.some((w) => w.status === "QUA_HAN")) {
    teacherEvalStatus = "CO_DANH_GIA_QUA_HAN"
  } else if (weekCells.some((w) => w.status === "DEN_HAN")) {
    teacherEvalStatus = "CON_LUOT_DEN_HAN"
  } else if (weekCells.some((w) => w.status === "DA_DANH_GIA")) {
    teacherEvalStatus = "DA_CAP_NHAT_DU"
  } else if (weekCells.some((w) => w.status === "CHUA_DEN_HAN")) {
    teacherEvalStatus = "CHUA_DEN_HAN"
  } else {
    teacherEvalStatus = "KHONG_CO_LICH"
  }

  // Nhận xét & Đánh giá gần nhất tính đến ngày chốt (asOfDate)
  const validEvalsUpToAsOf = [...evaluations]
    .filter((e) => !e.createdAt || new Date(e.createdAt).getTime() <= asOfDate.getTime())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const latestEval = validEvalsUpToAsOf[0] || null
  let latestEvaluationDate: string | null = null
  let latestCommentShort: string | null = null
  let nextSupportDirection: string | null = null

  if (latestEval && canViewComments) {
    latestEvaluationDate = formatDateVi(latestEval.createdAt)
    const extracted = extractNextSupportDirection(latestEval.comment, latestEval.updatedStatus)
    latestCommentShort = extracted.shortComment || null
    nextSupportDirection = extracted.nextDirection || null
  }

  return {
    weeks: weekCells,
    monthSummaryResult,
    hasMonthSummary,
    teacherEvalStatus,
    teacherEvalStatusLabel: PSYCH_TEACHER_STATUS_LABELS[teacherEvalStatus],
    latestEvaluationDate,
    latestCommentShort,
    nextSupportDirection,
  }
}

export async function generatePsychologyCommitmentStatistics(
  filters: PsychologyCommitmentFilterInput,
  scope: StudentStatisticsAccessScope
): Promise<PsychologyCommitmentReportPayload> {
  if (!scope.canViewPsychologyTab) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền xem dữ liệu Tâm lý cam kết đầu vào.")
  }

  const asOfDateObj = filters.asOfDate ? new Date(filters.asOfDate) : new Date()
  const safeAsOfDate = Number.isNaN(asOfDateObj.getTime()) ? new Date() : asOfDateObj

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  })
  const activeYear = academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]
  const selectedYearId =
    filters.academicYearId && academicYears.some((y) => y.id === filters.academicYearId)
      ? filters.academicYearId
      : activeYear?.id || ""
  const selectedYearObj = academicYears.find((y) => y.id === selectedYearId) || activeYear

  const yearMonths = buildAcademicYearMonthsMeta(selectedYearObj)
  const defaultMonth =
    yearMonths.find((m) => m.monthNumber === safeAsOfDate.getMonth() + 1)?.value ||
    yearMonths[0]?.value ||
    "Tháng 9"

  const rawMonthParam = String(filters.month || "").trim()
  const isYearMode = rawMonthParam === "ALL_YEAR"
  const selectedMonthValue = isYearMode
    ? "ALL_YEAR"
    : yearMonths.some((m) => m.value === rawMonthParam)
      ? rawMonthParam
      : defaultMonth
  const activeMonthMeta =
    yearMonths.find((m) => m.value === selectedMonthValue) ||
    yearMonths.find((m) => m.value === defaultMonth) ||
    yearMonths[0]

  const isCampusRestricted = Boolean(scope.isCampusRestricted)
  const isClassRestricted = Boolean(
    scope.isClassRestricted && (scope.allowedClassIds || []).length > 0
  )

  const allCampuses = await prisma.campus.findMany({
    where: {
      status: "ACTIVE",
      ...(isCampusRestricted ? { id: { in: scope.allowedCampusIds } } : {}),
    },
    orderBy: { campusCode: "asc" },
    select: { id: true, campusCode: true, campusName: true },
  })

  if (
    filters.campusId &&
    filters.campusId !== "ALL" &&
    isCampusRestricted &&
    !scope.allowedCampusIds.includes(filters.campusId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập cơ sở này.")
  }

  let selectedCampusId = filters.campusId || "ALL"
  if (isCampusRestricted && allCampuses.length === 1) {
    selectedCampusId = allCampuses[0].id
  } else if (
    selectedCampusId !== "ALL" &&
    !allCampuses.some((c) => c.id === selectedCampusId)
  ) {
    selectedCampusId =
      isCampusRestricted && allCampuses.length > 0 ? allCampuses[0].id : "ALL"
  }

  if (
    filters.classId &&
    filters.classId !== "ALL" &&
    isClassRestricted &&
    !scope.allowedClassIds.includes(filters.classId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập lớp học này.")
  }

  const p = prisma as any
  const [
    allClasses,
    systemStudents,
    inputPeriods,
    preschoolPeriods,
    rawSupportTargets,
    studentTransfers,
    allTeachers,
  ] = await Promise.all([
    prisma.class.findMany({
      where: { academicYearId: selectedYearId, status: "ACTIVE" },
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }],
    }),
    prisma.student.findMany({
      where: { academicYearId: selectedYearId, status: { not: "TRANSFERRED_OUT" } },
      include: {
        class: {
          include: {
            campus: { select: { id: true, campusCode: true, campusName: true } },
          },
        },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    }),
    prisma.inputAssessmentPeriod.findMany({
      where: { academicYearId: selectedYearId },
      select: { id: true },
    }),
    p.preschoolInputAssessmentPeriod?.findMany
      ? p.preschoolInputAssessmentPeriod
          .findMany({ where: { academicYearId: selectedYearId }, select: { id: true } })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.learningSupportTarget.findMany({
      where: { academicYearId: selectedYearId, supportType: "PSYCHOLOGICAL" },
      include: {
        student: {
          include: {
            class: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        },
        assignments: {
          include: {
            teacher: { select: { id: true, teacherName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        evaluations: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    p.studentTransfer?.findMany
      ? p.studentTransfer
          .findMany({
            where: { academicYearId: selectedYearId },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.teacher.findMany({
      select: { id: true, userId: true, teacherName: true },
    }),
  ])

  const inputPeriodIds = inputPeriods.map((x: any) => x.id)

  const inputStudents =
    inputPeriodIds.length > 0
      ? await prisma.inputAssessmentStudent.findMany({
          where: {
            periodId: { in: inputPeriodIds },
            OR: [
              { admissionResult: { contains: "tâm lý" } },
              { admissionResult: { contains: "Tâm lý" } },
              { directorNote: { contains: "tâm lý" } },
              { directorNote: { contains: "Tâm lý" } },
              { directorNote: { contains: "tam ly" } },
              { directorNote: { contains: "psychology" } },
            ],
          },
          include: {
            enrollmentClass: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        })
      : []

  const reconciliationItems: ReconciliationItem[] = []
  let reconSeq = 1
  const pushRecon = (item: Omit<ReconciliationItem, "id">) => {
    reconciliationItems.push({ id: `psych_recon_${reconSeq++}`, ...item })
  }

  const k12Classes = allClasses.filter((c: any) => isK12Class(c))
  const classById = new Map<string, any>(k12Classes.map((c: any) => [c.id, c]))
  const studentById = new Map<string, any>(systemStudents.map((s: any) => [s.id, s]))
  const teacherNameById = new Map<string, string>()
  for (const t of allTeachers) {
    teacherNameById.set(t.id, t.teacherName)
    if (t.userId) teacherNameById.set(t.userId, t.teacherName)
  }

  const asOfMs = safeAsOfDate.getTime()
  const latestTransferByStudentId = new Map<string, any>()
  for (const tr of studentTransfers) {
    const trTime = tr.effectiveDate
      ? new Date(tr.effectiveDate).getTime()
      : tr.createdAt
        ? new Date(tr.createdAt).getTime()
        : 0
    if (trTime > asOfMs) continue
    if (
      tr.studentId &&
      (!tr.status || tr.status === "APPROVED" || tr.status === "COMPLETED") &&
      !latestTransferByStudentId.has(tr.studentId)
    ) {
      latestTransferByStudentId.set(tr.studentId, tr)
    }
  }

  const resolveEffectiveClass = (student: any, fallbackClass?: any) => {
    const transfer = latestTransferByStudentId.get(student.id)
    if (transfer && transfer.toClassId && classById.has(transfer.toClassId)) {
      return classById.get(transfer.toClassId)
    }
    if (student.classId && classById.has(student.classId)) return classById.get(student.classId)
    if (student.class && student.class.id) return classById.get(student.class.id) || student.class
    if (fallbackClass && fallbackClass.id) return classById.get(fallbackClass.id) || fallbackClass
    return null
  }

  // Tập học sinh thuộc đúng diện "Tâm lý cam kết đầu vào" (mỗi học sinh 1 bản ghi duy nhất)
  interface PsychCohortRecord {
    studentId: string
    studentCode: string
    studentName: string
    classObj: any
    targetId: string
    assignedTeacherId: string | null
    assignedTeacherName: string
    isUnassigned: boolean
    startDate: Date | string | null
    endDate: Date | string | null
    terminationStatus: string
    evaluations: Array<{
      id: string
      periodType: string
      periodName: string
      trackingLevel: string
      comment: string
      updatedStatus?: string | null
      evaluatorName: string
      createdAt: Date | string
    }>
  }

  const targetByStudentId = new Map<string, any>()
  for (const t of rawSupportTargets) {
    if (t.studentId && !targetByStudentId.has(t.studentId)) {
      targetByStudentId.set(t.studentId, t)
    }
  }

  const cohortMap = new Map<string, PsychCohortRecord>()

  const registerPsychStudent = (student: any, target: any | null, fallbackClass?: any) => {
    if (!student || !student.id) return
    if (cohortMap.has(student.id)) return

    const effectiveClass = resolveEffectiveClass(student, fallbackClass)
    if (!effectiveClass || !effectiveClass.id || !isK12Class(effectiveClass)) {
      if (!effectiveClass || !effectiveClass.id) {
        pushRecon({
          type: "UNASSIGNED_CLASS_EXCLUDED",
          studentCode: student.studentCode || "-",
          studentName: student.studentName || "-",
          detail: "Hồ sơ Tâm lý cam kết đầu vào chưa có phân lớp hợp lệ trong năm học.",
        })
      }
      return
    }

    // Lấy người phụ trách tại mốc báo cáo
    const validAssignments = (target?.assignments || []).filter((a: any) => {
      if (!a.teacher) return false
      const createdMs = a.createdAt ? new Date(a.createdAt).getTime() : 0
      return createdMs <= asOfMs
    })
    const activeAssignments =
      validAssignments.length > 0 ? validAssignments : (target?.assignments || []).filter((a: any) => a.teacher)

    const primaryAssign = activeAssignments[0] || null
    const isUnassigned = !primaryAssign?.teacher
    const assignedTeacherId = primaryAssign?.teacher?.id || null
    const assignedTeacherName = isUnassigned
      ? "Chưa phân công"
      : activeAssignments.map((a: any) => a.teacher.teacherName).join(", ")

    if (isUnassigned) {
      pushRecon({
        type: "UNASSIGNED_PSYCH_TEACHER",
        studentCode: student.studentCode || "-",
        studentName: student.studentName || "-",
        campusName: effectiveClass.campus?.campusName || "",
        className: effectiveClass.className,
        detail: "Học sinh thuộc diện Tâm lý cam kết đầu vào nhưng chưa được phân công GV / Chuyên viên phụ trách.",
      })
    }

    const mappedEvals = (target?.evaluations || []).map((ev: any) => ({
      id: ev.id,
      periodType: ev.periodType,
      periodName: ev.periodName,
      trackingLevel: ev.trackingLevel,
      comment: ev.comment,
      updatedStatus: ev.updatedStatus,
      evaluatorName: teacherNameById.get(ev.evaluatorId) || "GV / Chuyên viên",
      createdAt: ev.createdAt,
    }))

    cohortMap.set(student.id, {
      studentId: student.id,
      studentCode: student.studentCode || "-",
      studentName: student.studentName || "-",
      classObj: effectiveClass,
      targetId: target?.id || `admission_psych_${student.id}`,
      assignedTeacherId,
      assignedTeacherName,
      isUnassigned,
      startDate: target?.startDate || selectedYearObj?.startDate || null,
      endDate: target?.endDate || null,
      terminationStatus: target?.terminationStatus || "ACTIVE",
      evaluations: mappedEvals,
    })
  }

  // Nguồn 1: Hồ sơ Khảo sát đầu vào K-12 đã xác nhận thuộc diện Tâm lý cam kết đầu vào (loại trừ Mầm non)
  for (const is of inputStudents) {
    if (!isConfirmedPsychEntranceAssessment(is)) continue

    let matchingStudent = systemStudents.find(
      (ss: any) =>
        (ss.studentCode &&
          is.studentCode &&
          ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
        (ss.studentCode &&
          is.enrollmentCode &&
          ss.studentCode.trim().toLowerCase() === is.enrollmentCode.trim().toLowerCase())
    )
    if (!matchingStudent) {
      matchingStudent = systemStudents.find((ss: any) => {
        if (cleanNormalizedString(ss.studentName) === cleanNormalizedString(is.fullName)) {
          if (!is.grade) return true
          const ssGrade = ss.class?.grade || ss.class?.className?.match(/^(\d+)/)?.[1]
          const isCleanGrade = String(is.grade).replace(/\D/g, "")
          if (!ssGrade || !isCleanGrade) return true
          return String(ssGrade) === String(isCleanGrade)
        }
        return false
      })
    }

    if (!matchingStudent) {
      pushRecon({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: is.enrollmentCode || is.studentCode || "-",
        studentName: is.fullName || "-",
        detail: "Hồ sơ KSĐV thuộc diện Tâm lý cam kết đầu vào nhưng chưa có học sinh chính thức trong năm học.",
      })
      continue
    }

    const linkedTarget = targetByStudentId.get(matchingStudent.id) || null
    registerPsychStudent(matchingStudent, linkedTarget, is.enrollmentClass || null)
  }

  // Nguồn 2: LearningSupportTarget đã xác nhận đúng diện Tâm lý cam kết đầu vào (sourceType === "ADMISSION")
  for (const t of rawSupportTargets) {
    if (!isConfirmedPsychEntranceTarget(t)) continue
    const st = studentById.get(t.studentId) || t.student
    if (!st || st.status === "TRANSFERRED_OUT") continue
    registerPsychStudent(st, t)
  }

  // Áp dụng phân quyền cơ sở / lớp
  const scopedCohort: PsychCohortRecord[] = []
  for (const rec of cohortMap.values()) {
    const campusId = rec.classObj.campusId || rec.classObj.campus?.id || ""
    if (isCampusRestricted && !scope.allowedCampusIds.includes(campusId)) continue
    if (isClassRestricted && !scope.allowedClassIds.includes(rec.classObj.id)) continue
    scopedCohort.push(rec)
  }

  // Lọc theo Cơ sở -> Lớp -> GV/Chuyên viên
  const afterCampus = scopedCohort.filter((rec) => {
    if (selectedCampusId === "ALL") return true
    const cId = rec.classObj.campusId || rec.classObj.campus?.id || ""
    return cId === selectedCampusId
  })

  const classOptionMap = new Map<
    string,
    {
      id: string
      classCode: string
      className: string
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      studentCount: number
    }
  >()
  for (const rec of afterCampus) {
    const cls = rec.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    if (!classOptionMap.has(cls.id)) {
      classOptionMap.set(cls.id, {
        id: cls.id,
        classCode: cls.classCode || cls.className,
        className: cls.className,
        campusId,
        campusCode,
        campusName,
        displayLabel:
          selectedCampusId === "ALL" && campusCode
            ? `${cls.className} (${campusCode})`
            : cls.className,
        studentCount: 0,
      })
    }
    classOptionMap.get(cls.id)!.studentCount += 1
  }
  const availableClasses = Array.from(classOptionMap.values()).sort((a, b) => {
    if (a.campusCode !== b.campusCode) return a.campusCode.localeCompare(b.campusCode, "vi")
    return a.className.localeCompare(b.className, "vi", { numeric: true })
  })

  const selectedClassId =
    filters.classId &&
    filters.classId !== "ALL" &&
    availableClasses.some((c) => c.id === filters.classId)
      ? filters.classId
      : "ALL"

  const afterClass = afterCampus.filter((rec) => {
    if (selectedClassId === "ALL") return true
    return rec.classObj.id === selectedClassId
  })

  const teacherOptionMap = new Map<string, { id: string; name: string; studentCount: number }>()
  for (const rec of afterClass) {
    const tid = rec.isUnassigned ? "UNASSIGNED" : rec.assignedTeacherId || rec.assignedTeacherName
    const tname = rec.isUnassigned ? "Chưa phân công" : rec.assignedTeacherName
    if (!teacherOptionMap.has(tid)) {
      teacherOptionMap.set(tid, { id: tid, name: tname, studentCount: 0 })
    }
    teacherOptionMap.get(tid)!.studentCount += 1
  }
  const availableTeachers = Array.from(teacherOptionMap.values()).sort((a, b) => {
    if (a.id === "UNASSIGNED") return 1
    if (b.id === "UNASSIGNED") return -1
    return a.name.localeCompare(b.name, "vi")
  })

  const selectedTeacherId =
    filters.teacherId &&
    filters.teacherId !== "ALL" &&
    availableTeachers.some((t) => t.id === filters.teacherId)
      ? filters.teacherId
      : "ALL"

  const filteredCohort = afterClass
    .filter((rec) => {
      if (selectedTeacherId === "ALL") return true
      if (selectedTeacherId === "UNASSIGNED") return rec.isUnassigned
      return rec.assignedTeacherId === selectedTeacherId
    })
    .sort((a, b) => {
      const campA = a.classObj.campus?.campusCode || ""
      const campB = b.classObj.campus?.campusCode || ""
      if (campA !== campB) return campA.localeCompare(campB, "vi")
      const gA = extractGradeNumber(a.classObj.grade || a.classObj.className) ?? 99
      const gB = extractGradeNumber(b.classObj.grade || b.classObj.className) ?? 99
      if (gA !== gB) return gA - gB
      if (a.classObj.className !== b.classObj.className) {
        return a.classObj.className.localeCompare(b.classObj.className, "vi", { numeric: true })
      }
      return a.studentName.localeCompare(b.studentName, "vi")
    })

  // Xây dựng dòng chi tiết cho tháng đang chọn (hoặc tháng hoạt động khi xem Tổng hợp năm học)
  const detailRows: PsychCommitmentDetailRow[] = filteredCohort.map((rec, idx) => {
    const tracked = evaluatePsychMonthTracking({
      monthLabel: activeMonthMeta.value,
      monthNumber: activeMonthMeta.monthNumber,
      calendarYear: activeMonthMeta.calendarYear,
      asOfDate: safeAsOfDate,
      isUnassigned: rec.isUnassigned,
      trackingStartDate: rec.startDate,
      trackingEndDate: rec.endDate,
      terminationStatus: rec.terminationStatus,
      evaluations: rec.evaluations,
      canViewComments: scope.canViewPsychologyComments,
    })

    const cls = rec.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode

    return {
      rowKey: `${rec.studentId}_${activeMonthMeta.value}`,
      stt: idx + 1,
      targetId: rec.targetId,
      studentId: rec.studentId,
      studentCode: rec.studentCode,
      studentName: rec.studentName,
      classId: cls.id,
      className: cls.className,
      classCode: cls.classCode || cls.className,
      grade: cls.grade || "",
      campusId,
      campusCode,
      campusName,
      assignedTeacherId: rec.assignedTeacherId,
      assignedTeacherName: rec.assignedTeacherName,
      isUnassigned: rec.isUnassigned,
      categoryLabel: PSYCH_CATEGORY_LABEL,
      weeks: tracked.weeks,
      monthSummaryResult: tracked.monthSummaryResult,
      hasMonthSummary: tracked.hasMonthSummary,
      teacherEvalStatus: tracked.teacherEvalStatus,
      teacherEvalStatusLabel: tracked.teacherEvalStatusLabel,
      latestEvaluationDate: tracked.latestEvaluationDate,
      latestCommentShort: tracked.latestCommentShort,
      nextSupportDirection: tracked.nextSupportDirection,
      canViewComments: scope.canViewPsychologyComments,
    }
  })

  // Tổng hợp tuần (Tuần 1..4) cho tháng hiện tại
  const weekSummary: PsychWeekSummaryRow[] = [0, 1, 2, 3].map((wIdx) => {
    let dueStudentCount = 0
    let evaluatedStudentCount = 0
    let overdueStudentCount = 0
    let notDueStudentCount = 0
    let noScheduleStudentCount = 0
    let totalScheduledSessions = 0
    let completedSessions = 0

    for (const row of detailRows) {
      const cell = row.weeks[wIdx]
      totalScheduledSessions += cell.totalScheduledSessions
      completedSessions += cell.completedSessions
      if (cell.status === "DEN_HAN") dueStudentCount += 1
      else if (cell.status === "DA_DANH_GIA") evaluatedStudentCount += 1
      else if (cell.status === "QUA_HAN") overdueStudentCount += 1
      else if (cell.status === "CHUA_DEN_HAN") notDueStudentCount += 1
      else noScheduleStudentCount += 1
    }

    return {
      weekNumber: wIdx + 1,
      weekLabel: `Tuần ${wIdx + 1}`,
      dueStudentCount,
      evaluatedStudentCount,
      overdueStudentCount,
      notDueStudentCount,
      noScheduleStudentCount,
      totalScheduledSessions,
      completedSessions,
    }
  })

  // Tổng hợp theo từng tháng trong năm học (10 tháng)
  const yearMonthlySummary: PsychMonthSummaryRow[] = yearMonths.map((mMeta) => {
    let unassignedStudents = 0
    let overdueStudents = 0
    let duePendingStudents = 0
    let completedAllDueStudents = 0
    let monthSummarizedStudents = 0

    for (const rec of filteredCohort) {
      const tr = evaluatePsychMonthTracking({
        monthLabel: mMeta.value,
        monthNumber: mMeta.monthNumber,
        calendarYear: mMeta.calendarYear,
        asOfDate: safeAsOfDate,
        isUnassigned: rec.isUnassigned,
        trackingStartDate: rec.startDate,
        trackingEndDate: rec.endDate,
        terminationStatus: rec.terminationStatus,
        evaluations: rec.evaluations,
        canViewComments: false,
      })
      if (rec.isUnassigned) unassignedStudents += 1
      if (tr.weeks.some((w) => w.status === "QUA_HAN")) overdueStudents += 1
      if (tr.weeks.some((w) => w.status === "DEN_HAN")) duePendingStudents += 1
      if (tr.teacherEvalStatus === "DA_CAP_NHAT_DU") completedAllDueStudents += 1
      if (tr.hasMonthSummary) monthSummarizedStudents += 1
    }

    const total = filteredCohort.length
    return {
      monthValue: mMeta.value,
      monthNumber: mMeta.monthNumber,
      calendarYear: mMeta.calendarYear,
      label: mMeta.label,
      totalStudents: total,
      unassignedStudents,
      overdueStudents,
      duePendingStudents,
      completedAllDueStudents,
      monthSummarizedStudents,
      monthSummaryRate:
        total > 0 ? Math.round((monthSummarizedStudents / total) * 1000) / 10 : null,
    }
  })

  // Tổng hợp theo cơ sở (dựa trên detailRows của tháng đang xem)
  const campusMap = new Map<
    string,
    {
      campusId: string
      campusCode: string
      campusName: string
      totalStudents: number
      unassignedStudents: number
      overdueStudents: number
      duePendingStudents: number
      completedAllDueStudents: number
      monthSummarizedStudents: number
    }
  >()

  for (const row of detailRows) {
    const key = row.campusId || row.campusCode
    if (!campusMap.has(key)) {
      campusMap.set(key, {
        campusId: row.campusId,
        campusCode: row.campusCode,
        campusName: row.campusName,
        totalStudents: 0,
        unassignedStudents: 0,
        overdueStudents: 0,
        duePendingStudents: 0,
        completedAllDueStudents: 0,
        monthSummarizedStudents: 0,
      })
    }
    const c = campusMap.get(key)!
    c.totalStudents += 1
    if (row.isUnassigned) c.unassignedStudents += 1
    if (row.weeks.some((w) => w.status === "QUA_HAN")) c.overdueStudents += 1
    if (row.weeks.some((w) => w.status === "DEN_HAN")) c.duePendingStudents += 1
    if (row.teacherEvalStatus === "DA_CAP_NHAT_DU") c.completedAllDueStudents += 1
    if (row.hasMonthSummary) c.monthSummarizedStudents += 1
  }

  const campusSummary: PsychCampusSummaryRow[] = Array.from(campusMap.values())
    .map((c) => ({
      ...c,
      monthSummaryRate:
        c.totalStudents > 0
          ? Math.round((c.monthSummarizedStudents / c.totalStudents) * 1000) / 10
          : null,
    }))
    .sort((a, b) => a.campusCode.localeCompare(b.campusCode, "vi"))

  // Tổng hợp chung
  const totalStudents = detailRows.length
  const unassignedStudents = detailRows.filter((r) => r.isUnassigned).length
  const overdueStudents = detailRows.filter((r) =>
    r.weeks.some((w) => w.status === "QUA_HAN")
  ).length
  const duePendingStudents = detailRows.filter((r) =>
    r.weeks.some((w) => w.status === "DEN_HAN")
  ).length
  const completedAllDueStudents = detailRows.filter(
    (r) => r.teacherEvalStatus === "DA_CAP_NHAT_DU"
  ).length
  const monthSummarizedStudents = detailRows.filter((r) => r.hasMonthSummary).length
  const totalScheduledSessions = weekSummary.reduce((acc, w) => acc + w.totalScheduledSessions, 0)
  const completedSessions = weekSummary.reduce((acc, w) => acc + w.completedSessions, 0)

  const transferIn = await loadEnrolledTransferInLookup({
    academicYearId: selectedYearId,
    scope,
    selectedCampusId,
    selectedClassId,
  })
  const enrolledLookup = transferIn.lookup
  const hierarchy = buildPsychHierarchy(
    detailRows.map((r) => ({
      studentId: r.studentId,
      studentCode: r.studentCode,
      campusId: r.campusId,
      campusCode: r.campusCode,
      campusName: r.campusName,
      grade: r.grade || r.className.match(/^(\d+)/)?.[1] || "Khác",
      classId: r.classId,
      className: r.className,
      isUnassigned: r.isUnassigned,
      hasOverdue: r.weeks.some((w) => w.status === "QUA_HAN"),
      hasDuePending: r.weeks.some((w) => w.status === "DEN_HAN"),
      isCompletedAllDue: r.teacherEvalStatus === "DA_CAP_NHAT_DU",
      hasMonthSummary: r.hasMonthSummary,
    })),
    enrolledLookup
  )

  const selectedCampusObj = allCampuses.find((c) => c.id === selectedCampusId)
  const selectedClassObj = availableClasses.find((c) => c.id === selectedClassId)
  const selectedTeacherObj = availableTeachers.find((t) => t.id === selectedTeacherId)

  return {
    asOfDate: safeAsOfDate.toISOString(),
    viewMode: isYearMode ? "YEAR_SUMMARY" : "MONTH",
    filters: {
      academicYearId: selectedYearId,
      academicYearName: selectedYearObj?.name || "",
      month: selectedMonthValue,
      monthLabel: isYearMode ? "Tổng hợp cả năm học" : activeMonthMeta.label,
      campusId: selectedCampusId,
      campusName:
        selectedCampusId === "ALL"
          ? "Toàn hệ thống"
          : selectedCampusObj?.campusName || selectedCampusObj?.campusCode || "",
      classId: selectedClassId,
      className: selectedClassId === "ALL" ? "Tất cả lớp" : selectedClassObj?.className || "",
      teacherId: selectedTeacherId,
      teacherName:
        selectedTeacherId === "ALL"
          ? "Tất cả GV / Chuyên viên"
          : selectedTeacherObj?.name || "",
    },
    availableFilters: {
      academicYears: academicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
      months: yearMonths,
      campuses: allCampuses,
      classes: availableClasses,
      teachers: availableTeachers,
    },
    summary: {
      enrolledStudentCount: enrolledLookup.system,
      totalStudents,
      enrolledShareRate:
        enrolledLookup.system > 0
          ? Math.round((totalStudents / enrolledLookup.system) * 1000) / 10
          : null,
      unassignedStudents,
      overdueStudents,
      duePendingStudents,
      completedAllDueStudents,
      monthSummarizedStudents,
      monthSummaryRate:
        totalStudents > 0
          ? Math.round((monthSummarizedStudents / totalStudents) * 1000) / 10
          : null,
      totalScheduledSessions,
      completedSessions,
    },
    hierarchy,
    weekSummary,
    yearMonthlySummary,
    campusSummary,
    detailRows: scope.isSummaryOnly ? [] : detailRows,
    reconciliationItems: scope.isSummaryOnly ? [] : reconciliationItems,
    isSummaryOnly: scope.isSummaryOnly,
    canViewPsychologyComments: scope.canViewPsychologyComments,
  }
}
