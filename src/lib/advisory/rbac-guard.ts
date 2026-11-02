import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getStudentSession } from "@/lib/student-session"
import { PrivacyTier } from "./triparty-sync"

export type AdvisoryActorRole =
  | "ADMIN"
  | "TEACHER"
  | "PARENT"
  | "STUDENT"
  | "ANONYMOUS"

export interface AdvisoryCallerContext {
  authenticated: boolean
  actorRole: AdvisoryActorRole
  rawRole: string
  userId: string
  actorName: string
  studentId?: string
  studentCode?: string
  teacherId?: string
  parentId?: string
  campusIds: string[]
  isFullAdmin: boolean
}

const ADMIN_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "BGH",
  "BAN_GIAM_HIEU",
  "KT_DBCL",
  "KTDBCL"
]

const CAMPUS_ADMIN_ROLES = [
  "GDCS",
  "GD_CS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "TRUONG_KHOI"
]

export function isManagementRole(roleOrContext?: string | AdvisoryCallerContext | null): boolean {
  if (!roleOrContext) return false
  if (typeof roleOrContext === "object") {
    return roleOrContext.actorRole === "ADMIN" || Boolean(roleOrContext.isFullAdmin)
  }
  const normalized = String(roleOrContext).toUpperCase().trim()
  return ADMIN_ROLES.includes(normalized) || CAMPUS_ADMIN_ROLES.includes(normalized)
}

export async function resolveTeacherAssignedClassIds(
  caller: AdvisoryCallerContext,
  academicYearId?: string
): Promise<string[]> {
  if (!caller.authenticated) return []
  const teacher = await prisma.teacher
    .findUnique({ where: { userId: caller.userId } })
    .catch(() => null)
  const candidateTokens = [
    caller.userId,
    caller.teacherId,
    teacher?.id,
    teacher?.userId,
    teacher?.teacherCode
  ]
    .filter(Boolean)
    .map(s => String(s).trim())

  const classWhere: any = {}
  if (academicYearId) classWhere.academicYearId = academicYearId

  const allClasses = await prisma.class
    .findMany({
      where: classWhere,
      select: { id: true, className: true, homeroomTeacherId: true }
    })
    .catch(() => [])

  const matchedIds = new Set<string>()
  const hrClassNames = String(teacher?.homeroomClass || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  for (const cls of allClasses) {
    const hrIds = String(cls.homeroomTeacherId || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
    if (hrIds.some(id => candidateTokens.includes(id))) {
      matchedIds.add(cls.id)
    } else if (cls.className && hrClassNames.includes(cls.className.trim().toLowerCase())) {
      matchedIds.add(cls.id)
    }
  }

  if (teacher?.id) {
    const [tcaList, taList] = await Promise.all([
      prisma.teacherClassAssignment
        .findMany({
          where: { teacherId: teacher.id, ...(academicYearId ? { academicYearId } : {}) },
          select: { classId: true }
        })
        .catch(() => []),
      prisma.teachingAssignment
        .findMany({
          where: { teacherId: teacher.id, ...(academicYearId ? { academicYearId } : {}) },
          select: { classId: true }
        })
        .catch(() => [])
    ])
    tcaList.forEach(item => item.classId && matchedIds.add(item.classId))
    taList.forEach(item => item.classId && matchedIds.add(item.classId))
  }

  return Array.from(matchedIds)
}

/**
 * Resolves the caller identity from either NextAuth session or Student cookie session
 */
export async function resolveAdvisoryCaller(): Promise<AdvisoryCallerContext> {
  const session = await auth().catch(() => null)
  const studentSess = await getStudentSession().catch(() => null)

  if (session?.user) {
    const rawRole = String((session.user as any).role || "").toUpperCase().trim()
    const userId = String((session.user as any).id || "")
    const actorName = String((session.user as any).name || (session.user as any).email || rawRole)
    const campusIds: string[] = Array.isArray((session.user as any).campusIds)
      ? (session.user as any).campusIds
      : []

    const isFullAdmin = ADMIN_ROLES.includes(rawRole)
    const isCampusAdmin = CAMPUS_ADMIN_ROLES.includes(rawRole)

    if (isFullAdmin || isCampusAdmin) {
      return {
        authenticated: true,
        actorRole: "ADMIN",
        rawRole,
        userId,
        actorName,
        campusIds,
        isFullAdmin
      }
    }

    if (rawRole === "PARENT") {
      const parent = await prisma.parent
        .findUnique({ where: { userId } })
        .catch(() => null)
      return {
        authenticated: true,
        actorRole: "PARENT",
        rawRole,
        userId,
        actorName: parent?.parentName || actorName,
        parentId: parent?.id,
        campusIds,
        isFullAdmin: false
      }
    }

    if (rawRole === "TEACHER" || rawRole === "GV_MN" || rawRole === "GVCN" || rawRole === "CVHT") {
      const teacher = await prisma.teacher
        .findUnique({ where: { userId } })
        .catch(() => null)
      return {
        authenticated: true,
        actorRole: "TEACHER",
        rawRole,
        userId,
        actorName: teacher?.teacherName || actorName,
        teacherId: teacher?.id || userId,
        campusIds,
        isFullAdmin: false
      }
    }

    if (rawRole === "STUDENT" && studentSess) {
      return {
        authenticated: true,
        actorRole: "STUDENT",
        rawRole: "STUDENT",
        userId: studentSess.studentId,
        actorName: studentSess.studentName || "Học sinh",
        studentId: studentSess.studentId,
        studentCode: studentSess.studentCode,
        campusIds: [],
        isFullAdmin: false
      }
    }

    // Fallback for other staff roles with module access
    return {
      authenticated: true,
      actorRole: "TEACHER",
      rawRole,
      userId,
      actorName,
      teacherId: userId,
      campusIds,
      isFullAdmin: false
    }
  }

  if (studentSess?.studentId) {
    return {
      authenticated: true,
      actorRole: "STUDENT",
      rawRole: "STUDENT",
      userId: studentSess.studentId,
      actorName: studentSess.studentName || "Học sinh",
      studentId: studentSess.studentId,
      studentCode: studentSess.studentCode,
      campusIds: [],
      isFullAdmin: false
    }
  }

  return {
    authenticated: false,
    actorRole: "ANONYMOUS",
    rawRole: "",
    userId: "",
    actorName: "Khách",
    campusIds: [],
    isFullAdmin: false
  }
}

/**
 * Checks whether the caller has relationship-based access to a specific student
 * Supports:
 * - Student accessing own profile (or same studentCode across academic years)
 * - Parent with 1 or multiple linked children (ParentStudentLink)
 * - Assigned Teacher / CVHT (dynamically reflects CVHT reassignments)
 * - Admin / Campus Admin
 */
export async function verifyStudentRelationship(
  caller: AdvisoryCallerContext,
  targetStudentIdOrCode: string
): Promise<{
  allowed: boolean
  reason?: string
  student?: any
  allStudentIds: string[]
}> {
  if (!caller.authenticated) {
    return { allowed: false, reason: "Chưa đăng nhập hệ thống.", allStudentIds: [] }
  }

  const student = await prisma.student
    .findFirst({
      where: {
        OR: [{ id: targetStudentIdOrCode }, { studentCode: targetStudentIdOrCode }]
      },
      include: {
        class: true
      }
    })
    .catch(() => null)

  if (!student) {
    return { allowed: false, reason: "Không tìm thấy hồ sơ học sinh.", allStudentIds: [] }
  }

  let allStudentIds = [student.id]
  if (student.studentCode) {
    const siblings = await prisma.student
      .findMany({
        where: { studentCode: student.studentCode },
        select: { id: true, classId: true, campusId: true }
      })
      .catch(() => [])
    if (siblings.length > 0) {
      allStudentIds = Array.from(new Set([student.id, ...siblings.map(s => s.id)]))
    }
  }

  // 1. ADMIN / BGH / CAMPUS ADMIN
  if (caller.actorRole === "ADMIN") {
    if (
      caller.isFullAdmin ||
      caller.campusIds.length === 0 ||
      (student.campusId && caller.campusIds.includes(student.campusId))
    ) {
      return { allowed: true, student, allStudentIds }
    }
    return {
      allowed: false,
      reason: "Tài khoản quản lý không thuộc cơ sở của học sinh này.",
      allStudentIds
    }
  }

  // 2. STUDENT (Self-access only)
  if (caller.actorRole === "STUDENT") {
    const isSelf =
      caller.studentId === student.id ||
      allStudentIds.includes(caller.studentId || "") ||
      (Boolean(caller.studentCode) && caller.studentCode === student.studentCode)
    if (isSelf) {
      return { allowed: true, student, allStudentIds }
    }
    return {
      allowed: false,
      reason: "Học sinh chỉ được phép truy cập hồ sơ phát triển của chính mình.",
      allStudentIds
    }
  }

  // 3. PARENT (Must have active ParentStudentLink to this student or studentCode)
  if (caller.actorRole === "PARENT") {
    const link = await prisma.parentStudentLink
      .findFirst({
        where: {
          parent: { userId: caller.userId },
          status: "ACTIVE",
          OR: [
            { studentId: { in: allStudentIds } },
            ...(student.studentCode ? [{ student: { studentCode: student.studentCode } }] : [])
          ]
        }
      })
      .catch(() => null)

    if (link) {
      return { allowed: true, student, allStudentIds }
    }
    return {
      allowed: false,
      reason: "Tài khoản Phụ huynh không có liên kết với học sinh này.",
      allStudentIds
    }
  }

  // 4. TEACHER / CVHT (Relationship check via Class, Homeroom, Subject, or Support Assignment)
  if (caller.actorRole === "TEACHER") {
    const teacher = await prisma.teacher
      .findUnique({ where: { userId: caller.userId } })
      .catch(() => null)

    if (!teacher) {
      return {
        allowed: false,
        reason: "Không tìm thấy hồ sơ Giáo viên/CVHT tương ứng.",
        allStudentIds
      }
    }

    const candidateTokens = [teacher.id, teacher.userId, teacher.teacherCode]
      .filter(Boolean)
      .map(s => String(s).trim())

    // 4a. Check Class.homeroomTeacherId
    const hrRaw = String(student.class?.homeroomTeacherId || "")
    const hrIds = hrRaw.split(",").map(s => s.trim()).filter(Boolean)
    if (hrIds.some(id => candidateTokens.includes(id))) {
      return { allowed: true, student, allStudentIds }
    }

    // 4b. Check Teacher.homeroomClass matching student's className
    if (
      teacher.homeroomClass &&
      student.class?.className &&
      teacher.homeroomClass
        .split(",")
        .map(s => s.trim().toLowerCase())
        .includes(student.class.className.trim().toLowerCase())
    ) {
      return { allowed: true, student, allStudentIds }
    }

    // 4c. Check TeacherClassAssignment, TeachingAssignment, LearningSupportAssignment
    if (student.classId) {
      const [tca, ta, lsa] = await Promise.all([
        prisma.teacherClassAssignment
          .findFirst({ where: { teacherId: teacher.id, classId: student.classId } })
          .catch(() => null),
        prisma.teachingAssignment
          .findFirst({ where: { teacherId: teacher.id, classId: student.classId } })
          .catch(() => null),
        prisma.learningSupportAssignment
          .findFirst({ where: { teacherId: teacher.id, target: { studentId: { in: allStudentIds } } } })
          .catch(() => null)
      ])
      if (tca || ta || lsa) {
        return { allowed: true, student, allStudentIds }
      }
    }

    return {
      allowed: false,
      reason: "Giáo viên không được phân công phụ trách lớp hoặc cố vấn cho học sinh này.",
      allStudentIds
    }
  }

  return { allowed: false, reason: "Không đủ quyền truy cập.", allStudentIds }
}

/**
 * 3-Tier Field-Level Sanitization for Consultation Logs
 * - Strips `privateAdvisorNotes` from PARENT and STUDENT
 * - Hides unshared (`shareWithParent === false`) or non-SHARED_EDUCATIONAL sessions from PARENT
 */
export function sanitizeConsultationForViewer(
  log: any,
  policy: any | null,
  viewerRole: AdvisoryActorRole
): any | null {
  const privacyTier: PrivacyTier = policy?.privacyTier || "SHARED_EDUCATIONAL"
  const shareWithParent = policy ? Boolean(policy.shareWithParent) : true

  if (viewerRole === "PARENT") {
    if (!shareWithParent || privacyTier !== "SHARED_EDUCATIONAL") {
      return null
    }
  }

  const enriched: any = {
    ...log,
    privacyTier,
    shareWithParent,
    parentSharedSummary: policy?.parentSharedSummary || log.notes || "",
    parentAcknowledged: Boolean(policy?.parentAcknowledged),
    parentFeedback: policy?.parentFeedback || null,
    parentFeedbackAt: policy?.parentFeedbackAt || null,
    sessionFormat: policy?.sessionFormat || "DIRECT",
    sessionStatus: policy?.sessionStatus || log.status || "COMPLETED"
  }

  if (viewerRole === "TEACHER" || viewerRole === "ADMIN") {
    enriched.privateAdvisorNotes = policy?.privateAdvisorNotes || ""
  } else {
    // Strictly omit privateAdvisorNotes for PARENT and STUDENT
    delete enriched.privateAdvisorNotes
  }

  if (viewerRole === "PARENT") {
    // Ensure notes displayed to parent is the approved shared summary
    enriched.notes = policy?.parentSharedSummary ?? log.notes ?? ""
  }

  return enriched
}

/**
 * 3-Tier Field-Level Sanitization for Student Help Requests (SOS / Safeguarding)
 * - Psychological (`TAM_LY_BAN_BE` / `TAM_LY`) or `RESTRICTED_SAFEGUARDING` requests default to `shareWithParent = false`
 * - Never returned to PARENT unless explicitly marked `shareWithParent === true` and `privacyTier === 'SHARED_EDUCATIONAL'`
 */
export function sanitizeHelpRequestForViewer(
  req: any,
  policy: any | null,
  viewerRole: AdvisoryActorRole
): any | null {
  const isPsychologicalCategory =
    String(req.category || "").toUpperCase().includes("TAM_LY") ||
    String(req.category || "").toUpperCase().includes("MOI_QUAN_HE")

  const defaultTier: PrivacyTier = isPsychologicalCategory
    ? "RESTRICTED_SAFEGUARDING"
    : "PRIVATE_ADVISORY"

  const privacyTier: PrivacyTier = policy?.privacyTier || defaultTier
  const shareWithParent = policy ? Boolean(policy.shareWithParent) : false

  if (viewerRole === "PARENT") {
    if (!shareWithParent || privacyTier === "RESTRICTED_SAFEGUARDING") {
      return null
    }
  }

  const enriched: any = {
    ...req,
    privacyTier,
    shareWithParent
  }

  if (viewerRole === "TEACHER" || viewerRole === "ADMIN") {
    enriched.privateAdvisorNotes = policy?.privateAdvisorNotes || ""
  } else {
    delete enriched.privateAdvisorNotes
  }

  return enriched
}

/**
 * 3-Tier Field-Level Sanitization for Student Reflections
 * - Respects student privacy: only shared with PARENT if `shareWithParent === true`
 */
export function sanitizeReflectionForViewer(
  ref: any,
  policy: any | null,
  viewerRole: AdvisoryActorRole
): any | null {
  const privacyTier: PrivacyTier = policy?.privacyTier || "PRIVATE_ADVISORY"
  const shareWithParent = policy ? Boolean(policy.shareWithParent) : false

  if (viewerRole === "PARENT" && !shareWithParent) {
    return null
  }

  return {
    ...ref,
    privacyTier,
    shareWithParent,
    advisorFeedback: policy?.advisorReviewNote || null
  }
}

/**
 * Enriches StudentGoal and its actions with Advisor Review status & Action Evidence
 */
export function enrichGoalWithPolicies(
  goal: any,
  policyMap: Map<string, any>
): any {
  const goalPol = policyMap.get(`GOAL:${goal.id}`)
  const defaultReviewStatus = goal.signedByTeacher
    ? "CONFIRMED"
    : goal.teacherComment
    ? "NEEDS_ADJUSTMENT"
    : "PENDING_REVIEW"

  const actions = Array.isArray(goal.actions)
    ? goal.actions.map((act: any) => {
        const actPol = policyMap.get(`GOAL_ACTION:${act.id}`)
        return {
          ...act,
          evidenceNotes: actPol?.evidenceNotes || null,
          updatedByRole: actPol?.updatedByRole || null
        }
      })
    : []

  return {
    ...goal,
    advisorReviewStatus: goalPol?.advisorReviewStatus || defaultReviewStatus,
    advisorReviewNote: goalPol?.advisorReviewNote || goal.teacherComment || null,
    privacyTier: goalPol?.privacyTier || "SHARED_EDUCATIONAL",
    shareWithParent: goalPol ? Boolean(goalPol.shareWithParent) : true,
    actions
  }
}
