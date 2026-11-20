import { prisma } from "@/lib/db"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"
import { getRolePermissions, hasModulePermission } from "@/lib/permissions"

export type ThkqRoleTier =
  | "SYSTEM_QA_EXEC" // ADMIN, SUPER_ADMIN, KT_DBCL, KHAO_THI, TB_DHCM, BAN_DHCM, BGH
  | "CAMPUS_MANAGER" // GDCS, BGH_CS, GIAO_VU_CS, GIAO_VU
  | "DEPARTMENT_HEAD" // TTCM, TPCM, TO_TRUONG, TBP
  | "TEACHER_SCOPED" // GVCN, GVBM, TEACHER
  | "UNAUTHORIZED"

export interface ThkqAccessScope {
  userId: string
  roleCode: string
  roleTier: ThkqRoleTier
  roleDisplayLabel: string

  // Granular action permissions
  canViewReport: boolean
  canViewDetail: boolean
  canExportSummary: boolean
  canExportDetail: boolean

  // Data scope constraints (empty array = all allowed when unrestricted)
  isCampusRestricted: boolean
  allowedCampusIds: string[]

  isSubjectRestricted: boolean
  allowedSubjectIds: string[]
  allowedSubjectCodes: string[]

  isClassRestricted: boolean
  allowedClassIds: string[]
  homeroomClassIds: string[]
}

const SYSTEM_QA_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "KT_DBCL",
  "KTDBCL",
  "KHAO_THI",
  "TB_DHCM",
  "BAN_DHCM",
  "DHCM",
  "BGH",
  "BAN_GIAM_HIEU",
]

const CAMPUS_MANAGER_ROLES = [
  "GDCS",
  "GĐCS",
  "GD_CS",
  "GĐ_CS",
  "BGH_CS",
  "QLCM",
  "QLCM_CS",
  "GIAO_VU",
  "GIAO_VU_CS",
  "GVU",
]

const DEPARTMENT_HEAD_ROLES = [
  "TTCM",
  "TPCM",
  "TO_TRUONG",
  "TBP",
  "CM",
]

const TEACHER_ROLES = [
  "TEACHER",
  "GV",
  "GIAO_VIEN",
  "GVCN",
  "GVBM",
  "GVNN",
]

export async function resolveThkqAccessScope(
  userId?: string | null,
  roleCode?: string | null,
  academicYearId?: string | null
): Promise<ThkqAccessScope> {
  const uid = String(userId || "").trim()
  const upperRole = String(roleCode || "").toUpperCase().trim()

  if (!uid && !upperRole) {
    return {
      userId: "",
      roleCode: "",
      roleTier: "UNAUTHORIZED",
      roleDisplayLabel: "Chưa đăng nhập",
      canViewReport: false,
      canViewDetail: false,
      canExportSummary: false,
      canExportDetail: false,
      isCampusRestricted: true,
      allowedCampusIds: [],
      isSubjectRestricted: true,
      allowedSubjectIds: [],
      allowedSubjectCodes: [],
      isClassRestricted: true,
      allowedClassIds: [],
      homeroomClassIds: [],
    }
  }

  let targetYearId = String(academicYearId || "").trim()
  if (!targetYearId) {
    const activeYear = await prisma.academicYear
      .findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } })
      .catch(() => null)
    targetYearId = activeYear?.id || ""
  }

  const [gradebookScope, rolePerms, hasModulePerm, userCampusRows, managedCampuses, teacherProfile] =
    await Promise.all([
      (async () => resolveAccountGradebookScope(uid, upperRole, targetYearId))().catch(() => ({
        userId: uid,
        role: upperRole,
        isFullSchoolUnrestricted: false,
        isSubjectScoped: false,
        hasExplicitSubjectAssignment: false,
        allowedSubjectIds: [],
        allowedSubjectCodes: [],
        allowedCtqtSubjectCodes: [],
        allowedClassIds: [],
        assignedSubjects: [],
      })),
      (async () => getRolePermissions(upperRole))().catch(() => []),
      (async () =>
        hasModulePermission(upperRole, [
          "KTDBCL_PHAN_TICH_THKQ",
          "KTDBCL_THKQ_KT_DINH_KY",
          "KTDBCL_GIAM_SAT_TIEN_DO",
          "KTDBCL_GSTD_HS_THIEU_DIEM",
          "KTDBCL_GSTD_TINH_HINH_NHAP",
          "KTDBCL_THONG_KE_BAO_CAO",
          "KTDBCL_GRADE_REMARKS",
        ]))().catch(() => false),
      uid
        ? (async () =>
            prisma.userCampusAssignment?.findMany({
              where: { userId: uid },
              select: { campusId: true },
            }))().catch(() => [])
        : Promise.resolve([]),
      uid
        ? (async () =>
            prisma.campus?.findMany({
              where: { managerId: uid, status: "ACTIVE" },
              select: { id: true },
            }))().catch(() => [])
        : Promise.resolve([]),
      uid
        ? (async () =>
            prisma.teacher?.findUnique({
              where: { userId: uid },
              include: {
                classes: { where: { status: "ACTIVE" } },
                departmentAssignments: true,
              },
            }))().catch(() => null)
        : Promise.resolve(null),
    ])

  const assignedCampusSet = new Set<string>()
  ;(userCampusRows || []).forEach((r: any) => {
    if (r.campusId) assignedCampusSet.add(r.campusId)
  })
  ;(managedCampuses || []).forEach((c: any) => {
    if (c.id) assignedCampusSet.add(c.id)
  })
  if (teacherProfile?.campusId) {
    assignedCampusSet.add(teacherProfile.campusId)
  }

  // Homeroom classes for teacher
  const homeroomClassSet = new Set<string>()
  if (teacherProfile) {
    ;(teacherProfile.classes || []).forEach((tc: any) => {
      if (!tc.roleInClass || String(tc.roleInClass).toUpperCase() === "GVCN") {
        homeroomClassSet.add(tc.classId)
      }
    })
    const directHomerooms = await prisma.class
      .findMany({
        where: {
          status: "ACTIVE",
          ...(targetYearId ? { academicYearId: targetYearId } : {}),
          OR: [
            { homeroomTeacherId: teacherProfile.id },
            ...(teacherProfile.homeroomClass ? [{ className: teacherProfile.homeroomClass }] : []),
          ],
        },
        select: { id: true, campusId: true },
      })
      .catch(() => [])
    directHomerooms.forEach((hc: any) => {
      homeroomClassSet.add(hc.id)
      if (hc.campusId) assignedCampusSet.add(hc.campusId)
    })
  }

  const allAllowedClasses = new Set<string>([
    ...(gradebookScope.allowedClassIds || []),
    ...Array.from(homeroomClassSet),
  ])

  const posUpper = String(teacherProfile?.position || "").toUpperCase()
  const isTeacherDeptHead =
    posUpper.includes("TTCM") ||
    posUpper.includes("TPCM") ||
    posUpper.includes("TO_TRUONG") ||
    posUpper.includes("TBP") ||
    (teacherProfile?.departmentAssignments || []).some((da: any) =>
      ["TTCM", "TPCM", "TO_TRUONG", "TBP"].includes(String(da.position || "").toUpperCase())
    )

  // Determine Role Tier
  let roleTier: ThkqRoleTier = "UNAUTHORIZED"
  let roleDisplayLabel = "Người dùng"

  if (SYSTEM_QA_ROLES.includes(upperRole)) {
    roleTier = "SYSTEM_QA_EXEC"
    roleDisplayLabel =
      upperRole.includes("ADMIN")
        ? "Quản trị hệ thống"
        : upperRole.includes("DHCM")
        ? "Ban Điều hành Chuyên môn"
        : "Ban KT&ĐBCL / Ban Giám hiệu"
  } else if (CAMPUS_MANAGER_ROLES.includes(upperRole)) {
    roleTier = "CAMPUS_MANAGER"
    roleDisplayLabel = upperRole.includes("GIAO_VU") ? "Giáo vụ Cơ sở" : "Giám đốc / QLCM Cơ sở"
  } else if (DEPARTMENT_HEAD_ROLES.includes(upperRole) || isTeacherDeptHead) {
    roleTier = "DEPARTMENT_HEAD"
    roleDisplayLabel = "Tổ trưởng Chuyên môn (TTCM)"
  } else if (
    TEACHER_ROLES.includes(upperRole) ||
    Boolean(teacherProfile) ||
    gradebookScope.isSubjectScoped ||
    hasModulePerm
  ) {
    roleTier = "TEACHER_SCOPED"
    roleDisplayLabel = homeroomClassSet.size > 0 ? "Giáo viên Chủ nhiệm / Bộ môn" : "Giáo viên Bộ môn"
  }

  if (roleTier === "UNAUTHORIZED") {
    return {
      userId: uid,
      roleCode: upperRole,
      roleTier: "UNAUTHORIZED",
      roleDisplayLabel: "Không có quyền truy cập",
      canViewReport: false,
      canViewDetail: false,
      canExportSummary: false,
      canExportDetail: false,
      isCampusRestricted: true,
      allowedCampusIds: [],
      isSubjectRestricted: true,
      allowedSubjectIds: [],
      allowedSubjectCodes: [],
      isClassRestricted: true,
      allowedClassIds: [],
      homeroomClassIds: [],
    }
  }

  // Check explicit permission flags if configured in Permission table
  const thkqPermRecord = (rolePerms || []).find(
    (p: any) =>
      p.module === "KTDBCL_PHAN_TICH_THKQ" ||
      p.module === "KTDBCL_THKQ_KT_DINH_KY" ||
      p.module === "KTDBCL_GIAM_SAT_TIEN_DO" ||
      p.module === "KTDBCL_THONG_KE_BAO_CAO"
  )

  const canViewReport = true
  // Xem chi tiết danh sách học sinh: mở cho KT&ĐBCL/ĐHCM, GĐCS/QLCM, TTCM, và GV trong phạm vi lớp/môn của mình
  const canViewDetail =
    roleTier === "SYSTEM_QA_EXEC" ||
    roleTier === "CAMPUS_MANAGER" ||
    roleTier === "DEPARTMENT_HEAD" ||
    roleTier === "TEACHER_SCOPED"

  // Xuất Excel tổng hợp
  const canExportSummary =
    roleTier === "SYSTEM_QA_EXEC" ||
    roleTier === "CAMPUS_MANAGER" ||
    roleTier === "DEPARTMENT_HEAD" ||
    Boolean(thkqPermRecord?.canRead || thkqPermRecord?.canCreate) ||
    roleTier === "TEACHER_SCOPED"

  // Xuất danh sách học sinh chi tiết ra Excel: yêu cầu quyền KT&ĐBCL/ĐHCM, GĐCS/QLCM, TTCM hoặc có quyền cập nhật/tạo trên mô-đun
  const canExportDetail =
    roleTier === "SYSTEM_QA_EXEC" ||
    roleTier === "CAMPUS_MANAGER" ||
    roleTier === "DEPARTMENT_HEAD" ||
    Boolean(thkqPermRecord?.canCreate || thkqPermRecord?.canUpdate)

  // Scope Restrictions:
  // 1. Campus restriction:
  // - SYSTEM_QA_EXEC: unrestricted across campuses unless explicitly assigned to specific campuses only (not super admin)
  // - CAMPUS_MANAGER: restricted to assigned campuses (if assignedCampusSet > 0)
  const isSuperOrKtdbcl = SYSTEM_QA_ROLES.includes(upperRole)
  const isCampusRestricted =
    !isSuperOrKtdbcl &&
    roleTier === "CAMPUS_MANAGER" &&
    assignedCampusSet.size > 0

  // 2. Subject restriction:
  // - If account has explicit subject assignment (`user_subject_assignments`), restrict to those subjects even for KT_DBCL specialist
  // - If DEPARTMENT_HEAD or TEACHER_SCOPED (and not a homeroom teacher viewing their own homeroom class), restrict to allowedSubjectIds
  const isSubjectRestricted =
    gradebookScope.hasExplicitSubjectAssignment ||
    ((roleTier === "DEPARTMENT_HEAD" || roleTier === "TEACHER_SCOPED") &&
      gradebookScope.allowedSubjectIds.length > 0 &&
      homeroomClassSet.size === 0)

  // 3. Class restriction:
  // - TEACHER_SCOPED (who is not TTCM or SYSTEM_QA or CAMPUS_MANAGER and has no explicit full-subject assignment) is restricted to their assigned classes + homeroom classes
  const isClassRestricted =
    roleTier === "TEACHER_SCOPED" &&
    !gradebookScope.hasExplicitSubjectAssignment &&
    allAllowedClasses.size > 0

  return {
    userId: uid,
    roleCode: upperRole,
    roleTier,
    roleDisplayLabel,
    canViewReport,
    canViewDetail,
    canExportSummary,
    canExportDetail,
    isCampusRestricted,
    allowedCampusIds: Array.from(assignedCampusSet),
    isSubjectRestricted,
    allowedSubjectIds: gradebookScope.allowedSubjectIds || [],
    allowedSubjectCodes: gradebookScope.allowedSubjectCodes || [],
    isClassRestricted,
    allowedClassIds: Array.from(allAllowedClasses),
    homeroomClassIds: Array.from(homeroomClassSet),
  }
}
