import { prisma } from "@/lib/db"

export type ItemConfirmStatus =
  | "PENDING"
  | "MANAGER_CONFIRMED"
  | "DIRECTOR_CONFIRMED"
  | "OVERDUE_EXPLANATION_REQUIRED"
  | "EXPLANATION_SUBMITTED"

export interface WeeklyReportItemMeta {
  itemId: string
  reportId: string
  userId: string
  confirmStatus: ItemConfirmStatus
  managerConfirmedById: string | null
  managerConfirmedByName: string | null
  managerConfirmedAt: string | null
  directorConfirmedById: string | null
  directorConfirmedByName: string | null
  directorConfirmedAt: string | null
  isOverdue: boolean
  overdueFlaggedById: string | null
  overdueFlaggedByName: string | null
  overdueFlaggedAt: string | null
  explanationRequestNote: string | null
  explanationDueDate: string | null
  staffExplanation: string | null
  staffRecoveryDate: string | null
  staffExplainedAt: string | null
  linkedWorkTaskId: string | null
  lastEmailType: string | null
  lastEmailSentAt: string | null
  updatedAt: string | null
}

export interface KtdbclWeeklyAutomationConfig {
  id: string
  wednesdayReminderEnabled: boolean
  wednesdayReminderDayOfWeek: number // 3 = Wednesday
  wednesdayReminderHourVn: number // 14 = 14:00 GMT+7
  weeklyDirectorReportEnabled: boolean
  weeklyDirectorSendDayOfWeek: number // 5 = Friday
  weeklyDirectorSendHourVn: number // 16 = 16:00 GMT+7
  monthlyDirectorReportEnabled: boolean
  directorUserIds: string[]
  directorEmails: string[]
  ccManagerEmails: string[]
  overdueAutoFlagEnabled: boolean
  updatedByName: string | null
  updatedAt: string | null
}

export interface WeeklyAutomationLogRecord {
  id: string
  jobType:
    | "WEDNESDAY_REMINDER"
    | "DIRECTOR_WEEKLY_REPORT"
    | "DIRECTOR_MONTHLY_REPORT"
    | "ITEM_CONFIRMED_EMAIL"
    | "OVERDUE_EXPLANATION_EMAIL"
    | "EXPLANATION_SUBMITTED_EMAIL"
    | "PROGRESS_CONFIRM_REMINDER_EMAIL"
    | "SATURDAY_PLAN_REMINDER"
  dedupKey: string
  periodLabel: string
  recipientSummary: string
  emailSentCount: number
  notificationCount: number
  triggeredBy: string
  status: "SUCCESS" | "PARTIAL" | "SKIPPED" | "FAILED"
  detailsJson: string | null
  createdAt: string
}

export interface KtdbclMemberProfile {
  id: string
  fullName: string
  email: string | null
  role: string
  position: string
  isDirector: boolean
  isManager: boolean
  departmentId: string | null
  departmentName: string
  campusName: string
  specialistGroups: string[]
  teacherId: string | null
}

export const KTDBCL_DEFAULT_GROUPS = [
  "Khảo thí Phổ thông",
  "Khảo thí Tổng hợp",
  "Khảo thí TA&CTQT",
  "ĐBCL Học sinh",
  "ĐBCL",
] as const

const KTDBCL_DEPT_CODES = ["KT-ĐBCL", "KT&ĐBCL", "KT_DBCL", "KTDBCL", "BAN_KT_DBCL"]
const KTDBCL_ROLE_CODES = [
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "KHẢO THÍ",
  "KHAO THI",
  "ĐBCL",
  "DBCL",
  "KT&ĐBCL",
  "KT-ĐBCL",
  "BAN_KT_DBCL",
]

function normalizeRoleToken(val?: string | null): string {
  return String(val || "")
    .trim()
    .toUpperCase()
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
}

export function isKtdbclRoleCode(roleCode?: string | null): boolean {
  const upper = String(roleCode || "").toUpperCase().trim()
  if (!upper) return false
  if (["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN"].includes(upper)) return true
  if (KTDBCL_ROLE_CODES.some((c) => upper === c.toUpperCase())) return true
  const norm = normalizeRoleToken(upper)
  return ["KT_DBCL", "KTDBCL", "KHAO_THI", "DBCL", "KT&DBCL", "KT-DBCL", "BAN_KT_DBCL"].includes(norm)
}

/**
 * Kiểm tra chặt chẽ ở Backend xem người dùng có thuộc nhóm quyền / BP Ban KT&ĐBCL (hoặc Quản trị hệ thống) hay không.
 * Cả Báo cáo Tuần (/admin/weekly-reports) và WorkHub (/admin/workhub) CHỈ áp dụng riêng cho Ban KT&ĐBCL, KHÔNG hiển thị/áp dụng cho tài khoản khác.
 */
export async function isUserAuthorizedForKtdbclWeeklyReports(
  userId?: string | null,
  roleCode?: string | null
): Promise<boolean> {
  if (isKtdbclRoleCode(roleCode)) return true
  if (!userId) return false

  try {
    const roster = await resolveKtdbclRoster()
    if (roster.members.some((m) => m.id === userId)) return true
    return false
  } catch {
    return false
  }
}

export const isUserAuthorizedForKtdbclWorkHub = isUserAuthorizedForKtdbclWeeklyReports

let weeklySchemaInitPromise: Promise<void> | null = null

const WEEKLY_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "qa_weekly_report_item_meta" (
    "itemId" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "managerConfirmedById" TEXT,
    "managerConfirmedByName" TEXT,
    "managerConfirmedAt" DATETIME,
    "directorConfirmedById" TEXT,
    "directorConfirmedByName" TEXT,
    "directorConfirmedAt" DATETIME,
    "isOverdue" INTEGER NOT NULL DEFAULT 0,
    "overdueFlaggedById" TEXT,
    "overdueFlaggedByName" TEXT,
    "overdueFlaggedAt" DATETIME,
    "explanationRequestNote" TEXT,
    "explanationDueDate" TEXT,
    "staffExplanation" TEXT,
    "staffRecoveryDate" TEXT,
    "staffExplainedAt" DATETIME,
    "linkedWorkTaskId" TEXT,
    "lastEmailType" TEXT,
    "lastEmailSentAt" DATETIME,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_wk_item_meta_report_idx" ON "qa_weekly_report_item_meta"("reportId")`,
  `CREATE INDEX IF NOT EXISTS "qa_wk_item_meta_user_idx" ON "qa_weekly_report_item_meta"("userId", "confirmStatus")`,

  `CREATE TABLE IF NOT EXISTS "qa_weekly_automation_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wednesdayReminderEnabled" INTEGER NOT NULL DEFAULT 1,
    "wednesdayReminderDayOfWeek" INTEGER NOT NULL DEFAULT 3,
    "wednesdayReminderHourVn" INTEGER NOT NULL DEFAULT 14,
    "weeklyDirectorReportEnabled" INTEGER NOT NULL DEFAULT 1,
    "weeklyDirectorSendDayOfWeek" INTEGER NOT NULL DEFAULT 5,
    "weeklyDirectorSendHourVn" INTEGER NOT NULL DEFAULT 16,
    "monthlyDirectorReportEnabled" INTEGER NOT NULL DEFAULT 1,
    "directorUserIdsJson" TEXT NOT NULL DEFAULT '[]',
    "directorEmailsJson" TEXT NOT NULL DEFAULT '[]',
    "ccManagerEmailsJson" TEXT NOT NULL DEFAULT '[]',
    "overdueAutoFlagEnabled" INTEGER NOT NULL DEFAULT 1,
    "updatedByName" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "qa_weekly_automation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobType" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL UNIQUE,
    "periodLabel" TEXT NOT NULL,
    "recipientSummary" TEXT NOT NULL,
    "emailSentCount" INTEGER NOT NULL DEFAULT 0,
    "notificationCount" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT NOT NULL DEFAULT 'SYSTEM_CRON',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "detailsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "qa_wk_auto_logs_created_idx" ON "qa_weekly_automation_logs"("createdAt" DESC)`,

  `CREATE TABLE IF NOT EXISTS "qa_weekly_ai_analyses" (
    "cacheKey" TEXT NOT NULL PRIMARY KEY,
    "scopeType" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "aiEngineUsed" TEXT NOT NULL,
    "analysisJson" TEXT NOT NULL,
    "generatedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
]

export async function ensureKtdbclWeeklySchema(): Promise<void> {
  if (!weeklySchemaInitPromise) {
    weeklySchemaInitPromise = (async () => {
      const pAny = prisma as any
      if (typeof pAny.$executeRawUnsafe !== "function") return
      for (const ddl of WEEKLY_DDL_STATEMENTS) {
        try {
          await pAny.$executeRawUnsafe(ddl)
        } catch (err) {
          console.warn("[ensureKtdbclWeeklySchema] DDL warning:", err)
        }
      }
    })().catch((err) => {
      weeklySchemaInitPromise = null
      console.error("[ensureKtdbclWeeklySchema] Init error:", err)
    })
  }
  return weeklySchemaInitPromise
}

function safeParseJson<T>(raw: any, fallback: T): T {
  if (!raw) return fallback
  if (typeof raw === "object") return raw as T
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return fallback
  }
}

export function normalizeStaffEmail(u: any): string | null {
  let raw = u?.teacher?.email || u?.email || ""
  if (!raw || typeof raw !== "string") return null
  raw = raw.trim()
  if (!raw) return null
  if (!raw.includes("@")) {
    raw = `${raw}@skylineschool.edu.vn`
  }
  return raw.includes("@") && raw.length > 5 ? raw : null
}

/**
 * Xác định tuần hiện tại trong tháng theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
export function getVietnamDateParts(referenceNow: Date = new Date()): {
  year: number
  month: number
  day: number
  dayOfWeek: number // 0 = Sunday .. 3 = Wednesday .. 6 = Saturday
  hour: number
  minute: number
  ymd: string
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(referenceNow)
  const getNum = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)
  const year = getNum("year")
  const month = getNum("month")
  const day = getNum("day")
  const hour = getNum("hour") % 24
  const minute = getNum("minute")
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  const vnNoon = new Date(`${ymd}T12:00:00+07:00`)
  const dayOfWeek = vnNoon.getUTCDay()

  return { year, month, day, dayOfWeek, hour, minute, ymd }
}

export interface MonthWeekDefinition {
  weekNum: number
  startYmd: string
  endYmd: string
  startDisplay: string
  endDisplay: string
  label: string
}

export function computeWeeksOfMonthSync(month: number, year: number): MonthWeekDefinition[] {
  const weeks: MonthWeekDefinition[] = []
  const lastDayDate = new Date(Date.UTC(year, month, 0, 12, 0, 0))
  const totalDays = lastDayDate.getUTCDate()

  // Find first Monday of the month, or if days 1..Sunday exist before first Monday, include Week 1 starting from 1st or first Monday
  // Keep consistent with existing getWeeksOfMonth Monday-based weeks so existing DB weekNumber records match 100%!
  let currentDay = 1
  while (currentDay <= totalDays) {
    const dt = new Date(Date.UTC(year, month - 1, currentDay, 12, 0, 0))
    if (dt.getUTCDay() === 1) break
    currentDay++
  }

  if (currentDay > totalDays) currentDay = 1

  let weekNum = 1
  let d = currentDay
  while (d <= totalDays) {
    const startDay = d
    const endDay = Math.min(d + 4, totalDays) // Mon -> Fri
    const startYmd = `${year}-${String(month).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`
    const endYmd = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
    const startDisplay = `${String(startDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
    const endDisplay = `${String(endDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
    weeks.push({
      weekNum,
      startYmd,
      endYmd,
      startDisplay,
      endDisplay,
      label: `Tuần ${weekNum} (${startDay}/${month} - ${endDay}/${month})`,
    })
    weekNum++
    d += 7
  }

  return weeks
}

export function resolveCurrentWeekInMonth(referenceNow: Date = new Date()): {
  year: number
  month: number
  weekNumber: number
  weekDef: MonthWeekDefinition
  allWeeks: MonthWeekDefinition[]
} {
  const vn = getVietnamDateParts(referenceNow)
  const allWeeks = computeWeeksOfMonthSync(vn.month, vn.year)
  if (allWeeks.length === 0) {
    const fallback: MonthWeekDefinition = {
      weekNum: 1,
      startYmd: vn.ymd,
      endYmd: vn.ymd,
      startDisplay: vn.ymd,
      endDisplay: vn.ymd,
      label: `Tuần 1 (Tháng ${vn.month})`,
    }
    return { year: vn.year, month: vn.month, weekNumber: 1, weekDef: fallback, allWeeks: [fallback] }
  }

  let selected = allWeeks[0]
  for (const w of allWeeks) {
    const startDay = Number(w.startYmd.split("-")[2])
    if (vn.day >= startDay - 1) {
      selected = w
    }
  }
  return {
    year: vn.year,
    month: vn.month,
    weekNumber: selected.weekNum,
    weekDef: selected,
    allWeeks,
  }
}

/**
 * Truy vấn danh sách nhân sự, Tổ chuyên môn và Nhóm chuyên môn gói gọn trong Ban KT&ĐBCL
 */
export async function resolveKtdbclRoster(): Promise<{
  department: { id: string; code: string; name: string; divisionCode: string } | null
  departmentIds: string[]
  taskGroups: Array<{
    id: string
    name: string
    code: string | null
    description: string | null
    leaderUserId: string | null
    memberUserIds: string[]
  }>
  members: KtdbclMemberProfile[]
  directorCandidates: KtdbclMemberProfile[]
}> {
  const [depts, rawTaskGroups] = await Promise.all([
    prisma.department.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { divisionCode: "BAN_KT_DBCL" },
          { code: { in: KTDBCL_DEPT_CODES } },
          { name: { in: ["KT&ĐBCL", "Ban KT&ĐBCL", "Khảo thí & ĐBCL", "KT-ĐBCL"] } },
        ],
      },
      select: { id: true, code: true, name: true, divisionCode: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskGroup.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  const primaryDept = depts[0]
    ? {
        id: depts[0].id,
        code: depts[0].code,
        name: depts[0].name,
        divisionCode: depts[0].divisionCode || "BAN_KT_DBCL",
      }
    : null
  const departmentIds = depts.map((d) => d.id)

  // Filter task groups belonging to KT&ĐBCL (default department is "KT&ĐBCL" or null)
  const ktTaskGroups = rawTaskGroups
    .filter((g) => {
      if (!g.department) return true
      const upper = g.department.toUpperCase()
      return (
        upper.includes("KT") ||
        upper.includes("ĐBCL") ||
        upper.includes("DBCL") ||
        KTDBCL_DEFAULT_GROUPS.some((def) => def.toLowerCase() === g.name.toLowerCase())
      )
    })
    .map((g) => {
      let memberIds: string[] = []
      if (g.memberUserIds) {
        const parsed = safeParseJson<string[]>(g.memberUserIds, [])
        if (Array.isArray(parsed)) {
          memberIds = parsed.filter(Boolean)
        } else {
          memberIds = String(g.memberUserIds)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        }
      }
      if (g.leaderUserId && !memberIds.includes(g.leaderUserId)) {
        memberIds.unshift(g.leaderUserId)
      }
      return {
        id: g.id,
        name: g.name,
        code: g.code || null,
        description: g.description || null,
        leaderUserId: g.leaderUserId || null,
        memberUserIds: memberIds,
      }
    })

  // Ensure standard 5 KT&ĐBCL group names are always represented in UI metadata even if DB has subset
  const groupMemberUserIds = new Set<string>()
  const userGroupsLookup = new Map<string, string[]>()
  for (const tg of ktTaskGroups) {
    for (const uid of tg.memberUserIds) {
      groupMemberUserIds.add(uid)
      const list = userGroupsLookup.get(uid) || []
      if (!list.includes(tg.name)) list.push(tg.name)
      userGroupsLookup.set(uid, list)
    }
  }

  // Query active users belonging to Ban KT&ĐBCL (via Department, DivisionAssignment, Role, or KT&ĐBCL TaskGroup)
  const userOrConditions: any[] = [
    { role: { in: KTDBCL_ROLE_CODES } },
  ]
  if (departmentIds.length > 0) {
    userOrConditions.push({
      teacher: {
        OR: [
          { departmentId: { in: departmentIds } },
          { departmentAssignments: { some: { departmentId: { in: departmentIds } } } },
          { divisionAssignments: { some: { divisionCode: "BAN_KT_DBCL" } } },
        ],
      },
    })
  } else {
    userOrConditions.push({
      teacher: {
        divisionAssignments: { some: { divisionCode: "BAN_KT_DBCL" } },
      },
    })
  }
  if (groupMemberUserIds.size > 0) {
    userOrConditions.push({ id: { in: Array.from(groupMemberUserIds) } })
  }

  const rawUsers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { not: "PARENT" },
      OR: userOrConditions,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      teacher: {
        select: {
          id: true,
          position: true,
          positions: true,
          email: true,
          departmentId: true,
          departmentRel: { select: { id: true, name: true, code: true, divisionCode: true } },
          departmentAssignments: {
            select: {
              departmentId: true,
              position: true,
              department: { select: { id: true, name: true, code: true, divisionCode: true } },
            },
          },
          divisionAssignments: {
            select: { divisionCode: true, roleInDivision: true },
          },
          campus: { select: { campusName: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  })

  const members: KtdbclMemberProfile[] = rawUsers.map((u) => {
    const posList: string[] = []
    if (u.teacher?.position) posList.push(u.teacher.position)
    if (u.teacher?.positions) {
      const parsed = safeParseJson<string[]>(u.teacher.positions, [])
      if (Array.isArray(parsed)) posList.push(...parsed)
    }
    const ktDeptAssign = u.teacher?.departmentAssignments?.find((da) =>
      departmentIds.includes(da.departmentId)
    )
    if (ktDeptAssign?.position) posList.push(ktDeptAssign.position)

    const ktDivAssign = u.teacher?.divisionAssignments?.find(
      (da) => da.divisionCode === "BAN_KT_DBCL"
    )
    if (ktDivAssign?.roleInDivision) posList.push(ktDivAssign.roleInDivision)

    const upperRole = (u.role || "").toUpperCase()
    const upperPositions = posList.map((p) => String(p).toUpperCase())

    const isDirector =
      ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(upperRole) ||
      upperPositions.some((p) =>
        ["GĐB", "GDB", "GIÁM ĐỐC BAN", "GIAM DOC BAN", "TRUONG_BAN", "TRƯỞNG BAN", "TBP", "TB_DHCM"].some(
          (kw) => p.includes(kw)
        )
      )

    const isGroupLeader = ktTaskGroups.some((g) => g.leaderUserId === u.id)
    const isManager =
      isDirector ||
      isGroupLeader ||
      KTDBCL_ROLE_CODES.includes(upperRole) ||
      upperPositions.some((p) => ["TTCM", "TPTCM", "PHÓ BAN", "PHO BAN", "QL"].some((kw) => p.includes(kw)))

    const primaryPosition =
      ktDeptAssign?.position ||
      u.teacher?.position ||
      (isDirector ? "Giám đốc Ban" : isGroupLeader ? "Trưởng nhóm" : "Chuyên viên KT&ĐBCL")

    return {
      id: u.id,
      fullName: u.fullName || u.email || "Nhân sự KT&ĐBCL",
      email: normalizeStaffEmail(u),
      role: u.role || "STAFF",
      position: primaryPosition,
      isDirector,
      isManager,
      departmentId: primaryDept?.id || u.teacher?.departmentId || null,
      departmentName: primaryDept?.name || u.teacher?.departmentRel?.name || "Ban KT&ĐBCL",
      campusName: u.teacher?.campus?.campusName || "Hệ thống Sky-Line",
      specialistGroups: userGroupsLookup.get(u.id) || [],
      teacherId: u.teacher?.id || null,
    }
  })

  // Also check Admins/Directors who might want to receive Director reports
  const adminUsers = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "KT_DBCL", "KTDBCL"] },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      teacher: { select: { id: true, email: true, position: true, campus: { select: { campusName: true } } } },
    },
    orderBy: { fullName: "asc" },
  })

  const candidateMap = new Map<string, KtdbclMemberProfile>()
  for (const m of members) {
    if (m.isDirector || m.isManager) candidateMap.set(m.id, m)
  }
  for (const a of adminUsers) {
    if (!candidateMap.has(a.id)) {
      candidateMap.set(a.id, {
        id: a.id,
        fullName: a.fullName || a.email || "Ban Giám đốc",
        email: normalizeStaffEmail(a),
        role: a.role || "ADMIN",
        position: a.teacher?.position || "Lãnh đạo / Quản trị",
        isDirector: true,
        isManager: true,
        departmentId: primaryDept?.id || null,
        departmentName: primaryDept?.name || "Ban KT&ĐBCL",
        campusName: a.teacher?.campus?.campusName || "Hệ thống Sky-Line",
        specialistGroups: [],
        teacherId: a.teacher?.id || null,
      })
    }
  }

  return {
    department: primaryDept,
    departmentIds,
    taskGroups: ktTaskGroups,
    members,
    directorCandidates: Array.from(candidateMap.values()),
  }
}

export function isDefaultDirectorAccountName(fullName?: string | null): boolean {
  const norm = String(fullName || "")
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
  return norm.includes("pham nguyen thong")
}

async function resolveDefaultDirectorIds(): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE", role: { not: "PARENT" } },
      select: { id: true, fullName: true },
    })
    const matched = users.filter((u) => isDefaultDirectorAccountName(u.fullName)).map((u) => u.id)
    return matched
  } catch {
    return []
  }
}

export async function getKtdbclAutomationConfig(): Promise<KtdbclWeeklyAutomationConfig> {
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  const fallback: KtdbclWeeklyAutomationConfig = {
    id: "KTDBCL_DEFAULT",
    wednesdayReminderEnabled: true,
    wednesdayReminderDayOfWeek: 3, // Thứ 4
    wednesdayReminderHourVn: 14, // 14:00
    weeklyDirectorReportEnabled: true,
    weeklyDirectorSendDayOfWeek: 5, // Thứ 6
    weeklyDirectorSendHourVn: 16, // 16:00
    monthlyDirectorReportEnabled: true,
    directorUserIds: [],
    directorEmails: [],
    ccManagerEmails: [],
    overdueAutoFlagEnabled: true,
    updatedByName: null,
    updatedAt: null,
  }

  if (typeof pAny.$queryRawUnsafe !== "function") return fallback

  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_weekly_automation_config" WHERE "id" = 'KTDBCL_DEFAULT' LIMIT 1`
    )
    if (!rows || rows.length === 0) {
      fallback.directorUserIds = await resolveDefaultDirectorIds()
      return fallback
    }
    const r = rows[0]
    let directorUserIds = safeParseJson<string[]>(r.directorUserIdsJson, [])
    const directorEmails = safeParseJson<string[]>(r.directorEmailsJson, [])
    if (directorUserIds.length === 0 && directorEmails.length === 0) {
      directorUserIds = await resolveDefaultDirectorIds()
    }
    return {
      id: "KTDBCL_DEFAULT",
      wednesdayReminderEnabled: Boolean(Number(r.wednesdayReminderEnabled ?? 1)),
      wednesdayReminderDayOfWeek: Number(r.wednesdayReminderDayOfWeek ?? 3),
      wednesdayReminderHourVn: Number(r.wednesdayReminderHourVn ?? 14),
      weeklyDirectorReportEnabled: Boolean(Number(r.weeklyDirectorReportEnabled ?? 1)),
      weeklyDirectorSendDayOfWeek: Number(r.weeklyDirectorSendDayOfWeek ?? 5),
      weeklyDirectorSendHourVn: Number(r.weeklyDirectorSendHourVn ?? 16),
      monthlyDirectorReportEnabled: Boolean(Number(r.monthlyDirectorReportEnabled ?? 1)),
      directorUserIds,
      directorEmails,
      ccManagerEmails: safeParseJson<string[]>(r.ccManagerEmailsJson, []),
      overdueAutoFlagEnabled: Boolean(Number(r.overdueAutoFlagEnabled ?? 1)),
      updatedByName: r.updatedByName || null,
      updatedAt: r.updatedAt ? String(r.updatedAt) : null,
    }
  } catch (err) {
    console.warn("[getKtdbclAutomationConfig] warning:", err)
    return fallback
  }
}

export async function saveKtdbclAutomationConfig(
  patch: Partial<KtdbclWeeklyAutomationConfig>,
  actorName: string
): Promise<KtdbclWeeklyAutomationConfig> {
  await ensureKtdbclWeeklySchema()
  const current = await getKtdbclAutomationConfig()
  const merged: KtdbclWeeklyAutomationConfig = {
    ...current,
    ...patch,
    id: "KTDBCL_DEFAULT",
    updatedByName: actorName,
    updatedAt: new Date().toISOString(),
  }

  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe === "function") {
    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_weekly_automation_config" (
        "id", "wednesdayReminderEnabled", "wednesdayReminderDayOfWeek", "wednesdayReminderHourVn",
        "weeklyDirectorReportEnabled", "weeklyDirectorSendDayOfWeek", "weeklyDirectorSendHourVn",
        "monthlyDirectorReportEnabled", "directorUserIdsJson", "directorEmailsJson",
        "ccManagerEmailsJson", "overdueAutoFlagEnabled", "updatedByName", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("id") DO UPDATE SET
        "wednesdayReminderEnabled" = excluded."wednesdayReminderEnabled",
        "wednesdayReminderDayOfWeek" = excluded."wednesdayReminderDayOfWeek",
        "wednesdayReminderHourVn" = excluded."wednesdayReminderHourVn",
        "weeklyDirectorReportEnabled" = excluded."weeklyDirectorReportEnabled",
        "weeklyDirectorSendDayOfWeek" = excluded."weeklyDirectorSendDayOfWeek",
        "weeklyDirectorSendHourVn" = excluded."weeklyDirectorSendHourVn",
        "monthlyDirectorReportEnabled" = excluded."monthlyDirectorReportEnabled",
        "directorUserIdsJson" = excluded."directorUserIdsJson",
        "directorEmailsJson" = excluded."directorEmailsJson",
        "ccManagerEmailsJson" = excluded."ccManagerEmailsJson",
        "overdueAutoFlagEnabled" = excluded."overdueAutoFlagEnabled",
        "updatedByName" = excluded."updatedByName",
        "updatedAt" = excluded."updatedAt"`,
      merged.id,
      merged.wednesdayReminderEnabled ? 1 : 0,
      merged.wednesdayReminderDayOfWeek,
      merged.wednesdayReminderHourVn,
      merged.weeklyDirectorReportEnabled ? 1 : 0,
      merged.weeklyDirectorSendDayOfWeek,
      merged.weeklyDirectorSendHourVn,
      merged.monthlyDirectorReportEnabled ? 1 : 0,
      JSON.stringify(merged.directorUserIds || []),
      JSON.stringify(merged.directorEmails || []),
      JSON.stringify(merged.ccManagerEmails || []),
      merged.overdueAutoFlagEnabled ? 1 : 0,
      merged.updatedByName,
      merged.updatedAt
    )
  }

  return merged
}

export async function getWeeklyItemMetaMap(
  itemIds: string[]
): Promise<Map<string, WeeklyReportItemMeta>> {
  const map = new Map<string, WeeklyReportItemMeta>()
  if (!itemIds || itemIds.length === 0) return map
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return map

  try {
    const placeholders = itemIds.map(() => "?").join(",")
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_weekly_report_item_meta" WHERE "itemId" IN (${placeholders})`,
      ...itemIds
    )
    for (const r of rows || []) {
      map.set(String(r.itemId), {
        itemId: String(r.itemId),
        reportId: String(r.reportId || ""),
        userId: String(r.userId || ""),
        confirmStatus: (r.confirmStatus as ItemConfirmStatus) || "PENDING",
        managerConfirmedById: r.managerConfirmedById || null,
        managerConfirmedByName: r.managerConfirmedByName || null,
        managerConfirmedAt: r.managerConfirmedAt ? String(r.managerConfirmedAt) : null,
        directorConfirmedById: r.directorConfirmedById || null,
        directorConfirmedByName: r.directorConfirmedByName || null,
        directorConfirmedAt: r.directorConfirmedAt ? String(r.directorConfirmedAt) : null,
        isOverdue: Boolean(Number(r.isOverdue ?? 0)),
        overdueFlaggedById: r.overdueFlaggedById || null,
        overdueFlaggedByName: r.overdueFlaggedByName || null,
        overdueFlaggedAt: r.overdueFlaggedAt ? String(r.overdueFlaggedAt) : null,
        explanationRequestNote: r.explanationRequestNote || null,
        explanationDueDate: r.explanationDueDate || null,
        staffExplanation: r.staffExplanation || null,
        staffRecoveryDate: r.staffRecoveryDate || null,
        staffExplainedAt: r.staffExplainedAt ? String(r.staffExplainedAt) : null,
        linkedWorkTaskId: r.linkedWorkTaskId || null,
        lastEmailType: r.lastEmailType || null,
        lastEmailSentAt: r.lastEmailSentAt ? String(r.lastEmailSentAt) : null,
        updatedAt: r.updatedAt ? String(r.updatedAt) : null,
      })
    }
  } catch (err) {
    console.warn("[getWeeklyItemMetaMap] warning:", err)
  }
  return map
}

export async function upsertWeeklyItemMeta(
  meta: Partial<WeeklyReportItemMeta> & { itemId: string; reportId: string; userId: string }
): Promise<void> {
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe !== "function") return

  const existingMap = await getWeeklyItemMetaMap([meta.itemId])
  const cur = existingMap.get(meta.itemId)
  const nowIso = new Date().toISOString()

  const merged: WeeklyReportItemMeta = {
    itemId: meta.itemId,
    reportId: meta.reportId,
    userId: meta.userId,
    confirmStatus: meta.confirmStatus ?? cur?.confirmStatus ?? "PENDING",
    managerConfirmedById:
      meta.managerConfirmedById !== undefined ? meta.managerConfirmedById : cur?.managerConfirmedById ?? null,
    managerConfirmedByName:
      meta.managerConfirmedByName !== undefined ? meta.managerConfirmedByName : cur?.managerConfirmedByName ?? null,
    managerConfirmedAt:
      meta.managerConfirmedAt !== undefined ? meta.managerConfirmedAt : cur?.managerConfirmedAt ?? null,
    directorConfirmedById:
      meta.directorConfirmedById !== undefined ? meta.directorConfirmedById : cur?.directorConfirmedById ?? null,
    directorConfirmedByName:
      meta.directorConfirmedByName !== undefined ? meta.directorConfirmedByName : cur?.directorConfirmedByName ?? null,
    directorConfirmedAt:
      meta.directorConfirmedAt !== undefined ? meta.directorConfirmedAt : cur?.directorConfirmedAt ?? null,
    isOverdue: meta.isOverdue !== undefined ? meta.isOverdue : cur?.isOverdue ?? false,
    overdueFlaggedById:
      meta.overdueFlaggedById !== undefined ? meta.overdueFlaggedById : cur?.overdueFlaggedById ?? null,
    overdueFlaggedByName:
      meta.overdueFlaggedByName !== undefined ? meta.overdueFlaggedByName : cur?.overdueFlaggedByName ?? null,
    overdueFlaggedAt:
      meta.overdueFlaggedAt !== undefined ? meta.overdueFlaggedAt : cur?.overdueFlaggedAt ?? null,
    explanationRequestNote:
      meta.explanationRequestNote !== undefined ? meta.explanationRequestNote : cur?.explanationRequestNote ?? null,
    explanationDueDate:
      meta.explanationDueDate !== undefined ? meta.explanationDueDate : cur?.explanationDueDate ?? null,
    staffExplanation:
      meta.staffExplanation !== undefined ? meta.staffExplanation : cur?.staffExplanation ?? null,
    staffRecoveryDate:
      meta.staffRecoveryDate !== undefined ? meta.staffRecoveryDate : cur?.staffRecoveryDate ?? null,
    staffExplainedAt:
      meta.staffExplainedAt !== undefined ? meta.staffExplainedAt : cur?.staffExplainedAt ?? null,
    linkedWorkTaskId:
      meta.linkedWorkTaskId !== undefined ? meta.linkedWorkTaskId : cur?.linkedWorkTaskId ?? null,
    lastEmailType: meta.lastEmailType !== undefined ? meta.lastEmailType : cur?.lastEmailType ?? null,
    lastEmailSentAt:
      meta.lastEmailSentAt !== undefined ? meta.lastEmailSentAt : cur?.lastEmailSentAt ?? null,
    updatedAt: nowIso,
  }

  await pAny.$executeRawUnsafe(
    `INSERT INTO "qa_weekly_report_item_meta" (
      "itemId", "reportId", "userId", "confirmStatus",
      "managerConfirmedById", "managerConfirmedByName", "managerConfirmedAt",
      "directorConfirmedById", "directorConfirmedByName", "directorConfirmedAt",
      "isOverdue", "overdueFlaggedById", "overdueFlaggedByName", "overdueFlaggedAt",
      "explanationRequestNote", "explanationDueDate",
      "staffExplanation", "staffRecoveryDate", "staffExplainedAt",
      "linkedWorkTaskId", "lastEmailType", "lastEmailSentAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("itemId") DO UPDATE SET
      "reportId" = excluded."reportId",
      "userId" = excluded."userId",
      "confirmStatus" = excluded."confirmStatus",
      "managerConfirmedById" = excluded."managerConfirmedById",
      "managerConfirmedByName" = excluded."managerConfirmedByName",
      "managerConfirmedAt" = excluded."managerConfirmedAt",
      "directorConfirmedById" = excluded."directorConfirmedById",
      "directorConfirmedByName" = excluded."directorConfirmedByName",
      "directorConfirmedAt" = excluded."directorConfirmedAt",
      "isOverdue" = excluded."isOverdue",
      "overdueFlaggedById" = excluded."overdueFlaggedById",
      "overdueFlaggedByName" = excluded."overdueFlaggedByName",
      "overdueFlaggedAt" = excluded."overdueFlaggedAt",
      "explanationRequestNote" = excluded."explanationRequestNote",
      "explanationDueDate" = excluded."explanationDueDate",
      "staffExplanation" = excluded."staffExplanation",
      "staffRecoveryDate" = excluded."staffRecoveryDate",
      "staffExplainedAt" = excluded."staffExplainedAt",
      "linkedWorkTaskId" = excluded."linkedWorkTaskId",
      "lastEmailType" = excluded."lastEmailType",
      "lastEmailSentAt" = excluded."lastEmailSentAt",
      "updatedAt" = excluded."updatedAt"`,
    merged.itemId,
    merged.reportId,
    merged.userId,
    merged.confirmStatus,
    merged.managerConfirmedById,
    merged.managerConfirmedByName,
    merged.managerConfirmedAt,
    merged.directorConfirmedById,
    merged.directorConfirmedByName,
    merged.directorConfirmedAt,
    merged.isOverdue ? 1 : 0,
    merged.overdueFlaggedById,
    merged.overdueFlaggedByName,
    merged.overdueFlaggedAt,
    merged.explanationRequestNote,
    merged.explanationDueDate,
    merged.staffExplanation,
    merged.staffRecoveryDate,
    merged.staffExplainedAt,
    merged.linkedWorkTaskId,
    merged.lastEmailType,
    merged.lastEmailSentAt,
    merged.updatedAt
  )
}

export async function hasAutomationDedupKey(dedupKey: string): Promise<boolean> {
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return false
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT "id" FROM "qa_weekly_automation_logs" WHERE "dedupKey" = ? LIMIT 1`,
      dedupKey
    )
    return Boolean(rows && rows.length > 0)
  } catch {
    return false
  }
}

export async function recordWeeklyAutomationLog(entry: {
  jobType: WeeklyAutomationLogRecord["jobType"]
  dedupKey: string
  periodLabel: string
  recipientSummary: string
  emailSentCount: number
  notificationCount: number
  triggeredBy: string
  status: WeeklyAutomationLogRecord["status"]
  details?: any
}): Promise<void> {
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  if (typeof pAny.$executeRawUnsafe !== "function") return

  const id = `wklog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const nowIso = new Date().toISOString()
  try {
    await pAny.$executeRawUnsafe(
      `INSERT INTO "qa_weekly_automation_logs" (
        "id", "jobType", "dedupKey", "periodLabel", "recipientSummary",
        "emailSentCount", "notificationCount", "triggeredBy", "status", "detailsJson", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("dedupKey") DO UPDATE SET
        "recipientSummary" = excluded."recipientSummary",
        "emailSentCount" = excluded."emailSentCount",
        "notificationCount" = excluded."notificationCount",
        "triggeredBy" = excluded."triggeredBy",
        "status" = excluded."status",
        "detailsJson" = excluded."detailsJson",
        "createdAt" = excluded."createdAt"`,
      id,
      entry.jobType,
      entry.dedupKey,
      entry.periodLabel,
      entry.recipientSummary,
      entry.emailSentCount,
      entry.notificationCount,
      entry.triggeredBy,
      entry.status,
      entry.details ? JSON.stringify(entry.details) : null,
      nowIso
    )
  } catch (err) {
    console.warn("[recordWeeklyAutomationLog] warning:", err)
  }
}

export async function getRecentWeeklyAutomationLogs(limit = 25): Promise<WeeklyAutomationLogRecord[]> {
  await ensureKtdbclWeeklySchema()
  const pAny = prisma as any
  if (typeof pAny.$queryRawUnsafe !== "function") return []
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "qa_weekly_automation_logs" ORDER BY "createdAt" DESC LIMIT ?`,
      limit
    )
    return (rows || []).map((r) => ({
      id: String(r.id),
      jobType: r.jobType,
      dedupKey: String(r.dedupKey),
      periodLabel: String(r.periodLabel || ""),
      recipientSummary: String(r.recipientSummary || ""),
      emailSentCount: Number(r.emailSentCount || 0),
      notificationCount: Number(r.notificationCount || 0),
      triggeredBy: String(r.triggeredBy || "SYSTEM"),
      status: r.status || "SUCCESS",
      detailsJson: r.detailsJson || null,
      createdAt: String(r.createdAt || ""),
    }))
  } catch {
    return []
  }
}
