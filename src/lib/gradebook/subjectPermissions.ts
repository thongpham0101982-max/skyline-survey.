// @ts-nocheck
import { prisma } from "@/lib/db"

let schemaInitPromise: Promise<void> | null = null

export async function ensureUserSubjectAssignmentTable(): Promise<void> {
  if (schemaInitPromise) return schemaInitPromise
  schemaInitPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_subject_assignments" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL,
          "subjectCode" TEXT,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "subjectId")
        )
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_user_subject_assignments_userId"
        ON "user_subject_assignments" ("userId")
      `)
    } catch (err) {
      console.error("Failed to ensure user_subject_assignments table:", err)
    }
  })()
  return schemaInitPromise
}

export interface UserSubjectAssignmentItem {
  userId: string
  subjectId: string
  subjectCode?: string | null
}

export async function getUserExplicitSubjectAssignments(userId: string): Promise<{
  subjectIds: string[]
  subjectCodes: string[]
}> {
  if (!userId) return { subjectIds: [], subjectCodes: [] }
  await ensureUserSubjectAssignmentTable()
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "subjectId", "subjectCode" FROM "user_subject_assignments" WHERE "userId" = ?`,
      userId
    )) as Array<{ subjectId: string; subjectCode?: string | null }>
    const subjectIds = Array.from(new Set((rows || []).map((r) => r.subjectId).filter(Boolean)))
    const subjectCodes = Array.from(
      new Set((rows || []).map((r) => (r.subjectCode || "").toUpperCase().trim()).filter(Boolean))
    )
    return { subjectIds, subjectCodes }
  } catch (err) {
    console.error("Error reading user_subject_assignments for user:", userId, err)
    return { subjectIds: [], subjectCodes: [] }
  }
}

export async function getAllUserSubjectAssignmentsMap(): Promise<
  Map<string, { subjectIds: string[]; subjectCodes: string[] }>
> {
  await ensureUserSubjectAssignmentTable()
  const map = new Map<string, { subjectIds: string[]; subjectCodes: string[] }>()
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "userId", "subjectId", "subjectCode" FROM "user_subject_assignments"`
    )) as Array<{ userId: string; subjectId: string; subjectCode?: string | null }>
    for (const r of rows || []) {
      if (!r.userId || !r.subjectId) continue
      const existing = map.get(r.userId) || { subjectIds: [], subjectCodes: [] }
      if (!existing.subjectIds.includes(r.subjectId)) {
        existing.subjectIds.push(r.subjectId)
      }
      const code = (r.subjectCode || "").toUpperCase().trim()
      if (code && !existing.subjectCodes.includes(code)) {
        existing.subjectCodes.push(code)
      }
      map.set(r.userId, existing)
    }
  } catch (err) {
    console.error("Error reading all user_subject_assignments:", err)
  }
  return map
}

export async function saveUserSubjectAssignments(
  userId: string,
  subjectIds: string[]
): Promise<void> {
  if (!userId) return
  await ensureUserSubjectAssignmentTable()
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "user_subject_assignments" WHERE "userId" = ?`,
      userId
    )
    const uniqueIds = Array.from(new Set((subjectIds || []).map((s) => String(s || "").trim()).filter(Boolean)))
    if (uniqueIds.length === 0) return

    const dbSubjects = await prisma.subject
      .findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, subjectCode: true },
      })
      .catch(() => [])
    const codeById = new Map<string, string>()
    dbSubjects.forEach((s) => codeById.set(s.id, s.subjectCode || ""))

    for (const subId of uniqueIds) {
      const id = `usa_${userId}_${subId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const code = codeById.get(subId) || subId
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "user_subject_assignments" ("id", "userId", "subjectId", "subjectCode") VALUES (?, ?, ?, ?)`,
        id,
        userId,
        subId,
        code
      )
    }
  } catch (err) {
    console.error("Error saving user_subject_assignments:", err)
  }
}

export function mapSubjectsToCtqtCodes(
  subjects: Array<{ subjectCode?: string | null; subjectName?: string | null }>,
  directCtqtCodes: string[] = []
): string[] {
  const codes = new Set<string>(directCtqtCodes.map((c) => c.toUpperCase().trim()).filter(Boolean))

  for (const s of subjects || []) {
    const code = String(s.subjectCode || "").toUpperCase().trim()
    const name = String(s.subjectName || "").toLowerCase().trim()

    if (
      code === "ENG" ||
      code === "TA" ||
      code === "TAV" ||
      code === "ESL" ||
      code === "AE" ||
      code === "IELTS" ||
      name.includes("tiếng anh") ||
      name.includes("english") ||
      name.includes("esl") ||
      name.includes("ielts")
    ) {
      codes.add("ENG")
      codes.add("AE")
      codes.add("IELTS")
    }

    if (
      code === "MAT" ||
      code === "MATH" ||
      code === "TOA" ||
      code === "TOAN" ||
      name.includes("toán") ||
      name.includes("math")
    ) {
      codes.add("MAT")
    }

    if (
      code === "SCI" ||
      code === "SCIENCE" ||
      code === "KHT" ||
      code === "KHTN" ||
      code === "VLI" ||
      code === "HHO" ||
      code === "SHO" ||
      name.includes("khoa học") ||
      name.includes("science")
    ) {
      codes.add("SCI")
    }

    if (
      code === "GLOBAL_STUDIES" ||
      code === "GP" ||
      code === "GS" ||
      name.includes("global")
    ) {
      codes.add("GLOBAL_STUDIES")
    }

    if (
      code === "AR" ||
      name.includes("academic research") ||
      name.includes("nghiên cứu học thuật")
    ) {
      codes.add("AR")
    }
  }

  return Array.from(codes)
}

export interface AccountGradebookScope {
  userId: string
  role: string
  isFullSchoolUnrestricted: boolean
  isSubjectScoped: boolean
  hasExplicitSubjectAssignment: boolean
  allowedSubjectIds: string[]
  allowedSubjectCodes: string[]
  allowedCtqtSubjectCodes: string[]
  allowedClassIds: string[]
  assignedSubjects: Array<{
    id: string
    subjectCode: string
    subjectName: string
    category?: string | null
  }>
}

const UNRESTRICTED_SCHOOL_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "TB_DHCM",
  "BAN_DHCM",
  "GDCS",
  "GĐCS",
  "GD_CS",
  "GĐ_CS",
  "BGH",
  "BGH_CS",
  "GIAO_VU",
  "GIAO_VU_CS",
]

export async function resolveAccountGradebookScope(
  userId?: string | null,
  roleCode?: string | null,
  academicYearId?: string | null
): Promise<AccountGradebookScope> {
  const uid = String(userId || "").trim()
  const upperRole = String(roleCode || "").toUpperCase().trim()
  const isSuperAdmin = ["ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN"].includes(upperRole)

  if (!uid) {
    return {
      userId: "",
      role: upperRole,
      isFullSchoolUnrestricted: isSuperAdmin,
      isSubjectScoped: false,
      hasExplicitSubjectAssignment: false,
      allowedSubjectIds: [],
      allowedSubjectCodes: [],
      allowedCtqtSubjectCodes: [],
      allowedClassIds: [],
      assignedSubjects: [],
    }
  }

  // 1. Check explicit subject assignments on User account
  const explicit = await getUserExplicitSubjectAssignments(uid)
  const hasExplicitSubjectAssignment = explicit.subjectIds.length > 0 || explicit.subjectCodes.length > 0

  // If user is a global unrestricted role AND has NO explicit subject assignments on their account,
  // they have full school access across all subjects.
  if (
    (isSuperAdmin || UNRESTRICTED_SCHOOL_ROLES.includes(upperRole)) &&
    !hasExplicitSubjectAssignment
  ) {
    return {
      userId: uid,
      role: upperRole,
      isFullSchoolUnrestricted: true,
      isSubjectScoped: false,
      hasExplicitSubjectAssignment: false,
      allowedSubjectIds: [],
      allowedSubjectCodes: [],
      allowedCtqtSubjectCodes: [],
      allowedClassIds: [],
      assignedSubjects: [],
    }
  }

  // 2. Collect subject IDs from:
  //    (a) Explicit account assignments (`user_subject_assignments`)
  //    (b) Teacher profile (`mainSubjectId`, `TeachingAssignment`, `CtqtTeachingAssignment`, and managed department subjects if TTCM/TBP)
  const subjectIdsSet = new Set<string>(explicit.subjectIds)
  const directCtqtCodesSet = new Set<string>(explicit.subjectCodes)
  const allowedClassIdsSet = new Set<string>()

  let targetYearId = academicYearId || ""
  if (!targetYearId) {
    const activeYear = await prisma.academicYear
      .findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } })
      .catch(() => null)
    targetYearId = activeYear?.id || ""
  }

  const teacher = await prisma.teacher
    .findUnique({
      where: { userId: uid },
      include: {
        mainSubjectRel: true,
        departmentRel: true,
        departmentAssignments: { include: { department: true } },
        divisionAssignments: true,
      },
    })
    .catch(() => null)

  if (teacher) {
    if (teacher.mainSubjectId) {
      subjectIdsSet.add(teacher.mainSubjectId)
    }

    const [teachingAssigns, ctqtAssigns] = await Promise.all([
      prisma.teachingAssignment
        .findMany({
          where: {
            teacherId: teacher.id,
            ...(targetYearId ? { academicYearId: targetYearId } : {}),
          },
          select: { subjectId: true, classId: true },
        })
        .catch(() => []),
      prisma.ctqtTeachingAssignment
        .findMany({
          where: {
            OR: [{ primaryTeacherId: teacher.id }, { delegatedTeacherId: teacher.id }],
            ...(targetYearId ? { academicYearId: targetYearId } : {}),
          },
          select: { subjectCode: true, classId: true },
        })
        .catch(() => []),
    ])

    teachingAssigns.forEach((ta) => {
      if (ta.subjectId) subjectIdsSet.add(ta.subjectId)
      if (ta.classId) allowedClassIdsSet.add(ta.classId)
    })

    ctqtAssigns.forEach((ca) => {
      if (ca.subjectCode) directCtqtCodesSet.add(String(ca.subjectCode).toUpperCase().trim())
      if (ca.classId) allowedClassIdsSet.add(ca.classId)
    })

    // Check if TTCM / TBP managing departments -> include main subjects of teachers in those departments
    const managedDeptIds = new Set<string>()
    const posUpper = String(teacher.position || "").toUpperCase()
    const isTTCM =
      posUpper.includes("TTCM") ||
      posUpper.includes("TPCM") ||
      upperRole === "TTCM" ||
      upperRole === "TO_TRUONG" ||
      (teacher.departmentAssignments || []).some((da: any) =>
        ["TTCM", "TPCM", "TO_TRUONG"].includes(String(da.position || "").toUpperCase())
      )

    if (isTTCM && !hasExplicitSubjectAssignment) {
      if (teacher.departmentId) managedDeptIds.add(teacher.departmentId)
      ;(teacher.departmentAssignments || []).forEach((da: any) => {
        if (da.departmentId) managedDeptIds.add(da.departmentId)
      })
      if (managedDeptIds.size > 0) {
        const deptTeachers = await prisma.teacher
          .findMany({
            where: {
              OR: [
                { departmentId: { in: Array.from(managedDeptIds) } },
                { departmentAssignments: { some: { departmentId: { in: Array.from(managedDeptIds) } } } },
              ],
            },
            select: { id: true, mainSubjectId: true },
          })
          .catch(() => [])
        deptTeachers.forEach((dt) => {
          if (dt.mainSubjectId) subjectIdsSet.add(dt.mainSubjectId)
        })
      }
    }
  }

  // Resolve full Subject records (and also include any sibling subjects with matching subjectName or parent/child relationship)
  let assignedSubjects: Array<{
    id: string
    subjectCode: string
    subjectName: string
    category?: string | null
  }> = []

  if (subjectIdsSet.size > 0 || directCtqtCodesSet.size > 0) {
    const allActiveSubjects = await prisma.subject
      .findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          category: true,
          parentId: true,
        },
        orderBy: { subjectName: "asc" },
      })
      .catch(() => [])

    const initialMatched = allActiveSubjects.filter(
      (s) =>
        subjectIdsSet.has(s.id) ||
        directCtqtCodesSet.has(String(s.subjectCode || "").toUpperCase().trim())
    )

    // Also include sub-subjects whose parentId is in subjectIdsSet, or subjects with identical normalized name
    const matchedNames = new Set(
      initialMatched.map((s) => String(s.subjectName || "").toLowerCase().trim()).filter(Boolean)
    )

    // If CTQT codes like ENG, MAT, SCI are assigned, also match corresponding Subject records
    for (const s of allActiveSubjects) {
      const sCode = String(s.subjectCode || "").toUpperCase().trim()
      const sName = String(s.subjectName || "").toLowerCase().trim()
      if (
        subjectIdsSet.has(s.id) ||
        (s.parentId && subjectIdsSet.has(s.parentId)) ||
        matchedNames.has(sName) ||
        (directCtqtCodesSet.has("ENG") && (sCode === "TA" || sCode === "TAV" || sCode === "ENG" || sCode === "ESL")) ||
        (directCtqtCodesSet.has("MAT") && (sCode === "TOA" || sCode === "MAT" || sCode === "MATH")) ||
        (directCtqtCodesSet.has("SCI") && (sCode === "SCI" || sCode === "KHT" || sCode === "KHTN"))
      ) {
        subjectIdsSet.add(s.id)
      }
    }

    assignedSubjects = allActiveSubjects.filter((s) => subjectIdsSet.has(s.id))
  }

  const allowedSubjectIds = assignedSubjects.map((s) => s.id)
  const allowedSubjectCodes = Array.from(
    new Set(assignedSubjects.map((s) => String(s.subjectCode || "").toUpperCase().trim()).filter(Boolean))
  )
  const allowedCtqtSubjectCodes = mapSubjectsToCtqtCodes(
    assignedSubjects,
    Array.from(directCtqtCodesSet)
  )

  const isSubjectScoped =
    hasExplicitSubjectAssignment ||
    allowedSubjectIds.length > 0 ||
    allowedCtqtSubjectCodes.length > 0

  return {
    userId: uid,
    role: upperRole,
    isFullSchoolUnrestricted: !isSubjectScoped && UNRESTRICTED_SCHOOL_ROLES.includes(upperRole),
    isSubjectScoped,
    hasExplicitSubjectAssignment,
    allowedSubjectIds,
    allowedSubjectCodes,
    allowedCtqtSubjectCodes,
    allowedClassIds: Array.from(allowedClassIdsSet),
    assignedSubjects,
  }
}
